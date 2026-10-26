import { test } from "node:test";
import assert from "node:assert/strict";
import { lineaire, teinteDuCreux, bruitLisse, nuanceDuFil, couleursDuFil, REBOND } from "../js/rendu/lumiere.js";

test("couleur linéaire : blanc, noir et gris moyen", () => {
  assert.deepEqual(lineaire("#FFFFFF"), [1, 1, 1]);
  assert.deepEqual(lineaire("#000000"), [0, 0, 0]);
  assert.ok(Math.abs(lineaire("#808080")[0] - 0.2159) < 0.001);
});

test("en pleine lumière, pas de changement ; au fond d'un creux, la couleur de la laine domine", () => {
  const terracotta = [1, 0.32, 0.16];
  assert.deepEqual(teinteDuCreux(1, terracotta), [1, 1, 1]);
  const creux = teinteDuCreux(0.2, terracotta);
  assert.ok(creux.every((c) => c < 1));
  // Plus sombre mais plus coloré : le rouge garde plus de lumière que le bleu.
  assert.ok(creux[0] > creux[2]);
  assert.ok(Math.abs(creux[0] - (0.2 + 0.8 * REBOND)) < 1e-9);
});

test("une laine grise garde des ombres neutres", () => {
  const [r, g, b] = teinteDuCreux(0.3, [1, 1, 1]);
  assert.equal(r, g);
  assert.equal(g, b);
});

test("bruit lisse : borné, continu", () => {
  for (let x = 0; x < 20; x += 0.13) {
    const v = bruitLisse(x);
    assert.ok(v >= -1 && v <= 1);
    assert.ok(Math.abs(bruitLisse(x + 0.01) - v) < 0.1);
  }
  const n = nuanceDuFil(3.3, 0.05);
  assert.ok(n >= 0.95 && n <= 1.05);
});

test("couleurs du fil : trois composantes par sommet, ombres plus sombres que la lumière", () => {
  const ao = Float32Array.from([1, 1, 0.2, 0.2]);
  const c = couleursDuFil(ao, [0.6, 0.2, 0.1], { tours: 2, segmentsParMaille: 4, amplitude: 0 });
  assert.equal(c.length, 12);
  assert.ok(Math.abs(c[0] - 1) < 1e-6);
  assert.ok(c[6] < c[0] && c[8] < c[6]);
});
