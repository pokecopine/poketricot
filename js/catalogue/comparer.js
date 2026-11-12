// Écran « Comparer » (0.22.0) : liste des points mis de côté et lignes de la comparaison (fonctions pures, testées).
import { NIVEAUX } from "./points.js";
import { texteMultiple, texteOuvragesConseilles } from "./fiche.js";

/** 3 points au plus côte à côte (décision de Deborah du 12/11). */
export const MAX_COMPARER = 3;

/**
 * Met un point de côté, ou le retire s'il y est déjà.
 * → { liste, ajoute: bool, plein: bool } ; plein = la liste avait déjà 3 points (rien n'est ajouté).
 */
export function basculerMisDeCote(liste, id) {
  if (liste.includes(id)) return { liste: liste.filter((x) => x !== id), ajoute: false, plein: false };
  if (liste.length >= MAX_COMPARER) return { liste, ajoute: false, plein: true };
  return { liste: [...liste, id], ajoute: true, plein: false };
}

const ELASTICITE = ["", "Peu élastique", "Élastique", "Très élastique"];
const CHALEUR = ["", "Léger", "Moyen", "Chaud, épais"];
const AVIS = { conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté", refuse: "Ne convient pas ici" };

/** « Comme le jersey », « + 15 % », « − 10 % » */
export function texteLaineUtilisee(point) {
  const ecart = Math.round((point.consommation - 1) * 100);
  if (Math.abs(ecart) < 5) return "Comme le jersey";
  return ecart > 0 ? `+ ${ecart} %` : `− ${-ecart} %`;
}

const majuscule = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Les lignes de l'écran, dans l'ordre. Chaque ligne : { id, libelle, valeurs: [{ texte, detail?, ton? }], differente }.
 * ton : "conseille" | "possible" | "deconseille" | "refuse" (couleur de l'avis) ; une ligne est différente
 * dès que deux points n'ont pas le même texte.
 * options : avisBloc(point) → { avis, raison } (pendant un projet), avisLaine(point) → { avis, raison, motif } | null,
 * mode : "plat" | "rond" (nombre de mailles).
 */
export function lignesDeComparaison(points, { avisBloc = null, avisLaine = null, mode = "plat" } = {}) {
  const ligne = (id, libelle, valeur) => {
    const valeurs = points.map(valeur);
    const differente = new Set(valeurs.map((v) => v.texte)).size > 1;
    return { id, libelle, valeurs, differente };
  };
  const lignes = [];
  if (avisBloc) {
    lignes.push(ligne("bloc", "Pour ce bloc", (p) => {
      const a = avisBloc(p) || { avis: "conseille" };
      return { texte: AVIS[a.avis] || "Conseillé", detail: a.avis === "conseille" ? null : a.raison || null, ton: a.avis };
    }));
  }
  lignes.push(
    ligne("reversible", "Réversible", (p) => ({ texte: p.proprietes.reversible ? "Oui" : "Non, envers différent" })),
    ligne("bords", "Bords", (p) => ({ texte: p.proprietes.roule ? "Roule" : "Ne roule pas" })),
    ligne("elasticite", "Élasticité", (p) => ({ texte: ELASTICITE[p.proprietes.elasticite] || "—" })),
    ligne("chaleur", "Chaleur", (p) => ({ texte: CHALEUR[p.proprietes.chaleur] || "—" })),
    ligne("laine", "Laine utilisée", (p) => ({ texte: texteLaineUtilisee(p) })),
    ligne("niveau", "Niveau", (p) => ({ texte: NIVEAUX[p.proprietes.niveau] || "—" })),
    ligne("mailles", "Nombre de mailles", (p) => ({ texte: majuscule(texteMultiple(p, mode)) })),
    ligne("ouvrages", "Conseillé pour", (p) => ({ texte: majuscule(texteOuvragesConseilles(p)) })),
  );
  if (avisLaine) {
    lignes.push(ligne("avecLaine", "Avec ta laine", (p) => {
      const a = avisLaine(p);
      if (!a || (!a.raison && !a.motif)) return { texte: "Rien de particulier" };
      return { texte: a.raison || a.motif, detail: a.raison && a.motif ? a.motif : null, ton: a.raison ? a.avis : null };
    }));
  }
  return lignes;
}
