// Tests du snood (E4-1, E4-2, E4-4, E4-6) : projet, taille, plan en rond, vérification, patron en tours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { planSnood, verifierPlanRond, cableTropLong, cableConseille } from "../js/moteur/plan-rond.js";
import { genererPatron, rangsCondenses, changementsDeLaine } from "../js/moteur/patron.js";
import {
  nouveauProjet, calculerProjet, avisPourBloc, tailleSnood, TAILLES_SNOOD, nomPropose, texteSuivi, noteEchantillonEnRond, enRond,
  diviserBloc, avecPointDeColonne, avecLaineDuBloc, ajouterBloc,
} from "../js/donnees/projets.js";

const d = (mailles, rangs) => ({ mailles, rangs, statut: "mesuree" });
const blocs = (corps, bord = "cotes-1-1") => [
  { id: "bas", zone: "bas", pointId: bord, hauteurCm: 3 },
  { id: "corps", zone: "corps", pointId: corps },
  { id: "haut", zone: "haut", pointId: bord, hauteurCm: 3 },
];
const densites = (corps, bord = "cotes-1-1") => ({ [bord]: d(23, 26), [corps]: d(17, 26) });

const laine = {
  id: "L1", nom: "Mérinos", epaisseur: "aran", couleur: "#9DB7A2",
  quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 4 },
  echantillonEtiquette: { mailles: 18, aiguilleMm: 5 },
};
const bleue = { ...laine, id: "L2", nom: "Bleue", couleur: "#2050C0" };
const aiguilles = { id: "A1", tailleMm: 5, cableCm: 40 };
const ech = { id: "E1", laineId: "L1", tailleAiguille: 5, pointId: "riz", mode: "plat", maillesPour10cm: 17, rangsPour10cm: 26, date: "2026-10-12" };

// ---------- Projet et taille ----------

test("un nouveau snood : en rond, sans lisières ni bandes latérales, bordures en côtes 1/1", () => {
  const p = nouveauProjet({ type: "snood" });
  assert.deepEqual([p.type, p.mode, p.lisieres, p.nom], ["snood", "rond", "aucune", "Snood"]);
  assert.deepEqual(p.taille, { public: "adulte", preset: "1tour", tourCm: 62, hauteurCm: 24 });
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.pointId, b.hauteurCm]), [["bas", "cotes-1-1", 3], ["corps", "", undefined], ["haut", "cotes-1-1", 3]]);
  assert.equal(enRond(p), true);
  assert.equal(nomPropose("snood", laine), "Snood sauge");
});

test("tailles du snood : adulte 1 et 2 tours, enfant 1 tour", () => {
  assert.deepEqual(TAILLES_SNOOD.adulte.map((t) => [t.preset, t.tourCm, t.hauteurCm]), [["1tour", 62, 24], ["2tours", 152, 25]]);
  assert.deepEqual(TAILLES_SNOOD.enfant.map((t) => [t.preset, t.tourCm, t.hauteurCm]), [["1tour", 56, 20]]);
  assert.deepEqual(tailleSnood("enfant", "2tours"), { public: "enfant", preset: "1tour", tourCm: 56, hauteurCm: 20 });
});

test("câble : plus court que le tour, sinon conseil", () => {
  assert.equal(cableTropLong(40, 62), null);
  assert.deepEqual(cableTropLong(80, 62), { conseille: 40 });
  assert.equal(cableTropLong(80, 152), null);
  assert.equal(cableTropLong(NaN, 62), null);
  assert.equal(cableConseille(152), 80);
  assert.equal(cableConseille(190), 100);
});

test("échantillon à plat pour un snood : la phrase sur le tricot en rond", () => {
  const p = nouveauProjet({ type: "snood" });
  assert.equal(noteEchantillonEnRond(p, ech), "Tricoté à plat : en rond, le tricot peut être un peu plus serré.");
  assert.equal(noteEchantillonEnRond(nouveauProjet(), ech), null);
  assert.equal(noteEchantillonEnRond(p, { ...ech, mode: "rond" }), null);
});

test("calculerProjet : un snood en point de riz, avec l'échantillon à plat", () => {
  const p = { ...nouveauProjet({ type: "snood" }), laineId: "L1", aiguillesId: "A1", pointPrincipal: "riz", blocs: blocs("riz") };
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech], laines: [laine] });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  assert.equal(c.plan.type, "snood");
  assert.equal(c.plan.montage.mailles, 106); // 62 cm × 1,7 = 105,4 → 106 (le riz en rond demande un nombre pair ; à égalité, le plus grand)
  assert.equal(c.cable, null);
  assert.ok(c.metrage.metres > 50);
  const long = calculerProjet({ projet: p, laine, aiguilles: { ...aiguilles, cableCm: 80 }, echantillons: [ech], laines: [laine] });
  assert.deepEqual(long.cable, { conseille: 40, cableCm: 80, tourCm: 62 });
});

test("texte de l'accueil : tours pour un snood", () => {
  const p = { ...nouveauProjet({ type: "snood" }), statut: "patron", patron: { nbRangs: 64 } };
  assert.equal(texteSuivi(p, { rangsFaits: 0 }), "Patron prêt · 64 tours");
  assert.equal(texteSuivi(p, { rangsFaits: 13 }), "Tour 14 sur 64 · 20 %");
});

// ---------- Plan en rond ----------

test("plan du snood : tous les tours sur l'endroit, les bordures gardent les mailles du corps", () => {
  const r = planSnood({ tourCm: 62, hauteurCm: 24, blocs: blocs("riz"), densites: densites("riz") });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  assert.equal(r.plan.mode, "rond");
  assert.ok(r.plan.rangs.every((t) => t.cote === "E"));
  assert.ok(r.plan.blocs.every((b) => b.maillesCorps === r.plan.montage.mailles));
  assert.ok(r.explications.some((e) => /côtes 1\/1 des bordures gardent/.test(e)));
  assert.ok(Math.abs(r.plan.longueur.reelleCm - 24) < 1.5);
  assert.equal(r.plan.rabattage.souple, true);
  assert.equal(r.plan.lisieres.mailles, 0);
  assert.equal(r.plan.bandesLaterales, null);
});

test("chaque point du catalogue donne un snood juste (corps), vérifié tour par tour", () => {
  for (const p of POINTS) {
    const r = planSnood({ tourCm: 62, hauteurCm: 24, blocs: blocs(p.id), densites: densites(p.id) });
    assert.equal(r.ok, true, `${p.nom} : ${JSON.stringify(r.erreurs)}`);
  }
});

test("point d'étoile : le marqueur se déplace dans le corps, puis revient au début du bloc suivant", () => {
  const r = planSnood({ tourCm: 62, hauteurCm: 24, blocs: blocs("etoile"), densites: densites("etoile") });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  const corps = r.plan.blocs.find((b) => b.zone === "corps");
  const toursCorps = r.plan.rangs.filter((t) => t.blocId === "corps");
  assert.equal(toursCorps[0].marqueur, undefined, "pas de déplacement au tout premier tour du bloc");
  const motif = toursCorps.filter((t) => t.marqueur);
  assert.ok(motif.length > 10);
  assert.ok(motif.every((t) => t.marqueur.sens === "gauche" && t.marqueur.mailles === 2 && t.marqueur.raison === "motif"));
  const haut = r.plan.rangs.find((t) => t.numero === corps.dernierRang + 1);
  assert.equal(haut.marqueur?.raison, "retour");
  assert.ok(haut.marqueur.mailles <= r.plan.montage.mailles / 2);
  assert.equal(verifierPlanRond(r.plan).ok, true);
});

test("vérification : un retour du marqueur oublié est refusé", () => {
  const r = planSnood({ tourCm: 62, hauteurCm: 24, blocs: blocs("etoile"), densites: densites("etoile") });
  const plan = structuredClone(r.plan);
  const t = plan.rangs.find((x) => x.marqueur?.raison === "retour");
  delete t.marqueur;
  assert.equal(verifierPlanRond(plan).ok, false);
});

test("une bordure qui ne tombe pas juste sur le corps : tour de transition", () => {
  const r = planSnood({ tourCm: 20, hauteurCm: 24, blocs: blocs("riz", "cotes-3-3"), densites: densites("riz", "cotes-3-3") });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  assert.ok(r.plan.rangs.some((t) => t.type === "transition"));
  assert.ok(r.explications.some((e) => e.startsWith("Tour de transition")));
});

test("colonnes en rond : elles font tout le tour ; un point à marqueur est refusé", () => {
  const b = blocs("riz");
  b[1] = { ...b[1], colonnes: [{ id: "c1", pointId: "riz" }, { id: "c2", pointId: "jersey" }, { id: "c3", pointId: "riz" }, { id: "c4", pointId: "jersey" }] };
  const r = planSnood({ tourCm: 62, hauteurCm: 24, blocs: b, densites: { ...densites("riz"), jersey: d(17, 26) } });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  const corps = r.plan.blocs.find((x) => x.zone === "corps");
  assert.equal(corps.colonnes.reduce((t, c) => t + c.mailles, 0), corps.maillesCorps);
  b[1].colonnes[1].pointId = "etoile";
  const e = planSnood({ tourCm: 62, hauteurCm: 24, blocs: b, densites: { ...densites("riz"), jersey: d(17, 26), etoile: d(17, 26) } });
  assert.equal(e.ok, false);
  assert.match(e.erreurs[0].message, /déplace le début du tour/);
});

test("avis d'une colonne de snood : un point à marqueur est peu adapté", () => {
  assert.equal(avisPourBloc(pointParId("etoile"), "snood", "corps", { colonne: true }).avis, "deconseille");
  assert.notEqual(avisPourBloc(pointParId("etoile"), "snood", "corps").avis, "deconseille");
  assert.notEqual(avisPourBloc(pointParId("riz"), "snood", "corps", { colonne: true }).avis, "deconseille");
});

test("snood 2 tours : grand tour, toujours juste", () => {
  const r = planSnood({ tourCm: 152, hauteurCm: 25, blocs: blocs("mures"), densites: densites("mures") });
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  assert.ok(r.plan.montage.mailles > 240);
});

// ---------- Patron en tours ----------

function patronSnood(corps = "etoile", modif = (p) => p, laines = [laine]) {
  let projet = { ...nouveauProjet({ type: "snood" }), id: "P1", laineId: "L1", aiguillesId: "A1", pointPrincipal: corps, blocs: blocs(corps) };
  projet = modif(projet);
  const c = calculerProjet({ projet, laine, aiguilles, echantillons: [{ ...ech, pointId: corps }], laines });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  return genererPatron({ projet, plan: c.plan, laine, aiguilles, echantillon: c.echantillon, densites: c.densites, metrage: c.metrage, laineSuffit: c.laineSuffit, laines, parLaine: c.parLaine });
}

test("patron du snood : montage joint en rond, tours sur l'endroit, rabattage souple", () => {
  const pat = patronSnood();
  assert.equal(pat.mode, "rond");
  const montage = pat.etapes.find((e) => e.cle === "montage");
  assert.match(montage.texte, /Joins en rond sans vriller les mailles et place un marqueur/);
  assert.deepEqual(montage.techniques, ["montage", "joindre"]);
  assert.ok(pat.etapes.find((e) => e.cle === "materiel").liste.some((x) => /marqueur/.test(x)));
  assert.match(pat.etapes.find((e) => e.cle === "materiel").liste.find((x) => /Aiguilles/.test(x)), /en rond/);
  assert.match(pat.etapes.find((e) => e.cle === "rabattage").texte, /souplement.*passer la tête/);
  assert.match(pat.techniques.rabattage.titre, /souple/i);
  assert.equal(pat.techniques.lisiere, undefined);
  assert.ok(pat.rangs.every((r) => !r.lignes.some((l) => l.zone === "lisiere")));
  assert.match(pat.rangs.find((r) => r.type === "motif").repere, /tour 1 du motif/);
  assert.match(pat.etapes.find((e) => e.cle === "bloc").detail, /tours 1 à/);
});

test("patron du snood : consigne du marqueur avant le tour, expliquée la première fois", () => {
  const pat = patronSnood();
  const avec = pat.rangs.filter((r) => r.marqueur);
  assert.ok(avec.length > 0);
  const premier = avec[0];
  assert.equal(premier.lignes[0].zone, "marqueur");
  assert.equal(premier.lignes[0].texte, "Avant ce tour, déplace le marqueur de 2 mailles vers la gauche : glisse 2 mailles sans les tricoter, puis replace le marqueur.");
  assert.ok(premier.techniques.includes("marqueur"));
  assert.ok(!avec[1].techniques.includes("marqueur"));
  assert.ok(pat.techniques.marqueur);
  const retour = avec.find((r) => r.marqueur.raison === "retour");
  assert.match(retour.lignes[0].texte, /sa place de départ/);
  // Un tour avec déplacement n'est pas « comme » un tour sans.
  const sans = pat.rangs.find((r) => r.blocId === "corps" && r.numeroMotif === 2 && !r.marqueur);
  if (sans) assert.notEqual(premier.commeLeRang, sans.numero);
  assert.ok(pat.points.etoile.rond.marqueur);
  const bloc = pat.blocs.find((b) => b.zone === "corps");
  const repete = rangsCondenses(pat, bloc).find((x) => x.repete);
  assert.equal(repete.repete.marqueur, true);
});

test("patron du snood : changement de laine au début du tour, avec la petite marche", () => {
  const pat = patronSnood("riz", (p) => avecLaineDuBloc(p, "haut", "L2"), [laine, bleue]);
  const chgt = pat.rangs.find((r) => r.lignes.some((l) => l.zone === "laine"));
  assert.match(chgt.lignes.find((l) => l.zone === "laine").texte, /commence le tour avec « Bleue »/);
  assert.ok(chgt.techniques.includes("laineRond"));
  assert.match(pat.techniques.laineRond.explication, /petite marche/);
});

test("fil en attente en rond : pas besoin d'un nombre pair de tours", () => {
  const c = changementsDeLaine(["a", "a", "b", "b", "b", "a", "a"], { filPorte: true, rond: true });
  assert.equal(c.parRang.get(2).porter, true);
  const plat = changementsDeLaine(["a", "a", "b", "b", "b", "a", "a"], { filPorte: true });
  assert.equal(plat.parRang.get(2).porter, false);
});

test("bande ajoutée et colonnes dans un snood : patron juste", () => {
  const pat = patronSnood("riz", (p) => {
    const { projet } = ajouterBloc(p, { type: "bande", position: "milieu", pointId: "sillon", hauteurCm: 4 });
    return avecPointDeColonne(diviserBloc(projet, "corps", 4), "corps", diviserBloc(projet, "corps", 4).blocs.find((b) => b.id === "corps").colonnes[1].id, "jersey");
  });
  assert.ok(pat.rangs.length > 40);
  assert.ok(pat.etapes.some((e) => /depuis le marqueur/.test(e.texte || "")));
});
