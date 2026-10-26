// Recherche par critères dans le catalogue (en plus du nom) : chaque critère coché réduit la liste.
import { largeurMotif } from "../moteur/simulateur.js";

/** Un motif de 12 mailles ou plus demande de la largeur pour se voir en entier. */
export const SEUIL_GRAND_MOTIF = 12;

export const CRITERES = [
  { id: "reversible", libelle: "Réversible", garde: (p) => p.proprietes.reversible },
  { id: "neRoulePas", libelle: "Ne roule pas", garde: (p) => !p.proprietes.roule },
  { id: "elastique", libelle: "Élastique", garde: (p) => p.proprietes.elasticite >= 2 },
  { id: "chaud", libelle: "Chaud / épais", garde: (p) => p.proprietes.chaleur >= 3 },
  { id: "ajoure", libelle: "Ajouré", garde: (p) => p.famille === "ajoures" },
  {
    id: "grandMotif",
    libelle: "Grand motif",
    aide: `${SEUIL_GRAND_MOTIF} mailles ou plus par motif, il demande de la largeur`,
    garde: (p) => largeurMotif(p) >= SEUIL_GRAND_MOTIF,
  },
];

/** Points qui remplissent tous les critères cochés (liste d'identifiants de critères). */
export function filtrerParCriteres(points, coches = []) {
  const actifs = CRITERES.filter((c) => coches.includes(c.id));
  return actifs.length ? points.filter((p) => actifs.every((c) => c.garde(p))) : points;
}
