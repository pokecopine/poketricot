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
  // Couverture en panneaux (0.21.0) : la somme des surfaces de chaque panneau.
  if (plan.panneaux) return plan.panneaux.flatMap((p) => surfacesDuPlan(p));
  const surfaces = [];
  const nLisieres = plan.lisieres.droite !== undefined ? plan.lisieres.droite + plan.lisieres.gauche : 2 * plan.lisieres.mailles;
  const lisieres = (densite) => (nLisieres * 10) / densite.mailles;
  for (const b of plan.blocs) {
    const laineId = b.laineId || null;
    if (b.colonnes) {
      // Intarsia (0.16.0) : chaque colonne dans sa laine ; la lisière droite dans celle de la colonne 1, la gauche dans celle de la dernière.
      for (const c of b.colonnes) {
        surfaces.push({ blocId: b.id, colonneId: c.id, nom: b.nom, pointId: c.pointId, laineId: (c.laineId !== undefined ? c.laineId : laineId), cm2: c.largeurCm * b.hauteurCm });
      }
      if (plan.lisieres.mailles) {
        const demi = (lisieres(b.colonnes[0].densite) * b.hauteurCm) / 2;
        surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.colonnes[0].pointId, laineId: (b.colonnes[0].laineId !== undefined ? b.colonnes[0].laineId : laineId), cm2: demi });
        surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.colonnes[0].pointId, laineId: (b.colonnes.at(-1).laineId !== undefined ? b.colonnes.at(-1).laineId : laineId), cm2: demi });
      }
      continue;
    }
    // Largeur du bloc : ses mailles de corps à sa propre densité, plus les lisières.
    // Sommet du bonnet (0.17.0) : son nombre moyen de mailles, pas les 8 de la fin.
    const largeur = ((b.maillesSurface ?? b.maillesCorps) * 10) / b.densite.mailles + lisieres(b.densite);
    surfaces.push({ blocId: b.id, nom: b.nom, pointId: b.pointId, laineId, cm2: largeur * b.hauteurCm });
  }
  if (plan.bandesLaterales && plan.bandesLaterales.laineId !== undefined) {
    // Bordure de côté d'une couverture (0.21.0) : une seule laine, celle de la bordure.
    surfaces.push({
      blocId: plan.bandesLaterales.blocId, nom: "bordure", pointId: plan.bandesLaterales.pointId, laineId: plan.bandesLaterales.laineId || null,
      cm2: 2 * plan.bandesLaterales.largeurCm * plan.longueur.reelleCm,
    });
  } else if (plan.bandesLaterales) {
    const bandesCm = 2 * plan.bandesLaterales.largeurCm;
    // Une seule surface par laine (une seule en tout quand l'écharpe est d'une seule laine).
    // Chaque côté compte pour moitié ; en intarsia, il prend la laine de la colonne qu'il touche.
    const parLaine = new Map();
    const compter = (id, h) => parLaine.set(id || null, (parLaine.get(id || null) || 0) + h);
    for (const b of plan.blocs) {
      compter(b.colonnes ? (b.colonnes[0].laineId !== undefined ? b.colonnes[0].laineId : b.laineId) : b.laineId, b.hauteurCm / 2);
      compter(b.colonnes ? (b.colonnes.at(-1).laineId !== undefined ? b.colonnes.at(-1).laineId : b.laineId) : b.laineId, b.hauteurCm / 2);
    }
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
 * Fil (m) d'un pompon de `diametreCm` (0.17.0) : la boule est remplie au tiers environ de brins de laine,
 * dont le diamètre vaut à peu près 0,45 fois la largeur d'une maille de jersey ; 60 % de plus pour la tonte.
 * Pour un pompon de 6 cm en laine aran (17 mailles pour 10 cm) : une douzaine de mètres.
 */
export function metresPompon(diametreCm, densiteJersey) {
  if (!(diametreCm > 0) || !densiteJersey?.mailles) return 0;
  const r = diametreCm / 2;
  const volume = (4 / 3) * Math.PI * r ** 3;
  const dFil = 0.45 * (10 / densiteJersey.mailles);
  const section = Math.PI * (dFil / 2) ** 2;
  return ((volume * 0.35) / section / 100) * 1.6;
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
  // Pompon du bonnet (0.17.0) : dans sa laine, quelle que soit la méthode.
  if (plan.pompon) {
    const metres = metresPompon(plan.pompon.cm, densiteJersey);
    if (metres) parBloc.push({ blocId: "pompon", nom: "pompon", pointId: null, laineId: plan.pompon.laineId || null, cm2: 0, grammes: mPour100g ? (metres * 100) / mPour100g : null, metres });
  }
  // Jambières (0.19.0) : tout compte autant de fois qu'il y a d'exemplaires (la paire) ; à plat, le fil de couture en plus,
  // dans la laine du bord du bas (celle du montage).
  const exemplaires = plan.exemplaires || 1;
  const parExemplaire = parBloc.reduce((t, b) => t + b.metres, 0);
  if (exemplaires > 1) parBloc = parBloc.map((b) => ({ ...b, metres: b.metres * exemplaires, grammes: b.grammes === null ? null : b.grammes * exemplaires }));
  if (plan.couture?.filCm) {
    const metres = (exemplaires * plan.couture.filCm) / 100;
    const laineCouture = plan.couture.laineId !== undefined ? plan.couture.laineId : (plan.blocs || plan.panneaux?.[0]?.blocs)?.[0]?.laineId;
    parBloc.push({ blocId: "couture", nom: "couture", pointId: null, laineId: laineCouture || null, cm2: 0, grammes: mPour100g ? (metres * 100) / mPour100g : null, metres });
  }
  const sansMarge = parBloc.reduce((t, b) => t + b.metres, 0);
  // Laine par laine : la longueur de fil dépend des mailles, pas de la marque (laines de même épaisseur).
  const totaux = new Map();
  for (const b of parBloc) totaux.set(b.laineId, (totaux.get(b.laineId) || 0) + b.metres);
  const parLaine = [...totaux].map(([laineId, m]) => ({ laineId, metresSansMarge: m, metres: Math.ceil(m * (1 + MARGE)) }));
  // Couverture en panneaux (0.21.0) : le métrage d'un panneau (poids sur les aiguilles).
  const parPanneau = plan.panneaux
    ? Math.ceil(parBloc.filter((b) => b.blocId !== "couture").reduce((t, b) => t + b.metres, 0) / plan.panneaux.length * (1 + MARGE))
    : undefined;
  return {
    metres: Math.ceil(sansMarge * (1 + MARGE)), metresSansMarge: sansMarge, methode, parBloc, parLaine,
    ...(parPanneau ? { parPanneau } : {}),
    ...(exemplaires > 1 ? { exemplaires, parExemplaire: Math.ceil(parExemplaire * (1 + MARGE)) } : {}),
  };
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

/**
 * Pelotes et poids d'un métrage (0.21.0) : pelotes = mètres ÷ mètres par pelote (arrondi au-dessus),
 * grammes = d'après le métrage pour 100 g (arrondi aux 100 g). Chacun null s'il ne peut pas être calculé.
 */
export function pelotesEtPoids(metres, laine) {
  const q = laine?.quantite || {};
  const parPelote = q.mode !== "pesee" ? lireNombre(q.metresParPelote) : null;
  const m100 = metresPour100g(laine);
  return {
    pelotes: parPelote && metres > 0 ? Math.ceil(metres / parPelote) : null,
    grammes: m100 && metres > 0 ? Math.max(100, Math.round((metres * 100) / m100 / 100) * 100) : null,
  };
}
