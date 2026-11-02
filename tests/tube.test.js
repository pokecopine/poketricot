// Tests du tube rigide du snood fini (E4-9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tubeRigide, paroiDuTube, bordDuTube, rayonDuTube, angleDuTour, distanceDeCadrage, pixelsPour10cm, echelleAffichee, EPAISSEUR_TUBE } from "../js/rendu/tube.js";

const proche = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/** Chaque triangle est tourné du côté de sa normale (ordre des sommets cohérent avec les normales données). */
function trianglesTournesVersLesNormales({ positions, normales, index }) {
  for (let t = 0; t < index.length; t += 3) {
    const [i, j, k] = [index[t], index[t + 1], index[t + 2]];
    const p = (n) => positions.slice(n * 3, n * 3 + 3);
    const [a, b, c] = [p(i), p(j), p(k)];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const moy = [0, 1, 2].map((d) => normales[i * 3 + d] + normales[j * 3 + d] + normales[k * 3 + d]);
    const aire = Math.hypot(...n);
    if (aire < 1e-9) continue;
    if (n[0] * moy[0] + n[1] * moy[1] + n[2] * moy[2] <= 0) return false;
  }
  return true;
}

const rectsSnood = (tour, hauteur) => [
  { blocId: "bas", pointId: "cotes-1-1", x: 0, y: 0, l: tour, h: 3 },
  { blocId: "corps", pointId: "riz", x: 0, y: 3, l: tour, h: hauteur - 6 },
  { blocId: "haut", pointId: "cotes-1-1", x: 0, y: hauteur - 3, l: tour, h: 3 },
];

test("tube : le tour et la hauteur sont ceux du projet", () => {
  for (const [tour, hauteur] of [[62, 24], [152, 25], [56, 20]]) {
    const t = tubeRigide({ tour, hauteur, rects: rectsSnood(tour, hauteur) });
    assert.ok(proche(2 * Math.PI * t.rayon, tour), "le tour du cylindre extérieur");
    let yMin = Infinity, yMax = -Infinity, rMax = 0;
    for (const m of t.morceaux) {
      const p = m.exterieur.positions;
      for (let i = 0; i < p.length; i += 3) {
        yMin = Math.min(yMin, p[i + 1]);
        yMax = Math.max(yMax, p[i + 1]);
        rMax = Math.max(rMax, Math.hypot(p[i], p[i + 2]));
      }
    }
    assert.ok(proche(yMax - yMin, hauteur, 1e-9), "la paroi fait toute la hauteur");
    assert.ok(proche(rMax, rayonDuTube(tour), 1e-9));
    assert.ok(proche(t.interieur, t.rayon - EPAISSEUR_TUBE));
  }
});

test("tube : le tube repose sur le fond, ses bords arrondis vont de l'extérieur à l'intérieur", () => {
  const tour = 62, hauteur = 24;
  const t = tubeRigide({ tour, hauteur, rects: rectsSnood(tour, hauteur) });
  const bas = t.morceaux[0].bords[0].positions;
  const haut = t.morceaux[2].bords[0].positions;
  let yMinBas = Infinity, yMaxHaut = -Infinity;
  for (let i = 1; i < bas.length; i += 3) yMinBas = Math.min(yMinBas, bas[i]);
  for (let i = 1; i < haut.length; i += 3) yMaxHaut = Math.max(yMaxHaut, haut[i]);
  assert.ok(proche(yMinBas, 0, 1e-9), "le bas touche y = 0");
  assert.ok(proche(yMaxHaut, hauteur + EPAISSEUR_TUBE, 1e-9));
  // Seuls le bloc du bas et celui du haut ont un bord arrondi.
  assert.deepEqual(t.morceaux.map((m) => m.bords.length), [1, 0, 1]);
  // Premier et dernier rang de sommets de l'arrondi : sur la paroi extérieure, puis sur la paroi intérieure.
  const r = (p, i) => Math.hypot(p[i * 3], p[i * 3 + 2]);
  assert.ok(proche(r(haut, 0), t.rayon, 1e-9));
  assert.ok(proche(r(haut, haut.length / 3 - 1), t.interieur, 1e-9));
});

test("tube : toutes les faces sont tournées vers l'extérieur du tissu", () => {
  const tour = 62, hauteur = 24;
  const t = tubeRigide({ tour, hauteur, rects: rectsSnood(tour, hauteur) });
  for (const m of t.morceaux) {
    assert.ok(trianglesTournesVersLesNormales(m.exterieur), `paroi extérieure ${m.rect.blocId}`);
    assert.ok(trianglesTournesVersLesNormales(m.interieur), `paroi intérieure ${m.rect.blocId}`);
    for (const b of m.bords) assert.ok(trianglesTournesVersLesNormales(b), `bord ${m.rect.blocId}`);
    // Les normales de la paroi pointent vers l'extérieur du cylindre.
    const p = m.exterieur.positions, n = m.exterieur.normales;
    for (let i = 0; i < p.length; i += 3) assert.ok(p[i] * n[i] + p[i + 2] * n[i + 2] > 0);
  }
});

test("tube : le début du tour est à l'arrière, l'endroit se lit de gauche à droite vu de devant", () => {
  const tour = 62;
  const avant = (u) => { const a = angleDuTour(u, tour); return [Math.sin(a), Math.cos(a)]; };
  assert.ok(avant(0)[1] < -0.999, "u = 0 derrière");
  assert.ok(avant(tour / 2)[1] > 0.999, "milieu du tour devant");
  // Devant, u croissant va vers la droite (+x), comme sur l'écharpe vue de l'endroit.
  assert.ok(avant(tour / 2 + 1)[0] > avant(tour / 2)[0]);
});

test("tube : les textures gardent l'échelle de l'échantillon et font le tour", () => {
  const tour = 62, hauteur = 24;
  const tuile = { l: 3.1, h: 2 };
  const rect = { x: 0, y: 3, l: tour, h: 18 };
  const p = paroiDuTube({ rect, tour, rayon: rayonDuTube(tour), tuile });
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < p.uv.length; i += 2) {
    uMin = Math.min(uMin, p.uv[i]); uMax = Math.max(uMax, p.uv[i]);
    vMin = Math.min(vMin, p.uv[i + 1]); vMax = Math.max(vMax, p.uv[i + 1]);
  }
  assert.ok(proche((uMax - uMin) * tuile.l, tour, 1e-9), "un tour = tour / largeur de la tuile répétitions");
  assert.ok(proche(vMin * tuile.h, 3, 1e-9) && proche(vMax * tuile.h, 21, 1e-9), "v en cm depuis le bas du tricot");
  // Le bord arrondi du haut prolonge v au-dessus du dernier rang.
  const b = bordDuTube({ rect: { x: 0, y: 21, l: tour, h: 3 }, tour, rayon: rayonDuTube(tour), yBord: 24, haut: true, vBord: hauteur, tuile });
  let vb = -Infinity;
  for (let i = 1; i < b.uv.length; i += 2) vb = Math.max(vb, b.uv[i]);
  assert.ok(vb * tuile.h > hauteur);
});

test("tube : les colonnes se partagent le tour, la colonne 1 part du début du tour", () => {
  const tour = 62;
  const rayon = rayonDuTube(tour);
  const c1 = paroiDuTube({ rect: { x: 0, y: 0, l: tour / 2, h: 10 }, tour, rayon });
  // Premier sommet de la colonne 1 (x = 0) : au début du tour, à l'arrière.
  assert.ok(c1.positions[2] < -rayon + 1e-6);
});

test("tube : cadrage et échelle de 10 cm", () => {
  const petit = distanceDeCadrage({ rayon: rayonDuTube(62), hauteur: 24, aspect: 0.8 });
  const grand = distanceDeCadrage({ rayon: rayonDuTube(152), hauteur: 25, aspect: 0.8 });
  assert.ok(grand > petit * 1.5, "le 2 tours est vu de plus loin");
  const px1 = pixelsPour10cm({ distance: petit, rayon: rayonDuTube(62), hauteurPx: 460 });
  const px2 = pixelsPour10cm({ distance: grand, rayon: rayonDuTube(152), hauteurPx: 460 });
  assert.ok(px1 > px2 && px2 > 20 && px1 < 300);
});

test("tube : l'échelle affichée reste lisible quand on zoome", () => {
  assert.deepEqual(echelleAffichee(6), { cm: 10, px: 60 });
  assert.equal(echelleAffichee(20).cm, 5);
  assert.equal(echelleAffichee(50).cm, 2);
  assert.equal(echelleAffichee(200).cm, 1);
});
