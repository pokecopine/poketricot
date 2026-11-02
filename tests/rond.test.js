// Tests de E4-3 : déplacer le début du tour en rond (points dont le motif se décale d'un tour à l'autre).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { convertirEnRond, verifierRond, deduireRond, simuler, tricoterTour, mailleIssue, maillesConviennent } from "../js/moteur/simulateur.js";
import { texteDeplacement } from "../js/catalogue/texte.js";

const NEUF = ["etoile", "mures", "mini-feuilles", "bouton-de-rose", "jours-obliques", "point-resille", "petits-diamants-ajoures", "mousse-glisse", "dentelle-nouee"];

test("les 9 points ont une version en rond vérifiée maille par maille", () => {
  for (const id of NEUF) {
    const p = pointParId(id);
    const r = convertirEnRond(p);
    assert.equal(r.ok, true, `${id} : ${r.erreur}`);
    assert.ok(r.rangs.every((t) => t.cote === "E"), `${id} : tous les tours sur l'endroit`);
    assert.equal(verifierRond(p).ok, true, id);
  }
});

test("aucun point du catalogue n'est plus impossible en rond", () => {
  for (const p of POINTS) assert.equal(convertirEnRond(p).ok, true, `${p.nom} : ${convertirEnRond(p).erreur}`);
});

test("point d'étoile : le marqueur avance de 2 mailles tous les 2 tours, toujours vers la gauche", () => {
  const r = convertirEnRond(pointParId("etoile"));
  assert.equal(r.marqueur, true);
  assert.deepEqual(r.rangs.map((t) => t.decale || 0), [0, 2, 0, 2]);
  assert.deepEqual(r.rangs[1].motif, ["end", "etoileEnd"]);
});

test("déplacements : jamais négatifs, toujours plus petits que le motif du tour", () => {
  for (const id of NEUF) {
    for (const t of convertirEnRond(pointParId(id)).rangs) {
      const d = t.decale || 0;
      assert.ok(d >= 0 && d < t.motif.length + 3, `${id} : ${d}`);
    }
  }
});

test("points sans déplacement : la découpe simple suffit (pas de marqueur)", () => {
  for (const id of ["jersey", "riz", "cotes-1-1", "petits-diamants-ajoures", "mousse-glisse"]) {
    assert.equal(convertirEnRond(pointParId(id)).marqueur, false, id);
  }
  for (const id of ["etoile", "mures", "jours-obliques", "dentelle-nouee"]) assert.equal(convertirEnRond(pointParId(id)).marqueur, true, id);
});

test("deduireRond retrouve aussi une version pour un point simple", () => {
  const r = deduireRond(pointParId("riz"));
  assert.equal(r.ok, true);
  assert.equal(r.marqueur, false);
});

test("mailleIssue : un jeté passe avant la maille qui suit", () => {
  assert.equal(mailleIssue(["jete", "2ens", "end"], 0), 1);
  assert.equal(mailleIssue(["jete", "2ens", "end"], 1), 1);
  assert.equal(mailleIssue(["jete", "2ens", "end"], 2), 2);
});

test("tricoterTour : un tour qui commence plus loin est rangé depuis le début de départ", () => {
  const tour = { cote: "E", debut: [], motif: ["end", "env"], fin: [] };
  const a = tricoterTour(tour, 6, 0);
  const b = tricoterTour(tour, 6, 1);
  assert.deepEqual(a.aspects, ["V", "grain", "V", "grain", "V", "grain"]);
  assert.deepEqual(b.aspects, ["grain", "V", "grain", "V", "grain", "V"]);
  assert.equal(b.debut, 1);
});

test("simuler en rond : le tout premier tour ignore son déplacement", () => {
  const p = { ...pointParId("jersey"), rond: { mode: "manuel", rangs: [{ cote: "E", debut: [], motif: ["end", "env"], fin: [], decale: 1 }] } };
  const s = simuler(p, { mailles: 4, rangs: 3, mode: "rond" });
  assert.equal(s.ok, true);
  assert.deepEqual(s.grille[0], ["V", "grain", "V", "grain"]);
  assert.deepEqual(s.grille[1], ["grain", "V", "grain", "V"]);
  assert.equal(s.decalage, 2);
});

test("le nombre de mailles en rond ne dépend pas des déplacements", () => {
  const p = pointParId("etoile");
  assert.equal(maillesConviennent(p, 40, "rond"), true);
  assert.equal(maillesConviennent(p, 42, "rond"), false);
});

test("consigne du marqueur", () => {
  assert.equal(texteDeplacement(1), "Avant ce tour, déplace le marqueur d'une maille vers la gauche : glisse 1 maille sans la tricoter, puis replace le marqueur.");
  assert.equal(texteDeplacement(2), "Avant ce tour, déplace le marqueur de 2 mailles vers la gauche : glisse 2 mailles sans les tricoter, puis replace le marqueur.");
  assert.match(texteDeplacement(3, "droite"), /vers la droite : remets 3 mailles de l'aiguille droite sur l'aiguille gauche/);
});

test("les avis « snood » et « bonnet » ne parlent plus d'une version en rond manquante", () => {
  for (const id of NEUF) {
    const p = pointParId(id);
    for (const piece of ["snood", "bonnet"]) {
      assert.doesNotMatch(p.ouvrages[piece]?.raison || "", /en rond/, `${id} ${piece}`);
    }
  }
});
