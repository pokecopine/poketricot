// Simulateur : « tricote » un point maille par maille, pour vérifier les comptes
// et produire la grille des mailles vue côté endroit (qui sert au dessin).
//
// Un rang = { cote: "E" | "V", debut: [...], motif: [...], fin: [...] }
//   cote "E" : rang tricoté sur l'endroit ; "V" : sur l'envers.
//   debut et fin : gestes faits une seule fois ; motif : répété autant que nécessaire.
// Dans la grille, l'indice 0 d'un rang est la maille la plus à droite vue de l'endroit
// (c'est la première tricotée sur un rang endroit).

import { geste, liensDuGeste } from "../catalogue/gestes.js";

const somme = (liste, cle) => liste.reduce((t, code) => t + geste(code)[cle], 0);
export const consomme = (liste) => somme(liste || [], "consomme");
export const produit = (liste) => somme(liste || [], "produit");

/** Nombre de répétitions du motif pour n mailles sur l'aiguille ; null si ça ne tombe pas juste. */
export function repetitions(rang, n) {
  const fixe = consomme(rang.debut) + consomme(rang.fin);
  const m = consomme(rang.motif);
  if (m === 0) return null;
  const k = (n - fixe) / m;
  return n >= 1 && Number.isInteger(k) && k >= 0 ? k : null;
}

/** Mailles sur l'aiguille après un rang commencé sur n mailles ; null si ça ne tombe pas juste. */
export function sortieRang(rang, n) {
  const k = repetitions(rang, n);
  if (k === null) return null;
  return produit(rang.debut) + k * produit(rang.motif) + produit(rang.fin);
}

/**
 * Mailles sur l'aiguille au début de chaque rang : la mise en place, puis un tour du motif, en partant de n.
 * Certains points changent de nombre de mailles au milieu du motif (un rang diminue, un autre augmente).
 * Renvoie { mep: [...], cycle: [...], debutCycle, fin } ou null si un rang ne tombe pas juste.
 */
export function comptesDesRangs(recette, n) {
  let c = n;
  const mep = [];
  for (const r of recette.miseEnPlace || []) {
    if (repetitions(r, c) === null) return null;
    mep.push(c);
    c = sortieRang(r, c);
  }
  const debutCycle = c;
  const cycle = [];
  for (const r of recette.rangs) {
    if (repetitions(r, c) === null) return null;
    cycle.push(c);
    c = sortieRang(r, c);
  }
  return { mep, cycle, debutCycle, fin: c };
}

/** Le point change-t-il de nombre de mailles au milieu du motif ? */
export function comptesVariables(point) {
  return [...(point.miseEnPlace || []), ...point.rangs].some(
    (r) => produit(r.debut) !== consomme(r.debut) || produit(r.motif) !== consomme(r.motif) || produit(r.fin) !== consomme(r.fin)
  );
}

/** Développe un rang en liste complète de gestes pour n mailles. */
export function deplier(rang, n) {
  const k = repetitions(rang, n);
  if (k === null) return null;
  const gestes = [...(rang.debut || [])];
  for (let i = 0; i < k; i++) gestes.push(...rang.motif);
  gestes.push(...(rang.fin || []));
  return gestes;
}

/**
 * Tricote un rang sur n mailles.
 * Renvoie { ok: true, sortie, aspects, k } ou { ok: false, erreur }.
 */
export function tricoterRang(rang, n) {
  const gestes = deplier(rang, n);
  if (!gestes) {
    return {
      ok: false,
      erreur: `le motif ne tombe pas juste sur ${n} mailles (il faut ${consomme(rang.debut) + consomme(rang.fin)} + un multiple de ${consomme(rang.motif)})`,
    };
  }
  const aspects = [];
  for (const code of gestes) {
    const g = geste(code);
    const vus = rang.cote === "V" ? g.envers : g.endroit;
    if (!vus) return { ok: false, erreur: `« ${g.nom} » se fait sur l'endroit du travail` };
    aspects.push(...vus);
  }
  // Sur un rang envers, on avance de gauche à droite vu de l'endroit : on remet dans l'ordre.
  if (rang.cote === "V") aspects.reverse();
  return { ok: true, sortie: aspects.length, aspects, k: repetitions(rang, n) };
}

/** Rangs à tricoter dans l'ordre : mise en place (une fois), puis le motif en boucle. */
function* suiteDesRangs(recette, nombre) {
  const mep = recette.miseEnPlace || [];
  let i = 0;
  for (const r of mep) {
    if (i++ >= nombre) return;
    yield { rang: r, numeroMotif: null };
  }
  let j = 0;
  while (i < nombre) {
    yield { rang: recette.rangs[j % recette.rangs.length], numeroMotif: (j % recette.rangs.length) + 1 };
    i++;
    j++;
  }
}

/**
 * Indice (dans les mailles produites) de la maille issue de la maille prise n° c :
 * le nombre de mailles produites avant le geste qui la prend. Un jeté (qui ne prend rien) passe avant.
 */
export function mailleIssue(gestes, c) {
  let pris = 0;
  let produits = 0;
  for (const code of gestes) {
    const g = geste(code);
    if (g.consomme > 0 && c < pris + g.consomme) return produits;
    pris += g.consomme;
    produits += g.produit;
  }
  return produits;
}

/**
 * Tricote un tour en rond qui commence à la maille `debut` (comptée depuis le début du tour de départ, vers la gauche).
 * Renvoie { ok, aspects (rangés depuis le début de départ), sortie, debut (du tour suivant, avant déplacement) }.
 */
export function tricoterTour(rang, n, debut = 0) {
  const r = tricoterRang(rang, n);
  if (!r.ok) return r;
  const gestes = deplier(rang, n);
  const m = r.sortie;
  // La maille de départ (indice 0) est prise en n − debut-ième position du tour.
  const q = mailleIssue(gestes, (n - debut) % n) % m;
  const aspects = Array.from({ length: m }, (_, i) => r.aspects[(q + i) % m]);
  return { ok: true, aspects, sortie: m, debut: (m - q) % m, k: r.k };
}

/**
 * Tricote `rangs` rangs d'un point sur `mailles` mailles, à plat ou en rond.
 * En rond, un tour peut demander de déplacer le début du tour (decale : mailles glissées vers la gauche avant le tour) ;
 * le tout premier tour n'en tient pas compte (le marqueur vient d'être posé). La grille reste rangée depuis le
 * début du tour de départ, pour se comparer à la version à plat.
 * Renvoie { ok, grille, erreurs, mailles, decalage } ; grille[0] = premier rang tricoté (en bas) ;
 * decalage = place du début du tour à la fin (en rond).
 */
export function simuler(point, { mailles, rangs, mode = "plat" }) {
  const recette = mode === "rond" ? convertirEnRond(point) : { rangs: point.rangs, miseEnPlace: point.miseEnPlace };
  if (!recette.ok && mode === "rond") return { ok: false, grille: [], erreurs: [{ rang: 0, message: recette.erreur }], mailles };
  const grille = [];
  const erreurs = [];
  let n = mailles;
  let numero = 0;
  let debut = 0;
  for (const { rang } of suiteDesRangs(recette, rangs)) {
    numero++;
    if (mode === "rond") {
      if (numero > 1 && rang.decale) debut = (debut + rang.decale) % n;
      const t = tricoterTour(rang, n, debut);
      if (!t.ok) {
        erreurs.push({ rang: numero, message: t.erreur });
        break;
      }
      grille.push(t.aspects);
      n = t.sortie;
      debut = t.debut;
      continue;
    }
    const r = tricoterRang(rang, n);
    if (!r.ok) {
      erreurs.push({ rang: numero, message: r.erreur });
      break;
    }
    grille.push(r.aspects);
    n = r.sortie;
  }
  if (erreurs.length === 0 && n !== mailles && mode !== "libre") {
    erreurs.push({ rang: numero, message: `le nombre de mailles a changé : ${mailles} au départ, ${n} à la fin` });
  }
  return { ok: erreurs.length === 0, grille, erreurs, mailles: n, decalage: debut };
}

// ---------- Conversion en rond ----------

/** Fait tourner un motif de s mailles vers la droite (les s dernières mailles passent devant). */
function tourner(motif, s) {
  if (s === 0) return { ok: true, motif: [...motif] };
  let pris = 0;
  let i = motif.length;
  while (i > 0 && pris < s) {
    i--;
    pris += geste(motif[i]).consomme;
  }
  if (pris !== s) return { ok: false };
  return { ok: true, motif: [...motif.slice(i), ...motif.slice(0, i)] };
}

function convertirRang(rang, d0) {
  const n = consomme(rang.motif);
  let bloc;
  let decalage;
  if (rang.cote === "E") {
    bloc = [...rang.motif];
    decalage = consomme(rang.debut) - d0;
  } else {
    // Vu de l'endroit, un rang envers se lit à l'envers et chaque geste devient son équivalent.
    bloc = [];
    for (const code of [...rang.motif].reverse()) {
      const equivalent = geste(code).vuDeLAutreCote;
      if (!equivalent) return { ok: false, erreur: `« ${geste(code).nom} » n'a pas d'équivalent en rond` };
      bloc.push(equivalent);
    }
    decalage = consomme(rang.fin) - d0;
  }
  const s = ((decalage % n) + n) % n;
  const t = tourner(bloc, s);
  if (!t.ok) return { ok: false, erreur: "le motif ne se découpe pas proprement en rond" };
  return { ok: true, rang: { cote: "E", debut: [], motif: t.motif, fin: [] } };
}

/** Conversion simple : chaque tour est le motif du rang, tourné. */
function convertirSimple(point) {
  const premierEndroit = point.rangs.find((r) => r.cote === "E");
  const d0 = premierEndroit ? consomme(premierEndroit.debut) : 0;
  const convertir = (liste) => {
    const resultat = [];
    for (const r of liste || []) {
      const c = convertirRang(r, d0);
      if (!c.ok) return c;
      resultat.push(c.rang);
    }
    return { ok: true, rangs: resultat };
  };
  const rangs = convertir(point.rangs);
  if (!rangs.ok) return rangs;
  const mep = convertir(point.miseEnPlace);
  if (!mep.ok) return mep;
  return { ok: true, rangs: rangs.rangs, miseEnPlace: mep.rangs, marqueur: false };
}

const cache = new WeakMap();

/**
 * Version en rond d'un point : tous les rangs deviennent des tours sur l'endroit.
 * Utilise point.rond.rangs s'il est écrit à la main ; sinon, conversion automatique : découpe simple,
 * puis, si un geste tombe à cheval sur le début du tour, déplacement du début du tour (deduireRond).
 * Renvoie { ok, rangs, miseEnPlace, marqueur } ou { ok: false, erreur }.
 */
export function convertirEnRond(point) {
  if (cache.has(point)) return cache.get(point);
  const r = convertirSansCache(point);
  cache.set(point, r);
  return r;
}

function convertirSansCache(point) {
  const rond = point.rond || { mode: "auto" };
  if (rond.mode === "impossible") return { ok: false, erreur: rond.raison || "ce point ne se tricote pas en rond" };
  if (rond.mode === "manuel") {
    return { ok: true, rangs: rond.rangs, miseEnPlace: rond.miseEnPlace || [], marqueur: rond.rangs.some((r) => r.decale) };
  }
  const simple = convertirSimple(point);
  if (simple.ok) return simple;
  const deduit = deduireRond(point);
  if (deduit.ok) return deduit;
  return simple.erreur?.includes("équivalent") ? simple : { ok: false, erreur: deduit.erreur || simple.erreur };
}

// ---------- Déplacement du début du tour ----------

/**
 * Les gestes d'un rang vus de l'endroit, de droite à gauche, avec la maille prise (c0) et produite (p0) au départ de chacun.
 * Un geste sans équivalent vu de l'endroit (souvent au bord du rang) garde son code d'origine, marqué sansEquivalent.
 */
function vueDeLEndroit(rang, n) {
  const g = deplier(rang, n);
  if (!g) return { ok: false, erreur: "le motif ne tombe pas juste" };
  const liste = rang.cote === "V" ? [...g].reverse() : g;
  let c = 0;
  let p = 0;
  const positions = liste.map((brut) => {
    const eq = rang.cote === "V" ? geste(brut).vuDeLAutreCote : brut;
    const o = { code: eq || brut, sansEquivalent: !eq, brut, c0: c, p0: p };
    c += geste(brut).consomme;
    p += geste(brut).produit;
    return o;
  });
  return { ok: true, positions, sortie: p };
}

/**
 * Déduit la version en rond d'un point dont le motif se décale d'un tour à l'autre.
 * Le point est tricoté à plat sur une grande largeur ; chaque rang est lu de l'endroit, et chaque tour commence
 * à la première limite de geste à gauche du début du tour précédent : l'écart devient son « decale »
 * (mailles à glisser vers la gauche avant le tour). Calculé sur trois motifs, qui doivent donner les mêmes
 * tours au deuxième et au troisième passage. La version obtenue est ensuite comparée à la version à plat.
 * Renvoie { ok, rangs, miseEnPlace, marqueur: true } ou { ok: false, erreur }.
 */
export function deduireRond(point) {
  const P0 = largeurMotif(point);
  const L = point.rangs.length;
  const mep = point.miseEnPlace || [];
  const N = maillesLesPlusProches(point, P0 * (6 * L + 12), "plat");
  if (!N) return { ok: false, erreur: "le motif ne tombe juste sur aucun nombre de mailles" };
  const sequence = [...mep.map((r) => ({ r, motif: false })), ...[0, 1, 2].flatMap(() => point.rangs.map((r) => ({ r, motif: true })))];
  let n = N;
  let cible = 2 * P0 + 10;
  const tours = [];
  for (const { r } of sequence) {
    const v = vueDeLEndroit(r, n);
    if (!v.ok) return v;
    const P = consomme(r.motif);
    const j = v.positions.findIndex((x) => x.c0 >= cible);
    if (j < 0) return { ok: false, erreur: "le motif ne se découpe pas proprement en rond" };
    const fenetre = [];
    let c = 0;
    for (let i = j; c < P && i < v.positions.length; i++) {
      if (v.positions[i].sansEquivalent) return { ok: false, erreur: `« ${geste(v.positions[i].brut).nom} » n'a pas d'équivalent en rond` };
      fenetre.push(v.positions[i].code);
      c += geste(v.positions[i].code).consomme;
    }
    if (c !== P || fenetre.length === 0) return { ok: false, erreur: "le motif ne se découpe pas proprement en rond" };
    tours.push({ motif: fenetre, decale: v.positions[j].c0 - cible });
    cible = v.positions[j].p0;
    n = v.sortie;
  }
  const deuxieme = tours.slice(mep.length + L, mep.length + 2 * L);
  const troisieme = tours.slice(mep.length + 2 * L);
  const memes = deuxieme.every((t, i) => t.decale === troisieme[i].decale && t.motif.join() === troisieme[i].motif.join());
  if (!memes) return { ok: false, erreur: "le motif ne se découpe pas proprement en rond, même en déplaçant le début du tour" };
  // Le premier tour du motif, joué juste après la mise en place, doit demander le même déplacement qu'après un motif.
  if (mep.length && tours[mep.length].decale !== troisieme[0].decale) {
    return { ok: false, erreur: "la mise en place ne se raccorde pas au motif en rond" };
  }
  const enTour = (t) => ({ cote: "E", debut: [], motif: t.motif, fin: [], ...(t.decale ? { decale: t.decale } : {}) });
  const rangs = troisieme.map(enTour);
  const miseEnPlace = tours.slice(0, mep.length).map(enTour);
  const resultat = { ok: true, rangs, miseEnPlace, marqueur: rangs.some((r) => r.decale) || miseEnPlace.some((r) => r.decale) };
  const v = verifierRond(point, resultat);
  return v.ok ? resultat : { ok: false, erreur: `la version en rond ne donne pas la même texture (${v.erreur})` };
}

/**
 * Compare une version en rond à la version à plat, maille par maille, vue de l'endroit, sur deux motifs de haut.
 * La colonne de départ du rond est suivie dans le tricot à plat (au milieu, loin des bords).
 * rond : { rangs, miseEnPlace } (par défaut, convertirEnRond(point)). Renvoie { ok, erreur? }.
 */
export function verifierRond(point, rond = null) {
  const recette = rond || convertirEnRond(point);
  if (!recette.ok) return { ok: false, erreur: recette.erreur };
  const P0 = largeurMotif(point);
  const L = point.rangs.length;
  const mep = point.miseEnPlace || [];
  const H = mep.length + 2 * L;
  const pointRond = { ...point, rond: { mode: "manuel", rangs: recette.rangs, miseEnPlace: recette.miseEnPlace } };
  const nRond = maillesLesPlusProches(pointRond, 4 * P0, "rond");
  if (!nRond) return { ok: false, erreur: "aucun nombre de mailles ne convient en rond" };
  const enRond = simuler(pointRond, { mailles: nRond, rangs: H, mode: "rond" });
  if (!enRond.ok) return { ok: false, erreur: enRond.erreurs[0]?.message };
  const N = maillesLesPlusProches(point, P0 * (4 * L + 12), "plat");
  const aPlat = simuler(point, { mailles: N, rangs: H });
  if (!aPlat.ok) return { ok: false, erreur: aPlat.erreurs[0]?.message };
  // La colonne de départ du rond, à plat : une limite de geste du premier rang, au milieu ; on essaie celles d'un motif.
  const rangsPlat = [...mep, ...point.rangs, ...point.rangs];
  const vues = [];
  let n = N;
  for (let r = 0; r < H; r++) {
    const v = vueDeLEndroit(rangsPlat[r], n);
    if (!v.ok) return v;
    vues.push(v.positions.map((x) => x.brut));
    n = v.sortie;
  }
  const premier = vueDeLEndroit(rangsPlat[0], N).positions;
  const cible = 2 * P0 + 10;
  const departs = premier.filter((x) => x.c0 >= cible && x.c0 < cible + P0 && geste(x.code).consomme > 0).map((x) => x.c0);
  let premiereErreur = null;
  for (const depart of departs) {
    let a = depart;
    let ok = true;
    for (let r = 0; r < H && ok; r++) {
      a = mailleIssue(vues[r], a);
      const ligneRond = enRond.grille[r];
      const lignePlat = aPlat.grille[r];
      for (let i = 0; i < ligneRond.length; i++) {
        if (a + i >= lignePlat.length || ligneRond[i] !== lignePlat[a + i]) {
          ok = false;
          premiereErreur ??= `rang ${r + 1}, maille ${i + 1}`;
          break;
        }
      }
    }
    if (ok) return { ok: true };
  }
  return { ok: false, erreur: premiereErreur || "aucun départ possible" };
}

// ---------- Nombre de mailles ----------

/** Le nombre de mailles convient-il à tous les rangs du point ? */
export function maillesConviennent(point, n, mode = "plat") {
  const recette = mode === "rond" ? convertirEnRond(point) : { ok: true, rangs: point.rangs, miseEnPlace: point.miseEnPlace };
  if (!recette.ok) return false;
  // Chaque rang doit tomber juste sur les mailles qu'il trouve, le motif doit revenir au nombre de départ,
  // et apparaître au moins une fois.
  const c = comptesDesRangs(recette, n);
  if (!c || c.debutCycle !== n || c.fin !== n) return false;
  return recette.rangs.some((r, i) => repetitions(r, c.cycle[i]) >= 1);
}

/** Nombre de mailles le plus proche de `cible` qui convient au point (à égalité, le plus petit). */
export function maillesLesPlusProches(point, cible, mode = "plat") {
  for (let ecart = 0; ecart <= 200; ecart++) {
    if (cible - ecart > 0 && maillesConviennent(point, cible - ecart, mode)) return cible - ecart;
    if (maillesConviennent(point, cible + ecart, mode)) return cible + ecart;
  }
  return null;
}

/** Plus petit nombre de mailles qui convient (pour dessiner une seule répétition, par exemple). */
export function maillesMinimum(point, mode = "plat") {
  for (let n = 1; n <= 200; n++) if (maillesConviennent(point, n, mode)) return n;
  return null;
}

const pgcd = (a, b) => (b === 0 ? a : pgcd(b, a % b));

/**
 * Largeur d'une répétition complète du point (plus petit multiple commun des motifs de ses rangs).
 * Pour un point dont le nombre de mailles change, c'est l'écart entre deux nombres de mailles qui conviennent.
 */
export function largeurMotif(point) {
  if (comptesVariables(point)) {
    const premier = maillesMinimum(point);
    if (premier !== null) for (let n = premier + 1; n <= premier + 200; n++) if (maillesConviennent(point, n)) return n - premier;
  }
  return point.rangs.reduce((l, r) => {
    const m = consomme(r.motif);
    return (l * m) / pgcd(l, m);
  }, 1);
}

export function nombreDeRangsDuMotif(point) {
  return point.rangs.length;
}

// ---------- Liens entre les mailles (3D fidèle) ----------

/** +1 si la maille montre un V sur l'endroit, −1 si elle y montre une bosse. */
function sensVuDeLEndroit(aspect, g, envers) {
  if (aspect === "grain") return -1;
  // « boule » : une diminution de 3 ou 5 mailles ; elle montre un V sur l'endroit si elle est tricotée à l'endroit
  // sur un rang endroit, ou à l'envers sur un rang envers.
  if (aspect === "boule") return /l'envers/.test(g.nom) === envers ? 1 : -1;
  return 1;
}

/**
 * Tricote un rang sur n mailles en gardant, pour chaque maille posée, les mailles du rang du dessous qu'elle traverse.
 * Renvoie { ok, rang: [{ aspect, code, parents, jete, levee }, …] } rangé comme la grille (indice 0 = maille la plus
 * à droite vue de l'endroit) ; les parents sont des indices de la grille du rang du dessous (n mailles). ok: false si un
 * geste n'a pas de liens connus ou si le motif ne tombe pas juste.
 */
export function tricoterRangLie(rang, n) {
  const gestes = deplier(rang, n);
  if (!gestes) return { ok: false };
  const envers = rang.cote === "V";
  const cellules = [];
  let pris = 0;
  for (const code of gestes) {
    const g = geste(code);
    const liens = liensDuGeste(code);
    const vus = envers ? g.envers : g.endroit;
    if (!liens || !vus) return { ok: false, code };
    liens.forEach((l, i) => {
      // Ordre de travail → indice de la grille du dessous : sur l'envers, on part de la gauche (vu de l'endroit).
      const parents = l.parents.map((k) => (envers ? n - 1 - (pris + k) : pris + k));
      cellules.push({ aspect: vus[i], code, parents, jete: !!l.jete, levee: !!l.levee, sens: sensVuDeLEndroit(vus[i], g, envers) });
    });
    pris += g.consomme;
  }
  if (envers) cellules.reverse();
  return { ok: true, rang: cellules };
}

/**
 * Tricote un point à plat (sans mise en place) en gardant les liens : grille[r][i] = { aspect, parents, … }.
 * Le rang 0 est tricoté sur le montage (n mailles). Renvoie { ok, grille, montage } ou { ok: false, code }.
 */
export function simulerLiens(point, { mailles, rangs }) {
  const grille = [];
  let n = mailles;
  for (let r = 0; r < rangs; r++) {
    const res = tricoterRangLie(point.rangs[r % point.rangs.length], n);
    if (!res.ok) return { ok: false, code: res.code };
    grille.push(res.rang);
    n = res.rang.length;
  }
  return { ok: true, grille, montage: mailles };
}
