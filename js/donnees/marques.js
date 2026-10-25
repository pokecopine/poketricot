// Marques sur les points du catalogue : favoris (cœur) et « à tester en priorité » (éprouvette).
// Elles sont gardées dans les préférences (listes d'identifiants de points) et suivent la sauvegarde par fichier.

import { pointParId } from "../catalogue/points.js";

export const MARQUES = {
  favoris: {
    cle: "favoris",
    titre: "Mes points favoris",
    ajouter: "Ajouter aux favoris",
    retirer: "Retirer des favoris",
    ajoute: "Ajouté à tes points favoris.",
    retire: "Retiré de tes points favoris.",
  },
  aTester: {
    cle: "aTester",
    titre: "À tester en priorité",
    ajouter: "À tester en priorité",
    retirer: "Retirer des points à tester",
    ajoute: "Ajouté aux points à tester en priorité.",
    retire: "Retiré des points à tester.",
  },
};

/** Liste des points marqués (identifiants), sans doublon ni point disparu du catalogue. */
export function pointsMarques(prefs, cle) {
  const liste = Array.isArray(prefs?.[cle]) ? prefs[cle] : [];
  return [...new Set(liste)].filter((id) => pointParId(id));
}

export const estMarque = (prefs, cle, pointId) => Array.isArray(prefs?.[cle]) && prefs[cle].includes(pointId);

/** Modification des préférences pour cocher ou décocher une marque : { [cle]: nouvelle liste }. */
export function basculerMarque(prefs, cle, pointId) {
  const liste = Array.isArray(prefs?.[cle]) ? prefs[cle] : [];
  return { [cle]: liste.includes(pointId) ? liste.filter((id) => id !== pointId) : [...liste, pointId] };
}

/**
 * À l'import d'une sauvegarde : les préférences d'affichage du téléphone sont gardées,
 * mais les marques viennent du fichier (si le fichier en a).
 */
export function marquesDeLaSauvegarde(preferencesDuFichier) {
  const p = (preferencesDuFichier || [])[0] || {};
  const r = {};
  for (const { cle } of Object.values(MARQUES)) if (Array.isArray(p[cle])) r[cle] = p[cle];
  return r;
}
