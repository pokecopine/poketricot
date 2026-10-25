// Vérifie les points d'un lot du catalogue, sans dépendre des autres lots.
// Usage : node outils/verifier-lot.mjs a     (ou b, c, d)
// Affiche chaque point avec OK ou la liste de ses problèmes ; code de sortie 1 s'il y a un problème.

import { POINTS_LOT } from "../js/catalogue/lots/lot-a.js";
import { POINTS_LOT as LB } from "../js/catalogue/lots/lot-b.js";
import { POINTS_LOT as LC } from "../js/catalogue/lots/lot-c.js";
import { POINTS_LOT as LD } from "../js/catalogue/lots/lot-d.js";
import { POINTS_LOT as LE } from "../js/catalogue/lots/lot-e.js";
import { POINTS, FAMILLES, PIECES } from "../js/catalogue/points.js";
import { geste } from "../js/catalogue/gestes.js";
import { TECHNIQUES, techniquesDuPoint } from "../js/catalogue/techniques.js";
import { texteRang } from "../js/catalogue/texte.js";
import { etiquettesProprietes, texteMultiple } from "../js/catalogue/fiche.js";
import { simuler, convertirEnRond, largeurMotif, maillesMinimum, consomme, produit } from "../js/moteur/simulateur.js";
import { tuileSVG } from "../js/rendu/texture.js";
import { planEcharpe } from "../js/moteur/plan.js";

const lots = { a: POINTS_LOT, b: LB, c: LC, d: LD, e: LE };
const nom = (process.argv[2] || "").toLowerCase();
const lot = lots[nom];
if (!lot) {
  console.error("Usage : node outils/verifier-lot.mjs a|b|c|d");
  process.exit(2);
}

const idsAilleurs = new Map();
for (const p of POINTS) idsAilleurs.set(p.id, (idsAilleurs.get(p.id) || 0) + 1);

let problemes = 0;
for (const point of lot) {
  const soucis = [];
  const verifier = (condition, message) => {
    if (!condition) soucis.push(message);
  };
  const essayer = (etiquette, f) => {
    try {
      f();
    } catch (e) {
      soucis.push(`${etiquette} : ${e.message}`);
    }
  };

  // ---- Fiche ----
  verifier(idsAilleurs.get(point.id) === 1, `identifiant « ${point.id} » utilisé ${idsAilleurs.get(point.id)} fois dans le catalogue`);
  verifier(FAMILLES.some((f) => f.id === point.famille), "famille inconnue");
  verifier(point.nom && ["le", "la", "les", "l'"].includes(point.article), "nom ou article");
  verifier(point.resume && point.source?.startsWith("https://www.lestriconautes.com/"), "résumé ou source");
  for (const piece of PIECES) {
    const a = point.ouvrages?.[piece.id];
    verifier(a && ["conseille", "possible", "deconseille"].includes(a.avis), `avis pour ${piece.id}`);
    if (a && a.avis !== "conseille") verifier(a.raison, `raison manquante pour ${piece.id}`);
  }
  verifier(point.zones?.bordure, "avis en bordure (zones.bordure)");
  verifier(point.densite?.mailles > 0 && point.densite?.rangs > 0 && point.consommation > 0, "densité ou consommation");
  essayer("étiquettes", () => verifier(etiquettesProprietes(point).length >= 3, "propriétés incomplètes"));
  essayer("techniques", () => {
    for (const t of techniquesDuPoint(point)) verifier(TECHNIQUES[t], `explication manquante pour le geste ${t}`);
  });
  essayer("gestes", () => {
    for (const r of [...(point.miseEnPlace || []), ...point.rangs]) for (const c of [...r.debut, ...r.motif, ...r.fin]) geste(c);
  });

  // ---- À plat ----
  essayer("à plat", () => {
    const n = largeurMotif(point);
    for (const r of [...(point.miseEnPlace || []), ...point.rangs]) {
      verifier(n % consomme(r.motif) === 0, "un motif ne tient pas un nombre entier de fois dans la largeur du point");
      verifier(produit(r.motif) === consomme(r.motif), "un motif change le nombre de mailles");
      verifier(produit(r.debut) === consomme(r.debut) && produit(r.fin) === consomme(r.fin), "un début ou une fin change le nombre de mailles");
    }
    const min = maillesMinimum(point);
    verifier(min, "aucun nombre de mailles ne convient à plat");
    if (!min) return;
    const nbRangs = (point.miseEnPlace?.length || 0) + point.rangs.length * 2;
    for (const k of [0, 1, 4]) {
      const sim = simuler(point, { mailles: min + k * n, rangs: nbRangs });
      verifier(sim.ok, `à plat sur ${min + k * n} mailles : ${sim.erreurs.map((e) => `rang ${e.rang} ${e.message}`).join(" ; ")}`);
    }
    for (const r of [...(point.miseEnPlace || []), ...point.rangs]) texteRang(r);
  });

  // ---- En rond ----
  essayer("en rond", () => {
    if (point.rond?.mode === "impossible") {
      verifier(point.rond.raison, "rond impossible sans raison");
      return;
    }
    const rond = convertirEnRond(point);
    verifier(rond.ok, `en rond : ${rond.erreur} (écris rond: { mode: "manuel", rangs } ou { mode: "impossible", raison })`);
    if (!rond.ok) return;
    const n = largeurMotif(point);
    const nbRangs = (point.miseEnPlace?.length || 0) + point.rangs.length * 2;
    const sim = simuler(point, { mailles: 5 * n, rangs: nbRangs, mode: "rond" });
    verifier(sim.ok, `en rond : ${sim.erreurs.map((e) => e.message).join(" ; ")}`);
    if (!sim.ok || point.rond?.mode === "manuel") return;
    const premier = point.rangs.find((r) => r.cote === "E");
    const d0 = premier ? consomme(premier.debut) : 0;
    const extras = consomme(point.rangs[0].debut) + consomme(point.rangs[0].fin);
    const plat = simuler(point, { mailles: extras + 5 * n, rangs: nbRangs });
    let different = 0;
    for (let r = 0; r < nbRangs && plat.ok; r++) {
      for (let c = n; c < 4 * n; c++) if (sim.grille[r][c] !== plat.grille[r][c + d0]) different++;
    }
    verifier(different === 0, "le dessin en rond diffère du dessin à plat");
  });

  // ---- Dessin ----
  essayer("dessin", () => {
    for (const face of ["endroit", "envers"]) {
      const t = tuileSVG(point, "#D07E5B", { face });
      verifier(t && !/NaN|undefined/.test(t.svg), `dessin ${face}`);
    }
  });

  // ---- Dans une écharpe ----
  essayer("écharpe", () => {
    const densites = {};
    for (const p of POINTS) densites[p.id] = { mailles: 20 * p.densite.mailles, rangs: 28 * p.densite.rangs, statut: "estimee" };
    const cas = [
      { nom: "au corps", blocs: [["bas", "mousse"], ["corps", point.id], ["haut", "mousse"], ["cotes", "mousse"]] },
      { nom: "en bordure", blocs: [["bas", point.id], ["corps", "riz"], ["haut", point.id], ["cotes", "mousse"]] },
      { nom: "en bande latérale", blocs: [["bas", "mousse"], ["corps", "riz"], ["haut", "mousse"], ["cotes", point.id]] },
    ];
    for (const c of cas) {
      const blocs = c.blocs.map(([zone, pointId]) => ({ id: zone, zone, pointId, hauteurCm: 4, largeurMailles: 5 }));
      const r = planEcharpe({ largeurCm: 20, longueurCm: 150, blocs, densites });
      // Une bande latérale peut être refusée par le moteur (avec une raison) : ce n'est pas une erreur du point.
      if (c.nom === "en bande latérale" && !r.ok && r.erreurs[0]?.message && !r.plan) continue;
      verifier(r.ok, `écharpe ${c.nom} : ${r.erreurs.map((e) => e.message).join(" ; ")}`);
    }
  });

  if (soucis.length) {
    problemes++;
    console.log(`✗ ${point.id} (${point.nom})`);
    for (const s of soucis) console.log(`    - ${s}`);
  } else {
    console.log(`✓ ${point.id} — ${point.nom} : ${texteMultiple(point)}, ${point.rangs.length} rangs`);
  }
}
console.log(`\n${lot.length} points, ${problemes} avec des problèmes.`);
process.exit(problemes ? 1 : 0);
