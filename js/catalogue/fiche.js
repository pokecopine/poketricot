// Textes d'une fiche point, calculés depuis la recette (fonctions pures, testées).
import { largeurMotif, maillesMinimum } from "../moteur/simulateur.js";
import { PIECES, NIVEAUX } from "./points.js";

/** « nombre impair de mailles », « multiple de 9 + 3 mailles »… */
export function texteMultiple(point, mode = "plat") {
  const n = largeurMotif(point);
  if (mode === "rond") return n === 1 ? "n'importe quel nombre de mailles" : n === 2 ? "nombre pair de mailles" : `multiple de ${n} mailles`;
  const min = maillesMinimum(point, "plat");
  const plus = min % n;
  if (n === 1) return "n'importe quel nombre de mailles";
  if (n === 2) return plus === 0 ? "nombre pair de mailles" : "nombre impair de mailles";
  return plus === 0 ? `multiple de ${n} mailles` : `multiple de ${n} + ${plus} mailles`;
}

/** Propriétés en toutes lettres, pour les étiquettes de la fiche. */
export function etiquettesProprietes(point) {
  const p = point.proprietes;
  const elasticite = ["", "Peu élastique", "Élastique", "Très élastique"][p.elasticite] || "";
  return [
    p.reversible ? "Réversible" : "Envers différent",
    p.roule ? "Roule sur les bords" : "Ne roule pas",
    elasticite,
    NIVEAUX[p.niveau],
  ].filter(Boolean);
}

/** « Un peu plus de laine que le jersey (+15 %) » */
export function texteConsommation(point) {
  const ecart = Math.round((point.consommation - 1) * 100);
  if (Math.abs(ecart) < 5) return "Autant de laine que le jersey";
  if (ecart > 0) return `${ecart >= 30 ? "Gourmand en laine" : "Un peu plus de laine que le jersey"} (+${ecart} %)`;
  return `Moins de laine que le jersey (${ecart} %)`;
}

/** « 35 % de mailles en plus que le jersey pour la même largeur » */
export function texteDensite(point) {
  const m = Math.round((point.densite.mailles - 1) * 100);
  const r = Math.round((point.densite.rangs - 1) * 100);
  const morceaux = [];
  if (Math.abs(m) >= 5) morceaux.push(`${Math.abs(m)} % de mailles ${m > 0 ? "en plus" : "en moins"} pour la même largeur`);
  if (Math.abs(r) >= 5) morceaux.push(`${Math.abs(r)} % de rangs ${r > 0 ? "en plus" : "en moins"} pour la même hauteur`);
  return morceaux.length ? `Par rapport au jersey : ${morceaux.join(", ")}.` : "Même tension que le jersey.";
}

/** Pièces pour lesquelles le point est conseillé : « écharpe, snood, bonnet ». */
export function texteOuvragesConseilles(point) {
  const noms = PIECES.filter((p) => point.ouvrages[p.id]?.avis === "conseille").map((p) => p.nom.toLowerCase());
  return noms.length ? noms.join(", ") : "à choisir selon l'effet voulu";
}
