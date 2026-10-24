// Règles des projets en conception : création, étapes, tailles, matériel, calcul du plan.
// Fonctions pures, testées sans navigateur.

import { PALETTE, EPAISSEURS, lireNombre, formaterNombre, metrageLaine, aiguillesEtiquette, texteAiguillesEtiquette } from "./reserve.js";
import { pointParId, avisPour } from "../catalogue/points.js";
import { echantillonsCorrespondants, densitesDuProjet } from "../moteur/densite.js";
import { planEcharpe } from "../moteur/plan.js";
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

export const TYPES_DISPONIBLES = ["echarpe"];

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

/** Blocs d'une écharpe neuve : bordures et bandes latérales en point mousse, corps dans le point principal. */
export function blocsParDefaut(pointPrincipal = "") {
  return [
    { id: "bas", zone: "bas", pointId: "mousse", hauteurCm: 3 },
    { id: "corps", zone: "corps", pointId: pointPrincipal },
    { id: "haut", zone: "haut", pointId: "mousse", hauteurCm: 3 },
    { id: "cotes", zone: "cotes", pointId: "mousse", largeurMailles: 4 },
  ];
}

export function nouveauProjet({ type = "echarpe", nom = "" } = {}) {
  const t = TAILLES_ECHARPE.adulte;
  return {
    nom: nom.trim() || "Écharpe",
    nomAuto: !nom.trim(),
    type,
    statut: "conception",
    etape: 1,
    laineId: "",
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

/** Zone d'avis d'un bloc : les bordures et les bandes latérales sont jugées comme des bordures. */
export const zoneAvis = (zone) => (zone === "bas" || zone === "haut" || zone === "cotes" ? "bordure" : "corps");

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
    blocs: projet.blocs.map((b) => (b.zone === "corps" ? { ...b, pointId } : b)),
  };
}

/** Changer le point d'un bloc ; changer le corps change aussi le point principal. */
export function avecPointDuBloc(projet, blocId, pointId) {
  const bloc = projet.blocs.find((b) => b.id === blocId);
  if (!bloc) return projet;
  if (bloc.zone === "corps") return avecPointPrincipal(projet, pointId);
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

/**
 * Calcule le plan du projet avec les densités disponibles.
 * Renvoie { plan, ok, erreurs, explications, densites, estime } (ou null si on ne sait rien de la laine).
 */
export function calculerProjet({ projet, laine, aiguilles, echantillons }) {
  const taille = lireNombre(aiguilles?.tailleMm);
  if (!laine || taille === null || !projet.pointPrincipal) return null;
  const echantillon = echantillonDuProjet(projet, aiguilles, echantillons);
  const blocs = projet.blocs.filter((b) => b.pointId);
  const densites = densitesDuProjet({
    pointIds: blocs.map((b) => b.pointId), laine, tailleAiguille: taille, echantillons, echantillonPrincipal: echantillon,
  });
  if (Object.values(densites).some((d) => !d)) return null;
  const r = planEcharpe({
    largeurCm: projet.taille.largeurCm, longueurCm: projet.taille.longueurCm,
    blocs, densites, lisieres: projet.lisieres,
  });
  return { ...r, densites, echantillon, estime: !echantillon || Object.values(densites).some((d) => d.statut !== "mesuree") };
}

/** Texte de l'accueil pour un projet en conception : « En conception · étape 3 sur 6 ». */
export function texteEtat(projet) {
  if (projet.statut === "conception") return `En conception · étape ${projet.etape} sur 6`;
  return "";
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
