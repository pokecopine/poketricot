// Conseils de 0.18.0 : aiguille dans la fourchette (C-1), points selon la laine (C-2, C-3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { aiguilleDansLaFourchette, texteConseilFourchette, milieuDeLaFourchette } from "../js/moteur/aiguille.js";
import { grosseurDeLaine, avisLaine, motifDansLeBloc, maillesEstimees, avisAvecLaLaine, convientALaLaine } from "../js/catalogue/laine.js";
import { filtrerParCriteres, CRITERES } from "../js/catalogue/criteres.js";
import { largeurMotif } from "../js/moteur/simulateur.js";

const f = { min: 4.5, max: 5.5 };
const p = (id) => pointParId(id);

test("C-1 : pièce qui tient et côtes → bas de la fourchette", () => {
  const c = aiguilleDansLaFourchette({ piece: "jambieres", point: p("cotes-1-1"), fourchette: f });
  assert.equal(c.position, "bas");
  assert.equal(c.tailleMm, 4.5);
  assert.equal(aiguilleDansLaFourchette({ piece: "bonnet", point: p("jersey"), fourchette: f }).position, "bas");
  assert.equal(aiguilleDansLaFourchette({ piece: "echarpe", point: p("torsade-gauche"), fourchette: f }).position, "bas");
});

test("C-1 : couverture ou ajouré → haut ; écharpe en riz → milieu ; bonnet ajouré → milieu", () => {
  assert.equal(aiguilleDansLaFourchette({ piece: "couverture", point: p("jersey"), fourchette: f }).tailleMm, 5.5);
  assert.equal(aiguilleDansLaFourchette({ piece: "snood", point: p("bourse"), fourchette: f }).position, "haut");
  const m = aiguilleDansLaFourchette({ piece: "echarpe", point: p("riz"), fourchette: f });
  assert.deepEqual([m.position, m.tailleMm], ["milieu", 5]);
  assert.equal(aiguilleDansLaFourchette({ piece: "bonnet", point: p("bourse"), fourchette: f }).position, "milieu");
});

test("C-1 : le milieu tombe sur un demi-millimètre de la fourchette", () => {
  assert.equal(milieuDeLaFourchette(4, 5), 4.5);
  assert.equal(milieuDeLaFourchette(8, 10), 9);
  assert.equal(milieuDeLaFourchette(3.5, 4), 3.5); // égalité : le plus fin
  assert.equal(milieuDeLaFourchette(2.25, 3.25), 2.5);
  assert.equal(milieuDeLaFourchette(5, 6), 5.5);
});

test("C-1 : une seule taille sur l'étiquette → pas de conseil nouveau", () => {
  assert.equal(aiguilleDansLaFourchette({ piece: "bonnet", point: p("riz"), fourchette: { min: 5, max: 5 } }), null);
  assert.equal(aiguilleDansLaFourchette({ piece: "bonnet", point: p("riz"), fourchette: null }), null);
});

test("C-1 : textes du conseil et phrase douce", () => {
  const t = texteConseilFourchette({ piece: "jambieres", point: p("cotes-1-1"), fourchette: f, tailleChoisie: 5.5 });
  assert.equal(t.texte, "Pour des jambières en côtes 1/1 : 4,5 mm, le bas de la fourchette de l'étiquette (4,5 mm à 5,5 mm), pour qu'elles tiennent bien.");
  assert.equal(t.douce, "Ton aiguille de 5,5 mm marche aussi : le tricot sera un peu plus souple.");
  const juste = texteConseilFourchette({ piece: "jambieres", point: p("cotes-1-1"), fourchette: f, tailleChoisie: 4.5 });
  assert.equal(juste.douce, null);
  assert.ok(juste.choisie);
  // Hors de la fourchette : pas de phrase douce (l'avertissement habituel reste).
  assert.equal(texteConseilFourchette({ piece: "bonnet", point: p("riz"), fourchette: f, tailleChoisie: 7 }).douce, null);
  const ech = texteConseilFourchette({ piece: "echarpe", point: p("riz"), fourchette: f });
  assert.match(ech.texte, /^Pour une écharpe en point de riz : 5 mm, le milieu/);
  assert.match(texteConseilFourchette({ piece: "bonnet", point: p("bourse"), fourchette: f }).texte, /il doit tenir, mais les jours doivent s'ouvrir/);
});

const laine = (epaisseur) => ({ id: "l", epaisseur });

test("C-2 : grosseurs de la laine", () => {
  assert.equal(grosseurDeLaine(laine("lace")), "fine");
  assert.equal(grosseurDeLaine(laine("sport")), "fine");
  assert.equal(grosseurDeLaine(laine("worsted")), "moyenne");
  assert.equal(grosseurDeLaine(laine("aran")), "epaisse");
  assert.equal(grosseurDeLaine(laine("super-bulky")), "tres-epaisse");
  assert.equal(grosseurDeLaine({}), null);
});

test("C-2 : table de jugement", () => {
  const ajoure = POINTS.find((x) => x.famille === "ajoures");
  assert.equal(avisLaine(ajoure, laine("fingering")).avis, "conseille");
  assert.equal(avisLaine(p("riz"), laine("fingering")), null);
  assert.equal(avisLaine(ajoure, laine("dk")), null);
  assert.equal(avisLaine(p("torsade-gauche"), laine("aran")).avis, "conseille");
  assert.equal(avisLaine(ajoure, laine("aran")).avis, "possible");
  assert.equal(avisLaine(ajoure, laine("bulky")).avis, "deconseille");
  assert.equal(avisLaine(p("cotes-chevrons"), laine("bulky")).avis, "conseille"); // côtes : toujours conseillées
  // Texturés : selon la largeur du motif.
  assert.equal(avisLaine(p("riz"), laine("bulky")).avis, "conseille");
  assert.equal(avisLaine(p("grille"), laine("aran")), null); // 8 mailles > 6
  assert.equal(avisLaine(p("petites-pyramides"), laine("aran")).avis, "conseille"); // 6 mailles
  assert.equal(avisLaine(p("petites-pyramides"), laine("bulky")).avis, "possible");
  assert.equal(avisLaine(p("boites"), laine("bulky")).avis, "conseille"); // 4 mailles
});

test("C-2 : chaque point a un avis cohérent pour chaque grosseur", () => {
  for (const ep of ["lace", "dk", "aran", "bulky"]) {
    for (const pt of POINTS) {
      const a = avisLaine(pt, laine(ep));
      if (a) assert.ok(["conseille", "possible", "deconseille"].includes(a.avis) && a.raison, pt.id + ep);
    }
  }
});

test("C-3 : le motif tient-il assez de fois ?", () => {
  const vagues = p("vagues"); // 18 mailles
  assert.equal(largeurMotif(vagues), 18);
  assert.deepEqual(motifDansLeBloc(vagues, 36, { enRond: true }), {
    fois: 2, avis: "deconseille", raison: "Le motif ne tient que 2 fois sur le tour : il ne se verra presque pas.",
  });
  assert.equal(motifDansLeBloc(vagues, 72).raison, "Le motif tient 4 fois dans la largeur.");
  assert.equal(motifDansLeBloc(vagues, 72).avis, undefined);
  assert.equal(motifDansLeBloc(vagues, 90), null);
  assert.equal(motifDansLeBloc(p("jersey"), 3), null);
  assert.match(motifDansLeBloc(vagues, 40, { enRond: true, colonne: true }).raison, /dans la colonne/);
  assert.match(motifDansLeBloc(vagues, 10).raison, /ne tient pas une seule fois/);
  assert.equal(maillesEstimees(20, { mailles: 13 }), 26);
});

test("C-3 : le calcul l'emporte sur la table quand le motif ne tient pas", () => {
  const a = avisAvecLaLaine(p("vagues"), laine("fingering"), motifDansLeBloc(p("vagues"), 30));
  assert.equal(a.avis, "deconseille");
  assert.ok(!convientALaLaine(a));
  const b = avisAvecLaLaine(p("vagues"), laine("fingering"), motifDansLeBloc(p("vagues"), 60));
  assert.equal(b.avis, "conseille");
  assert.match(b.motif, /3 fois/);
  assert.equal(avisAvecLaLaine(p("riz"), laine("dk"), null), null);
});

test("Pour ma laine : conseillés ou possibles, tout en laine moyenne, et besoin d'une laine", () => {
  const critere = CRITERES.find((c) => c.id === "laine");
  assert.ok(critere && critere.besoinLaine);
  const ctx = (ep) => ({ avisLaine: (pt) => avisAvecLaLaine(pt, laine(ep)), grosseur: grosseurDeLaine(laine(ep)) });
  const gros = filtrerParCriteres(POINTS, ["laine"], ctx("bulky"));
  assert.ok(gros.length > 0 && gros.length < POINTS.length);
  assert.ok(gros.every((pt) => pt.famille !== "ajoures"));
  const fine = filtrerParCriteres(POINTS, ["laine"], ctx("lace"));
  assert.ok(fine.length > 0 && fine.every((pt) => pt.famille === "ajoures"));
  assert.equal(filtrerParCriteres(POINTS, ["laine"], ctx("dk")).length, POINTS.length);
  // Sans laine connue, le critère ne retire rien (il est grisé à l'écran).
  assert.equal(filtrerParCriteres(POINTS, ["laine"]).length, POINTS.length);
});
