// Conseils de points selon la grosseur de la laine (0.18.0, stories C-2 et C-3 de `23`).
// Jugement de tricot proposé par Claude et validé par Deborah le 09/11/2026 (15 h 27) :
// une table courte, comme l'avis « sur les côtés », pas tirée des articles sources.
// Corrigeable point par point dans CORRECTIONS_LAINE.
import { largeurMotif } from "../moteur/simulateur.js";

/** Les épaisseurs de la réserve rangées en quatre grosseurs. */
export const GROSSEURS = [
  { id: "fine", nom: "fine", epaisseurs: ["lace", "fingering", "sport"] },
  { id: "moyenne", nom: "moyenne", epaisseurs: ["dk", "worsted"] },
  { id: "epaisse", nom: "épaisse", epaisseurs: ["aran"] },
  { id: "tres-epaisse", nom: "très épaisse", epaisseurs: ["bulky", "super-bulky"] },
];

/** Grosseur d'une laine (« fine », « epaisse »…), ou null si son épaisseur n'est pas connue. */
export function grosseurDeLaine(laine) {
  const ep = laine?.epaisseur;
  return GROSSEURS.find((g) => g.epaisseurs.includes(ep))?.id ?? null;
}

/** Au-delà de ces largeurs de motif, un texturé n'est plus « conseillé » en laine épaisse / très épaisse. */
export const MOTIF_MAX = { epaisse: 6, "tres-epaisse": 4 };

const conseille = (raison) => ({ avis: "conseille", raison });
const possible = (raison) => ({ avis: "possible", raison });
const peuAdapte = (raison) => ({ avis: "deconseille", raison });

/**
 * Corrections point par point : { [pointId]: { [grosseur]: avis | null } }.
 * null retire la mention pour cette grosseur. Vide au départ (C-4 : Deborah corrige après essai).
 */
export const CORRECTIONS_LAINE = {};

/**
 * Avis d'un point pour la laine : { avis: "conseille" | "possible" | "deconseille", raison } ;
 * null quand il n'y a rien à dire (laine moyenne, laine fine sans dentelle, épaisseur inconnue).
 */
export function avisLaine(point, laine) {
  const g = grosseurDeLaine(laine);
  if (!g || !point) return null;
  const correction = CORRECTIONS_LAINE[point.id];
  if (correction && g in correction) return correction[g];
  const ajoure = point.famille === "ajoures";
  if (g === "fine") return ajoure ? conseille("Beau en laine fine : les jours se dessinent bien.") : null;
  if (g === "moyenne") return null;
  if (g === "epaisse") {
    if (ajoure) return possible("En laine épaisse, les jours paraissent plus lourds.");
    if (point.famille === "textures" && largeurMotif(point) > MOTIF_MAX.epaisse) return null;
    return conseille("Beau en laine épaisse : le relief ressort.");
  }
  // Très épaisse
  if (ajoure) return peuAdapte("En grosse laine, la dentelle se perd et devient lourde.");
  if (point.famille === "textures" && largeurMotif(point) > MOTIF_MAX["tres-epaisse"]) {
    return possible("En grosse laine, ce motif devient très grand.");
  }
  return conseille("Beau en grosse laine : le relief ressort.");
}

// ---------------- C-3 : le motif tient-il assez de fois dans le bloc ? ----------------

/** Sous 3 répétitions, le motif ne se voit presque pas ; à 3 ou 4, on le dit seulement. */
export const FOIS_MIN = 3;
export const FOIS_A_SIGNALER = 4;

/**
 * Combien de fois le motif tient dans le bloc : { fois, avis?, raison } ou null s'il tient largement.
 * mailles : nombre de mailles estimé du bloc ; enRond : « sur le tour », colonne : « dans la colonne » (sinon « dans la largeur »).
 */
export function motifDansLeBloc(point, mailles, { enRond = false, colonne = false } = {}) {
  if (!point || !(mailles > 0)) return null;
  const l = largeurMotif(point);
  if (l <= 1) return null;
  const fois = Math.floor(mailles / l);
  if (fois > FOIS_A_SIGNALER) return null;
  const ou = colonne ? "dans la colonne" : enRond ? "sur le tour" : "dans la largeur";
  if (fois < FOIS_MIN) {
    const combien = fois === 0 ? "ne tient pas une seule fois" : `ne tient que ${fois} fois`;
    return { fois, avis: "deconseille", raison: `Le motif ${combien} ${ou} : il ne se verra presque pas.` };
  }
  return { fois, raison: `Le motif tient ${fois} fois ${ou}.` };
}

/**
 * Mailles estimées d'un bloc pendant le choix d'un point : largeur (ou tour) × densité de la laine dans ce point.
 * largeurCm : largeur du bloc (déjà divisée par le nombre de colonnes) ; densite : mailles pour 10 cm dans ce point.
 */
export function maillesEstimees(largeurCm, densite) {
  if (!(largeurCm > 0) || !(densite?.mailles > 0)) return null;
  return Math.round((largeurCm * densite.mailles) / 10);
}

const ORDRE = { conseille: 0, possible: 1, deconseille: 2 };

/**
 * Avis complet « avec ta laine » : la table, puis le calcul du motif (qui peut faire passer en « peu adapté »).
 * Renvoie { avis, raison, motif } ou null (rien à dire). motif = la mention du calcul quand il y en a une.
 */
export function avisAvecLaLaine(point, laine, motif = null) {
  const table = avisLaine(point, laine);
  if (motif?.avis === "deconseille") return { avis: "deconseille", raison: motif.raison, motif: null, table };
  if (!table && !motif) return null;
  return { avis: table?.avis ?? null, raison: table?.raison ?? null, motif: motif?.raison ?? null, table };
}

/** Rang de tri d'un avis de laine : conseillé 0, rien 1, possible 2, peu adapté 3. */
export function rangLaine(a) {
  if (!a?.avis) return 1;
  return { conseille: 0, possible: 2, deconseille: 3 }[a.avis];
}

/**
 * « Pour ma laine » : garde les points conseillés ou possibles pour la laine (jamais les peu adaptés).
 * En laine moyenne (ou d'épaisseur inconnue), la table n'a rien à dire : tous les points restent, sauf ceux que le calcul refuse.
 */
export function convientALaLaine(a, grosseur = null) {
  if (a?.avis === "deconseille") return false;
  if (!grosseur || grosseur === "moyenne") return true;
  return a?.avis === "conseille" || a?.avis === "possible";
}
