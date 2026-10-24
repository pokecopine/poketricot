// Plan d'une écharpe (et plus tard d'une couverture) tricotée à plat, dans la longueur :
// on monte la largeur, on tricote les blocs du bas vers le haut, puis on rabat.
//
// Chaque rang est découpé en segments, dans l'ordre où on les tricote :
//   lisière, bande latérale, corps, bande latérale, lisière.
// Les zones sont nommées selon leur place vue de l'endroit : bordD (bord droit), bandeD, corps, bandeG, bordG.
// Sur un rang endroit, on part du bord droit ; sur un rang envers, du bord gauche.
//
// Le plan est ensuite « tricoté » en entier par verifierPlan : aucun patron ne sort si un compte est faux.

import { pointParId } from "../catalogue/points.js";
import { geste } from "../catalogue/gestes.js";
import { consomme, produit, deplier, maillesLesPlusProches, maillesConviennent } from "./simulateur.js";
import {
  maillesPourLargeur, explicationAjustement, rangsPourHauteur, largeurCommune,
  gestesDeTransition, explicationTransition, nomAvecArticle,
} from "./dimensions.js";

export const ZONES_HORIZONTALES = ["bas", "corps", "bande", "haut"];

export const NOMS_DES_ZONES = {
  bas: "bordure du bas",
  corps: "corps",
  bande: "bande",
  haut: "bordure du haut",
  cotes: "bandes latérales",
};

const autreCote = (c) => (c === "E" ? "V" : "E");

/**
 * Le même rang, tricoté de l'autre côté : lu à l'envers, chaque geste remplacé par son équivalent.
 * Sert aux rangs de mise en place qui ne tombent pas du bon côté. Renvoie null si un geste n'a pas d'équivalent.
 */
export function retournerRang(rang) {
  const retourner = (liste) => {
    const r = [];
    for (const code of [...(liste || [])].reverse()) {
      const eq = geste(code).vuDeLAutreCote;
      if (!eq) return null;
      r.push(eq);
    }
    return r;
  };
  const motif = retourner(rang.motif);
  const debut = retourner(rang.fin);
  const fin = retourner(rang.debut);
  if (!motif || !debut || !fin) return null;
  return { cote: autreCote(rang.cote), debut, motif, fin };
}

/**
 * Prépare un point pour commencer sur un côté donné :
 * les rangs de mise en place sont retournés si besoin, et le motif démarre au premier rang du bon côté.
 * Renvoie { miseEnPlace, phase } ou { erreur }.
 */
export function preparerPoint(point, coteDepart) {
  const L = point.rangs.length;
  for (let i = 0; i < L; i++) {
    if (point.rangs[i].cote === point.rangs[(i + 1) % L].cote) {
      return { erreur: `${nomAvecArticle(point)} n'alterne pas rang endroit et rang envers : il ne peut pas se tricoter à plat avec les autres blocs` };
    }
  }
  const miseEnPlace = [];
  let cote = coteDepart;
  for (const r of point.miseEnPlace || []) {
    const rr = r.cote === cote ? r : retournerRang(r);
    if (!rr) return { erreur: `la mise en place de ${nomAvecArticle(point)} ne peut pas commencer sur ce côté` };
    miseEnPlace.push(rr);
    cote = autreCote(cote);
  }
  const phase = point.rangs.findIndex((r) => r.cote === cote);
  return { miseEnPlace, phase };
}

const premierCote = (point) => (point.miseEnPlace?.[0] || point.rangs[0]).cote;

/**
 * Construit le plan d'une écharpe.
 * projet = {
 *   largeurCm, longueurCm,
 *   blocs: [{ id, zone: "bas" | "corps" | "bande" | "haut" | "cotes", pointId, hauteurCm?, largeurMailles? }],
 *     (blocs horizontaux dans l'ordre, du bas vers le haut ; un seul corps, dont la hauteur se déduit de la longueur)
 *   densites: { [pointId]: { mailles, rangs, statut } },
 *   lisieres: "chainette" | "aucune",
 * }
 */
export function planEcharpe({ largeurCm, longueurCm, blocs, densites, lisieres = "chainette" }) {
  const erreurs = [];
  const explications = [];
  const echec = (message, bloc = null) => {
    erreurs.push({ bloc: bloc?.id ?? null, nomBloc: bloc ? NOMS_DES_ZONES[bloc.zone] : null, message });
    return { ok: false, erreurs, explications };
  };

  const horizontaux = blocs.filter((b) => ZONES_HORIZONTALES.includes(b.zone));
  const corpsIndex = horizontaux.findIndex((b) => b.zone === "corps");
  if (corpsIndex === -1 || horizontaux.filter((b) => b.zone === "corps").length > 1) return echec("Il faut un seul bloc « corps ».");
  const lateral = blocs.find((b) => b.zone === "cotes") || null;

  const infos = new Map();
  for (const b of [...horizontaux, ...(lateral ? [lateral] : [])]) {
    const point = pointParId(b.pointId);
    if (!point) return echec(`Point inconnu : ${b.pointId}`, b);
    const densite = densites[b.pointId];
    if (!densite) return echec(`Densité inconnue pour ${nomAvecArticle(point)}.`, b);
    infos.set(b.id, { point, densite });
  }
  const corps = horizontaux[corpsIndex];
  const dCorps = infos.get(corps.id).densite;

  // ---- Largeur : lisières, bandes latérales, puis corps ----
  const nLisiere = lisieres === "chainette" ? 1 : 0;
  const lisiereCm = (nLisiere * 10) / dCorps.mailles;
  let nBande = 0;
  let bandeCm = 0;
  if (lateral) {
    const { point, densite } = infos.get(lateral.id);
    const voulu = Math.max(1, Math.round(lateral.largeurMailles || 0));
    nBande = maillesLesPlusProches(point, voulu, "plat");
    if (nBande === null) return echec(`${nomAvecArticle(point)} ne tombe juste sur aucun nombre de mailles proche.`, lateral);
    const e = explicationAjustement(point, voulu, nBande, " des bandes latérales");
    if (e) explications.push(e);
    bandeCm = (nBande * 10) / densite.mailles;
  }
  const corpsCm = largeurCm - 2 * bandeCm - 2 * lisiereCm;
  if (corpsCm < 3) return echec("L'écharpe est trop étroite pour ses bandes latérales.", lateral || corps);

  // Un même nombre de mailles pour tous les blocs horizontaux, sinon des rangs de transition.
  const listeH = horizontaux.map((b) => infos.get(b.id));
  const commun = largeurCommune(listeH, corpsCm, { prioritaire: corpsIndex });
  const mailles = [];
  if (commun !== null) {
    horizontaux.forEach(() => mailles.push(commun));
    const e = explicationAjustement(infos.get(corps.id).point, Math.max(1, Math.round((corpsCm * dCorps.mailles) / 10)), commun);
    if (e) explications.push(e);
  } else {
    // Le corps d'abord ; puis, en s'éloignant du corps, chaque bloc garde le nombre de mailles de son voisin
    // s'il lui convient (à ± 5 %), pour éviter des rangs de transition inutiles.
    const choix = new Array(horizontaux.length);
    const fixer = (i, voisin) => {
      const b = horizontaux[i];
      const { point, densite } = infos.get(b.id);
      const ideal = (corpsCm * densite.mailles) / 10;
      if (voisin !== undefined && maillesConviennent(point, voisin) && Math.abs(voisin / ideal - 1) <= 0.05) {
        choix[i] = { n: voisin, explication: null };
        return true;
      }
      const r = maillesPourLargeur(point, corpsCm, densite);
      if (r.retenu === null) return false;
      choix[i] = { n: r.retenu, explication: r.explication && r.explication + (b.zone === "corps" ? "" : ` (${NOMS_DES_ZONES[b.zone]})`) };
      return true;
    };
    const ordre = [corpsIndex];
    for (let i = corpsIndex - 1; i >= 0; i--) ordre.push(i);
    for (let i = corpsIndex + 1; i < horizontaux.length; i++) ordre.push(i);
    for (const i of ordre) {
      const voisin = i === corpsIndex ? undefined : choix[i < corpsIndex ? i + 1 : i - 1].n;
      if (!fixer(i, voisin)) {
        return echec(`${nomAvecArticle(infos.get(horizontaux[i].id).point)} ne tombe juste sur aucun nombre de mailles proche.`, horizontaux[i]);
      }
    }
    for (const c of choix) {
      mailles.push(c.n);
      if (c.explication) explications.push(c.explication);
    }
  }

  // ---- Hauteurs ----
  const hauteurs = new Map();
  let autresCm = 0;
  horizontaux.forEach((b, i) => {
    const { densite } = infos.get(b.id);
    const transition = i > 0 && mailles[i] !== mailles[i - 1] ? 10 / densite.rangs : 0;
    autresCm += transition;
    if (b.zone === "corps") return;
    const h = rangsPourHauteur(infos.get(b.id).point, b.hauteurCm || 0, densite);
    hauteurs.set(b.id, h);
    autresCm += h.hauteurCm;
  });
  const corpsHauteurVoulue = longueurCm - autresCm;
  if (corpsHauteurVoulue < 2) return echec("Les bordures sont plus longues que l'écharpe : le corps n'a plus de place.", corps);
  hauteurs.set(corps.id, rangsPourHauteur(infos.get(corps.id).point, corpsHauteurVoulue, dCorps));

  // ---- Rangs ----
  const bande = lateral ? infos.get(lateral.id).point : null;
  let cote = premierCote(infos.get(horizontaux[0].id).point);
  let suiteBande = null;
  if (bande) {
    const p = preparerPoint(bande, cote);
    if (p.erreur) return echec(p.erreur, lateral);
    suiteBande = p;
  }
  const rangBande = (t) => {
    const { miseEnPlace, phase } = suiteBande;
    if (t < miseEnPlace.length) return miseEnPlace[t];
    return bande.rangs[(phase + t - miseEnPlace.length) % bande.rangs.length];
  };

  const rangs = [];
  const segmentsDuRang = (c, corpsSegment) => {
    const t = rangs.length;
    const bandes = (zone) => {
      if (!bande) return [];
      const r = rangBande(t);
      return [{ zone, pointId: lateral.pointId, rang: r, gestes: deplier(r, nBande) }];
    };
    const lisiere = (zone, code) => (nLisiere ? [{ zone, pointId: null, rang: null, lisiere: true, gestes: [code] }] : []);
    const corpsZ = { zone: "corps", ...corpsSegment };
    return c === "E"
      ? [...lisiere("bordD", "glAv"), ...bandes("bandeD"), corpsZ, ...bandes("bandeG"), ...lisiere("bordG", "end")]
      : [...lisiere("bordG", "glAv"), ...bandes("bandeG"), corpsZ, ...bandes("bandeD"), ...lisiere("bordD", "end")];
  };
  const ajouterRang = (infosRang, corpsSegment, hauteurRangCm) => {
    const segments = segmentsDuRang(cote, corpsSegment);
    rangs.push({
      numero: rangs.length + 1, cote, ...infosRang, segments,
      mailles: segments.reduce((t, s) => t + produit(s.gestes), 0),
      hauteurCm: hauteurRangCm,
    });
    cote = autreCote(cote);
  };

  const plansDesBlocs = [];
  let maillesCorps = mailles[0];
  for (let i = 0; i < horizontaux.length; i++) {
    const b = horizontaux[i];
    const { point, densite } = infos.get(b.id);
    const hRang = 10 / densite.rangs;
    const premier = rangs.length + 1;
    if (mailles[i] !== maillesCorps) {
      const tr = gestesDeTransition(maillesCorps, mailles[i], cote);
      if (!tr) return echec("L'écart de mailles entre deux blocs est trop grand pour un seul rang de transition.", b);
      ajouterRang({ blocId: b.id, type: "transition", numeroMotif: null, rangsDuMotif: null }, { pointId: null, rang: null, transition: true, gestes: tr.gestes }, hRang);
      explications.push(explicationTransition(maillesCorps, mailles[i], point));
      maillesCorps = mailles[i];
    }
    const p = preparerPoint(point, cote);
    if (p.erreur) return echec(p.erreur, b);
    for (const r of p.miseEnPlace) {
      ajouterRang({ blocId: b.id, type: "miseEnPlace", numeroMotif: null, rangsDuMotif: null }, { pointId: b.pointId, rang: r, gestes: deplier(r, maillesCorps) || [] }, hRang);
    }
    const L = point.rangs.length;
    const h = hauteurs.get(b.id);
    for (let r = 0; r < h.repetitions * L; r++) {
      const rang = point.rangs[(p.phase + r) % L];
      ajouterRang(
        { blocId: b.id, type: "motif", numeroMotif: (r % L) + 1, rangsDuMotif: L },
        { pointId: b.pointId, rang, gestes: deplier(rang, maillesCorps) || [] },
        hRang,
      );
    }
    plansDesBlocs.push({
      id: b.id, zone: b.zone, nom: NOMS_DES_ZONES[b.zone], pointId: b.pointId,
      premierRang: premier, dernierRang: rangs.length, rangs: rangs.length - premier + 1,
      maillesCorps: mailles[i], hauteurCm: rangs.slice(premier - 1).reduce((t, r) => t + r.hauteurCm, 0),
      densite: infos.get(b.id).densite,
    });
  }

  const montage = {
    mailles: 2 * nLisiere + 2 * nBande + mailles[0],
    repartition: { bordD: nLisiere, bandeD: nBande, corps: mailles[0], bandeG: nBande, bordG: nLisiere },
  };
  const derniers = rangs[rangs.length - 1].mailles;
  const plan = {
    type: "echarpe",
    montage,
    lisieres: { type: lisieres, mailles: nLisiere },
    bandesLaterales: lateral ? { blocId: lateral.id, pointId: lateral.pointId, mailles: nBande, largeurCm: bandeCm } : null,
    blocs: plansDesBlocs,
    rangs,
    rabattage: { mailles: derniers },
    largeur: {
      viseeCm: largeurCm,
      reelleCm: (mailles[corpsIndex] * 10) / dCorps.mailles + 2 * bandeCm + 2 * lisiereCm,
    },
    longueur: { viseeCm: longueurCm, reelleCm: rangs.reduce((t, r) => t + r.hauteurCm, 0) },
    estime: Object.values(densites).some((d) => d && d.statut !== "mesuree"),
    explications,
  };
  const verification = verifierPlan(plan);
  return { ok: verification.ok, erreurs: verification.erreurs, explications, plan, grille: verification.grille };
}

/**
 * Tricote le plan en entier : chaque geste doit prendre exactement les mailles présentes,
 * chaque motif doit tomber juste, le compte de fin de chaque bloc doit correspondre au plan.
 * Renvoie { ok, erreurs, grille } ; grille[0] = premier rang (en bas), vue de l'endroit, indice 0 = bord droit.
 * S'arrête à la première erreur et nomme le bloc en cause.
 */
export function verifierPlan(plan) {
  const grille = [];
  const nomDuBloc = (id) => plan.blocs.find((b) => b.id === id)?.nom ?? null;
  const erreur = (rang, message) => ({
    ok: false, grille,
    erreurs: [{ rang: rang?.numero ?? null, bloc: rang?.blocId ?? null, nomBloc: rang ? nomDuBloc(rang.blocId) : null, message }],
  });

  const comptes = { ...plan.montage.repartition };
  const totalMontage = Object.values(comptes).reduce((t, n) => t + n, 0);
  if (totalMontage !== plan.montage.mailles) return erreur(null, `le montage annonce ${plan.montage.mailles} mailles mais en répartit ${totalMontage}`);

  let precedent = null;
  for (const rang of plan.rangs) {
    if (precedent && precedent.cote === rang.cote) return erreur(rang, "deux rangs de suite sur le même côté");
    const aspects = [];
    for (const s of rang.segments) {
      const n = comptes[s.zone];
      if (n === undefined) return erreur(rang, `zone inconnue : ${s.zone}`);
      if (consomme(s.gestes) !== n) {
        return erreur(rang, `${s.zone === "corps" ? "le corps" : "une bordure"} a ${n} mailles mais le rang en tricote ${consomme(s.gestes)}`);
      }
      if (s.rang) {
        if (s.rang.cote !== rang.cote) return erreur(rang, "un rang du point est tricoté du mauvais côté");
        const attendu = deplier(s.rang, n);
        if (!attendu) return erreur(rang, `le motif ne tombe pas juste sur ${n} mailles`);
        if (attendu.length !== s.gestes.length || attendu.some((c, i) => c !== s.gestes[i])) {
          return erreur(rang, "les gestes écrits ne suivent pas le motif du point");
        }
      }
      for (const code of s.gestes) {
        const g = geste(code);
        const vus = rang.cote === "V" ? g.envers : g.endroit;
        if (!vus) return erreur(rang, `« ${g.nom} » se fait sur l'endroit du travail`);
        aspects.push(...vus);
      }
      comptes[s.zone] = produit(s.gestes);
    }
    const total = Object.values(comptes).reduce((t, n) => t + n, 0);
    if (total !== rang.mailles) return erreur(rang, `le rang annonce ${rang.mailles} mailles, il en reste ${total}`);
    if (rang.cote === "V") aspects.reverse();
    grille.push(aspects);
    const bloc = plan.blocs.find((b) => b.dernierRang === rang.numero);
    if (bloc && comptes.corps !== bloc.maillesCorps) {
      return erreur(rang, `à la fin du bloc, le corps devrait avoir ${bloc.maillesCorps} mailles, il en a ${comptes.corps}`);
    }
    precedent = rang;
  }
  const final = Object.values(comptes).reduce((t, n) => t + n, 0);
  if (final !== plan.rabattage.mailles) return erreur(precedent, `le rabattage annonce ${plan.rabattage.mailles} mailles, il en reste ${final}`);
  return { ok: true, erreurs: [], grille };
}
