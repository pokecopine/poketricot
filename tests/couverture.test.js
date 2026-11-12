// Tests de la couverture (E4-26 à E4-31, 0.21.0) : taille, montage, bordure, plan en une pièce et en panneaux,
// métrage, patron par panneau, assemblage, suivi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS } from "../js/catalogue/points.js";
import { planCouverture, montageConseille, porteeDuCable, cableConseille, bordsDuPanneau, reperesDeLAssemblage } from "../js/moteur/plan-couverture.js";
import { planEcharpe, verifierPlan } from "../js/moteur/plan.js";
import { metrageNecessaire, pelotesEtPoids } from "../js/moteur/metrage.js";
import { genererPatron, pasDuSuivi, positionSuivi, assemblageFini, rangsDeLaCouverture } from "../js/moteur/patron.js";
import {
  nouveauProjet, calculerProjet, avecPointPrincipal, avecTailleCouverture, avecMontageCouverture, avecPanneauxCouverture,
  avecLargeurBordure, avecBordureSeparee, avecPointBordure, largeursBordure, montageCouverture, decorCouverture, presetCouverture,
  nomPropose, nomBloc, avisPourBloc, texteSuivi, TAILLES_COUVERTURE, TYPES_DISPONIBLES, largeurDuBlocCm,
} from "../js/donnees/projets.js";

const d = (mailles, rangs) => ({ mailles, rangs, statut: "mesuree" });
const blocs = (corps, bordure = "mousse") => [
  { id: "bas", zone: "bas", pointId: bordure, hauteurCm: 4 },
  { id: "corps", zone: "corps", pointId: corps },
  { id: "haut", zone: "haut", pointId: bordure, hauteurCm: 4 },
  { id: "cotes", zone: "cotes", pointId: bordure, largeurCm: 4, largeurCmG: 4 },
];
const laine = {
  id: "L1", nom: "Avoine", epaisseur: "bulky", couleur: "#CDB48A",
  quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 100, pelotes: 40 },
  echantillonEtiquette: { mailles: 10, aiguilleMm: 10 },
};
const aiguilles = (cableCm) => ({ id: "A1", tailleMm: 10, cableCm });
const ech = { id: "E1", laineId: "L1", tailleAiguille: 10, pointId: "riz", mode: "plat", maillesPour10cm: 10, rangsPour10cm: 14, date: "2026-11-09" };
const projetRiz = (taille = "lit2") => avecTailleCouverture(
  avecPointPrincipal({ ...nouveauProjet({ type: "couverture" }), id: "C1", laineId: "L1", aiguillesId: "A1" }, "riz"),
  { preset: taille },
);
const calcul = (p, cable = 80) => calculerProjet({ projet: p, laine, aiguilles: aiguilles(cable), echantillons: [ech] });

test("une nouvelle couverture : lit 1 personne, bordure de 4 cm de point mousse tout autour, à plat sans lisière", () => {
  assert.ok(TYPES_DISPONIBLES.includes("couverture"));
  const p = nouveauProjet({ type: "couverture" });
  assert.deepEqual([p.type, p.mode, p.lisieres, p.nom], ["couverture", "plat", "aucune", "Couverture"]);
  assert.deepEqual([p.taille.preset, p.taille.largeurCm, p.taille.longueurCm], ["lit1", 140, 200]);
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.pointId]), [["bas", "mousse"], ["corps", ""], ["haut", "mousse"], ["cotes", "mousse"]]);
  assert.deepEqual(largeursBordure(p), { bas: 4, haut: 4, droite: 4, gauche: 4 });
  assert.deepEqual(TAILLES_COUVERTURE.map((t) => [t.preset, t.largeurCm, t.longueurCm]), [["plaid", 110, 140], ["lit1", 140, 200], ["lit2", 200, 220]]);
  assert.equal(nomBloc(p.blocs[0], p), "Bordure tout autour");
  assert.match(nomPropose("couverture", laine, { preset: "lit2" }), /^Couverture \S/);
  assert.match(nomPropose("couverture", laine, { preset: "plaid" }), /^Plaid \S/);
});

test("taille : les cartes et les mesures libres ; le décor suit la taille", () => {
  let p = projetRiz("plaid");
  assert.deepEqual([p.taille.largeurCm, p.taille.longueurCm, decorCouverture(p.taille)], [110, 140, "canape"]);
  p = avecTailleCouverture(p, { largeurCm: 160 });
  assert.equal(p.taille.preset, null);
  assert.equal(decorCouverture(p.taille), "lit1");
  p = avecTailleCouverture(p, { largeurCm: 400 });
  assert.equal(p.taille.largeurCm, 260);
  assert.equal(decorCouverture(p.taille), "lit2");
  assert.equal(presetCouverture(200, 220), "lit2");
});

test("câble : 80 cm porte 140 cm ; au-delà, panneaux conseillés (le plus petit nombre qui tient)", () => {
  assert.equal(porteeDuCable(80), 140);
  assert.equal(cableConseille(200), 120);
  assert.equal(cableConseille(110), 80);
  assert.deepEqual(montageConseille(140, 80), { montage: "piece", panneaux: 2, porteeCm: 140, cableConseilleCm: 80, trop: false });
  assert.equal(montageConseille(200, 80).montage, "panneaux");
  assert.equal(montageConseille(200, 80).panneaux, 2);
  assert.equal(montageConseille(250, 60).panneaux, 3);
  assert.equal(montageConseille(200, null).trop, null);
  const p = projetRiz("lit2");
  assert.deepEqual([montageCouverture(p, 80).montage, montageCouverture(p, 80).panneaux], ["panneaux", 2]);
  assert.deepEqual([montageCouverture(p, 150).montage, montageCouverture(p, 150).panneaux], ["piece", 1]);
  const q = avecPanneauxCouverture(p, 4);
  assert.deepEqual([montageCouverture(q, 80).montage, montageCouverture(q, 80).panneaux], ["panneaux", 4]);
  assert.deepEqual([montageCouverture(avecMontageCouverture(q, "piece"), 80).panneaux], [1]);
});

test("bordure : un point et une largeur pour les quatre côtés, ou chaque côté à part", () => {
  let p = projetRiz();
  p = avecLargeurBordure(p, 6);
  assert.deepEqual(largeursBordure(p), { bas: 6, haut: 6, droite: 6, gauche: 6 });
  p = avecBordureSeparee(p, true);
  p = avecLargeurBordure(p, 3, "gauche");
  p = avecLargeurBordure(p, 8, "haut");
  assert.deepEqual(largeursBordure(p), { bas: 6, haut: 8, droite: 6, gauche: 3 });
  p = avecBordureSeparee(p, false);
  assert.deepEqual(largeursBordure(p), { bas: 6, haut: 6, droite: 6, gauche: 6 });
  p = avecPointBordure(p, "riz");
  assert.deepEqual(p.blocs.filter((b) => b.zone !== "corps").map((b) => b.pointId), ["riz", "riz", "riz"]);
  // Le point de la bordure est jugé en bordure et sur les côtés ; un point qui roule est peu adapté.
  const jersey = POINTS.find((x) => x.id === "jersey");
  assert.equal(avisPourBloc(jersey, "couverture", "bas").avis, "deconseille");
  assert.equal(avisPourBloc(POINTS.find((x) => x.id === "mousse"), "couverture", "cotes").avis, "conseille");
  // En panneaux, le motif tient dans la largeur d'un panneau.
  assert.equal(largeurDuBlocCm(avecPanneauxCouverture(p, 2), p.blocs.find((b) => b.zone === "corps")), 100);
});

test("bords côte par côte : une bande à droite seulement, une maille de couture à gauche", () => {
  const r = planEcharpe({
    largeurCm: 50, longueurCm: 40, blocs: blocs("riz"), densites: { riz: d(10, 14), mousse: d(10, 20) }, bordsGardentLeCorps: true,
    bords: { droite: { lisiere: "aucune", bande: true }, gauche: { lisiere: "couture", bande: false } },
  });
  assert.ok(r.ok, r.erreurs?.[0]?.message);
  const t = r.plan.montage.repartition;
  assert.deepEqual([t.bordD, t.bandeD, t.bandeG, t.bordG], [0, 4, 0, 1]);
  const z = r.plan.rangs[10].segments.map((s) => s.zone);
  assert.deepEqual(r.plan.rangs[10].cote === "E" ? z : [...z].reverse(), ["bandeD", "corps", "bordG"]);
  assert.ok(verifierPlan(r.plan).ok);
});

test("en une pièce : la bordure de côté au début et à la fin de chaque rang, sans lisière", () => {
  const r = planCouverture({ largeurCm: 140, longueurCm: 200, panneaux: 1, blocs: blocs("riz"), densites: { riz: d(10, 14), mousse: d(10, 20) } });
  assert.ok(r.ok);
  const t = r.plan.montage.repartition;
  assert.deepEqual([t.bordD, t.bandeD, t.bandeG, t.bordG], [0, 4, 4, 0]);
  assert.equal(r.plan.type, "couverture");
  assert.equal(r.plan.panneaux, null);
  assert.ok(Math.abs(r.plan.largeur.reelleCm - 140) <= 2);
});

test("en 2 et 3 panneaux : bordure dehors, maille de couture dedans, mêmes rangs partout", () => {
  for (const n of [2, 3]) {
    const r = planCouverture({ largeurCm: 200, longueurCm: 220, panneaux: n, blocs: blocs("riz"), densites: { riz: d(10, 14), mousse: d(10, 20) } });
    assert.ok(r.ok);
    assert.equal(r.plan.panneaux.length, n);
    const lignes = r.plan.panneaux.map((p) => p.rangs.length);
    assert.ok(lignes.every((x) => x === lignes[0]));
    // Panneau 1 (à gauche) : la bordure à gauche, la couture à droite ; le dernier en miroir.
    assert.deepEqual(bordsDuPanneau(1, n).gauche.bande, true);
    const p1 = r.plan.panneaux[0].montage.repartition;
    const pn = r.plan.panneaux[n - 1].montage.repartition;
    assert.deepEqual([p1.bordD, p1.bandeG], [1, 4]);
    assert.deepEqual([pn.bandeD, pn.bordG], [4, 1]);
    if (n === 3) {
      const pm = r.plan.panneaux[1].montage.repartition;
      assert.deepEqual([pm.bordD, pm.bandeD, pm.bandeG, pm.bordG], [1, 0, 0, 1]);
    }
    // Un rang endroit du panneau 1 commence par la maille de couture (on part du bord droit).
    const rangE = r.plan.panneaux[0].rangs.find((x) => x.cote === "E" && x.blocId === "corps");
    assert.equal(rangE.segments[0].couture, true);
    assert.equal(r.plan.couture.coutures, n - 1);
    for (const p of r.plan.panneaux) assert.ok(verifierPlan(p).ok);
  }
});

test("repères : un nombre pair de rangs, près de 20 cm", () => {
  assert.deepEqual(reperesDeLAssemblage(308, 220), { pas: 28, sections: 11, reperes: 10 });
  assert.equal(reperesDeLAssemblage(100, 50).pas % 2, 0);
});

test("chaque point du catalogue : une couverture valide en une pièce et en 2 panneaux", () => {
  const densites = (id) => ({ [id]: d(10, 14), mousse: d(10, 20) });
  const echecs = [];
  for (const p of POINTS) {
    for (const n of [1, 2]) {
      const r = planCouverture({ largeurCm: n === 1 ? 120 : 200, longueurCm: 100, panneaux: n, blocs: blocs(p.id), densites: densites(p.id) });
      if (!r.ok) echecs.push(`${p.id} (${n}) : ${r.erreurs[0]?.message}`);
    }
  }
  assert.deepEqual(echecs, []);
});

test("métrage : toute la couverture, fil de couture compris ; en pelotes et en kilos", () => {
  const p = projetRiz("lit2");
  const c = calcul(p, 80);
  assert.ok(c.ok, c.erreurs?.[0]?.message);
  assert.equal(c.plan.panneaux.length, 2);
  assert.ok(c.metrage.parBloc.some((b) => b.blocId === "couture"));
  assert.ok(c.metrage.parPanneau > 0 && c.metrage.parPanneau < c.metrage.metres);
  assert.deepEqual(pelotesEtPoids(2150, laine), { pelotes: 22, grammes: 2200 });
  assert.deepEqual(pelotesEtPoids(100, { quantite: { mode: "pesee" } }), { pelotes: null, grammes: null });
  assert.equal(c.cable.couverture, true);
  assert.equal(c.cable.montage, "panneaux");
  assert.equal(c.cable.tropPourCeMontage, false);
  const enUnePiece = calcul(avecMontageCouverture(p, "piece"), 80);
  assert.equal(enUnePiece.cable.tropPourCeMontage, true);
});

test("patron en panneaux : un onglet par panneau, l'assemblage, le suivi panneau par panneau", () => {
  const p = projetRiz("lit2");
  const c = calcul(p, 80);
  const patron = genererPatron({
    projet: p, plan: c.plan, laine, aiguilles: aiguilles(80), echantillon: c.echantillon, densites: c.densites,
    metrage: c.metrage, laineSuffit: c.laineSuffit, laines: [laine], parLaine: c.parLaine,
  });
  assert.equal(patron.type, "couverture");
  assert.equal(patron.panneaux.length, 2);
  assert.equal(patron.panneaux[0].nom, "Panneau de gauche");
  assert.ok(patron.panneaux[0].etapes.some((e) => e.cle === "rabattage" && /50 cm/.test(e.texte)));
  assert.ok(patron.panneaux[0].rangs.some((r) => r.techniques.length));
  assert.ok(patron.panneaux[1].rangs.every((r) => r.techniques.length === 0));
  assert.deepEqual(patron.assemblage.etapes.map((e) => e.cle), ["poser", "reperes", "coudre", "fils", "laver"]);
  assert.match(patron.assemblage.etapes[2].bordure, /bosses du point mousse/);
  assert.ok(patron.techniques.matelas && patron.techniques.matelasMousse);
  // 0.21.1 : les pelotes de chaque laine sont gardées dans le patron (100 m par pelote).
  assert.equal(patron.laines[0].pelotes, Math.ceil(patron.laines[0].metres / 100));
  // Une ligne « Bordure » dans les rangs du corps.
  const r7 = patron.panneaux[0].rangs.find((r) => r.blocId === "corps");
  assert.ok(r7.lignes.some((l) => l.etiquette?.startsWith("Bordure")));
  // Suivi : rangs du panneau 1, une pause, rangs du panneau 2, une pause, puis l'assemblage.
  const n = patron.panneaux[0].rangs.length;
  assert.equal(pasDuSuivi(patron), 2 * n + 2);
  assert.equal(rangsDeLaCouverture(patron), 2 * n);
  assert.deepEqual([positionSuivi(patron, 0).exemplaire, positionSuivi(patron, 0).index], [1, 0]);
  assert.equal(positionSuivi(patron, n).pause, true);
  assert.deepEqual([positionSuivi(patron, n + 1).exemplaire, positionSuivi(patron, n + 1).index], [2, 0]);
  assert.equal(positionSuivi(patron, 2 * n + 2).assemblage, true);
  assert.equal(assemblageFini(patron, { assemblage: { faits: ["poser"] } }), false);
  assert.equal(assemblageFini(patron, { assemblage: { faits: ["poser", "reperes", "coudre", "fils", "laver"] } }), true);
  // L'accueil.
  const projet = { ...p, statut: "patron", patron: { nbRangs: n, panneaux: [n, n], sections: patron.assemblage.sections } };
  assert.match(texteSuivi(projet, { rangsFaits: 0 }), /^Patron prêt · 2 panneaux de \d+ rangs/);
  assert.match(texteSuivi(projet, { rangsFaits: n + 5 }), /^Panneau 2 · rang 5 sur/);
  assert.match(texteSuivi(projet, { rangsFaits: 2 * n + 2, assemblage: { section: 5 } }), /^Assemblage · section 5 sur \d+$/);
  assert.equal(texteSuivi(projet, { rangsFaits: 2 * n + 2, assemblage: { section: 5, faits: ["coudre"] } }), "Assemblage · coutures faites");
  // Avec 3 panneaux, la section est comptée à la suite : la couture 2 commence après les sections de la couture 1.
  const s = projet.patron.sections;
  const trois = { ...projet, patron: { ...projet.patron, panneaux: [n, n, n] } };
  assert.equal(texteSuivi(trois, { rangsFaits: 3 * n + 3, assemblage: { section: s + 3 } }), `Assemblage · couture 2 · section 3 sur ${s}`);
});

test("patron en une pièce : comme une écharpe, avec la bordure de côté", () => {
  const p = projetRiz("plaid");
  const c = calcul(p, 80);
  assert.ok(c.ok);
  assert.equal(c.plan.panneaux, null);
  const patron = genererPatron({
    projet: p, plan: c.plan, laine, aiguilles: aiguilles(80), echantillon: c.echantillon, densites: c.densites,
    metrage: c.metrage, laineSuffit: c.laineSuffit, laines: [laine], parLaine: c.parLaine,
  });
  assert.equal(patron.panneaux, undefined);
  assert.equal(pasDuSuivi(patron), patron.rangs.length);
  assert.match(patron.etapes.find((e) => e.cle === "montage").texte, /de bordure/);
  assert.match(patron.etapes.find((e) => e.cle === "finitions").texte, /sécher à plat/);
  assert.ok(metrageNecessaire({ plan: c.plan, laine, echantillon: null, densiteJersey: d(10, 14) }).metres > 0);
});

test("3D : la couverture drapée ne rentre jamais dans le meuble", async () => {
  const { nappeDeCouverture, boitesDuDecor } = await import("../js/rendu/couverture.js");
  for (const [decor, l, L] of [["lit2", 194, 220], ["lit1", 140, 200], ["canape", 107, 140], ["lit2", 260, 260], ["canape", 60, 60]]) {
    const n = nappeDeCouverture({ largeurCm: l, longueurCm: L, decor });
    let dedans = 0;
    for (let i = 0; i < n.positions.length; i += 3) {
      const [x, y, z] = n.positions.slice(i, i + 3);
      for (const b of boitesDuDecor(decor)) if (x > b.x0 + 0.01 && x < b.x1 - 0.01 && y > b.y0 && y < b.y1 - 0.01 && z > b.z0 + 0.01 && z < b.z1 - 0.01) dedans++;
      assert.ok(y >= 0.4);
    }
    assert.equal(dedans, 0, `${decor} ${l} × ${L}`);
  }
});
