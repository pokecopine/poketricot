import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { CRITERES, filtrerParCriteres } from "../js/catalogue/criteres.js";
import { largeurMotif } from "../js/moteur/simulateur.js";

test("sans critère coché, tout le catalogue reste", () => {
  assert.equal(filtrerParCriteres(POINTS, []).length, POINTS.length);
});

test("les critères se cumulent", () => {
  const rev = filtrerParCriteres(POINTS, ["reversible"]);
  const revRoule = filtrerParCriteres(POINTS, ["reversible", "neRoulePas"]);
  assert.ok(rev.length > 0 && revRoule.length <= rev.length);
  assert.ok(revRoule.every((p) => p.proprietes.reversible && !p.proprietes.roule));
  assert.ok(revRoule.some((p) => p.id === "riz"));
  assert.ok(!filtrerParCriteres(POINTS, ["reversible"]).some((p) => p.id === "jersey"));
});

test("chaque critère garde au moins un point, et pas tous", () => {
  for (const c of CRITERES) {
    const n = filtrerParCriteres(POINTS, [c.id]).length;
    assert.ok(n > 0 && n < POINTS.length, c.id);
  }
});

test("grand motif : 12 mailles ou plus", () => {
  const grands = filtrerParCriteres(POINTS, ["grandMotif"]);
  assert.ok(grands.every((p) => largeurMotif(p) >= 12));
  assert.ok(!grands.includes(pointParId("riz")));
});
