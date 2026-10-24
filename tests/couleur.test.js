import { test } from "node:test";
import assert from "node:assert/strict";
import { hsvVersHex, hexVersHsv, pointVersTeinte, teinteVersPoint, nomCouleur } from "../js/donnees/couleur.js";

test("conversion HSV ↔ hexadécimal", () => {
  assert.equal(hsvVersHex(0, 1, 1), "#FF0000");
  assert.equal(hsvVersHex(60, 1, 1), "#FFFF00");
  assert.equal(hsvVersHex(240, 1, 1), "#0000FF");
  assert.equal(hsvVersHex(0, 0, 1), "#FFFFFF");
  assert.equal(hsvVersHex(123, 0.4, 0), "#000000");
  for (const hex of ["#D07E5B", "#9DB7A2", "#6A7BAA", "#2E2A28", "#F1E8D6"]) {
    const { h, s, v } = hexVersHsv(hex);
    assert.equal(hsvVersHex(h, s, v), hex);
  }
  assert.equal(hexVersHsv("pas une couleur"), null);
});

test("la roue a le rouge en haut et tourne dans le sens des aiguilles d'une montre", () => {
  const haut = pointVersTeinte(0, -100, 100);
  assert.equal(Math.round(haut.h), 0);
  assert.equal(haut.s, 1);
  assert.equal(Math.round(pointVersTeinte(100, 0, 100).h), 90); // à droite : jaune-vert
  assert.equal(Math.round(pointVersTeinte(0, 100, 100).h), 180); // en bas : cyan
  assert.equal(Math.round(pointVersTeinte(-100, 0, 100).h), 270); // à gauche : bleu-violet
  assert.equal(pointVersTeinte(0, 0, 100).s, 0); // centre : pâle
  assert.equal(pointVersTeinte(300, 0, 100).s, 1); // hors de la roue : bornée
});

test("position du repère : inverse de la lecture", () => {
  for (const [h, s] of [[0, 1], [75, 0.5], [200, 0.8], [330, 0.2]]) {
    const p = teinteVersPoint(h, s, 100);
    const r = pointVersTeinte(p.x, p.y, 100);
    assert.ok(Math.abs(r.h - h) < 0.001 && Math.abs(r.s - s) < 0.001, `${h} ${s}`);
  }
});

test("nom approximatif des couleurs", () => {
  assert.equal(nomCouleur("#FF0000"), "rouge");
  assert.equal(nomCouleur("#000000"), "noir");
  assert.equal(nomCouleur("#9A9590"), "gris");
  assert.equal(nomCouleur("#F1E8D6"), "écru");
  assert.equal(nomCouleur("#2D3A8C"), "bleu foncé");
  assert.equal(nomCouleur("#7A5A43"), "brun");
});
