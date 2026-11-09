// Le bonnet fini en 3D (E4-17, décision du 06/11, maquette validée le 09/11) : une tête de mannequin lisse,
// sans visage, et le bonnet rigide moulé dessus, sans physique de tissu (il ne glisse pas et ne tombe pas).
// Fonctions pures (sans Three.js), testées : elles renvoient des tableaux de sommets, de normales, de coordonnées
// de texture et d'indices, que l'écran met dans des BufferGeometry.
//
// Repères (cm) : la tête est debout, son axe sur y, le menton en y = 0. Le profil est tourné autour de l'axe,
// puis aplati sur les côtés (APLATISSEMENT : x × 0,92, z × 1,12), comme une vraie tête vue de dessus.
// Le bonnet suit le profil de la tête, à ECART_BONNET au-dessus.

/** Écart (cm) entre la tête et la surface du bonnet. */
export const ECART_BONNET = 0.5;
/** Le bonnet s'étire en largeur et se raccourcit en hauteur : il couvre 0,84 fois sa hauteur le long de la tête. */
export const RAPPORT_ARC = 0.84;
/** Aplatissement de la tête vue de dessus : largeur (x) et profondeur (z). */
export const APLATISSEMENT = { x: 0.92, z: 1.12 };

// Profil de base (tête d'environ 57 cm de tour) : superellipse, sommet en haut, rétrécie vers le menton.
const RX = 8.9;
const RY = 11.5;
const CY = 11.5;
const N = 2.4;

function profilBrut(t) {
  const s = Math.sin(t);
  const c = Math.cos(t);
  const y = CY + RY * Math.sign(c) * Math.pow(Math.abs(c), 2 / N);
  const r = RX * Math.pow(Math.abs(s), 2 / N);
  return [y < CY ? r * (0.78 + 0.22 * Math.pow(Math.max(0, y) / CY, 0.7)) : r, y];
}

/** Tour (cm) d'une ellipse de demi-axes a et b (Ramanujan). */
export function tourEllipse(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Tour de tête du profil de base, à sa plus grande largeur. */
const TOUR_DE_BASE = tourEllipse(RX * APLATISSEMENT.x, RX * APLATISSEMENT.z);

/**
 * Profil de la tête pour un tour de tête donné : points du sommet (s = 0) au menton, chacun avec son rayon r,
 * sa hauteur y, sa longueur d'arc s depuis le sommet et sa normale (nr, ny) tournée vers l'extérieur.
 */
export function profilDeTete(teteCm = 56, pas = 1500) {
  const k = teteCm / TOUR_DE_BASE;
  const points = [];
  let s = 0;
  let avant = null;
  for (let i = 0; i <= pas; i++) {
    const [r, y] = profilBrut((Math.PI * i) / pas);
    const p = { r: r * k, y: y * k };
    if (avant) s += Math.hypot(p.r - avant.r, p.y - avant.y);
    p.s = s;
    points.push(p);
    avant = p;
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dr = b.r - a.r;
    const dy = b.y - a.y;
    const l = Math.hypot(dr, dy) || 1;
    points[i].nr = -dy / l;
    points[i].ny = dr / l;
  }
  points[0].nr = 0;
  points[0].ny = 1;
  return { points, echelle: k, hauteur: points[0].y, rayon: RX * k, longueur: s };
}

/** Le point du profil à la longueur d'arc s (interpolé). */
export function surArc(profil, s) {
  const pts = profil.points;
  if (s <= 0) return pts[0];
  if (s >= pts.at(-1).s) return pts.at(-1);
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (pts[m].s < s) lo = m;
    else hi = m;
  }
  const a = pts[lo];
  const b = pts[hi];
  const t = (s - a.s) / (b.s - a.s || 1);
  const nr = a.nr + (b.nr - a.nr) * t;
  const ny = a.ny + (b.ny - a.ny) * t;
  const l = Math.hypot(nr, ny) || 1;
  return { r: a.r + (b.r - a.r) * t, y: a.y + (b.y - a.y) * t, s, nr: nr / l, ny: ny / l };
}

/**
 * Une tranche du bonnet : la surface de révolution qui suit la tête à `decalage` cm au-dessus,
 * de v0 à v1 (cm le long de la tête, depuis le bord du bonnet ; v = arc couvert au sommet).
 * arc : longueur d'arc couverte par le bonnet depuis le sommet de la tête.
 * texture(v) → coordonnée de texture verticale en cm de tricot ; tour : tour du bonnet (cm), pour l'échelle en u
 * (le nombre de mailles reste le même tout autour, jusqu'au sommet).
 * tuile : { l, h } taille (cm) d'une répétition du motif.
 * Renvoie { positions, normales, uv, index } (tableaux plats), faces tournées vers l'extérieur.
 */
export function nappeDuBonnet({ profil, arc, v0, v1, decalage = ECART_BONNET, tour, tuile = { l: 1, h: 1 }, texture = (v) => v, tours = 128, pas = 0.6 }) {
  const etages = Math.max(2, Math.ceil(Math.abs(v1 - v0) / pas));
  const positions = [];
  const normales = [];
  const uv = [];
  for (let b = 0; b <= etages; b++) {
    const v = v0 + ((v1 - v0) * b) / etages;
    const p = surArc(profil, arc - v);
    const r = p.r + p.nr * decalage;
    const y = p.y + p.ny * decalage;
    for (let a = 0; a <= tours; a++) {
      const ang = (2 * Math.PI * a) / tours;
      const sx = Math.sin(ang);
      const cz = Math.cos(ang);
      positions.push(r * sx * APLATISSEMENT.x, y, r * cz * APLATISSEMENT.z);
      // Normale de la surface aplatie : (nr·sin / ax, ny, nr·cos / az), renormalisée.
      const nx = (p.nr * sx) / APLATISSEMENT.x;
      const nz = (p.nr * cz) / APLATISSEMENT.z;
      const l = Math.hypot(nx, p.ny, nz) || 1;
      normales.push(nx / l, p.ny / l, nz / l);
      uv.push(((a / tours) * tour) / tuile.l, texture(v) / tuile.h);
    }
  }
  const index = [];
  for (let b = 0; b < etages; b++) {
    for (let a = 0; a < tours; a++) {
      const i = b * (tours + 1) + a;
      index.push(i, i + 1, i + tours + 1, i + 1, i + tours + 2, i + tours + 1);
    }
  }
  return { positions, normales, uv, index };
}

/** Position (x, y, z) sur le bonnet à l'arc v depuis le bord, à l'angle ang, à `decalage` au-dessus de la tête. */
export function pointDuBonnet(profil, arc, v, ang, decalage = ECART_BONNET) {
  const p = surArc(profil, arc - v);
  const r = p.r + p.nr * decalage;
  return [r * Math.sin(ang) * APLATISSEMENT.x, p.y + p.ny * decalage, r * Math.cos(ang) * APLATISSEMENT.z];
}

/**
 * Où tombent les zones du bonnet sur la tête.
 * blocs : [{ id, zone, hauteurCm }] du plan (bord, corps…, sommet), dans l'ordre du tricot ; revers : hauteur du bord replié ou 0.
 * Le bonnet porté couvre arc = RAPPORT_ARC × (hauteur tricotée − moitié du revers). Avec un revers, la moitié basse
 * du bord est repliée vers l'extérieur par-dessus la moitié haute.
 * Renvoie { arc, tranches: [{ id, zone, v0, v1, k0 }], revers: { v0, v1 } | null, k(v) } : v en cm le long de la tête,
 * k = cm de tricot au point v.
 */
export function tranchesDuBonnet(blocs, revers = 0) {
  const total = blocs.reduce((t, b) => t + b.hauteurCm, 0);
  const moitie = revers / 2;
  const visible = total - moitie;
  const arc = RAPPORT_ARC * visible;
  const f = arc / visible; // cm de tête par cm de tricot
  const tranches = [];
  let k = 0;
  for (const b of blocs) {
    const k0 = k;
    const k1 = k + b.hauteurCm;
    k = k1;
    // La partie visible commence au-dessus de la moitié repliée.
    const a = Math.max(k0, moitie);
    if (k1 <= a) continue;
    tranches.push({ id: b.id, zone: b.zone, v0: (a - moitie) * f, v1: (k1 - moitie) * f, k0: a });
  }
  return {
    arc,
    tranches,
    revers: moitie > 0 ? { v0: 0, v1: moitie * f } : null,
    // Tricot (cm) au point v de la surface de base ; sur le revers, le tricot va de moitie (au pli) à 0 (bord monté).
    k: (v) => moitie + v / f,
    kRevers: (v) => moitie - v / f,
  };
}
