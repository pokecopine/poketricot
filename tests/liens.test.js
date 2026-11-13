// Tests des liens entre les mailles et de la 3D fidèle des jetés, diminutions et augmentations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { liensDuGeste } from "../js/catalogue/gestes.js";
import { tricoterRangLie, simulerLiens } from "../js/moteur/simulateur.js";
import { pointLie, placerLesMailles, echantillonLie, tuileLiee, rendu3dFidele } from "../js/rendu/fil3d.js";
import { grilleMotif } from "../js/rendu/texture.js";
import { tailleMotif } from "../js/rendu/cuisson.js";
import { comptesVariables } from "../js/moteur/simulateur.js";

test("liens d'un geste : jeté sans maille dessous, diminutions, augmentations, étoile", () => {
  assert.deepEqual(liensDuGeste("jete"), [{ parents: [], jete: true }]);
  assert.deepEqual(liensDuGeste("2ens"), [{ parents: [0, 1] }]);
  assert.deepEqual(liensDuGeste("sd"), [{ parents: [0, 1, 2] }]);
  assert.deepEqual(liensDuGeste("aug"), [{ parents: [0] }, { parents: [0] }]);
  assert.deepEqual(liensDuGeste("croise_e"), [{ parents: [0, 1] }, { parents: [], jete: true }]);
  assert.equal(liensDuGeste("etoileEnd")[1].jete, true);
  assert.deepEqual(liensDuGeste("etoileEnd")[0].parents, [0, 1, 2]);
});

test("rang lié : indices de la grille du dessous, sur l'endroit et sur l'envers", () => {
  const endroit = tricoterRangLie({ cote: "E", debut: [], motif: ["2ens", "jete", "end"], fin: [] }, 6);
  assert.ok(endroit.ok);
  assert.deepEqual(endroit.rang.map((c) => c.parents), [[0, 1], [], [2], [3, 4], [], [5]]);
  // Sur l'envers, on part de la gauche (vu de l'endroit) et la grille est remise de droite à gauche.
  const envers = tricoterRangLie({ cote: "V", debut: [], motif: ["2ensEnv", "jete"], fin: [] }, 4);
  assert.deepEqual(envers.rang.map((c) => c.parents), [[], [1, 0], [], [3, 2]]);
  assert.ok(envers.rang.every((c) => c.jete || c.sens === 1));
});

test("simulation liée : chaque maille ne traverse que des mailles qui existent", () => {
  const p = pointParId("petits-diamants-ajoures");
  const sim = simulerLiens(p, { mailles: 6 * 5 + 3, rangs: 24 });
  assert.ok(sim.ok);
  let n = sim.montage;
  for (const rang of sim.grille) {
    for (const c of rang) for (const q of c.parents) assert.ok(q >= 0 && q < n);
    n = rang.length;
  }
});

test("placement : un jeté laisse un écart sous lui, une diminution penche du bon côté", () => {
  const rangs = [
    { cote: "E", debut: [], motif: ["end"], fin: [] },
    { cote: "E", debut: ["end", "end"], motif: ["ssk", "jete", "end", "end", "jete", "2ens"], fin: ["end", "end"] },
  ];
  const sim = simulerLiens({ rangs }, { mailles: 10, rangs: 2 });
  assert.ok(sim.ok);
  const [bas, haut] = placerLesMailles(sim.grille, 10);
  // De gauche à droite : …, 2 ens (penche à droite), jeté, 2 end, jeté, surjet (penche à gauche), …
  const j2ens = haut.cellules.findIndex((c) => c.code === "2ens");
  const jSsk = haut.cellules.findIndex((c) => c.code === "ssk");
  const [g, d] = haut.cellules[j2ens].parents;
  // 2 ensemble : la maille de gauche (dessus) va vers la droite ; celle de droite recule.
  assert.ok(bas.tete[g] > 0.1);
  assert.ok(bas.retrait[d] > 0 && bas.retrait[g] === 0);
  const [g2, d2] = haut.cellules[jSsk].parents;
  assert.ok(bas.tete[d2] < -0.1);
  assert.ok(bas.retrait[g2] > 0 && bas.retrait[d2] === 0);
  // Sous chaque jeté, l'écart entre les têtes voisines est plus grand qu'une maille.
  haut.cellules.forEach((c, j) => {
    if (!c.jete) return;
    const x = haut.X[j];
    const tetes = bas.X.map((xb, p) => xb + bas.tete[p]);
    const gauche = Math.max(...tetes.filter((t) => t < x));
    const droite = Math.min(...tetes.filter((t) => t >= x));
    assert.ok(droite - gauche > 1.1, `écart de ${droite - gauche}`);
  });
});

test("lot 1 : les 34 points à jetés et diminutions ont un échantillon et une tuile fidèles", () => {
  const lies = POINTS.filter((p) => !(rendu3dFidele(grilleMotif(p)) && !comptesVariables(p)) && pointLie(p));
  assert.equal(lies.length, 34);
  for (const p of lies) {
    const e = echantillonLie(p);
    assert.ok(e, p.id);
    assert.ok(e.mailles >= 12 && e.rangs >= 12, p.id);
    for (let i = 1; i < e.points.length; i++) {
      const d = Math.hypot(...e.points[i].map((v, k) => v - e.points[i - 1][k]));
      assert.ok(d < 0.6, `${p.id} : saut de ${d.toFixed(2)}`);
    }
    const t = tuileLiee(p);
    assert.deepEqual({ mailles: t.mailles, rangs: t.rangs }, tailleMotif(p), p.id);
  }
});

test("les gestes pas encore modélisés restent approchés (glissées, torsades, passées par-dessus)", () => {
  for (const id of ["tisse", "torsade-droite", "bambou", "brioche", "cluster"]) assert.equal(pointLie(pointParId(id)), false, id);
});
