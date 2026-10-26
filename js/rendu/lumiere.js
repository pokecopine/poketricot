// Lumière des scènes 3D : ce qui donne au tricot ses nuances, au-delà de la lumière directe.
//
// 1. Lumière d'environnement (éclairage indirect) : une pièce claire, calculée une fois par moteur de rendu,
//    éclaire le fil de toutes les directions et lui donne ses reflets doux (comme la lumière d'une pièce).
// 2. Interréflexions : dans un creux, la lumière rebondit d'abord sur le fil voisin avant d'arriver ; à chaque
//    rebond elle prend la couleur de la laine. Les ombres du tricot sont donc plus foncées mais plus colorées
//    (un creux de laine terracotta tire sur le brun-rouge, pas sur le gris).
// 3. Nuances le long du fil : une laine n'est jamais d'une couleur parfaitement uniforme ; une très légère
//    variation, lente le long du fil, fait vivre la surface et aide l'œil à suivre les mailles.
// Les fonctions de calcul (2 et 3) sont pures et testées ; la lumière d'environnement demande Three.js.

/** Couleur hexadécimale (sRGB) → composantes linéaires [r, g, b] entre 0 et 1. */
export function lineaire(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
}

/** Part de la lumière qui revient d'un rebond sur le fil voisin (réglée à l'œil). */
export const REBOND = 0.35;

/**
 * Multiplicateur de couleur [r, g, b] d'un point du fil, d'après son ouverture au ciel `ao` (1 = en pleine lumière,
 * 0 = au fond d'un creux) et la couleur linéaire de la laine. La lumière qui n'arrive pas directement arrive
 * après un rebond, teintée par la laine : multiplicateur = ao + (1 − ao) × REBOND × couleur.
 */
export function teinteDuCreux(ao, couleurLineaire, rebond = REBOND) {
  return couleurLineaire.map((c) => ao + (1 - ao) * rebond * c);
}

/** Bruit lisse à une dimension, entre −1 et 1 (valeurs pseudo-aléatoires reliées en douceur). */
export function bruitLisse(x, graine = 0) {
  const hasard = (i) => {
    const s = Math.sin(i * 127.1 + graine * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const i = Math.floor(x);
  const f = x - i;
  const t = f * f * (3 - 2 * f);
  return hasard(i) * (1 - t) + hasard(i + 1) * t;
}

/**
 * Nuance le long du fil, autour de 1 : `position` en mailles parcourues le long du fil.
 * Amplitude ± `amplitude` ; elle change lentement (sur environ une maille et demie).
 */
export function nuanceDuFil(position, amplitude = 0.05) {
  return 1 + amplitude * (0.7 * bruitLisse(position / 1.5) + 0.3 * bruitLisse(position / 0.45, 7));
}

/**
 * Couleurs des sommets d'un tube de fil (TubeGeometry), prêtes pour `vertexColors` :
 * ombre de contact teintée par les interréflexions, et nuance le long du fil.
 * ao : ouverture de chaque sommet (voir occlusion.js) ; tours : sommets par anneau du tube (radialSegments + 1) ;
 * segmentsParMaille : anneaux du tube pour une maille le long du fil.
 */
export function couleursDuFil(ao, couleurLineaire, { tours, segmentsParMaille, amplitude = 0.05 }) {
  const sortie = new Float32Array(ao.length * 3);
  const max = Math.max(...couleurLineaire, 1e-3);
  // La teinte du rebond est normalisée (la laine ne renvoie que sa couleur, pas plus de lumière qu'elle n'en reçoit).
  const teinte = couleurLineaire.map((c) => c / max);
  for (let v = 0; v < ao.length; v++) {
    const [r, g, b] = teinteDuCreux(ao[v], teinte);
    const n = nuanceDuFil(Math.floor(v / tours) / segmentsParMaille, amplitude);
    sortie[v * 3] = r * n;
    sortie[v * 3 + 1] = g * n;
    sortie[v * 3 + 2] = b * n;
  }
  return sortie;
}

const environnements = new WeakMap();

/** Lumière d'environnement (une pièce claire, pré-filtrée), gardée pour ce moteur de rendu. */
export function environnement(THREE, RoomEnvironment, renderer) {
  if (environnements.has(renderer)) return environnements.get(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const piece = new RoomEnvironment();
  const cible = pmrem.fromScene(piece, 0.04);
  piece.traverse?.((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();
  environnements.set(renderer, cible.texture);
  return cible.texture;
}

/** Libère la lumière d'environnement de ce moteur de rendu. */
export function libererEnvironnement(renderer) {
  const t = environnements.get(renderer);
  if (t) t.dispose();
  environnements.delete(renderer);
}
