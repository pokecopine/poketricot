// Plan d'une jambière (E4, 0.19.0) : un tube droit, de la cheville vers le genou, tricoté deux fois (la paire).
// En rond (magic loop) : le plan du snood. À plat : le plan de l'écharpe dans la hauteur, avec une maille de couture
// de chaque côté, fermé ensuite par une couture au point de matelas (décisions du 09/11).
// Fonctions pures, testées.

import { planSnood } from "./plan-rond.js";
import { planEcharpe } from "./plan.js";

/** La jambière est tricotée 2 cm plus petite que le mollet, pour qu'elle tienne (décision du 09/11). */
export const AISANCE_JAMBIERES = 2;

/** Une paire : le patron se tricote deux fois. */
export const EXEMPLAIRES_JAMBIERES = 2;

/** Fil à garder au montage pour la couture : environ 3 fois la longueur de la jambière. */
export const FIL_COUTURE_PAR_CM = 3;

/** Longueur du fil de couture (cm), arrondie aux 10 cm. */
export const filDeCouture = (longueurCm) => Math.ceil((FIL_COUTURE_PAR_CM * longueurCm) / 10) * 10;

/**
 * entree = { mode: "rond" | "plat", tourCm (tour tricoté, déjà diminué de 2 cm), longueurCm, blocs, densites }
 * Les blocs : bas, corps (ou sections), haut ; pas de bandes latérales.
 */
export function planJambiere({ mode = "rond", tourCm, longueurCm, blocs, densites }) {
  const horizontaux = blocs.filter((b) => b.zone !== "cotes");
  const r = mode === "plat"
    ? planEcharpe({ largeurCm: tourCm, longueurCm, blocs: horizontaux, densites, lisieres: "couture", bordsGardentLeCorps: true })
    : planSnood({ tourCm, hauteurCm: longueurCm, blocs: horizontaux, densites, nomPiece: "la jambière" });
  if (!r.ok) return r;
  const plan = r.plan;
  plan.type = "jambieres";
  for (const b of plan.blocs) {
    if (b.zone === "bas" && !b.section) b.nom = "bord du bas";
    if (b.zone === "haut") b.nom = "bord du haut";
  }
  plan.mode = mode === "plat" ? "plat" : "rond";
  plan.exemplaires = EXEMPLAIRES_JAMBIERES;
  plan.couture = mode === "plat" ? { filCm: filDeCouture(plan.longueur.reelleCm), rangs: plan.rangs.length } : null;
  return r;
}
