// Tests de E3c : laines du projet, sections du corps, damier, intarsia (à plat).
import { test } from "node:test";
import assert from "node:assert/strict";
import { genererPatron } from "../js/moteur/patron.js";
import { verifierPlan } from "../js/moteur/plan.js";
import {
  nouveauProjet, avecPointPrincipal, avecPointDuBloc, calculerProjet, diviserBloc, ajouterBloc, idsLainesDuProjet, lainesDuProjet,
  avecLaineDuProjet, sansLaineDuProjet, blocsDeLaLaine, avecLainePrincipale, avecLaineDuBloc, avecLaineDeColonne, laineDeColonne,
  blocEnIntarsia, petitesPelotes, diviserEnSections, sansSections, sectionsDuProjet, enSections, numeroSection, nomBloc,
  avecHauteurSection, repartirSections, faireUnDamier, defaireLeDamier, estUnDamier, coloriable, plusieursLaines,
} from "../js/donnees/projets.js";

const rose = { id: "L1", nom: "Mérinos rose", couleur: "#D9A0A6", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 8 } };
const gris = { id: "L2", nom: "Alpaga gris", couleur: "#8E8A86", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 4 } };
const fine = { id: "L3", nom: "Coton fin", couleur: "#EEE2C8", epaisseur: "fingering" };
const laines = [rose, gris, fine];
const aiguilles = { id: "A1", tailleMm: "5", cableCm: "40" };
const ech = (pointId) => ({ id: "E1", laineId: "L1", pointId, tailleAiguille: 5, maillesPour10cm: 17, rangsPour10cm: 26, date: "2026-11-02" });

function echarpe(point = "jersey") {
  const p = avecPointPrincipal({ ...nouveauProjet({ type: "echarpe" }), id: "P1", laineId: "L1", aiguillesId: "A1" }, point);
  return p;
}
function snood(point = "jersey") {
  return avecPointPrincipal({ ...nouveauProjet({ type: "snood" }), id: "P2", laineId: "L1", aiguillesId: "A1" }, point);
}
const calcul = (projet, point = projet.pointPrincipal) => calculerProjet({ projet, laine: rose, aiguilles, echantillons: [ech(point)], laines });
const patron = (projet) => {
  const c = calcul(projet);
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  const lainesP = lainesDuProjet(projet, laines);
  return { c, p: genererPatron({ projet, plan: c.plan, laine: rose, aiguilles, echantillon: c.echantillon, densites: c.densites, metrage: c.metrage, laineSuffit: c.laineSuffit, laines: lainesP, parLaine: c.parLaine }) };
};

// ---------------- E3c-1 : laines du projet ----------------

test("laines du projet : principale, autres, et projets d'avant 0.16.0 sans migration", () => {
  let p = echarpe();
  assert.deepEqual(p.autresLaines, []);
  p = avecLaineDuProjet(p, "L2");
  p = avecLaineDuProjet(p, "L2");
  assert.deepEqual(idsLainesDuProjet(p), ["L1", "L2"]);
  // Ancien projet : une bordure dans une autre laine, sans autresLaines.
  const ancien = { ...echarpe(), autresLaines: undefined, blocs: echarpe().blocs.map((b) => (b.id === "bas" ? { ...b, laineId: "L3" } : b)) };
  assert.deepEqual(idsLainesDuProjet(ancien), ["L1", "L3"]);
  assert.deepEqual(lainesDuProjet(ancien, laines).map((l) => l.id), ["L1", "L3"]);
  // Une laine disparue de la réserve est ignorée.
  assert.deepEqual(lainesDuProjet(avecLaineDuProjet(p, "X"), laines).map((l) => l.id), ["L1", "L2"]);
});

test("retirer une laine : ses blocs et ses colonnes reprennent la laine principale", () => {
  let p = avecLaineDuProjet(echarpe(), "L2");
  p = avecLaineDuBloc(p, "bas", "L2");
  p = diviserBloc(p, "corps", 2);
  p = avecLaineDeColonne(p, "corps", p.blocs.find((b) => b.id === "corps").colonnes[1].id, "L2");
  assert.equal(blocsDeLaLaine(p, "L2"), 2);
  const q = sansLaineDuProjet(p, "L2");
  assert.deepEqual(idsLainesDuProjet(q), ["L1"]);
  assert.equal(blocsDeLaLaine(q, "L2"), 0);
  assert.equal(plusieursLaines(q), false);
  // Changer la laine principale pour une des autres : elle sort des autres.
  const r = avecLainePrincipale(p, "L2");
  assert.equal(r.laineId, "L2");
  assert.ok(!r.autresLaines.includes("L2"));
});

test("avertissement d'épaisseur seulement pour une laine utilisée", () => {
  let p = avecLaineDuProjet(echarpe(), "L3");
  assert.equal(calcul(p).avertissements.length, 0);
  p = avecLaineDuBloc(p, "haut", "L3");
  assert.equal(calcul(p).avertissements.length, 1);
});

// ---------------- E3c-2 : sections ----------------

test("diviser en sections : section 1 en bas au point principal, sections paires dans un autre point", () => {
  const p = diviserEnSections(echarpe("jersey"), 4);
  const s = sectionsDuProjet(p);
  assert.equal(s.length, 4);
  assert.equal(enSections(p), true);
  assert.equal(s[0].id, "corps");
  assert.deepEqual(s.map((b) => b.pointId), ["jersey", "riz", "jersey", "riz"]);
  assert.equal(numeroSection(p, s[2]), 3);
  assert.equal(nomBloc(s[1], p), "Section 2");
  assert.equal(coloriable(s[1]), true);
  assert.equal(coloriable(sansSections(p).blocs.find((b) => b.zone === "corps")), false);
  // Les bordures restent autour.
  assert.deepEqual(p.blocs.map((b) => b.zone), ["bas", "corps", "corps", "corps", "corps", "haut", "cotes"]);
});

test("une bande au milieu du corps reste à sa place quand on divise en sections", () => {
  const avecBande = ajouterBloc(echarpe(), { type: "bande", position: "milieu", pointId: "sillon", hauteurCm: 10 }).projet;
  const p = diviserEnSections(avecBande, 4);
  const zones = p.blocs.filter((b) => b.zone !== "cotes").map((b) => (b.zone === "corps" ? "S" : b.zone));
  assert.deepEqual(zones, ["bas", "S", "S", "bande", "S", "S", "haut"]);
});

test("changer le point de la section 1 change le point principal, pas les autres sections", () => {
  let p = diviserEnSections(echarpe("jersey"), 3);
  const s = sectionsDuProjet(p);
  p = avecPointDuBloc(p, s[1].id, "ble");
  assert.equal(p.pointPrincipal, "jersey");
  assert.equal(sectionsDuProjet(p)[1].pointId, "ble");
  p = avecPointDuBloc(p, "corps", "mousse");
  assert.equal(p.pointPrincipal, "mousse");
  assert.deepEqual(sectionsDuProjet(p).map((b) => b.pointId), ["mousse", "ble", "jersey"]);
});

test("plan : sections de points différents, chacune vérifiée, transitions expliquées si besoin", () => {
  const p = diviserEnSections(echarpe("jersey"), 4);
  const c = calcul(p);
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  const sec = c.plan.blocs.filter((b) => b.section);
  assert.equal(sec.length, 4);
  assert.deepEqual(sec.map((b) => b.nom), ["section 1", "section 2", "section 3", "section 4"]);
  // Hauteurs à peu près égales (au motif près).
  const h = sec.map((b) => b.hauteurCm);
  assert.ok(Math.max(...h) - Math.min(...h) < 2, h.join(" "));
  assert.equal(verifierPlan(c.plan).ok, true);
  // Le riz tombe juste sur le nombre de mailles du jersey ou un rang de transition le dit.
  for (const b of sec.slice(1)) {
    const tr = c.plan.rangs.filter((r) => r.blocId === b.id && r.type === "transition").length;
    if (b.maillesCorps !== sec[0].maillesCorps) assert.equal(tr, 1);
  }
});

test("hauteur fixée d'une section : elle reste, les autres se partagent le reste ; jamais toutes fixées", () => {
  let p = diviserEnSections(echarpe("jersey"), 3);
  const s = sectionsDuProjet(p);
  p = avecHauteurSection(p, s[0].id, 20);
  const c = calcul(p);
  assert.equal(c.ok, true);
  const sec = c.plan.blocs.filter((b) => b.section);
  assert.ok(Math.abs(sec[0].hauteurCm - 20) < 1, String(sec[0].hauteurCm));
  assert.ok(Math.abs(sec[1].hauteurCm - sec[2].hauteurCm) < 1.5);
  p = avecHauteurSection(p, s[1].id, 30);
  p = avecHauteurSection(p, s[2].id, 30);
  assert.equal(sectionsDuProjet(p).filter((b) => b.hauteurCm > 0).length, 2);
  assert.equal(repartirSections(p).blocs.some((b) => b.section && b.hauteurCm), false);
  // Trop haut : le plan le dit.
  const q = avecHauteurSection(diviserEnSections(echarpe(), 2), "corps", 175);
  assert.equal(calcul(q).ok, false);
});

test("ne plus diviser : un seul corps, point et laine principaux", () => {
  let p = avecLaineDuProjet(diviserEnSections(echarpe("jersey"), 4), "L2");
  p = avecLaineDuBloc(p, sectionsDuProjet(p)[1].id, "L2");
  const q = sansSections(p);
  const corps = q.blocs.filter((b) => b.zone === "corps");
  assert.equal(corps.length, 1);
  assert.deepEqual(corps[0], { id: "corps", zone: "corps", pointId: "jersey" });
});

test("une laine par section : changement de laine au premier rang de la section, nommée dans le patron", () => {
  let p = avecLaineDuProjet(diviserEnSections(echarpe("jersey"), 4), "L2");
  const s = sectionsDuProjet(p);
  p = avecLaineDuBloc(p, s[1].id, "L2");
  p = avecLaineDuBloc(p, s[3].id, "L2");
  const { c, p: pat } = patron(p);
  const b2 = c.plan.blocs.find((b) => b.id === s[1].id);
  assert.equal(b2.laineId, "L2");
  const r = pat.rangs.find((x) => x.numero === b2.premierRang);
  assert.ok(r.lignes.some((l) => l.zone === "laine" && l.texte.includes("Alpaga gris")), JSON.stringify(r.lignes[0]));
  const etape = pat.etapes.find((e) => e.blocId === s[1].id);
  assert.equal(etape.titre, "Section 2");
  assert.ok(etape.detail.includes("Alpaga gris"));
  assert.ok(c.parLaine.some((x) => x.laineId === "L2"));
});

test("snood en sections : des anneaux, la laine change au début du tour", () => {
  let p = avecLaineDuProjet(diviserEnSections(snood("jersey"), 3), "L2");
  p = avecLaineDuBloc(p, sectionsDuProjet(p)[1].id, "L2");
  const { c, p: pat } = patron(p);
  assert.equal(c.plan.blocs.filter((b) => b.section).length, 3);
  const b2 = c.plan.blocs.find((b) => b.section && b.laineId === "L2");
  const r = pat.rangs.find((x) => x.numero === b2.premierRang);
  assert.ok(r.lignes.some((l) => l.zone === "laine"));
  // Pas d'intarsia en rond : une laine de colonne est ignorée.
  let q = diviserBloc(p, sectionsDuProjet(p)[0].id, 2);
  const s0 = sectionsDuProjet(q)[0];
  q = avecLaineDeColonne(q, s0.id, s0.colonnes[1].id, "L2");
  assert.equal(blocEnIntarsia(q, sectionsDuProjet(q)[0], laines), false);
  assert.equal(laineDeColonne(q, s0, sectionsDuProjet(q)[0].colonnes[1], laines), null);
  const cq = calcul(q);
  assert.equal(cq.ok, true, JSON.stringify(cq.erreurs));
  assert.equal(cq.plan.blocs.some((b) => b.intarsia), false);
});

// ---------------- E3c-3 : damier ----------------

test("faire un damier : toutes les sections en colonnes, points et laines décalés d'une colonne", () => {
  let p = avecLaineDuProjet(diviserEnSections(echarpe("jersey"), 3), "L2");
  const s1 = sectionsDuProjet(p)[0];
  p = diviserBloc(p, s1.id, 4);
  const cols = p.blocs.find((b) => b.id === s1.id).colonnes;
  p = avecLaineDeColonne(p, s1.id, cols[1].id, "L2");
  p = avecLaineDeColonne(p, s1.id, cols[3].id, "L2");
  p = faireUnDamier(p, s1.id);
  assert.equal(estUnDamier(p), true);
  const s = sectionsDuProjet(p);
  const lainesDe = (b) => b.colonnes.map((c) => c.laineId || "L1");
  assert.deepEqual(lainesDe(s[0]), ["L1", "L2", "L1", "L2"]);
  assert.deepEqual(lainesDe(s[1]), ["L2", "L1", "L2", "L1"]);
  assert.deepEqual(s[1].colonnes.map((c) => c.pointId), ["riz", "jersey", "riz", "jersey"]);
  const c = calcul(p);
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  // Colonnes alignées d'une section à l'autre.
  const reps = c.plan.blocs.filter((b) => b.section).map((b) => b.colonnes.map((x) => x.mailles).join(","));
  assert.equal(new Set(reps).size, 1, reps.join(" | "));
  assert.equal(estUnDamier(defaireLeDamier(p)), false);
});

// ---------------- E3c-4 : intarsia ----------------

test("intarsia : petites pelotes, colonnes nommées avec leur laine, bandes latérales de la laine voisine", () => {
  let p = avecLaineDuProjet(echarpe("jersey"), "L2");
  p = diviserBloc(p, "corps", 4);
  const cols = p.blocs.find((b) => b.id === "corps").colonnes;
  p = avecLaineDeColonne(p, "corps", cols[0].id, "L2");
  p = avecLaineDeColonne(p, "corps", cols[2].id, "L2");
  const corps = p.blocs.find((b) => b.id === "corps");
  assert.equal(blocEnIntarsia(p, corps, laines), true);
  assert.deepEqual(petitesPelotes(p, corps, laines), [{ laineId: "L2", nombre: 2 }, { laineId: null, nombre: 2 }]);
  const { c, p: pat } = patron(p);
  const pb = c.plan.blocs.find((b) => b.id === "corps");
  assert.equal(pb.intarsia, true);
  const r = c.plan.rangs.find((x) => x.blocId === "corps" && x.type === "motif");
  assert.equal(r.intarsia, true);
  const droite = r.segments.find((x) => x.zone === "bandeD");
  const gauche = r.segments.find((x) => x.zone === "bandeG");
  assert.equal(droite.laineId, "L2"); // colonne 1
  assert.equal(gauche.laineId, null); // colonne 4, laine principale
  // Patron : préparation des pelotes, technique, colonnes nommées, découpe en sortie.
  const premier = pat.rangs.find((x) => x.numero === pb.premierRang);
  assert.ok(premier.lignes[0].texte.includes("prépare 4 petites pelotes"), premier.lignes[0].texte);
  assert.ok(premier.techniques.includes("intarsia"));
  assert.ok(pat.techniques.intarsia);
  const motif = pat.rangs.find((x) => x.blocId === "corps" && x.type === "motif");
  const cols2 = motif.lignes.filter((l) => l.etiquette?.startsWith("Col."));
  assert.equal(cols2.length, 4);
  assert.ok(cols2[0].couleur);
  const apres = pat.rangs.find((x) => x.numero === pb.dernierRang + 1);
  assert.ok(apres.lignes[0].texte.startsWith("Coupe les petites pelotes"), apres.lignes[0].texte);
  assert.ok(pat.etapes[0].liste.some((x) => x.includes("4 petites pelotes")));
  // Bouts : 2 par petite pelote, en plus du montage et du rabattage.
  assert.ok(pat.bouts >= 2 + 8, String(pat.bouts));
  // Métrage colonne par colonne.
  const m = c.metrage.parBloc.filter((x) => x.blocId === "corps" && x.colonneId);
  assert.deepEqual(m.map((x) => x.laineId), ["L2", null, "L2", null]);
});

test("intarsia : le fil porté ne s'applique pas", () => {
  let p = { ...avecLaineDuProjet(echarpe("jersey"), "L2"), filPorte: true };
  p = diviserBloc(p, "corps", 2);
  const cols = p.blocs.find((b) => b.id === "corps").colonnes;
  p = avecLaineDeColonne(p, "corps", cols[1].id, "L2");
  const { p: pat } = patron(p);
  assert.ok(!pat.rangs.some((r) => r.lignes.some((l) => l.texte.includes("en attente"))));
});
