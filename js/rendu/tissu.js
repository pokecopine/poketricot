// Simulation d'un tissu souple (une écharpe), légère pour un téléphone. Fonctions pures, testées sans navigateur.
//
// Le tissu est une grille de points reliés par des « ressorts » qui gardent leur longueur
// (dynamique par positions, intégration de Verlet) :
//   - structure : chaque point avec ses voisins directs (le tissu ne s'étire presque pas) ;
//   - cisaillement : les diagonales (le tissu ne se déforme pas en losange) ;
//   - flexion : les voisins à deux pas, plus souples (le tissu plie, sans se froisser comme du papier).
// L'écharpe est posée sur une barre ronde (un cylindre le long de x) ; le sol l'arrête si elle descend jusque-là.
//
// Unités : centimètres et secondes. Repère : x le long de la barre (la largeur de l'écharpe), y vers le haut,
// z vers celui qui regarde. Dans la grille, j va de 0 à nx − 1 sur la largeur, k de 0 à ny − 1 sur la longueur
// (k = 0 : le bas de l'écharpe, là où on a monté les mailles).

export const GRAVITE = -981;

export class Tissu {
  /**
   * largeur, longueur : taille de l'écharpe (cm) ; pas : écart visé entre deux points (cm).
   * options : { barre: { rayon }, sol (y du sol), epaisseur (cm), raideurFlexion }
   */
  constructor({ largeur, longueur, pas = 2, barre = { rayon: 2.2 }, sol = -400, epaisseur = 0.5, raideurFlexion = 0.12 }) {
    this.largeur = largeur;
    this.longueur = longueur;
    this.nx = Math.max(3, Math.round(largeur / pas) + 1);
    this.ny = Math.max(3, Math.round(longueur / pas) + 1);
    this.dx = largeur / (this.nx - 1);
    this.dy = longueur / (this.ny - 1);
    this.n = this.nx * this.ny;
    this.pos = new Float32Array(this.n * 3);
    this.prec = new Float32Array(this.n * 3);
    this.tenu = new Int8Array(this.n); // 1 : le point suit le doigt
    this.barre = barre;
    this.sol = sol;
    this.epaisseur = epaisseur;
    this.contact = new Uint8Array(this.n);

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

  /**
   * Pose l'écharpe à cheval sur la barre : le milieu (décalé de `decalage`, en fraction de la longueur) sur le dessus,
   * un pan devant, un pan derrière. `fronce` resserre la largeur sur la barre (elle s'étale en descendant) :
   * c'est ce qui fait naître les plis.
   */
  poserSurLaBarre({ decalage = 0.06, fronce = 0.72 } = {}) {
    const R = this.barre.rayon + this.epaisseur;
    const milieu = this.longueur * (0.5 + decalage);
    // Rang posé sur le dessus de la barre : il retient les deux pans (voir attacher()).
    this.kAncre = Math.round(milieu / this.dy);
    const quart = (Math.PI * R) / 2;
    for (let k = 0; k < this.ny; k++) {
      const d = k * this.dy - milieu; // > 0 : vers le haut de l'écharpe (pan de derrière)
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
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        const x = (j * this.dx - this.largeur / 2) * f;
        // Un tout petit désordre, pour que les plis ne soient pas parfaitement réguliers.
        const bruit = Math.sin(j * 1.7 + k * 0.37) * 0.15;
        this.pos.set([x, y, z + bruit], i * 3);
        this.prec.set([x, y, z + bruit], i * 3);
      }
    }
  }

  /**
   * Pose l'écharpe en vague au-dessus de la table : elle tombe, et le bord intérieur de chaque courbe,
   * trop long pour la place qu'il a, se soulève en plis. Pas de barre dans ce cas.
   */
  poserSurLaTable({ hauteur = 20, amplitude = 0.19, vagues = 1.25 } = {}) {
    this.barre = null;
    this.kAncre = undefined;
    this.sol = 0;
    // La ligne du milieu de l'écharpe suit une sinusoïde dans le plan de la table (x, z), longueur conservée.
    const N = this.ny;
    const A = this.longueur * amplitude;
    const centre = [];
    let s = 0;
    let t = 0;
    let prec = [0, 0];
    const longueurCourbe = [];
    for (let i = 0; i <= 2000; i++) {
      t = i / 2000;
      const p = [A * Math.sin(2 * Math.PI * vagues * t), t];
      if (i > 0) s += Math.hypot(p[0] - prec[0], (p[1] - prec[1]) * this.longueur);
      longueurCourbe.push([s, p]);
      prec = p;
    }
    const total = s;
    let idx = 0;
    for (let k = 0; k < N; k++) {
      const cible = (k / (N - 1)) * total;
      while (idx < longueurCourbe.length - 2 && longueurCourbe[idx + 1][0] < cible) idx++;
      const [x, tt] = longueurCourbe[idx][1];
      const [x2, t2] = longueurCourbe[Math.min(idx + 1, longueurCourbe.length - 1)][1];
      const tx = x2 - x;
      const tz = (t2 - tt) * this.longueur;
      const l = Math.hypot(tx, tz) || 1;
      centre.push([x, (tt - 0.5) * this.longueur * 0.92, -tz / l, tx / l]);
    }
    // L'écharpe centrée sur la table.
    const moyenne = centre.reduce((t, c) => t + c[0], 0) / N;
    for (let k = 0; k < N; k++) {
      const [cx0, cz, nx, nz] = centre[k];
      const cx = cx0 - moyenne;
      for (let j = 0; j < this.nx; j++) {
        const i = this.indice(j, k);
        const w = j * this.dx - this.largeur / 2;
        const bruit = Math.sin(j * 2.1 + k * 0.53) * 0.4;
        const p = [cx + nx * w, hauteur + bruit + (j % 2) * 0.3, cz + nz * w];
        this.pos.set(p, i * 3);
        this.prec.set(p, i * 3);
      }
    }
  }

  /** Un pas de simulation. */
  pas(dt = 1 / 60, { iterations = 20, amortissement = 0.02 } = {}) {
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
    for (let it = 0; it < iterations; it++) {
      this.contraindre();
      this.attacher();
      this.collisions();
    }
    this.frottement();
  }

  contraindre() {
    const p = this.pos;
    const A = this.liensA;
    const B = this.liensB;
    const L = this.liensL;
    const R = this.liensR;
    for (let c = 0; c < A.length; c++) {
      const a = A[c] * 3;
      const b = B[c] * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      // Les liens de flexion ne résistent qu'à la compression partielle : le tissu peut plier.
      const ecart = (d - L[c]) / d;
      const ta = this.tenu[A[c]];
      const tb = this.tenu[B[c]];
      if (ta && tb) continue;
      const k = R[c] * (ta || tb ? 1 : 0.5) * ecart;
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
   * Attaches longues : un point ne peut pas être plus loin du rang posé sur la barre (même colonne) que la longueur
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

  collisions() {
    const p = this.pos;
    const R = this.barre ? this.barre.rayon + this.epaisseur : 0;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3;
      const y = p[o + 1];
      const z = p[o + 2];
      const d = Math.hypot(y, z);
      this.contact[i] = 0;
      if (this.barre && d < R) {
        const f = R / (d || 1e-6);
        p[o + 1] = y * f;
        p[o + 2] = z * f;
        this.contact[i] = 1;
      }
      if (p[o + 1] < this.sol + this.epaisseur) {
        p[o + 1] = this.sol + this.epaisseur;
        this.contact[i] = 1;
      }
    }
  }

  /** Sur la barre et au sol, la laine accroche : elle glisse très peu. */
  frottement() {
    for (let i = 0; i < this.n; i++) {
      if (!this.contact[i] || this.tenu[i]) continue;
      const o = i * 3;
      for (let c = 0; c < 3; c++) this.prec[o + c] += (this.pos[o + c] - this.prec[o + c]) * 0.85;
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

  /** Le point le plus proche d'une position. */
  plusProche([x, y, z]) {
    let meilleur = -1;
    let dmin = Infinity;
    for (let i = 0; i < this.n; i++) {
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
    this.tenu[i] = 1;
    this.pos.set(cible, i * 3);
    this.prec.set(cible, i * 3);
  }

  lacher() {
    this.tenu.fill(0);
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
