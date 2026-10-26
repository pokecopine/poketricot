// Tests de la simulation de tissu (écharpe sur une barre, autour du cou d'un buste).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Tissu, BUSTE } from "../js/rendu/tissu.js";

const longueurDuLien = (t, c) => {
  const a = t.liensA[c] * 3;
  const b = t.liensB[c] * 3;
  return Math.hypot(t.pos[a] - t.pos[b], t.pos[a + 1] - t.pos[b + 1], t.pos[a + 2] - t.pos[b + 2]);
};

/** Plus petite distance entre deux points du tissu qui ne sont pas voisins dans la grille. */
function plusPetitEcart(t) {
  let min = Infinity;
  for (let i = 0; i < t.n; i++) {
    const [ji, ki] = t.coord(i);
    for (let m = i + 1; m < t.n; m++) {
      const [jm, km] = t.coord(m);
      if (Math.abs(jm - ji) <= 2 && Math.abs(km - ki) <= 2) continue;
      const d = Math.hypot(t.pos[i * 3] - t.pos[m * 3], t.pos[i * 3 + 1] - t.pos[m * 3 + 1], t.pos[i * 3 + 2] - t.pos[m * 3 + 2]);
      if (d < min) min = d;
    }
  }
  return min;
}

test("tissu : grille, liens au repos, interpolation", () => {
  const t = new Tissu({ largeur: 20, longueur: 180, pas: 2 });
  assert.equal(t.nx, 11);
  assert.equal(t.ny, 91);
  t.poserSurLaBarre({ fronce: 1 });
  const k = Math.round((0.56 * 180) / t.dy);
  assert.ok(t.pos[t.indice(5, k) * 3 + 1] > 2);
  const sortie = [0, 0, 0];
  t.positionA(10, 0, sortie);
  assert.ok(Math.abs(sortie[0]) < 0.1);
});

test("tissu : drapé sur la barre, il se pose sans traverser la barre ni s'étirer, et s'arrête", () => {
  const t = new Tissu({ largeur: 20, longueur: 160, pas: 2.5 });
  t.poserSurLaBarre();
  for (let s = 0; s < 600; s++) t.pas(1 / 60);
  assert.ok(t.mouvement() < 0.01, `encore en mouvement : ${t.mouvement()}`);
  const R = t.obstacles[0].rayon + t.epaisseur;
  for (let i = 0; i < t.n; i++) {
    assert.ok(Math.hypot(t.pos[i * 3 + 1], t.pos[i * 3 + 2]) >= R - 0.05, `point ${i} dans la barre`);
    assert.ok(Number.isFinite(t.pos[i * 3]));
  }
  // Hors de la barre (où le poids des deux pans tire sur le tissu), il ne s'étire presque pas.
  const surLaBarre = (i) => Math.hypot(t.pos[i * 3 + 1], t.pos[i * 3 + 2]) < R + 0.3;
  let pire = 0;
  for (let c = 0; c < t.liensA.length; c++) {
    if (t.liensR[c] !== 1 || surLaBarre(t.liensA[c]) || surLaBarre(t.liensB[c])) continue;
    pire = Math.max(pire, longueurDuLien(t, c) / t.liensL[c] - 1);
  }
  assert.ok(pire < 0.08, `étirement ${pire}`);
  const bas = t.indice(5, 0) * 3;
  assert.ok(t.pos[bas + 1] < -60 && t.pos[bas + 2] > 0);
  const haut = t.indice(5, t.ny - 1) * 3;
  assert.ok(t.pos[haut + 1] < -40 && t.pos[haut + 2] < 0);
});

test("tissu : autour du cou, il ne traverse ni le buste ni lui-même, et les pans tombent devant", () => {
  const t = new Tissu({ largeur: 20, longueur: 170, pas: 2 });
  t.poserAutourDuCou();
  for (let s = 0; s < 500; s++) t.pas(1 / 60);
  for (let i = 0; i < t.n; i++) {
    const o = i * 3;
    const [x, y, z] = [t.pos[o], t.pos[o + 1], t.pos[o + 2]];
    for (const e of [BUSTE.epaules, BUSTE.torse]) {
      const l = Math.hypot((x - e.c[0]) / e.r[0], (y - e.c[1]) / e.r[1], (z - e.c[2]) / e.r[2]);
      assert.ok(l >= 0.98, `point ${i} dans le buste (${l})`);
    }
    const c = BUSTE.cou;
    if (y > c.y0 + 0.5 && y < c.y1 - 0.5) assert.ok(Math.hypot(x - c.cx, z - c.cz) >= c.rayon - 0.1, `point ${i} dans le cou`);
  }
  assert.ok(plusPetitEcart(t) > t.distanceCouches * 0.7, `couches trop proches : ${plusPetitEcart(t)}`);
  // Les deux bouts pendent devant le buste.
  for (const k of [0, t.ny - 1]) {
    const o = t.indice(5, k) * 3;
    assert.ok(t.pos[o + 1] < -25 && t.pos[o + 2] > 5, `bout ${k} : ${[...t.pos.slice(o, o + 3)].map(Math.round)}`);
  }
});

test("tissu : un pan tiré sur l'autre ne le traverse pas", () => {
  const t = new Tissu({ largeur: 20, longueur: 140, pas: 2.5 });
  t.poserSurLaBarre();
  for (let s = 0; s < 200; s++) t.pas(1 / 60);
  // On tire le bas du pan de derrière vers l'avant, à travers le pan de devant.
  const i = t.indice(4, t.ny - 1);
  for (let s = 0; s < 120; s++) {
    t.tenir(i, [0, -30, 4 + s * 0.12]);
    t.pas(1 / 60);
  }
  t.lacher();
  for (let s = 0; s < 60; s++) t.pas(1 / 60);
  assert.ok(plusPetitEcart(t) > t.distanceCouches * 0.6, `les pans se traversent : ${plusPetitEcart(t)}`);
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
