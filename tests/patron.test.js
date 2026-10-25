// Tests du générateur de patron (E3-7) et du suivi (E3-8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS } from "../js/catalogue/points.js";
import { nouveauProjet, avecPointPrincipal, ajouterBloc, calculerProjet, etatCreationPatron, texteSuivi } from "../js/donnees/projets.js";
import {
  genererPatron, decrireGestes, rangsCondenses, nouveauSuivi, cocherRang, decocherRang, projetVariante,
} from "../js/moteur/patron.js";

const laine = { id: "L1", nom: "Mérinos", couleur: "#D07E5B", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 8 } };
const aiguilles = { id: "A1", tailleMm: "5", cableCm: "80" };
const echRiz = { id: "E1", laineId: "L1", pointId: "riz", tailleAiguille: 5, maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-10-24" };

function projetAvec(corps, autres = {}) {
  let p = avecPointPrincipal({ ...nouveauProjet(), id: "P1", laineId: "L1", aiguillesId: "A1", echantillonId: "E1" }, corps);
  if (autres.bas) p = { ...p, blocs: p.blocs.map((b) => (b.zone === "bas" ? { ...b, pointId: autres.bas } : b)) };
  return p;
}

function patronPour(projet, echantillons = [echRiz]) {
  const c = calculerProjet({ projet, laine, aiguilles, echantillons });
  assert.equal(c.ok, true, JSON.stringify(c.erreurs));
  return genererPatron({ projet, plan: c.plan, laine, aiguilles, echantillon: c.echantillon, densites: c.densites, metrage: c.metrage, laineSuffit: c.laineSuffit });
}

test("décrire des gestes : motif répété, mailles identiques", () => {
  assert.equal(decrireGestes(["end", "end", "end"]), "3 mailles endroit");
  assert.equal(decrireGestes(["end", "env", "end", "env", "end"]), "*1 maille endroit, 1 maille envers* 2 fois, 1 maille endroit");
  assert.equal(decrireGestes(["env", "end", "end", "env", "end", "end"]), "*1 maille envers, 2 mailles endroit* 2 fois");
});

test("patron d'une écharpe riz : étapes, rangs, lisières et vérification", () => {
  const p = patronPour(projetAvec("riz"));
  assert.deepEqual(p.etapes.map((e) => e.cle), ["materiel", "montage", "bloc", "bloc", "bloc", "rabattage", "finitions"]);
  assert.equal(p.approximatif, false);
  assert.equal(p.rangs[0].numero, 1);
  assert.ok(p.rangs[0].techniques.includes("lisiere"));
  for (const r of p.rangs) {
    assert.ok(r.lignes.length >= 1);
    assert.match(r.lignes[0].texte, /Glisse la 1re maille/);
    assert.match(r.lignes.at(-1).texte, /dernière maille à l'endroit/);
    assert.ok(r.mailles > 0);
  }
  // Les longueurs tricotées montent jusqu'à la longueur de l'écharpe.
  assert.ok(Math.abs(p.rangs.at(-1).longueurCm - p.dimensions.longueurCm) < 0.2);
  // Le montage annonce le nombre de mailles du premier rang.
  assert.equal(p.montage.mailles, p.rangs[0].mailles);
});

test("chaque point du catalogue donne un patron lisible au corps", () => {
  for (const point of POINTS) {
    const p = patronPour(projetAvec(point.id));
    assert.ok(p.rangs.length > 10, point.id);
    for (const r of p.rangs) for (const l of r.lignes) assert.ok(l.texte && !l.texte.includes("undefined"), `${point.id} rang ${r.numero}`);
    // La liste condensée de chaque bloc couvre tous ses rangs.
    for (const b of p.blocs) {
      const liste = rangsCondenses(p, b);
      const couverts = liste.reduce((t, x) => t + (x.rang ? 1 : x.repete.rangs), 0);
      assert.equal(couverts, b.dernierRang - b.premierRang + 1, `${point.id} : ${b.nom}`);
    }
  }
});

test("bande au milieu du corps : deux parties de corps nommées", () => {
  const { projet } = ajouterBloc(projetAvec("riz"), { type: "bande", position: "milieu", pointId: "torsade-gauche", hauteurCm: 10 });
  const p = patronPour(projet);
  assert.deepEqual(p.blocs.map((b) => b.nom), ["bordure du bas", "corps, partie 1", "bande", "corps, partie 2", "bordure du haut"]);
  assert.ok(p.rangs.some((r) => r.techniques.includes("T3/3G")));
});

test("sans échantillon tricoté : patron approximatif ; sans étiquette : pas de patron", () => {
  const projet = { ...projetAvec("ble"), echantillonId: "" };
  const c = calculerProjet({ projet, laine: { ...laine, echantillonEtiquette: { mailles: 18, rangs: 24, aiguilleMm: 5 } }, aiguilles, echantillons: [] });
  const etat = etatCreationPatron(projet, c);
  assert.equal(etat.possible, true);
  assert.equal(etat.approximatif, true);
  const sansRien = calculerProjet({ projet, laine, aiguilles, echantillons: [] });
  assert.equal(etatCreationPatron(projet, sansRien).possible, false);
});

test("suivi : cocher, revenir, progression, variante", () => {
  const p = patronPour(projetAvec("riz"));
  let s = nouveauSuivi(p);
  s = cocherRang(s, p.rangs.length);
  s = cocherRang(s, p.rangs.length);
  assert.equal(s.rangsFaits, 2);
  s = decocherRang(s);
  assert.equal(s.rangsFaits, 1);
  const projet = { statut: "patron", patron: { nbRangs: p.rangs.length } };
  assert.match(texteSuivi(projet, s), /^Rang 2 sur \d+ · 0 %$/);
  const v = projetVariante(p);
  assert.equal(v.statut, "conception");
  assert.equal(v.id, undefined);
  assert.equal(v.blocs.length, p.projet.blocs.length);
});
