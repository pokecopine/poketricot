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
import { consomme, produit, deplier, maillesLesPlusProches, maillesConviennent, comptesDesRangs, sortieRang } from "./simulateur.js";
import {
  maillesPourLargeur, explicationAjustement, rangsPourHauteur, rangsPourHauteurMotif, largeurCommune,
  gestesDeTransition, explicationTransition, nomAvecArticle,
} from "./dimensions.js";
import { repartirMailles, repartitionEgale, densiteDesColonnes, motifCommun, explicationColonnes } from "./colonnes.js";

/** Au-delà, un motif est trop large pour des bandes latérales (quelques mailles de chaque côté). */
export const MAILLES_MAX_BANDE_LATERALE = 12;

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
 * Prépare un point pour commencer sur un côté donné, sur n mailles :
 * les rangs de mise en place sont retournés si besoin, et le motif démarre au premier rang du bon côté.
 * Pour un point dont le nombre de mailles change, le motif doit aussi démarrer sur un rang qui prend n mailles ;
 * s'il n'y en a pas de ce côté, un rang de jersey (endroit ou envers) est ajouté avant (ajoute = true).
 * Renvoie { miseEnPlace, phase, comptes, ajoute } ou { erreur } ;
 * comptes : mailles au début de chaque rang du motif (null quand n n'est pas donné).
 */
export function preparerPoint(point, coteDepart, n = null) {
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
  const comptes = n !== null ? comptesDesRangs({ rangs: point.rangs }, n)?.cycle || null : null;
  const bonne = (i) => point.rangs[i].cote === cote && (!comptes || comptes[i] === n);
  let phase = point.rangs.findIndex((r, i) => bonne(i));
  let ajoute = false;
  if (phase === -1 && comptes) {
    miseEnPlace.push({ cote, debut: [], motif: [cote === "E" ? "end" : "env"], fin: [], neutre: true });
    cote = autreCote(cote);
    phase = point.rangs.findIndex((r, i) => bonne(i));
    ajoute = true;
  }
  if (phase === -1) return { erreur: `${nomAvecArticle(point)} ne peut pas commencer sur ce rang` };
  return { miseEnPlace, phase, comptes, ajoute };
}

/**
 * Le rang t d'un point préparé (mise en place puis motif en boucle) et le nombre de mailles qu'il prend,
 * pour un bloc de n mailles (au repos, entre deux motifs).
 */
export function rangPrepare(point, prep, t, n) {
  const { miseEnPlace, phase, comptes } = prep;
  if (t < miseEnPlace.length) {
    let c = n;
    for (let i = 0; i < t; i++) c = sortieRang(miseEnPlace[i], c) ?? c;
    return { rang: miseEnPlace[t], entree: c };
  }
  const i = (phase + t - miseEnPlace.length) % point.rangs.length;
  return { rang: point.rangs[i], entree: comptes ? comptes[i] : n, indice: i };
}

const premierCote = (point) => (point.miseEnPlace?.[0] || point.rangs[0]).cote;

/**
 * Construit le plan d'une écharpe.
 * projet = {
 *   largeurCm, longueurCm,
 *   blocs: [{ id, zone: "bas" | "corps" | "bande" | "haut" | "cotes", pointId, hauteurCm?, largeurMailles?, laineId?, colonnes? }],
 *     (blocs horizontaux dans l'ordre, du bas vers le haut ; le corps peut être coupé en plusieurs parties
 *      par des bandes : toutes ses parties ont le même point et se partagent la longueur restante)
 *     colonnes : [{ id, pointId, mailles? }] (2 ou plus) — le bloc est coupé dans la largeur, chaque colonne
 *      avec son point ; mailles fixe la largeur d'une colonne, les autres se partagent le reste.
 *     laineId : une autre laine pour ce bloc (la couleur change sur toute la largeur du rang).
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
  if (corpsIndex === -1) return echec("Il faut un bloc « corps ».");
  const partiesCorps = horizontaux.filter((b) => b.zone === "corps");
  if (partiesCorps.some((b) => b.pointId !== partiesCorps[0].pointId)) return echec("Toutes les parties du corps doivent avoir le même point.", partiesCorps[0]);
  const lateral = blocs.find((b) => b.zone === "cotes") || null;

  const infos = new Map();
  for (const b of [...horizontaux, ...(lateral ? [lateral] : [])]) {
    if (b.zone !== "cotes" && b.colonnes?.length >= 2) {
      const colonnes = [];
      for (const c of b.colonnes) {
        const point = pointParId(c.pointId);
        if (!point) return echec(`Point inconnu : ${c.pointId}`, b);
        const densite = densites[c.pointId];
        if (!densite) return echec(`Densité inconnue pour ${nomAvecArticle(point)}.`, b);
        colonnes.push({ id: c.id, pointId: c.pointId, point, densite, mailles: c.mailles });
      }
      infos.set(b.id, {
        point: pointParId(b.pointId) || colonnes[0].point,
        densite: densiteDesColonnes(colonnes.map((c) => c.densite)),
        colonnes,
        convient: (n) => repartirMailles(colonnes, n) !== null,
        convientEgal: (n) => repartitionEgale(colonnes, n),
      });
      continue;
    }
    const point = pointParId(b.pointId);
    if (!point) return echec(`Point inconnu : ${b.pointId}`, b);
    const densite = densites[b.pointId];
    if (!densite) return echec(`Densité inconnue pour ${nomAvecArticle(point)}.`, b);
    infos.set(b.id, { point, densite });
  }
  const convient = (info, n) => (info.convient ? info.convient(n) : maillesConviennent(info.point, n));
  // Pour un bloc en colonnes : le nombre de mailles le plus proche où les colonnes tombent juste.
  const plusProche = (info, cible) => {
    if (!info.colonnes) return maillesLesPlusProches(info.point, cible, "plat");
    for (let e = 0; e <= 200; e++) {
      if (cible - e > 0 && convient(info, cible - e)) return cible - e;
      if (convient(info, cible + e)) return cible + e;
    }
    return null;
  };
  const DE_LA_ZONE = { bas: "de la bordure du bas", corps: "du corps", bande: "de la bande", haut: "de la bordure du haut" };
  const ajustement = (info, voulu, retenu, zone) => {
    if (!info.colonnes) return explicationAjustement(info.point, voulu, retenu);
    if (retenu === null || retenu === voulu) return null;
    return `${retenu} mailles au lieu de ${voulu} pour que les colonnes ${DE_LA_ZONE[zone]} tombent juste`;
  };
  const hauteurDuBloc = (info, cm) =>
    info.colonnes ? rangsPourHauteurMotif(motifCommun(info.colonnes.map((c) => c.point)), cm, info.densite) : rangsPourHauteur(info.point, cm, info.densite);
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
  // Des colonnes égales d'abord (Deborah divise en parts égales), quitte à s'écarter un peu plus de la largeur.
  let commun = null;
  if (listeH.some((x) => x.colonnes)) {
    commun = largeurCommune(listeH.map((x) => (x.colonnes ? { ...x, convient: x.convientEgal } : x)), corpsCm, { prioritaire: corpsIndex, tolerance: 0.1 });
  }
  if (commun === null) commun = largeurCommune(listeH, corpsCm, { prioritaire: corpsIndex });
  const mailles = [];
  if (commun !== null) {
    horizontaux.forEach(() => mailles.push(commun));
    const e = ajustement(infos.get(corps.id), Math.max(1, Math.round((corpsCm * dCorps.mailles) / 10)), commun, "corps");
    if (e) explications.push(e);
  } else {
    // Le corps d'abord ; puis, en s'éloignant du corps, chaque bloc garde le nombre de mailles de son voisin
    // s'il lui convient (à ± 5 %), pour éviter des rangs de transition inutiles.
    const choix = new Array(horizontaux.length);
    const fixer = (i, voisin) => {
      const b = horizontaux[i];
      const info = infos.get(b.id);
      const ideal = (corpsCm * info.densite.mailles) / 10;
      if (voisin !== undefined && convient(info, voisin) && Math.abs(voisin / ideal - 1) <= 0.05) {
        choix[i] = { n: voisin, explication: null };
        return true;
      }
      const voulu = Math.max(1, Math.round(ideal));
      const retenu = info.colonnes ? plusProche(info, voulu) : maillesPourLargeur(info.point, corpsCm, info.densite).retenu;
      if (retenu === null) return false;
      const explication = ajustement(info, voulu, retenu, b.zone);
      choix[i] = { n: retenu, explication: explication && explication + (b.zone === "corps" || info.colonnes ? "" : ` (${NOMS_DES_ZONES[b.zone]})`) };
      return true;
    };
    const ordre = [corpsIndex];
    for (let i = corpsIndex - 1; i >= 0; i--) ordre.push(i);
    for (let i = corpsIndex + 1; i < horizontaux.length; i++) ordre.push(i);
    for (const i of ordre) {
      const voisin = i === corpsIndex ? undefined : choix[i < corpsIndex ? i + 1 : i - 1].n;
      if (!fixer(i, voisin)) {
        const info = infos.get(horizontaux[i].id);
        return echec(
          info.colonnes
            ? "Les colonnes ne tombent juste sur aucun nombre de mailles proche : change la largeur d'une colonne, ou répartis-les également."
            : `${nomAvecArticle(info.point)} ne tombe juste sur aucun nombre de mailles proche.`,
          horizontaux[i],
        );
      }
    }
    for (const c of choix) {
      mailles.push(c.n);
      if (c.explication) explications.push(c.explication);
    }
  }

  // ---- Colonnes : mailles de chaque colonne ----
  const repartitions = new Map();
  // Les colonnes de blocs différents s'alignent autant que possible (damier) : celles du corps servent de modèle.
  const ordreColonnes = horizontaux.map((b, i) => i).sort((a, b) => (horizontaux[a].zone === "corps" ? 0 : 1) - (horizontaux[b].zone === "corps" ? 0 : 1));
  const modeles = new Map();
  ordreColonnes.forEach((i) => {
    const b = horizontaux[i];
    const info = infos.get(b.id);
    if (!info.colonnes) return;
    const cle = `${info.colonnes.length}|${mailles[i]}`;
    const r = repartirMailles(info.colonnes, mailles[i], "plat", modeles.get(cle) || null);
    if (r && !modeles.has(cle)) modeles.set(cle, r);
    repartitions.set(b.id, r);
  });
  horizontaux.forEach((b) => {
    const r = repartitions.get(b.id);
    const e = r && explicationColonnes(infos.get(b.id).colonnes, r, DE_LA_ZONE[b.zone]);
    if (e && !explications.includes(e)) explications.push(e);
  });
  for (const [id, r] of repartitions) if (!r) return echec("Les colonnes ne tombent pas juste.", horizontaux.find((b) => b.id === id));
  const largeurBlocCm = (b, i) => {
    const info = infos.get(b.id);
    if (!info.colonnes) return (mailles[i] * 10) / info.densite.mailles;
    return repartitions.get(b.id).reduce((t, m, j) => t + (m * 10) / info.colonnes[j].densite.mailles, 0);
  };

  // ---- Hauteurs ----
  const hauteurs = new Map();
  let autresCm = 0;
  horizontaux.forEach((b, i) => {
    const { densite } = infos.get(b.id);
    const transition = i > 0 && mailles[i] !== mailles[i - 1] ? 10 / densite.rangs : 0;
    autresCm += transition;
    if (b.zone === "corps") return;
    const h = hauteurDuBloc(infos.get(b.id), b.hauteurCm || 0);
    hauteurs.set(b.id, h);
    autresCm += h.hauteurCm;
  });
  const corpsHauteurVoulue = longueurCm - autresCm;
  if (corpsHauteurVoulue < 2 * partiesCorps.length) return echec("Les bordures et les bandes sont plus longues que l'écharpe : le corps n'a plus de place.", corps);
  for (const b of partiesCorps) {
    hauteurs.set(b.id, hauteurDuBloc(infos.get(b.id), corpsHauteurVoulue / partiesCorps.length));
  }

  // ---- Rangs ----
  const bande = lateral ? infos.get(lateral.id).point : null;
  let cote = premierCote(infos.get(horizontaux[0].id).point);
  let suiteBande = null;
  if (bande) {
    const p = preparerPoint(bande, cote, nBande);
    if (p.erreur) return echec(p.erreur, lateral);
    suiteBande = p;
  }
  const rangBande = (t) => rangPrepare(bande, suiteBande, t, nBande);

  const rangs = [];
  const segmentsDuRang = (c, corpsSegment) => {
    const t = rangs.length;
    const bandes = (zone) => {
      if (!bande) return [];
      const { rang: r, entree } = rangBande(t);
      return [{ zone, pointId: lateral.pointId, rang: r, gestes: deplier(r, entree) }];
    };
    const lisiere = (zone, code) => (nLisiere ? [{ zone, pointId: null, rang: null, lisiere: true, gestes: [code] }] : []);
    // Colonnes : sur un rang endroit, on part du bord droit (colonne 1) ; sur l'envers, de la dernière colonne.
    const corpsZ = Array.isArray(corpsSegment)
      ? (c === "E" ? corpsSegment : [...corpsSegment].reverse())
      : [{ zone: "corps", ...corpsSegment }];
    return c === "E"
      ? [...lisiere("bordD", "glAv"), ...bandes("bandeD"), ...corpsZ, ...bandes("bandeG"), ...lisiere("bordG", "end")]
      : [...lisiere("bordG", "glAv"), ...bandes("bandeG"), ...corpsZ, ...bandes("bandeD"), ...lisiere("bordD", "end")];
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
    const info = infos.get(b.id);
    const { point, densite } = info;
    const hRang = 10 / densite.rangs;
    const premier = rangs.length + 1;
    const laineId = b.laineId || null;
    if (mailles[i] !== maillesCorps) {
      const tr = gestesDeTransition(maillesCorps, mailles[i], cote);
      if (!tr) return echec("L'écart de mailles entre deux blocs est trop grand pour un seul rang de transition.", b);
      ajouterRang({ blocId: b.id, laineId, type: "transition", numeroMotif: null, rangsDuMotif: null }, { pointId: null, rang: null, transition: true, gestes: tr.gestes }, hRang);
      explications.push(explicationTransition(maillesCorps, mailles[i], info.colonnes ? info.colonnes[0].point : point));
      maillesCorps = mailles[i];
    }
    if (info.colonnes) {
      const rep = repartitions.get(b.id);
      const preps = [];
      for (const [j, c] of info.colonnes.entries()) {
        const pc = preparerPoint(c.point, cote, rep[j]);
        if (pc.erreur) return echec(pc.erreur, b);
        preps.push(pc);
      }
      const { L: Lc, mep: mepMax } = motifCommun(info.colonnes.map((c) => c.point));
      const H = hauteurs.get(b.id).rangs;
      for (let t = 0; t < H; t++) {
        const segments = info.colonnes.map((c, j) => {
          const { rang: r, entree } = rangPrepare(c.point, preps[j], t, rep[j]);
          return { zone: "corps", colonne: j + 1, colonneId: c.id, pointId: c.pointId, rang: r, gestes: deplier(r, entree) || [] };
        });
        const enMiseEnPlace = t < mepMax;
        ajouterRang(
          {
            blocId: b.id, laineId, type: enMiseEnPlace ? "miseEnPlace" : "motif",
            numeroMotif: enMiseEnPlace ? null : ((t - mepMax) % Lc) + 1, rangsDuMotif: enMiseEnPlace ? null : Lc,
          },
          segments, hRang,
        );
      }
      plansDesBlocs.push({
        id: b.id, zone: b.zone, nom: NOMS_DES_ZONES[b.zone], pointId: b.pointId, laineId,
        premierRang: premier, dernierRang: rangs.length, rangs: rangs.length - premier + 1,
        maillesCorps: mailles[i], hauteurCm: rangs.slice(premier - 1).reduce((t, r) => t + r.hauteurCm, 0),
        densite: info.densite,
        colonnes: info.colonnes.map((c, j) => ({
          id: c.id, pointId: c.pointId, mailles: rep[j], largeurCm: (rep[j] * 10) / c.densite.mailles, densite: c.densite,
        })),
      });
      continue;
    }
    const p = preparerPoint(point, cote, maillesCorps);
    if (p.erreur) return echec(p.erreur, b);
    if (p.ajoute) {
      explications.push(`1 rang ${p.miseEnPlace.at(-1).cote === "E" ? "endroit" : "envers"} avant ${nomAvecArticle(point)} (${NOMS_DES_ZONES[b.zone]}), pour que son motif commence sur le bon côté`);
    }
    p.miseEnPlace.forEach((r, t) => {
      const { entree } = rangPrepare(point, p, t, maillesCorps);
      ajouterRang({ blocId: b.id, laineId, type: "miseEnPlace", numeroMotif: null, rangsDuMotif: null }, { pointId: b.pointId, rang: r, gestes: deplier(r, entree) || [] }, hRang);
    });
    const L = point.rangs.length;
    const h = hauteurs.get(b.id);
    for (let r = 0; r < h.repetitions * L; r++) {
      const { rang, entree } = rangPrepare(point, p, p.miseEnPlace.length + r, maillesCorps);
      ajouterRang(
        { blocId: b.id, laineId, type: "motif", numeroMotif: (r % L) + 1, rangsDuMotif: L },
        { pointId: b.pointId, rang, gestes: deplier(rang, entree) || [] },
        hRang,
      );
    }
    plansDesBlocs.push({
      id: b.id, zone: b.zone, nom: NOMS_DES_ZONES[b.zone], pointId: b.pointId, laineId, colonnes: null,
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
      reelleCm: largeurBlocCm(corps, corpsIndex) + 2 * bandeCm + 2 * lisiereCm,
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
    // Une zone peut être faite de plusieurs segments (le corps en colonnes) : ensemble, ils prennent toutes ses mailles.
    const prises = {};
    const produites = {};
    for (const s of rang.segments) {
      if (comptes[s.zone] === undefined) return erreur(rang, `zone inconnue : ${s.zone}`);
      prises[s.zone] = (prises[s.zone] || 0) + consomme(s.gestes);
      produites[s.zone] = (produites[s.zone] || 0) + produit(s.gestes);
    }
    for (const [zone, n] of Object.entries(prises)) {
      if (n !== comptes[zone]) {
        return erreur(rang, `${zone === "corps" ? "le corps" : "une bordure"} a ${comptes[zone]} mailles mais le rang en tricote ${n}`);
      }
    }
    for (const s of rang.segments) {
      if (s.rang) {
        const n = consomme(s.gestes);
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
    }
    Object.assign(comptes, produites);
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
