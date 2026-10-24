// Tests des règles des projets en conception (E3-1 à E3-3).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nouveauProjet, nomPropose, conseilAiguille, echantillonDuProjet, avecPointPrincipal, avecPointDuBloc, materielManquant,
  calculerProjet, trierProjets, texteEtat, cheminEtape, zoneAvis, detailLaineProjet, nomCouleurLaine,
} from "../js/donnees/projets.js";

const laine = {
  id: "L1", nom: "Mérinos", epaisseur: "aran", couleur: "#D07E5B",
  quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 4 },
  echantillonEtiquette: { mailles: 18, aiguilleMm: 5 },
};
const aiguilles = { id: "A1", tailleMm: 5, cableCm: 80 };
const ech = { id: "E1", laineId: "L1", tailleAiguille: 5, pointId: "riz", maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-10-12" };

test("un nouveau projet d'écharpe : taille classique adulte, bordures et bandes en mousse", () => {
  const p = nouveauProjet();
  assert.deepEqual([p.type, p.statut, p.etape, p.nom, p.nomAuto], ["echarpe", "conception", 1, "Écharpe", true]);
  assert.deepEqual(p.taille, { public: "adulte", preset: "classique", longueurCm: 180, largeurCm: 20 });
  assert.deepEqual(p.blocs.map((b) => [b.zone, b.pointId]), [["bas", "mousse"], ["corps", ""], ["haut", "mousse"], ["cotes", "mousse"]]);
  assert.equal(nouveauProjet({ nom: " Écharpe d'hiver " }).nomAuto, false);
});

test("nom proposé avec la couleur de la laine", () => {
  assert.equal(nomPropose("echarpe", laine), "Écharpe terracotta");
  assert.equal(nomCouleurLaine("#2E2A28"), "noir");
  assert.ok(nomPropose("echarpe", { couleur: "#2050C0" }).startsWith("Écharpe bleu"));
});

test("détail de la laine et conseil d'aiguille", () => {
  assert.equal(detailLaineProjet(laine), "Aran · 400 m disponibles");
  assert.deepEqual(conseilAiguille(laine, 5).ok, true);
  const unPeu = conseilAiguille(laine, 4.5);
  assert.equal(unPeu.ok, true);
  assert.match(unPeu.texte, /un peu fin/);
  assert.equal(conseilAiguille(laine, 3).ok, false);
  assert.equal(conseilAiguille({ epaisseur: "super-bulky" }, 12).ok, true);
});

test("échantillon du projet : retrouvé par laine, point et taille d'aiguille", () => {
  const p = { ...avecPointPrincipal(nouveauProjet(), "riz"), laineId: "L1", aiguillesId: "A1" };
  assert.equal(echantillonDuProjet(p, aiguilles, [ech]).id, "E1");
  assert.equal(echantillonDuProjet(p, { tailleMm: 4.5 }, [ech]), null);
  assert.equal(echantillonDuProjet({ ...p, pointPrincipal: "ble" }, aiguilles, [ech]), null);
});

test("le point principal et le corps vont ensemble", () => {
  const p = avecPointPrincipal(nouveauProjet(), "riz");
  assert.equal(p.blocs.find((b) => b.zone === "corps").pointId, "riz");
  const q = avecPointDuBloc(p, "corps", "ble");
  assert.equal(q.pointPrincipal, "ble");
  const r = avecPointDuBloc(q, "bas", "riz");
  assert.equal(r.blocs.find((b) => b.id === "bas").pointId, "riz");
  assert.equal(r.pointPrincipal, "ble");
  assert.equal(zoneAvis("cotes"), "bordure");
  assert.equal(zoneAvis("corps"), "corps");
});

test("matériel manquant, puis complet avec ou sans échantillon", () => {
  const vide = nouveauProjet();
  assert.equal(materielManquant(vide, {}).length, 3);
  const p = { ...avecPointPrincipal(vide, "riz"), laineId: "L1", aiguillesId: "A1" };
  assert.match(materielManquant(p, { echantillon: null })[0], /échantillon/);
  assert.deepEqual(materielManquant(p, { echantillon: ech }), []);
  assert.deepEqual(materielManquant({ ...p, sansEchantillon: true }, { echantillon: null }), []);
});

test("calcul du projet : mesuré avec l'échantillon, estimé sans", () => {
  const p = { ...avecPointPrincipal(nouveauProjet(), "riz"), laineId: "L1", aiguillesId: "A1" };
  const mesure = calculerProjet({ projet: p, laine, aiguilles, echantillons: [ech] });
  assert.equal(mesure.ok, true);
  assert.equal(mesure.echantillon.id, "E1");
  assert.ok(mesure.plan.montage.mailles > 20 && mesure.plan.montage.mailles < 50);
  const estime = calculerProjet({ projet: p, laine, aiguilles, echantillons: [] });
  assert.equal(estime.ok, true);
  assert.equal(estime.estime, true);
  assert.equal(calculerProjet({ projet: p, laine: { id: "L1" }, aiguilles, echantillons: [] }), null);
});

test("accueil : projets triés, état et adresse de l'étape", () => {
  const liste = [
    { id: "a", statut: "conception", etape: 2, modifieLe: "2026-10-20" },
    { id: "b", statut: "termine", etape: 6, modifieLe: "2026-10-24" },
    { id: "c", statut: "conception", etape: 3, modifieLe: "2026-10-24" },
  ];
  assert.deepEqual(trierProjets(liste).map((p) => p.id), ["c", "a"]);
  assert.equal(texteEtat(liste[2]), "En conception · étape 3 sur 6");
  assert.equal(cheminEtape(liste[2]), "/projet/c/taille");
  assert.equal(cheminEtape(liste[0], 1), "/projet/a/piece");
});
