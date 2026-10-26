// Tests du moteur de calcul (E2) : densités, arrondis, transitions, plan de l'écharpe, métrage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, pointParId } from "../js/catalogue/points.js";
import { maillesConviennent, largeurMotif, consomme, produit, maillesMinimum, comptesVariables } from "../js/moteur/simulateur.js";
import {
  densitePoint, densitesDuProjet, rapportAppris, densiteJerseyProvisoire, echantillonsCorrespondants,
} from "../js/moteur/densite.js";
import {
  maillesPourLargeur, rangsPourHauteur, largeurCommune, gestesDeTransition, nomAvecArticle,
} from "../js/moteur/dimensions.js";
import { planEcharpe, verifierPlan, retournerRang, MAILLES_MAX_BANDE_LATERALE } from "../js/moteur/plan.js";
import { metrageNecessaire, comparerALaLaine, grammesParCm2Jersey, filParCm2Jersey } from "../js/moteur/metrage.js";

const proche = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const laine = { id: "L1", epaisseur: "aran", quantite: { mode: "etiquette", metresParPelote: 100, grammesParPelote: 50, pelotes: 5 } };
const ech = (o) => ({ id: o.id || Math.random().toString(36).slice(2), laineId: "L1", tailleAiguille: 5, date: "2026-10-01", ...o });
const echRiz = ech({ id: "riz5", pointId: "riz", maillesPour10cm: 17, rangsPour10cm: 28, date: "2026-10-24" });

// ---------------- Densités ----------------

test("densité : l'échantillon du projet, dans son point, est mesuré", () => {
  const d = densitePoint({ pointId: "riz", laine, tailleAiguille: 5, echantillonPrincipal: echRiz });
  assert.deepEqual([d.mailles, d.rangs, d.statut, d.echantillonId], [17, 28, "mesuree", "riz5"]);
});

test("densité : un échantillon enregistré du même point est retrouvé, le câble ne compte pas", () => {
  const mousse = ech({ id: "m", pointId: "mousse", maillesPour10cm: 16, rangsPour10cm: 32, aiguillesId: "autre-cable", tailleAiguille: "5,0" });
  const d = densitePoint({ pointId: "mousse", laine, tailleAiguille: 5, echantillons: [echRiz, mousse], echantillonPrincipal: echRiz });
  assert.deepEqual([d.mailles, d.rangs, d.statut, d.echantillonId], [16, 32, "mesuree", "m"]);
});

test("densité : le plus récent des échantillons d'une même combinaison passe en premier", () => {
  const vieux = ech({ id: "v", pointId: "riz", maillesPour10cm: 18, rangsPour10cm: 30, date: "2026-01-01" });
  const liste = echantillonsCorrespondants([vieux, echRiz], { laineId: "L1", pointId: "riz", tailleAiguille: 5 });
  assert.deepEqual(liste.map((e) => e.id), ["riz5", "v"]);
});

test("densité : un autre point est converti avec les coefficients du catalogue (estimé)", () => {
  const d = densitePoint({ pointId: "mousse", laine, tailleAiguille: 5, echantillons: [echRiz], echantillonPrincipal: echRiz });
  proche(d.mailles, 17 * (1 / 1.05));
  proche(d.rangs, 28 * (1.75 / 1.1));
  assert.equal(d.statut, "estimee");
  assert.equal(d.coefficientAppris, false);
});

test("densité : le rapport réel entre deux points remplace celui du catalogue", () => {
  // Sur une autre laine, Deborah a tricoté riz et mousse : le mousse a 0,9 fois les mailles et 1,5 fois les rangs du riz.
  const autres = [
    { id: "a", laineId: "L2", tailleAiguille: 4, pointId: "riz", maillesPour10cm: 20, rangsPour10cm: 30, date: "2026-09-01" },
    { id: "b", laineId: "L2", tailleAiguille: 4, pointId: "mousse", maillesPour10cm: 18, rangsPour10cm: 45, date: "2026-09-01" },
  ];
  const r = rapportAppris(autres, "riz", "mousse");
  proche(r.mailles, 0.9);
  proche(r.rangs, 1.5);
  const d = densitePoint({ pointId: "mousse", laine, tailleAiguille: 5, echantillons: [...autres, echRiz], echantillonPrincipal: echRiz });
  proche(d.mailles, 17 * 0.9);
  proche(d.rangs, 28 * 1.5);
  assert.equal(d.coefficientAppris, true);
});

test("densité provisoire : échantillon de l'étiquette, corrigé selon l'aiguille", () => {
  const avecEtiquette = { ...laine, echantillonEtiquette: { mailles: 18, aiguilleMm: 4 } };
  const j = densiteJerseyProvisoire(avecEtiquette, 4.5);
  proche(j.mailles, 16);
  proche(j.rangs, 16 * 1.4);
  const d = densitePoint({ pointId: "riz", laine: avecEtiquette, tailleAiguille: 4 });
  proche(d.mailles, 18 * 1.05);
  proche(d.rangs, 18 * 1.4 * 1.1);
  assert.deepEqual([d.statut, d.origine], ["estimee", "etiquette"]);
});

test("densité provisoire : sans étiquette, valeur moyenne selon l'épaisseur ; sans rien, null", () => {
  const d = densitePoint({ pointId: "jersey", laine: { id: "x", epaisseur: "dk" }, tailleAiguille: 4 });
  assert.deepEqual([d.mailles, d.statut, d.origine], [22, "estimee", "epaisseur"]);
  assert.equal(densitePoint({ pointId: "jersey", laine: { id: "x" }, tailleAiguille: 4 }), null);
});

// ---------------- Mailles et rangs ----------------

test("arrondi : 37 mailles au lieu de 38 pour le point de riz", () => {
  const r = maillesPourLargeur(pointParId("riz"), 20, { mailles: 19, rangs: 30 });
  assert.equal(r.retenu, 37);
  assert.equal(r.explication, "37 mailles au lieu de 38 pour que le point de riz tombe juste");
  proche(r.largeurCm, 370 / 19);
  assert.equal(maillesPourLargeur(pointParId("riz"), 20, { mailles: 18.5, rangs: 30 }).explication, null);
});

test("arrondi : accords « les côtes 2/2 tombent juste »", () => {
  assert.equal(nomAvecArticle(pointParId("cotes-2-2")), "les côtes 2/2");
  const r = maillesPourLargeur(pointParId("cotes-2-2"), 10, { mailles: 21, rangs: 30 });
  assert.match(r.explication, /pour que les côtes 2\/2 tombent juste$/);
});

test("arrondi : chaque point du catalogue tombe juste, à moins d'une répétition de la largeur voulue", () => {
  for (const p of POINTS) {
    for (const largeur of [8, 15, 20, 27, 40, 63]) {
      const r = maillesPourLargeur(p, largeur, { mailles: 18, rangs: 26 });
      assert.ok(maillesConviennent(p, r.retenu), `${p.id} sur ${largeur} cm`);
      assert.ok(Math.abs(r.retenu - r.ideal) <= largeurMotif(p), `${p.id} : ${r.retenu} pour ${r.ideal}`);
    }
  }
});

test("hauteur : arrondie au motif complet, mise en place comprise", () => {
  for (const p of POINTS) {
    for (const h of [1, 4, 10, 37]) {
      const r = rangsPourHauteur(p, h, { mailles: 18, rangs: 26 });
      const mep = (p.miseEnPlace || []).length;
      assert.equal((r.rangs - mep) % p.rangs.length, 0, `${p.id}, ${h} cm`);
      assert.ok(r.repetitions >= 1);
    }
  }
  const t = rangsPourHauteur(pointParId("torsade-gauche"), 10, { mailles: 20, rangs: 28 });
  assert.equal(t.rangs, 30); // 28 rangs voulus → 5 motifs de 6 rangs
  proche(t.hauteurCm, 300 / 28);
});

test("largeur commune : trouvée pour mousse et riz, impossible pour côtes 2/2 et riz", () => {
  const bloc = (id, base) => ({ point: pointParId(id), densite: { mailles: base * pointParId(id).densite.mailles, rangs: 30 } });
  const n = largeurCommune([bloc("mousse", 18), bloc("riz", 18)], 20);
  assert.ok(n && n % 2 === 1);
  assert.equal(largeurCommune([bloc("cotes-2-2", 18), bloc("riz", 18)], 20), null);
});

test("transition : les comptes sont justes et les augmentations bien réparties", () => {
  for (let n = 4; n <= 60; n += 3) {
    for (let m = Math.ceil(n / 2); m <= 2 * n; m += 2) {
      for (const cote of ["E", "V"]) {
        const t = gestesDeTransition(n, m, cote);
        assert.ok(t, `${n} → ${m}`);
        assert.equal(consomme(t.gestes), n);
        assert.equal(produit(t.gestes), m);
      }
    }
  }
  const t = gestesDeTransition(10, 12, "E");
  assert.deepEqual(t.gestes.map((c, i) => (c === "aug" ? i : null)).filter((i) => i !== null), [2, 7]);
  assert.equal(gestesDeTransition(10, 4, "E"), null);
});

test("un rang retourné se lit à l'envers avec les gestes équivalents", () => {
  const r = retournerRang({ cote: "V", debut: ["env"], motif: ["end", "glAv"], fin: ["md"] });
  assert.deepEqual(r, { cote: "E", debut: ["mdEnv"], motif: ["gl", "env"], fin: ["end"] });
});

// ---------------- Plan de l'écharpe ----------------

function planPour({ bas, corps, haut = bas, cotes = null, largeurCm = 20, longueurCm = 180, largeurMailles = 4, autres = [] }) {
  const blocs = [
    { id: "bas", zone: "bas", pointId: bas, hauteurCm: 4 },
    ...autres,
    { id: "corps", zone: "corps", pointId: corps },
    { id: "haut", zone: "haut", pointId: haut, hauteurCm: 4 },
  ];
  if (cotes) blocs.push({ id: "cotes", zone: "cotes", pointId: cotes, largeurMailles });
  const densites = densitesDuProjet({
    pointIds: blocs.map((b) => b.pointId), laine, tailleAiguille: 5, echantillons: [echRiz], echantillonPrincipal: echRiz,
  });
  return planEcharpe({ largeurCm, longueurCm, blocs, densites });
}

function verifierStructure(r) {
  assert.equal(r.ok, true, JSON.stringify(r.erreurs));
  const { plan, grille } = r;
  assert.equal(grille.length, plan.rangs.length);
  for (let i = 0; i < plan.rangs.length; i++) {
    const rang = plan.rangs[i];
    assert.equal(grille[i].length, rang.mailles, `rang ${rang.numero}`);
    if (i > 0) assert.notEqual(rang.cote, plan.rangs[i - 1].cote);
    // Les lisières ne bougent jamais ; les bandes latérales non plus, sauf si leur point change de nombre de mailles.
    const bandeVariable = plan.bandesLaterales && comptesVariables(pointParId(plan.bandesLaterales.pointId));
    for (const s of rang.segments.filter((s) => s.zone !== "corps" && !(bandeVariable && s.zone.startsWith("bande")))) {
      const attendu = s.zone.startsWith("bord") ? plan.lisieres.mailles : plan.bandesLaterales.mailles;
      assert.equal(consomme(s.gestes), attendu);
      assert.equal(produit(s.gestes), attendu);
    }
    // Lisière chaînette : première maille glissée, dernière à l'endroit.
    assert.deepEqual(rang.segments[0].gestes, ["glAv"]);
    assert.deepEqual(rang.segments.at(-1).gestes, ["end"]);
  }
  assert.equal(plan.montage.mailles, plan.rangs[0].segments.reduce((t, s) => t + consomme(s.gestes), 0));
  assert.equal(plan.rabattage.mailles, plan.rangs.at(-1).mailles);
}

test("écharpe : même multiple partout (mousse et riz), bandes latérales en mousse", () => {
  const r = planPour({ bas: "mousse", corps: "riz", cotes: "mousse" });
  verifierStructure(r);
  assert.equal(r.plan.rangs.filter((x) => x.type === "transition").length, 0);
  assert.ok(Math.abs(r.plan.largeur.reelleCm - 20) / 20 < 0.05);
  assert.ok(Math.abs(r.plan.longueur.reelleCm - 180) / 180 < 0.02);
  assert.deepEqual(r.plan.blocs.map((b) => b.zone), ["bas", "corps", "haut"]);
});

test("écharpe : côtes 2/2 puis riz, avec rangs de transition", () => {
  const r = planPour({ bas: "cotes-2-2", corps: "riz" });
  verifierStructure(r);
  const transitions = r.plan.rangs.filter((x) => x.type === "transition");
  assert.equal(transitions.length, 2);
  assert.ok(r.explications.some((e) => e.startsWith("Rang de transition")));
  const [bas, corps] = r.plan.blocs;
  assert.equal(bas.maillesCorps % 4, 0);
  assert.equal(corps.maillesCorps % 2, 1);
});

test("écharpe : riz puis torsade, torsade en bordure, dentelle au corps", () => {
  verifierStructure(planPour({ bas: "riz", corps: "torsade-gauche", cotes: "mousse" }));
  verifierStructure(planPour({ bas: "torsade-gauche", corps: "riz", cotes: "riz" }));
  verifierStructure(planPour({ bas: "mousse", corps: "chevron-dentele", cotes: "sillon" }));
  verifierStructure(planPour({ bas: "mousse", corps: "bourse", cotes: "mousse" }));
});

test("écharpe : chaque point du catalogue au corps, en bordure et en bande latérale", () => {
  for (const p of POINTS) {
    verifierStructure(planPour({ bas: "mousse", corps: p.id, cotes: "mousse" }));
    verifierStructure(planPour({ bas: p.id, corps: "riz", cotes: "mousse" }));
    // Une bande latérale reste étroite : les points à grand motif n'y vont pas (le choix des points les écarte).
    if (maillesMinimum(p) <= MAILLES_MAX_BANDE_LATERALE) verifierStructure(planPour({ bas: "mousse", corps: "riz", cotes: p.id, largeurMailles: 5 }));
    else assert.equal(planPour({ bas: "mousse", corps: "riz", cotes: p.id, largeurMailles: 5 }).erreurs[0].nomBloc, "bandes latérales");
  }
});

test("écharpe : bloc ajouté entre la bordure et le corps, et mise en place des fausses côtes anglaises", () => {
  const r = planPour({
    bas: "fausses-cotes-anglaises", corps: "nid-abeille", cotes: "fausses-cotes-anglaises",
    autres: [{ id: "bande1", zone: "bande", pointId: "ble", hauteurCm: 6 }],
  });
  verifierStructure(r);
  assert.deepEqual(r.plan.blocs.map((b) => b.id), ["bas", "bande1", "corps", "haut"]);
  assert.equal(r.plan.rangs[0].type, "miseEnPlace");
});

test("écharpe : les bandes latérales sont ajustées pour tomber juste et le dit", () => {
  const r = planPour({ bas: "mousse", corps: "riz", cotes: "riz", largeurMailles: 4 });
  verifierStructure(r);
  assert.equal(r.plan.bandesLaterales.mailles % 2, 1);
  assert.ok(r.explications.some((e) => e.includes("des bandes latérales")));
});

test("écharpe : erreurs de projet expliquées", () => {
  const sansCorps = planEcharpe({ largeurCm: 20, longueurCm: 100, blocs: [{ id: "b", zone: "bas", pointId: "mousse", hauteurCm: 3 }], densites: {} });
  assert.equal(sansCorps.ok, false);
  const tropCourte = planPour({ bas: "mousse", corps: "riz", longueurCm: 8 });
  assert.equal(tropCourte.ok, false);
  assert.equal(tropCourte.erreurs[0].nomBloc, "corps");
});

test("vérification : un plan volontairement faux est bloqué et le bloc en cause est nommé", () => {
  const copie = () => structuredClone(planPour({ bas: "mousse", corps: "riz", cotes: "mousse" }).plan);

  const geste = copie();
  const rang = geste.rangs.find((r) => r.blocId === "corps" && r.type === "motif");
  rang.segments.find((s) => s.zone === "corps").gestes[3] = "2ens";
  let v = verifierPlan(geste);
  assert.equal(v.ok, false);
  assert.equal(v.erreurs[0].nomBloc, "corps");
  assert.equal(v.erreurs[0].rang, rang.numero);

  const motif = copie();
  const s = motif.rangs[5].segments.find((s) => s.zone === "corps");
  s.gestes[0] = s.gestes[0] === "end" ? "env" : "end";
  v = verifierPlan(motif);
  assert.equal(v.ok, false);
  assert.match(v.erreurs[0].message, /ne suivent pas le motif/);

  const fin = copie();
  fin.blocs[0].maillesCorps += 2;
  v = verifierPlan(fin);
  assert.equal(v.ok, false);
  assert.equal(v.erreurs[0].nomBloc, "bordure du bas");

  const cote = copie();
  cote.rangs.splice(10, 1);
  assert.equal(verifierPlan(cote).ok, false);

  const montage = copie();
  montage.montage.mailles += 1;
  assert.equal(verifierPlan(montage).ok, false);
});

// ---------------- Métrage ----------------

test("métrage par pesée : grammes par cm², consommation des points, mètres aux 100 g, marge de 10 %", () => {
  const pese = { ...echRiz, pesee: { grammes: 12, largeurCm: 15, hauteurCm: 15 } };
  proche(grammesParCm2Jersey(pese), 12 / 225 / 1.15);
  const r = planPour({ bas: "mousse", corps: "riz", cotes: "mousse" });
  const m = metrageNecessaire({ plan: r.plan, laine, echantillon: pese });
  assert.equal(m.methode, "pesee");
  const attendu = m.parBloc.reduce((t, b) => t + b.cm2 * (12 / 225 / 1.15) * pointParId(b.pointId).consommation * 2, 0);
  proche(m.metresSansMarge, attendu);
  assert.equal(m.metres, Math.ceil(attendu * 1.1));
  assert.deepEqual(m.parBloc.map((b) => b.nom), ["bordure du bas", "corps", "bordure du haut", "bandes latérales"]);
});

test("métrage de repli : environ 1,8 cm de fil par maille pour 22 × 30", () => {
  proche(filParCm2Jersey({ mailles: 22, rangs: 30 }) / 6.6, Math.sqrt(21 / 6.6));
  const r = planPour({ bas: "mousse", corps: "riz" });
  const m = metrageNecessaire({ plan: r.plan, laine, echantillon: echRiz, densiteJersey: { mailles: 17 / 1.05, rangs: 28 / 1.1 } });
  assert.equal(m.methode, "estimation");
  assert.ok(m.metres > 150 && m.metres < 600, `${m.metres} m pour une écharpe aran de 20 × 180 cm`);
});

test("laine suffisante, juste ou insuffisante", () => {
  assert.equal(comparerALaLaine(400, laine).statut, "suffisant"); // 500 m disponibles
  assert.equal(comparerALaLaine(470, laine).statut, "juste");
  const manque = comparerALaLaine(620, laine);
  assert.deepEqual([manque.statut, manque.manque], ["insuffisant", 120]);
  assert.equal(comparerALaLaine(100, { id: "z" }).statut, "inconnu");
});

test("densité provisoire : fourchette d'aiguilles sur l'étiquette → milieu de la fourchette", () => {
  const j = densiteJerseyProvisoire({ echantillonEtiquette: { mailles: 12, aiguilleMm: 8, aiguilleMaxMm: 10 } }, 9);
  proche(j.mailles, 12);
  const k = densiteJerseyProvisoire({ echantillonEtiquette: { mailles: 12, aiguilleMm: 8, aiguilleMaxMm: 10 } }, 10);
  proche(k.mailles, 12 * 9 / 10);
});

test("densité provisoire : les rangs de l'étiquette sont utilisés quand ils sont notés", () => {
  const j = densiteJerseyProvisoire({ echantillonEtiquette: { mailles: 18, rangs: 24, aiguilleMm: 5 } }, 5);
  assert.deepEqual([j.mailles, j.rangs, j.rangsEtiquette], [18, 24, true]);
  // Aiguille plus grosse que celle de l'étiquette : moins de mailles et moins de rangs pour 10 cm.
  const k = densiteJerseyProvisoire({ echantillonEtiquette: { mailles: 18, rangs: 24, aiguilleMm: 5 } }, 6);
  proche(k.mailles, 15);
  proche(k.rangs, 20);
  const sansRangs = densiteJerseyProvisoire({ echantillonEtiquette: { mailles: 18 } }, 5);
  proche(sansRangs.rangs, 18 * 1.4);
  assert.equal(sansRangs.rangsEtiquette, false);
  const d = densitePoint({ pointId: "mousse", laine: { id: "x", echantillonEtiquette: { mailles: 18, rangs: 24 } }, tailleAiguille: 5 });
  proche(d.rangs, 24 * 1.75);
});
