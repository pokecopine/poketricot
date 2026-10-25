// Métrage : combien de mètres de laine pour la pièce, comparé à ce qu'il reste dans la réserve.
//
// Méthode par pesée (la plus précise) : l'échantillon pesé donne des grammes par cm² dans son point ;
// on le ramène au jersey, puis chaque bloc est compté avec la consommation de son point.
// Méthode de repli : longueur de fil d'une maille estimée d'après la densité (relation de Munden :
// une maille plus serrée demande moins de fil), puis même calcul par surface.

import { pointParId } from "../catalogue/points.js";
import { lireNombre, metresPour100g, metrageLaine } from "../donnees/reserve.js";

export const MARGE = 0.1;

/**
 * Constante de la méthode de repli : en jersey détendu, mailles/cm × rangs/cm × (longueur d'une maille en cm)² ≈ 21.
 * Exemple : 22 mailles et 30 rangs pour 10 cm → environ 1,8 cm de fil par maille.
 * À calibrer sur de vrais échantillons pesés (E2-5).
 */
export const CONSTANTE_MAILLE = 21;

/** Fil (cm) pour 1 cm² de jersey, d'après une densité de jersey (pour 10 cm). */
export function filParCm2Jersey(densiteJersey) {
  const parCm2 = (densiteJersey.mailles / 10) * (densiteJersey.rangs / 10);
  return Math.sqrt(CONSTANTE_MAILLE * parCm2);
}

/** Grammes par cm² en jersey, depuis un échantillon pesé ; null s'il n'est pas pesé. */
export function grammesParCm2Jersey(echantillon) {
  const p = echantillon?.pesee;
  if (!p) return null;
  const g = lireNombre(p.grammes);
  const l = lireNombre(p.largeurCm);
  const h = lireNombre(p.hauteurCm);
  if (!(g > 0 && l > 0 && h > 0)) return null;
  const point = pointParId(echantillon.pointId);
  return g / (l * h) / (point?.consommation || 1);
}

/**
 * Surfaces par bloc d'un plan d'écharpe (cm²) : blocs horizontaux sur la largeur du corps (colonne par colonne
 * quand le bloc est coupé), bandes latérales sur toute la longueur.
 * Chaque surface dit sa laine (laineId : null pour la laine principale) : les bandes latérales et les lisières
 * prennent la laine du bloc qu'elles bordent, puisque la couleur change sur toute la largeur du rang.
 */
export function surfacesDuPlan(plan) {
  const surfaces = [];
  const lisieres = (densite) => (2 * plan.lisieres.mailles * 10) / densite.mailles;
  for (const b of plan.blocs) {
    const laineId = b.laineId || null;
    if (b.colonnes) {
      for (const c of b.colonnes) {
        surfaces.push({ blocId: b.id, colonneId: c.id, nom: b.nom, pointId: c.pointId, laineId, cm2: c.largeurCm * b.hauteurCm });
      }
      if (plan.lisieres.mailles) {
        surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.colonnes[0].pointId, laineId, cm2: lisieres(b.colonnes[0].densite) * b.hauteurCm });
      }
      continue;
    }
    // Largeur du bloc : ses mailles de corps à sa propre densité, plus les lisières.
    const largeur = (b.maillesCorps * 10) / b.densite.mailles + lisieres(b.densite);
    surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.pointId, laineId, cm2: largeur * b.hauteurCm });
  }
  if (plan.bandesLaterales) {
    const bandesCm = 2 * plan.bandesLaterales.largeurCm;
    // Une seule surface par laine (une seule en tout quand l'écharpe est d'une seule laine).
    const parLaine = new Map();
    for (const b of plan.blocs) parLaine.set(b.laineId || null, (parLaine.get(b.laineId || null) || 0) + b.hauteurCm);
    const total = [...parLaine.values()].reduce((t, h) => t + h, 0) || 1;
    for (const [laineId, h] of parLaine) {
      surfaces.push({
        blocId: plan.bandesLaterales.blocId, nom: "bandes latérales", pointId: plan.bandesLaterales.pointId, laineId,
        cm2: bandesCm * plan.longueur.reelleCm * (h / total),
      });
    }
  }
  return surfaces;
}

/**
 * Métrage nécessaire pour un plan.
 * entree = { plan, laine, echantillon (pesé ou non), densiteJersey (repli) }
 * Renvoie { metres (marge comprise), metresSansMarge, methode: "pesee" | "estimation", parBloc: [...] } ou null.
 */
export function metrageNecessaire({ plan, laine, echantillon, densiteJersey }) {
  const surfaces = surfacesDuPlan(plan);
  const mPour100g = metresPour100g(laine);
  const gJersey = grammesParCm2Jersey(echantillon);
  let parBloc;
  let methode;
  if (gJersey && mPour100g) {
    methode = "pesee";
    parBloc = surfaces.map((s) => {
      const conso = pointParId(s.pointId).consommation;
      const grammes = s.cm2 * gJersey * conso;
      return { ...s, grammes, metres: (grammes * mPour100g) / 100 };
    });
  } else if (densiteJersey) {
    methode = "estimation";
    const fil = filParCm2Jersey(densiteJersey);
    parBloc = surfaces.map((s) => {
      const conso = pointParId(s.pointId).consommation;
      const metres = (s.cm2 * fil * conso) / 100;
      return { ...s, grammes: mPour100g ? (metres * 100) / mPour100g : null, metres };
    });
  } else {
    return null;
  }
  const sansMarge = parBloc.reduce((t, b) => t + b.metres, 0);
  // Laine par laine : la longueur de fil dépend des mailles, pas de la marque (laines de même épaisseur).
  const totaux = new Map();
  for (const b of parBloc) totaux.set(b.laineId, (totaux.get(b.laineId) || 0) + b.metres);
  const parLaine = [...totaux].map(([laineId, m]) => ({ laineId, metresSansMarge: m, metres: Math.ceil(m * (1 + MARGE)) }));
  return { metres: Math.ceil(sansMarge * (1 + MARGE)), metresSansMarge: sansMarge, methode, parBloc, parLaine };
}

/**
 * Compare le besoin à la laine disponible.
 * « suffisant », « juste » (il resterait moins de 10 % en plus de la marge) ou « insuffisant ».
 */
export function comparerALaLaine(besoinMetres, laine) {
  const dispo = metrageLaine(laine);
  if (!dispo) return { statut: "inconnu", disponible: null, manque: null };
  const d = dispo.metres;
  if (d < besoinMetres) return { statut: "insuffisant", disponible: d, manque: besoinMetres - d, estime: dispo.estime };
  if (d < besoinMetres * (1 + MARGE)) return { statut: "juste", disponible: d, manque: 0, estime: dispo.estime };
  return { statut: "suffisant", disponible: d, manque: 0, estime: dispo.estime };
}
