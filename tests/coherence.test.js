// Garde-fous : le service worker connaît tous les fichiers, et les numéros de version concordent.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "../js/version.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sw = fs.readFileSync(path.join(racine, "sw.js"), "utf8");

function fichiersListes() {
  const bloc = sw.match(/const FICHIERS = \[([\s\S]*?)\];/)[1];
  return [...bloc.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function fichiersDuDossier(dossier, filtre) {
  const resultat = [];
  const parcourir = (d) => {
    for (const e of fs.readdirSync(path.join(racine, d), { withFileTypes: true })) {
      const rel = path.posix.join(d, e.name);
      if (e.isDirectory()) parcourir(rel);
      else if (filtre(e.name)) resultat.push(rel);
    }
  };
  parcourir(dossier);
  return resultat;
}

test("la version du service worker est celle de l'application", () => {
  const v = sw.match(/const VERSION = "([^"]+)"/)[1];
  assert.equal(v, VERSION);
});

test("chaque fichier listé par le service worker existe", () => {
  for (const f of fichiersListes()) {
    if (f === "./") continue;
    assert.ok(fs.existsSync(path.join(racine, f)), `fichier manquant : ${f}`);
  }
});

test("chaque fichier de l'application est gardé pour le hors connexion", () => {
  const listes = new Set(fichiersListes());
  const attendus = [
    ...fichiersDuDossier("js", (n) => n.endsWith(".js")),
    ...fichiersDuDossier("css", (n) => n.endsWith(".css")),
    ...fichiersDuDossier("vendor", (n) => n.endsWith(".js")),
    ...fichiersDuDossier("polices", (n) => n.endsWith(".woff2")),
    ...fichiersDuDossier("icones", (n) => /\.(png|svg)$/.test(n)),
    "index.html",
    "manifest.webmanifest",
  ];
  for (const f of attendus) assert.ok(listes.has(f), `à ajouter dans sw.js : ${f}`);
});

test("aucun chargement depuis internet dans la page", () => {
  const index = fs.readFileSync(path.join(racine, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(racine, "css/pelote.css"), "utf8");
  assert.doesNotMatch(index, /(src|href)="https?:\/\//);
  assert.doesNotMatch(css, /url\(["']?https?:/);
});
