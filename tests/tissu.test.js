// Tests de la simulation de tissu (écharpe drapée sur une barre).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Tissu } from "../js/rendu/tissu.js";

const longueurDuLien = (t, c) => {
  const a = t.liensA[c] * 3;
  const b = t.liensB[c] * 3;
  return Math.hypot(t.pos[a] - t.pos[b], t.pos[a + 1] - t.pos[b + 1], t.pos[a + 2] - t.pos[b + 2]);
};

test("tissu : grille, liens au repos, interpolation", () => {
  const t = new Tissu({ largeur: 20, longueur: 180, pas: 2 });
  assert.equal(t.nx, 11);
  assert.equal(t.ny, 91);
  t.poserSurLaBarre({ fronce: 1 });
  // Le haut de la barre porte le milieu de l'écharpe (décalé de 6 %).
  const k = Math.round((0.56 * 180) / t.dy);
  assert.ok(t.pos[t.indice(5, k) * 3 + 1] > 2);
  const sortie = [0, 0, 0];
  t.positionA(10, 0, sortie);
  assert.ok(Math.abs(sortie[0]) < 1e-4);
});

test("tissu : drapé sur la barre, il se pose sans traverser la barre ni s'étirer, et s'arrête", () => {
  const t = new Tissu({ largeur: 20, longueur: 160, pas: 2.5, sol: -200 });
  t.poserSurLaBarre();
  let e = Infinity;
  for (let s = 0; s < 600; s++) t.pas(1 / 60);
  e = t.mouvement();
  assert.ok(e < 0.01, `encore en mouvement : ${e}`);
  for (let i = 0; i < t.n; i++) {
    const d = Math.hypot(t.pos[i * 3 + 1], t.pos[i * 3 + 2]);
    assert.ok(d >= t.barre.rayon + t.epaisseur - 0.05, `point ${i} dans la barre`);
    assert.ok(Number.isFinite(t.pos[i * 3]));
  }
  let pire = 0;
  // Hors de la barre (où le poids des deux pans tire sur le tissu), il ne s'étire presque pas.
  const surLaBarre = (i) => Math.hypot(t.pos[i * 3 + 1], t.pos[i * 3 + 2]) < t.barre.rayon + t.epaisseur + 0.3;
  for (let c = 0; c < t.liensA.length; c++) {
    if (t.liensR[c] !== 1 || surLaBarre(t.liensA[c]) || surLaBarre(t.liensB[c])) continue;
    pire = Math.max(pire, longueurDuLien(t, c) / t.liensL[c] - 1);
  }
  assert.ok(pire < 0.08, `étirement ${pire}`);
  // Les deux pans pendent : le bas de l'écharpe est bien en dessous de la barre, devant (z > 0).
  const bas = t.indice(5, 0) * 3;
  assert.ok(t.pos[bas + 1] < -60 && t.pos[bas + 2] > 0);
  const haut = t.indice(5, t.ny - 1) * 3;
  assert.ok(t.pos[haut + 1] < -40 && t.pos[haut + 2] < 0);
});

test("tissu : un point tenu suit le doigt, puis se relâche", () => {
  const t = new Tissu({ largeur: 20, longueur: 120, pas: 3 });
  t.poserSurLaBarre();
  for (let s = 0; s < 200; s++) t.pas(1 / 60);
  const i = t.plusProche([0, -50, 3]);
  t.tenir(i, [15, -30, 25]);
  for (let s = 0; s < 30; s++) t.pas(1 / 60);
  assert.deepEqual([...t.pos.slice(i * 3, i * 3 + 3)].map(Math.round), [15, -30, 25]);
  t.lacher();
  t.pas(1 / 60);
  assert.equal(t.tenu[i], 0);
});

test("tissu : posé en vague sur la table, il se pose au sol avec des plis, sans passer dessous", () => {
  const t = new Tissu({ largeur: 20, longueur: 160, pas: 2.5 });
  t.poserSurLaTable();
  for (let s = 0; s < 500; s++) t.pas(1 / 60);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < t.n; i++) {
    min = Math.min(min, t.pos[i * 3 + 1]);
    max = Math.max(max, t.pos[i * 3 + 1]);
  }
  assert.ok(min >= t.epaisseur - 0.01, `sous la table : ${min}`);
  assert.ok(max > t.epaisseur + 0.5 && max < 15, `plis : ${max}`);
});
