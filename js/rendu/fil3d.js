// Le chemin du fil dans un échantillon, en 3D (sans dessin : des points). Fonctions pures, testées sans navigateur.
//
// Modèle (d'après le modèle de maille de Kaldor et al., « Simulating knitted cloth at the yarn level ») :
// chaque rang est un fil qui serpente de maille en maille. Pour la maille centrée en u = k + ½ (u en largeurs
// de maille), avec φ = 2π(u − ½) :
//   x = u + A·sin(2φ)       la tête de la boucle s'élargit, les jambes se resserrent
//   y = y_rang + H·cos(φ)   la tête en haut (elle remonte dans le rang suivant), les « ponts » entre mailles en bas
//   z = −s·D·cos(2φ)        s = +1 pour une maille endroit vue de face : les jambes passent devant,
//                           la tête et les ponts derrière ; s = −1 pour une maille envers (l'inverse)
// La tête d'une maille passe derrière les jambes de la maille du rang suivant : les boucles s'enchaînent.
// Entre une maille endroit et une maille envers, s change en douceur pour que le fil reste continu.
//
// Repère : x vers la droite (vu de l'endroit), y vers le haut, z vers celui qui regarde l'endroit.
// Dans la grille du simulateur, l'indice 0 d'un rang est la maille la plus à droite, vue de l'endroit.

/** Proportions du modèle, en largeurs de maille. */
export const MODELE = {
  pas: 0.78, // hauteur d'un rang
  H: 0.56, // demi-hauteur d'une boucle (les boucles de deux rangs se chevauchent)
  A: 0.2, // la jambe visible descend en biais vers le milieu de la maille : c'est ce qui dessine le V
  D: 0.2, // profondeur : de combien les jambes passent devant (ou derrière)
  rayon: 0.24, // rayon du fil
  points: 24, // points par maille le long du fil
};

/** Aspects que le modèle dessine fidèlement ; les autres sont approchés par une maille endroit ou envers. */
export const ASPECTS_FIDELES = new Set(["V", "grain", "Vtorse"]);

/** Sens de la boucle pour un aspect : +1 endroit (on voit le V), −1 envers (on voit la bosse). */
export function sensDeLaMaille(aspect) {
  if (aspect === "grain" || aspect === "boule") return -1;
  return 1;
}

/** Le dessin 3D d'une grille est-il fidèle, ou approché (jetés, torsades, mailles glissées…) ? */
export function rendu3dFidele(grille) {
  return grille.every((rang) => rang.every((a) => ASPECTS_FIDELES.has(a)));
}

const lisse = (x) => x * x * (3 - 2 * x);

/**
 * Répète la grille d'un motif pour faire un échantillon d'au moins `mailles` × `rangs`
 * (sans dépasser `max` mailles en tout) : un nombre entier de motifs dans chaque sens.
 */
export function grilleEchantillon(motif, { mailles = 16, rangs = 20, max = 900 } = {}) {
  const largeur = motif[0].length;
  const hauteur = motif.length;
  let nx = Math.max(1, Math.ceil(mailles / largeur));
  let ny = Math.max(1, Math.ceil(rangs / hauteur));
  while (nx * largeur * ny * hauteur > max && (nx > 1 || ny > 1)) {
    if (nx * largeur >= ny * hauteur && nx > 1) nx--;
    else if (ny > 1) ny--;
    else nx--;
  }
  const grille = [];
  for (let r = 0; r < ny * hauteur; r++) {
    const ligne = motif[r % hauteur];
    grille.push(Array.from({ length: nx * largeur }, (_, c) => ligne[c % largeur]));
  }
  return grille;
}

/**
 * Le chemin du fil pour une grille (grille[0] = rang du bas).
 * Les rangs se suivent comme à plat : un rang de gauche à droite, le suivant de droite à gauche,
 * reliés au bord par un petit arrondi (la lisière).
 * Renvoie { points: [[x, y, z], …], largeur, hauteur } centré en (0, 0).
 */
export function cheminDuFil(grille, modele = MODELE) {
  const { pas, H, A, D, points: N } = modele;
  const nR = grille.length;
  const nC = grille[0].length;
  const largeur = nC;
  const hauteur = (nR - 1) * pas + 2 * H;
  const x0 = -nC / 2;
  const y0 = -((nR - 1) * pas) / 2;
  const chemin = [];

  for (let r = 0; r < nR; r++) {
    const rang = grille[r];
    // Sens de chaque maille, de gauche à droite (la grille va de droite à gauche).
    const sens = Array.from({ length: nC }, (_, k) => sensDeLaMaille(rang[nC - 1 - k]));
    const s = (u) => {
      const k = Math.min(nC - 1, Math.max(0, Math.floor(u)));
      const f = u - k;
      // Près du bord de la maille, on passe en douceur au sens de la voisine.
      if (f < 0.22 && k > 0 && sens[k - 1] !== sens[k]) return sens[k] * lisse(0.5 + f / 0.44) + sens[k - 1] * (1 - lisse(0.5 + f / 0.44));
      if (f > 0.78 && k < nC - 1 && sens[k + 1] !== sens[k]) {
        const g = lisse(0.5 + (1 - f) / 0.44);
        return sens[k] * g + sens[k + 1] * (1 - g);
      }
      return sens[k];
    };
    const yr = y0 + r * pas;
    const ligne = [];
    for (let i = 0; i <= nC * N; i++) {
      const u = i / N;
      const phi = 2 * Math.PI * (u - 0.5);
      ligne.push([x0 + u + A * Math.sin(2 * phi), yr + H * Math.cos(phi), -s(u) * D * Math.cos(2 * phi)]);
    }
    if (r % 2 === 1) ligne.reverse();
    // Lisière : le fil remonte au rang suivant par un demi-tour, côté où il se trouve.
    if (chemin.length) {
      const [xa, ya, za] = chemin[chemin.length - 1];
      const [xb, yb, zb] = ligne[0];
      const cote = xa > 0 ? 1 : -1;
      for (let j = 1; j < 10; j++) {
        const t = j / 10;
        chemin.push([
          xa + (xb - xa) * t + cote * 0.32 * Math.sin(Math.PI * t),
          ya + (yb - ya) * t,
          za + (zb - za) * t,
        ]);
      }
    }
    chemin.push(...ligne);
  }
  return { points: chemin, largeur, hauteur };
}

/**
 * Brins d'un fil retors : `nb` brins enroulés autour du chemin, `tours` tours par largeur de maille.
 * Les repères suivent le fil sans vriller (transport parallèle). Renvoie une liste de chemins.
 */
export function brinsDuFil(points, { nb = 3, rayon = MODELE.rayon * 0.48, tours = 2.2 } = {}) {
  const n = points.length;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norme = (v) => Math.hypot(v[0], v[1], v[2]) || 1;
  const unit = (v) => {
    const l = norme(v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tangentes = points.map((p, i) => unit(sub(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)])));
  // Premier repère : une normale quelconque perpendiculaire à la tangente.
  let normale = unit(croix(tangentes[0], Math.abs(tangentes[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const brins = Array.from({ length: nb }, () => []);
  let longueur = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      longueur += norme(sub(points[i], points[i - 1]));
      // Transport parallèle : on retire de la normale sa part le long de la nouvelle tangente.
      const t = tangentes[i];
      normale = unit(sub(normale, t.map((x) => x * dot(normale, t))));
    }
    const b = croix(tangentes[i], normale);
    const angle0 = 2 * Math.PI * tours * longueur;
    for (let k = 0; k < nb; k++) {
      const a = angle0 + (2 * Math.PI * k) / nb;
      const c = Math.cos(a) * rayon;
      const s = Math.sin(a) * rayon;
      const p = points[i];
      brins[k].push([p[0] + normale[0] * c + b[0] * s, p[1] + normale[1] * c + b[1] * s, p[2] + normale[2] * c + b[2] * s]);
    }
  }
  return brins;
}

// ---------- 3D fidèle des jetés, diminutions et augmentations (placement par les liens) ----------
//
// La grille vient de simulerLiens : chaque maille connaît les mailles du rang du dessous qu'elle traverse.
//   - La place d'une maille (ses « pieds ») est au milieu de ses mailles du dessous ; un jeté se glisse entre ses
//     voisines ; les mailles d'une augmentation s'écartent autour de leur maille commune ; puis on écarte un peu
//     les mailles trop serrées.
//   - La tête d'une maille va là où passe la maille du rang suivant qui la traverse : dans une diminution, les têtes
//     se rassemblent sous la nouvelle maille, celle du dessus penche (à droite pour 2 ensemble, à gauche pour le
//     surjet) et celles du dessous passent derrière.
//   - Un jeté ne traverse rien : sa boucle reste haute et plate, et les mailles du dessous s'écartent : un trou.

import { simulerLiens, largeurMotif, maillesLesPlusProches } from "../moteur/simulateur.js";
import { liensDuGeste } from "../catalogue/gestes.js";

const ECART_MIN = 0.74; // deux mailles d'un même rang ne se rapprochent pas plus (en largeurs de maille)
const RETRAIT_DESSOUS = 0.16;
const ANCRAGE = 0.6; // part de l'espacement régulier dans la place d'une maille
const PORTEE_TROU = 1.1; // les têtes à moins de cette distance d'un jeté s'en écartent…
const ECART_TROU = 0.55; // … d'au plus cette distance
const ECART_PIEDS = 0.12; // de combien les voisines d'un jeté s'en écartent dans son rang
const TETE_MAX_RASSEMBLE = 0.85; // décalage permis quand 3 mailles ou plus sont rassemblées
const GONFLE = 0.42; // relief d'une noisette vers l'endroit
const TIRAGE_TETE = 0.7; // part du chemin vers la maille du rang suivant que fait la tête
const TETE_MAX = 0.45; // une tête ne se décale pas de plus (en largeurs de maille) // de combien la tête d'une maille cachée dans une diminution passe derrière

/**
 * Gestes dessinés fil par fil grâce aux liens (lot 1 : jetés, diminutions, augmentations).
 * Les mailles glissées, doubles, passées par-dessus, enroulées et les torsades restent approchées pour l'instant.
 */
export const GESTES_LIES = new Set(
  "end env endT envT jete 2ens 2ensEnv ssk ssp 3ens 3ensEnv 3ensT 3ensBA_c sd 5ens 5ensEnv aug augEnv endEnv_f 1en3 1en3Env_e 1en3j 1en3jEnv etoileEnd etoileEnv croise_b croise_e augID_f".split(" ")
);

/** Le point se dessine-t-il fil par fil avec les liens (tous ses gestes sont dans GESTES_LIES) ? */
export function pointLie(point) {
  return [...(point.miseEnPlace || []), ...point.rangs].every((r) => [...(r.debut || []), ...r.motif, ...(r.fin || [])].every((c) => GESTES_LIES.has(c)));
}

/** Places des mailles de chaque rang, de gauche à droite (vu de l'endroit), et décalage des têtes. */
export function placerLesMailles(grille, montage) {
  const rangs = [];
  let precedent = Array.from({ length: montage }, (_, j) => j + 0.5);
  let enfantsDuPrecedent = null;
  for (let r = 0; r < grille.length; r++) {
    const brut = grille[r];
    const n = brut.length;
    const nP = precedent.length;
    // De gauche à droite ; les parents aussi.
    const cellules = Array.from({ length: n }, (_, j) => {
      const c = brut[n - 1 - j];
      return { ...c, parents: c.parents.map((p) => nP - 1 - p).sort((a, b) => a - b) };
    });
    const X = cellules.map((c) => (c.parents.length ? c.parents.reduce((t, p) => t + precedent[p], 0) / c.parents.length : NaN));
    // Augmentations : les mailles qui partagent les mêmes parents s'écartent autour d'eux.
    for (let j = 0; j < n; ) {
      const cle = cellules[j].parents.join(",");
      let k = j + 1;
      while (k < n && cle && (cellules[k].parents.join(",") === cle || (cellules[k].jete && k + 1 < n && cellules[k + 1].parents.join(",") === cle))) k++;
      const groupe = [];
      for (let i = j; i < k; i++) groupe.push(i);
      if (groupe.length > 1) groupe.forEach((i, q) => (X[i] = X[j] + (q - (groupe.length - 1) / 2) * 0.62));
      j = k;
    }
    // Jetés et augmentations levées : entre leurs voisines.
    for (let j = 0; j < n; j++) {
      if (!Number.isNaN(X[j])) continue;
      let g = j - 1;
      while (g >= 0 && Number.isNaN(X[g])) g--;
      let d = j + 1;
      while (d < n && Number.isNaN(X[d])) d++;
      const xg = g >= 0 ? X[g] : null;
      const xd = d < n ? X[d] : null;
      if (xg !== null && xd !== null) X[j] = xg + ((xd - xg) * (j - g)) / (d - g);
      else if (xg !== null) X[j] = xg + (j - g) * 0.9;
      else if (xd !== null) X[j] = xd - (d - j) * 0.9;
      else X[j] = j + 0.5;
    }
    // Un tricot garde ses colonnes : chaque rang est ramené vers un espacement régulier, centré sur le montage
    // (sinon les petits écarts s'ajoutent de rang en rang et le tricot penche).
    for (let j = 0; j < n; j++) X[j] = (1 - ANCRAGE) * X[j] + ANCRAGE * (montage / 2 + j - (n - 1) / 2);
    // On écarte les mailles trop serrées, sans changer leur ordre.
    for (let it = 0; it < 30; it++) {
      let bouge = false;
      for (let j = 0; j + 1 < n; j++) {
        const e = X[j + 1] - X[j];
        if (e < ECART_MIN) {
          const d = (ECART_MIN - e) / 2;
          X[j] -= d;
          X[j + 1] += d;
          bouge = true;
        }
      }
      if (!bouge) break;
    }
    // Têtes du rang du dessous : là où passe la maille qui les traverse ; dans une diminution, les cachées reculent.
    const enfants = Array.from({ length: nP }, () => []);
    const retrait = new Array(nP).fill(0);
    cellules.forEach((c, j) => {
      for (const p of c.parents) enfants[p].push(j);
      if (c.parents.length > 1) {
        const ps = c.parents;
        const dessus = c.aspect === "Vdroite" ? ps[0] : c.aspect === "Vgauche" ? ps[ps.length - 1] : ps[Math.floor(ps.length / 2)];
        for (const p of ps) if (p !== dessus) retrait[p] = Math.max(retrait[p], RETRAIT_DESSOUS * (1 + 0.3 * Math.abs(p - dessus)));
      }
    });
    if (r > 0) {
      const rp = rangs[r - 1];
      // Le décalage est un peu retenu : la maille du dessous se penche sans s'étirer.
      rp.tete = rp.X.map((x, p) => {
        if (!enfants[p].length) return 0;
        // Une maille rassemblée avec 2 autres ou plus (étoile, 3 ensemble) va plus loin : c'est le fronce.
        const rassemble = enfants[p].some((j) => cellules[j].parents.length >= 3);
        const max = rassemble ? TETE_MAX_RASSEMBLE : TETE_MAX;
        // Dans une diminution, les têtes se rassemblent au milieu de leurs mailles (là où la nouvelle maille les prend).
        const cible = (j) => {
          const ps = cellules[j].parents;
          return ps.length > 1 ? (X[j] + ps.reduce((t, q) => t + rp.X[q], 0) / ps.length) / 2 : X[j];
        };
        const d = (enfants[p].reduce((t, j) => t + cible(j), 0) / enfants[p].length - x) * (rassemble ? 0.9 : TIRAGE_TETE);
        return Math.max(-max, Math.min(max, d));
      });
      // Noisette : mailles nées d'une augmentation et reprises ensemble au rang suivant ; elles gonflent vers l'endroit.
      rp.gonfle = rp.cellules.map((c, p) => {
        const freres = c.parents.length === 1 && rp.cellules.filter((d) => d.parents.length === 1 && d.parents[0] === c.parents[0]).length >= 3;
        const repris = enfants[p].length === 1 && cellules[enfants[p][0]].parents.length >= 3;
        return freres && repris ? GONFLE : 0;
      });
      // Sous un jeté, les têtes du rang du dessous s'écartent : c'est le trou.
      cellules.forEach((c, j) => {
        if (!c.jete) return;
        rp.X.forEach((x, p) => {
          // Pas pour une maille rassemblée (étoile) : le jeté est au milieu de son fronce.
          if (enfants[p].some((k) => cellules[k].parents.length >= 3)) return;
          const d = x + rp.tete[p] - X[j];
          if (Math.abs(d) < PORTEE_TROU) rp.tete[p] += Math.sign(d || 1) * ECART_TROU * (1 - Math.abs(d) / PORTEE_TROU);
        });
        // Les pieds des voisines du jeté, dans son propre rang, s'écartent un peu aussi.
        for (const k of [j - 1, j + 1]) if (k >= 0 && k < n && !cellules[k].jete) X[k] += Math.sign(k - j) * ECART_PIEDS;
      });
      rp.retrait = retrait;
    }
    rangs.push({ cellules, X, tete: new Array(n).fill(0), retrait: new Array(n).fill(0), gonfle: new Array(n).fill(0) });
    precedent = X;
    enfantsDuPrecedent = enfants;
  }
  return rangs;
}

/**
 * Chemin du fil d'une grille liée (simulerLiens). Options : montage (mailles montées), rangs dessinés [de, a),
 * fenêtre horizontale { xMin, xMax } (en largeurs de maille, depuis le bord gauche du montage).
 * Renvoie { points, largeur, hauteur } centré en (0, 0), comme cheminDuFil.
 */
export function cheminDuFilLie(grille, { montage, de = 0, a = grille.length, fenetre = null } = {}, modele = MODELE) {
  const { pas, H, A, D, points: N } = modele;
  const places = placerLesMailles(grille, montage);
  const nR = a - de;
  const y0 = -((nR - 1) * pas) / 2;
  let xmin = Infinity;
  let xmax = -Infinity;
  const lignes = [];
  for (let r = de; r < a; r++) {
    const { cellules, X, tete, retrait, gonfle } = places[r];
    const n = X.length;
    const B = Array.from({ length: n + 1 }, (_, j) => (j === 0 ? X[0] - 0.5 : j === n ? X[n - 1] + 0.5 : (X[j - 1] + X[j]) / 2));
    // Un pont qui touche un jeté reste haut (le jeté n'est retenu par aucune maille).
    const creux = B.map((_, j) => ((j > 0 && cellules[j - 1].jete) || (j < n && cellules[j].jete) ? 0.3 : 1));
    let j0 = 0;
    let j1 = n;
    if (fenetre) {
      while (j0 < n && X[j0] < fenetre.xMin) j0++;
      j1 = j0;
      while (j1 < n && X[j1] < fenetre.xMax) j1++;
    }
    if (j1 <= j0) continue;
    xmin = Math.min(xmin, B[j0]);
    xmax = Math.max(xmax, B[j1]);
    const yr = y0 + (r - de) * pas;
    const ligne = [];
    for (let j = j0; j < j1; j++) {
      const c = cellules[j];
      const w = B[j + 1] - B[j];
      const Ae = c.jete ? A * 0.2 : A * Math.min(1.3, Math.max(0.6, w));
      const s0 = c.sens;
      const sg = j > 0 ? cellules[j - 1].sens : s0;
      const sd = j + 1 < n ? cellules[j + 1].sens : s0;
      for (let i = j === j0 ? 0 : 1; i <= N; i++) {
        const t = i / N;
        const phi = 2 * Math.PI * (t - 0.5);
        const cos = Math.cos(phi);
        const xb = phi < 0 ? B[j] + ((X[j] - B[j]) * (phi + Math.PI)) / Math.PI : X[j] + ((B[j + 1] - X[j]) * phi) / Math.PI;
        const bosse = Math.pow((1 + cos) / 2, 1.5);
        const remonte = cos < 0 ? (1 - (phi < 0 ? creux[j] : creux[j + 1])) * H * -cos : 0;
        let s = s0;
        if (t < 0.22 && sg !== s0) {
          const g = lisse(0.5 + t / 0.44);
          s = s0 * g + sg * (1 - g);
        } else if (t > 0.78 && sd !== s0) {
          const g = lisse(0.5 + (1 - t) / 0.44);
          s = s0 * g + sd * (1 - g);
        }
        const profond = c.jete ? 0.35 : 1;
        ligne.push([
          xb + Ae * Math.sin(2 * phi) + tete[j] * bosse,
          yr + H * cos + remonte,
          -s * D * Math.cos(2 * phi) * profond - s0 * retrait[j] * bosse + gonfle[j] * Math.sqrt((1 + cos) / 2),
        ]);
      }
    }
    lignes.push(ligne);
  }
  // Centrage et lisières, comme cheminDuFil.
  const cx = (xmin + xmax) / 2;
  const chemin = [];
  lignes.forEach((l, r) => {
    const ligne = l.map(([x, y, z]) => [x - cx, y, z]);
    if (r % 2 === 1) ligne.reverse();
    if (chemin.length) {
      const [xa, ya, za] = chemin[chemin.length - 1];
      const [xb, yb, zb] = ligne[0];
      const cote = xa > 0 ? 1 : -1;
      for (let k = 1; k < 10; k++) {
        const t = k / 10;
        chemin.push([xa + (xb - xa) * t + cote * 0.32 * Math.sin(Math.PI * t), ya + (yb - ya) * t, za + (zb - za) * t]);
      }
    }
    chemin.push(...ligne);
  });
  return { points: chemin, largeur: fenetre ? fenetre.xMax - fenetre.xMin : xmax - xmin, hauteur: (nR - 1) * pas + 2 * H };
}

/** Nombre de mailles d'un tricot à plat d'au moins `motifs` répétitions, qui tombe juste à chaque rang. */
const largeurDuTricot = (point, motifs) => maillesLesPlusProches({ ...point, miseEnPlace: [] }, motifs * largeurMotif(point), "plat");

/**
 * Échantillon fil par fil d'un point lié : un nombre entier de motifs (au moins `mailles` × `rangs` quand c'est
 * possible, sans dépasser `max` mailles), pris au milieu d'un tricot plus large. Renvoie le chemin et la taille, ou null.
 */
export function echantillonLie(point, { mailles = 16, rangs = 20, max = 900 } = {}) {
  if (!pointLie(point)) return null;
  const L = largeurMotif(point);
  const Hm = point.rangs.length;
  let nx = Math.max(1, Math.ceil(mailles / L));
  let ny = Math.max(1, Math.ceil(rangs / Hm));
  while (nx * L * ny * Hm > max && (nx > 1 || ny > 1)) {
    if (nx * L >= ny * Hm && nx > 1) nx--;
    else if (ny > 1) ny--;
    else nx--;
  }
  const total = largeurDuTricot(point, nx + 4);
  const sim = total && simulerLiens(point, { mailles: total, rangs: ny * Hm });
  if (!sim?.ok) return null;
  const xMin = Math.round(total / 2 - (nx * L) / 2);
  const fenetre = { xMin, xMax: xMin + nx * L };
  const fil = cheminDuFilLie(sim.grille, { montage: total, fenetre });
  return { ...fil, mailles: nx * L, rangs: ny * Hm };
}

/**
 * Une répétition du motif d'un point lié, avec une maille et un rang de voisinage tout autour (pour les textures
 * cuites, qui se répètent sans couture). Renvoie { points, mailles, rangs } ou null.
 */
export function tuileLiee(point) {
  if (!pointLie(point)) return null;
  const L = largeurMotif(point);
  const Hm = point.rangs.length;
  const total = largeurDuTricot(point, 5);
  const sim = total && simulerLiens(point, { mailles: total, rangs: 3 * Hm });
  if (!sim?.ok) return null;
  const xMin = Math.round(total / 2 - L / 2);
  const fenetre = { xMin: xMin - 1, xMax: xMin + L + 1 };
  const fil = cheminDuFilLie(sim.grille, { montage: total, de: Hm - 1, a: 2 * Hm + 1, fenetre });
  return { points: fil.points, mailles: L, rangs: Hm };
}
