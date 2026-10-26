// Points dont le nombre de mailles change au milieu du motif (millepertuis, rayures granitées) — version 0.7.0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pointParId } from "../js/catalogue/points.js";
import { maillesConviennent, comptesDesRangs, comptesVariables, largeurMotif } from "../js/moteur/simulateur.js";
import { preparerPoint, planEcharpe } from "../js/moteur/plan.js";
import { texteMultiple } from "../js/catalogue/fiche.js";

const P = pointParId;

test("comptes : millepertuis 6n → 5n → 6n, rayures granitées n → n/2 → n", () => {
  assert.ok(comptesVariables(P("millepertuis")));
  assert.ok(!comptesVariables(P("riz")));
  assert.deepEqual(comptesDesRangs(P("millepertuis"), 12).cycle, [12, 10, 12, 10]);
  assert.deepEqual(comptesDesRangs(P("rayures-granitees"), 20).cycle, [20, 20, 20, 20, 20, 20, 10, 20]);
  assert.ok(maillesConviennent(P("millepertuis"), 12));
  assert.ok(!maillesConviennent(P("millepertuis"), 14));
  assert.ok(maillesConviennent(P("rayures-granitees"), 20));
  assert.ok(!maillesConviennent(P("rayures-granitees"), 21));
  assert.equal(largeurMotif(P("millepertuis")), 6);
  assert.equal(texteMultiple(P("millepertuis")), "multiple de 6 mailles");
  assert.equal(texteMultiple(P("rayures-granitees")), "nombre pair de mailles");
});

test("préparer : le motif commence sur un rang qui prend toutes les mailles, sinon un rang de jersey avant", () => {
  const endroit = preparerPoint(P("millepertuis"), "E", 12);
  assert.deepEqual([endroit.phase, endroit.ajoute, endroit.miseEnPlace.length], [0, false, 0]);
  const envers = preparerPoint(P("millepertuis"), "V", 12);
  assert.equal(envers.ajoute, true);
  assert.deepEqual(envers.miseEnPlace[0].motif, ["env"]);
  assert.equal(envers.phase, 0);
  // Les rayures granitées peuvent commencer sur l'envers sans rang en plus (rang 2 : toutes les mailles).
  assert.equal(preparerPoint(P("rayures-granitees"), "V", 20).ajoute, false);
});

function plan(corps, { bas = "mousse", cotes = "mousse", basCm = 3 } = {}) {
  const d = (id) => ({ mailles: 20 * P(id).densite.mailles, rangs: 28 * P(id).densite.rangs, statut: "estimee" });
  const blocs = [
    { id: "bas", zone: "bas", pointId: bas, hauteurCm: basCm },
    { id: "corps", zone: "corps", pointId: corps },
    { id: "haut", zone: "haut", pointId: "mousse", hauteurCm: 3 },
    { id: "cotes", zone: "cotes", pointId: cotes, largeurMailles: 4 },
  ];
  const densites = Object.fromEntries([bas, corps, cotes, "mousse"].map((id) => [id, d(id)]));
  return planEcharpe({ largeurCm: 20, longueurCm: 150, blocs, densites });
}

test("écharpe : le corps en millepertuis change de mailles rang après rang et finit juste", () => {
  for (const basCm of [2, 3, 4]) {
    const r = plan("millepertuis", { basCm });
    assert.equal(r.ok, true, JSON.stringify(r.erreurs));
    const corps = r.plan.blocs.find((b) => b.id === "corps");
    const rangs = r.plan.rangs.filter((x) => x.blocId === "corps");
    const totaux = new Set(rangs.map((x) => x.mailles));
    assert.equal(totaux.size, 2, `${[...totaux]}`);
    assert.equal(rangs.at(-1).mailles, r.plan.montage.mailles);
    assert.equal(corps.maillesCorps % 6, 0);
  }
});

test("écharpe : rayures granitées au corps, en bordure et en bandes latérales", () => {
  assert.equal(plan("rayures-granitees").ok, true);
  assert.equal(plan("riz", { bas: "rayures-granitees", basCm: 4 }).ok, true);
  const r = plan("riz", { cotes: "rayures-granitees" });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
});
