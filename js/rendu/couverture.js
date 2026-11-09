// La couverture finie en 3D (E4-29, 0.21.0, maquettes 4a à 4c du 09/11) : une nappe rigide drapée sur un meuble
// qui dépend de la taille (canapé pour le plaid, lit 1 personne, lit 2 personnes), sans physique de tissu.
// Fonctions pures, testées : la forme du meuble, le chemin de la couverture dans la longueur et dans la largeur,
// les plis là où elle pend, et la grille de points (positions, coordonnées de texture en cm).
//
// Repère : y vers le haut (cm, le sol à 0), z vers l'avant (le pied du lit, l'avant du canapé), x vers la droite.
// La couverture : u le long de la largeur (0 = bord gauche, vue de l'endroit), v le long de la longueur (0 = bas du tricot).
// Le haut du tricot (v = longueur) est à la tête du lit (sous les oreillers) ou derrière le dossier du canapé.

/** Écart entre la couverture et le meuble (cm). */
export const ECART_COUVERTURE = 0.6;

/** Pas de la grille (cm). */
export const PAS_COUVERTURE = 2.5;

/** Les meubles. Dimensions en cm. */
export const DECORS = {
  canape: { type: "canape", largeurAssise: 124, assise: 45, profondeurAssise: 55, dossier: 86, epaisseurDossier: 22, accoudoir: 62, largeurAccoudoir: 18 },
  lit1: { type: "lit", largeur: 90, longueur: 190, matelas: 55, oreillers: 1 },
  lit2: { type: "lit", largeur: 160, longueur: 200, matelas: 55, oreillers: 2 },
};

/** Lisse une ligne brisée (coupe les coins, 3 fois) : les angles du meuble deviennent arrondis. */
export function lisser(points, fois = 3) {
  let p = points;
  for (let k = 0; k < fois; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    q.push(p.at(-1));
    p = q;
  }
  return p;
}

/** Abscisse curviligne de chaque point d'une ligne. */
function abscisses(points) {
  const s = [0];
  for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return s;
}

/**
 * Un chemin (ligne lissée dans un plan, en (a, y)) qu'on parcourt à une distance donnée :
 * → { a, y, ta, ty } (point et tangente unitaire). Au-delà du bout, on prolonge le dernier segment.
 */
/** Arrondit seulement les coins : chaque coin est remplacé par deux points à r cm de lui, puis on lisse. */
export function arrondir(points, r = 4) {
  const q = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
    const r1 = Math.min(r, l1 / 2);
    const r2 = Math.min(r, l2 / 2);
    q.push([b[0] - ((b[0] - a[0]) / l1) * r1, b[1] - ((b[1] - a[1]) / l1) * r1], [b[0] + ((c[0] - b[0]) / l2) * r2, b[1] + ((c[1] - b[1]) / l2) * r2]);
  }
  q.push(points.at(-1));
  return q;
}

export function chemin(points) {
  // Des points rapprochés autour des coins : le lissage n'arrondit que les coins, sur quelques centimètres.
  const p = lisser(arrondir(points), 4);
  const s = abscisses(p);
  const total = s.at(-1);
  return {
    longueur: total,
    a(dist) {
      let i = 1;
      while (i < s.length - 1 && s[i] < dist) i++;
      const [p0, p1] = [p[i - 1], p[i]];
      const l = s[i] - s[i - 1] || 1;
      const t = (dist - s[i - 1]) / l;
      const ta = (p1[0] - p0[0]) / l;
      const ty = (p1[1] - p0[1]) / l;
      return { a: p0[0] + t * (p1[0] - p0[0]), y: p0[1] + t * (p1[1] - p0[1]), ta, ty };
    },
  };
}

/** Le chemin de la couverture dans la longueur, depuis son haut (v = longueur), en (z, y) ; et la surface du meuble. */
export function cheminLongueur(decor, longueurCm) {
  const d = DECORS[decor] || DECORS.lit2;
  if (d.type === "lit") {
    const tete = -d.longueur / 2;
    const pied = d.longueur / 2;
    // Le haut de la couverture est sous les oreillers, à 28 cm de la tête de lit (moins si elle est longue).
    const debut = Math.min(pied - 40, tete + Math.max(10, 28 - Math.max(0, longueurCm - d.longueur - 40) / 2));
    const h = d.matelas;
    return chemin([[debut, h], [pied, h], [pied, 2], [pied, -40]]);
  }
  // Canapé : sur le haut du dossier, devant le dossier, sur l'assise, puis devant l'assise.
  const arriere = -d.profondeurAssise / 2 - d.epaisseurDossier;
  const avantDossier = -d.profondeurAssise / 2;
  const avant = d.profondeurAssise / 2;
  const pts = [[avant, 2], [avant, d.assise], [avantDossier, d.assise], [avantDossier, d.dossier], [arriere, d.dossier], [arriere, 30]];
  // On part du bas, devant : le bas du tricot pend devant l'assise ; le haut passe sur le dossier.
  const c = chemin(pts);
  const debutSurChemin = Math.max(0, Math.min(8, c.longueur - longueurCm));
  return { ...c, depuisLeBas: true, debutSurChemin };
}

/** Les boîtes pleines du meuble : { x0, x1, y0, y1, z0, z1 } (cm). */
export function boitesDuDecor(decor) {
  const d = DECORS[decor] || DECORS.lit2;
  if (d.type === "lit") return [{ x0: -d.largeur / 2, x1: d.largeur / 2, y0: 0, y1: d.matelas, z0: -d.longueur / 2, z1: d.longueur / 2 }];
  const P = d.profondeurAssise;
  const W = d.largeurAssise;
  return [
    { x0: -W / 2, x1: W / 2, y0: 0, y1: d.assise, z0: -P / 2, z1: P / 2 },
    { x0: -W / 2, x1: W / 2, y0: 0, y1: d.dossier, z0: -P / 2 - d.epaisseurDossier, z1: -P / 2 },
  ];
}

/** Sort un point des boîtes, par la face la plus proche, à l'écart voulu. */
export function sortirDesBoites([x, y, z], boites, e = ECART_COUVERTURE) {
  for (const b of boites) {
    if (x > b.x0 - e && x < b.x1 + e && y > b.y0 - e && y < b.y1 + e && z > b.z0 - e && z < b.z1 + e) {
      const options = [
        [b.y1 + e - y, () => (y = b.y1 + e)],
        [x - (b.x0 - e), () => (x = b.x0 - e)],
        [b.x1 + e - x, () => (x = b.x1 + e)],
        [z - (b.z0 - e), () => (z = b.z0 - e)],
        [b.z1 + e - z, () => (z = b.z1 + e)],
      ];
      options.sort((a, c) => a[0] - c[0])[0][1]();
    }
  }
  return [x, y, z];
}

/** Plis : là où la couverture pend, de petites ondes qui grandissent vers le bas (cm). */
export function pli(position, profondeur) {
  if (profondeur <= 0) return 0;
  // Toujours vers l'extérieur : la couverture ne rentre jamais dans le meuble.
  const amp = Math.min(2.6, 0.5 + profondeur * 0.06);
  return amp * (0.5 + 0.5 * Math.sin(position / 9.5)) * Math.min(1, profondeur / 10);
}

/**
 * La nappe de la couverture : une grille de points sur toute la couverture.
 * entree = { largeurCm, longueurCm, decor, pas, decalage (x du centre, canapé) }
 * → { su, sv, point(u, v) → [x, y, z], positions, uv (en cm : u, v), index }
 */
export function nappeDeCouverture({ largeurCm, longueurCm, decor = "lit2", pas = PAS_COUVERTURE, decalage = null }) {
  const d = DECORS[decor] || DECORS.lit2;
  const cl = cheminLongueur(decor, longueurCm);
  const centreX = decalage ?? (d.type === "canape" ? Math.min(6, (d.largeurAssise - largeurCm) / 2) : 0);
  const demiLit = d.type === "lit" ? d.largeur / 2 : Infinity;
  const rayon = 5;
  // Dans la largeur (lit) : à plat sur le matelas, puis un arrondi, puis la chute.
  const largeurVers = (x) => {
    const ax = Math.abs(x);
    if (ax <= demiLit) return { x, chute: 0 };
    const reste = ax - demiLit;
    const arc = (rayon * Math.PI) / 2;
    if (reste <= arc) {
      const t = reste / rayon;
      return { x: Math.sign(x) * (demiLit + rayon * Math.sin(t)), chute: rayon * (1 - Math.cos(t)) };
    }
    return { x: Math.sign(x) * (demiLit + rayon), chute: rayon + (reste - arc) };
  };
  const point = (u, v) => {
    // Longueur : le lit part du haut du tricot (v = longueur) ; le canapé du bas (v = 0, devant).
    const dist = cl.depuisLeBas ? cl.debutSurChemin + v : longueurCm - v;
    const p = cl.a(dist);
    // Normale au chemin (vers l'extérieur du meuble) : (-ty, ta) dans le plan (z, y).
    const nz = cl.depuisLeBas ? p.ty : -p.ty;
    const ny = cl.depuisLeBas ? -p.ta : p.ta;
    const xBrut = u - largeurCm / 2 + centreX;
    const w = largeurVers(xBrut);
    let x = w.x;
    let y = p.y + ECART_COUVERTURE * ny - w.chute;
    let z = p.a + ECART_COUVERTURE * nz;
    // Plis là où ça pend : au pied (selon x) et sur les côtés (selon z).
    const pendLongueur = Math.abs(p.ty) > 0.6;
    if (pendLongueur) {
      const prof = d.type === "lit" ? d.matelas - p.y : (d.assise - p.y);
      const o = pli(xBrut, prof);
      z += o * nz;
      y += o * ny * 0.2;
    }
    if (w.chute > rayon) {
      const o = pli(z + 13, w.chute - rayon);
      x += Math.sign(x) * o;
    }
    // Jamais dans le meuble : un point entré dans une boîte en sort par la face la plus proche.
    [x, y, z] = sortirDesBoites([x, y, z], boitesDuDecor(decor));
    // Jamais sous le sol.
    y = Math.max(0.4, y);
    return [x, y, z];
  };
  const su = Math.max(8, Math.ceil(largeurCm / pas));
  const sv = Math.max(8, Math.ceil(longueurCm / pas));
  const positions = [];
  const uv = [];
  const index = [];
  for (let b = 0; b <= sv; b++) {
    const v = (longueurCm * b) / sv;
    for (let k = 0; k <= su; k++) {
      const u = (largeurCm * k) / su;
      positions.push(...point(u, v));
      uv.push(u, v);
    }
  }
  for (let b = 0; b < sv; b++) {
    for (let k = 0; k < su; k++) {
      const i = b * (su + 1) + k;
      index.push(i, i + su + 1, i + 1, i + 1, i + su + 1, i + su + 2);
    }
  }
  return { su, sv, point, positions, uv, index };
}

/**
 * Un morceau de la nappe (u0..u1, v0..v1), avec des coordonnées de texture rapportées à la tuile du point
 * (une répétition du motif en cm) : pour habiller chaque zone avec son point.
 */
export function morceauDeNappe(nappe, { u0, u1, v0, v1, tuile = { l: 1, h: 1 }, pas = PAS_COUVERTURE }) {
  const su = Math.max(1, Math.ceil((u1 - u0) / pas));
  const sv = Math.max(1, Math.ceil((v1 - v0) / pas));
  const positions = [];
  const uv = [];
  const index = [];
  for (let b = 0; b <= sv; b++) {
    const v = v0 + ((v1 - v0) * b) / sv;
    for (let k = 0; k <= su; k++) {
      const u = u0 + ((u1 - u0) * k) / su;
      positions.push(...nappe.point(u, v));
      // L'endroit est vu de dessus : u croît vers la droite.
      uv.push((u - u0) / tuile.l, (v - v0) / tuile.h);
    }
  }
  for (let b = 0; b < sv; b++) {
    for (let k = 0; k < su; k++) {
      const i = b * (su + 1) + k;
      index.push(i, i + su + 1, i + 1, i + 1, i + su + 1, i + su + 2);
    }
  }
  return { positions, uv, index };
}

/** Le texte qui décrit la vue (lecteurs d'écran). */
export function decrireCouverture({ decor, largeurCm, longueurCm, panneaux, corps, bordure }) {
  const sur = { canape: "jeté sur un canapé de mannequin", lit1: "drapée sur un lit 1 personne de mannequin", lit2: "drapée sur un lit 2 personnes de mannequin" }[decor];
  const piece = decor === "canape" ? "Plaid" : "Couverture";
  return `${piece} ${sur}, vue de trois quarts : ${Math.round(largeurCm)} × ${Math.round(longueurCm)} cm, ${panneaux > 1 ? `en ${panneaux} panneaux cousus` : "en une pièce"}${corps ? ` ; corps en ${corps}` : ""}${bordure ? `, bordure en ${bordure}` : ""}. Glisse un doigt pour tourner autour, pince pour zoomer.`;
}
