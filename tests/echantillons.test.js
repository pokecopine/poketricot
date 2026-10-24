// Tests des règles des échantillons enregistrés (E2-1).
import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  echantillonVide, verifierEchantillon, alertePesee, normaliserEchantillon, trierEchantillons, filtrerParLaine,
  lainesAvecEchantillons, detailEchantillon, mentionsEchantillon, texteDensite, memeCombinaison, maillesPourLeCarre,
  texteDate, estPese,
} from "../js/donnees/echantillons.js";
import { ouvrirBase } from "../js/donnees/db.js";
import { construireSauvegarde, lireSauvegarde } from "../js/donnees/sauvegarde.js";
import { maillesConviennent } from "../js/moteur/simulateur.js";
import { pointParId } from "../js/catalogue/points.js";

const saisie = (o = {}) => ({
  ...echantillonVide({ laineId: "L1", pointId: "riz", tailleAiguille: 4.5 }),
  maillesPour10cm: "17", rangsPour10cm: "28", date: "2026-10-12", ...o,
});

test("un échantillon vide pré-remplit la combinaison et la date du jour", () => {
  const e = echantillonVide({ laineId: "L1", pointId: "ble", tailleAiguille: 4.5 });
  assert.equal(e.tailleAiguille, "4,5");
  assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(e.lave, true);
});

test("vérification : champs obligatoires et pesée complète", () => {
  assert.deepEqual(verifierEchantillon(saisie()), {});
  const e = verifierEchantillon({ ...echantillonVide(), date: "" });
  assert.deepEqual(Object.keys(e).sort(), ["date", "laineId", "maillesPour10cm", "pointId", "rangsPour10cm", "tailleAiguille"]);
  // Une pesée commencée doit être complète, en grammes entiers.
  const p = verifierEchantillon(saisie({ pesee: { grammes: "12,5", largeurCm: "", hauteurCm: "15" } }));
  assert.deepEqual(Object.keys(p).sort(), ["grammes", "largeurCm"]);
  assert.deepEqual(verifierEchantillon(saisie({ pesee: { grammes: "12", largeurCm: "15", hauteurCm: "14,5" } })), {});
});

test("pesée : alerte sous 8 g", () => {
  assert.match(alertePesee(saisie({ pesee: { grammes: "6", largeurCm: "10", hauteurCm: "10" } })), /un peu petit pour ta balance/);
  assert.equal(alertePesee(saisie({ pesee: { grammes: "12", largeurCm: "15", hauteurCm: "15" } })), null);
  assert.equal(alertePesee(saisie()), null);
});

test("normalisation : nombres convertis, pesée vide retirée", () => {
  const n = normaliserEchantillon(saisie({ note: "  essai  " }));
  assert.deepEqual([n.tailleAiguille, n.maillesPour10cm, n.rangsPour10cm, n.note], [4.5, 17, 28, "essai"]);
  assert.equal("pesee" in n, false);
  const p = normaliserEchantillon(saisie({ pesee: { grammes: "12", largeurCm: "15", hauteurCm: "14,5" } }));
  assert.deepEqual(p.pesee, { grammes: 12, largeurCm: 15, hauteurCm: 14.5 });
  assert.equal(estPese(p), true);
});

test("tri, filtre par laine, laines présentes", () => {
  const liste = [
    { id: "a", laineId: "L1", date: "2026-08-15" },
    { id: "b", laineId: "L2", date: "2026-10-12" },
    { id: "c", laineId: "L1", date: "2026-10-12", creeLe: "2026-10-13T08:00:00Z" },
  ];
  assert.deepEqual(trierEchantillons(liste).map((e) => e.id), ["c", "b", "a"]);
  assert.deepEqual(filtrerParLaine(liste, "L1").map((e) => e.id), ["a", "c"]);
  assert.equal(filtrerParLaine(liste, "").length, 3);
  const laines = [{ id: "L1" }, { id: "L2" }, { id: "L3" }];
  assert.deepEqual(lainesAvecEchantillons(laines, liste).map((l) => l.id), ["L1", "L2"]);
});

test("textes de la carte d'échantillon, comme sur la maquette", () => {
  const e = normaliserEchantillon(saisie({ pesee: { grammes: "12", largeurCm: "15", hauteurCm: "15" } }));
  assert.equal(detailEchantillon(e, { nom: "Mérinos terracotta" }), "Mérinos terracotta · 4,5 mm");
  assert.equal(mentionsEchantillon(e), "12/10/2026 · lavé · pesé");
  assert.equal(mentionsEchantillon({ ...e, lave: false, pesee: undefined }), "12/10/2026");
  assert.equal(texteDensite(e), "17 × 28");
  assert.equal(texteDate("2026-08-05"), "05/08/2026");
});

test("même combinaison : le câble ne compte pas, l'échantillon lui-même est exclu", () => {
  const liste = [
    { id: "a", laineId: "L1", pointId: "riz", tailleAiguille: 4.5, maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-08-01", aiguillesId: "cable-80" },
    { id: "b", laineId: "L1", pointId: "riz", tailleAiguille: 4.5, maillesPour10cm: 18, rangsPour10cm: 29, date: "2026-10-01", aiguillesId: "cable-60" },
    { id: "c", laineId: "L1", pointId: "riz", tailleAiguille: 5, maillesPour10cm: 16, rangsPour10cm: 26, date: "2026-10-01" },
  ];
  assert.deepEqual(memeCombinaison(liste, { id: "b", laineId: "L1", pointId: "riz", tailleAiguille: "4,5" }).map((e) => e.id), ["a"]);
  assert.deepEqual(memeCombinaison(liste, { laineId: "L1", pointId: "riz", tailleAiguille: "4,5" }).map((e) => e.id), ["b", "a"]);
});

test("guide : mailles à monter pour un carré de 15 cm, qui tombent juste", () => {
  const laine = { id: "L1", epaisseur: "dk", echantillonEtiquette: { mailles: 22, aiguilleMm: 4 } };
  const n = maillesPourLeCarre({ laine, pointId: "riz", tailleAiguille: 4 });
  assert.ok(maillesConviennent(pointParId("riz"), n));
  assert.ok(Math.abs(n - 15 * 2.2 * 1.05) <= 2);
  const t = maillesPourLeCarre({ laine, pointId: "torsade-gauche", tailleAiguille: 4 });
  assert.equal((t - 3) % 9, 0);
  assert.equal(maillesPourLeCarre({ laine: { id: "x" }, pointId: "riz", tailleAiguille: 4 }), null);
});

test("les échantillons sont enregistrés, relus et font partie de la sauvegarde", async () => {
  const base = await ouvrirBase({ nom: "test-echantillons" });
  const enregistre = await base.ecrire("echantillons", normaliserEchantillon(saisie()));
  const relu = await base.lire("echantillons", enregistre.id);
  assert.equal(relu.maillesPour10cm, 17);
  const sauvegarde = construireSauvegarde(await base.toutLire(), { versionApp: "test" });
  const lue = lireSauvegarde(JSON.stringify(sauvegarde));
  assert.equal(lue.ok, true);
  assert.equal(lue.resume.echantillons, 1);
  base.fermer();
});
