// Le chemin du fil dans un échantillon, en 3D (sans dessin : des points). Fonctions pures, testées sans navigateur.
//
// Modèle (d'après le modèle de maille de Kaldor et al., « Simulating knitted cloth at the yarn level ») :
// chaque rang est un fil qui serpente de maille en maille. Pour la maille centrée en u = k + ½ (u en largeurs
// de maille), avec φ = 2π(u − ½) :
//   x = u + A·sin(2φ)       la tête de la boucle s'élargit, les jambes se resserrent
//   y = y_rang + H·cos(φ)   la tête en haut (elle remonte dans le rang suivant), les « ponts » entre mailles en bas
//   z = −s·D·cos(2φ)        s = +1 pour une maille endroit vue de face : les jambes passent devant,
//                           la tête et les ponts derrière ; s = −1 pour une maille envers (l'inverse)
// La tête d'une maille passe derrière les jambes de la maille du rang suivant : les boucles s'enchaînent.
// Entre une maille endroit et une maille envers, s change en douceur pour que le fil reste continu.
//
// Repère : x vers la droite (vu de l'endroit), y vers le haut, z vers celui qui regarde l'endroit.
// Dans la grille du simulateur, l'indice 0 d'un rang est la maille la plus à droite, vue de l'endroit.

/** Proportions du modèle, en largeurs de maille. */
export const MODELE = {
  pas: 0.78, // hauteur d'un rang
  H: 0.56, // demi-hauteur d'une boucle (les boucles de deux rangs se chevauchent)
  A: 0.2, // la jambe visible descend en biais vers le milieu de la maille : c'est ce qui dessine le V
  D: 0.2, // profondeur : de combien les jambes passent devant (ou derrière)
  rayon: 0.24, // rayon du fil
  points: 24, // points par maille le long du fil
};

/** Aspects que le modèle dessine fidèlement ; les autres sont approchés par une maille endroit ou envers. */
export const ASPECTS_FIDELES = new Set(["V", "grain", "Vtorse"]);

/** Sens de la boucle pour un aspect : +1 endroit (on voit le V), −1 envers (on voit la bosse). */
export function sensDeLaMaille(aspect) {
  if (aspect === "grain" || aspect === "boule") return -1;
  return 1;
}

/** Le dessin 3D d'une grille est-il fidèle, ou approché (jetés, torsades, mailles glissées…) ? */
export function rendu3dFidele(grille) {
  return grille.every((rang) => rang.every((a) => ASPECTS_FIDELES.has(a)));
}

const lisse = (x) => x * x * (3 - 2 * x);

/**
 * Répète la grille d'un motif pour faire un échantillon d'au moins `mailles` × `rangs`
 * (sans dépasser `max` mailles en tout) : un nombre entier de motifs dans chaque sens.
 */
export function grilleEchantillon(motif, { mailles = 16, rangs = 20, max = 900 } = {}) {
  const largeur = motif[0].length;
  const hauteur = motif.length;
  let nx = Math.max(1, Math.ceil(mailles / largeur));
  let ny = Math.max(1, Math.ceil(rangs / hauteur));
  while (nx * largeur * ny * hauteur > max && (nx > 1 || ny > 1)) {
    if (nx * largeur >= ny * hauteur && nx > 1) nx--;
    else if (ny > 1) ny--;
    else nx--;
  }
  const grille = [];
  for (let r = 0; r < ny * hauteur; r++) {
    const ligne = motif[r % hauteur];
    grille.push(Array.from({ length: nx * largeur }, (_, c) => ligne[c % largeur]));
  }
  return grille;
}

/**
 * Le chemin du fil pour une grille (grille[0] = rang du bas).
 * Les rangs se suivent comme à plat : un rang de gauche à droite, le suivant de droite à gauche,
 * reliés au bord par un petit arrondi (la lisière).
 * Renvoie { points: [[x, y, z], …], largeur, hauteur } centré en (0, 0).
 */
export function cheminDuFil(grille, modele = MODELE) {
  const { pas, H, A, D, points: N } = modele;
  const nR = grille.length;
  const nC = grille[0].length;
  const largeur = nC;
  const hauteur = (nR - 1) * pas + 2 * H;
  const x0 = -nC / 2;
  const y0 = -((nR - 1) * pas) / 2;
  const chemin = [];

  for (let r = 0; r < nR; r++) {
    const rang = grille[r];
    // Sens de chaque maille, de gauche à droite (la grille va de droite à gauche).
    const sens = Array.from({ length: nC }, (_, k) => sensDeLaMaille(rang[nC - 1 - k]));
    const s = (u) => {
      const k = Math.min(nC - 1, Math.max(0, Math.floor(u)));
      const f = u - k;
      // Près du bord de la maille, on passe en douceur au sens de la voisine.
      if (f < 0.22 && k > 0 && sens[k - 1] !== sens[k]) return sens[k] * lisse(0.5 + f / 0.44) + sens[k - 1] * (1 - lisse(0.5 + f / 0.44));
      if (f > 0.78 && k < nC - 1 && sens[k + 1] !== sens[k]) {
        const g = lisse(0.5 + (1 - f) / 0.44);
        return sens[k] * g + sens[k + 1] * (1 - g);
      }
      return sens[k];
    };
    const yr = y0 + r * pas;
    const ligne = [];
    for (let i = 0; i <= nC * N; i++) {
      const u = i / N;
      const phi = 2 * Math.PI * (u - 0.5);
      ligne.push([x0 + u + A * Math.sin(2 * phi), yr + H * Math.cos(phi), -s(u) * D * Math.cos(2 * phi)]);
    }
    if (r % 2 === 1) ligne.reverse();
    // Lisière : le fil remonte au rang suivant par un demi-tour, côté où il se trouve.
    if (chemin.length) {
      const [xa, ya, za] = chemin[chemin.length - 1];
      const [xb, yb, zb] = ligne[0];
      const cote = xa > 0 ? 1 : -1;
      for (let j = 1; j < 10; j++) {
        const t = j / 10;
        chemin.push([
          xa + (xb - xa) * t + cote * 0.32 * Math.sin(Math.PI * t),
          ya + (yb - ya) * t,
          za + (zb - za) * t,
        ]);
      }
    }
    chemin.push(...ligne);
  }
  return { points: chemin, largeur, hauteur };
}

/**
 * Brins d'un fil retors : `nb` brins enroulés autour du chemin, `tours` tours par largeur de maille.
 * Les repères suivent le fil sans vriller (transport parallèle). Renvoie une liste de chemins.
 */
export function brinsDuFil(points, { nb = 3, rayon = MODELE.rayon * 0.48, tours = 2.2 } = {}) {
  const n = points.length;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norme = (v) => Math.hypot(v[0], v[1], v[2]) || 1;
  const unit = (v) => {
    const l = norme(v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tangentes = points.map((p, i) => unit(sub(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)])));
  // Premier repère : une normale quelconque perpendiculaire à la tangente.
  let normale = unit(croix(tangentes[0], Math.abs(tangentes[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const brins = Array.from({ length: nb }, () => []);
  let longueur = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      longueur += norme(sub(points[i], points[i - 1]));
      // Transport parallèle : on retire de la normale sa part le long de la nouvelle tangente.
      const t = tangentes[i];
      normale = unit(sub(normale, t.map((x) => x * dot(normale, t))));
    }
    const b = croix(tangentes[i], normale);
    const angle0 = 2 * Math.PI * tours * longueur;
    for (let k = 0; k < nb; k++) {
      const a = angle0 + (2 * Math.PI * k) / nb;
      const c = Math.cos(a) * rayon;
      const s = Math.sin(a) * rayon;
      const p = points[i];
      brins[k].push([p[0] + normale[0] * c + b[0] * s, p[1] + normale[1] * c + b[1] * s, p[2] + normale[2] * c + b[2] * s]);
    }
  }
  return brins;
}
