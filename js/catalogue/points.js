// Catalogue des points — première fournée (E1) : 15 points représentatifs.
//
// Seules la structure des points et leurs usages sont repris des Triconautes (lien « source ») ;
// les explications sont rédigées pour l'outil.
//
// densite : rapport au jersey, pour la même laine et les mêmes aiguilles
//   mailles > 1 : le point resserre (plus de mailles pour 10 cm) ; rangs > 1 : plus de rangs pour 10 cm.
// consommation : fil utilisé pour une même surface, jersey = 1.
// Ces chiffres sont des estimations de départ ; tes échantillons enregistrés les remplaceront.
//
// article : « le », « la » ou « les » devant le nom en minuscules (« le point de riz », « les côtes 2/2 »).
// avis : "conseille" | "possible" | "deconseille", avec une raison d'une phrase quand ce n'est pas conseillé.

import { TRICONAUTES, E, V, fois, ok, possible, deconseille } from "./aides.js";
import { POINTS_LOT as LOT_A } from "./lots/lot-a.js";
import { POINTS_LOT as LOT_B } from "./lots/lot-b.js";
import { POINTS_LOT as LOT_C } from "./lots/lot-c.js";
import { POINTS_LOT as LOT_D } from "./lots/lot-d.js";

export const FAMILLES = [
  { id: "bases", nom: "Bases" },
  { id: "cotes", nom: "Côtes" },
  { id: "textures", nom: "Texturés" },
  { id: "ajoures", nom: "Ajourés et dentelle" },
  { id: "torsades", nom: "Torsades" },
];

export const PIECES = [
  { id: "echarpe", nom: "Écharpe" },
  { id: "snood", nom: "Snood" },
  { id: "bonnet", nom: "Bonnet" },
  { id: "couverture", nom: "Couverture" },
];


export const POINTS = [
  // ---------------- Bases ----------------
  {
    id: "jersey",
    nom: "Jersey",
    article: "le",
    synonymes: ["point jersey", "jersey endroit"],
    famille: "bases",
    rangs: [E(["end"]), V(["env"])],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 1 },
    ouvrages: {
      echarpe: possible("Il roule sur les côtés : ajoute une bordure (mousse, riz ou côtes), et son envers est différent."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Il roule : une bordure en jersey s'enroule sur elle-même.") },
    resume: "Le point le plus simple et le plus économe : des petits V bien alignés sur l'endroit.",
    source: TRICONAUTES + "point-jersey-tout-ce-quil-faut-savoir-sur-ce-point/",
  },
  {
    id: "jersey-envers",
    nom: "Jersey envers",
    article: "le",
    synonymes: ["envers du jersey"],
    famille: "bases",
    rangs: [E(["env"]), V(["end"])],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 1 },
    ouvrages: {
      echarpe: possible("Il roule sur les côtés : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Il roule : une bordure en jersey envers s'enroule.") },
    resume: "L'envers du jersey utilisé comme endroit : un tricot tout en petits grains, idéal en fond de torsades.",
    source: TRICONAUTES + "jersey-envers/",
  },
  {
    id: "mousse",
    nom: "Point mousse",
    article: "le",
    synonymes: ["mousse", "point de mousse"],
    famille: "bases",
    rangs: [E(["end"]), V(["end"])],
    densite: { mailles: 1, rangs: 1.75 },
    consommation: 1.2,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: possible("En rond, il faut alterner un tour endroit et un tour envers : une petite marque se voit au changement de tour."),
      couverture: ok,
    },
    zones: { bordure: ok },
    resume: "Tout à l'endroit à plat : des sillons moelleux, pareils des deux côtés, qui ne roulent pas.",
    source: TRICONAUTES + "point-mousse-tricot-il-faut-savoir/",
  },

  // ---------------- Côtes ----------------
  {
    id: "cotes-1-1",
    nom: "Côtes 1/1",
    article: "les",
    synonymes: ["côtes simples", "côtes 1-1"],
    famille: "cotes",
    rangs: [E(["end", "env"]), V(["end", "env"])],
    densite: { mailles: 1.35, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent beaucoup le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    resume: "Une maille endroit, une maille envers : très élastique, idéal pour les bords de bonnet et les poignets.",
    source: TRICONAUTES + "tricoter-des-cotes-comment-les-faire-et-les-reussir/",
  },
  {
    id: "cotes-2-2",
    nom: "Côtes 2/2",
    article: "les",
    synonymes: ["côtes doubles", "côtes 2-2"],
    famille: "cotes",
    rangs: [E(["end", "end", "env", "env"]), V(["end", "end", "env", "env"])],
    densite: { mailles: 1.3, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent beaucoup le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    resume: "Deux mailles endroit, deux mailles envers : des côtes bien marquées et élastiques.",
    source: TRICONAUTES + "tricoter-des-cotes-comment-les-faire-et-les-reussir/",
  },
  {
    id: "sillon",
    nom: "Côtes de sillon",
    article: "les",
    synonymes: ["point de sillon", "côtes farrow", "farrow rib"],
    famille: "cotes",
    rangs: [E(["end", "end", "env"], { fin: ["end"] }), V(["end", "end", "env"], { debut: ["env"] })],
    densite: { mailles: 1.15, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Des côtes faciles et réversibles, sur deux rangs presque identiques.",
    source: TRICONAUTES + "point-sillon/",
  },
  {
    id: "fausses-cotes-anglaises",
    nom: "Fausses côtes anglaises",
    article: "les",
    synonymes: ["brioche facile", "côtes perlées anglaises", "fisherman rib"],
    famille: "cotes",
    miseEnPlace: [V(["env"])],
    rangs: [E(["env", "md"], { fin: ["env", "env"] }), V(["env", "md"], { fin: ["env", "env"] })],
    densite: { mailles: 1.1, rangs: 1.6 },
    consommation: 1.5,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 3, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Très gourmand en laine : une couverture demandera beaucoup de pelotes."),
    },
    zones: { bordure: ok },
    resume: "L'allure épaisse du point brioche, sans jetés : on pique simplement dans la maille du rang du dessous.",
    source: TRICONAUTES + "fausses-cotes-anglaise/",
  },

  // ---------------- Texturés ----------------
  {
    id: "riz",
    nom: "Point de riz",
    article: "le",
    synonymes: ["riz", "point de grain de riz", "seed stitch"],
    famille: "textures",
    rangs: [E(["end", "env"], { fin: ["end"] }), V(["end", "env"], { fin: ["end"] })],
    densite: { mailles: 1.05, rangs: 1.1 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Une maille endroit, une maille envers, décalées à chaque rang : un relief granuleux, pareil des deux côtés.",
    source: TRICONAUTES + "point-de-riz-le-guide-ultime-pour-le-reussir-a-tous-les-coups/",
  },
  {
    id: "ble",
    nom: "Point de blé",
    article: "le",
    synonymes: ["blé", "riz double", "double moss"],
    famille: "textures",
    rangs: [E(["end", "env"]), V(["end", "env"]), E(["env", "end"]), V(["env", "end"])],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    avertissements: { laineFloue: "Avec une laine floue comme le mohair, le relief se voit peu." },
    resume: "Un damier de petits carrés de deux rangs : un riz plus marqué, réversible.",
    source: TRICONAUTES + "point-de-ble-au-tricot-comment-bien-le-tricoter/",
  },
  {
    id: "sable",
    nom: "Point de sable",
    article: "le",
    synonymes: ["sable"],
    famille: "textures",
    rangs: [E(["end", "end"], { fin: ["end"] }), V(["end", "env"], { fin: ["end"] })],
    densite: { mailles: 1.05, rangs: 1.2 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Un rang tout à l'endroit, un rang en côtes : une texture douce et serrée qui ne roule pas.",
    source: TRICONAUTES + "point-de-sable-le-guide-ultime-pour-le-tricoter-parfaitement/",
  },
  {
    id: "nid-abeille",
    nom: "Nid d'abeille",
    article: "le",
    synonymes: ["rayon de miel", "point nid d'abeille"],
    famille: "textures",
    // Le premier rang se tricote sur l'envers ; les mailles doubles se font sur l'endroit.
    rangs: [V(["end"]), E(["end", "md"]), V(["end"]), E(["md", "end"])],
    densite: { mailles: 1.1, rangs: 1.6 },
    consommation: 1.4,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 3, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Joli en bordure, mais peu élastique pour un bord de bonnet.") },
    resume: "Des alvéoles épaisses et chaudes, grâce à la maille double piquée dans le rang du dessous.",
    source: TRICONAUTES + "point-nid-abeille/",
  },
  {
    id: "mini-noisette",
    nom: "Mini noisette",
    article: "la",
    synonymes: ["petite noisette"],
    famille: "textures",
    rangs: [
      V(fois("env", 4), { debut: ["env"], fin: ["env"] }),
      E(["1en3", "3ens"], { debut: ["end"], fin: ["end"] }),
      V(fois("env", 4), { debut: ["env"], fin: ["env"] }),
      E(["3ens", "1en3"], { debut: ["end"], fin: ["end"] }),
    ],
    densite: { mailles: 1.15, rangs: 1 },
    consommation: 1.35,
    proprietes: { reversible: false, roule: false, elasticite: 1, chaleur: 3, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est plat et différent de l'endroit."),
      snood: ok,
      bonnet: possible("Très dense : joli, mais peu souple pour un bonnet."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Peu élastique et épais : mieux vaut une bordure en côtes ou en mousse.") },
    resume: "Des petites boules serrées en quinconce, proches de l'astrakan, faciles à réaliser.",
    source: TRICONAUTES + "point-noisette-tricot/",
  },

  // ---------------- Ajourés ----------------
  {
    id: "bourse",
    nom: "Point de bourse",
    article: "le",
    synonymes: ["bourse"],
    famille: "ajoures",
    rangs: [E(["jete", "2ens"]), V(["jete", "2ens"])],
    densite: { mailles: 0.85, rangs: 0.9 },
    consommation: 0.85,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 1, niveau: 1 },
    ouvrages: {
      echarpe: ok,
      snood: possible("Très ajouré : léger mais peu chaud."),
      bonnet: possible("Très ajouré : pour un bonnet de mi-saison."),
      couverture: deconseille("Les trous laissent passer l'air : une couverture serait peu chaude."),
    },
    zones: { bordure: possible("Joli en bordure ajourée, mais il s'étire.") },
    resume: "Un jeté, deux mailles ensemble, à tous les rangs : une dentelle légère et très facile.",
    source: TRICONAUTES + "point-bourse-tricot/",
  },
  {
    id: "chevron-dentele",
    nom: "Chevron dentelé",
    article: "le",
    synonymes: ["chevron ajouré"],
    famille: "ajoures",
    rangs: [
      E(["ssk", "end", "jete", "end", "jete", "end", "2ens", "end"], { debut: ["end"] }),
      V(fois("env", 8), { debut: ["env"] }),
      E(["ssk", "end", "jete", "end", "jete", "end", "2ens", "end"], { debut: ["end"] }),
      V(fois("env", 8), { debut: ["env"] }),
      E(["jete", "ssk", "end", "end", "end", "2ens", "jete", "end"], { debut: ["end"] }),
      V(fois("env", 8), { debut: ["env"] }),
      E(["jete", "ssk", "end", "2ens", "jete", "end", "end", "end"], { debut: ["end", "end"], fin: ["jete", "ssk", "end", "2ens", "jete", "end", "end"] }),
      V(fois("env", 8), { debut: ["env"] }),
      E(["jete", "sd", "jete", ...fois("end", 5)], { debut: fois("end", 3), fin: ["jete", "sd", "jete", ...fois("end", 3)] }),
      V(fois("env", 8), { debut: ["env"] }),
    ],
    densite: { mailles: 0.95, rangs: 1 },
    consommation: 0.95,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 3 },
    ouvrages: {
      echarpe: ok,
      snood: possible("Léger et ajouré : plutôt pour la mi-saison."),
      bonnet: possible("Ajouré : plutôt pour la mi-saison."),
      couverture: possible("Joli en couverture légère, à bloquer après lavage."),
    },
    zones: { bordure: possible("Les bords ondulent : joli en bas d'ouvrage.") },
    blocage: true,
    resume: "Des vagues de petits trous en zigzag ; un motif de 10 rangs à suivre attentivement.",
    source: TRICONAUTES + "point-chevron/",
  },

  // ---------------- Torsades ----------------
  {
    id: "torsade-gauche",
    nom: "Torsade croisée à gauche",
    article: "la",
    synonymes: ["torsade simple", "torsade 3/3"],
    famille: "torsades",
    rangs: [
      E(["env", "env", "env", ...fois("end", 6)], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
      E(["env", "env", "env", ...fois("end", 6)], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
      E(["env", "env", "env", "T3/3G"], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Joli en bande décorative, mais il resserre le tricot.") },
    resume: "La torsade la plus simple : 6 mailles qui se croisent tous les 6 rangs, sur un fond de jersey envers.",
    source: TRICONAUTES + "point-torsade-tricot-differents-points-originaux/",
  },
];

// Deuxième fournée : les autres points de l'inventaire, par lots.
POINTS.push(...LOT_A, ...LOT_B, ...LOT_C, ...LOT_D);

export function pointParId(id) {
  return POINTS.find((p) => p.id === id) || null;
}

/** Recherche par nom ou synonyme, sans tenir compte des accents ni des majuscules. */
export function rechercherPoints(texte, points = POINTS) {
  const simplifier = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const q = simplifier(texte || "");
  if (!q) return points;
  return points.filter((p) => [p.nom, ...(p.synonymes || [])].some((n) => simplifier(n).includes(q)));
}

/** Avis du point pour une pièce et une zone (« corps » par défaut). */
export function avisPour(point, piece, zone = "corps") {
  const avisPiece = piece ? point.ouvrages[piece] || { avis: "possible" } : { avis: "conseille" };
  if (zone === "bordure") {
    const avisZone = point.zones?.bordure || { avis: "possible" };
    const ordre = { conseille: 0, possible: 1, deconseille: 2 };
    return ordre[avisZone.avis] > ordre[avisPiece.avis] ? avisZone : avisPiece;
  }
  return avisPiece;
}

export const NIVEAUX = { 1: "Débutant", 2: "Intermédiaire", 3: "Attention requise" };
