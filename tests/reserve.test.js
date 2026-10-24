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
