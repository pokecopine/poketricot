// Plan d'une couverture (E4, 0.21.0) : à plat, du bas vers le haut, avec une bordure tout autour.
// En une pièce : le plan de l'écharpe, avec la bordure de côté (bloc cotes, en cm) à gauche et à droite, sans lisière.
// En n panneaux (2 à 5) : des bandes de haut en bas, numérotées de gauche à droite, cousues au point de matelas ;
// chaque panneau a sa bordure en bas, en haut et sur son côté extérieur, et 1 maille de couture du côté cousu.
// Tous les panneaux ont les mêmes blocs, donc le même nombre de rangs (vérifié).
// Décisions et maquettes du 09/11 (stories 25). Fonctions pures, testées.

import { planEcharpe } from "./plan.js";
import { filDeCouture } from "./plan-jambieres.js";

/** Un câble porte environ 1,75 fois sa longueur de tricot à plat (80 cm → 140 cm, maquette du 09/11). */
export const PORTEE_CABLE = 1.75;

/** Longueurs de câble courantes (cm). */
export const CABLES = [60, 80, 100, 120, 150];

/** Panneaux : de 2 à 5. */
export const PANNEAUX = [2, 5];

/** Fil gardé au rabattage de chaque panneau, pour la couture (cm). */
export const FIL_RABATTAGE_COUVERTURE = 50;

/** Repères de l'assemblage : environ tous les 20 cm. */
export const ECART_REPERES_CM = 20;

export const porteeDuCable = (cableCm) => (Number.isFinite(cableCm) && cableCm > 0 ? Math.round(cableCm * PORTEE_CABLE) : null);

/** Le câble le plus court de la liste qui porte cette largeur (au-delà, le plus long). */
export function cableConseille(largeurCm) {
  return CABLES.find((c) => c * PORTEE_CABLE >= largeurCm) || CABLES.at(-1);
}

/**
 * Le montage conseillé pour une largeur et un câble.
 * → { montage: "piece" | "panneaux", panneaux, porteeCm, cableConseilleCm, trop }
 * Câble inconnu : une pièce, sans avis (trop = null).
 */
export function montageConseille(largeurCm, cableCm) {
  const porteeCm = porteeDuCable(cableCm);
  const cableConseilleCm = cableConseille(largeurCm);
  if (porteeCm === null) return { montage: "piece", panneaux: 2, porteeCm: null, cableConseilleCm, trop: null };
  if (largeurCm <= porteeCm) return { montage: "piece", panneaux: 2, porteeCm, cableConseilleCm, trop: false };
  const n = Math.min(PANNEAUX[1], Math.max(PANNEAUX[0], Math.ceil(largeurCm / porteeCm)));
  return { montage: "panneaux", panneaux: n, porteeCm, cableConseilleCm, trop: true };
}

/** Les bords d'un panneau (i de 1 à n, de gauche à droite). Sur un rang endroit, on part du bord droit. */
export function bordsDuPanneau(i, n) {
  const bordure = { lisiere: "aucune", bande: true };
  const couture = { lisiere: "couture", bande: false };
  return { droite: i === n ? bordure : couture, gauche: i === 1 ? bordure : couture };
}

export const positionDuPanneau = (i, n) => (i === 1 ? "gauche" : i === n ? "droite" : "milieu");
export const nomDuPanneau = (i, n) => ({ gauche: "Panneau de gauche", milieu: "Panneau du milieu", droite: "Panneau de droite" })[positionDuPanneau(i, n)];

/** Le nombre pair de rangs le plus proche de 20 cm, d'après la hauteur moyenne d'un rang ; et les sections de couture. */
export function reperesDeLAssemblage(rangs, longueurCm) {
  const hRang = longueurCm / Math.max(1, rangs);
  const pas = Math.max(2, 2 * Math.round(ECART_REPERES_CM / hRang / 2));
  const sections = Math.max(1, Math.ceil(rangs / pas));
  return { pas, sections, reperes: sections - 1 };
}

/**
 * entree = { largeurCm, longueurCm, panneaux (1 = une pièce), blocs, densites }
 * Les blocs : bas, corps (ou sections, bandes), haut, et cotes (la bordure de côté, en cm).
 */
export function planCouverture({ largeurCm, longueurCm, panneaux = 1, blocs, densites }) {
  const lateral = blocs.find((b) => b.zone === "cotes") || null;
  const laineBordure = lateral ? lateral.laineId ?? null : null;
  if (!(panneaux > 1)) {
    const r = planEcharpe({
      largeurCm, longueurCm, blocs, densites, bordsGardentLeCorps: true,
      bords: { droite: { lisiere: "aucune", bande: !!lateral }, gauche: { lisiere: "aucune", bande: !!lateral } },
    });
    if (r.plan) {
      r.plan.type = "couverture";
      r.plan.montageCouverture = "piece";
      r.plan.panneaux = null;
    }
    return r;
  }
  const n = Math.min(PANNEAUX[1], Math.round(panneaux));
  // La bordure de côté prend sa place de chaque côté ; le corps est partagé également.
  const plans = [];
  let corpsParPanneau = null;
  for (let i = 1; i <= n; i++) {
    const bords = bordsDuPanneau(i, n);
    // Largeur d'un panneau = sa part du corps + sa bordure de côté (s'il en a une).
    if (corpsParPanneau === null) {
      const gauche = lateral ? lateral.largeurCmG ?? lateral.largeurCm ?? 0 : 0;
      const droite = lateral ? lateral.largeurCm ?? 0 : 0;
      corpsParPanneau = (largeurCm - gauche - droite) / n;
      if (corpsParPanneau < 10) return { ok: false, erreurs: [{ bloc: null, nomBloc: null, message: "La couverture est trop étroite pour autant de panneaux." }], explications: [] };
    }
    const bordureCm = !lateral ? 0 : (i === 1 ? lateral.largeurCmG ?? lateral.largeurCm ?? 0 : 0) + (i === n ? lateral.largeurCm ?? 0 : 0);
    const r = planEcharpe({ largeurCm: corpsParPanneau + bordureCm, longueurCm, blocs, densites, bords, bordsGardentLeCorps: true });
    if (!r.ok) {
      return { ...r, erreurs: r.erreurs.map((e) => ({ ...e, message: `Panneau ${i} : ${e.message}` })) };
    }
    r.plan.type = "couverture";
    r.plan.numero = i;
    r.plan.position = positionDuPanneau(i, n);
    r.plan.nom = nomDuPanneau(i, n);
    r.plan.miroirDe = i === n ? 1 : i > 1 ? 2 : null;
    plans.push(r);
  }
  // Même nombre de rangs partout, bloc par bloc.
  const ref = plans[0].plan;
  for (const r of plans.slice(1)) {
    const memes = r.plan.rangs.length === ref.rangs.length
      && r.plan.blocs.every((b, k) => b.rangs === ref.blocs[k]?.rangs);
    if (!memes) {
      return { ok: false, erreurs: [{ bloc: null, nomBloc: null, message: "Les panneaux n'ont pas la même longueur : change un point ou une hauteur." }], explications: [] };
    }
  }
  const explications = [];
  for (const r of plans) for (const e of r.explications) if (!explications.includes(e)) explications.push(e);
  const longueurReelle = ref.longueur.reelleCm;
  const largeurReelle = plans.reduce((t, r) => t + r.plan.largeur.reelleCm, 0);
  const reperes = reperesDeLAssemblage(ref.rangs.length, longueurReelle);
  const plan = {
    type: "couverture",
    montageCouverture: "panneaux",
    panneaux: plans.map((r) => r.plan),
    // Pour les écrans qui lisent un seul plan : le panneau 1 (montage, blocs, rangs).
    montage: ref.montage,
    blocs: ref.blocs,
    rangs: ref.rangs,
    rabattage: ref.rabattage,
    lisieres: ref.lisieres,
    bords: ref.bords,
    bandesLaterales: ref.bandesLaterales,
    largeur: { viseeCm: largeurCm, reelleCm: largeurReelle },
    longueur: { viseeCm: longueurCm, reelleCm: longueurReelle },
    estime: ref.estime,
    explications,
    couture: {
      coutures: n - 1,
      filCm: n * FIL_RABATTAGE_COUVERTURE + (n - 1) * filDeCouture(longueurReelle),
      laineId: laineBordure,
    },
    assemblage: { ...reperes, coutures: n - 1 },
  };
  return { ok: true, erreurs: [], explications, plan, grille: plans[0].grille };
}
