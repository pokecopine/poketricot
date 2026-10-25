// Tests des marques sur les points : favoris et à tester en priorité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { basculerMarque, estMarque, pointsMarques, marquesDeLaSauvegarde } from "../js/donnees/marques.js";

test("marques : cocher, décocher, sans doublon ni point inconnu", () => {
  let prefs = { id: "prefs" };
  prefs = { ...prefs, ...basculerMarque(prefs, "favoris", "riz") };
  prefs = { ...prefs, ...basculerMarque(prefs, "favoris", "mousse") };
  prefs = { ...prefs, ...basculerMarque(prefs, "aTester", "riz") };
  assert.deepEqual(prefs.favoris, ["riz", "mousse"]);
  assert.ok(estMarque(prefs, "aTester", "riz"));
  assert.ok(!estMarque(prefs, "aTester", "mousse"));
  prefs = { ...prefs, ...basculerMarque(prefs, "favoris", "riz") };
  assert.deepEqual(prefs.favoris, ["mousse"]);
  assert.deepEqual(pointsMarques({ favoris: ["mousse", "mousse", "point-disparu"] }, "favoris"), ["mousse"]);
  assert.deepEqual(pointsMarques({}, "aTester"), []);
});

test("marques : reprises d'une sauvegarde importée", () => {
  assert.deepEqual(marquesDeLaSauvegarde([{ id: "prefs", theme: "sombre", favoris: ["riz"], aTester: [] }]), { favoris: ["riz"], aTester: [] });
  assert.deepEqual(marquesDeLaSauvegarde([{ id: "prefs" }]), {});
  assert.deepEqual(marquesDeLaSauvegarde(undefined), {});
});
