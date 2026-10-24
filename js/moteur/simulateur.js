// Simulateur : « tricote » un point maille par maille, pour vérifier les comptes
// et produire la grille des mailles vue côté endroit (qui sert au dessin).
//
// Un rang = { cote: "E" | "V", debut: [...], motif: [...], fin: [...] }
//   cote "E" : rang tricoté sur l'endroit ; "V" : sur l'envers.
//   debut et fin : gestes faits une seule fois ; motif : répété autant que nécessaire.
// Dans la grille, l'indice 0 d'un rang est la maille la plus à droite vue de l'endroit
// (c'est la première tricotée sur un rang endroit).

import { geste } from "../catalogue/gestes.js";

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
 * Tricote `rangs` rangs d'un point sur `mailles` mailles, à plat ou en rond.
 * Renvoie { ok, grille, erreurs, mailles } ; grille[0] = premier rang tricoté (en bas).
 */
export function simuler(point, { mailles, rangs, mode = "plat" }) {
  const recette = mode === "rond" ? convertirEnRond(point) : { rangs: point.rangs, miseEnPlace: point.miseEnPlace };
  if (!recette.ok && mode === "rond") return { ok: false, grille: [], erreurs: [{ rang: 0, message: recette.erreur }], mailles };
  const grille = [];
  const erreurs = [];
  let n = mailles;
  let numero = 0;
  for (const { rang } of suiteDesRangs(recette, rangs)) {
    numero++;
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
  return { ok: erreurs.length === 0, grille, erreurs, mailles: n };
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

/**
 * Version en rond d'un point : tous les rangs deviennent des tours sur l'endroit.
 * Utilise point.rond.rangs s'il est écrit à la main ; sinon, conversion automatique.
 * Renvoie { ok, rangs, miseEnPlace } ou { ok: false, erreur }.
 */
export function convertirEnRond(point) {
  const rond = point.rond || { mode: "auto" };
  if (rond.mode === "impossible") return { ok: false, erreur: rond.raison || "ce point ne se tricote pas en rond" };
  if (rond.mode === "manuel") return { ok: true, rangs: rond.rangs, miseEnPlace: rond.miseEnPlace || [] };
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
  return { ok: true, rangs: rangs.rangs, miseEnPlace: mep.rangs };
}

// ---------- Nombre de mailles ----------

/** Le nombre de mailles convient-il à tous les rangs du point ? */
export function maillesConviennent(point, n, mode = "plat") {
  const recette = mode === "rond" ? convertirEnRond(point) : { ok: true, rangs: point.rangs, miseEnPlace: point.miseEnPlace };
  if (!recette.ok) return false;
  const ks = [...(recette.miseEnPlace || []), ...recette.rangs].map((r) => repetitions(r, n));
  // Chaque rang doit tomber juste, et le motif doit apparaître au moins une fois.
  return ks.every((k) => k !== null) && recette.rangs.some((r) => repetitions(r, n) >= 1);
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

/** Largeur d'une répétition complète du point (plus petit multiple commun des motifs de ses rangs). */
export function largeurMotif(point) {
  return point.rangs.reduce((l, r) => {
    const m = consomme(r.motif);
    return (l * m) / pgcd(l, m);
  }, 1);
}

export function nombreDeRangsDuMotif(point) {
  return point.rangs.length;
}
