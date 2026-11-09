// La jambe de mannequin et la jambière rigide (E4-23, 0.19.0, maquette validée le 09/11).
// Une jambe lisse (cheville, mollet, genou, bas de la cuisse), mise à l'échelle du tour du mollet ;
// la jambière est une surface de révolution moulée sur elle, un peu lâche à la cheville. Pur, testé.

/** Profil d'une jambe au mollet de 36 cm : [hauteur depuis le sol (cm), rayon moyen (cm)]. */
const PROFIL = [[7, 3.9], [9, 3.45], [11, 3.3], [14, 3.45], [18, 4.0], [23, 4.85], [28, 5.5], [32, 5.73], [36, 5.55], [40, 5.05], [44, 4.75], [47, 4.85], [50, 5.2], [55, 5.9], [60, 6.6], [66, 7.2], [70, 7.45]];
const MOLLET_REFERENCE = 36;

/** La jambière commence à la cheville (cm depuis le sol). */
export const CHEVILLE = 10;
/** Haut de la jambe (cm depuis le sol). */
export const HAUT_JAMBE = 70;
/** La coupe de la jambe est un peu ovale : le mollet ressort vers l'arrière. */
export const OVALE = { x: 0.94, z: 1.06 };
/** Écart entre la jambe et la jambière (cm). */
export const ECART_JAMBIERE = 0.28;

/** Catmull-Rom sur les points du profil, échantillonné finement (tous les 0,25 cm). */
function lisser(points) {
  const sortie = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const pas = Math.max(2, Math.round((p2[0] - p1[0]) / 0.25));
    for (let k = 0; k < pas; k++) {
      const t = k / pas;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      sortie.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  sortie.push(points.at(-1));
  return sortie;
}

/**
 * Profil de la jambe pour un tour de mollet (cm) : { points: [{ y, r }], rayon(y), molletR }.
 * Les rayons sont mis à l'échelle pour que le tour au mollet (le plus large) soit celui du projet.
 */
export function profilDeJambe(molletCm = MOLLET_REFERENCE) {
  const k = (molletCm || MOLLET_REFERENCE) / MOLLET_REFERENCE;
  const points = lisser(PROFIL).map(([y, r]) => ({ y, r: r * k }));
  const rayon = (y) => {
    if (y <= points[0].y) return points[0].r;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y >= y) {
        const a = points[i - 1];
        const b = points[i];
        return a.r + ((b.r - a.r) * (y - a.y)) / (b.y - a.y || 1);
      }
    }
    return points.at(-1).r;
  };
  return { points, rayon, molletR: Math.max(...points.filter((p) => p.y < 40).map((p) => p.r)), echelle: k };
}

/**
 * Rayon de la jambière à la hauteur y : collée à la jambe là où elle est plus étroite qu'elle ;
 * là où la jambe est plus fine (cheville), elle garde une partie de sa largeur (un peu lâche).
 */
export function rayonDeJambiere(profil, y, tourCm) {
  const r0 = tourCm / (2 * Math.PI);
  const r = profil.rayon(y) + ECART_JAMBIERE;
  return r < r0 ? r + 0.45 * (r0 - r) : r;
}

/** Ondulation d'une jambière lâche (cm), à l'angle a et à la hauteur v le long de la jambière. */
export function ondulation(profil, y, tourCm, a, v) {
  const lache = Math.max(0, tourCm / (2 * Math.PI) - profil.rayon(y) - ECART_JAMBIERE);
  return 0.12 * lache * Math.sin(a * 7 + v * 0.8);
}

/** Point de la jambière : v cm au-dessus de la cheville, angle a (0 = devant, π = derrière), décalage vers l'extérieur. */
export function pointDeJambiere(profil, tourCm, v, a, decalage = 0) {
  const y = CHEVILLE + v;
  const r = rayonDeJambiere(profil, y, tourCm) + ondulation(profil, y, tourCm, a, v) + decalage;
  return [r * OVALE.x * Math.sin(a), y, r * OVALE.z * Math.cos(a)];
}

/**
 * Surface d'une tranche de jambière, de v0 à v1 (cm depuis la cheville), sur les angles a0 à a1.
 * Le nombre de mailles est constant : u = fraction du tour × tour ÷ largeur du motif ; v en cm ÷ hauteur du motif.
 * Les angles partent de l'arrière (π, le début du tour ou la couture) et tournent tout autour.
 * Renvoie { positions, uv, index } (les normales sont calculées par la 3D).
 */
export function nappeDeJambiere({ profil, tourCm, v0, v1, a0 = Math.PI, a1 = 3 * Math.PI, tuile = { l: 1, h: 1 }, vTexture = (v) => v }) {
  const su = Math.max(8, Math.round((160 * (a1 - a0)) / (2 * Math.PI)));
  const sv = Math.max(4, Math.ceil((v1 - v0) / 0.5));
  const positions = [];
  const uv = [];
  const index = [];
  for (let b = 0; b <= sv; b++) {
    const v = v0 + ((v1 - v0) * b) / sv;
    for (let k = 0; k <= su; k++) {
      const a = a0 + ((a1 - a0) * k) / su;
      positions.push(...pointDeJambiere(profil, tourCm, v, a));
      uv.push((((a - Math.PI) / (2 * Math.PI)) * tourCm) / tuile.l, vTexture(v) / tuile.h);
    }
  }
  for (let b = 0; b < sv; b++) {
    for (let k = 0; k < su; k++) {
      const i = b * (su + 1) + k;
      index.push(i, i + 1, i + su + 1, i + 1, i + su + 2, i + su + 1);
    }
  }
  return { positions, uv, index };
}

/** Tranches de la jambière depuis les blocs du plan : [{ id, zone, v0, v1 }] du bas (cheville) vers le haut. */
export function tranchesDeJambiere(blocs, longueurCm) {
  const total = blocs.reduce((t, b) => t + (b.hauteurCm || 0), 0) || 1;
  let v = 0;
  return blocs.map((b) => {
    const h = ((b.hauteurCm || 0) * longueurCm) / total;
    const t = { id: b.id, zone: b.zone, v0: v, v1: v + h };
    v += h;
    return t;
  });
}
