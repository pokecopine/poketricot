// Densités : combien de mailles et de rangs pour 10 cm, pour n'importe quel point du projet.
// Chaque résultat dit s'il est « mesuré » (un vrai échantillon dans ce point) ou « estimé ».
//
// Un échantillon enregistré ressemble à :
//   { id, laineId, tailleAiguille: 4.5, pointId: "riz", maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-10-24", pesee? }
// La longueur du câble ne compte pas : seule la taille d'aiguille sert à reconnaître une combinaison.

import { pointParId } from "../catalogue/points.js";
import { lireNombre, aiguillesEtiquette } from "../donnees/reserve.js";

/** En jersey, il y a en général un peu plus de rangs que de mailles pour 10 cm. */
export const RANGS_PAR_MAILLE_JERSEY = 1.4;

/** Mailles de jersey pour 10 cm, valeur moyenne par épaisseur (quand l'étiquette ne dit rien). */
export const JERSEY_PAR_EPAISSEUR = {
  lace: 33, fingering: 28, sport: 24, dk: 22, worsted: 19, aran: 17, bulky: 13, "super-bulky": 9,
};

const memeTaille = (a, b) => Math.abs(lireNombre(a) - lireNombre(b)) < 0.01;
const plusRecentDAbord = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
const densiteDe = (e) => ({ mailles: lireNombre(e.maillesPour10cm), rangs: lireNombre(e.rangsPour10cm) });
const valide = (e) => {
  const d = densiteDe(e);
  return d.mailles > 0 && d.rangs > 0;
};

/** Échantillons de la même combinaison laine / point / taille d'aiguille, le plus récent d'abord. */
export function echantillonsCorrespondants(echantillons, { laineId, pointId, tailleAiguille }) {
  return (echantillons || [])
    .filter((e) => valide(e) && e.laineId === laineId && e.pointId === pointId && memeTaille(e.tailleAiguille, tailleAiguille))
    .sort(plusRecentDAbord);
}

/**
 * Rapport réel entre deux points, appris des échantillons de Deborah :
 * pour chaque laine et taille d'aiguille où les deux points ont été tricotés (le plus récent de chacun),
 * on compare les densités, puis on fait la moyenne. Renvoie null s'il n'y a aucune paire.
 */
export function rapportAppris(echantillons, pointA, pointB) {
  if (pointA === pointB) return { mailles: 1, rangs: 1, paires: 0 };
  const groupes = new Map();
  for (const e of [...(echantillons || [])].filter(valide).sort(plusRecentDAbord)) {
    const cle = `${e.laineId}|${lireNombre(e.tailleAiguille)}`;
    if (!groupes.has(cle)) groupes.set(cle, {});
    const g = groupes.get(cle);
    if (!g[e.pointId]) g[e.pointId] = densiteDe(e);
  }
  const rapports = [];
  for (const g of groupes.values()) {
    if (g[pointA] && g[pointB]) {
      rapports.push({ mailles: g[pointB].mailles / g[pointA].mailles, rangs: g[pointB].rangs / g[pointA].rangs });
    }
  }
  if (rapports.length === 0) return null;
  const moyenne = (cle) => rapports.reduce((t, r) => t + r[cle], 0) / rapports.length;
  return { mailles: moyenne("mailles"), rangs: moyenne("rangs"), paires: rapports.length };
}

/** Facteur pour passer de la densité du point A à celle du point B (appris si possible, sinon catalogue). */
export function coefficient(echantillons, pointA, pointB) {
  const appris = rapportAppris(echantillons, pointA, pointB);
  if (appris) return { mailles: appris.mailles, rangs: appris.rangs, appris: appris.paires > 0 };
  const a = pointParId(pointA);
  const b = pointParId(pointB);
  if (!a || !b) throw new Error(`Point inconnu : ${!a ? pointA : pointB}`);
  return { mailles: b.densite.mailles / a.densite.mailles, rangs: b.densite.rangs / a.densite.rangs, appris: false };
}

/**
 * Densité de jersey quand il n'y a encore aucun échantillon tricoté :
 * l'échantillon de l'étiquette (corrigé si l'aiguille n'est pas celle conseillée),
 * sinon une valeur moyenne selon l'épaisseur de la laine.
 */
export function densiteJerseyProvisoire(laine, tailleAiguille) {
  const etiquette = laine?.echantillonEtiquette || {};
  const m = lireNombre(etiquette.mailles);
  if (m && m > 0) {
    // Avec deux tailles sur l'étiquette, l'échantillon correspond en général au milieu de la fourchette.
    const f = aiguillesEtiquette(laine);
    const aiguilleEtiquette = f ? (f.min + f.max) / 2 : null;
    const t = lireNombre(tailleAiguille);
    // Une aiguille plus grosse que celle conseillée donne moins de mailles pour 10 cm, et inversement.
    const mailles = aiguilleEtiquette && t ? (m * aiguilleEtiquette) / t : m;
    return { mailles, rangs: mailles * RANGS_PAR_MAILLE_JERSEY, origine: "etiquette" };
  }
  const parDefaut = JERSEY_PAR_EPAISSEUR[laine?.epaisseur];
  if (parDefaut) return { mailles: parDefaut, rangs: parDefaut * RANGS_PAR_MAILLE_JERSEY, origine: "epaisseur" };
  return null;
}

/**
 * Densité d'un point pour le projet.
 * Renvoie { mailles, rangs, statut: "mesuree" | "estimee", origine, echantillonId?, coefficientAppris? }
 * ou null si on ne sait rien de la laine.
 */
export function densitePoint({ pointId, laine, tailleAiguille, echantillons = [], echantillonPrincipal = null }) {
  // 1. L'échantillon choisi pour le projet, s'il est dans ce point.
  if (echantillonPrincipal && valide(echantillonPrincipal) && echantillonPrincipal.pointId === pointId) {
    return { ...densiteDe(echantillonPrincipal), statut: "mesuree", origine: "echantillon", echantillonId: echantillonPrincipal.id };
  }
  const laineId = laine?.id ?? echantillonPrincipal?.laineId;
  // 2. Un échantillon enregistré dans ce point, avec la même laine et la même taille d'aiguille.
  const trouve = echantillonsCorrespondants(echantillons, { laineId, pointId, tailleAiguille })[0];
  if (trouve) return { ...densiteDe(trouve), statut: "mesuree", origine: "echantillon", echantillonId: trouve.id };

  // 3. Conversion depuis un échantillon d'un autre point, même laine et même aiguille.
  const reference =
    echantillonPrincipal && valide(echantillonPrincipal)
      ? echantillonPrincipal
      : (echantillons || [])
          .filter((e) => valide(e) && e.laineId === laineId && memeTaille(e.tailleAiguille, tailleAiguille))
          .sort(plusRecentDAbord)[0];
  if (reference) {
    const c = coefficient(echantillons, reference.pointId, pointId);
    const d = densiteDe(reference);
    return {
      mailles: d.mailles * c.mailles, rangs: d.rangs * c.rangs,
      statut: "estimee", origine: "conversion", depuis: reference.pointId, coefficientAppris: c.appris,
    };
  }

  // 4. Pas d'échantillon : étiquette ou épaisseur, converties depuis le jersey.
  const jersey = densiteJerseyProvisoire(laine, tailleAiguille);
  if (!jersey) return null;
  const c = coefficient(echantillons, "jersey", pointId);
  return {
    mailles: jersey.mailles * c.mailles, rangs: jersey.rangs * c.rangs,
    statut: "estimee", origine: jersey.origine, coefficientAppris: c.appris,
  };
}

/** Densités de tous les points utilisés par un projet : { [pointId]: densité }. */
export function densitesDuProjet({ pointIds, laine, tailleAiguille, echantillons, echantillonPrincipal }) {
  const resultat = {};
  for (const pointId of new Set(pointIds)) {
    resultat[pointId] = densitePoint({ pointId, laine, tailleAiguille, echantillons, echantillonPrincipal });
  }
  return resultat;
}
