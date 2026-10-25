// Colonnes : un bloc (le corps ou une bande) coupé dans la largeur, chaque colonne avec son point.
// La répartition des mailles cherche des colonnes aussi égales que possible,
// chacune tombant juste sur son motif. Une colonne dont Deborah a fixé la largeur la garde.

import { maillesConviennent, maillesLesPlusProches } from "./simulateur.js";
import { nomAvecArticle } from "./dimensions.js";

export const COLONNES_MIN = 2;
export const COLONNES_MAX = 6;

/** Au-delà, la hauteur d'un bloc en colonnes ne suit plus le multiple commun des motifs (trop haut). */
export const MOTIF_COMMUN_MAX = 48;

const pgcd = (a, b) => (b === 0 ? a : pgcd(b, a % b));
const ppcm = (a, b) => (a * b) / pgcd(a, b);

/**
 * Répartit n mailles entre les colonnes.
 * colonnes = [{ point, mailles? }] ; mailles fixé = largeur choisie par Deborah.
 * reference : une autre répartition à suivre à égalité (pour que les colonnes de deux blocs s'alignent, en damier).
 * Renvoie la liste des nombres de mailles (dans l'ordre), ou null si aucune répartition ne tombe juste.
 */
export function repartirMailles(colonnes, n, mode = "plat", reference = null) {
  const fixes = colonnes.map((c) => (Number.isInteger(c.mailles) && c.mailles > 0 ? c.mailles : null));
  const libres = colonnes.map((c, i) => i).filter((i) => fixes[i] === null);
  const reste = n - fixes.reduce((t, m) => t + (m || 0), 0);
  for (const [i, m] of fixes.entries()) if (m !== null && !maillesConviennent(colonnes[i].point, m, mode)) return null;
  if (libres.length === 0) return reste === 0 ? fixes : null;
  if (reste < libres.length) return null;
  const ideal = reste / libres.length;

  // Candidats de chaque colonne libre : les nombres qui conviennent à son point, autour de la part égale.
  const candidats = libres.map((i) => {
    const liste = [];
    for (let m = 1; m <= reste; m++) {
      if (Math.abs(m - ideal) > Math.max(3, ideal * 0.6)) continue;
      if (maillesConviennent(colonnes[i].point, m, mode)) liste.push(m);
    }
    return liste;
  });

  // Programmation dynamique sur la somme : écart total au carré le plus petit.
  // meilleur[s] = { cout, choix } pour les colonnes déjà traitées et s mailles utilisées.
  let etats = new Map([[0, { cout: 0, choix: [] }]]);
  for (const [j, liste] of candidats.entries()) {
    const suivants = new Map();
    const ref = reference?.length === colonnes.length ? reference[libres[j]] : null;
    for (const [s, e] of etats) {
      for (const m of liste) {
        const t = s + m;
        if (t > reste) continue;
        const cout = e.cout + (m - ideal) ** 2 + (ref !== null && m !== ref ? 1e-3 : 0);
        const actuel = suivants.get(t);
        if (!actuel || cout < actuel.cout - 1e-9) suivants.set(t, { cout, choix: [...e.choix, m] });
      }
    }
    etats = suivants;
  }
  const fin = etats.get(reste);
  if (!fin) return null;
  const resultat = [...fixes];
  libres.forEach((i, j) => (resultat[i] = fin.choix[j]));
  return resultat;
}

/** Les colonnes sont-elles égales (ou leurs largeurs choisies à la main) pour n mailles ? */
export function repartitionEgale(colonnes, n, mode = "plat") {
  const r = repartirMailles(colonnes, n, mode);
  if (!r) return false;
  return colonnes.some((c) => Number.isInteger(c.mailles)) || r.every((m) => m === r[0]);
}

/**
 * Nombres de mailles les plus proches de n (au-dessous et au-dessus) où les colonnes sont toutes égales.
 * Renvoie { dessous, dessus } (null quand il n'y en a pas à moins de 60 mailles).
 */
export function totauxEgaux(colonnes, n, mode = "plat") {
  const libres = colonnes.map((c) => ({ point: c.point }));
  let dessous = null;
  let dessus = null;
  for (let e = 1; e <= 60 && (dessous === null || dessus === null); e++) {
    if (dessous === null && n - e >= libres.length && repartitionEgale(libres, n - e, mode)) dessous = n - e;
    if (dessus === null && repartitionEgale(libres, n + e, mode)) dessus = n + e;
  }
  return { dessous, dessus };
}

/**
 * Densité d'ensemble d'un bloc en colonnes : à mailles égales, la largeur est la somme des largeurs des colonnes.
 * Rangs : la moyenne des colonnes (elles sont tricotées ensemble, rang par rang).
 */
export function densiteDesColonnes(densites) {
  const k = densites.length;
  const mailles = k / densites.reduce((t, d) => t + 1 / d.mailles, 0);
  const rangs = densites.reduce((t, d) => t + d.rangs, 0) / k;
  const statut = densites.every((d) => d.statut === "mesuree") ? "mesuree" : "estimee";
  return { mailles, rangs, statut };
}

/**
 * Motif commun des colonnes : nombre de rangs après lequel toutes les colonnes ont fini leur motif
 * (plus petit multiple commun), et nombre de rangs de mise en place (le plus long).
 */
export function motifCommun(points) {
  let L = 1;
  for (const p of points) L = ppcm(L, p.rangs.length);
  if (L > MOTIF_COMMUN_MAX) L = Math.max(...points.map((p) => p.rangs.length));
  const mep = Math.max(0, ...points.map((p) => (p.miseEnPlace || []).length));
  return { L, mep };
}

/** Nombre de mailles suivant (sens = +1) ou précédent (−1) qui convient au point ; null s'il n'y en a pas. */
export function maillesVoisines(point, actuel, sens, mode = "plat") {
  for (let m = actuel + sens; m >= 1 && m <= actuel + 200; m += sens) {
    if (maillesConviennent(point, m, mode)) return m;
  }
  return null;
}

/** Nombre de mailles le plus proche qui convient : sert à proposer une colonne de départ. */
export const maillesColonneProches = (point, cible, mode = "plat") => maillesLesPlusProches(point, Math.max(1, Math.round(cible)), mode);

/**
 * Explication d'une répartition inégale : « colonnes du corps : 8 · 8 · 7 · 8 mailles, pour que le point de riz tombe juste ».
 * Renvoie null si les colonnes sont égales ou si Deborah a fixé des largeurs.
 */
export function explicationColonnes(colonnes, mailles, nomBloc) {
  if (colonnes.some((c) => Number.isInteger(c.mailles))) return null;
  if (mailles.every((m) => m === mailles[0])) return null;
  // Les points en cause : ceux qui ne tombent pas juste sur la part égale (arrondie au-dessous ou au-dessus).
  const ideal = mailles.reduce((t, m) => t + m, 0) / mailles.length;
  const enCause = [];
  for (const c of colonnes) {
    const libre = maillesConviennent(c.point, Math.floor(ideal)) && maillesConviennent(c.point, Math.ceil(ideal));
    if (!libre && !enCause.includes(c.point)) enCause.push(c.point);
  }
  if (enCause.length === 0) return `colonnes ${nomBloc} : ${mailles.join(" · ")} mailles (le total ne se partage pas également)`;
  enCause.splice(2);
  const points = enCause.map((p) => nomAvecArticle(p));
  const pluriel = enCause.length > 1 || enCause[0]?.article === "les";
  return `colonnes ${nomBloc} : ${mailles.join(" · ")} mailles, pour que ${points.join(" et ")} ${pluriel ? "tombent" : "tombe"} juste`;
}
