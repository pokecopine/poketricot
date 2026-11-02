// Le snood fini en tube rigide (E4-9, décision du 02/11) : un cylindre ouvert à ses vraies dimensions,
// sans physique de tissu. Fonctions pures (sans Three.js), testées : elles renvoient des tableaux de
// sommets, de normales, de coordonnées de texture et d'indices, que l'écran met dans des BufferGeometry.
//
// Repères (cm) : le tube est debout, son axe sur y ; le bas du tricot est en y = base, le haut en y = base + hauteur.
// Comme pour l'écharpe (grilleDuRect, piece3d.js), x est compté depuis le début du tour (bord droit du tricot
// vu de l'endroit) et u = tour − x : u augmente vers la droite quand on regarde l'endroit de face.
// Le début du tour (u = 0, u = tour) est à l'arrière du tube (z < 0), pour que la petite marche d'un changement
// de laine ne soit pas au premier plan dans la vue de départ.
// Toutes les faces sont tournées vers l'extérieur du tissu : la face intérieure (envers) est dessinée avec
// le matériau « envers » en BackSide, exactement comme le dos de l'écharpe.

/** Épaisseur du tricot pour les bords arrondis (cm). */
export const EPAISSEUR_TUBE = 0.45;

/** Rayon (cm) du cylindre dont le tour fait `tourCm`. */
export function rayonDuTube(tourCm) {
  return tourCm / (2 * Math.PI);
}

/** Angle autour de l'axe pour une position u (cm) le long du tour : u = 0 à l'arrière (z < 0), u = tour/2 devant (z > 0). */
export function angleDuTour(u, tour) {
  return Math.PI + (2 * Math.PI * u) / tour;
}

/** Point du cylindre de rayon r, à l'angle a, à la hauteur y. Devant (a = 0 mod 2π), u croissant va vers +x. */
function surCylindre(r, a, y) {
  return [r * Math.sin(a), y, r * Math.cos(a)];
}

/** Nombre de pas pour couvrir une longueur avec des pas d'au plus `pas` cm. */
const nPas = (longueur, pas) => Math.max(2, Math.ceil(longueur / pas));

/**
 * Un morceau de la paroi : la tranche du tube qui correspond à un rectangle du tricot posé à plat
 * (rect : { x, y, l, h } en cm, comme geometrieSnood), sur le cylindre de rayon `rayon`.
 * tuile : { l, h } = taille (cm) d'une répétition du motif, pour l'échelle des textures.
 * Renvoie { positions, normales, uv, index } (tableaux plats).
 */
export function paroiDuTube({ rect, tour, rayon, base = 0, tuile = { l: 1, h: 1 }, pas = 1.2 }) {
  // Le long du tour, des pas plus serrés : la paroi doit rester ronde (un pas d'au plus 3° environ).
  const pasTour = Math.min(pas, (2 * Math.PI * rayon) / 120);
  const su = nPas(rect.l, pasTour);
  const sv = nPas(rect.h, pas * 2);
  const positions = [];
  const normales = [];
  const uv = [];
  for (let b = 0; b <= sv; b++) {
    const v = rect.y + (rect.h * b) / sv;
    for (let a = 0; a <= su; a++) {
      const xCm = rect.x + (rect.l * a) / su;
      const u = tour - xCm;
      const ang = angleDuTour(u, tour);
      positions.push(...surCylindre(rayon, ang, base + v));
      normales.push(Math.sin(ang), 0, Math.cos(ang));
      uv.push(u / tuile.l, v / tuile.h);
    }
  }
  const index = [];
  for (let b = 0; b < sv; b++) {
    for (let a = 0; a < su; a++) {
      const i = b * (su + 1) + a;
      // u diminue quand a augmente (même ordre que grilleDuRect) : triangles tournés vers l'extérieur.
      index.push(i, i + su + 1, i + 1, i + 1, i + su + 1, i + su + 2);
    }
  }
  return { positions, normales, uv, index };
}

/**
 * Un bord arrondi (haut ou bas) sur la largeur d'un rectangle : un demi-tore qui va de la paroi extérieure
 * (rayon) à la paroi intérieure (rayon − épaisseur), par-dessus (haut) ou par-dessous (bas).
 * yBord : hauteur (cm) du bord du tricot ; v des textures = celui du bord, prolongé le long de l'arrondi.
 */
export function bordDuTube({ rect, tour, rayon, yBord, haut, epaisseur = EPAISSEUR_TUBE, vBord = 0, tuile = { l: 1, h: 1 }, pas = 1.2 }) {
  const pasTour = Math.min(pas, (2 * Math.PI * rayon) / 120);
  const su = nPas(rect.l, pasTour);
  const sa = 8;
  const demi = epaisseur / 2;
  const rc = rayon - demi;
  const sens = haut ? 1 : -1;
  const positions = [];
  const normales = [];
  const uv = [];
  for (let b = 0; b <= sa; b++) {
    const t = (Math.PI * b) / sa; // 0 : paroi extérieure, π : paroi intérieure
    const radial = Math.cos(t);
    const vert = sens * Math.sin(t);
    const r = rc + demi * radial;
    const y = yBord + demi * vert;
    const v = vBord + sens * demi * t;
    for (let a = 0; a <= su; a++) {
      const xCm = rect.x + (rect.l * a) / su;
      const u = tour - xCm;
      const ang = angleDuTour(u, tour);
      positions.push(...surCylindre(r, ang, y));
      normales.push(radial * Math.sin(ang), vert, radial * Math.cos(ang));
      uv.push(u / tuile.l, v / tuile.h);
    }
  }
  const index = [];
  for (let b = 0; b < sa; b++) {
    for (let a = 0; a < su; a++) {
      const i = b * (su + 1) + a;
      // En haut, l'arrondi monte quand b augmente (comme la paroi) ; en bas, il descend : on inverse l'ordre.
      if (haut) index.push(i, i + su + 1, i + 1, i + 1, i + su + 1, i + su + 2);
      else index.push(i, i + 1, i + su + 1, i + 1, i + su + 2, i + su + 1);
    }
  }
  return { positions, normales, uv, index };
}

/**
 * Tout le tube d'un snood, à partir des rectangles du tricot posé à plat (geometrieSnood).
 * Renvoie le rayon, la base, et pour chaque rectangle sa paroi extérieure (endroit), sa paroi intérieure
 * (envers) et ses bords arrondis s'il touche le bas ou le haut du tricot.
 * tuiles : fonction (rect) → { l, h } (taille d'une répétition du motif du rectangle, en cm).
 */
export function tubeRigide({ tour, hauteur, rects, epaisseur = EPAISSEUR_TUBE, tuiles = () => ({ l: 1, h: 1 }) }) {
  const rayon = rayonDuTube(tour);
  const interieur = rayon - epaisseur;
  // Le tube repose sur le fond : le bas de l'arrondi du bas touche y = 0.
  const base = epaisseur / 2;
  const morceaux = rects.map((rect) => {
    const tuile = tuiles(rect);
    const m = {
      rect,
      tuile,
      exterieur: paroiDuTube({ rect, tour, rayon, base, tuile }),
      interieur: paroiDuTube({ rect, tour, rayon: interieur, base, tuile }),
      bords: [],
    };
    if (rect.y <= 1e-6) m.bords.push(bordDuTube({ rect, tour, rayon, yBord: base, haut: false, epaisseur, vBord: 0, tuile }));
    if (rect.y + rect.h >= hauteur - 1e-6) m.bords.push(bordDuTube({ rect, tour, rayon, yBord: base + hauteur, haut: true, epaisseur, vBord: hauteur, tuile }));
    return m;
  });
  return { rayon, interieur, base, hauteurTotale: hauteur + epaisseur, morceaux };
}

/**
 * Cadrage de départ (vue d'un peu au-dessus, le tube entier visible) : distance de la caméra au centre du tube.
 * fov : angle vertical de la caméra (degrés) ; aspect : largeur / hauteur de l'image.
 */
export function distanceDeCadrage({ rayon, hauteur, fov = 34, aspect = 0.8, marge = 1.18 }) {
  const t = Math.tan(((fov / 2) * Math.PI) / 180);
  // Vu d'un peu au-dessus, le tube occupe environ sa hauteur + une partie de son diamètre (l'ouverture).
  const hautVu = hauteur + rayon * 0.9;
  const largeVu = 2 * rayon;
  const d = Math.max(hautVu / (2 * t), largeVu / (2 * t * aspect)) * marge;
  return d + rayon;
}

/**
 * Longueur (px) de 10 cm à l'écran sur la face avant du tube, vue par une caméra à `distance` cm du centre.
 * hauteurPx : hauteur de l'image ; fov en degrés.
 */
export function pixelsPour10cm({ distance, rayon, hauteurPx, fov = 34 }) {
  const versLaFace = Math.max(1, distance - rayon);
  const vu = 2 * versLaFace * Math.tan(((fov / 2) * Math.PI) / 180);
  return (10 * hauteurPx) / vu;
}

/** L'échelle affichée : la plus grande longueur ronde (10, 5, 2 ou 1 cm) qui tient dans 130 px. */
export function echelleAffichee(pxParCm) {
  for (const cm of [10, 5, 2, 1]) if (cm * pxParCm <= 130) return { cm, px: cm * pxParCm };
  return { cm: 1, px: pxParCm };
}
