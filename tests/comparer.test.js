// Écran « Comparer » (0.22.0) : liste des points mis de côté, lignes de la comparaison, listes gardées pendant la visite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import {
  MAX_COMPARER, basculerMisDeCote, lignesDeComparaison, texteLaineUtilisee, listesAGarder,
} from "../js/catalogue/comparer.js";

const ligne = (lignes, id) => lignes.find((l) => l.id === id);

test("on met de côté 3 points au plus, dans l'ordre", () => {
  assert.equal(MAX_COMPARER, 3);
  let r = basculerMisDeCote([], "riz");
  assert.deepEqual(r, { liste: ["riz"], ajoute: true, plein: false });
  r = basculerMisDeCote(r.liste, "ble");
  r = basculerMisDeCote(r.liste, "cotes-1-1");
  assert.deepEqual(r.liste, ["riz", "ble", "cotes-1-1"]);
  const plein = basculerMisDeCote(r.liste, "jersey");
  assert.equal(plein.plein, true);
  assert.equal(plein.ajoute, false);
  assert.deepEqual(plein.liste, ["riz", "ble", "cotes-1-1"], "un 4e point n'est pas ajouté");
});

test("toucher à nouveau un point le retire, même quand la liste est pleine", () => {
  const r = basculerMisDeCote(["riz", "ble", "cotes-1-1"], "ble");
  assert.deepEqual(r, { liste: ["riz", "cotes-1-1"], ajoute: false, plein: false });
  assert.deepEqual(basculerMisDeCote(["riz"], "riz").liste, []);
});

test("la liste de départ n'est jamais modifiée", () => {
  const depart = ["riz"];
  basculerMisDeCote(depart, "ble");
  basculerMisDeCote(depart, "riz");
  assert.deepEqual(depart, ["riz"]);
});

test("laine utilisée : comme le jersey sous 5 % d'écart, sinon en pour cent", () => {
  assert.equal(texteLaineUtilisee({ consommation: 1 }), "Comme le jersey");
  assert.equal(texteLaineUtilisee({ consommation: 1.04 }), "Comme le jersey");
  assert.equal(texteLaineUtilisee({ consommation: 1.15 }), "+ 15 %");
  assert.equal(texteLaineUtilisee({ consommation: 0.9 }), "− 10 %");
});

test("les lignes du catalogue, dans l'ordre, sans « Pour ce bloc » ni « Avec ta laine »", () => {
  const points = ["riz", "ble"].map(pointParId);
  const lignes = lignesDeComparaison(points);
  assert.deepEqual(lignes.map((l) => l.id), ["reversible", "bords", "elasticite", "chaleur", "laine", "niveau", "mailles", "ouvrages"]);
  for (const l of lignes) {
    assert.equal(l.valeurs.length, 2, l.id);
    assert.ok(l.libelle && l.valeurs.every((v) => typeof v.texte === "string" && v.texte.length > 0), l.id);
  }
});

test("une ligne est différente dès que deux points n'ont pas le même texte", () => {
  const riz = pointParId("riz");
  const jersey = pointParId("jersey");
  const lignes = lignesDeComparaison([riz, jersey]);
  assert.equal(ligne(lignes, "reversible").differente, true);
  assert.deepEqual(ligne(lignes, "reversible").valeurs.map((v) => v.texte), ["Oui", "Non, envers différent"]);
  assert.deepEqual(ligne(lignes, "bords").valeurs.map((v) => v.texte), ["Ne roule pas", "Roule"]);
  // Deux fois le même point : aucune ligne différente.
  assert.ok(lignesDeComparaison([riz, riz]).every((l) => !l.differente));
});

test("le nombre de mailles suit le mode (à plat ou en rond)", () => {
  const riz = pointParId("riz");
  const plat = ligne(lignesDeComparaison([riz, riz], { mode: "plat" }), "mailles").valeurs[0].texte;
  const rond = ligne(lignesDeComparaison([riz, riz], { mode: "rond" }), "mailles").valeurs[0].texte;
  assert.match(plat, /^[A-ZÉ]/, "commence par une majuscule");
  assert.equal(plat, "Nombre impair de mailles");
  assert.equal(rond, "Nombre pair de mailles");
});

test("pendant un projet, « Pour ce bloc » vient en tête, avec la raison quand le point n'est pas conseillé", () => {
  const points = ["cotes-1-1", "jersey"].map(pointParId);
  const avisBloc = (p) => (p.id === "jersey" ? { avis: "refuse", raison: "l'envers se verrait une fois replié" } : { avis: "conseille" });
  const lignes = lignesDeComparaison(points, { avisBloc });
  assert.equal(lignes[0].id, "bloc");
  assert.equal(lignes[0].libelle, "Pour ce bloc");
  assert.deepEqual(lignes[0].valeurs[0], { texte: "Conseillé", detail: null, ton: "conseille" });
  assert.deepEqual(lignes[0].valeurs[1], { texte: "Ne convient pas ici", detail: "l'envers se verrait une fois replié", ton: "refuse" });
  assert.equal(lignes[0].differente, true);
});

test("« Avec ta laine » donne la raison, la mention du motif, ou « Rien de particulier »", () => {
  const points = ["riz", "ble", "jersey"].map(pointParId);
  const avisLaine = (p) => ({
    riz: { avis: "conseille", raison: "Beau en grosse laine : le relief ressort.", motif: "Le motif tient 4 fois sur le tour." },
    ble: { avis: null, raison: null, motif: "Le motif tient 3 fois sur le tour." },
    jersey: null,
  })[p.id];
  const l = ligne(lignesDeComparaison(points, { avisLaine }), "avecLaine");
  assert.equal(l.libelle, "Avec ta laine");
  assert.deepEqual(l.valeurs[0], { texte: "Beau en grosse laine : le relief ressort.", detail: "Le motif tient 4 fois sur le tour.", ton: "conseille" });
  assert.deepEqual(l.valeurs[1], { texte: "Le motif tient 3 fois sur le tour.", detail: null, ton: null });
  assert.deepEqual(l.valeurs[2], { texte: "Rien de particulier" });
  assert.equal(lignesDeComparaison(points, { avisLaine }).at(-1).id, "avecLaine", "en dernier");
});

test("tous les points du catalogue donnent des lignes complètes", () => {
  for (let i = 0; i < POINTS.length; i += 3) {
    const trio = POINTS.slice(i, i + 3);
    for (const l of lignesDeComparaison(trio, { mode: "rond" })) {
      assert.ok(l.valeurs.every((v) => v.texte && v.texte !== "—"), `${l.id} : ${trio.map((p) => p.id)}`);
    }
  }
});

test("liste du catalogue : gardée dans le catalogue et ses fiches, vidée ailleurs", () => {
  assert.equal(listesAGarder("/points").catalogue, true);
  assert.equal(listesAGarder("/points/riz").catalogue, true);
  assert.equal(listesAGarder("/").catalogue, false);
  assert.equal(listesAGarder("/reserve").catalogue, false);
});

test("liste du choix d'un point : gardée sur l'écran de choix et ses fiches, vidée au builder", () => {
  assert.equal(listesAGarder("/projet/abc/point/corps").choix, true);
  assert.equal(listesAGarder("/projet/abc/point/corps?colonne=c2").choix, true);
  assert.equal(listesAGarder("/points/riz").choix, true);
  assert.equal(listesAGarder("/projet/abc/builder").choix, false);
  assert.equal(listesAGarder("/projet/abc/materiel").choix, false);
  assert.equal(listesAGarder("/points").choix, false);
  assert.equal(listesAGarder("/").choix, false);
});
