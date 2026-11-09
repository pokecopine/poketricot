// Plan d'un bonnet tricoté en rond, du bord vers le sommet, sans couture, tout en magic loop (E4, 0.17.0).
//
// Le bord et le corps sont ceux d'un snood (planSnood), avec un tour qui se partage aussi en 8 parts égales.
// Le sommet est ajouté ensuite : 8 diminutions par tour de diminutions, un tour sur deux puis à chaque tour,
// jusqu'à 8 mailles ; on passe le fil dans les mailles restantes (fermeture).
//
// Le sommet garde le point du corps quand c'est un « point simple » (motif de 4 mailles au plus, seulement
// des mailles endroit et envers) ; sinon il passe en jersey (décision de Deborah du 06/11).
// Le plan complet passe par verifierPlanRond : aucun patron ne sort si un compte est faux.

import { pointParId } from "../catalogue/points.js";
import { consomme, produit, deplier, convertirEnRond, comptesDesRangs, sortieRang } from "./simulateur.js";
import { gestesDeTransition, nomAvecArticle } from "./dimensions.js";
import { planSnood, verifierPlanRond } from "./plan-rond.js";

/** Le sommet se partage en 8 parts, comme un gâteau. */
export const PARTS_DU_SOMMET = 8;
/** Écart toléré entre le tour visé et un tour qui se partage en 8 (au-delà : un tour de transition au sommet). */
export const ECART_PARTS = 0.03;
/** Largeur maximale du motif d'un point qui continue au sommet. */
export const MOTIF_MAX_SOMMET = 4;
/** Le bonnet se tricote tout en magic loop : câble conseillé (cm). */
export const CABLE_MAGIC_LOOP = 80;


/** Le câble est-il trop court pour le magic loop ? Renvoie { conseille } ou null (câble inconnu : rien). */
export function cableMagicLoop(cableCm) {
  if (!Number.isFinite(cableCm) || cableCm <= 0) return null;
  return cableCm < CABLE_MAGIC_LOOP ? { conseille: CABLE_MAGIC_LOOP } : null;
}

/**
 * Un point peut-il continuer au sommet ? Sa version en rond existe, ne déplace pas le début du tour,
 * n'a pas de tours de mise en place, ne contient que des mailles endroit et envers, et son motif fait 4 mailles au plus.
 */
export function pointSimpleAuSommet(point) {
  if (!point) return false;
  if (point.id === "jersey") return true;
  const r = convertirEnRond(point);
  if (!r.ok || r.marqueur || (r.miseEnPlace || []).length) return false;
  return r.rangs.every((t) => {
    const tous = [...(t.debut || []), ...t.motif, ...(t.fin || [])];
    return tous.every((c) => c === "end" || c === "env") && consomme(t.motif) <= MOTIF_MAX_SOMMET && !(t.debut || []).length && !(t.fin || []).length;
  });
}

/**
 * Calendrier des tours du sommet pour n mailles (multiple de 8) : true = tour de diminutions.
 * k = n / 8 mailles par part ; k − 1 tours de diminutions ; les ⌈(k − 1) / 2⌉ premiers un tour sur deux,
 * les suivants à chaque tour. Pour 88 mailles : 10 diminutions en 15 tours.
 */
export function calendrierDuSommet(n) {
  const k = n / PARTS_DU_SOMMET;
  if (!Number.isInteger(k) || k < 1) return null;
  const D = k - 1;
  const lents = Math.ceil(D / 2);
  const tours = [];
  for (let i = 0; i < lents; i++) tours.push(true, false);
  for (let i = 0; i < D - lents; i++) tours.push(true);
  return tours;
}

/** Hauteur (cm) du sommet pour n mailles en haut du corps, avec la densité du point du sommet. */
export function hauteurDuSommet(n, densite, transition = false) {
  const tours = (calendrierDuSommet(n)?.length || 0) + (transition ? 1 : 0);
  return (tours * 10) / densite.rangs;
}

/** Recette en rond d'un point préparé ; tour t (depuis le début du bloc, mise en place comprise) sur n mailles. */
function tourDuPoint(recette, t, n) {
  const mep = recette.miseEnPlace || [];
  if (t < mep.length) {
    let c = n;
    for (let i = 0; i < t; i++) c = sortieRang(mep[i], c) ?? c;
    return { rang: mep[t], entree: c };
  }
  const comptes = comptesDesRangs({ rangs: recette.rangs }, n)?.cycle;
  const i = (t - mep.length) % recette.rangs.length;
  return { rang: recette.rangs[i], entree: comptes ? comptes[i] : n, indice: i };
}

/**
 * Façon de continuer un point simple au sommet, déduite en comparant chaque colonne au tour d'en dessous :
 * « comme elles se présentent » (côtes), « à l'envers sur les V, à l'endroit sur les petits grains » (riz), ou null.
 */
export function lectureDuPoint(avant, apres) {
  if (!avant || !apres || avant.length !== apres.length) return null;
  if (apres.every((c, i) => c === avant[i])) return "comme elles se présentent";
  if (apres.every((c, i) => c !== avant[i])) return "à l'envers sur les V, à l'endroit sur les petits grains";
  return null;
}

/**
 * Les tours du sommet.
 * n : mailles en haut du corps (multiple de 8). simple : le point continue (recette, t0 = tours déjà faits dans le bloc).
 * Renvoie [{ diminution, gestes, avant, apres, lecture, numeroMotif }].
 */
export function toursDuSommet({ n, recette = null, t0 = 0 }) {
  const calendrier = calendrierDuSommet(n);
  if (!calendrier) return null;
  // Chaque maille vivante garde sa colonne d'origine (sa place dans le tour du point).
  let colonnes = Array.from({ length: n }, (_, i) => i);
  const tourComplet = (t) => {
    if (!recette || t < 0) return null;
    const { rang } = tourDuPoint(recette, t, n);
    const g = deplier(rang, n);
    return g && g.length === n ? g : null;
  };
  let precedent = tourComplet(t0 - 1);
  const tours = [];
  let numeroDim = 0;
  for (let s = 0; s < calendrier.length; s++) {
    const plein = tourComplet(t0 + s);
    const geste = (c) => (plein ? plein[c] : "end");
    const k = colonnes.length / PARTS_DU_SOMMET;
    const gestes = [];
    const suivantes = [];
    for (let p = 0; p < PARTS_DU_SOMMET; p++) {
      const part = colonnes.slice(p * k, (p + 1) * k);
      if (!calendrier[s]) {
        for (const c of part) {
          gestes.push(geste(c));
          suivantes.push(c);
        }
        continue;
      }
      for (const c of part.slice(0, k - 2)) {
        gestes.push(geste(c));
        suivantes.push(c);
      }
      // 2 mailles ensemble à l'endroit : la maille qui reste garde la colonne d'une maille endroit
      // (dans les côtes, la diminution mange d'abord une maille envers).
      const [a, b] = part.slice(k - 2);
      gestes.push("2ens");
      suivantes.push(geste(a) === "end" || geste(b) !== "end" ? a : b);
    }
    const lecture = plein && precedent ? lectureDuPoint(precedent, plein) : null;
    if (calendrier[s]) numeroDim++;
    tours.push({
      diminution: calendrier[s] ? numeroDim : null,
      gestes,
      avant: colonnes.length,
      apres: suivantes.length,
      lecture,
      // Gestes du tour sans les diminutions : s'ils sont tous pareils, on les nomme.
      base: plein ? [...new Set(colonnes.map(geste))] : ["end"],
    });
    colonnes = suivantes;
    precedent = plein;
  }
  return { tours, diminutions: numeroDim };
}

/**
 * Construit le plan d'un bonnet.
 * entree = {
 *   tourCm,                 // tour tricoté (tour de tête − aisance)
 *   hauteurCm,              // hauteur portée, sans le revers, du bord au sommet
 *   revers: false,          // le bord se replie en deux
 *   blocs: [{ id, zone: "bas" | "corps", pointId, hauteurCm?, laineId?, colonnes?, section? }],
 *   densites,
 *   densiteJersey,          // pour un sommet en jersey quand le jersey n'est pas déjà dans les densités
 *   pompon: null | { cm, laineId },
 * }
 */
export function planBonnet({ tourCm, hauteurCm, revers = false, blocs, densites, densiteJersey = null, pompon = null }) {
  const horizontaux = blocs.filter((b) => b.zone === "bas" || b.zone === "corps");
  const echec = (message, bloc = null) => ({ ok: false, erreurs: [{ bloc: bloc?.id ?? null, nomBloc: bloc ? bloc.nom || null : null, message }], explications: [] });
  const bord = horizontaux.find((b) => b.zone === "bas");
  const parties = horizontaux.filter((b) => b.zone === "corps");
  if (!parties.length) return echec("Il faut un bloc « corps ».");
  const haut = parties.at(-1);

  // ---- Le point du sommet ----
  const pointHaut = pointParId(haut.pointId);
  const enColonnes = haut.colonnes?.length >= 2;
  const simple = !enColonnes && pointSimpleAuSommet(pointHaut);
  const pointSommet = simple ? pointHaut : pointParId("jersey");
  const densiteSommet = densites[pointSommet.id] || (pointSommet.id === "jersey" ? densiteJersey : null);
  if (!densiteSommet) return echec("Densité inconnue pour le sommet.");
  const raisonJersey = simple
    ? null
    : enColonnes
      ? "Au sommet, le corps en colonnes passe en jersey : les colonnes se casseraient avec les diminutions."
      : `Au sommet, ${nomAvecArticle(pointHaut)} passe en jersey : avec les diminutions, ${pointHaut.article === "les" ? "ses motifs" : "son motif"} se casserait.`;

  // ---- Bord et corps : le tour doit aussi se partager en 8 ----
  const revers2 = revers && bord ? (bord.hauteurCm || 0) / 2 : 0;
  const hauteurTricotee = hauteurCm + revers2;
  const essai = (multiple, hauteur) => planSnood({ tourCm, hauteurCm: hauteur, blocs: horizontaux, densites, multiple, nomPiece: "le bonnet" });
  const premier = essai(PARTS_DU_SOMMET, 400);
  const corpsInfo = densites[parties[0].pointId];
  const voulu = corpsInfo ? Math.round((tourCm * corpsInfo.mailles) / 10) : null;
  let multiple = PARTS_DU_SOMMET;
  let base = premier;
  if (!premier.ok || (voulu && Math.abs(premier.plan.montage.mailles / voulu - 1) > ECART_PARTS)) {
    const libre = essai(1, 400);
    if (libre.ok) {
      multiple = 1;
      base = libre;
    }
  }
  if (!base.ok) return { ok: false, erreurs: base.erreurs, explications: base.explications || [] };
  const nHaut = base.plan.rangs.at(-1).mailles;
  const nSommet = nHaut % PARTS_DU_SOMMET === 0 ? nHaut : Math.floor(nHaut / PARTS_DU_SOMMET) * PARTS_DU_SOMMET;
  const transition = nSommet !== nHaut;
  if (nSommet < PARTS_DU_SOMMET) return echec("Le bonnet est trop petit pour un sommet en 8 parts.");
  const sommetCm = hauteurDuSommet(nSommet, densiteSommet, transition);
  if (hauteurTricotee - sommetCm < 2) return echec(`Le sommet demande environ ${Math.round(sommetCm)} cm : le bonnet est trop court pour lui. Augmente la hauteur.`);
  const r = essai(multiple, hauteurTricotee - sommetCm);
  if (!r.ok) return { ok: false, erreurs: r.erreurs, explications: r.explications || [] };

  const plan = r.plan;
  const explications = [...r.explications].map((e) =>
    multiple > 1 && /^\d+ mailles au lieu de \d+ pour que /.test(e) ? e.replace(/ juste en rond$/, " juste, avec le sommet en 8 parts") : e);
  const rangs = [...plan.rangs];
  const blocsPlan = [...plan.blocs];
  const laineId = haut.laineId || null;
  let n = rangs.at(-1).mailles;
  let debut = r.debut || 0;
  const hTour = 10 / densiteSommet.rangs;
  const premierSommet = rangs.length + 1;
  const ajouter = (tour) => {
    rangs.push({ numero: rangs.length + 1, cote: "E", blocId: "sommet", laineId, ...tour, hauteurCm: hTour });
    n = tour.mailles;
  };
  // Le marqueur revient à sa place de départ avant le sommet.
  let retour = debut ? (debut <= n / 2 ? { mailles: debut, sens: "droite", raison: "retour" } : { mailles: n - debut, sens: "gauche", raison: "retour" }) : null;
  if (transition) {
    const tr = gestesDeTransition(n, nSommet, "E");
    if (!tr) return echec("L'écart de mailles avant le sommet est trop grand.");
    explications.push(`Au premier tour du sommet, ${n - nSommet} diminution${n - nSommet > 1 ? "s réparties ramènent" : " ramène"} à ${nSommet} mailles (8 parts de ${nSommet / PARTS_DU_SOMMET})`);
    ajouter({
      type: "transition", numeroMotif: null, rangsDuMotif: null, ...(retour ? { marqueur: retour } : {}),
      segments: [{ zone: "corps", pointId: null, rang: null, transition: true, gestes: tr.gestes }], mailles: produit(tr.gestes),
    });
    retour = null;
  }
  // Le motif continue où le corps s'est arrêté (seulement sans transition : sinon on repart au début du motif).
  const blocHaut = plan.blocs.at(-1);
  const recette = simple && pointSommet.id !== "jersey" ? convertirEnRond(pointSommet) : null;
  const t0 = recette && !transition ? blocHaut.rangs - (plan.rangs.filter((x) => x.blocId === blocHaut.id && x.type === "transition").length) : 0;
  const sommet = toursDuSommet({ n: nSommet, recette, t0 });
  if (!sommet) return echec("Le sommet ne se partage pas en 8.");
  if (raisonJersey) explications.push(raisonJersey.replace(/\.$/, ""));
  for (const t of sommet.tours) {
    ajouter({
      type: "sommet", numeroMotif: null, rangsDuMotif: null,
      ...(retour ? { marqueur: retour } : {}),
      segments: [{ zone: "corps", pointId: pointSommet.id, rang: null, sommet: true, gestes: t.gestes }],
      mailles: t.apres,
      sommet: { diminution: t.diminution, diminutions: sommet.diminutions, avant: t.avant, apres: t.apres, parts: PARTS_DU_SOMMET, lecture: t.lecture, base: t.base },
    });
    retour = null;
  }
  const tours = rangs.slice(premierSommet - 1);
  blocsPlan.push({
    id: "sommet", zone: "sommet", nom: "sommet", pointId: pointSommet.id, laineId, colonnes: null,
    premierRang: premierSommet, dernierRang: rangs.length, rangs: tours.length,
    maillesCorps: n,
    // Pour le métrage : le nombre moyen de mailles du sommet.
    maillesSurface: tours.reduce((t, x) => t + x.mailles, 0) / Math.max(1, tours.length) + PARTS_DU_SOMMET / 2,
    hauteurCm: tours.reduce((t, x) => t + x.hauteurCm, 0), densite: densiteSommet,
    jersey: !simple, raison: raisonJersey,
  });

  const longueurTricotee = rangs.reduce((t, x) => t + x.hauteurCm, 0);
  const bonnet = {
    ...plan,
    type: "bonnet",
    blocs: blocsPlan,
    rangs,
    rabattage: { mailles: n, fermeture: true },
    longueur: { viseeCm: hauteurCm, reelleCm: longueurTricotee - revers2, tricoteeCm: longueurTricotee },
    revers: revers && bord ? { hauteurCm: blocsPlan.find((b) => b.zone === "bas")?.hauteurCm ?? bord.hauteurCm } : null,
    sommet: {
      pointId: pointSommet.id, jersey: !simple, raison: raisonJersey, diminutions: sommet.diminutions,
      tours: tours.length, transition, mailles: nSommet, parts: PARTS_DU_SOMMET,
    },
    pompon: pompon ? { cm: pompon.cm, laineId: pompon.laineId || null } : null,
    explications,
  };
  // Le revers réel : la moitié du bord tel qu'il est tricoté.
  if (bonnet.revers) bonnet.longueur.reelleCm = longueurTricotee - bonnet.revers.hauteurCm / 2;
  const verification = verifierPlanRond(bonnet);
  return { ok: verification.ok, erreurs: verification.erreurs, explications, plan: bonnet, grille: verification.grille };
}

