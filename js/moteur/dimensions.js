// Dimensions : nombre de mailles et de rangs qui font tomber le motif juste,
// largeur commune à plusieurs points, rangs de transition.

import { maillesConviennent, maillesLesPlusProches } from "./simulateur.js";
import { formaterNombre } from "../donnees/reserve.js";

/** « le point de riz », « les côtes 2/2 », « la mini noisette ». */
export function nomAvecArticle(point) {
  const nom = point.nom.charAt(0).toLowerCase() + point.nom.slice(1);
  const article = point.article || "le";
  if (article === "l'") return `l'${nom}`;
  return `${article} ${nom}`;
}

const tombe = (point) => (point.article === "les" ? "tombent" : "tombe");

/**
 * Mailles pour une largeur dans un point.
 * Renvoie { ideal, retenu, largeurCm, explication } ; explication vaut null si aucun ajustement n'a été nécessaire.
 */
export function maillesPourLargeur(point, largeurCm, densite, mode = "plat") {
  const ideal = (largeurCm * densite.mailles) / 10;
  const retenu = maillesLesPlusProches(point, Math.max(1, Math.round(ideal)), mode);
  return {
    ideal,
    retenu,
    largeurCm: retenu === null ? null : (retenu * 10) / densite.mailles,
    explication: explicationAjustement(point, Math.max(1, Math.round(ideal)), retenu),
  };
}

/** « 37 mailles au lieu de 38 pour que le point de riz tombe juste » ; null si rien n'a changé. */
export function explicationAjustement(point, voulu, retenu, precision = "") {
  if (retenu === null || retenu === voulu) return null;
  return `${retenu} mailles au lieu de ${voulu} pour que ${nomAvecArticle(point)}${precision} ${tombe(point)} juste`;
}

/** Nombre de rangs d'un motif complet (sans la mise en place). */
export const rangsDuMotif = (point) => point.rangs.length;

/**
 * Rangs pour une hauteur, arrondis au motif complet le plus proche (au moins une fois le motif).
 * Les rangs de mise en place s'ajoutent une seule fois.
 * Renvoie { rangs, repetitions, hauteurCm }.
 */
export function rangsPourHauteur(point, hauteurCm, densite) {
  const L = rangsDuMotif(point);
  const mep = (point.miseEnPlace || []).length;
  const ideal = (hauteurCm * densite.rangs) / 10 - mep;
  const repetitions = Math.max(1, Math.round(ideal / L));
  const rangs = mep + repetitions * L;
  return { rangs, repetitions, hauteurCm: (rangs * 10) / densite.rangs };
}

/**
 * Cherche un même nombre de mailles qui convient à tous les points d'une liste de blocs
 * ({ point, densite }), en restant à ± tolérance de la largeur visée pour chacun.
 * Renvoie le nombre trouvé (le plus fidèle à la largeur), ou null.
 */
export function largeurCommune(blocs, largeurCm, { tolerance = 0.05, mode = "plat", prioritaire = 0 } = {}) {
  const ideaux = blocs.map((b) => (largeurCm * b.densite.mailles) / 10);
  const bas = Math.max(1, Math.floor(Math.min(...ideaux) * (1 - tolerance)));
  const haut = Math.ceil(Math.max(...ideaux) * (1 + tolerance));
  let meilleur = null;
  for (let n = bas; n <= haut; n++) {
    const ecarts = ideaux.map((i) => Math.abs(n / i - 1));
    if (ecarts.some((e) => e > tolerance + 1e-9)) continue;
    if (!blocs.every((b) => maillesConviennent(b.point, n, mode))) continue;
    const score = [Math.max(...ecarts), ecarts[prioritaire]];
    if (!meilleur || score[0] < meilleur.score[0] - 1e-12 || (Math.abs(score[0] - meilleur.score[0]) < 1e-12 && score[1] < meilleur.score[1])) {
      meilleur = { n, score };
    }
  }
  return meilleur ? meilleur.n : null;
}

/** Positions réparties régulièrement : d positions parmi n (indices de 0 à n − 1). */
export function positionsReparties(n, d) {
  const positions = new Set();
  for (let j = 0; j < d; j++) positions.add(Math.floor(((j + 0.5) * n) / d));
  return positions;
}

/**
 * Gestes d'un rang de transition, pour passer de n à m mailles (augmentations ou diminutions réparties).
 * Le rang se tricote en jersey (endroit sur l'endroit, envers sur l'envers).
 * Renvoie { gestes, augmentations, diminutions } ou null si l'écart est trop grand pour un seul rang.
 */
export function gestesDeTransition(n, m, cote) {
  const simple = cote === "E" ? "end" : "env";
  if (m === n) return { gestes: Array(n).fill(simple), augmentations: 0, diminutions: 0 };
  if (m > n) {
    const d = m - n;
    if (d > n) return null;
    const ou = positionsReparties(n, d);
    const aug = cote === "E" ? "aug" : "augEnv";
    return { gestes: Array.from({ length: n }, (_, i) => (ou.has(i) ? aug : simple)), augmentations: d, diminutions: 0 };
  }
  const d = n - m;
  if (2 * d > n) return null;
  // m mailles produites, dont d par une diminution (2 ensemble).
  const ou = positionsReparties(m, d);
  const dim = cote === "E" ? "2ens" : "2ensEnv";
  return { gestes: Array.from({ length: m }, (_, i) => (ou.has(i) ? dim : simple)), augmentations: 0, diminutions: d };
}

/** Phrase pour un rang de transition. */
export function explicationTransition(avant, apres, pointSuivant) {
  const ecart = Math.abs(apres - avant);
  const pluriel = pointSuivant.article === "les";
  const sorte = apres > avant ? "augmentation" : "diminution";
  const combien = ecart > 1 ? `${ecart} ${sorte}s réparties` : `1 ${sorte}`;
  const raison =
    apres > avant
      ? `${pluriel ? "resserrent" : "resserre"} davantage le tricot`
      : `${pluriel ? "sont plus larges" : "est plus large"} à nombre de mailles égal`;
  return `Rang de transition : ${combien} pour passer de ${avant} à ${apres} mailles, car ${nomAvecArticle(pointSuivant)} ${raison}.`;
}

export function texteCm(cm) {
  return `${formaterNombre(cm, cm >= 100 ? 0 : 1)} cm`;
}
