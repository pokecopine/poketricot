// Tests des liens entre les mailles et de la 3D fidèle des jetés, diminutions et augmentations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { liensDuGeste } from "../js/catalogue/gestes.js";
import { tricoterRangLie, simulerLiens } from "../js/moteur/simulateur.js";
import { pointLie, placerLesMailles, echantillonLie, tuileLiee, rendu3dFidele, besoinDesLiens, cheminDuFil, grilleEchantillon } from "../js/rendu/fil3d.js";
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

test("lots 1 et 2 : les 53 points liés ont un échantillon et une tuile fidèles, au fil continu", () => {
  const lies = POINTS.filter((p) => !(rendu3dFidele(grilleMotif(p)) && !comptesVariables(p) && !besoinDesLiens(p)) && pointLie(p));
  assert.equal(lies.length, 34 + 19);
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

test("les torsades restent approchées ; glissées, doubles, passées par-dessus et cluster sont liés (lot 2)", () => {
  for (const id of ["torsade-droite", "torsade-gauche", "double-torsade"]) assert.equal(pointLie(pointParId(id)), false, id);
  for (const id of ["tisse", "bambou", "brioche", "cluster", "jete-glisse", "point-cocon"]) assert.equal(pointLie(pointParId(id)), true, id);
  assert.equal(POINTS.filter((p) => !pointLie(p)).length, 11);
});

// ---------- Lot 2 : mailles glissées, doubles, passées par-dessus, cluster, jeté glissé ----------

test("lot 2 : une maille glissée garde sa maille du dessous et le côté du fil, retourné sur l'envers", () => {
  const e = tricoterRangLie({ cote: "E", debut: [], motif: ["glAv", "end"], fin: [] }, 4);
  assert.deepEqual(e.rang.map((c) => [c.parents, !!c.glissee, c.fil]), [[[0], true, "devant"], [[1], false, undefined], [[2], true, "devant"], [[3], false, undefined]]);
  // Fil devant sur un rang envers : il passe derrière vu de l'endroit.
  const v = tricoterRangLie({ cote: "V", debut: [], motif: ["glAv", "env"], fin: [] }, 2);
  assert.equal(v.rang.find((c) => c.glissee).fil, "derriere");
  assert.equal(tricoterRangLie({ cote: "V", debut: [], motif: ["gl", "env"], fin: [] }, 2).rang.find((c) => c.glissee).fil, "devant");
});

test("lot 2 : une maille passée par-dessus ne porte rien au rang suivant ; ceinture et cluster sont notés", () => {
  const r = tricoterRangLie({ cote: "E", debut: [], motif: ["3p1_a", "jete"], fin: [] }, 3);
  assert.ok(r.ok);
  const portes = r.rang.flatMap((c) => c.parents);
  assert.ok(!portes.includes(0), "la 1re maille est passée par-dessus");
  assert.deepEqual(r.rang[0].ceinture, { origine: "tricotee", parents: [0], sur: 2, cote: 1 });
  const c = tricoterRangLie({ cote: "E", debut: [], motif: ["cluster3_b"], fin: [] }, 3);
  assert.equal(c.rang[0].cluster.sur, 3);
  // Jeté à lâcher : aucune maille de plus, un pont lâche après la maille d'avant.
  const l = tricoterRangLie({ cote: "V", debut: [], motif: ["env", "jeteLache_c"], fin: [] }, 2);
  assert.equal(l.rang.length, 2);
  assert.ok(l.rang.every((x) => x.lacheApres === -1));
});

test("lot 2 : les 19 points se tricotent avec leurs liens, le bon nombre de mailles à chaque rang", () => {
  const ids = "fausses-cotes-anglaises nid-abeille bambou tisse tisse-double oeil-de-perdrix dentelle-nouee brioche barres-verticales-lignees cluster grain-de-poudre noisette-aeree jete-glisse mousse-glisse mailles-swag point-cocon cotes-glissees point-boucles millepertuis".split(" ");
  for (const id of ids) {
    const p = pointParId(id);
    assert.ok(besoinDesLiens(p) && pointLie(p), id);
    const e = echantillonLie(p);
    assert.ok(e && e.mailles >= 12, id);
  }
});

test("lot 2 : une maille glissée s'allonge, la barrette « fil devant » passe devant, une ceinture passe devant", () => {
  // Point tissé : rangs endroit avec mailles glissées fil devant.
  const p = pointParId("tisse");
  const sim = simulerLiens(p, { mailles: 11, rangs: 8 });
  const places = placerLesMailles(sim.grille, 11);
  assert.ok(places.some((r) => r.allonge.some((a) => a >= 1)), "une maille allongée");
  const e = echantillonLie(p);
  assert.ok(Math.max(...e.points.map((q) => q[2])) > 0.5, "la barrette est devant le tissu");
  // Brioche : des mailles à cheval et du relief vers l'endroit.
  const b = pointParId("brioche");
  const pb = placerLesMailles(simulerLiens(b, { mailles: 12, rangs: 6 }).grille, 12);
  assert.ok(pb.some((r) => r.cheval.some((x) => x !== 0)) && pb.some((r) => r.relief.some((x) => x > 0)));
  // Dentelle nouée : la ceinture passe devant les mailles.
  const d = echantillonLie(pointParId("dentelle-nouee"));
  assert.ok(Math.max(...d.points.map((q) => q[2])) > 0.55);
});

test("lot 2 : les 73 points déjà fidèles gardent exactement le même fil", async () => {
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");
  const attendu = JSON.parse(await readFile(new URL("./donnees/empreintes-fideles.json", import.meta.url), "utf8"));
  const h = (pts) => createHash("sha1").update(pts.map((q) => q.map((v) => v.toFixed(3)).join(",")).join(";")).digest("hex").slice(0, 16);
  assert.equal(Object.keys(attendu).length, 73);
  for (const [id, e] of Object.entries(attendu)) {
    const p = pointParId(id);
    if (e.simple) assert.equal(h(cheminDuFil(grilleEchantillon(grilleMotif(p, { face: "endroit" }))).points), e.simple, id);
    else {
      assert.equal(h(echantillonLie(p).points), e.echantillon, id);
      assert.equal(h(tuileLiee(p).points), e.tuile, id);
    }
  }
});
