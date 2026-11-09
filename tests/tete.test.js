// Tests de la tête de mannequin et du bonnet rigide (E4-17).
import { test } from "node:test";
import assert from "node:assert/strict";
import { profilDeTete, surArc, nappeDuBonnet, tranchesDuBonnet, tourEllipse, APLATISSEMENT, RAPPORT_ARC, ECART_BONNET } from "../js/rendu/tete.js";

test("la tête a le tour de tête demandé", () => {
  for (const tete of [51, 56, 60]) {
    const p = profilDeTete(tete);
    const rMax = Math.max(...p.points.map((x) => x.r));
    const tour = tourEllipse(rMax * APLATISSEMENT.x, rMax * APLATISSEMENT.z);
    assert.ok(Math.abs(tour - tete) < 0.5, `${tete} → ${tour}`);
  }
});

test("le profil part du sommet, l'arc croît, les normales sortent", () => {
  const p = profilDeTete(56);
  assert.equal(p.points[0].r, 0);
  assert.ok(p.points[0].y > 20);
  for (let i = 1; i < p.points.length; i++) assert.ok(p.points[i].s >= p.points[i - 1].s);
  const cote = surArc(p, p.longueur * 0.4);
  assert.ok(cote.nr > 0.5, "sur le côté, la normale part vers l'extérieur");
  assert.ok(surArc(p, 0.5).ny > 0.9, "au sommet, la normale monte");
});

test("une tranche du bonnet : sommets, coordonnées et faces cohérents", () => {
  const p = profilDeTete(56);
  const n = nappeDuBonnet({ profil: p, arc: 18.5, v0: 5, v1: 18.5, tour: 51, tuile: { l: 1.2, h: 0.8 }, tours: 32 });
  const sommets = n.positions.length / 3;
  assert.equal(n.normales.length, n.positions.length);
  assert.equal(n.uv.length / 2, sommets);
  assert.ok(n.index.every((i) => i >= 0 && i < sommets));
  // Le nombre de mailles reste le même tout autour : u va de 0 à tour / largeur du motif à chaque étage.
  assert.ok(Math.abs(n.uv[32 * 2] - 51 / 1.2) < 1e-9);
  // La surface est au-dessus de la tête (normale vers l'extérieur, comme la position).
  const i = 33 * 3 + 5 * 3;
  const dot = n.positions[i] * n.normales[i] + n.positions[i + 2] * n.normales[i + 2];
  assert.ok(dot > 0);
  // Faces tournées vers l'extérieur : le produit vectoriel d'un triangle va dans le sens de la normale.
  const [a, b, c] = n.index.slice(0, 3).map((k) => n.positions.slice(k * 3, k * 3 + 3));
  const u = b.map((x, j) => x - a[j]);
  const w = c.map((x, j) => x - a[j]);
  const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const na = n.normales.slice(n.index[0] * 3, n.index[0] * 3 + 3);
  assert.ok(cr[0] * na[0] + cr[1] * na[1] + cr[2] * na[2] > 0);
  assert.equal(ECART_BONNET, 0.5);
});

test("tranches du bonnet : le revers replie la moitié basse du bord", () => {
  const blocs = [{ id: "bas", zone: "bas", hauteurCm: 10 }, { id: "corps", zone: "corps", hauteurCm: 11 }, { id: "sommet", zone: "sommet", hauteurCm: 6 }];
  const z = tranchesDuBonnet(blocs, 10);
  assert.ok(Math.abs(z.arc - RAPPORT_ARC * 22) < 1e-9);
  assert.deepEqual(z.tranches.map((t) => t.id), ["bas", "corps", "sommet"]);
  assert.equal(z.tranches[0].v0, 0);
  assert.ok(Math.abs(z.tranches.at(-1).v1 - z.arc) < 1e-9);
  assert.ok(z.revers && Math.abs(z.revers.v1 - z.tranches[0].v1) < 1e-9);
  assert.equal(z.k(0), 5);
  assert.equal(z.kRevers(0), 5);
  const sans = tranchesDuBonnet([{ id: "bas", zone: "bas", hauteurCm: 5 }, { id: "corps", zone: "corps", hauteurCm: 17 }], 0);
  assert.equal(sans.revers, null);
  assert.equal(sans.k(0), 0);
});
