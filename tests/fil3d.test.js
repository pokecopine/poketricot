// Tests du chemin du fil en 3D (échantillon 3D).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { grilleMotif } from "../js/rendu/texture.js";
import { grilleEchantillon, cheminDuFil, brinsDuFil, rendu3dFidele, MODELE } from "../js/rendu/fil3d.js";

test("échantillon : un nombre entier de motifs, au moins 16 mailles et 20 rangs quand c'est possible", () => {
  const g = grilleEchantillon(grilleMotif(pointParId("cotes-2-2")));
  assert.equal(g[0].length % 4, 0);
  assert.ok(g[0].length >= 16 && g.length >= 20);
  const grand = grilleEchantillon(grilleMotif(pointParId("pavillon")));
  assert.ok(grand.length * grand[0].length <= 900);
});

test("chemin du fil : continu, une maille endroit a ses jambes devant, une maille envers derrière", () => {
  const n = MODELE.points;
  const { points } = cheminDuFil([["V", "V"], ["grain", "grain"]]);
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(...points[i].map((v, k) => v - points[i - 1][k]));
    assert.ok(d < 0.35, `saut de ${d} au point ${i}`);
  }
  // Jambe (u = ¼ de maille) : devant pour l'endroit, derrière pour l'envers.
  assert.ok(points[n / 4][2] > 0);
  const debutRang2 = 2 * n + 1 + 9; // premier rang, puis la lisière
  assert.ok(points[debutRang2 + n / 4][2] < 0);
});

test("chemin du fil : endroit et envers changent en douceur dans un même rang (côtes)", () => {
  const { points } = cheminDuFil([["V", "V", "grain", "grain"]]);
  for (let i = 1; i < points.length; i++) assert.ok(Math.abs(points[i][2] - points[i - 1][2]) < 0.12);
});

test("brins : trois brins autour du fil, à distance constante", () => {
  const { points } = cheminDuFil([["V", "grain", "V"]]);
  const brins = brinsDuFil(points);
  assert.equal(brins.length, 3);
  for (const b of brins) {
    assert.equal(b.length, points.length);
    for (let i = 0; i < b.length; i += 7) {
      const d = Math.hypot(...b[i].map((v, k) => v - points[i][k]));
      assert.ok(Math.abs(d - MODELE.rayon * 0.48) < 1e-6);
    }
  }
});

test("rendu 3D fidèle pour les points d'endroit et d'envers, approché pour les jetés et torsades", () => {
  assert.ok(rendu3dFidele(grilleMotif(pointParId("riz"))));
  assert.ok(rendu3dFidele(grilleMotif(pointParId("mousse"))));
  assert.ok(!rendu3dFidele(grilleMotif(pointParId("torsade-gauche"))));
  assert.ok(!rendu3dFidele(grilleMotif(pointParId("bourse"))));
  // Tous les points donnent un chemin sans valeur manquante.
  for (const p of POINTS) {
    const g = grilleEchantillon(grilleMotif(p));
    const { points } = cheminDuFil(g);
    assert.ok(points.every((q) => q.every(Number.isFinite)), p.id);
  }
});
