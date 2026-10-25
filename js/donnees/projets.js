// Règles des projets en conception : création, étapes, tailles, matériel, calcul du plan.
// Fonctions pures, testées sans navigateur.

import { PALETTE, EPAISSEURS, lireNombre, formaterNombre, metrageLaine, aiguillesEtiquette, texteAiguillesEtiquette } from "./reserve.js";
import { pointParId, avisPour } from "../catalogue/points.js";
import { echantillonsCorrespondants, densitesDuProjet } from "../moteur/densite.js";
import { planEcharpe, MAILLES_MAX_BANDE_LATERALE } from "../moteur/plan.js";
import { maillesMinimum, maillesConviennent } from "../moteur/simulateur.js";
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

/**
 * Avis sur un point pour un bloc : celui du catalogue (pièce et zone),
 * et pour les bandes latérales, les motifs trop larges sont écartés.
 */
export function avisPourBloc(point, piece, zone) {
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

/** Points utilisés par un bloc : le sien, et ceux de ses colonnes. */
export const pointsDuBloc = (b) => [b.pointId, ...(b.colonnes || []).map((c) => c.pointId)].filter(Boolean);

/**
 * Laines utilisées par le projet : la principale d'abord, puis celles des blocs, dans l'ordre (sans doublon).
 * Une laine qui n'est plus dans la réserve est ignorée (le bloc reprend la laine principale).
 */
export function lainesDuProjet(projet, laines = []) {
  const principale = laines.find((l) => l.id === projet.laineId);
  const liste = principale ? [principale] : [];
  for (const b of projet.blocs) {
    const l = b.laineId && b.laineId !== projet.laineId ? laines.find((x) => x.id === b.laineId) : null;
    if (l && !liste.includes(l)) liste.push(l);
  }
  return liste;
}

/** Laine d'un bloc (null = la laine principale), en ignorant une laine disparue de la réserve. */
export function laineDuBloc(projet, bloc, laines) {
  if (!bloc?.laineId || bloc.laineId === projet.laineId) return null;
  return laines && !laines.some((l) => l.id === bloc.laineId) ? null : bloc.laineId;
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
      const colonnes = b.colonnes?.length >= COLONNES_MIN && b.zone !== "cotes" ? b.colonnes.filter((c) => c.pointId) : null;
      return { ...b, laineId, colonnes: colonnes?.length >= COLONNES_MIN ? colonnes : undefined };
    });
  const densites = densitesDuProjet({
    pointIds: [...new Set(blocs.flatMap(pointsDuBloc))], laine, tailleAiguille: taille, echantillons, echantillonPrincipal: echantillon,
  });
  if (Object.values(densites).some((d) => !d)) return null;
  const r = planEcharpe({
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
  for (const l of lainesDuProjet({ ...projet, blocs }, reserve).slice(1)) {
    if (laine.epaisseur && l.epaisseur && l.epaisseur !== laine.epaisseur) {
      const ep = (id) => EPAISSEURS.find((e) => e.id === id)?.nom.toLowerCase() || id;
      avertissements.push(`« ${l.nom} » est ${ep(l.epaisseur)}, ta laine principale est ${ep(laine.epaisseur)} : les blocs dans cette laine n'auront pas tout à fait la même taille. Choisis plutôt une laine de même épaisseur.`);
    }
  }
  return {
    ...r, densites, echantillon, metrage, laineSuffit, parLaine, avertissements,
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
export function nomBloc(bloc) {
  return { bas: "Bordure du bas", corps: "Corps", bande: "Bande", haut: "Bordure du haut", cotes: "Bandes latérales" }[bloc.zone] || "Bloc";
}

/** Nom court pour les pastilles des blocs. */
export function nomCourtBloc(bloc) {
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
  const m = point && maillesVoisines(point, actuelles[j], sens);
  if (!m) return projet;
  const colonnes = bloc.colonnes.map((c, i) => ({ point: pointParId(c.pointId), mailles: i === j ? m : c.mailles }));
  if (!colonnes.some((c, i) => i !== j && !Number.isInteger(c.mailles))) return projet;
  if (!repartirMailles(colonnes, total)) return projet;
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
  const r = repartirMailles(colonnes, total);
  return r ? { mailles: r, egales: r.every((m) => m === r[0]) } : null;
}

/**
 * Pour des colonnes égales, combien de mailles faudrait-il au bloc (au-dessous et au-dessus) ?
 * Renvoie { dessous, dessus } avec pour chacun { total, parColonne } (ou null).
 */
export function colonnesEgalesPossibles(bloc, total) {
  const colonnes = (bloc?.colonnes || []).map((c) => ({ point: pointParId(c.pointId) }));
  if (colonnes.length < COLONNES_MIN || colonnes.some((c) => !c.point)) return null;
  const { dessous, dessus } = totauxEgaux(colonnes, total);
  const part = (t) => (t === null ? null : { total: t, parColonne: t / colonnes.length });
  return { dessous: part(dessous), dessus: part(dessus) };
}

// ---------------- Laines ----------------

/** Les blocs qui peuvent prendre une autre laine : bordures et bandes (le corps garde la laine principale). */
export const coloriable = (bloc) => ["bas", "haut", "bande"].includes(bloc?.zone);

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

/** Le projet a-t-il des blocs d'une autre laine ? */
export const plusieursLaines = (projet) => projet.blocs.some((b) => b.laineId && b.laineId !== projet.laineId);

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
  if (!total) return "Patron créé";
  if (fait === 0) return `Patron prêt · ${total} rangs${projet.patron?.approximatif ? " · tailles approximatives" : ""}`;
  if (fait >= total) return "Tous les rangs sont tricotés";
  return `Rang ${fait + 1} sur ${total} · ${Math.floor((fait / total) * 100)} %`;
}
