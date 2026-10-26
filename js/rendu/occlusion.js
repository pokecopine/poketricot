// Ombres de contact du fil (occlusion ambiante), calculées une fois, sans carte graphique.
// Chaque sommet du tube est assombri selon la quantité de fil voisin qui se trouve devant lui :
// les creux entre les mailles, le dessous des boucles et les croisements deviennent plus sombres,
// et le relief du point ressort, même sous une lumière douce.
// Fonction pure (testée) : le fil est approché par des sphères de son rayon le long de son axe.

/** Points régulièrement espacés le long d'un chemin (pas ≈ rayon × 0,7). */
export function echantillonnerAxe(points, pas) {
  const sortie = [points[0]];
  let reste = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    let t = pas - reste;
    while (t <= l) {
      const f = t / l;
      sortie.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
      t += pas;
    }
    reste = l - (t - pas);
  }
  return sortie;
}

/**
 * Occlusion de chaque sommet : 1 = en pleine lumière, plus petit = dans un creux.
 * positions, normales : tableaux plats [x, y, z, x, y, z…] (ceux d'une géométrie Three.js).
 * axe : points de l'axe du fil ; rayon : rayon du fil.
 * portee : distance d'influence (en rayons) ; force : intensité ; plancher : valeur minimale.
 */
export function occlusionDesSommets(positions, normales, axe, rayon, { portee = 4.5, force = 0.55, plancher = 0.32 } = {}) {
  const spheres = echantillonnerAxe(axe, rayon * 0.7);
  const R = rayon * portee;
  const cellule = R;
  const grille = new Map();
  const cle = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  spheres.forEach((s, n) => {
    const c = cle(Math.floor(s[0] / cellule), Math.floor(s[1] / cellule), Math.floor(s[2] / cellule));
    let liste = grille.get(c);
    if (!liste) grille.set(c, (liste = []));
    liste.push(n);
  });
  const nb = positions.length / 3;
  const sortie = new Float32Array(nb);
  const r2 = rayon * rayon;
  for (let v = 0; v < nb; v++) {
    const px = positions[v * 3], py = positions[v * 3 + 1], pz = positions[v * 3 + 2];
    const nx = normales[v * 3], ny = normales[v * 3 + 1], nz = normales[v * 3 + 2];
    // Un peu au-dessus de la surface, pour que le fil ne s'assombrisse pas lui-même.
    const ox = px + nx * rayon * 0.15, oy = py + ny * rayon * 0.15, oz = pz + nz * rayon * 0.15;
    const ci = Math.floor(ox / cellule), cj = Math.floor(oy / cellule), ck = Math.floor(oz / cellule);
    let occ = 0;
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++)
        for (let k = ck - 1; k <= ck + 1; k++) {
          const liste = grille.get(cle(i, j, k));
          if (!liste) continue;
          for (const n of liste) {
            const s = spheres[n];
            const dx = s[0] - ox, dy = s[1] - oy, dz = s[2] - oz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= R * R || d2 < r2 * 1.02) continue; // trop loin, ou le fil sur lequel on se trouve
            const d = Math.sqrt(d2);
            const cos = (dx * nx + dy * ny + dz * nz) / d;
            if (cos <= 0) continue; // derrière la surface
            // Part du ciel cachée par une sphère du fil, adoucie avec la distance.
            occ += cos * (r2 / d2) * (1 - d / R);
          }
        }
    sortie[v] = Math.max(plancher, 1 - force * occ);
  }
  return sortie;
}
