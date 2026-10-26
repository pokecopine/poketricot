import { test } from "node:test";
import assert from "node:assert/strict";
import { echantillonnerAxe, occlusionDesSommets } from "../js/rendu/occlusion.js";

test("l'axe du fil est échantillonné à pas régulier", () => {
  const pts = echantillonnerAxe([[0, 0, 0], [1, 0, 0], [1, 1, 0]], 0.25);
  assert.equal(pts.length, 9);
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    assert.ok(d <= 0.25 + 1e-9);
  }
});

test("un fil seul n'est pas assombri ; un fil posé devant assombrit la surface qu'il cache", () => {
  const r = 0.1;
  // Un sommet sur le dessus d'un fil horizontal, regardant vers +z.
  const axe = [[-1, 0, 0], [1, 0, 0]];
  const pos = [0, 0, r];
  const nor = [0, 0, 1];
  const seul = occlusionDesSommets(pos, nor, axe, r);
  assert.ok(seul[0] > 0.99, `fil seul : ${seul[0]}`);
  // Un second fil passe juste au-dessus (comme une boucle qui croise).
  const croise = [[-1, 0, 0], [1, 0, 0], [1, 0, 3 * r], [0, -1, 3 * r], [0, 1, 3 * r]];
  const sombre = occlusionDesSommets(pos, nor, croise, r);
  assert.ok(sombre[0] < 0.9, `fil croisé : ${sombre[0]}`);
  assert.ok(sombre[0] >= 0.32);
});

test("un fil situé derrière la surface ne l'assombrit pas", () => {
  const r = 0.1;
  const axe = [[-1, 0, 0], [1, 0, 0], [1, 0, -4 * r], [-1, 0, -4 * r]];
  const v = occlusionDesSommets([0, 0, r], [0, 0, 1], axe, r);
  assert.ok(v[0] > 0.99);
});
