// Conseil d'aiguille dans la fourchette de l'étiquette (0.18.0, story C-1 de `23`, règle validée le 09/11/2026).
// Une seule aiguille par projet : on choisit le bas, le milieu ou le haut de la fourchette
// selon la pièce (qui doit tenir ou rester souple) et le point principal (côtes, torsades, ajourés).
import { formaterNombre } from "../donnees/reserve.js";

/** Pièces qui doivent tenir (−1) ou rester souples (+1). */
export const TENDANCE_PIECE = { bonnet: -1, jambieres: -1, couverture: 1 };
/** Familles de points qui serrent mieux plus fin (−1) ou s'ouvrent plus gros (+1). */
export const TENDANCE_FAMILLE = { cotes: -1, torsades: -1, ajoures: 1 };

const PIECES = {
  echarpe: { une: "une écharpe", accord: "elle" },
  snood: { une: "un snood", accord: "il" },
  bonnet: { une: "un bonnet", accord: "il" },
  jambieres: { une: "des jambières", accord: "elles" },
  couverture: { une: "une couverture", accord: "elle" },
};

const RAISON_PIECE = {
  bonnet: "pour qu'il tienne bien",
  jambieres: "pour qu'elles tiennent bien",
  couverture: "pour qu'elle reste souple",
};
const RAISON_FAMILLE = {
  cotes: "pour des côtes bien serrées",
  torsades: "pour que les torsades ressortent",
  ajoures: "pour que les jours s'ouvrent",
};

/** Taille du milieu, arrondie au demi-millimètre qui existe dans la fourchette (le plus fin en cas d'égalité). */
export function milieuDeLaFourchette(min, max) {
  const m = (min + max) / 2;
  const demis = [];
  for (let t = Math.ceil(min * 2) / 2; t <= max + 1e-9; t += 0.5) demis.push(Math.round(t * 2) / 2);
  if (demis.length === 0) return Math.round(m * 4) / 4;
  return demis.reduce((meilleur, t) => (Math.abs(t - m) < Math.abs(meilleur - m) - 1e-9 ? t : meilleur), demis[0]);
}

/**
 * Taille conseillée dans la fourchette : { tailleMm, position: "bas" | "milieu" | "haut", score, piece, famille }.
 * null si la fourchette n'a qu'une taille (le conseil de l'étiquette reste).
 */
export function aiguilleDansLaFourchette({ piece, point, fourchette }) {
  if (!fourchette || !(fourchette.max - fourchette.min > 0.01)) return null;
  const sPiece = TENDANCE_PIECE[piece] || 0;
  const sFamille = TENDANCE_FAMILLE[point?.famille] || 0;
  const score = sPiece + sFamille;
  const position = score < 0 ? "bas" : score > 0 ? "haut" : "milieu";
  const tailleMm = position === "bas" ? fourchette.min : position === "haut" ? fourchette.max : milieuDeLaFourchette(fourchette.min, fourchette.max);
  return { tailleMm, position, score, sPiece, sFamille };
}

const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const mm = (t) => `${formaterNombre(t, 2)} mm`;

/** Raison du choix, en une proposition (« pour qu'elles tiennent bien »). */
function raison(conseil, piece, point) {
  const { sPiece, sFamille, position } = conseil;
  const rp = sPiece ? RAISON_PIECE[piece] : null;
  const rf = sFamille ? RAISON_FAMILLE[point.famille] : null;
  if (position === "milieu") {
    if (rp && rf) return `entre les deux : ${PIECES[piece]?.accord === "elles" ? "elles doivent" : PIECES[piece]?.accord === "elle" ? "elle doit" : "il doit"} ${sPiece < 0 ? "tenir" : "rester souple"}, mais ${sFamille > 0 ? "les jours doivent s'ouvrir" : point.famille === "torsades" ? "les torsades doivent ressortir" : "les côtes doivent serrer"}`;
    return "un bon équilibre entre tenue et souplesse";
  }
  // Une seule raison : celle de la pièce quand elle pousse dans ce sens (exemple validé : jambières en côtes), sinon celle du point.
  return rp || rf;
}

/**
 * Textes du conseil pour l'étape Matériel :
 * { tailleMm, position, texte, douce } ; douce = phrase sur l'aiguille choisie si elle est une autre taille de la fourchette.
 */
export function texteConseilFourchette({ piece, point, fourchette, tailleChoisie = null }) {
  const c = aiguilleDansLaFourchette({ piece, point, fourchette });
  if (!c) return null;
  const libellePosition = { bas: "le bas", milieu: "le milieu", haut: "le haut" }[c.position];
  const pieceTxt = PIECES[piece]?.une || "ta pièce";
  const debut = `Pour ${pieceTxt} en ${minuscule(point.nom)} : `;
  const fin = `, ${libellePosition} de la fourchette de l'étiquette (${mm(fourchette.min)} à ${mm(fourchette.max)}), ${raison(c, piece, point)}.`;
  const texte = debut + mm(c.tailleMm) + fin;
  let douce = null;
  const t = tailleChoisie;
  if (t !== null && t !== undefined && Math.abs(t - c.tailleMm) > 0.01 && t >= fourchette.min - 0.01 && t <= fourchette.max + 0.01) {
    douce = `Ton aiguille de ${mm(t)} marche aussi : le tricot sera un peu plus ${t > c.tailleMm ? "souple" : "serré"}.`;
  }
  return { ...c, texte, debut, tailleTexte: mm(c.tailleMm), fin, douce, choisie: t !== null && Math.abs(t - c.tailleMm) <= 0.01 };
}
