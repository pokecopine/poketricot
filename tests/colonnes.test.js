// Tests de E3b : colonnes (découpe dans la largeur) et blocs d'une autre laine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { consomme, produit, maillesConviennent } from "../js/moteur/simulateur.js";
import { densitesDuProjet } from "../js/moteur/densite.js";
import { planEcharpe, verifierPlan } from "../js/moteur/plan.js";
import { repartirMailles, totauxEgaux, motifCommun, maillesVoisines } from "../js/moteur/colonnes.js";
import { metrageNecessaire } from "../js/moteur/metrage.js";
import { genererPatron, changementsDeLaine, rangsCondenses } from "../js/moteur/patron.js";
import {
  nouveauProjet, avecPointPrincipal, ajouterBloc, calculerProjet, diviserBloc, nePlusDiviser, avecPointDeColonne,
  changerLargeurColonne, repartirEgalement, avecLaineDuBloc, lainesDuProjet, colonnesEgalesPossibles, apercuDecoupe,
  etatCreationPatron, avecHauteurBloc,
} from "../js/donnees/projets.js";

const laine = { id: "L1", nom: "Mérinos", couleur: "#D07E5B", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 8 } };
const bleue = { id: "L2", nom: "Alpaga bleu", couleur: "#3E5C8A", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 80, grammesParPelote: 50, pelotes: 1 } };
const fine = { id: "L3", nom: "Coton fin", couleur: "#EEE2C8", epaisseur: "fingering" };
const aiguilles = { id: "A1", tailleMm: "5", cableCm: "80" };
const echRiz = { id: "E1", laineId: "L1", pointId: "riz", tailleAiguille: 5, maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-10-24" };
const P = (id) => pointParId(id);
const col = (ids) => ids.map((pointId, i) => ({ id: `c${i + 1}`, pointId }));

function planAvec(blocs, { largeurCm = 20, longueurCm = 180 } = {}) {
  const ids = [...new Set(blocs.flatMap((b) => [b.pointId, ...(b.colonnes || []).map((c) => c.pointId)]))];
  const densites = densitesDuProjet({ pointIds: ids, laine, tailleAiguille: 5, echantillons: [echRiz], echantillonPrincipal: echRiz });
  return planEcharpe({ largeurCm, longueurCm, blocs, densites });
}

const echarpe = (corps, autres = []) => [
  { id: "bas", zone: "bas", pointId: "mousse", hauteurCm: 3 },
  ...autres,
  { id: "corps", zone: "corps", pointId: "riz", ...corps },
  { id: "haut", zone: "haut", pointId: "mousse", hauteurCm: 3 },
  { id: "cotes", zone: "cotes", pointId: "mousse", largeurMailles: 4 },
];

function verifierStructure(r) {
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  assert.equal(r.grille.length, r.plan.rangs.length);
  r.plan.rangs.forEach((rang, i) => {
    assert.equal(r.grille[i].length, rang.mailles, `rang ${rang.numero}`);
    if (i > 0) assert.notEqual(rang.cote, r.plan.rangs[i - 1].cote);
  });
}

// ---------------- Répartition ----------------

test("répartition : parts égales quand les motifs le permettent", () => {
  assert.deepEqual(repartirMailles(col(["jersey", "jersey", "jersey", "jersey"]).map((c) => ({ point: P(c.pointId) })), 32), [8, 8, 8, 8]);
  // Le riz demande un nombre impair : 4 colonnes de riz font un total pair.
  assert.deepEqual(repartirMailles([P("riz"), P("riz"), P("riz"), P("riz")].map((point) => ({ point })), 28), [7, 7, 7, 7]);
  assert.equal(repartirMailles([P("riz"), P("riz"), P("riz"), P("riz")].map((point) => ({ point })), 31), null);
  // Inégal mais juste : chaque colonne tombe sur son motif.
  const r = repartirMailles([P("riz"), P("jersey"), P("riz"), P("jersey")].map((point) => ({ point })), 23);
  assert.equal(r.reduce((t, m) => t + m, 0), 23);
  assert.ok(r[0] % 2 === 1 && r[2] % 2 === 1);
});

test("répartition : une largeur fixée est gardée, les autres se partagent le reste", () => {
  const r = repartirMailles([{ point: P("jersey"), mailles: 12 }, { point: P("jersey") }, { point: P("jersey") }], 32);
  assert.deepEqual(r, [12, 10, 10]);
  assert.equal(repartirMailles([{ point: P("riz"), mailles: 12 }, { point: P("jersey") }], 30), null); // 12 ne convient pas au riz
});

test("répartition : à égalité, les colonnes suivent celles d'un autre bloc (damier)", () => {
  const cols = [P("jersey"), P("jersey"), P("jersey")].map((point) => ({ point }));
  assert.deepEqual(repartirMailles(cols, 31, "plat", [11, 10, 10]), [11, 10, 10]);
  assert.deepEqual(repartirMailles(cols, 31, "plat", [10, 10, 11]), [10, 10, 11]);
});

test("totaux qui donnent des colonnes égales, motif commun, largeur voisine", () => {
  assert.deepEqual(totauxEgaux([P("riz"), P("riz"), P("riz"), P("riz")].map((point) => ({ point })), 23), { dessous: 20, dessus: 28 });
  assert.deepEqual(motifCommun([P("riz"), P("jersey")]), { L: 2, mep: 0 });
  assert.equal(maillesVoisines(P("riz"), 7, 1), 9);
  assert.equal(maillesVoisines(P("riz"), 7, -1), 5);
});

// ---------------- Plan ----------------

test("plan : corps en 4 colonnes, rangs vérifiés, colonne 1 au bord droit sur l'endroit", () => {
  const r = planAvec(echarpe({ colonnes: col(["riz", "jersey", "riz", "jersey"]) }));
  verifierStructure(r);
  const corps = r.plan.blocs.find((b) => b.id === "corps");
  assert.equal(corps.colonnes.length, 4);
  assert.equal(corps.colonnes.reduce((t, c) => t + c.mailles, 0), corps.maillesCorps);
  const endroit = r.plan.rangs.find((x) => x.blocId === "corps" && x.cote === "E");
  const envers = r.plan.rangs.find((x) => x.blocId === "corps" && x.cote === "V");
  assert.deepEqual(endroit.segments.filter((s) => s.zone === "corps").map((s) => s.colonne), [1, 2, 3, 4]);
  assert.deepEqual(envers.segments.filter((s) => s.zone === "corps").map((s) => s.colonne), [4, 3, 2, 1]);
  for (const s of endroit.segments.filter((s) => s.colonne)) {
    assert.equal(consomme(s.gestes), corps.colonnes[s.colonne - 1].mailles);
    assert.ok(maillesConviennent(P(s.pointId), consomme(s.gestes)));
  }
  assert.ok(r.explications.some((e) => e.startsWith("colonnes du corps")));
});

test("plan : des colonnes égales sont préférées, quitte à changer un peu la largeur", () => {
  const r = planAvec(echarpe({ colonnes: col(["jersey", "jersey", "jersey", "jersey"]) }));
  verifierStructure(r);
  const m = r.plan.blocs.find((b) => b.id === "corps").colonnes.map((c) => c.mailles);
  assert.ok(m.every((x) => x === m[0]), m.join(" · "));
  assert.ok(Math.abs(r.plan.largeur.reelleCm - 20) / 20 <= 0.1);
});

test("plan : damier — corps et bande en colonnes alignées, la bande dans une autre laine", () => {
  const r = planAvec(echarpe(
    { colonnes: col(["jersey", "mousse", "jersey"]) },
    [{ id: "bande", zone: "bande", pointId: "mousse", hauteurCm: 8, laineId: "L2", colonnes: col(["mousse", "jersey", "mousse"]) }],
  ));
  verifierStructure(r);
  const [corps, bande] = ["corps", "bande"].map((id) => r.plan.blocs.find((b) => b.id === id));
  assert.deepEqual(bande.colonnes.map((c) => c.mailles), corps.colonnes.map((c) => c.mailles));
  assert.equal(bande.laineId, "L2");
  assert.ok(r.plan.rangs.filter((x) => x.blocId === "bande").every((x) => x.laineId === "L2"));
  assert.ok(r.plan.rangs.filter((x) => x.blocId === "corps").every((x) => x.laineId === null));
});

test("plan : chaque point du catalogue en colonne avec le riz (ou une erreur claire sur le corps)", () => {
  let reussis = 0;
  for (const p of POINTS) {
    const r = planAvec(echarpe({ colonnes: col([p.id, "riz"]) }));
    if (r.ok) {
      verifierStructure(r);
      reussis++;
    } else {
      assert.equal(r.erreurs[0].nomBloc, "corps", `${p.id} : ${r.erreurs[0].message}`);
    }
  }
  assert.ok(reussis >= POINTS.length * 0.8, `${reussis} sur ${POINTS.length}`);
});

test("vérification : une colonne fausse est bloquée", () => {
  const plan = structuredClone(planAvec(echarpe({ colonnes: col(["riz", "jersey", "riz"]) })).plan);
  const rang = plan.rangs.find((x) => x.blocId === "corps" && x.type === "motif");
  const s = rang.segments.find((x) => x.colonne === 2);
  s.gestes[0] = s.gestes[0] === "end" ? "env" : "end";
  const v = verifierPlan(plan);
  assert.equal(v.ok, false);
  assert.equal(v.erreurs[0].nomBloc, "corps");
});

// ---------------- Métrage par laine ----------------

test("métrage : une part pour chaque laine, bandes latérales comprises, total inchangé", () => {
  const r = planAvec(echarpe({}, [{ id: "bande", zone: "bande", pointId: "mousse", hauteurCm: 10, laineId: "L2" }]));
  const m = metrageNecessaire({ plan: r.plan, laine, echantillon: echRiz, densiteJersey: { mailles: 17, rangs: 23 } });
  assert.deepEqual(m.parLaine.map((x) => x.laineId).sort(), ["L2", null].sort());
  const somme = m.parLaine.reduce((t, x) => t + x.metresSansMarge, 0);
  assert.ok(Math.abs(somme - m.metresSansMarge) < 1e-6);
  const autre = m.parLaine.find((x) => x.laineId === "L2");
  assert.ok(autre.metres > 5 && autre.metres < m.metres / 4, `${autre.metres} m pour 10 cm de bande`);
});

// ---------------- Changements de laine ----------------

test("changements de laine : coupée par défaut, portée si l'option est choisie et la bande est fine et paire", () => {
  const rangs = [...Array(10).fill("A"), ...Array(4).fill("B"), ...Array(10).fill("A")];
  const coupe = changementsDeLaine(rangs);
  assert.equal(coupe.bouts, 6);
  assert.deepEqual([...coupe.parRang.keys()], [10, 14]);
  assert.equal(coupe.parRang.get(10).porter, false);
  const porte = changementsDeLaine(rangs, { filPorte: true });
  assert.equal(porte.parRang.get(10).porter, true);
  assert.equal(porte.parRang.get(14).reprise, true);
  assert.equal(porte.bouts, 4);
  assert.deepEqual([...porte.croisements], [12]);
  // Bande impaire ou trop haute : coupée même avec l'option.
  assert.equal(changementsDeLaine([...Array(4).fill("A"), ...Array(5).fill("B"), "A"], { filPorte: true }).parRang.get(4).porter, false);
  assert.equal(changementsDeLaine([...Array(4).fill("A"), ...Array(12).fill("B"), "A"], { filPorte: true }).parRang.get(4).porter, false);
  assert.equal(changementsDeLaine(Array(8).fill("A")).bouts, 2);
});

// ---------------- Projet, calcul et patron ----------------

function projetBase() {
  return avecPointPrincipal({ ...nouveauProjet(), id: "P1", laineId: "L1", aiguillesId: "A1", echantillonId: "E1" }, "riz");
}

test("projet : diviser, changer le point d'une colonne, élargir, répartir, ne plus diviser", () => {
  let p = diviserBloc(projetBase(), "corps", 4);
  const corps = () => p.blocs.find((b) => b.id === "corps");
  assert.deepEqual(corps().colonnes.map((c) => c.pointId), ["riz", "jersey", "riz", "jersey"]);
  p = avecPointDeColonne(p, "corps", corps().colonnes[1].id, "mousse");
  assert.equal(corps().colonnes[1].pointId, "mousse");
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [echRiz] });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  const pb = c.plan.blocs.find((b) => b.id === "corps");
  const actuelles = pb.colonnes.map((x) => x.mailles);
  const plusLarge = changerLargeurColonne(p, "corps", corps().colonnes[0].id, 1, { total: pb.maillesCorps, actuelles });
  assert.equal(plusLarge.blocs.find((b) => b.id === "corps").colonnes[0].mailles, actuelles[0] + 2); // riz : impair suivant
  const c2 = calculerProjet({ projet: plusLarge, laine, aiguilles, echantillons: [echRiz] });
  assert.equal(c2.ok, true);
  assert.equal(c2.plan.blocs.find((b) => b.id === "corps").colonnes[0].mailles, actuelles[0] + 2);
  assert.equal(repartirEgalement(plusLarge, "corps").blocs.find((b) => b.id === "corps").colonnes[0].mailles, undefined);
  assert.equal(nePlusDiviser(p, "corps").blocs.find((b) => b.id === "corps").colonnes, undefined);
  // Garder ses colonnes en changeant leur nombre.
  assert.equal(diviserBloc(p, "corps", 2).blocs.find((b) => b.id === "corps").colonnes[1].pointId, "mousse");
  // Aperçu d'une découpe et totaux pour des colonnes égales.
  assert.equal(apercuDecoupe(projetBase(), "corps", 4, 23).mailles.reduce((t, m) => t + m, 0), 23);
  assert.deepEqual(colonnesEgalesPossibles({ colonnes: col(["riz", "riz", "riz", "riz"]) }, 23).dessus, { total: 28, parColonne: 7 });
});

test("projet : une bande dans une autre laine — métrage, avertissement d'épaisseur, patron", () => {
  let { projet: p, blocId } = ajouterBloc(projetBase(), { type: "bande", position: "milieu", pointId: "mousse", hauteurCm: 6 });
  p = avecLaineDuBloc(p, blocId, "L2");
  assert.deepEqual(lainesDuProjet(p, [laine, bleue, fine]).map((l) => l.id), ["L1", "L2"]);
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [echRiz], laines: [laine, bleue, fine] });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  assert.deepEqual(c.parLaine.map((x) => x.laineId), ["L1", "L2"]);
  assert.equal(c.avertissements.length, 0);
  assert.ok(etatCreationPatron(p, c).possible);

  // Une laine d'une autre épaisseur : avertissement.
  const c3 = calculerProjet({ projet: avecLaineDuBloc(p, blocId, "L3"), laine, aiguilles, echantillons: [echRiz], laines: [laine, bleue, fine] });
  assert.match(c3.avertissements[0], /Coton fin/);
  // Une laine disparue de la réserve : le bloc reprend la laine principale.
  const c4 = calculerProjet({ projet: p, laine, aiguilles, echantillons: [echRiz], laines: [laine] });
  assert.equal(c4.parLaine.length, 1);
  // Revenir à la laine principale enlève le réglage.
  assert.equal(avecLaineDuBloc(p, blocId, "L1").blocs.find((b) => b.id === blocId).laineId, undefined);

  const patron = genererPatron({
    projet: p, plan: c.plan, laine, aiguilles, echantillon: c.echantillon, densites: c.densites, metrage: c.metrage,
    laineSuffit: c.laineSuffit, laines: lainesDuProjet(p, [laine, bleue]), parLaine: c.parLaine,
  });
  assert.equal(patron.laines.length, 2);
  assert.ok(patron.etapes[0].liste.some((x) => x.startsWith("Alpaga bleu : environ")));
  const changements = patron.rangs.filter((r) => r.lignes[0].zone === "laine");
  assert.equal(changements.length, 2);
  assert.match(changements[0].lignes[0].texte, /Coupe « Mérinos ».*commence le rang avec « Alpaga bleu »/);
  assert.ok(changements[0].techniques.includes("laine"));
  assert.equal(patron.bouts, 6);
  assert.match(patron.etapes.at(-1).texte, /6 bouts de fil/);
  for (const b of patron.blocs) {
    const couverts = rangsCondenses(patron, b).reduce((t, x) => t + (x.rang ? 1 : x.repete.rangs), 0);
    assert.equal(couverts, b.dernierRang - b.premierRang + 1);
  }

  // Avec l'option fil porté, une bande fine (1 cm, nombre de rangs pair) garde la laine principale en attente.
  const fine1 = avecHauteurBloc({ ...p, filPorte: true }, blocId, 1);
  const cp = calculerProjet({ projet: fine1, laine, aiguilles, echantillons: [echRiz], laines: [laine, bleue] });
  const bande = cp.plan.blocs.find((b) => b.id === blocId);
  assert.ok(bande.rangs % 2 === 0 && bande.rangs <= 8, `${bande.rangs} rangs`);
  const pat = genererPatron({ projet: fine1, plan: cp.plan, laine, aiguilles, densites: cp.densites, laines: [laine, bleue], parLaine: cp.parLaine });
  assert.equal(pat.bouts, 4);
  assert.ok(pat.rangs.some((r) => r.techniques.includes("porte")));
  assert.ok(pat.rangs.some((r) => /croise le fil/.test(r.lignes[0].texte)) || bande.rangs <= 2);
  assert.match(pat.rangs.find((r) => r.numero === bande.dernierRang + 1).lignes[0].texte, /reprends « Mérinos », qui attend au bord/);
});

test("patron : colonnes écrites chacune sur sa ligne", () => {
  const p = diviserBloc(projetBase(), "corps", 3);
  const c = calculerProjet({ projet: p, laine, aiguilles, echantillons: [echRiz] });
  const patron = genererPatron({ projet: p, plan: c.plan, laine, aiguilles, densites: c.densites, metrage: c.metrage });
  const rang = patron.rangs.find((r) => r.blocId === "corps" && r.type === "motif");
  const etiquettes = rang.lignes.filter((l) => l.etiquette?.startsWith("Colonne")).map((l) => l.etiquette);
  assert.equal(etiquettes.length, 3);
  assert.match(etiquettes[0], /^Colonne 1 · point de riz \(\d+ m\.\)$/);
  assert.match(rang.repere, /^Corps en colonnes · rang/);
  assert.match(patron.etapes.find((e) => e.blocId === "corps").texte, /colonne 1 en point de riz/);
  assert.ok(patron.points.jersey && patron.points.riz);
});
