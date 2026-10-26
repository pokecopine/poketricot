// Simulation d'un tissu souple (une écharpe), légère pour un téléphone. Fonctions pures, testées sans navigateur.
//
// Le tissu est une grille de points reliés par des « ressorts » qui gardent leur longueur
// (dynamique par positions, intégration de Verlet) :
//   - structure : chaque point avec ses voisins directs (le tissu ne s'étire presque pas) ;
//   - cisaillement : les diagonales (le tissu ne se déforme pas en losange) ;
//   - flexion : les voisins à deux pas, plus souples (le tissu plie, sans se froisser comme du papier).
// Le tissu touche des obstacles (une barre, un buste de couture) et ne passe pas à travers lui-même :
// deux points du tissu qui ne sont pas voisins dans la grille restent à distance (l'épaisseur de l'écharpe).
//
// Unités : centimètres et secondes. Repère : y vers le haut, z vers celui qui regarde.
// Dans la grille, j va de 0 à nx − 1 sur la largeur, k de 0 à ny − 1 sur la longueur
// (k = 0 : le bas de l'écharpe, là où on a monté les mailles).

export const GRAVITE = -981;

/**
 * Le buste de couture (cm) : l'origine est à la base du cou, au milieu.
 * Les mêmes formes servent au dessin et aux collisions.
 */
export const BUSTE = {
  cou: { type: "cylindreY", cx: 0, cz: -1, rayon: 5.8, y0: -6, y1: 15 },
  // La base du cou s'évase en pente douce vers les épaules (le trapèze) : l'écharpe s'y pose.
  nuque: { type: "ellipsoide", c: [0, -2.5, -1.2], r: [10, 5.5, 9] },
  epaules: { type: "ellipsoide", c: [0, -9, -1.2], r: [20, 9.5, 11.5] },
  torse: { type: "ellipsoide", c: [0, -31, -1], r: [16.5, 26, 12] },
};

/**
 * Silhouette du buste pour le dessin : à chaque hauteur y, une section ovale (demi-largeur rx, demi-profondeur rz,
 * centre cz) qui réunit en douceur les ovales des formes de collision (union lissée). Renvoie null hors du buste.
 */
export function sectionDuBuste(y, lissage = 6) {
  let sx = 0;
  let sz = 0;
  let cz = 0;
  let poids = 0;
  for (const e of [BUSTE.nuque, BUSTE.epaules, BUSTE.torse]) {
    const t = (y - e.c[1]) / e.r[1];
    if (Math.abs(t) >= 1) continue;
    const f = Math.sqrt(1 - t * t);
    sx += (e.r[0] * f) ** lissage;
    sz += (e.r[2] * f) ** lissage;
    cz += e.c[2] * f;
    poids += f;
  }
  if (!poids) return null;
  return { rx: sx ** (1 / lissage), rz: sz ** (1 / lissage), cz: cz / poids };
}

export class Tissu {
  /**
   * largeur, longueur : taille de l'écharpe (cm) ; pas : écart visé entre deux points (cm).
   * options : { epaisseur (cm), raideurFlexion, autoCollision (distance minimale entre deux couches, cm) }
   */
  constructor({ largeur, longueur, pas = 2, epaisseur = 0.5, raideurFlexion = 0.12, autoCollision = 1.4 }) {
    this.largeur = largeur;
    this.longueur = longueur;
    this.nx = Math.max(3, Math.round(largeur / pas) + 1);
    this.ny = Math.max(3, Math.round(longueur / pas) + 1);
    this.dx = largeur / (this.nx - 1);
    this.dy = longueur / (this.ny - 1);
    this.n = this.nx * this.ny;
    this.pos = new Float32Array(this.n * 3);
    this.prec = new Float32Array(this.n * 3);
    this.tenu = new Int8Array(this.n); // 1 : le point ne bouge pas tout seul (il suit le doigt, ou il est épinglé)
    this.epingle = new Int8Array(this.n); // 1 : le point est accroché à son appui (milieu sur la barre, nuque au cou)
    this.obstacles = [];
    this.sol = -1e6;
    this.epaisseur = epaisseur;
    this.distanceCouches = autoCollision;
    this.contact = new Uint8Array(this.n);
    // Frottement de la laine sur ses appuis (réglé pour qu'une écharpe tienne autour du cou sans glisser) :
    this.glisse = 0.25; // part du mouvement qu'un point posé sur un appui garde au-delà de l'accroche
    this.accroche = 2; // en dessous de ce déplacement par pas (cm), un point posé ne glisse pas

    const liens = [];
    const ajouter = (a, b, raideur) => liens.push([a, b, raideur]);
    for (let k = 0; k < this.ny; k++) {
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        if (j + 1 < this.nx) ajouter(i, this.indice(j + 1, k), 1);
        if (k + 1 < this.ny) ajouter(i, this.indice(j, k + 1), 1);
        if (j + 1 < this.nx && k + 1 < this.ny) {
          ajouter(i, this.indice(j + 1, k + 1), 0.6);
          ajouter(this.indice(j + 1, k), this.indice(j, k + 1), 0.6);
        }
        if (j + 2 < this.nx) ajouter(i, this.indice(j + 2, k), raideurFlexion);
        if (k + 2 < this.ny) ajouter(i, this.indice(j, k + 2), raideurFlexion);
      }
    }
    this.liensA = new Uint32Array(liens.map((l) => l[0]));
    this.liensB = new Uint32Array(liens.map((l) => l[1]));
    this.liensR = new Float32Array(liens.map((l) => l[2]));
    // Longueurs au repos : celles du tissu à plat.
    this.liensL = new Float32Array(liens.length);
    for (let c = 0; c < liens.length; c++) {
      const [ja, ka] = this.coord(liens[c][0]);
      const [jb, kb] = this.coord(liens[c][1]);
      this.liensL[c] = Math.hypot((ja - jb) * this.dx, (ka - kb) * this.dy);
    }
  }

  indice(j, k) {
    return k * this.nx + j;
  }

  coord(i) {
    return [i % this.nx, Math.floor(i / this.nx)];
  }

  /** Place chaque rang k : centre C, direction de la largeur W (unitaire), resserrement f de la largeur. */
  placer(rang) {
    for (let k = 0; k < this.ny; k++) {
      const { C, W, f } = rang(k * this.dy, k);
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        const w = (j * this.dx - this.largeur / 2) * f;
        // Un tout petit désordre, pour que les plis ne soient pas parfaitement réguliers.
        const bruit = Math.sin(j * 1.7 + k * 0.37) * 0.15;
        const p = [C[0] + W[0] * w + bruit * 0.3, C[1] + W[1] * w, C[2] + W[2] * w + bruit];
        this.pos.set(p, i * 3);
        this.prec.set(p, i * 3);
      }
    }
  }

  /**
   * Pose l'écharpe à cheval sur une barre ronde (le long de x, à l'origine) : le milieu (décalé de `decalage`,
   * en fraction de la longueur) sur le dessus, un pan devant, un pan derrière. `fronce` resserre la largeur
   * sur la barre (elle s'étale en descendant) : c'est ce qui fait naître les plis.
   */
  poserSurLaBarre({ rayon = 2.2, decalage = 0.06, fronce = 0.72 } = {}) {
    this.obstacles = [{ type: "barre", rayon }];
    const R = rayon + this.epaisseur;
    const milieu = this.longueur * (0.5 + decalage);
    // Rang posé sur le dessus de la barre : il retient les deux pans (voir attacher()).
    this.kAncre = Math.round(milieu / this.dy);
    const quart = (Math.PI * R) / 2;
    this.placer((v) => {
      const d = v - milieu; // > 0 : vers le haut de l'écharpe (pan de derrière)
      let y;
      let z;
      if (Math.abs(d) <= quart) {
        const t = d / R;
        y = R * Math.cos(t);
        z = -R * Math.sin(t);
      } else {
        y = -(Math.abs(d) - quart);
        z = d > 0 ? -R : R;
      }
      // Fronce sur la barre, qui se relâche sur 30 cm.
      const f = fronce + (1 - fronce) * Math.min(1, Math.max(0, -y) / 30);
      return { C: [0, y, z], W: [1, 0, 0], f };
    });
  }

  /**
   * Pose l'écharpe autour du cou d'un buste de couture : le milieu derrière la nuque, la largeur debout
   * et resserrée autour du cou (comme une écharpe qu'on vient d'enrouler), puis les deux pans passent devant
   * en se couchant peu à peu et tombent sur la poitrine.
   */
  poserAutourDuCou({ decalage = 0.04, fronce = 0.5 } = {}) {
    const { cou } = BUSTE;
    this.obstacles = Object.values(BUSTE);
    const Rw = cou.rayon + this.epaisseur + 0.8; // l'écharpe autour du cou
    // Assez haut pour que le bas de l'écharpe ne touche pas encore la base du cou : elle s'y pose en tombant.
    const y0 = BUSTE.nuque.c[1] + BUSTE.nuque.r[1] + this.epaisseur + (this.largeur * fronce) / 2 + 0.5;
    const milieu = this.longueur * (0.5 + decalage);
    this.kAncre = Math.round(milieu / this.dy);
    const arc = (Math.PI / 2) * Rw;
    const devant = 15; // z des pans devant la poitrine
    const ecart = 11.5; // x du milieu des pans
    const fin = [ecart, y0 - 14, devant];
    const passage = Math.hypot(ecart - Rw, fin[1] - y0, devant - cou.cz);
    const lisse = (x) => x * x * (3 - 2 * x);
    this.placer((v) => {
      const d = v - milieu;
      const s = d >= 0 ? 1 : -1;
      const a = Math.abs(d);
      if (a <= arc) {
        const t = d / Rw;
        return { C: [Rw * Math.sin(t), y0, cou.cz - Rw * Math.cos(t)], W: [0, 1, 0], f: fronce };
      }
      if (a <= arc + passage) {
        const t = (a - arc) / passage;
        const u = lisse(t);
        const W = [s * u, 1 - u, 0];
        const l = Math.hypot(W[0], W[1]);
        return {
          C: [s * (Rw + (ecart - Rw) * t), y0 + (fin[1] - y0) * t, cou.cz + (devant - cou.cz) * t],
          W: [W[0] / l, W[1] / l, 0],
          f: fronce + (0.8 - fronce) * t,
        };
      }
      const descente = a - arc - passage;
      return { C: [s * ecart, fin[1] - descente, devant], W: [s, 0, 0], f: 0.8 + 0.2 * Math.min(1, descente / 25) };
    });
  }

  /** Un pas de simulation. */
  pas(dt = 1 / 60, { iterations = 16, amortissement = 0.02 } = {}) {
    const p = this.pos;
    const q = this.prec;
    const g = GRAVITE * dt * dt;
    for (let i = 0; i < this.n; i++) {
      if (this.tenu[i]) continue;
      const o = i * 3;
      for (let c = 0; c < 3; c++) {
        const v = (p[o + c] - q[o + c]) * (1 - amortissement);
        q[o + c] = p[o + c];
        p[o + c] += v + (c === 1 ? g : 0);
      }
    }
    // Un point qui touche un appui à un moment du pas compte comme posé (pour le frottement).
    this.contact.fill(0);
    for (let it = 0; it < iterations; it++) {
      this.contraindre();
      this.attacher();
      // Les couches du tissu s'écartent l'une de l'autre (un peu moins souvent : c'est le calcul le plus long).
      if (it % 4 === 3) this.separerLesCouches();
      this.collisions();
    }
    this.frottement();
    // Le frottement fige les points posés : on sépare encore les couches qui se touchent, puis on repousse des appuis.
    this.separerLesCouches();
    this.collisions();
  }

  contraindre() {
    const p = this.pos;
    const A = this.liensA;
    const B = this.liensB;
    const L = this.liensL;
    const R = this.liensR;
    for (let c = 0; c < A.length; c++) {
      const ta = this.tenu[A[c]];
      const tb = this.tenu[B[c]];
      if (ta && tb) continue;
      const a = A[c] * 3;
      const b = B[c] * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const k = R[c] * (ta || tb ? 1 : 0.5) * ((d - L[c]) / d);
      if (!ta) {
        p[a] += dx * k;
        p[a + 1] += dy * k;
        p[a + 2] += dz * k;
      }
      if (!tb) {
        p[b] -= dx * k;
        p[b + 1] -= dy * k;
        p[b + 2] -= dz * k;
      }
    }
  }

  /**
   * Attaches longues : un point ne peut pas être plus loin du rang posé sur l'appui (même colonne) que la longueur
   * de tissu qui les sépare. Cela empêche une longue écharpe de s'étirer sous son poids, sans calcul coûteux.
   */
  attacher() {
    if (this.kAncre === undefined) return;
    const p = this.pos;
    for (let k = 0; k < this.ny; k++) {
      const max = Math.abs(k - this.kAncre) * this.dy * 1.01;
      if (max === 0) continue;
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        if (this.tenu[i]) continue;
        const a = this.indice(j, this.kAncre) * 3;
        const o = i * 3;
        const dx = p[o] - p[a];
        const dy = p[o + 1] - p[a + 1];
        const dz = p[o + 2] - p[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= max) continue;
        const f = max / d;
        p[o] = p[a] + dx * f;
        p[o + 1] = p[a + 1] + dy * f;
        p[o + 2] = p[a + 2] + dz * f;
      }
    }
  }

  /**
   * Le tissu ne passe pas à travers lui-même : deux points qui ne sont pas voisins dans la grille
   * (plus de 2 pas d'écart) restent à `distanceCouches` l'un de l'autre. Recherche par cases (grille de hachage).
   */
  separerLesCouches() {
    const r = this.distanceCouches;
    if (!r) return;
    const p = this.pos;
    const n = this.n;
    // Table de hachage sans allocation : têtes de liste par case, puis « suivant » par point.
    const TAILLE = 4096;
    if (!this.tetes) {
      this.tetes = new Int32Array(TAILLE);
      this.suivant = new Int32Array(n);
      this.cellule = new Int32Array(n * 3);
    }
    const tetes = this.tetes;
    const suivant = this.suivant;
    const cellule = this.cellule;
    tetes.fill(-1);
    const cle = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) & (TAILLE - 1);
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(p[i * 3] / r);
      const cy = Math.floor(p[i * 3 + 1] / r);
      const cz = Math.floor(p[i * 3 + 2] / r);
      cellule[i * 3] = cx;
      cellule[i * 3 + 1] = cy;
      cellule[i * 3 + 2] = cz;
      const k = cle(cx, cy, cz);
      suivant[i] = tetes[k];
      tetes[k] = i;
    }
    const r2 = r * r;
    const nx = this.nx;
    const tenu = this.tenu;
    for (let i = 0; i < n; i++) {
      const ji = i % nx;
      const ki = (i - ji) / nx;
      const cx = cellule[i * 3];
      const cy = cellule[i * 3 + 1];
      const cz = cellule[i * 3 + 2];
      for (let ax = -1; ax <= 1; ax++) {
        for (let ay = -1; ay <= 1; ay++) {
          for (let az = -1; az <= 1; az++) {
            for (let m = tetes[cle(cx + ax, cy + ay, cz + az)]; m !== -1; m = suivant[m]) {
              if (m <= i) continue;
              // Deux cases différentes peuvent tomber sur la même entrée de la table : on vérifie la vraie case.
              if (cellule[m * 3] !== cx + ax || cellule[m * 3 + 1] !== cy + ay || cellule[m * 3 + 2] !== cz + az) continue;
              const jm = m % nx;
              const km = (m - jm) / nx;
              if (Math.abs(jm - ji) <= 2 && Math.abs(km - ki) <= 2) continue;
              const a = i * 3;
              const b = m * 3;
              const dx = p[b] - p[a];
              const dy = p[b + 1] - p[a + 1];
              const dz = p[b + 2] - p[a + 2];
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 >= r2 || d2 < 1e-12) continue;
              const d = Math.sqrt(d2);
              const k = ((r - d) / d) * 0.5;
              const tA = tenu[i];
              const tB = tenu[m];
              if (!tA) {
                const f = k * (tB ? 2 : 1);
                p[a] -= dx * f;
                p[a + 1] -= dy * f;
                p[a + 2] -= dz * f;
              }
              if (!tB) {
                const f = k * (tA ? 2 : 1);
                p[b] += dx * f;
                p[b + 1] += dy * f;
                p[b + 2] += dz * f;
              }
            }
          }
        }
      }
    }
  }

  /** Écarte un point d'un obstacle ; renvoie vrai s'il le touchait. */
  repousser(o, p, i) {
    const e = this.epaisseur;
    const x = p[i];
    const y = p[i + 1];
    const z = p[i + 2];
    if (o.type === "barre") {
      const R = o.rayon + e;
      const d = Math.hypot(y, z);
      if (d >= R) return false;
      const f = R / (d || 1e-6);
      p[i + 1] = y * f;
      p[i + 2] = z * f;
      return true;
    }
    if (o.type === "cylindreY") {
      if (y < o.y0 || y > o.y1) return false;
      const R = o.rayon + e;
      const dx = x - o.cx;
      const dz = z - o.cz;
      const d = Math.hypot(dx, dz);
      if (d >= R) return false;
      const f = R / (d || 1e-6);
      p[i] = o.cx + dx * f;
      p[i + 2] = o.cz + dz * f;
      return true;
    }
    if (o.type === "ellipsoide") {
      const qx = (x - o.c[0]) / (o.r[0] + e);
      const qy = (y - o.c[1]) / (o.r[1] + e);
      const qz = (z - o.c[2]) / (o.r[2] + e);
      const l = Math.hypot(qx, qy, qz);
      if (l >= 1) return false;
      const f = 1 / (l || 1e-6);
      p[i] = o.c[0] + qx * f * (o.r[0] + e);
      p[i + 1] = o.c[1] + qy * f * (o.r[1] + e);
      p[i + 2] = o.c[2] + qz * f * (o.r[2] + e);
      return true;
    }
    return false;
  }

  collisions() {
    const p = this.pos;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3;
      let touche = 0;
      for (const ob of this.obstacles) if (this.repousser(ob, p, o)) touche = 1;
      if (p[o + 1] < this.sol + this.epaisseur) {
        p[o + 1] = this.sol + this.epaisseur;
        touche = 1;
      }
      if (touche) this.contact[i] = 1;
    }
  }

  /**
   * Sur les appuis, la laine accroche (frottement statique) : un point qui touche un appui ne fait qu'une petite
   * partie du chemin qu'il voudrait faire. Sans cela, l'écharpe glisserait autour du cou comme une corde sur une poulie.
   */
  frottement() {
    const p = this.pos;
    const q = this.prec;
    for (let i = 0; i < this.n; i++) {
      if (!this.contact[i] || this.tenu[i]) continue;
      const o = i * 3;
      // Frottement de Coulomb simplifié : un petit glissement est annulé, un grand est seulement freiné.
      const dx = p[o] - q[o];
      const dy = p[o + 1] - q[o + 1];
      const dz = p[o + 2] - q[o + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const garde = d <= this.accroche ? 0 : ((d - this.accroche) / d) * this.glisse;
      p[o] = q[o] + dx * garde;
      p[o + 1] = q[o + 1] + dy * garde;
      p[o + 2] = q[o + 2] + dz * garde;
      for (const ob of this.obstacles) this.repousser(ob, p, o);
    }
  }

  /** Énergie de mouvement (somme des déplacements au carré) : quand elle est faible, on peut arrêter de calculer. */
  mouvement() {
    let e = 0;
    for (let i = 0; i < this.pos.length; i++) {
      const v = this.pos[i] - this.prec[i];
      e += v * v;
    }
    return e / this.n;
  }

  /**
   * Accroche l'écharpe à son appui, là où elle repose : les rangs à moins de `demiLargeur` cm du rang posé
   * (le milieu sur la barre, la partie derrière la nuque au cou) ne bougent plus. On l'appelle une fois
   * l'écharpe posée ; quand on la tire, elle ne peut plus tomber de son appui.
   */
  epinglerAncre(demiLargeur) {
    if (this.kAncre === undefined) return 0;
    const r = Math.max(0, Math.round(demiLargeur / this.dy));
    let n = 0;
    for (let k = Math.max(0, this.kAncre - r); k <= Math.min(this.ny - 1, this.kAncre + r); k++) {
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        this.epingle[i] = 1;
        this.tenu[i] = 1;
        this.prec.set(this.pos.subarray(i * 3, i * 3 + 3), i * 3);
        n++;
      }
    }
    return n;
  }

  /** Le point le plus proche d'une position (jamais un point accroché : il ne se laisse pas attraper). */
  plusProche([x, y, z]) {
    let meilleur = -1;
    let dmin = Infinity;
    for (let i = 0; i < this.n; i++) {
      if (this.epingle[i]) continue;
      const o = i * 3;
      const d = (this.pos[o] - x) ** 2 + (this.pos[o + 1] - y) ** 2 + (this.pos[o + 2] - z) ** 2;
      if (d < dmin) {
        dmin = d;
        meilleur = i;
      }
    }
    return meilleur;
  }

  /** Le doigt tient le point i et l'amène en `cible` ; lacher() le rend libre. */
  tenir(i, cible) {
    if (i < 0 || this.epingle[i]) return;
    this.tenu[i] = 1;
    this.pos.set(cible, i * 3);
    this.prec.set(cible, i * 3);
  }

  lacher() {
    this.tenu.set(this.epingle);
  }

  /**
   * Position d'un point du tissu à plat (u sur la largeur, v sur la longueur, en cm), par interpolation dans la grille.
   * Écrit le résultat dans `sortie` à partir de `o`.
   */
  positionA(u, v, sortie, o = 0) {
    const fj = Math.min(this.nx - 1.0001, Math.max(0, u / this.dx));
    const fk = Math.min(this.ny - 1.0001, Math.max(0, v / this.dy));
    const j = Math.floor(fj);
    const k = Math.floor(fk);
    const a = fj - j;
    const b = fk - k;
    const i00 = this.indice(j, k) * 3;
    const i10 = this.indice(j + 1, k) * 3;
    const i01 = this.indice(j, k + 1) * 3;
    const i11 = this.indice(j + 1, k + 1) * 3;
    const p = this.pos;
    for (let c = 0; c < 3; c++) {
      sortie[o + c] = (p[i00 + c] * (1 - a) + p[i10 + c] * a) * (1 - b) + (p[i01 + c] * (1 - a) + p[i11 + c] * a) * b;
    }
  }
}
