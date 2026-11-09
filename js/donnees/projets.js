// Règles des projets en conception : création, étapes, tailles, matériel, calcul du plan.
// Fonctions pures, testées sans navigateur.

import { PALETTE, EPAISSEURS, lireNombre, formaterNombre, metrageLaine, aiguillesEtiquette, texteAiguillesEtiquette } from "./reserve.js";
import { pointParId, avisPour } from "../catalogue/points.js";
import { echantillonsCorrespondants, densitesDuProjet } from "../moteur/densite.js";
import { planEcharpe, MAILLES_MAX_BANDE_LATERALE } from "../moteur/plan.js";
import { planSnood, cableTropLong } from "../moteur/plan-rond.js";
import { planBonnet, cableMagicLoop } from "../moteur/plan-bonnet.js";
import { maillesMinimum, maillesConviennent, convertirEnRond } from "../moteur/simulateur.js";
import { repartirMailles, maillesVoisines, totauxEgaux, COLONNES_MIN, COLONNES_MAX } from "../moteur/colonnes.js";
import { metrageNecessaire, comparerALaLaine } from "../moteur/metrage.js";
import { densitePoint } from "../moteur/densite.js";
import { nomCouleur } from "./couleur.js";

/** Les 6 étapes de la conception, avec leur adresse. */
export const ETAPES = [
  { numero: 1, cle: "piece", titre: "La pièce" },
  { numero: 2, cle: "materiel", titre: "Mon matériel" },
  { numero: 3, cle: "taille", titre: "La taille" },
  { numero: 4, cle: "builder", titre: "Construire" },
  { numero: 5, cle: "apercu", titre: "Aperçu" },
  { numero: 6, cle: "patron", titre: "Le patron" },
];

export const etapeParCle = (cle) => ETAPES.find((e) => e.cle === cle) || ETAPES[0];
export const cheminEtape = (projet, numero = projet.etape) => `/projet/${encodeURIComponent(projet.id)}/${ETAPES[numero - 1].cle}`;

export const TYPES_DISPONIBLES = ["echarpe", "snood", "bonnet"];

/** La pièce se tricote-t-elle en rond ? */
export const enRond = (projet) => projet?.type === "snood" || projet?.type === "bonnet" || projet?.mode === "rond";

/** Nom de la pièce pour les phrases : « le snood », « le bonnet », « l'écharpe ». */
export const nomPiece = (projet) => ({ snood: "le snood", bonnet: "le bonnet", couverture: "la couverture" })[projet?.type] || "l'écharpe";

// ---------------- Bonnet (E4, 0.17.0) ----------------

/** Le bonnet est tricoté 5 cm plus petit que la tête : il serre un peu pour tenir (aisance négative). */
export const AISANCE_BONNET = 5;

/** Tailles de bonnet (PRD, 09/11) : tour de tête, hauteur portée sans le revers, taille du pompon. */
export const TAILLES_BONNET = {
  adulte: [
    { preset: "femme", nom: "Femme", detail: "Tour de tête moyen", teteCm: 56, hauteurCm: 22, pomponCm: 6 },
    { preset: "homme", nom: "Homme", detail: "Tour de tête moyen", teteCm: 60, hauteurCm: 24, pomponCm: 6 },
  ],
  enfant: [{ preset: "enfant", nom: "Enfant", detail: "Environ 3 à 10 ans", teteCm: 51, hauteurCm: 20, pomponCm: 4 }],
};

export const LIMITES_BONNET = { tete: [40, 66], hauteur: [15, 32], pompon: [4, 8] };

/** Bord du bonnet : 5 cm, ou 10 cm avec le revers (il se replie en deux). */
export const BORD_BONNET = { simple: 5, revers: 10 };

export function tailleBonnet(pub = "adulte", preset = null) {
  const liste = TAILLES_BONNET[pub] || TAILLES_BONNET.adulte;
  const t = liste.find((x) => x.preset === preset) || liste[0];
  return { public: pub, preset: t.preset, teteCm: t.teteCm, hauteurCm: t.hauteurCm, revers: false, pompon: true, pomponCm: t.pomponCm };
}

/** Tour tricoté du bonnet (cm) : tour de tête − 5 cm. */
export const tourDuBonnet = (projet) => (projet?.taille?.teteCm || 0) - AISANCE_BONNET;

/** Revers coché ou non : le bord passe de 5 à 10 cm (et inversement), sauf si sa hauteur a été changée à la main. */
export function avecRevers(projet, revers) {
  const avant = revers ? BORD_BONNET.simple : BORD_BONNET.revers;
  const apres = revers ? BORD_BONNET.revers : BORD_BONNET.simple;
  return {
    ...projet,
    taille: { ...projet.taille, revers },
    blocs: projet.blocs.map((b) => (b.zone === "bas" && (b.hauteurCm === avant || !b.hauteurCm) ? { ...b, hauteurCm: apres } : b)),
  };
}

/** Le pompon : { pompon, pomponCm, pomponLaineId } (partiel). */
export function avecPompon(projet, reglages) {
  const t = { ...projet.taille, ...reglages };
  t.pomponCm = Math.min(LIMITES_BONNET.pompon[1], Math.max(LIMITES_BONNET.pompon[0], Math.round(t.pomponCm || 6)));
  if (!t.pomponLaineId || t.pomponLaineId === projet.laineId) delete t.pomponLaineId;
  return { ...projet, taille: t };
}

/** Le bord d'un bonnet avec revers n'accepte que des points réversibles (décision du 06/11). */
export const bordAvecRevers = (projet, bloc) => projet?.type === "bonnet" && !!projet.taille?.revers && bloc?.zone === "bas";

/** Tailles d'écharpe (PRD) : longueurs proposées et largeur par défaut. */
export const TAILLES_ECHARPE = {
  adulte: {
    largeurCm: 20,
    longueurs: [
      { preset: "courte", nom: "Courte", detail: "Taille de la personne − 50 cm", longueurCm: 130 },
      { preset: "classique", nom: "Classique", detail: "Environ la taille de la personne", longueurCm: 180 },
      { preset: "tours", nom: "À plusieurs tours", detail: "180 cm et plus", longueurCm: 220 },
    ],
  },
  enfant: {
    largeurCm: 13,
    longueurs: [
      { preset: "courte", nom: "Courte", detail: "Pour les plus petits", longueurCm: 80 },
      { preset: "classique", nom: "Classique", detail: "Environ 3 à 10 ans", longueurCm: 100 },
      { preset: "tours", nom: "Longue", detail: "Pour l'enrouler une fois de plus", longueurCm: 115 },
    ],
  },
};

export const LIMITES_ECHARPE = { longueur: [40, 300], largeur: [6, 60] };

/** Tailles de snood (PRD, 01/11) : tour × hauteur. */
export const TAILLES_SNOOD = {
  adulte: [
    { preset: "1tour", nom: "1 tour", detail: "Ajusté autour du cou", tourCm: 62, hauteurCm: 24 },
    { preset: "2tours", nom: "2 tours", detail: "Long, on l'enroule deux fois", tourCm: 152, hauteurCm: 25 },
  ],
  enfant: [{ preset: "1tour", nom: "1 tour", detail: "Ajusté autour du cou", tourCm: 56, hauteurCm: 20 }],
};

export const LIMITES_SNOOD = { tour: [40, 200], hauteur: [10, 60] };

/** Sous ce tour, un snood risque de ne pas passer la tête. */
export const TOUR_MIN_TETE = 56;

/** Taille d'un snood neuf ou après un changement de public. */
/** Combien de tours autour du cou : celui de la taille choisie, sinon d'après le tour (au-delà de 110 cm, 2 tours). */
export function toursPortes(projet, plan) {
  const preset = projet.taille?.preset;
  if (preset === "2tours") return 2;
  if (preset === "1tour") return 1;
  const tour = plan?.largeur?.reelleCm ?? projet.taille?.tourCm ?? 0;
  return tour > 110 ? 2 : 1;
}

export function tailleSnood(pub = "adulte", preset = "1tour") {
  const liste = TAILLES_SNOOD[pub] || TAILLES_SNOOD.adulte;
  const t = liste.find((x) => x.preset === preset) || liste[0];
  return { public: pub, preset: t.preset, tourCm: t.tourCm, hauteurCm: t.hauteurCm };
}

/**
 * Blocs d'une pièce neuve.
 * Écharpe : bordures et bandes latérales en point mousse ; snood : bordures en côtes 1/1 (décision du 02/11), sans bandes latérales.
 */
export function blocsParDefaut(pointPrincipal = "", type = "echarpe") {
  if (type === "bonnet") {
    // Bonnet (0.17.0) : un bord de 5 cm en côtes 1/1, puis le corps ; le sommet suit le corps.
    return [
      { id: "bas", zone: "bas", pointId: "cotes-1-1", hauteurCm: BORD_BONNET.simple },
      { id: "corps", zone: "corps", pointId: pointPrincipal },
    ];
  }
  if (type === "snood") {
    return [
      { id: "bas", zone: "bas", pointId: "cotes-1-1", hauteurCm: 3 },
      { id: "corps", zone: "corps", pointId: pointPrincipal },
      { id: "haut", zone: "haut", pointId: "cotes-1-1", hauteurCm: 3 },
    ];
  }
  return [
    { id: "bas", zone: "bas", pointId: "mousse", hauteurCm: 3 },
    { id: "corps", zone: "corps", pointId: pointPrincipal },
    { id: "haut", zone: "haut", pointId: "mousse", hauteurCm: 3 },
    { id: "cotes", zone: "cotes", pointId: "mousse", largeurMailles: 4 },
  ];
}

export function nouveauProjet({ type = "echarpe", nom = "" } = {}) {
  if (type === "bonnet") {
    return {
      nom: nom.trim() || "Bonnet",
      nomAuto: !nom.trim(),
      type,
      statut: "conception",
      etape: 1,
      laineId: "",
      autresLaines: [],
      aiguillesId: "",
      pointPrincipal: "",
      echantillonId: "",
      sansEchantillon: false,
      taille: tailleBonnet(),
      mode: "rond",
      lisieres: "aucune",
      blocs: blocsParDefaut("", "bonnet"),
    };
  }
  if (type === "snood") {
    return {
      nom: nom.trim() || "Snood",
      nomAuto: !nom.trim(),
      type,
      statut: "conception",
      etape: 1,
      laineId: "",
      autresLaines: [],
      aiguillesId: "",
      pointPrincipal: "",
      echantillonId: "",
      sansEchantillon: false,
      taille: tailleSnood(),
      mode: "rond",
      lisieres: "aucune",
      blocs: blocsParDefaut("", "snood"),
    };
  }
  const t = TAILLES_ECHARPE.adulte;
  return {
    nom: nom.trim() || "Écharpe",
    nomAuto: !nom.trim(),
    type,
    statut: "conception",
    etape: 1,
    laineId: "",
    autresLaines: [],
    aiguillesId: "",
    pointPrincipal: "",
    echantillonId: "",
    sansEchantillon: false,
    taille: { public: "adulte", preset: "classique", longueurCm: t.longueurs[1].longueurCm, largeurCm: t.largeurCm },
    mode: "plat",
    lisieres: "chainette",
    blocs: blocsParDefaut(),
  };
}

/** Nom de la couleur : celui de la palette si elle en vient (« terracotta »), sinon une description (« bleu foncé »). */
export function nomCouleurLaine(hex) {
  const p = PALETTE.find((c) => c.hex.toLowerCase() === String(hex || "").toLowerCase());
  return p ? p.nom.toLowerCase() : nomCouleur(hex);
}

/** « Écharpe terracotta » : le nom proposé, tant que Deborah ne l'a pas changé. */
export function nomPropose(type, laine) {
  const base = { echarpe: "Écharpe", snood: "Snood", bonnet: "Bonnet", couverture: "Couverture" }[type] || "Projet";
  const c = laine ? nomCouleurLaine(laine.couleur) : "";
  return c ? `${base} ${c}` : base;
}

/** « Aran · 400 m disponibles · aiguille 9 mm » */
export function detailLaineProjet(laine) {
  const ep = EPAISSEURS.find((e) => e.id === laine.epaisseur)?.nom;
  const m = metrageLaine(laine);
  const dispo = m ? `${m.estime ? "environ " : ""}${m.metres} m disponibles` : "métrage inconnu";
  const f = aiguillesEtiquette(laine);
  return [ep, dispo, f ? `aiguille${f.min === f.max ? "" : "s"} ${texteAiguillesEtiquette(f)}` : null].filter(Boolean).join(" · ");
}

/**
 * Conseil sur la taille d'aiguille.
 * L'étiquette de la laine fait foi : à ± 0,5 mm près, c'est la bonne taille.
 * Sans aiguille sur l'étiquette, on compare aux repères habituels de l'épaisseur (seulement indicatifs).
 * Renvoie { ok, texte } ou null si on ne sait rien.
 */
export function conseilAiguille(laine, tailleMm) {
  const t = lireNombre(tailleMm);
  if (!laine || t === null) return null;
  const taille = `${formaterNombre(t, 2)} mm`;
  const f = aiguillesEtiquette(laine);
  if (f) {
    const c = texteAiguillesEtiquette(f);
    const fourchette = f.min !== f.max;
    if (t >= f.min - 0.01 && t <= f.max + 0.01) {
      return { ok: true, texte: fourchette ? `${taille} : dans la fourchette conseillée sur l'étiquette de ta laine (${c}).` : `${taille} : c'est la taille conseillée sur l'étiquette de ta laine.` };
    }
    const ecart = t < f.min ? t - f.min : t - f.max;
    if (Math.abs(ecart) <= 0.5 + 0.01) {
      return { ok: true, texte: `${taille}, proche des ${c} conseillés sur l'étiquette : le tricot sera un peu plus ${ecart < 0 ? "serré" : "souple"}.` };
    }
    return {
      ok: false,
      texte: `L'étiquette de ta laine conseille ${c}. Avec ${taille}, le tricot sera ${ecart < 0 ? "plus serré et plus raide" : "plus lâche et plus ajouré"} : c'est possible, ton échantillon le dira.`,
    };
  }
  const ep = EPAISSEURS.find((e) => e.id === laine.epaisseur);
  if (!ep) return null;
  const nombres = (ep.aiguilles.match(/\d+(?:,\d+)?/g) || []).map((x) => lireNombre(x));
  const min = nombres[0];
  const max = ep.aiguilles.includes("plus") ? Infinity : nombres[1] ?? nombres[0];
  if (t >= min - 0.5 - 0.01 && t <= max + 0.5 + 0.01) return null; // dans les repères habituels : rien à signaler
  return {
    ok: true,
    texte: `D'habitude, une laine ${ep.nom.toLowerCase()} se tricote en ${ep.aiguilles}. Si l'étiquette conseille ${taille}, note-le dans ta laine : l'outil s'y fiera.`,
  };
}

/** Zone d'avis d'un bloc : bordures du haut et du bas, bandes latérales (« cotes », avis propre depuis 0.13.0), corps. */
export const zoneAvis = (zone) => (zone === "bas" || zone === "haut" ? "bordure" : zone === "cotes" ? "cotes" : "corps");

/**
 * Avis sur un point pour un bloc : celui du catalogue (pièce et zone),
 * et pour les bandes latérales, les motifs trop larges sont écartés.
 */
export function avisPourBloc(point, piece, zone, { colonne = false, revers = false } = {}) {
  // Bord d'un bonnet avec revers : l'intérieur du bord se voit une fois replié (décision du 06/11).
  if (revers && zone === "bas" && !point.proprietes?.reversible) {
    return { avis: "refuse", raison: "Pas réversible : l'envers se verrait une fois le bord replié." };
  }
  if (colonne && (piece === "snood" || piece === "bonnet") && convertirEnRond(point).marqueur) {
    return { avis: "deconseille", raison: "Il déplace le début du tour : il prend tout le tour, pas une colonne." };
  }
  if (zone === "cotes") {
    const min = maillesMinimum(point, "plat");
    if (min > MAILLES_MAX_BANDE_LATERALE) {
      return { avis: "deconseille", raison: `Motif trop large pour une bande latérale : il lui faut au moins ${min} mailles de chaque côté.` };
    }
  }
  return avisPour(point, piece, zoneAvis(zone));
}

/** Avis sur le point principal pour la pièce : « Conseillé pour une écharpe. » ou la raison. */
export function avisPointPrincipal(point, type) {
  const a = avisPour(point, type, "corps");
  return a;
}

/** Échantillon du projet : celui choisi s'il existe encore, sinon le plus récent de la combinaison. */
export function echantillonDuProjet(projet, aiguilles, echantillons) {
  const taille = lireNombre(aiguilles?.tailleMm);
  if (!projet.laineId || !projet.pointPrincipal || taille === null) return null;
  const correspondants = echantillonsCorrespondants(echantillons, {
    laineId: projet.laineId, pointId: projet.pointPrincipal, tailleAiguille: taille,
  });
  return correspondants.find((e) => e.id === projet.echantillonId) || correspondants[0] || null;
}

/** Changer le point principal : le corps suit. */
export function avecPointPrincipal(projet, pointId) {
  return {
    ...projet,
    pointPrincipal: pointId,
    echantillonId: "",
    // Le point principal est celui de la section 1 ; les autres sections gardent le leur (E3c-2).
    blocs: projet.blocs.map((b) => (b.zone === "corps" && (!b.section || b.id === premiereSection(projet)?.id) ? { ...b, pointId } : b)),
  };
}

/** Changer le point d'un bloc ; changer le corps change aussi le point principal. */
export function avecPointDuBloc(projet, blocId, pointId) {
  const bloc = projet.blocs.find((b) => b.id === blocId);
  if (!bloc) return projet;
  if (bloc.zone === "corps" && !(bloc.section && bloc.id !== premiereSection(projet)?.id)) return avecPointPrincipal(projet, pointId);
  return { ...projet, blocs: projet.blocs.map((b) => (b.id === blocId ? { ...b, pointId } : b)) };
}

/** Le matériel est-il complet pour passer à la taille ? Renvoie la liste de ce qui manque. */
export function materielManquant(projet, { echantillon }) {
  const manque = [];
  if (!projet.laineId) manque.push("la laine");
  if (!projet.aiguillesId) manque.push("les aiguilles");
  if (!projet.pointPrincipal) manque.push("le point principal");
  if (manque.length === 0 && !echantillon && !projet.sansEchantillon) manque.push("l'échantillon (ou « continuer sans échantillon »)");
  return manque;
}

/** Points utilisés par un bloc : le sien, et ceux de ses colonnes. */
export const pointsDuBloc = (b) => [b.pointId, ...(b.colonnes || []).map((c) => c.pointId)].filter(Boolean);

/**
 * Identifiants des laines du projet (E3c-1) : la principale, puis `autresLaines`, puis (projets d'avant 0.16.0,
 * sans migration) celles trouvées dans les blocs et les colonnes, sans doublon.
 */
export function idsLainesDuProjet(projet) {
  const ids = [];
  const ajouter = (id) => { if (id && !ids.includes(id)) ids.push(id); };
  ajouter(projet.laineId);
  (projet.autresLaines || []).forEach(ajouter);
  ajouter(projet.taille?.pomponLaineId);
  for (const b of projet.blocs || []) {
    ajouter(b.laineId);
    (b.colonnes || []).forEach((c) => ajouter(c.laineId));
  }
  return ids;
}

/**
 * Laines du projet : la principale d'abord, puis les autres, dans l'ordre.
 * Une laine qui n'est plus dans la réserve est ignorée (ses blocs reprennent la laine principale).
 */
export function lainesDuProjet(projet, laines = []) {
  return idsLainesDuProjet(projet).map((id) => laines.find((l) => l.id === id)).filter(Boolean);
}

/** Laines vraiment utilisées par les blocs (la principale d'abord), pour les avertissements d'épaisseur. */
function lainesUtilisees(projet, laines = []) {
  const ids = [projet.laineId];
  for (const b of projet.blocs) {
    for (const id of [b.laineId, ...(b.colonnes || []).map((c) => c.laineId)]) if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.map((id) => laines.find((l) => l.id === id)).filter(Boolean);
}

/** Ajoute une laine au projet (étape Matériel). */
export function avecLaineDuProjet(projet, laineId) {
  if (!laineId || idsLainesDuProjet(projet).includes(laineId)) return projet;
  const autres = idsLainesDuProjet(projet).filter((id) => id !== projet.laineId);
  return { ...projet, autresLaines: [...autres, laineId] };
}

/** Blocs (et colonnes) qui utilisent une laine : combien reprendront la laine principale si on la retire. */
export function blocsDeLaLaine(projet, laineId) {
  return projet.blocs.filter((b) => b.laineId === laineId || (b.colonnes || []).some((c) => c.laineId === laineId)).length
    + (projet.taille?.pomponLaineId === laineId ? 1 : 0);
}

/** Retire une laine du projet : ses blocs et ses colonnes reprennent la laine principale. */
export function sansLaineDuProjet(projet, laineId) {
  if (!laineId || laineId === projet.laineId) return projet;
  const autres = idsLainesDuProjet(projet).filter((id) => id !== projet.laineId && id !== laineId);
  const sans = (o) => {
    if (o.laineId !== laineId) return o;
    const { laineId: _, ...reste } = o;
    return reste;
  };
  const taille = projet.taille?.pomponLaineId === laineId ? (({ pomponLaineId, ...t }) => t)(projet.taille) : projet.taille;
  return {
    ...projet,
    autresLaines: autres,
    taille,
    blocs: projet.blocs.map((b) => {
      const c = sans(b);
      return c.colonnes ? { ...c, colonnes: c.colonnes.map(sans) } : c;
    }),
  };
}

/** Change la laine principale ; si elle était parmi les autres laines, elle en sort. */
export function avecLainePrincipale(projet, laineId) {
  const autres = idsLainesDuProjet(projet).filter((id) => id !== projet.laineId && id !== laineId);
  return { ...projet, laineId, autresLaines: autres };
}

/** Laine d'un bloc (null = la laine principale), en ignorant une laine disparue de la réserve. */
export function laineDuBloc(projet, bloc, laines) {
  if (!bloc?.laineId || bloc.laineId === projet.laineId) return null;
  return laines && !laines.some((l) => l.id === bloc.laineId) ? null : bloc.laineId;
}

/**
 * Laine d'une colonne (E3c-4, intarsia à plat seulement) : la sienne, sinon celle de son bloc (null = principale).
 * En rond, une colonne garde la laine de sa section.
 */
export function laineDeColonne(projet, bloc, colonne, laines) {
  const duBloc = laineDuBloc(projet, bloc, laines);
  if (enRond(projet) || !colonne?.laineId) return duBloc;
  if (colonne.laineId === projet.laineId) return null;
  return laines && !laines.some((l) => l.id === colonne.laineId) ? duBloc : colonne.laineId;
}

/** Un bloc est en intarsia quand deux laines différentes se trouvent dans un même rang (à plat seulement). */
export function blocEnIntarsia(projet, bloc, laines) {
  if (enRond(projet) || !(bloc?.colonnes?.length >= 2)) return false;
  const ids = new Set(bloc.colonnes.map((c) => laineDeColonne(projet, bloc, c, laines) || "principale"));
  return ids.size > 1;
}

/** Petites pelotes d'un bloc en intarsia : une par colonne, comptées par laine (null = principale). */
export function petitesPelotes(projet, bloc, laines) {
  if (!blocEnIntarsia(projet, bloc, laines)) return [];
  const parLaine = new Map();
  for (const c of bloc.colonnes) {
    const id = laineDeColonne(projet, bloc, c, laines);
    parLaine.set(id, (parLaine.get(id) || 0) + 1);
  }
  return [...parLaine].map(([laineId, nombre]) => ({ laineId, nombre }));
}

/**
 * Calcule le plan du projet avec les densités disponibles.
 * laines : toute la réserve (pour les blocs d'une autre laine) ; sans elle, seule la laine principale compte.
 * Renvoie { plan, ok, erreurs, explications, densites, estime, parLaine, avertissements }
 * (ou null si on ne sait rien de la laine).
 */
export function calculerProjet({ projet, laine, aiguilles, echantillons, laines = null }) {
  const taille = lireNombre(aiguilles?.tailleMm);
  if (!laine || taille === null || !projet.pointPrincipal) return null;
  const echantillon = echantillonDuProjet(projet, aiguilles, echantillons);
  const reserve = laines || [laine];
  const blocs = projet.blocs
    .filter((b) => b.pointId)
    .map((b) => {
      const laineId = laineDuBloc(projet, b, reserve);
      const colonnes = b.colonnes?.length >= COLONNES_MIN && b.zone !== "cotes"
        ? b.colonnes.filter((c) => c.pointId).map((c) => ({ ...c, laineId: laineDeColonne(projet, b, c, reserve) }))
        : null;
      const nom = estSection(b) ? `section ${numeroSection(projet, b)}` : undefined;
      return { ...b, laineId, nom, colonnes: colonnes?.length >= COLONNES_MIN ? colonnes : undefined };
    });
  const densites = densitesDuProjet({
    pointIds: [...new Set(blocs.flatMap(pointsDuBloc))], laine, tailleAiguille: taille, echantillons, echantillonPrincipal: echantillon,
  });
  if (Object.values(densites).some((d) => !d)) return null;
  const pomponLaine = projet.taille?.pomponLaineId && reserve.some((l) => l.id === projet.taille.pomponLaineId) && projet.taille.pomponLaineId !== projet.laineId
    ? projet.taille.pomponLaineId : null;
  const r = projet.type === "bonnet"
    ? planBonnet({
      tourCm: tourDuBonnet(projet), hauteurCm: projet.taille.hauteurCm, revers: !!projet.taille.revers,
      blocs: blocs.filter((b) => b.zone === "bas" || b.zone === "corps"), densites,
      // Le jersey sert au sommet quand le point du corps ne peut pas y continuer.
      densiteJersey: densites.jersey || densitePoint({ pointId: "jersey", laine, tailleAiguille: taille, echantillons, echantillonPrincipal: echantillon }),
      pompon: projet.taille.pompon ? { cm: projet.taille.pomponCm || 6, laineId: pomponLaine } : null,
    })
    : projet.type === "snood"
    ? planSnood({ tourCm: projet.taille.tourCm, hauteurCm: projet.taille.hauteurCm, blocs: blocs.filter((b) => b.zone !== "cotes"), densites })
    : planEcharpe({
      largeurCm: projet.taille.largeurCm, longueurCm: projet.taille.longueurCm,
      blocs, densites, lisieres: projet.lisieres,
    });
  let metrage = null;
  let laineSuffit = null;
  let parLaine = [];
  if (r.ok) {
    const densiteJersey = densitePoint({ pointId: "jersey", laine, tailleAiguille: taille, echantillons, echantillonPrincipal: echantillon });
    metrage = metrageNecessaire({ plan: r.plan, laine, echantillon, densiteJersey });
    if (metrage) {
      parLaine = metrage.parLaine.map((x) => {
        const l = x.laineId ? reserve.find((y) => y.id === x.laineId) : laine;
        return { laineId: l.id, laine: l, principale: !x.laineId, metres: x.metres, suffit: comparerALaLaine(x.metres, l) };
      });
      // Laine principale en premier.
      parLaine.sort((a, b) => (b.principale ? 1 : 0) - (a.principale ? 1 : 0));
      laineSuffit = parLaine.find((x) => x.principale)?.suffit || comparerALaLaine(metrage.metres, laine);
    }
  }
  // Une laine d'une autre épaisseur que la principale : les dimensions de ses blocs sont moins sûres.
  const avertissements = [];
  for (const l of lainesUtilisees({ ...projet, blocs }, reserve).slice(1)) {
    if (laine.epaisseur && l.epaisseur && l.epaisseur !== laine.epaisseur) {
      const ep = (id) => EPAISSEURS.find((e) => e.id === id)?.nom.toLowerCase() || id;
      avertissements.push(`« ${l.nom} » est ${ep(l.epaisseur)}, ta laine principale est ${ep(laine.epaisseur)} : les blocs dans cette laine n'auront pas tout à fait la même taille. Choisis plutôt une laine de même épaisseur.`);
    }
  }
  // En rond : un câble plus long que le tour ne permet pas de joindre les mailles.
  let cable = null;
  if (projet.type === "snood") {
    cable = cableTropLong(lireNombre(aiguilles?.cableCm), projet.taille.tourCm);
    if (cable) cable = { ...cable, cableCm: lireNombre(aiguilles.cableCm), tourCm: projet.taille.tourCm };
  } else if (projet.type === "bonnet") {
    // Bonnet : tout en magic loop, il faut un câble assez long (décision du 06/11).
    cable = cableMagicLoop(lireNombre(aiguilles?.cableCm));
    if (cable) cable = { ...cable, cableCm: lireNombre(aiguilles.cableCm), magicLoop: true };
  }
  return {
    ...r, densites, echantillon, metrage, laineSuffit, parLaine, avertissements, cable,
    estime: !echantillon || Object.values(densites).some((d) => d.statut !== "mesuree"),
  };
}

/** Texte de l'accueil pour un projet en conception : « En conception · étape 3 sur 6 ». */
export function texteEtat(projet, suivi = null) {
  if (projet.statut === "conception") return `En conception · étape ${projet.etape} sur 6`;
  if (projet.statut === "patron") return texteSuivi(projet, suivi);
  if (projet.statut === "termine") return "Terminé";
  return "";
}

/** Où aller quand on touche un projet sur l'accueil. */
export function cheminProjet(projet, suivi = null) {
  if (projet.statut === "conception") return cheminEtape(projet);
  const id = encodeURIComponent(projet.id);
  if (projet.statut === "patron" && suivi?.rangsFaits > 0) return `/projet/${id}/suivi`;
  return `/projet/${id}/patron`;
}

/** Projets en cours, le dernier modifié d'abord. */
export function trierProjets(projets) {
  return [...projets]
    .filter((p) => p.statut !== "termine")
    .sort((a, b) => String(b.modifieLe || "").localeCompare(String(a.modifieLe || "")));
}

/** Point utilisé pour la vignette d'un projet. */
export function pointVignette(projet) {
  return pointParId(projet.pointPrincipal) || pointParId(projet.blocs?.find((b) => b.pointId)?.pointId) || pointParId("jersey");
}

// ---------------- Blocs du builder ----------------

export const LIMITES_BLOCS = { hauteurCm: [1, 80], largeurMailles: [1, 20] };

const idBloc = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const horizontal = (b) => b.zone !== "cotes";

/** Blocs horizontaux du bas vers le haut (les bandes latérales à part). */
export const blocsHorizontaux = (projet) => projet.blocs.filter(horizontal);
export const blocLateral = (projet) => projet.blocs.find((b) => b.zone === "cotes") || null;

/** Nom d'un bloc pour l'écran : « Bordure du bas », « Corps », « Bande », « Bandes latérales ». */
export function nomBloc(bloc, projet = null) {
  if (estSection(bloc) && projet) return `Section ${numeroSection(projet, bloc)}`;
  if (projet?.type === "bonnet" && bloc.zone === "bas") return projet.taille?.revers ? "Bord et revers" : "Bord";
  return { bas: "Bordure du bas", corps: "Corps", bande: "Bande", haut: "Bordure du haut", cotes: "Bandes latérales" }[bloc.zone] || "Bloc";
}

/** Nom court pour les pastilles des blocs. */
export function nomCourtBloc(bloc, projet = null) {
  if (estSection(bloc) && projet) return `Section ${numeroSection(projet, bloc)}`;
  if (projet?.type === "bonnet" && bloc.zone === "bas") return projet.taille?.revers ? "Bord et revers" : "Bord";
  return { bas: "Bordure", corps: "Corps", bande: "Bande", haut: "Bordure", cotes: "Côtés" }[bloc.zone] || "Bloc";
}

/**
 * Ajoute un bloc horizontal.
 * - type "bande" : une bande d'un autre point dans le corps, position "debut" | "milieu" | "fin".
 *   Au milieu, la bande coupe le corps en deux parties (même point, même longueur).
 * - type "bordure" : une bordure de plus, position "bas" | "haut", placée entre la bordure existante et le corps.
 * Renvoie { projet, blocId }.
 */
export function ajouterBloc(projet, { type, position, pointId, hauteurCm }) {
  const nouveau = { id: idBloc(), zone: type === "bordure" ? position : "bande", pointId, hauteurCm };
  const blocs = [...projet.blocs];
  const indices = blocs.map((b, i) => (b.zone === "corps" ? i : -1)).filter((i) => i >= 0);
  let insertion;
  let enPlus = [];
  if (type === "bordure" && position === "bas") {
    insertion = blocs.findIndex((b) => horizontal(b) && b.zone !== "bas");
  } else if (type === "bordure") {
    const dernierNonHaut = blocs.reduce((d, b, i) => (horizontal(b) && b.zone !== "haut" ? i : d), -1);
    insertion = dernierNonHaut + 1;
  } else if (position === "debut") {
    insertion = indices[0];
  } else if (position === "fin") {
    insertion = indices[indices.length - 1] + 1;
  } else {
    // Au milieu : après la partie du corps du milieu, suivie d'une nouvelle partie du corps.
    const coupe = blocs[indices[Math.floor((indices.length - 1) / 2)]];
    insertion = indices[Math.floor((indices.length - 1) / 2)] + 1;
    // La nouvelle partie du corps garde les colonnes de celle qu'elle prolonge.
    const colonnes = coupe.colonnes?.map((c, j) => ({ ...c, id: `c${j + 1}-${Math.random().toString(36).slice(2, 6)}` }));
    enPlus = [{ id: idBloc(), zone: "corps", pointId: projet.pointPrincipal || blocs[indices[0]].pointId, ...(colonnes ? { colonnes } : {}) }];
  }
  if (insertion < 0) insertion = blocs.length;
  blocs.splice(insertion, 0, nouveau, ...enPlus);
  return { projet: { ...projet, blocs }, blocId: nouveau.id };
}

/**
 * Supprime un bloc (jamais le corps). Une bande qui coupait le corps en deux le recolle.
 */
export function supprimerBloc(projet, blocId) {
  const i = projet.blocs.findIndex((b) => b.id === blocId);
  if (i < 0 || projet.blocs[i].zone === "corps") return projet;
  const blocs = [...projet.blocs];
  const avant = blocs[i - 1];
  const apres = blocs[i + 1];
  const recoller = blocs[i].zone === "bande" && avant?.zone === "corps" && apres?.zone === "corps";
  blocs.splice(i, recoller ? 2 : 1);
  return { ...projet, blocs };
}

/** Rajoute les bandes latérales (4 mailles en point mousse) si elles avaient été supprimées. */
export function avecBandesLaterales(projet) {
  if (blocLateral(projet)) return projet;
  return { ...projet, blocs: [...projet.blocs, { id: "cotes", zone: "cotes", pointId: "mousse", largeurMailles: 4 }] };
}

const borne = (v, [min, max]) => Math.min(max, Math.max(min, v));

export function avecHauteurBloc(projet, blocId, hauteurCm) {
  return { ...projet, blocs: projet.blocs.map((b) => (b.id === blocId ? { ...b, hauteurCm: borne(hauteurCm, LIMITES_BLOCS.hauteurCm) } : b)) };
}

export function avecLargeurBandes(projet, mailles) {
  return { ...projet, blocs: projet.blocs.map((b) => (b.zone === "cotes" ? { ...b, largeurMailles: borne(mailles, LIMITES_BLOCS.largeurMailles) } : b)) };
}

// ---------------- Colonnes ----------------

/** Les blocs qui peuvent être coupés en colonnes : le corps et les bandes. */
export const divisible = (bloc) => bloc?.zone === "corps" || bloc?.zone === "bande";

/** Point proposé pour les colonnes paires : un point qui contraste avec celui du bloc. */
export function pointAlterne(pointId) {
  return pointId === "riz" ? "jersey" : "riz";
}

/**
 * Coupe un bloc en n colonnes : la première garde le point du bloc, les suivantes alternent avec un autre point.
 * Les colonnes déjà là sont gardées (avec leur point) quand on change leur nombre ; leurs largeurs repartent à égalité.
 */
export function diviserBloc(projet, blocId, n) {
  const k = Math.max(COLONNES_MIN, Math.min(COLONNES_MAX, Math.round(n)));
  return {
    ...projet,
    blocs: projet.blocs.map((b) => {
      if (b.id !== blocId || !divisible(b)) return b;
      const base = b.pointId || projet.pointPrincipal;
      const avant = b.colonnes || [];
      const colonnes = Array.from({ length: k }, (_, j) => ({
        id: avant[j]?.id || `c${j + 1}-${Math.random().toString(36).slice(2, 6)}`,
        pointId: avant[j]?.pointId || (j % 2 === 0 ? base : pointAlterne(base)),
      }));
      return { ...b, colonnes };
    }),
  };
}

/** Le bloc redevient d'un seul tenant. */
export function nePlusDiviser(projet, blocId) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) => {
      if (b.id !== blocId) return b;
      const { colonnes, ...reste } = b;
      return reste;
    }),
  };
}

export function avecPointDeColonne(projet, blocId, colonneId, pointId) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) =>
      b.id === blocId ? { ...b, colonnes: (b.colonnes || []).map((c) => (c.id === colonneId ? { ...c, pointId, mailles: undefined } : c)) } : b
    ),
  };
}

/** Largeur choisie pour une colonne (les autres se partagent le reste) ; undefined la libère. */
export function avecLargeurColonne(projet, blocId, colonneId, mailles) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) =>
      b.id === blocId ? { ...b, colonnes: (b.colonnes || []).map((c) => (c.id === colonneId ? { ...c, mailles } : c)) } : b
    ),
  };
}

/** Toutes les colonnes repartent à parts égales. */
export function repartirEgalement(projet, blocId) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) =>
      b.id === blocId ? { ...b, colonnes: (b.colonnes || []).map(({ mailles, ...c }) => c) } : b
    ),
  };
}

/**
 * Colonne plus large ou plus étroite (sens +1 / −1) : passe au nombre de mailles voisin qui convient à son point
 * et le fixe. Renvoie le projet inchangé si ce n'est pas possible (dernière colonne libre, motif, etc.).
 * total : mailles du bloc dans le plan calculé ; actuelles : mailles de chaque colonne dans le plan.
 */
export function changerLargeurColonne(projet, blocId, colonneId, sens, { total, actuelles }) {
  const bloc = projet.blocs.find((b) => b.id === blocId);
  const j = bloc?.colonnes?.findIndex((c) => c.id === colonneId) ?? -1;
  if (j < 0) return projet;
  const point = pointParId(bloc.colonnes[j].pointId);
  const mode = enRond(projet) ? "rond" : "plat";
  const m = point && maillesVoisines(point, actuelles[j], sens, mode);
  if (!m) return projet;
  const colonnes = bloc.colonnes.map((c, i) => ({ point: pointParId(c.pointId), mailles: i === j ? m : c.mailles }));
  if (!colonnes.some((c, i) => i !== j && !Number.isInteger(c.mailles))) return projet;
  if (!repartirMailles(colonnes, total, mode)) return projet;
  return avecLargeurColonne(projet, blocId, colonneId, m);
}

/**
 * Aperçu d'une découpe en n colonnes avant de la faire : { mailles: [...], egales } ou null.
 * total : mailles actuelles du bloc.
 */
export function apercuDecoupe(projet, blocId, n, total) {
  const essai = diviserBloc(projet, blocId, n).blocs.find((b) => b.id === blocId);
  const colonnes = (essai?.colonnes || []).map((c) => ({ point: pointParId(c.pointId) }));
  if (!colonnes.length || colonnes.some((c) => !c.point) || !total) return null;
  const r = repartirMailles(colonnes, total, enRond(projet) ? "rond" : "plat");
  return r ? { mailles: r, egales: r.every((m) => m === r[0]) } : null;
}

/**
 * Pour des colonnes égales, combien de mailles faudrait-il au bloc (au-dessous et au-dessus) ?
 * Renvoie { dessous, dessus } avec pour chacun { total, parColonne } (ou null).
 */
export function colonnesEgalesPossibles(bloc, total, mode = "plat") {
  const colonnes = (bloc?.colonnes || []).map((c) => ({ point: pointParId(c.pointId) }));
  if (colonnes.length < COLONNES_MIN || colonnes.some((c) => !c.point)) return null;
  const { dessous, dessus } = totauxEgaux(colonnes, total, mode);
  const part = (t) => (t === null ? null : { total: t, parColonne: t / colonnes.length });
  return { dessous: part(dessous), dessus: part(dessus) };
}

// ---------------- Laines ----------------

/** Les blocs qui peuvent prendre une autre laine : bordures, bandes et sections (un corps d'un seul tenant garde la laine principale). */
export const coloriable = (bloc) => ["bas", "haut", "bande"].includes(bloc?.zone) || estSection(bloc);

export function avecLaineDuBloc(projet, blocId, laineId) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) => {
      if (b.id !== blocId) return b;
      if (!laineId || laineId === projet.laineId) {
        const { laineId: _, ...reste } = b;
        return reste;
      }
      return { ...b, laineId };
    }),
  };
}

/** Le projet a-t-il des blocs (ou des colonnes) d'une autre laine ? */
export const plusieursLaines = (projet) =>
  projet.blocs.some((b) => (b.laineId && b.laineId !== projet.laineId) || (!enRond(projet) && (b.colonnes || []).some((c) => c.laineId && c.laineId !== projet.laineId)));

/** Laine d'une colonne (intarsia) ; undefined ou la laine de son bloc la libère. */
export function avecLaineDeColonne(projet, blocId, colonneId, laineId) {
  return {
    ...projet,
    blocs: projet.blocs.map((b) => {
      if (b.id !== blocId) return b;
      const duBloc = b.laineId || projet.laineId;
      return {
        ...b,
        colonnes: (b.colonnes || []).map((c) => {
          if (c.id !== colonneId) return c;
          const { laineId: _, ...reste } = c;
          return !laineId || laineId === duBloc ? reste : { ...reste, laineId };
        }),
      };
    }),
  };
}

// ---------------- Sections du corps (E3c-2, E3c-3) ----------------

export const SECTIONS_MIN = 2;
export const SECTIONS_MAX = 6;

export const estSection = (b) => b?.zone === "corps" && !!b.section;
export const sectionsDuProjet = (projet) => (projet?.blocs || []).filter(estSection);
export const enSections = (projet) => sectionsDuProjet(projet).length >= SECTIONS_MIN;
export const premiereSection = (projet) => sectionsDuProjet(projet)[0] || null;
export function numeroSection(projet, bloc) {
  return sectionsDuProjet(projet).findIndex((b) => b.id === bloc.id) + 1;
}

/**
 * Coupe le corps en n sections empilées (la section 1 en bas, au point principal ; les paires dans un autre point).
 * Les bandes qui coupaient le corps restent à leur place relative.
 */
export function diviserEnSections(projet, n) {
  const k = Math.max(SECTIONS_MIN, Math.min(SECTIONS_MAX, Math.round(n)));
  const blocs = projet.blocs;
  const iCorps = blocs.map((b, i) => (b.zone === "corps" ? i : -1)).filter((i) => i >= 0);
  if (!iCorps.length) return projet;
  const premier = iCorps[0];
  const dernier = iCorps[iCorps.length - 1];
  const m = iCorps.length;
  const base = projet.pointPrincipal || blocs[premier].pointId;
  // Bandes au milieu du corps : après quelle partie (1 à m − 1) ?
  const bandes = [];
  let partie = 0;
  for (let i = premier; i <= dernier; i++) {
    if (blocs[i].zone === "corps") partie += 1;
    else bandes.push({ bloc: blocs[i], apres: Math.min(k, Math.ceil((partie * k) / m)) });
  }
  const milieu = [];
  for (let j = 0; j < k; j++) {
    milieu.push({ id: j === 0 ? blocs[premier].id : idBloc(), zone: "corps", section: true, pointId: j % 2 === 0 ? base : pointAlterne(base) });
    for (const x of bandes) if (x.apres === j + 1) milieu.push(x.bloc);
  }
  return { ...projet, blocs: [...blocs.slice(0, premier), ...milieu, ...blocs.slice(dernier + 1)] };
}

/** Le corps redevient d'un seul tenant (dans le point et la laine principaux) ; les bandes restent. */
export function sansSections(projet) {
  const blocs = [];
  for (const b of projet.blocs) {
    if (b.zone !== "corps") { blocs.push(b); continue; }
    if (blocs.at(-1)?.zone === "corps") continue; // deux parties voisines : recollées
    blocs.push({ id: b.id, zone: "corps", pointId: projet.pointPrincipal || b.pointId });
  }
  return { ...projet, blocs };
}

/** Hauteur fixée d'une section ; il reste toujours au moins une section libre, qui prend le reste. */
export function avecHauteurSection(projet, blocId, hauteurCm) {
  const sections = sectionsDuProjet(projet);
  const h = borne(hauteurCm, [1, 300]);
  let blocs = projet.blocs.map((b) => (b.id === blocId ? { ...b, hauteurCm: h } : b));
  const libres = blocs.filter((b) => estSection(b) && !(b.hauteurCm > 0));
  if (!libres.length) {
    const autre = [...sections].reverse().find((b) => b.id !== blocId);
    if (autre) blocs = blocs.map((b) => (b.id === autre.id ? (({ hauteurCm, ...r }) => r)(b) : b));
  }
  return { ...projet, blocs };
}

/** Toutes les sections repartent à hauteurs égales. */
export function repartirSections(projet) {
  return { ...projet, blocs: projet.blocs.map((b) => (estSection(b) ? (({ hauteurCm, ...r }) => r)(b) : b)) };
}

export const sectionsFixees = (projet) => sectionsDuProjet(projet).some((b) => b.hauteurCm > 0);

/** Toutes les sections sont-elles en colonnes ? */
export const estUnDamier = (projet) => enSections(projet) && sectionsDuProjet(projet).every((b) => b.colonnes?.length >= COLONNES_MIN);

/**
 * Damier : toutes les sections en autant de colonnes que la section choisie (4 par défaut) ;
 * la colonne j de la section k prend le point et la laine de la colonne (j + k) mod n du modèle (en rond : le point seulement).
 */
export function faireUnDamier(projet, sectionId) {
  const sections = sectionsDuProjet(projet);
  if (sections.length < SECTIONS_MIN) return projet;
  let modele = sections.find((b) => b.id === sectionId) || sections[0];
  if (!(modele.colonnes?.length >= COLONNES_MIN)) modele = diviserBloc(projet, modele.id, 4).blocs.find((b) => b.id === modele.id);
  const M = modele.colonnes;
  const n = M.length;
  const rond = enRond(projet);
  const iModele = sections.findIndex((b) => b.id === modele.id);
  return {
    ...projet,
    blocs: projet.blocs.map((b) => {
      const k = sections.findIndex((s) => s.id === b.id);
      if (k < 0) return b;
      const d = (((k - iModele) % n) + n) % n;
      const colonnes = Array.from({ length: n }, (_, j) => {
        const src = M[(j + d) % n];
        const c = { id: b.id === modele.id ? M[j].id : `c${j + 1}-${Math.random().toString(36).slice(2, 6)}`, pointId: src.pointId };
        if (!rond && src.laineId) c.laineId = src.laineId;
        return c;
      });
      return { ...b, colonnes: b.id === modele.id ? M.map((c) => ({ ...c })) : colonnes };
    }),
  };
}

/** Les sections redeviennent d'un seul tenant (sans colonnes). */
export function defaireLeDamier(projet) {
  return { ...projet, blocs: projet.blocs.map((b) => (estSection(b) ? (({ colonnes, ...r }) => r)(b) : b)) };
}

// ---------------- Aperçu et création du patron ----------------

/**
 * Peut-on créer le patron ? Renvoie { possible, raison, approximatif, laineManque }.
 * - Le plan doit être vérifié (motifs justes, simulateur d'accord).
 * - Il faut au moins l'échantillon de l'étiquette : une estimation d'après la seule épaisseur ne suffit pas.
 * - Sans échantillon tricoté dans le point du corps, le patron est « approximatif » (décision du 24/10).
 */
export function etatCreationPatron(projet, calcul) {
  if (!calcul) return { possible: false, raison: "L'outil ne peut pas encore calculer : il manque l'échantillon (étape 2)." };
  if (!calcul.ok) return { possible: false, raison: calcul.erreurs[0]?.message || "Le plan ne tombe pas juste." };
  const d = calcul.densites?.[projet.pointPrincipal];
  if (!d) return { possible: false, raison: "Le point du corps n'a pas de densité." };
  if (d.statut !== "mesuree" && d.origine === "epaisseur") {
    return {
      possible: false,
      raison: "Pour créer le patron, il faut ton échantillon, ou au moins l'échantillon noté sur l'étiquette de ta laine : l'épaisseur seule ne suffit pas.",
    };
  }
  const manques = (calcul.parLaine || [])
    .filter((x) => x.suffit?.statut === "insuffisant")
    .map((x) => ({ laineId: x.laineId, nom: x.laine.nom, metres: Math.ceil(x.suffit.manque) }));
  return {
    possible: true,
    approximatif: d.statut !== "mesuree",
    laineManque: calcul.laineSuffit?.statut === "insuffisant" ? Math.ceil(calcul.laineSuffit.manque) : 0,
    manques,
  };
}

/** Texte de l'accueil pour un projet dont le patron est créé : « Rang 42 sur 380 · 11 % ». */
export function texteSuivi(projet, suivi) {
  const total = projet.patron?.nbRangs || 0;
  const fait = suivi?.rangsFaits || 0;
  const tour = enRond(projet);
  if (!total) return "Patron créé";
  if (fait === 0) return `Patron prêt · ${total} ${tour ? "tours" : "rangs"}${projet.patron?.approximatif ? " · tailles approximatives" : ""}`;
  if (fait >= total) return tour ? "Tous les tours sont tricotés" : "Tous les rangs sont tricotés";
  return `${tour ? "Tour" : "Rang"} ${fait + 1} sur ${total} · ${Math.floor((fait / total) * 100)} %`;
}

/** Phrase sur un échantillon à plat utilisé pour une pièce en rond (décision du 02/11), ou null. */
export function noteEchantillonEnRond(projet, echantillon) {
  if (!enRond(projet) || !echantillon || echantillon.mode === "rond") return null;
  return "Tricoté à plat : en rond, le tricot peut être un peu plus serré.";
}
