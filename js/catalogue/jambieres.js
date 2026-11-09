// Avis d'un point pour des jambières (0.19.0). Le catalogue n'a pas de colonne « jambières » :
// l'avis est déduit de celui du bonnet (une pièce en tube qui doit tenir), avec des raisons propres aux jambières.
// Corrigeable point par point dans AVIS_JAMBIERES. Pur, testé.
import { largeurMotif } from "../moteur/simulateur.js";

/** Corrections point par point : { [pointId]: { avis, raison? } } (vide en 0.19.0). */
export const AVIS_JAMBIERES = {};

/** Au-delà de cette largeur de motif (mailles), il en tient peu sur le tour d'une jambière. */
export const MOTIF_LARGE_JAMBIERES = 12;

export function avisJambieres(point) {
  if (AVIS_JAMBIERES[point.id]) return AVIS_JAMBIERES[point.id];
  if (point.famille === "ajoures") return { avis: "possible", raison: "Ajouré : des jambières légères, pour la mi-saison." };
  if (largeurMotif(point) >= MOTIF_LARGE_JAMBIERES) return { avis: "possible", raison: "Le motif est large : il en tient peu sur le tour d'une jambière." };
  const bonnet = point.ouvrages?.bonnet;
  if (!bonnet || bonnet.avis === "conseille") return { avis: "conseille" };
  if (bonnet.avis === "deconseille") return { avis: "deconseille", raison: "Peu adapté à une pièce qui doit tenir sur la jambe." };
  return { avis: "possible", raison: "Peu souple : la jambière tiendra surtout grâce à ses bords en côtes." };
}
