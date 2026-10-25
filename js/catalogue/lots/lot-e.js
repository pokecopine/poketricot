// Catalogue — lot E (troisième fournée, 25/10/2026). Voir js/catalogue/points.js pour le format d'un point.
// Seuls les noms et la structure des points sont repris des Triconautes (lu dans les articles le 25/10) ;
// les textes sont rédigés pour l'outil.
//
// Choix faits quand l'article se contredit :
//   - Zig-zag en côtes : les rangs endroit de l'article (1, 3, 5, 7, 9, 11) décalent le motif de 2 mailles ;
//     les rangs envers, mal écrits dans l'article, sont déduits pour un décalage régulier d'une maille par rang.
//   - Point de godron à plat : 3 rangs (endroit, envers, endroit) qui se répètent ; écrit ici sur 6 rangs
//     pour que chaque rang garde son côté, ce qui donne bien 3 rangs de jersey puis 3 rangs d'envers.
//   - Côtes brisées : l'ordre des rangs de l'article (A B A B A B B A B A B A) est gardé : c'est la cassure.
//   - Torsade d'arches : le rang 12, non écrit, suit la règle des rangs pairs ; la torsade se croise à gauche (2/2 devant).
//
// NON CODÉS (et pourquoi) :
//   - Lignes pointillées, variation du point de riz, côtes de couverture, point roman, noisette texturée,
//     point de mûres : le nombre de mailles change au milieu du motif ; le moteur ne sait pas encore les compter.
//   - Chevron penché : l'article donne un rang 3 incomplet (17 mailles seulement).
//   - Point alvéole : l'article reprend un « fil glissé » qu'aucun rang ne glisse.
//   - Point de chevron à mailles tombées : la façon de laisser tomber les mailles n'est pas définie.
//   - Point de nasse, rayon de miel glissé : rangs contradictoires dans l'article.
//   - Point de pointillés, petites coquilles, point de boucles, côtes décalées 2/2 : article non lu cette nuit.
//   - Point de lin : l'article n'en donne pas la recette.
//   - Points bicolores, bordures tricotées perpendiculairement, noisette au crochet : techniques pas encore prises en charge.

import { TRICONAUTES, E, V, fois, ok, possible, deconseille } from "../aides.js";

/** « K5 P1 K1 » → ["end" ×5, "env", "end"] (K = endroit, P = envers). */
function kp(texte) {
  return texte.trim().split(/\s+/).flatMap((m) => fois(m[0] === "K" ? "end" : "env", Number(m.slice(1) || 1)));
}

/**
 * Rangs d'un point endroit / envers dessiné vu de l'endroit, sans mailles en plus (multiple exact).
 * dessin : une chaîne « K » / « P » d'une répétition, lue de droite à gauche comme on tricote un rang endroit.
 * Sur un rang envers, on tricote de gauche à droite, à l'inverse de ce qu'on voit.
 */
function depuisDessin(cote, dessin) {
  const n = dessin.length;
  if (cote === "E") return E([...dessin].map((c) => (c === "K" ? "end" : "env")));
  // Rang envers : la j-ième maille tricotée est la colonne n-1-j de la répétition.
  return V(Array.from({ length: n }, (_, j) => (dessin[n - 1 - j] === "K" ? "env" : "end")));
}

/** Décale un dessin : la colonne c montre ce que montrait la colonne c - s. */
const decaler = (dessin, s) => {
  const n = dessin.length;
  return Array.from({ length: n }, (_, c) => dessin[(((c - s) % n) + n) % n]).join("");
};

/** Gestes nouveaux apportés par ce lot. */
export const GESTES_LOT = {
  // Point croisé : 1 maille glissée fil derrière, 1 maille endroit, 1 jeté, puis la glissée passée par-dessus les deux.
  croise_e: {
    nom: "maille croisée (1 gl., 1 end., 1 jeté, glissée passée par-dessus)",
    pluriel: "mailles croisées",
    abrege: "m. crois.",
    consomme: 2,
    produit: 2,
    endroit: ["Vgauche", "trou"],
    envers: null,
    vuDeLAutreCote: null,
  },
  // Point d'astrakan en rond : 1 maille envers, 1 endroit, 1 envers dans la même maille.
  "1en3Env_e": {
    nom: "1 maille en 3 (envers, endroit, envers)",
    pluriel: null,
    abrege: "1 m. en 3 (env.)",
    consomme: 1,
    produit: 3,
    endroit: ["grain", "V", "grain"],
    envers: ["V", "grain", "V"],
    vuDeLAutreCote: null,
  },
};

export const TECHNIQUES_LOT = {
  "1en3Env_e": {
    titre: "1 maille en 3 (envers, endroit, envers)",
    explication:
      "Tricote la maille à l'envers sans la lâcher, puis à l'endroit dans la même maille, puis encore à l'envers, et seulement alors laisse-la glisser de l'aiguille gauche. Une maille en donne trois.",
  },
  "3ensEnv": {
    titre: "3 mailles ensemble à l'envers",
    explication:
      "Fil devant, pique l'aiguille droite dans les trois premières mailles à la fois, comme pour une maille envers, et tricote-les ensemble à l'envers. Trois mailles n'en font plus qu'une.",
  },
  croise_e: {
    titre: "Maille croisée",
    explication:
      "Glisse 1 maille sans la tricoter (fil derrière, en piquant comme pour une maille envers), tricote la maille suivante à l'endroit, puis fais un jeté. Avec la pointe de l'aiguille gauche, attrape la maille glissée et passe-la par-dessus la maille tricotée et le jeté, puis hors de l'aiguille. Tu as toujours 2 mailles.",
  },
};

// ---- Dessins ----

// Losange et diamant de riz : 22 rangées de dessin, chacune tricotée sur 2 rangs (un endroit, un envers).
const LOSANGE = [
  "K6 P6", "P1 K5 P5 K1", "K1 P1 K4 P4 K1 P1", "P1 K1 P1 K3 P3 K1 P1 K1", "K1 P1 K1 P1 K2 P2 K1 P1 K1 P1",
  "P1 K1 P1 K1 P1 K1 P1 K1 P1 K1 P1 K1", "K1 P1 K1 P1 K1 P1 K1 P1 K1 P1 K1 P1", "P1 K1 P1 K1 P2 K2 P1 K1 P1 K1",
  "K1 P1 K1 P3 K3 P1 K1 P1", "P1 K1 P4 K4 P1 K1", "K1 P5 K5 P1", "P6 K6", "P5 K1 P1 K5", "P4 K1 P1 K1 P1 K4",
  "P3 K1 P1 K1 P1 K1 P1 K3", "P2 K1 P1 K1 P1 K1 P1 K1 P1 K2", "P1 K1 P1 K1 P1 K1 P1 K1 P1 K1 P1 K1",
  "K1 P1 K1 P1 K1 P1 K1 P1 K1 P1 K1 P1", "K2 P1 K1 P1 K1 P1 K1 P1 K1 P2", "K3 P1 K1 P1 K1 P1 K1 P3",
  "K4 P1 K1 P1 K1 P4", "K5 P1 K1 P5",
];

// Zig-zag en côtes : 3 mailles endroit, 3 mailles envers, décalées d'une maille à chaque rang, puis en sens inverse.
const ZIGZAG_DECALAGES = [0, 1, 2, 3, 4, 5, 0, 5, 4, 3, 2, 1];

// Chevrons ombrés : rangs 1 à 8, puis les rangs 9 à 16 reprennent les mêmes consignes deux par deux, inversées.
const OMBRES = [
  E(kp("P7 K1"), { debut: ["end"] }),
  V(kp("K7 P1"), { debut: ["env"] }),
  E(kp("P5 K3"), { debut: kp("K2"), fin: kp("P5 K2") }),
  V(kp("K5 P3"), { debut: kp("P2"), fin: kp("K5 P2") }),
  E(kp("P3 K5"), { debut: kp("K3"), fin: kp("P3 K3") }),
  V(kp("K3 P5"), { debut: kp("P3"), fin: kp("K3 P3") }),
  E(kp("P1 K7"), { debut: kp("K4"), fin: kp("P1 K4") }),
  V(kp("K1 P7"), { debut: kp("P4"), fin: kp("K1 P4") }),
];
const changerCote = (r) => ({ ...r, cote: r.cote === "E" ? "V" : "E" });

// Côtes brisées : rang A et rang B.
const BRISE_A = (cote) => (cote === "E" ? E : V)(kp("P1 K3"), { debut: kp("K3") });
const BRISE_B = (cote) => (cote === "E" ? E : V)(kp("P1 K3"), { debut: kp("K1"), fin: kp("P1 K1") });
const ORDRE_BRISE = "ABABABBABABA";

// Parallélogrammes de riz.
const RIZ5 = kp("P1 K1 P1 K1 P1");

export const POINTS_LOT = [
  {
    id: "losange-diamant-riz",
    nom: "Losange et diamant de riz",
    article: "le",
    synonymes: ["losange de riz", "diamant de riz", "losanges"],
    famille: "textures",
    rangs: LOSANGE.flatMap((ligne) => [E(kp(ligne)), V(kp(ligne))]),
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: possible("Le motif de 44 rangs est grand pour un bonnet : on n'en verra qu'une partie."), couverture: ok },
    zones: { bordure: deconseille("Le motif fait 44 rangs : il ne se voit pas sur une bordure.") },
    resume: "Des losanges en jersey et des diamants en point de riz qui s'emboîtent, sur 44 rangs : beau des deux côtés.",
    source: TRICONAUTES + "point-reversible-echarpe/",
  },
  {
    id: "zigzag-cotes",
    nom: "Zig-zag en côtes",
    article: "le",
    synonymes: ["point zig-zag", "côtes en zigzag", "zigzag"],
    famille: "cotes",
    rangs: ZIGZAG_DECALAGES.map((s, i) => depuisDessin(i % 2 === 0 ? "E" : "V", decaler("KKKPPP", s))),
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Les côtes en zigzag tiennent bien, mais le motif se voit peu sur quelques rangs.") },
    resume: "Des côtes 3/3 qui se décalent d'une maille à chaque rang, puis reviennent : un zigzag en relief, réversible.",
    source: TRICONAUTES + "point-reversible-echarpe/",
  },
  {
    id: "chevrons-ombres",
    nom: "Chevrons ombrés",
    article: "les",
    synonymes: ["chevrons en relief", "point de chevrons ombrés"],
    famille: "textures",
    rangs: [...OMBRES, ...[1, 0, 3, 2, 5, 4, 7, 6].map((i) => changerCote(OMBRES[i]))],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Les chevrons demandent 16 rangs pour se voir en entier.") },
    resume: "Des chevrons en mailles endroit sur fond envers, puis l'inverse : des V qui s'emboîtent comme des ombres.",
    source: TRICONAUTES + "point-chevron/",
  },
  {
    id: "oeillets-chevrons",
    nom: "Œillets en chevrons",
    article: "les",
    synonymes: ["chevrons ajourés", "œillets en V"],
    famille: "ajoures",
    rangs: [
      E(["end", "end", "end", "end", "jete", "ssk", "end", "end", "end"]),
      V(["env"]),
      E(["end", "end", "2ens", "jete", "end", "jete", "ssk", "end", "end"]),
      V(["env"]),
      E(["end", "2ens", "jete", "end", "end", "end", "jete", "ssk", "end"]),
      V(["env"]),
      E(["2ens", "jete", "end", "end", "end", "end", "end", "jete", "ssk"]),
      V(["env"]),
    ],
    densite: { mailles: 1, rangs: 1 },
    consommation: 0.95,
    blocage: true,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok, bonnet: ok, couverture: possible("Léger et ajouré : plutôt une couverture d'été."),
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume: "Des petits trous qui dessinent des V sur un fond de jersey : une dentelle facile, sur 8 rangs.",
    source: TRICONAUTES + "point-chevron/",
  },
  {
    id: "point-croise",
    nom: "Point croisé",
    article: "le",
    synonymes: ["maille croisée"],
    famille: "textures",
    rangs: [E(["croise_e"]), V(["env"])],
    densite: { mailles: 1.15, rangs: 1.05 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: deconseille("Peu souple : l'écharpe serait raide autour du cou."),
      snood: deconseille("Peu souple : le snood serait raide autour du cou."),
      bonnet: ok,
      couverture: possible("Peu souple : à garder pour des bandes décoratives."),
    },
    zones: { bordure: possible("Joli en petite touche, mais il roule un peu.") },
    resume: "Une maille glissée passée par-dessus une maille et un jeté : des petits croisements serrés, sur 2 rangs.",
    source: TRICONAUTES + "nouveaux-points-tricot/",
  },
  {
    id: "motif-de-maille",
    nom: "Point motif de maille",
    article: "le",
    synonymes: ["point noué"],
    famille: "ajoures",
    rangs: [E(["jete", "ssk"], { debut: ["end"], fin: ["end"] }), V(["jete", "ssk"], { debut: ["end"], fin: ["end"] })],
    densite: { mailles: 1, rangs: 1.05 },
    consommation: 1,
    proprietes: { reversible: true, roule: false, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: possible("Un peu ajouré pour tenir chaud."), couverture: ok },
    zones: { bordure: possible() },
    resume: "Un jeté puis un surjet simple, à chaque rang : un tissu aéré à l'effet noué.",
    source: TRICONAUTES + "point-fantaisie-2-rangs/",
  },
  {
    id: "triangles-jersey",
    nom: "Triangles de jersey",
    article: "les",
    synonymes: ["point de triangles"],
    famille: "textures",
    rangs: [E(["end"]), V(kp("K1 P4")), E(kp("K3 P2")), V(kp("K3 P2")), E(kp("K1 P4")), V(["end"])],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Il roule un peu : une bordure au point mousse est plus sûre.") },
    resume: "Des petits triangles de jersey alignés, séparés par des rangs de mailles envers, sur 6 rangs.",
    source: TRICONAUTES + "joli-point-echarpe/",
  },
  {
    id: "cotes-brisees",
    nom: "Côtes brisées",
    article: "les",
    synonymes: ["côtes cassées"],
    famille: "cotes",
    rangs: [...ORDRE_BRISE].map((t, i) => (t === "A" ? BRISE_A : BRISE_B)(i % 2 === 0 ? "E" : "V")),
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Des côtes fines qui se cassent tous les 6 rangs : une texture très facile, belle des deux côtés.",
    source: TRICONAUTES + "joli-point-echarpe/",
  },
  {
    id: "astrakan",
    nom: "Point d'astrakan",
    article: "le",
    synonymes: ["point de grappe", "point de ronce", "point de framboise", "point de la trinité", "point de mûre", "mûres"],
    famille: "textures",
    rangs: [
      E(["env"]),
      V(["1en3", "3ensEnv"], { debut: ["end"], fin: ["end"] }),
      E(["env"]),
      V(["3ensEnv", "1en3"], { debut: ["end"], fin: ["end"] }),
    ],
    rond: {
      mode: "manuel",
      // Même tissu qu'à plat : les boules alternent de place d'un tour à boules à l'autre.
      rangs: [E(["env"]), E(["3ens", "1en3Env_e"]), E(["env"]), E(["1en3Env_e", "3ens"])],
    },
    densite: { mailles: 1.15, rangs: 1 },
    consommation: 1.45,
    proprietes: { reversible: false, roule: false, elasticite: 1, chaleur: 3, niveau: 3 },
    ouvrages: {
      echarpe: ok, snood: ok, bonnet: ok,
      couverture: possible("Très gourmand en laine : une couverture demandera beaucoup de pelotes."),
    },
    zones: { bordure: possible("Épais et en relief : la bordure sera plus épaisse que le corps.") },
    resume: "Des petites boules serrées, faites sur l'envers : un tricot épais et chaud, très en relief.",
    source: TRICONAUTES + "point-astrakan/",
  },
  {
    id: "claie",
    nom: "Point de claie",
    article: "le",
    synonymes: ["point de haie", "hurdle stitch"],
    famille: "textures",
    rangs: [E(["end"]), V(["end"]), E(["end", "env"]), V(["end", "env"])],
    densite: { mailles: 1.05, rangs: 1.3 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 3, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Deux rangs de point mousse, deux rangs de côtes 1/1 : un tissu épais qui reste bien à plat.",
    source: TRICONAUTES + "point-de-claie-au-tricot-comment-le-tricoter/",
  },
  {
    id: "godron",
    nom: "Point de godron",
    article: "le",
    synonymes: ["godron", "côtes horizontales"],
    famille: "textures",
    rangs: [E(["end"]), V(["env"]), E(["end"]), V(["end"]), E(["env"]), V(["end"])],
    densite: { mailles: 1, rangs: 1.35 },
    consommation: 1.25,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 3, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: possible("Gourmand en laine pour une grande surface.") },
    zones: { bordure: ok },
    resume: "Trois rangs de jersey, trois rangs d'envers : des bourrelets horizontaux, élastiques et chauds.",
    source: TRICONAUTES + "point-godron/",
  },
  {
    id: "claie-quadrillage",
    nom: "Point de claie quadrillé",
    article: "le",
    synonymes: ["claie quadrillage", "quadrillage"],
    famille: "textures",
    rangs: [E(["end", "env"], { fin: ["end"] }), V(["env", "end"], { fin: ["env"] }), E(["end"]), V(["end"])],
    densite: { mailles: 1.05, rangs: 1.3 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Deux rangs de côtes 1/1, deux rangs de point mousse : un petit quadrillage très facile, proche du point de sable.",
    source: TRICONAUTES + "point-fantaisie-tricot-comment-tricoter-des-points-originaux/",
  },
  {
    id: "perle-contrarie",
    nom: "Point perlé contrarié",
    article: "le",
    synonymes: ["perlé contrarié"],
    famille: "textures",
    rangs: [E(["end"]), V(["end", "env"], { debut: ["env"] }), E(["end"]), V(["env", "end"], { debut: ["end"] })],
    densite: { mailles: 1, rangs: 1.1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Il roule un peu : une bordure au point mousse est plus sûre.") },
    resume: "Du jersey parsemé de petites perles qui se décalent : souple, une jolie alternative au jersey.",
    source: TRICONAUTES + "point-fantaisie-tricot-comment-tricoter-des-points-originaux/",
  },
  {
    id: "parallelogrammes-riz",
    nom: "Parallélogrammes de riz",
    article: "les",
    synonymes: ["riz en parallélogrammes"],
    famille: "textures",
    rangs: [
      E([...kp("K5"), ...RIZ5]),
      V([...kp("P5"), ...kp("K1 P1 K1 P1 K1")], { debut: kp("P1 K1 P1 K1 P1 K1"), fin: kp("P4") }),
      E([...RIZ5, ...kp("K5")], { debut: kp("K3"), fin: kp("P1 K1 P1 K1 P1 K2") }),
      V([...kp("K1 P1 K1 P1 K1"), ...kp("P5")], { debut: kp("P3"), fin: kp("K1 P1 K1 P1 K1 P2") }),
      E([...kp("K5"), ...RIZ5], { debut: kp("K1 P1 K1 P1 K1 P1"), fin: kp("K4") }),
      V(["env"]),
    ],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 1, chaleur: 2, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible() },
    resume: "Des blocs de point de riz et de jersey qui glissent en biais : des parallélogrammes, sur 6 rangs.",
    source: TRICONAUTES + "point-de-riz-le-guide-ultime-pour-le-reussir-a-tous-les-coups/",
  },
  {
    id: "torsade-arches",
    nom: "Torsade d'arches",
    article: "la",
    synonymes: ["torsade colonnes et twists", "torsade ajourée"],
    famille: "torsades",
    rangs: [
      E([...kp("P2"), "T2/2G_d", ...kp("K8")], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
      E([...kp("P2"), "ssk", "jete", "T2/2G_d", ...kp("K6")], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
      E([...kp("P2 K2"), "ssk", "jete", "T2/2G_d", ...kp("K4")], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
      E([...kp("P2 K4"), "ssk", "jete", "T2/2G_d", ...kp("K2")], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
      E([...kp("P2 K6"), "ssk", "jete", "T2/2G_d"], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
      E([...kp("P2 K8"), "ssk", "jete", ...kp("K2")], { fin: kp("P2") }),
      V([...kp("K2"), ...kp("P12")], { fin: kp("K2") }),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 1, chaleur: 2, niveau: 3 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: possible("Le motif est large : il en tient peu sur un bonnet."), couverture: ok },
    zones: { bordure: possible("Belle en bande décorative, un peu large pour une bordure.") },
    resume: "Une torsade qui monte en biais, soulignée d'une ligne de petits trous : des arches ajourées, sur 12 rangs.",
    source: TRICONAUTES + "point-torsade-tricot-differents-points-originaux/",
  },
];
