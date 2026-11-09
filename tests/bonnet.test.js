// Tests du bonnet (E4-10 à E4-18) : projet, tailles, revers, pompon, plan en 8 parts, sommet, patron.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import {
  planBonnet, pointSimpleAuSommet, calendrierDuSommet, toursDuSommet, lectureDuPoint, cableMagicLoop, PARTS_DU_SOMMET,
} from "../js/moteur/plan-bonnet.js";
import { verifierPlanRond } from "../js/moteur/plan-rond.js";
import { genererPatron, texteDuSommet } from "../js/moteur/patron.js";
import { metresPompon, metrageNecessaire } from "../js/moteur/metrage.js";
import { consomme, produit } from "../js/moteur/simulateur.js";
import {
  nouveauProjet, calculerProjet, avisPourBloc, tailleBonnet, TAILLES_BONNET, tourDuBonnet, avecRevers, avecPompon,
  enRond, nomPropose, nomBloc, sansLaineDuProjet, lainesDuProjet, blocsDeLaLaine, bordAvecRevers,
} from "../js/donnees/projets.js";

const d = (mailles, rangs) => ({ mailles, rangs, statut: "mesuree" });
const blocs = (corps, { bord = "cotes-1-1", hauteurBord = 5 } = {}) => [
  { id: "bas", zone: "bas", pointId: bord, hauteurCm: hauteurBord },
  { id: "corps", zone: "corps", pointId: corps },
];

const laine = {
  id: "L1", nom: "Sauge", epaisseur: "aran", couleur: "#9DB7A2",
  quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 4 },
  echantillonEtiquette: { mailles: 17, aiguilleMm: 5 },
};
const ecru = { ...laine, id: "L2", nom: "Écru", couleur: "#EFE6D5" };
const aiguilles = { id: "A1", tailleMm: 5, cableCm: 80 };
const ech = { id: "E1", laineId: "L1", tailleAiguille: 5, pointId: "riz", mode: "plat", maillesPour10cm: 17, rangsPour10cm: 24, date: "2026-11-09" };

// ---------- Projet, tailles, revers, pompon ----------

test("un nouveau bonnet : en rond, bord de 5 cm en côtes 1/1, pas de bordure du haut", () => {
  const p = nouveauProjet({ type: "bonnet" });
  assert.deepEqual([p.type, p.mode, p.lisieres, p.nom], ["bonnet", "rond", "aucune", "Bonnet"]);
  assert.deepEqual(p.taille, { public: "adulte", preset: "femme", teteCm: 56, hauteurCm: 22, revers: false, pompon: true, pomponCm: 6 });
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.pointId, b.hauteurCm]), [["bas", "cotes-1-1", 5], ["corps", "", undefined]]);
  assert.equal(enRond(p), true);
  assert.equal(nomPropose("bonnet", laine), "Bonnet sauge");
  assert.equal(tourDuBonnet(p), 51);
});

test("tailles du bonnet : enfant 51 cm, femme 56 cm, homme 60 cm", () => {
  assert.deepEqual(TAILLES_BONNET.adulte.map((t) => [t.preset, t.teteCm, t.hauteurCm, t.pomponCm]), [["femme", 56, 22, 6], ["homme", 60, 24, 6]]);
  assert.deepEqual(TAILLES_BONNET.enfant.map((t) => [t.preset, t.teteCm, t.hauteurCm, t.pomponCm]), [["enfant", 51, 20, 4]]);
  assert.equal(tailleBonnet("enfant").teteCm, 51);
  assert.equal(tailleBonnet("adulte", "homme").hauteurCm, 24);
});

test("revers : le bord passe de 5 à 10 cm, sauf une hauteur changée à la main", () => {
  const p = nouveauProjet({ type: "bonnet" });
  const r = avecRevers(p, true);
  assert.equal(r.taille.revers, true);
  assert.equal(r.blocs[0].hauteurCm, 10);
  assert.equal(avecRevers(r, false).blocs[0].hauteurCm, 5);
  const main = { ...p, blocs: p.blocs.map((b) => (b.zone === "bas" ? { ...b, hauteurCm: 7 } : b)) };
  assert.equal(avecRevers(main, true).blocs[0].hauteurCm, 7);
  assert.equal(nomBloc(r.blocs[0], r), "Bord et revers");
  assert.equal(nomBloc(p.blocs[0], p), "Bord");
});

test("revers : seuls les points réversibles au bord", () => {
  const jersey = avisPourBloc(pointParId("jersey"), "bonnet", "bas", { revers: true });
  assert.equal(jersey.avis, "refuse");
  assert.match(jersey.raison, /réversible/);
  assert.notEqual(avisPourBloc(pointParId("cotes-1-1"), "bonnet", "bas", { revers: true }).avis, "refuse");
  assert.notEqual(avisPourBloc(pointParId("jersey"), "bonnet", "bas", { revers: false }).avis, "refuse");
  assert.notEqual(avisPourBloc(pointParId("jersey"), "bonnet", "corps", { revers: true }).avis, "refuse");
  const p = avecRevers(nouveauProjet({ type: "bonnet" }), true);
  assert.equal(bordAvecRevers(p, p.blocs[0]), true);
  assert.equal(bordAvecRevers(p, p.blocs[1]), false);
});

test("pompon : taille bornée de 4 à 8 cm, laine du projet, retirée avec la laine", () => {
  let p = { ...nouveauProjet({ type: "bonnet" }), laineId: "L1" };
  assert.equal(avecPompon(p, { pomponCm: 12 }).taille.pomponCm, 8);
  assert.equal(avecPompon(p, { pomponCm: 2 }).taille.pomponCm, 4);
  p = avecPompon(p, { pomponLaineId: "L2" });
  assert.equal(p.taille.pomponLaineId, "L2");
  assert.deepEqual(lainesDuProjet(p, [laine, ecru]).map((l) => l.id), ["L1", "L2"]);
  assert.equal(blocsDeLaLaine(p, "L2"), 1);
  assert.equal(sansLaineDuProjet(p, "L2").taille.pomponLaineId, undefined);
  assert.equal(avecPompon(p, { pomponLaineId: "L1" }).taille.pomponLaineId, undefined);
});

test("câble : 80 cm conseillé pour le magic loop", () => {
  assert.equal(cableMagicLoop(80), null);
  assert.equal(cableMagicLoop(100), null);
  assert.deepEqual(cableMagicLoop(40), { conseille: 80 });
  assert.equal(cableMagicLoop(NaN), null);
});

// ---------- Sommet ----------

test("calendrier du sommet : 88 mailles → 10 diminutions en 15 tours", () => {
  const c = calendrierDuSommet(88);
  assert.equal(c.length, 15);
  assert.equal(c.filter(Boolean).length, 10);
  assert.deepEqual(c.slice(0, 4), [true, false, true, false]);
  assert.deepEqual(c.slice(-5), [true, true, true, true, true]);
  assert.equal(calendrierDuSommet(87), null);
  assert.deepEqual(calendrierDuSommet(8), []);
});

test("point simple au sommet : 4 mailles au plus, seulement endroit et envers", () => {
  for (const id of ["jersey", "riz", "mousse", "cotes-1-1", "cotes-2-2", "ble"]) assert.equal(pointSimpleAuSommet(pointParId(id)), true, id);
  const grands = POINTS.filter((p) => !pointSimpleAuSommet(p));
  assert.ok(grands.length > 50);
  for (const id of ["etoile", "losange-riz"]) if (pointParId(id)) assert.equal(pointSimpleAuSommet(pointParId(id)), false, id);
});

test("lecture du point : comme elles se présentent (côtes), à l'opposé (riz)", () => {
  assert.equal(lectureDuPoint(["end", "env"], ["end", "env"]), "comme elles se présentent");
  assert.match(lectureDuPoint(["end", "env"], ["env", "end"]), /à l'envers sur les V/);
  assert.equal(lectureDuPoint(["end", "end"], ["env", "end"]), null);
});

test("tours du sommet en jersey : 8 diminutions par tour de diminutions, 8 mailles à la fin", () => {
  const s = toursDuSommet({ n: 88 });
  assert.equal(s.diminutions, 10);
  let n = 88;
  for (const t of s.tours) {
    assert.equal(consomme(t.gestes), n);
    n = produit(t.gestes);
    assert.equal(n, t.apres);
    if (t.diminution) assert.equal(t.gestes.filter((g) => g === "2ens").length, PARTS_DU_SOMMET);
  }
  assert.equal(n, 8);
});

test("côtes au sommet : la diminution garde les mailles endroit", () => {
  const recette = { rangs: [{ cote: "E", debut: [], motif: ["end", "env"], fin: [] }] };
  const s = toursDuSommet({ n: 16 * 8, recette, t0: 1 });
  // Après la première diminution, chaque part garde ses côtes endroit : la dernière maille de la part reste un V.
  const t = s.tours[0];
  assert.equal(t.lecture, "comme elles se présentent");
  assert.deepEqual(t.gestes.slice(0, 16), ["end", "env", "end", "env", "end", "env", "end", "env", "end", "env", "end", "env", "end", "env", "2ens", "end"].slice(0, 16));
});

// ---------- Plan complet ----------

const exemple = () => planBonnet({
  tourCm: 51, hauteurCm: 22, revers: true,
  blocs: blocs("riz", { hauteurBord: 10 }),
  densites: { riz: d(17, 24), "cotes-1-1": d(22, 24) },
  pompon: { cm: 6 },
});

test("le bonnet de la maquette : 88 mailles, 65 tours, sommet en riz de 15 tours", () => {
  const r = exemple();
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  const p = r.plan;
  assert.equal(p.type, "bonnet");
  assert.equal(p.montage.mailles, 88);
  assert.equal(p.rangs.length, 65);
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.premierRang, b.dernierRang]), [["bas", 1, 24], ["corps", 25, 50], ["sommet", 51, 65]]);
  assert.equal(p.sommet.pointId, "riz");
  assert.equal(p.sommet.jersey, false);
  assert.equal(p.sommet.diminutions, 10);
  assert.deepEqual(p.rabattage, { mailles: 8, fermeture: true });
  assert.ok(Math.abs(p.longueur.reelleCm - 22) < 1, p.longueur.reelleCm);
  assert.equal(p.revers.hauteurCm, 10);
  assert.ok(r.explications.some((e) => /sommet en 8 parts/.test(e)));
  assert.equal(verifierPlanRond(p).ok, true);
});

test("un grand motif passe en jersey au sommet, et c'est dit", () => {
  const id = POINTS.find((p) => !pointSimpleAuSommet(p) && p.ouvrages.bonnet)?.id;
  const r = planBonnet({ tourCm: 51, hauteurCm: 22, blocs: blocs(id), densites: { [id]: d(17, 24), "cotes-1-1": d(22, 24) }, densiteJersey: d(17, 23) });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  assert.equal(r.plan.sommet.jersey, true);
  assert.match(r.plan.sommet.raison, /passe en jersey/);
  assert.ok(r.explications.some((e) => /passe en jersey/.test(e)));
});

test("chaque point du catalogue donne un bonnet vérifié", () => {
  const ratés = [];
  for (const p of POINTS) {
    const r = planBonnet({
      tourCm: 51, hauteurCm: 22, blocs: blocs(p.id),
      densites: { [p.id]: d(18 * p.densite.mailles, 25 * p.densite.rangs), "cotes-1-1": d(22, 24) }, densiteJersey: d(18, 25),
    });
    if (!r.ok) ratés.push(`${p.id} : ${r.erreurs[0]?.message}`);
    else {
      const n = r.plan.rangs.at(-1).mailles;
      if (n !== 8) ratés.push(`${p.id} : ${n} mailles à la fin`);
    }
  }
  assert.deepEqual(ratés, []);
});

test("un tour qui se partage mal en 8 : tour de transition au sommet", () => {
  // Un motif de 6 mailles : un multiple de 24 tombe loin de 87 ; on garde 84 ou 90 et on diminue au sommet.
  const id = POINTS.find((p) => {
    const r = planBonnet({ tourCm: 51, hauteurCm: 22, blocs: blocs(p.id), densites: { [p.id]: d(17, 24), "cotes-1-1": d(22, 24) }, densiteJersey: d(17, 24) });
    return r.ok && r.plan.sommet.transition;
  })?.id;
  assert.ok(id, "au moins un point demande une transition");
  const r = planBonnet({ tourCm: 51, hauteurCm: 22, blocs: blocs(id), densites: { [id]: d(17, 24), "cotes-1-1": d(22, 24) }, densiteJersey: d(17, 24) });
  assert.ok(r.explications.some((e) => /Au premier tour du sommet/.test(e)));
  assert.equal(r.plan.rangs.at(-1).mailles, 8);
});

test("trop court pour le sommet : message clair", () => {
  const r = planBonnet({ tourCm: 51, hauteurCm: 9, blocs: blocs("riz"), densites: { riz: d(17, 24), "cotes-1-1": d(22, 24) } });
  assert.equal(r.ok, false);
  assert.match(r.erreurs[0].message, /trop court|plus hautes que le bonnet/);
});

// ---------- Projet calculé, métrage, patron ----------

const projetBonnet = (reglages = {}) => {
  let p = { ...nouveauProjet({ type: "bonnet" }), id: "P1", laineId: "L1", aiguillesId: "A1", pointPrincipal: "riz", echantillonId: "E1" };
  p = { ...p, blocs: p.blocs.map((b) => (b.zone === "corps" ? { ...b, pointId: "riz" } : b)) };
  if (reglages.revers) p = avecRevers(p, true);
  if (reglages.pompon) p = avecPompon(p, reglages.pompon);
  return p;
};

test("projet calculé : plan du bonnet, câble trop court signalé, pompon dans le métrage", () => {
  const p = projetBonnet({ revers: true });
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech], laines: [laine, ecru] });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  assert.equal(c.plan.type, "bonnet");
  assert.equal(c.cable, null);
  const court = calculerProjet({ projet: p, laine, aiguilles: { ...aiguilles, cableCm: 40 }, echantillons: [ech] });
  assert.equal(court.cable.magicLoop, true);
  const sans = calculerProjet({ projet: { ...p, taille: { ...p.taille, pompon: false } }, laine, aiguilles, echantillons: [ech] });
  assert.ok(c.metrage.metres > sans.metrage.metres);
  assert.ok(c.metrage.parBloc.some((b) => b.blocId === "pompon"));
});

test("pompon dans une autre laine : métrage de cette laine", () => {
  const p = projetBonnet({ pompon: { pomponLaineId: "L2" } });
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech], laines: [laine, ecru] });
  const ecruM = c.parLaine.find((x) => x.laineId === "L2");
  assert.ok(ecruM && ecruM.metres > 5 && ecruM.metres < 25, JSON.stringify(c.parLaine));
});

test("métrage d'un pompon : une douzaine de mètres pour 6 cm en aran", () => {
  const m = metresPompon(6, d(17, 24));
  assert.ok(m > 8 && m < 18, m);
  assert.ok(metresPompon(4, d(17, 24)) < m);
  assert.equal(metresPompon(0, d(17, 24)), 0);
});

test("le sommet compte avec son nombre moyen de mailles dans le métrage", () => {
  const r = exemple();
  const m = metrageNecessaire({ plan: { ...r.plan, pompon: null }, laine, echantillon: null, densiteJersey: d(17, 24) });
  const sommet = m.parBloc.find((b) => b.blocId === "sommet");
  const corps = m.parBloc.find((b) => b.blocId === "corps");
  assert.ok(sommet.cm2 > 0 && sommet.cm2 / r.plan.blocs[2].hauteurCm < corps.cm2 / r.plan.blocs[1].hauteurCm);
});

test("patron du bonnet : magic loop au montage, sommet décrit, fermeture et pompon", () => {
  const p = projetBonnet({ revers: true });
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech], laines: [laine] });
  const pat = genererPatron({ projet: p, plan: c.plan, laine, aiguilles, echantillon: c.echantillon, densites: c.densites, metrage: c.metrage, laineSuffit: c.laineSuffit, laines: [laine], parLaine: c.parLaine });
  assert.equal(pat.mode, "rond");
  const montage = pat.etapes.find((e) => e.cle === "montage");
  assert.match(montage.texte, /magic loop/);
  assert.ok(montage.techniques.includes("magicLoop"));
  assert.ok(pat.techniques.magicLoop && pat.techniques.sommet && pat.techniques.fermeture && pat.techniques.pompon);
  assert.equal(pat.techniques.rabattage, undefined);
  const fermeture = pat.etapes.find((e) => e.cle === "rabattage");
  assert.equal(fermeture.titre, "Fermer le sommet");
  assert.match(fermeture.texte, /Il reste 8 mailles/);
  assert.ok(pat.etapes.find((e) => e.cle === "pompon"));
  assert.match(pat.etapes.find((e) => e.cle === "finitions").texte, /revers/);
  assert.match(pat.etapes.find((e) => e.blocId === "bas").texte, /revers/);
  const dim = pat.rangs.find((r) => r.sommet?.diminution === 3);
  assert.equal(dim.repere, "Sommet · diminution 3 sur 10");
  assert.match(dim.lignes.at(-1).texte, /^\*7 mailles en point de riz \(à l'envers sur les V, à l'endroit sur les petits grains\), 2 mailles ensemble à l'endroit\*, 8 fois$/);
  assert.deepEqual([dim.sommet.avant, dim.sommet.apres], [72, 64]);
  const premiereDim = pat.rangs.find((r) => r.sommet?.diminution === 1);
  assert.ok(premiereDim.techniques.includes("sommet"));
  const plat = pat.rangs.find((r) => r.sommet && !r.sommet.diminution);
  assert.match(plat.lignes.at(-1).texte, /^Tout le tour en point de riz .*sans diminuer \(80 mailles\)$/);
  assert.match(pat.resume, /pompon de 6 cm/);
});

test("texte du sommet en jersey : les gestes sont nommés", () => {
  const rang = { segments: [{ pointId: "jersey" }], sommet: { diminution: 1, diminutions: 10, avant: 88, apres: 80, parts: 8, base: ["end"] } };
  assert.equal(texteDuSommet(rang), "*9 mailles endroit, 2 mailles ensemble à l'endroit*, 8 fois");
  assert.equal(texteDuSommet({ ...rang, sommet: { ...rang.sommet, diminution: null, apres: 88 } }), "Tout le tour à l'endroit, sans diminuer (88 mailles)");
  assert.equal(texteDuSommet({ ...rang, sommet: { ...rang.sommet, avant: 16, apres: 8 } }), "*2 mailles ensemble à l'endroit*, 8 fois");
});
