import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tricoterRang, simuler, convertirEnRond, maillesConviennent, maillesLesPlusProches, maillesMinimum, consomme, produit, largeurMotif, comptesVariables,
} from "../js/moteur/simulateur.js";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { GESTES } from "../js/catalogue/gestes.js";

const E = (motif, o = {}) => ({ cote: "E", debut: o.debut || [], motif, fin: o.fin || [] });
const V = (motif, o = {}) => ({ cote: "V", debut: o.debut || [], motif, fin: o.fin || [] });

test("chaque geste est cohérent : aspects et équivalents", () => {
  for (const [code, g] of Object.entries(GESTES)) {
    assert.equal(g.endroit.length, g.produit, `${code} : aspects endroit`);
    if (g.envers) assert.equal(g.envers.length, g.produit, `${code} : aspects envers`);
    if (g.vuDeLAutreCote) {
      const autre = GESTES[g.vuDeLAutreCote];
      assert.ok(autre, `${code} : équivalent inconnu`);
      assert.equal(autre.consomme, g.consomme, `${code} ↔ ${g.vuDeLAutreCote}`);
      assert.equal(autre.produit, g.produit, `${code} ↔ ${g.vuDeLAutreCote}`);
      assert.equal(autre.vuDeLAutreCote, code, `${code} : l'équivalent doit revenir`);
    }
  }
});

test("un rang qui tombe juste, un rang qui ne tombe pas juste", () => {
  const r = tricoterRang(E(["end", "env"], { fin: ["end"] }), 7);
  assert.equal(r.ok, true);
  assert.equal(r.k, 3);
  assert.deepEqual(r.aspects, ["V", "grain", "V", "grain", "V", "grain", "V"]);
  const faux = tricoterRang(E(["end", "env"], { fin: ["end"] }), 8);
  assert.equal(faux.ok, false);
  assert.match(faux.erreur, /ne tombe pas juste sur 8 mailles/);
});

test("un rang envers se voit de l'autre côté, dans l'autre sens", () => {
  // Tricoté sur l'envers : la maille envers donne un V sur l'endroit, et l'ordre s'inverse.
  const r = tricoterRang(V(["env", "env", "end"]), 3);
  assert.deepEqual(r.aspects, ["grain", "V", "V"]);
});

test("une torsade ne se fait pas sur l'envers", () => {
  const r = tricoterRang(V(["T3/3G"]), 6);
  assert.equal(r.ok, false);
  assert.match(r.erreur, /sur l'endroit/);
});

test("le simulateur repère un point qui change le nombre de mailles", () => {
  const augmente = { id: "faux", rangs: [E(["end", "jete"])] };
  const r = simuler(augmente, { mailles: 4, rangs: 2 });
  assert.equal(r.ok, false);
  assert.match(r.erreurs[0].message, /ne tombe pas juste|a changé/);
});

test("conversion en rond : exemples connus", () => {
  assert.deepEqual(convertirEnRond(pointParId("jersey")).rangs.map((r) => r.motif), [["end"], ["end"]]);
  assert.deepEqual(convertirEnRond(pointParId("mousse")).rangs.map((r) => r.motif), [["end"], ["env"]]);
  assert.deepEqual(convertirEnRond(pointParId("cotes-1-1")).rangs.map((r) => r.motif), [["end", "env"], ["end", "env"]]);
  assert.deepEqual(convertirEnRond(pointParId("riz")).rangs.map((r) => r.motif), [["end", "env"], ["env", "end"]]);
  assert.deepEqual(convertirEnRond(pointParId("sillon")).rangs.map((r) => r.motif), [["end", "end", "env"], ["end", "env", "env"]]);
  const fca = convertirEnRond(pointParId("fausses-cotes-anglaises"));
  assert.deepEqual(fca.miseEnPlace.map((r) => r.motif), [["end"]]);
  assert.deepEqual(fca.rangs.map((r) => r.motif), [["env", "md"], ["mdEnv", "end"]]);
  assert.deepEqual(convertirEnRond(pointParId("nid-abeille")).rangs.map((r) => r.motif), [["env"], ["end", "md"], ["env"], ["md", "end"]]);
});

test("les côtes forment des colonnes bien droites à plat", () => {
  for (const id of ["cotes-1-1", "cotes-2-2"]) {
    const r = simuler(pointParId(id), { mailles: 12, rangs: 6 });
    assert.equal(r.ok, true, id);
    for (let c = 0; c < 12; c++) {
      const colonne = new Set(r.grille.map((rang) => rang[c]));
      assert.equal(colonne.size, 1, `${id} colonne ${c}`);
    }
  }
});

test("calcul du nombre de mailles qui convient", () => {
  const riz = pointParId("riz");
  assert.equal(maillesConviennent(riz, 37), true);
  assert.equal(maillesConviennent(riz, 38), false);
  assert.equal(maillesLesPlusProches(riz, 38), 37);
  assert.equal(maillesConviennent(riz, 38, "rond"), true);
  assert.equal(maillesMinimum(pointParId("chevron-dentele")), 9);
  assert.equal(largeurMotif(pointParId("nid-abeille")), 2);
  assert.equal(maillesMinimum(pointParId("torsade-gauche")), 12);
  assert.equal(maillesMinimum(pointParId("mini-noisette")), 6);
});

// ---------- Tous les points du catalogue ----------

for (const point of POINTS) {
  test(`${point.nom} : se tricote juste à plat et en rond`, () => {
    const premier = point.rangs.find((r) => r.cote === "E");
    const n = largeurMotif(point);
    // Chaque rang garde le nombre de mailles, et son motif tient un nombre entier de fois dans une répétition
    // (sauf pour les points qui changent de nombre de mailles en cours de motif : la simulation fait foi).
    const variable = comptesVariables(point);
    for (const r of variable ? [] : [...(point.miseEnPlace || []), ...point.rangs]) {
      assert.equal(n % consomme(r.motif), 0, "largeur du motif");
      assert.equal(produit(r.motif), consomme(r.motif), "le motif garde le nombre de mailles");
    }
    const min = maillesMinimum(point);
    assert.ok(min, "un nombre de mailles convient à plat");
    const nbRangs = (point.miseEnPlace?.length || 0) + point.rangs.length * 2;
    for (const k of [0, 1, 4]) {
      const mailles = min + k * n;
      const plat = simuler(point, { mailles, rangs: nbRangs });
      assert.equal(plat.ok, true, `à plat sur ${mailles} mailles : ${JSON.stringify(plat.erreurs)}`);
      assert.equal(plat.grille.length, nbRangs);
    }
    if (point.rond?.mode === "impossible") {
      assert.ok(point.rond.raison, "raison donnée quand le point ne se tricote pas en rond");
      return;
    }
    const rond = convertirEnRond(point);
    assert.equal(rond.ok, true, rond.erreur);
    const kRond = 5;
    const sim = simuler(point, { mailles: kRond * n, rangs: nbRangs, mode: "rond" });
    assert.equal(sim.ok, true, `en rond : ${JSON.stringify(sim.erreurs)}`);
    if (variable) return;

    // Le dessin en rond doit être le même que le dessin à plat, au milieu du tricot (loin des bords),
    // à un décalage près (le même pour tous les rangs).
    const plat = simuler(point, { mailles: (min % n) + (kRond + 1) * n, rangs: nbRangs });
    assert.equal(plat.ok, true);
    const correspond = (dec) => {
      for (let r = 0; r < nbRangs; r++) {
        for (let c = n; c < (kRond - 1) * n; c++) if (sim.grille[r][c] !== plat.grille[r][c + dec]) return false;
      }
      return true;
    };
    let trouve = false;
    for (let dec = 0; dec < 2 * n + (min % n) && !trouve; dec++) trouve = correspond(dec);
    assert.ok(trouve, "le dessin en rond correspond au dessin à plat");
  });
}
