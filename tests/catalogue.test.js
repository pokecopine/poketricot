import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, FAMILLES, PIECES, pointParId, rechercherPoints, avisPour } from "../js/catalogue/points.js";
import { texteMultiple, etiquettesProprietes, texteConsommation } from "../js/catalogue/fiche.js";
import { texteRang } from "../js/catalogue/texte.js";
import { TECHNIQUES, techniquesDuPoint } from "../js/catalogue/techniques.js";
import { tuileSVG, grilleMotif } from "../js/rendu/texture.js";

test("chaque fiche est complète", () => {
  const ids = new Set();
  for (const p of POINTS) {
    assert.ok(!ids.has(p.id), `identifiant en double : ${p.id}`);
    ids.add(p.id);
    assert.ok(FAMILLES.some((f) => f.id === p.famille), `${p.id} : famille`);
    assert.ok(p.resume && p.source.startsWith("https://www.lestriconautes.com/"), `${p.id} : résumé et source`);
    for (const piece of PIECES) {
      const a = p.ouvrages[piece.id];
      assert.ok(a && ["conseille", "possible", "deconseille"].includes(a.avis), `${p.id} : avis ${piece.id}`);
      if (a.avis !== "conseille") assert.ok(a.raison, `${p.id} : raison pour ${piece.id}`);
    }
    for (const t of techniquesDuPoint(p)) assert.ok(TECHNIQUES[t], `${p.id} : explication manquante pour ${t}`);
    assert.ok(p.densite.mailles > 0 && p.densite.rangs > 0 && p.consommation > 0);
    assert.ok(etiquettesProprietes(p).length >= 3);
  }
});

test("multiples en toutes lettres, comme dans l'inventaire", () => {
  assert.equal(texteMultiple(pointParId("riz")), "nombre impair de mailles");
  assert.equal(texteMultiple(pointParId("ble")), "nombre pair de mailles");
  assert.equal(texteMultiple(pointParId("jersey")), "n'importe quel nombre de mailles");
  assert.equal(texteMultiple(pointParId("torsade-gauche")), "multiple de 9 + 3 mailles");
  assert.equal(texteMultiple(pointParId("chevron-dentele")), "multiple de 8 + 1 mailles");
  assert.equal(texteMultiple(pointParId("mini-noisette")), "multiple de 4 + 2 mailles");
  assert.equal(texteMultiple(pointParId("sillon")), "multiple de 3 + 1 mailles");
  assert.equal(texteMultiple(pointParId("cotes-2-2"), "rond"), "multiple de 4 mailles");
});

test("recherche par nom ou synonyme, sans accents", () => {
  assert.deepEqual(rechercherPoints("farrow").map((p) => p.id), ["sillon"]);
  assert.deepEqual(rechercherPoints("rayon de miel").map((p) => p.id), ["nid-abeille"]);
  assert.ok(rechercherPoints("cotes").length >= 3);
  assert.equal(rechercherPoints("").length, POINTS.length);
});

test("avis pour une pièce et une zone", () => {
  assert.equal(avisPour(pointParId("jersey"), "echarpe").avis, "possible");
  assert.equal(avisPour(pointParId("jersey"), "bonnet", "bordure").avis, "deconseille");
  assert.equal(avisPour(pointParId("cotes-1-1"), "bonnet", "bordure").avis, "conseille");
  assert.equal(avisPour(pointParId("bourse"), "couverture").avis, "deconseille");
});

test("consignes écrites", () => {
  assert.equal(texteRang(pointParId("jersey").rangs[1]), "Tout le rang en mailles envers.");
  assert.equal(
    texteRang(pointParId("riz").rangs[0]),
    "*1 maille endroit, 1 maille envers*, à répéter jusqu'à la dernière maille, puis 1 maille endroit."
  );
  assert.equal(texteRang(pointParId("riz").rangs[0], { abreviations: true }), "*1 m. end., 1 m. env.*, à répéter jusqu'à la dernière maille, puis 1 m. end.");
  assert.match(texteConsommation(pointParId("fausses-cotes-anglaises")), /Gourmand/);
});

test("chaque point se dessine, à l'endroit et à l'envers", () => {
  for (const p of POINTS) {
    for (const face of ["endroit", "envers"]) {
      const t = tuileSVG(p, "#D07E5B", { face });
      assert.ok(t && t.svg.startsWith("<svg") && t.largeur > 0 && t.hauteur > 0, `${p.id} ${face}`);
      assert.doesNotMatch(t.svg, /NaN|undefined/, `${p.id} ${face}`);
    }
  }
  // Jersey : des V à l'endroit, des grains à l'envers.
  assert.ok(grilleMotif(pointParId("jersey")).flat().every((a) => a === "V"));
  assert.ok(grilleMotif(pointParId("jersey"), { face: "envers" }).flat().every((a) => a === "grain"));
  // Torsade : le croisement est bien présent.
  assert.ok(grilleMotif(pointParId("torsade-gauche")).flat().includes("brinG+"));
});
