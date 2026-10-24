import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lireNombre, formaterNombre, metrageLaine, texteMetrage, detailLaine, verifierLaine, verifierAiguilles,
  titreAiguilles, trierLaines,
} from "../js/donnees/reserve.js";

test("les nombres se saisissent à la française", () => {
  assert.equal(lireNombre("2,5"), 2.5);
  assert.equal(lireNombre(" 1 000 "), 1000);
  assert.equal(lireNombre(""), null);
  assert.equal(lireNombre("abc"), null);
  assert.equal(lireNombre(4.5), 4.5);
  assert.equal(formaterNombre(4.5), "4,5");
  assert.equal(formaterNombre(4, 2), "4");
  assert.equal(formaterNombre(3.25, 2), "3,25");
});

test("métrage par étiquette : mètres par pelote × pelotes", () => {
  const l = { quantite: { mode: "etiquette", metresParPelote: "90", pelotes: "5" } };
  assert.deepEqual(metrageLaine(l), { metres: 450, estime: false });
  assert.equal(texteMetrage(l), "450 m");
  const entamee = { quantite: { mode: "etiquette", metresParPelote: "100", pelotes: "2,5" } };
  assert.equal(metrageLaine(entamee).metres, 250);
});

test("métrage par pesée : estimé à partir d'une référence", () => {
  const l = { quantite: { mode: "pesee", grammes: "85", metresReference: "100", grammesReference: "50" } };
  assert.deepEqual(metrageLaine(l), { metres: 170, estime: true });
  assert.equal(texteMetrage(l), "≈ 170 m");
});

test("métrage inconnu quand il manque une information", () => {
  assert.equal(metrageLaine({ quantite: { mode: "etiquette", metresParPelote: "90" } }), null);
  assert.equal(metrageLaine({ quantite: { mode: "pesee", grammes: "85", metresReference: "100", grammesReference: "0" } }), null);
  assert.equal(texteMetrage({}), "—");
});

test("détail d'une laine comme dans la maquette", () => {
  const l = { epaisseur: "aran", matiere: "Mérinos", quantite: { mode: "etiquette", pelotes: "4" } };
  assert.equal(detailLaine(l), "Aran · mérinos · 4 pelotes");
  const p = { epaisseur: "dk", matiere: "Coton", quantite: { mode: "pesee", grammes: "85" } };
  assert.equal(detailLaine(p), "DK · coton · pesé 85 g");
});

test("vérification d'une laine", () => {
  const ok = {
    nom: "Mérinos", epaisseur: "aran", couleur: "#D07E5B",
    quantite: { mode: "etiquette", metresParPelote: "100", pelotes: "4" },
  };
  assert.deepEqual(verifierLaine(ok), {});
  const e = verifierLaine({ nom: " ", couleur: "rouge", quantite: { mode: "pesee" } });
  assert.ok(e.nom && e.epaisseur && e.couleur && e.grammes && e.metresReference && e.grammesReference);
  assert.ok(verifierLaine({ ...ok, echantillonEtiquette: { mailles: "abc" } }).echantillonMailles);
  assert.deepEqual(verifierLaine({ ...ok, echantillonEtiquette: { mailles: "" } }), {});
});

test("vérification et titre des aiguilles", () => {
  assert.deepEqual(verifierAiguilles({ tailleMm: "4,5", cableCm: "80" }), {});
  assert.ok(verifierAiguilles({ tailleMm: "45", cableCm: "80" }).tailleMm);
  assert.ok(verifierAiguilles({ tailleMm: "4", cableCm: "" }).cableCm);
  assert.equal(titreAiguilles({ tailleMm: 4.5, cableCm: 80 }), "4,5 mm · câble 80 cm");
});

test("les laines archivées passent en dernier", () => {
  const triees = trierLaines([
    { nom: "Alpaga", archivee: true },
    { nom: "Mérinos" },
    { nom: "Coton" },
  ]);
  assert.deepEqual(triees.map((l) => l.nom), ["Coton", "Mérinos", "Alpaga"]);
});

import { metresPour100g, epaisseurProbable, texteFourchette, EPAISSEURS } from "../js/donnees/reserve.js";

test("mètres pour 100 g depuis l'étiquette ou la référence de pesée", () => {
  assert.equal(metresPour100g({ quantite: { mode: "etiquette", metresParPelote: "100", grammesParPelote: "50" } }), 200);
  assert.equal(metresPour100g({ quantite: { mode: "pesee", metresReference: "85", grammesReference: "50" } }), 170);
  assert.equal(metresPour100g({ quantite: { mode: "etiquette", metresParPelote: "100" } }), null);
});

test("l'épaisseur est devinée depuis le métrage aux 100 g", () => {
  assert.equal(epaisseurProbable(800).id, "lace");
  assert.equal(epaisseurProbable(420).id, "fingering");
  assert.equal(epaisseurProbable(300).id, "sport");
  assert.equal(epaisseurProbable(200).id, "dk");
  assert.equal(epaisseurProbable(180).id, "worsted");
  assert.equal(epaisseurProbable(140).id, "aran");
  assert.equal(epaisseurProbable(100).id, "bulky");
  assert.equal(epaisseurProbable(50).id, "super-bulky");
  assert.equal(epaisseurProbable(null), null);
});

test("les fourchettes se suivent sans trou ni chevauchement", () => {
  const triees = [...EPAISSEURS].sort((a, b) => a.min - b.min);
  assert.equal(triees[0].min, 0);
  for (let i = 1; i < triees.length; i++) assert.equal(triees[i].min, triees[i - 1].max);
  assert.equal(triees.at(-1).max, null);
  assert.equal(texteFourchette(EPAISSEURS.find((e) => e.id === "dk")), "200 à 260 m pour 100 g");
  assert.equal(texteFourchette(EPAISSEURS[0]), "plus de 600 m pour 100 g");
});
