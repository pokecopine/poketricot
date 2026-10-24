import { test } from "node:test";
import assert from "node:assert/strict";
import {
  construireSauvegarde, lireSauvegarde, nomFichierSauvegarde, rappelSauvegardeNecessaire, FORMAT_SAUVEGARDE,
} from "../js/donnees/sauvegarde.js";
import { COLLECTIONS, VERSION_BASE } from "../js/donnees/db.js";

const laine = { id: "l1", nom: "Mérinos", couleur: "#D07E5B" };

test("une sauvegarde exportée se relit à l'identique", () => {
  const s = construireSauvegarde({ laines: [laine] }, { versionApp: "0.1.0", maintenant: new Date("2026-10-24T10:00:00Z") });
  assert.equal(s.format, FORMAT_SAUVEGARDE);
  assert.equal(s.versionBase, VERSION_BASE);
  for (const nom of COLLECTIONS) assert.ok(Array.isArray(s.donnees[nom]), nom);
  const r = lireSauvegarde(JSON.stringify(s));
  assert.equal(r.ok, true);
  assert.deepEqual(r.sauvegarde.donnees.laines, [laine]);
  assert.equal(r.resume.laines, 1);
  assert.equal(r.resume.aiguilles, 0);
  assert.equal(r.resume.exporteLe, "2026-10-24T10:00:00.000Z");
});

test("un fichier illisible ou étranger est refusé avec un message clair", () => {
  assert.equal(lireSauvegarde("pas du json").ok, false);
  assert.match(lireSauvegarde('{"format":"autre"}').erreur, /ne vient pas/);
  assert.match(lireSauvegarde("[]").erreur, /ne vient pas/);
});

test("une sauvegarde d'une version plus récente est refusée", () => {
  const s = construireSauvegarde({});
  s.versionBase = VERSION_BASE + 1;
  assert.match(lireSauvegarde(JSON.stringify(s)).erreur, /plus récente/);
});

test("une sauvegarde abîmée est refusée", () => {
  const s = construireSauvegarde({});
  s.donnees.laines = [{ nom: "sans id" }];
  assert.match(lireSauvegarde(JSON.stringify(s)).erreur, /abîmé/);
  const t = construireSauvegarde({});
  delete t.donnees;
  assert.match(lireSauvegarde(JSON.stringify(t)).erreur, /incomplet/);
});

test("une collection absente d'une ancienne sauvegarde est lue comme vide", () => {
  const s = construireSauvegarde({ laines: [laine] });
  delete s.donnees.suivis;
  const r = lireSauvegarde(JSON.stringify(s));
  assert.equal(r.ok, true);
  assert.deepEqual(r.sauvegarde.donnees.suivis, []);
});

test("nom du fichier daté", () => {
  assert.equal(nomFichierSauvegarde(new Date(2026, 9, 4)), "createur-patrons-sauvegarde-2026-10-04.json");
});

test("rappel de sauvegarde après 30 jours, seulement s'il y a des données", () => {
  const maintenant = new Date("2026-10-24T10:00:00Z");
  assert.equal(rappelSauvegardeNecessaire(null, false, { maintenant }), false);
  assert.equal(rappelSauvegardeNecessaire(null, true, { maintenant }), true);
  assert.equal(rappelSauvegardeNecessaire("2026-10-12T10:00:00Z", true, { maintenant }), false);
  assert.equal(rappelSauvegardeNecessaire("2026-09-01T10:00:00Z", true, { maintenant }), true);
});
