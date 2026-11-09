// Plan d'un snood tricoté en rond, du bas vers le haut, sans couture (E4, 0.14.0).
// On monte le tour, on joint en rond, on tricote les blocs du bas vers le haut, tous les tours sur l'endroit,
// avec la version en rond de chaque point ; puis on rabat souplement.
//
// Un seul segment par tour (« corps ») ou une colonne par segment, depuis le marqueur.
// Un tour peut demander de déplacer le marqueur (marqueur : { mailles, sens, raison }) :
//   raison « motif » : le point se décale d'un tour à l'autre (toujours vers la gauche) ;
//   raison « retour » : au premier tour d'un bloc, le marqueur revient à sa place de départ (côté le plus court).
//
// Le plan est ensuite « tricoté » en entier par verifierPlanRond : aucun patron ne sort si un compte est faux.

import { pointParId } from "../catalogue/points.js";
import { geste } from "../catalogue/gestes.js";
import { consomme, produit, deplier, maillesLesPlusProches, maillesConviennent, comptesDesRangs, sortieRang, convertirEnRond, tricoterTour } from "./simulateur.js";
import { rangsPourHauteurMotif, gestesDeTransition, explicationTransition, nomAvecArticle } from "./dimensions.js";
import { repartirMailles, repartitionEgale, densiteDesColonnes, motifCommun, explicationColonnes } from "./colonnes.js";
import { ZONES_HORIZONTALES, NOMS_DES_ZONES, repartirLeCorps } from "./plan.js";

const DE_LA_ZONE = { bas: "de la bordure du bas", corps: "du corps", bande: "de la bande", haut: "de la bordure du haut" };
const tombe = (point) => (point.article === "les" ? "tombent" : "tombe");

/** Câble conseillé pour un tour donné (aiguilles circulaires : le câble doit être plus court que le tour). */
export function cableConseille(tourCm) {
  if (tourCm < 100) return 40;
  if (tourCm < 160) return 80;
  return 100;
}

/** Le câble est-il trop long pour ce tour ? Renvoie { conseille } ou null. Un câble inconnu ne dit rien. */
export function cableTropLong(cableCm, tourCm) {
  if (!Number.isFinite(cableCm) || !Number.isFinite(tourCm) || cableCm <= 0) return null;
  // La longueur annoncée d'une aiguille circulaire va d'une pointe à l'autre : elle doit tenir dans le tour.
  return cableCm > tourCm ? { conseille: cableConseille(tourCm) } : null;
}

/** Recette en rond d'un point, avec ses comptes ; null si elle ne tombe pas juste sur n mailles. */
function recetteRond(point) {
  const r = convertirEnRond(point);
  return r.ok ? r : null;
}

/** Tours d'un point préparé en rond, à partir du tour t, pour n mailles au repos. */
function tourDuPoint(recette, t, n) {
  const mep = recette.miseEnPlace || [];
  let c = n;
  if (t < mep.length) {
    for (let i = 0; i < t; i++) c = sortieRang(mep[i], c) ?? c;
    return { rang: mep[t], entree: c };
  }
  const comptes = comptesDesRangs({ rangs: recette.rangs }, n)?.cycle;
  const i = (t - mep.length) % recette.rangs.length;
  return { rang: recette.rangs[i], entree: comptes ? comptes[i] : n, indice: i };
}

/**
 * Construit le plan d'un snood.
 * projet = {
 *   tourCm, hauteurCm,
 *   blocs: [{ id, zone: "bas" | "corps" | "bande" | "haut", pointId, hauteurCm?, laineId?, colonnes? }]
 *     (du bas vers le haut ; pas de bandes latérales en rond),
 *   densites: { [pointId]: { mailles, rangs, statut } },
 * }
 */
export function planSnood({ tourCm, hauteurCm, blocs, densites, multiple = 1, nomPiece = "le snood" }) {
  const erreurs = [];
  const explications = [];
  const echec = (message, bloc = null) => {
    erreurs.push({ bloc: bloc?.id ?? null, nomBloc: bloc ? bloc.nom || NOMS_DES_ZONES[bloc.zone] : null, message });
    return { ok: false, erreurs, explications };
  };

  const horizontaux = blocs.filter((b) => ZONES_HORIZONTALES.includes(b.zone));
  const corpsIndex = horizontaux.findIndex((b) => b.zone === "corps");
  if (corpsIndex === -1) return echec("Il faut un bloc « corps ».");
  const partiesCorps = horizontaux.filter((b) => b.zone === "corps");
  // Depuis 0.16.0 (sections), les parties du corps peuvent avoir chacune leur point.

  const infos = new Map();
  for (const b of horizontaux) {
    if (b.colonnes?.length >= 2) {
      const colonnes = [];
      for (const c of b.colonnes) {
        const point = pointParId(c.pointId);
        if (!point) return echec(`Point inconnu : ${c.pointId}`, b);
        const densite = densites[c.pointId];
        if (!densite) return echec(`Densité inconnue pour ${nomAvecArticle(point)}.`, b);
        const recette = recetteRond(point);
        if (!recette) return echec(`${nomAvecArticle(point)} ne se tricote pas en rond.`, b);
        if (recette.marqueur) {
          return echec(`${nomAvecArticle(point)} déplace le début du tour : ${point.article === "les" ? "elles prennent" : "il prend"} tout le tour, pas une colonne.`, b);
        }
        colonnes.push({ id: c.id, pointId: c.pointId, point, densite, mailles: c.mailles, recette });
      }
      infos.set(b.id, {
        point: pointParId(b.pointId) || colonnes[0].point,
        densite: densiteDesColonnes(colonnes.map((c) => c.densite)),
        colonnes,
        convient: (n) => repartirMailles(colonnes, n, "rond") !== null,
        convientEgal: (n) => repartitionEgale(colonnes, n, "rond"),
      });
      continue;
    }
    const point = pointParId(b.pointId);
    if (!point) return echec(`Point inconnu : ${b.pointId}`, b);
    const densite = densites[b.pointId];
    if (!densite) return echec(`Densité inconnue pour ${nomAvecArticle(point)}.`, b);
    const recette = recetteRond(point);
    if (!recette) return echec(`${nomAvecArticle(point)} ne se tricote pas en rond : ${convertirEnRond(point).erreur}.`, b);
    infos.set(b.id, { point, densite, recette, convient: (n) => maillesConviennent(point, n, "rond") });
  }
  const plusProche = (info, cible, egal = false) => {
    const ok = egal && info.convientEgal ? info.convientEgal : info.convient;
    for (let e = 0; e <= 200; e++) {
      if (ok(cible + e)) return cible + e;
      if (cible - e > 0 && ok(cible - e)) return cible - e;
    }
    return null;
  };

  // ---- Le tour : le corps décide ----
  const corps = horizontaux[corpsIndex];
  const iCorps = infos.get(corps.id);
  // Bonnet (0.17.0) : le tour du corps doit aussi se partager en `multiple` parts égales (8 pour le sommet).
  if (multiple > 1) {
    const { convient, convientEgal } = iCorps;
    iCorps.convient = (n) => n % multiple === 0 && convient(n);
    if (convientEgal) iCorps.convientEgal = (n) => n % multiple === 0 && convientEgal(n);
  }
  const voulu = Math.max(1, Math.round((tourCm * iCorps.densite.mailles) / 10));
  const mailles = new Array(horizontaux.length);
  // D'abord, un nombre qui convient à tous les blocs, à 5 % du tour voulu (des colonnes égales si possible).
  let commun = null;
  for (const egal of iCorps.colonnes ? [true, false] : [false]) {
    for (let e = 0; e <= Math.floor(voulu * 0.05) && commun === null; e++) {
      // À égalité, le plus grand : un tour un peu plus large passe mieux la tête.
      for (const n of e ? [voulu + e, voulu - e] : [voulu]) {
        if (n < 1) continue;
        const okCorps = egal ? iCorps.convientEgal(n) : iCorps.convient(n);
        if (okCorps && horizontaux.every((b) => infos.get(b.id).convient(n))) {
          commun = n;
          break;
        }
      }
    }
    if (commun !== null) break;
  }
  let nCorps = commun;
  if (nCorps === null && iCorps.colonnes) {
    const egal = plusProche(iCorps, voulu, true);
    nCorps = egal !== null && Math.abs(egal / voulu - 1) <= 0.1 ? egal : plusProche(iCorps, voulu);
  } else if (nCorps === null) {
    nCorps = plusProche(iCorps, voulu);
  }
  if (nCorps === null) {
    return echec(iCorps.colonnes ? "Les colonnes ne tombent juste sur aucun nombre de mailles proche." : `${nomAvecArticle(iCorps.point)} ne tombe juste sur aucun nombre de mailles proche.`, corps);
  }
  const avecLesAutres = commun !== null && horizontaux.length > 1 && commun !== plusProche(iCorps, voulu, !!iCorps.colonnes);
  if (nCorps !== voulu) {
    explications.push(iCorps.colonnes
      ? `${nCorps} mailles au lieu de ${voulu} pour que les colonnes ${avecLesAutres ? "et les autres blocs " : ""}tombent juste en rond`
      : `${nCorps} mailles au lieu de ${voulu} pour que ${nomAvecArticle(iCorps.point)} ${avecLesAutres ? "et les autres blocs tombent" : tombe(iCorps.point)} juste en rond`);
  }
  mailles[corpsIndex] = nCorps;

  // ---- Les autres blocs gardent le nombre de leur voisin quand leur motif y tombe juste ----
  const ordre = [];
  for (let i = corpsIndex - 1; i >= 0; i--) ordre.push([i, i + 1]);
  for (let i = corpsIndex + 1; i < horizontaux.length; i++) ordre.push([i, i - 1]);
  const resserres = new Map(); // point → zones qui gardent les mailles du corps en resserrant le bord
  for (const [i, j] of ordre) {
    const b = horizontaux[i];
    const info = infos.get(b.id);
    const voisin = mailles[j];
    if (b.zone === "corps" && !b.section) {
      mailles[i] = nCorps;
      continue;
    }
    if (info.convient(voisin)) {
      mailles[i] = voisin;
      if (!info.colonnes && !b.section && voisin === nCorps && info.densite.mailles / iCorps.densite.mailles > 1.1) {
        if (!resserres.has(info.point)) resserres.set(info.point, []);
        resserres.get(info.point).push(b.zone);
      }
      continue;
    }
    const n = plusProche(info, voisin);
    if (n === null) {
      return echec(info.colonnes ? "Les colonnes ne tombent juste sur aucun nombre de mailles proche." : `${nomAvecArticle(info.point)} ne tombe juste sur aucun nombre de mailles proche.`, b);
    }
    mailles[i] = n;
  }
  for (const [point, zones] of resserres) {
    const ou = zones.length > 1 && zones.every((z) => z === "bas" || z === "haut") ? "des bordures" : zones.map((z) => `(${NOMS_DES_ZONES[z]})`).join(" ");
    const verbe = point.article === "les" || zones.length > 1 ? "gardent" : "garde";
    explications.push(`${nomAvecArticle(point)} ${ou} ${verbe} les ${nCorps} mailles du corps : le bord est un peu resserré, c'est voulu`.replace(/  +/g, " "));
  }

  // ---- Colonnes ----
  const repartitions = new Map();
  const modeles = new Map();
  const ordreColonnes = horizontaux.map((b, i) => i).sort((a, b) => (horizontaux[a].zone === "corps" ? 0 : 1) - (horizontaux[b].zone === "corps" ? 0 : 1));
  for (const i of ordreColonnes) {
    const b = horizontaux[i];
    const info = infos.get(b.id);
    if (!info.colonnes) continue;
    const cle = `${info.colonnes.length}|${mailles[i]}`;
    const alignees = b.section ? horizontaux.filter((x, k) => x.section && mailles[k] === mailles[i] && infos.get(x.id).colonnes?.length === info.colonnes.length) : [];
    const jointe = alignees.length > 1
      ? repartirMailles(info.colonnes.map((c, j) => ({ ...c, points: alignees.map((x) => infos.get(x.id).colonnes[j].point) })), mailles[i], "rond")
      : null;
    const r = jointe || repartirMailles(info.colonnes, mailles[i], "rond", modeles.get(cle) || null);
    if (!r) return echec("Les colonnes ne tombent pas juste.", b);
    if (!modeles.has(cle)) modeles.set(cle, r);
    repartitions.set(b.id, r);
    const e = explicationColonnes(info.colonnes, r, DE_LA_ZONE[b.zone]);
    if (e && !explications.includes(e)) explications.push(e);
  }
  const largeurBlocCm = (b, i) => {
    const info = infos.get(b.id);
    if (!info.colonnes) return (mailles[i] * 10) / info.densite.mailles;
    return repartitions.get(b.id).reduce((t, m, j) => t + (m * 10) / info.colonnes[j].densite.mailles, 0);
  };

  // ---- Hauteurs ----
  const motifDuBloc = (info) =>
    info.colonnes ? motifCommun(info.colonnes.map((c) => c.point)) : { L: info.recette.rangs.length, mep: (info.recette.miseEnPlace || []).length };
  const hauteurs = new Map();
  let autresCm = 0;
  horizontaux.forEach((b, i) => {
    const info = infos.get(b.id);
    if (i > 0 && mailles[i] !== mailles[i - 1]) autresCm += 10 / info.densite.rangs;
    if (b.zone === "corps") return;
    const h = rangsPourHauteurMotif(motifDuBloc(info), b.hauteurCm || 0, info.densite);
    hauteurs.set(b.id, h);
    autresCm += h.hauteurCm;
  });
  const corpsVoulu = hauteurCm - autresCm;
  if (corpsVoulu < 2 * partiesCorps.length) return echec(`Les bordures et les bandes sont plus hautes que ${nomPiece} : le corps n'a plus de place.`, corps);
  const parts = repartirLeCorps(partiesCorps, corpsVoulu, (b, cm) => rangsPourHauteurMotif(motifDuBloc(infos.get(b.id)), cm, infos.get(b.id).densite));
  if (parts.erreur) return echec(parts.erreur, corps);
  for (const [id, h] of parts.hauteurs) hauteurs.set(id, h);

  // ---- Tours ----
  const rangs = [];
  let compte = mailles[0];
  let debut = 0; // place du début du tour, depuis le marqueur posé au montage
  const ajouterTour = (infosTour, segments, hauteurTourCm, decale = 0) => {
    let marqueur = null;
    if (infosTour.retour) {
      marqueur = infosTour.retour;
    } else if (decale) {
      marqueur = { mailles: decale, sens: "gauche", raison: "motif" };
    }
    delete infosTour.retour;
    if (marqueur) debut = (debut + (marqueur.sens === "gauche" ? marqueur.mailles : compte - marqueur.mailles)) % compte;
    const gestes = segments.flatMap((s) => s.gestes);
    const t = tricoterTour({ cote: "E", debut: [], motif: gestes, fin: [] }, consomme(gestes), debut);
    debut = t.ok ? t.debut : debut;
    const sortie = produit(gestes);
    rangs.push({
      numero: rangs.length + 1, cote: "E", ...infosTour, segments, mailles: sortie, hauteurCm: hauteurTourCm,
      ...(marqueur ? { marqueur } : {}),
    });
    compte = sortie;
  };
  // Au premier tour d'un bloc, le marqueur revient à sa place de départ (par le côté le plus court).
  const retourDuMarqueur = () => {
    if (!debut) return null;
    return debut <= compte / 2 ? { mailles: debut, sens: "droite", raison: "retour" } : { mailles: compte - debut, sens: "gauche", raison: "retour" };
  };

  const plansDesBlocs = [];
  for (let i = 0; i < horizontaux.length; i++) {
    const b = horizontaux[i];
    const info = infos.get(b.id);
    const hTour = 10 / info.densite.rangs;
    const premier = rangs.length + 1;
    const laineId = b.laineId || null;
    let retour = retourDuMarqueur();
    if (mailles[i] !== compte) {
      const tr = gestesDeTransition(compte, mailles[i], "E");
      if (!tr) return echec("L'écart de mailles entre deux blocs est trop grand pour un seul tour de transition.", b);
      explications.push(explicationTransition(compte, mailles[i], info.colonnes ? info.colonnes[0].point : info.point).replace(/^Rang de transition/, "Tour de transition"));
      ajouterTour({ blocId: b.id, laineId, type: "transition", numeroMotif: null, rangsDuMotif: null, retour }, [{ zone: "corps", pointId: null, rang: null, transition: true, gestes: tr.gestes }], hTour);
      retour = null;
    }
    const n = mailles[i];
    const H = hauteurs.get(b.id).rangs;
    if (info.colonnes) {
      const rep = repartitions.get(b.id);
      const { L: Lc, mep: mepMax } = motifCommun(info.colonnes.map((c) => c.point));
      for (let t = 0; t < H; t++) {
        const segments = info.colonnes.map((c, j) => {
          const { rang, entree } = tourDuPoint(c.recette, t, rep[j]);
          return { zone: "corps", colonne: j + 1, colonneId: c.id, pointId: c.pointId, rang, gestes: deplier(rang, entree) || [] };
        });
        const enMep = t < mepMax;
        ajouterTour({
          blocId: b.id, laineId, type: enMep ? "miseEnPlace" : "motif",
          numeroMotif: enMep ? null : ((t - mepMax) % Lc) + 1, rangsDuMotif: enMep ? null : Lc, retour: t === 0 ? retour : null,
        }, segments, hTour);
      }
      plansDesBlocs.push({
        id: b.id, zone: b.zone, nom: b.nom || NOMS_DES_ZONES[b.zone], section: b.section || undefined, pointId: b.pointId, laineId,
        premierRang: premier, dernierRang: rangs.length, rangs: rangs.length - premier + 1,
        maillesCorps: n, hauteurCm: rangs.slice(premier - 1).reduce((s, r) => s + r.hauteurCm, 0), densite: info.densite,
        colonnes: info.colonnes.map((c, j) => ({ id: c.id, pointId: c.pointId, mailles: rep[j], largeurCm: (rep[j] * 10) / c.densite.mailles, densite: c.densite })),
      });
      continue;
    }
    const recette = info.recette;
    const mep = recette.miseEnPlace || [];
    const L = recette.rangs.length;
    for (let t = 0; t < H; t++) {
      const { rang, entree } = tourDuPoint(recette, t, n);
      const enMep = t < mep.length;
      ajouterTour(
        {
          blocId: b.id, laineId, type: enMep ? "miseEnPlace" : "motif",
          numeroMotif: enMep ? null : ((t - mep.length) % L) + 1, rangsDuMotif: enMep ? null : L, retour: t === 0 ? retour : null,
        },
        [{ zone: "corps", pointId: b.pointId, rang, gestes: deplier(rang, entree) || [] }],
        hTour,
        // Au tout premier tour du bloc, le marqueur est déjà au bon endroit.
        t > 0 ? rang.decale || 0 : 0,
      );
    }
    plansDesBlocs.push({
      id: b.id, zone: b.zone, nom: b.nom || NOMS_DES_ZONES[b.zone], section: b.section || undefined, pointId: b.pointId, laineId, colonnes: null,
      premierRang: premier, dernierRang: rangs.length, rangs: rangs.length - premier + 1,
      maillesCorps: n, hauteurCm: rangs.slice(premier - 1).reduce((s, r) => s + r.hauteurCm, 0), densite: info.densite,
      marqueur: recette.marqueur || false,
    });
  }

  const plan = {
    type: "snood",
    mode: "rond",
    montage: { mailles: mailles[0], repartition: { corps: mailles[0] } },
    lisieres: { type: "aucune", mailles: 0 },
    bandesLaterales: null,
    blocs: plansDesBlocs,
    rangs,
    rabattage: { mailles: rangs.at(-1).mailles, souple: true },
    largeur: { viseeCm: tourCm, reelleCm: largeurBlocCm(corps, corpsIndex) },
    longueur: { viseeCm: hauteurCm, reelleCm: rangs.reduce((t, r) => t + r.hauteurCm, 0) },
    estime: Object.values(densites).some((d) => d && d.statut !== "mesuree"),
    explications,
  };
  const verification = verifierPlanRond(plan);
  return { ok: verification.ok, erreurs: verification.erreurs, explications, plan, grille: verification.grille, debut: verification.debut ?? 0 };
}

/**
 * Tricote le snood en entier : tous les tours sur l'endroit, chaque geste prend exactement les mailles présentes,
 * chaque motif tombe juste, le compte de fin de chaque bloc correspond au plan, et la place du début du tour
 * est suivie (déplacements et retours du marqueur compris). Renvoie { ok, erreurs, grille } ;
 * grille[0] = premier tour, vue de l'endroit, rangée depuis le marqueur posé au montage.
 */
export function verifierPlanRond(plan) {
  const grille = [];
  const nomDuBloc = (id) => plan.blocs.find((b) => b.id === id)?.nom ?? null;
  const erreur = (rang, message) => ({
    ok: false, grille,
    erreurs: [{ rang: rang?.numero ?? null, bloc: rang?.blocId ?? null, nomBloc: rang ? nomDuBloc(rang.blocId) : null, message }],
  });
  if (plan.montage.repartition.corps !== plan.montage.mailles) return erreur(null, "le montage ne répartit pas toutes ses mailles");
  let n = plan.montage.mailles;
  let debut = 0;
  for (const rang of plan.rangs) {
    if (rang.cote !== "E") return erreur(rang, "en rond, tous les tours se tricotent sur l'endroit");
    const gestes = [];
    for (const s of rang.segments) {
      if (s.zone !== "corps") return erreur(rang, `zone inconnue en rond : ${s.zone}`);
      if (s.rang) {
        if (s.rang.cote !== "E") return erreur(rang, "un tour du point est écrit sur l'envers");
        const attendu = deplier(s.rang, consomme(s.gestes));
        if (!attendu) return erreur(rang, `le motif ne tombe pas juste sur ${consomme(s.gestes)} mailles`);
        if (attendu.length !== s.gestes.length || attendu.some((c, i) => c !== s.gestes[i])) return erreur(rang, "les gestes écrits ne suivent pas le motif du point");
      }
      for (const c of s.gestes) {
        if (!geste(c).endroit) return erreur(rang, `« ${geste(c).nom} » ne se fait pas sur l'endroit`);
      }
      gestes.push(...s.gestes);
    }
    if (consomme(gestes) !== n) return erreur(rang, `${plan.type === "bonnet" ? "le bonnet" : "le snood"} a ${n} mailles mais le tour en tricote ${consomme(gestes)}`);
    if (rang.marqueur) {
      const { mailles: m, sens } = rang.marqueur;
      if (!(m > 0 && m < n)) return erreur(rang, `déplacement du marqueur impossible : ${m} mailles sur ${n}`);
      debut = (debut + (sens === "gauche" ? m : n - m)) % n;
    }
    const bloc = plan.blocs.find((b) => b.premierRang === rang.numero);
    if (bloc && debut !== 0) return erreur(rang, "au début du bloc, le marqueur n'est pas revenu à sa place de départ");
    const t = tricoterTour({ cote: "E", debut: [], motif: gestes, fin: [] }, n, debut);
    if (!t.ok) return erreur(rang, t.erreur);
    grille.push(t.aspects);
    n = t.sortie;
    debut = t.debut;
    if (n !== rang.mailles) return erreur(rang, `le tour annonce ${rang.mailles} mailles, il en reste ${n}`);
    const fin = plan.blocs.find((b) => b.dernierRang === rang.numero);
    if (fin && n !== fin.maillesCorps) return erreur(rang, `à la fin du bloc, ${plan.type === "bonnet" ? "le bonnet" : "le snood"} devrait avoir ${fin.maillesCorps} mailles, il en a ${n}`);
  }
  if (n !== plan.rabattage.mailles) return erreur(plan.rangs.at(-1), `le rabattage annonce ${plan.rabattage.mailles} mailles, il en reste ${n}`);
  return { ok: true, erreurs: [], grille, debut };
}
