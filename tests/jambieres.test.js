// Tests des jambières (E4-20 à E4-24, 0.19.0) : projet, taille, plan en rond et à plat, couture, paire, patron, suivi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId, avisPour } from "../js/catalogue/points.js";
import { avisJambieres } from "../js/catalogue/jambieres.js";
import { planJambiere, filDeCouture } from "../js/moteur/plan-jambieres.js";
import { verifierPlan } from "../js/moteur/plan.js";
import { verifierPlanRond } from "../js/moteur/plan-rond.js";
import { genererPatron, positionSuivi, pasDuSuivi, nomExemplaire } from "../js/moteur/patron.js";
import {
  nouveauProjet, calculerProjet, avecModeJambieres, avecPointPrincipal, tourDesJambieres, enRond, nomPropose, texteSuivi,
  LONGUEURS_JAMBIERES, presetJambieres, nomBloc, largeurDuBlocCm, avisPourBloc,
} from "../js/donnees/projets.js";

const d = (mailles, rangs) => ({ mailles, rangs, statut: "mesuree" });
const blocs = (corps) => [
  { id: "bas", zone: "bas", pointId: "cotes-1-1", hauteurCm: 5 },
  { id: "corps", zone: "corps", pointId: corps },
  { id: "haut", zone: "haut", pointId: "cotes-1-1", hauteurCm: 5 },
];
const laine = {
  id: "L1", nom: "Sauge", epaisseur: "aran", couleur: "#9DB7A2",
  quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 4 },
  echantillonEtiquette: { mailles: 18, aiguilleMm: 4.5 },
};
const aiguilles = { id: "A1", tailleMm: 4.5, cableCm: 80 };
const ech = { id: "E1", laineId: "L1", tailleAiguille: 4.5, pointId: "riz", mode: "plat", maillesPour10cm: 17, rangsPour10cm: 24, date: "2026-11-09" };
const projetRiz = (mode = "rond") => avecModeJambieres(avecPointPrincipal({ ...nouveauProjet({ type: "jambieres" }), id: "J1", laineId: "L1", aiguillesId: "A1" }, "riz"), mode);
const calcul = (p) => calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech] });

test("de nouvelles jambières : en magic loop, mollet 36 cm, sous le genou, bords en côtes 1/1 de 5 cm", () => {
  const p = nouveauProjet({ type: "jambieres" });
  assert.deepEqual([p.type, p.mode, p.lisieres, p.nom], ["jambieres", "rond", "aucune", "Jambières"]);
  assert.deepEqual(p.taille, { molletCm: 36, longueurCm: 35, preset: "sous-genou" });
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.pointId, b.hauteurCm]), [["bas", "cotes-1-1", 5], ["corps", "", undefined], ["haut", "cotes-1-1", 5]]);
  assert.equal(tourDesJambieres(p), 34);
  assert.equal(nomPropose("jambieres", laine), "Jambières sauge");
  assert.deepEqual(LONGUEURS_JAMBIERES.map((l) => l.longueurCm), [25, 35, 45]);
  assert.equal(presetJambieres(45), "dessus-genou");
  assert.equal(presetJambieres(40), null);
  assert.deepEqual([nomBloc(p.blocs[0], p), nomBloc(p.blocs[2], p)], ["Bord du bas", "Bord du haut"]);
  assert.equal(largeurDuBlocCm(p, p.blocs[1]), 34);
});

test("à plat ou en rond : le mode change, les blocs restent", () => {
  const p = projetRiz("rond");
  const q = avecModeJambieres(p, "plat");
  assert.deepEqual([q.mode, q.lisieres, enRond(q)], ["plat", "couture", false]);
  assert.deepEqual(q.blocs, p.blocs);
  const r = avecModeJambieres(q, "rond");
  assert.deepEqual([r.mode, r.lisieres, enRond(r)], ["rond", "aucune", true]);
});

test("en rond : le plan du snood, les côtes gardent les mailles du corps", () => {
  const r = planJambiere({ mode: "rond", tourCm: 34, longueurCm: 35, blocs: blocs("riz"), densites: { riz: d(17, 24), "cotes-1-1": d(22, 24) } });
  assert.ok(r.ok);
  assert.equal(r.plan.montage.mailles, 58);
  assert.equal(r.plan.rangs.length, 84);
  assert.ok(r.plan.rangs.every((x) => x.mailles === 58));
  assert.deepEqual([r.plan.type, r.plan.mode, r.plan.exemplaires, r.plan.couture], ["jambieres", "rond", 2, null]);
  assert.deepEqual(r.plan.blocs.map((b) => b.nom), ["bord du bas", "corps", "bord du haut"]);
  assert.ok(verifierPlanRond(r.plan).ok);
});

test("à plat : 1 maille de couture de chaque côté, en jersey, qui ne compte pas dans le tour", () => {
  const r = planJambiere({ mode: "plat", tourCm: 34, longueurCm: 35, blocs: blocs("riz"), densites: { riz: d(17, 24), "cotes-1-1": d(22, 24) } });
  assert.ok(r.ok);
  assert.deepEqual(r.plan.montage.repartition, { bordD: 1, bandeD: 0, corps: 58, bandeG: 0, bordG: 1 });
  assert.equal(r.plan.lisieres.type, "couture");
  // Le riz prend 57 mailles ; les côtes gardent presque le même nombre (58), avec 1 maille de transition.
  const corps = r.plan.rangs.find((x) => x.blocId === "corps" && x.type === "motif");
  assert.equal(corps.mailles, 59);
  const e = r.plan.rangs.find((x) => x.cote === "E");
  const v = r.plan.rangs.find((x) => x.cote === "V");
  assert.deepEqual([e.segments[0].gestes, e.segments.at(-1).gestes], [["end"], ["end"]]);
  assert.deepEqual([v.segments[0].gestes, v.segments.at(-1).gestes], [["env"], ["env"]]);
  assert.ok(e.segments[0].couture);
  assert.ok(Math.abs(r.plan.largeur.reelleCm - 57 / 1.7) < 0.01, "les mailles de couture disparaissent dans la couture");
  assert.deepEqual(r.plan.couture, { filCm: filDeCouture(35), rangs: r.plan.rangs.length });
  assert.equal(filDeCouture(35), 110);
  assert.ok(verifierPlan(r.plan).ok);
});

test("chaque point du catalogue donne une jambière vérifiée, en rond et à plat", () => {
  const ratés = [];
  for (const p of POINTS) {
    const densites = { [p.id]: d(18 * p.densite.mailles, 25 * p.densite.rangs), "cotes-1-1": d(22, 24) };
    for (const mode of ["rond", "plat"]) {
      const r = planJambiere({ mode, tourCm: 34, longueurCm: 35, blocs: blocs(p.id), densites });
      if (!r.ok) ratés.push(`${p.id} (${mode}) : ${r.erreurs[0]?.message}`);
      else {
        const v = mode === "rond" ? verifierPlanRond(r.plan) : verifierPlan(r.plan);
        if (!v.ok) ratés.push(`${p.id} (${mode}) : ${v.erreurs[0]?.message}`);
      }
    }
  }
  assert.deepEqual(ratés, []);
});

test("la laine compte pour la paire ; à plat, le fil de couture en plus", () => {
  const rond = calcul(projetRiz("rond"));
  const plat = calcul(projetRiz("plat"));
  assert.ok(rond.ok && plat.ok);
  assert.equal(rond.metrage.exemplaires, 2);
  assert.ok(Math.abs(rond.metrage.metres - 2 * rond.metrage.parExemplaire) <= 2);
  assert.ok(plat.metrage.parBloc.some((b) => b.blocId === "couture" && Math.abs(b.metres - 2.2) < 1e-9));
  // Câble : en rond, le magic loop demande 80 cm ; à plat, rien n'est vérifié.
  const court = { ...aiguilles, cableCm: 40 };
  assert.ok(calculerProjet({ projet: projetRiz("rond"), laine, aiguilles: court, echantillons: [ech] }).cable?.magicLoop);
  assert.equal(calculerProjet({ projet: projetRiz("plat"), laine, aiguilles: court, echantillons: [ech] }).cable, null);
});

test("avis des points pour des jambières : déduits du bonnet, raisons propres", () => {
  assert.deepEqual(avisJambieres(pointParId("riz")), { avis: "conseille" });
  assert.equal(avisPour(pointParId("riz"), "jambieres").avis, "conseille");
  const ajoure = POINTS.find((p) => p.famille === "ajoures");
  assert.equal(avisJambieres(ajoure).avis, "possible");
  assert.match(avisJambieres(ajoure).raison, /mi-saison/);
  for (const p of POINTS) {
    const a = avisPour(p, "jambieres");
    if (a.avis !== "conseille") assert.ok(a.raison && !/bonnet/.test(a.raison), p.id);
  }
  // En rond, un point qui déplace le début du tour ne va pas dans une colonne.
  const etoile = pointParId("etoile");
  if (etoile) assert.equal(avisPourBloc(etoile, "jambieres", "corps", { colonne: true, rond: true }).avis, "deconseille");
});

const patronDe = (mode) => {
  const p = projetRiz(mode);
  const c = calcul(p);
  return genererPatron({ projet: p, plan: c.plan, laine, aiguilles, echantillon: ech, densites: c.densites, metrage: c.metrage, laineSuffit: c.laineSuffit, laines: [laine], parLaine: c.parLaine });
};

test("patron en rond : magic loop, à tricoter 2 fois, rabattage qui passe le pied", () => {
  const pat = patronDe("rond");
  assert.equal(pat.exemplaires, 2);
  assert.equal(pat.mode, "rond");
  assert.match(pat.etapes[0].liste[0], /tricote-le 2 fois/);
  assert.ok(pat.etapes.find((e) => e.cle === "montage").techniques.includes("magicLoop"));
  assert.match(pat.etapes.find((e) => e.cle === "rabattage").texte, /passer le pied/);
  assert.ok(!pat.etapes.some((e) => e.cle === "assemblage"));
  assert.ok(pat.techniques.magicLoop && !pat.techniques.matelas && !pat.techniques.sommet);
  assert.match(pat.resume, /à tricoter 2 fois/);
});

test("patron à plat : mailles de couture, fil gardé au montage, assemblage au point de matelas", () => {
  const pat = patronDe("plat");
  assert.equal(pat.mode, "plat");
  const montage = pat.etapes.find((e) => e.cle === "montage");
  assert.match(montage.texte, /1,1 m/);
  assert.match(montage.texte, /1 maille de couture, \d+ pour le corps, 1 maille de couture/);
  const assemblage = pat.etapes.find((e) => e.cle === "assemblage");
  assert.deepEqual(assemblage.techniques, ["matelas"]);
  assert.equal(pat.etapes.at(-1).cle, "finitions");
  assert.equal(pat.techniques.lisiere.titre, "Maille de couture");
  assert.ok(pat.techniques.matelas && !pat.techniques.magicLoop);
  assert.deepEqual(pat.rangs[0].lignes.filter((l) => l.zone === "lisiere").map((l) => l.texte), ["1 maille endroit (maille de couture)", "1 maille endroit (maille de couture)"]);
  assert.deepEqual(pat.rangs[1].lignes.filter((l) => l.zone === "lisiere").map((l) => l.texte), ["1 maille envers (maille de couture)", "1 maille envers (maille de couture)"]);
});

test("suivi de la paire : 1re jambière, une pause, puis la 2e depuis le rang 1", () => {
  const pat = patronDe("plat");
  const n = pat.rangs.length;
  assert.equal(pasDuSuivi(pat), 2 * n + 1);
  assert.deepEqual(positionSuivi(pat, 0), { exemplaire: 1, index: 0, pause: false, fini: false });
  assert.deepEqual(positionSuivi(pat, n), { exemplaire: 1, index: n, pause: true, fini: false });
  assert.deepEqual(positionSuivi(pat, n + 1), { exemplaire: 2, index: 0, pause: false, fini: false });
  assert.deepEqual(positionSuivi(pat, 2 * n + 1), { exemplaire: 2, index: n, pause: false, fini: true });
  assert.deepEqual([nomExemplaire(1), nomExemplaire(2)], ["1re jambière", "2e jambière"]);
  // Une écharpe : pas de pause.
  assert.equal(pasDuSuivi({ rangs: [1, 2, 3] }), 3);
  const projet = { ...projetRiz("plat"), statut: "patron", patron: { nbRangs: n, exemplaires: 2 } };
  assert.equal(texteSuivi(projet, { rangsFaits: 0 }), `Patron prêt · ${n} rangs × 2`);
  assert.equal(texteSuivi(projet, { rangsFaits: n }), `1re jambière terminée · ${Math.floor((n / (2 * n + 1)) * 100)} %`);
  assert.match(texteSuivi(projet, { rangsFaits: n + 1 }), /^2e jambière · rang 1 sur/);
});

test("la jambe de mannequin : mollet au bon tour, jambière moulée dessus, un peu lâche à la cheville", async () => {
  const { profilDeJambe, rayonDeJambiere, nappeDeJambiere, tranchesDeJambiere, CHEVILLE, ECART_JAMBIERE } = await import("../js/rendu/jambe.js");
  const j = profilDeJambe(40);
  assert.ok(Math.abs(2 * Math.PI * j.molletR - 40) < 0.1);
  // Au mollet, la jambière (plus petite) est tendue sur la jambe ; à la cheville, elle reste un peu plus large.
  const rMollet = rayonDeJambiere(j, 32, 38);
  assert.ok(Math.abs(rMollet - (j.rayon(32) + ECART_JAMBIERE)) < 1e-9);
  const rCheville = rayonDeJambiere(j, CHEVILLE, 38);
  assert.ok(rCheville > j.rayon(CHEVILLE) + ECART_JAMBIERE && rCheville < 38 / (2 * Math.PI));
  const n = nappeDeJambiere({ profil: j, tourCm: 38, v0: 0, v1: 5, tuile: { l: 2, h: 1 } });
  assert.equal(n.positions.length / 3, n.uv.length / 2);
  // Le nombre de mailles est constant : u fait tout le tour en tour ÷ largeur du motif.
  assert.ok(Math.abs(Math.max(...n.uv.filter((_, i) => i % 2 === 0)) - 19) < 1e-9);
  assert.deepEqual(tranchesDeJambiere([{ id: "a", zone: "bas", hauteurCm: 5 }, { id: "b", zone: "corps", hauteurCm: 25 }], 30).map((t) => [t.v0, t.v1]), [[0, 5], [5, 30]]);
});
