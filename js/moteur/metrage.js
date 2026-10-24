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

/** Surfaces par bloc d'un plan d'écharpe (cm²) : blocs horizontaux sur la largeur du corps, bandes latérales sur toute la longueur. */
export function surfacesDuPlan(plan) {
  const surfaces = [];
  const bandesCm = plan.bandesLaterales ? 2 * plan.bandesLaterales.largeurCm : 0;
  for (const b of plan.blocs) {
    // Largeur du bloc : ses mailles de corps à sa propre densité, plus les lisières.
    const largeur = (b.maillesCorps * 10) / b.densite.mailles + (2 * plan.lisieres.mailles * 10) / b.densite.mailles;
    surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.pointId, cm2: largeur * b.hauteurCm });
  }
  if (plan.bandesLaterales) {
    surfaces.push({ blocId: plan.bandesLaterales.blocId, nom: "bandes latérales", pointId: plan.bandesLaterales.pointId, cm2: bandesCm * plan.longueur.reelleCm });
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
  return { metres: Math.ceil(sansMarge * (1 + MARGE)), metresSansMarge: sansMarge, methode, parBloc };
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
