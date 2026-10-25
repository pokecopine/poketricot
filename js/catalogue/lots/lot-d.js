// Catalogue — lot D (deuxième fournée). Voir js/catalogue/points.js pour le format d'un point.
// Seuls les noms et la structure des points sont repris des Triconautes ; les textes sont rédigés pour l'outil.
//
// NON CODÉS :
// - Torsade d'arches : l'article ne donne pas le rang 5, et l'inventaire cite un jeté et un surjet
//   qu'on ne retrouve nulle part dans la recette publiée. Recette incomplète, pas de devinette.
// - Torsades réversibles (sur côtes, mousse ou blé) : l'article décrit le principe, sans aucun rang.
// - Petit rayon de miel torsadé (nouveaux-points-tricot) : l'article n'a pas pu être ouvert ; impossible
//   de dire s'il s'agit du même point que les mini rayons de miel torsadés, donc ni point ni synonyme.
//
// Notation des torsades : RC (right cross) = aiguille auxiliaire derrière, croisement vers la droite ;
// LC (left cross) = aiguille auxiliaire devant, croisement vers la gauche. « 2/2 » = 2 mailles croisées
// par-dessus 2 autres. Dans les mini rayons de miel, la taille n'est pas écrite : 4 croisements sur
// un panneau de 8 mailles, ce sont donc des croisements 1/1.
import { TRICONAUTES, E, V, fois, repeter, ok, possible, deconseille } from "../aides.js";

const GUIDE_TORSADES = TRICONAUTES + "torsade-tricot-guide-ultime-tout-savoir/";
const FANTAISIE = TRICONAUTES + "point-fantaisie-tricot-comment-tricoter-des-points-originaux/";
const COTES = TRICONAUTES + "tricoter-des-cotes-comment-les-faire-et-les-reussir/";

/** Gestes nouveaux apportés par ce lot (même format que js/catalogue/gestes.js). */
// Aspects : la première maille produite est la plus à droite vue de l'endroit.
// Aiguille derrière : les mailles tricotées d'abord passent à droite, par-dessus (brinD+), les mailles
// en attente partent à gauche, dessous (brinG-). Aiguille devant : l'inverse (brinD-, puis brinG+).
export const GESTES_LOT = {
  "T1/1D_d": { nom: "torsade de 2 mailles croisée à droite", pluriel: "torsades de 2 mailles croisées à droite", abrege: "tors. 1/1 d.", consomme: 2, produit: 2,
    endroit: ["brinD+", "brinG-"], envers: null, vuDeLAutreCote: null },
  "T1/1G_d": { nom: "torsade de 2 mailles croisée à gauche", pluriel: "torsades de 2 mailles croisées à gauche", abrege: "tors. 1/1 g.", consomme: 2, produit: 2,
    endroit: ["brinD-", "brinG+"], envers: null, vuDeLAutreCote: null },
  "T2/2D_d": { nom: "torsade de 4 mailles croisée à droite", pluriel: "torsades de 4 mailles croisées à droite", abrege: "tors. 2/2 d.", consomme: 4, produit: 4,
    endroit: ["brinD+", "brinD+", "brinG-", "brinG-"], envers: null, vuDeLAutreCote: null },
  "T2/2G_d": { nom: "torsade de 4 mailles croisée à gauche", pluriel: "torsades de 4 mailles croisées à gauche", abrege: "tors. 2/2 g.", consomme: 4, produit: 4,
    endroit: ["brinD-", "brinD-", "brinG+", "brinG+"], envers: null, vuDeLAutreCote: null },
  "T4/4G_d": { nom: "torsade de 8 mailles croisée à gauche", pluriel: "torsades de 8 mailles croisées à gauche", abrege: "tors. 4/4 g.", consomme: 8, produit: 8,
    endroit: [...fois("brinD-", 4), ...fois("brinG+", 4)], envers: null, vuDeLAutreCote: null },
  "T6/6G_d": { nom: "torsade de 12 mailles croisée à gauche", pluriel: "torsades de 12 mailles croisées à gauche", abrege: "tors. 6/6 g.", consomme: 12, produit: 12,
    endroit: [...fois("brinD-", 6), ...fois("brinG+", 6)], envers: null, vuDeLAutreCote: null },
  // Prévue pour un rang envers, aiguille devant (côté envers), mailles tricotées à l'envers.
  // Vue de l'endroit, c'est une torsade 3/3 croisée à gauche : les 3 mailles tricotées d'abord
  // arrivent à gauche, par-dessus (brinG+), les 3 en attente partent à droite, dessous (brinD-).
  // Faite sur un rang endroit, on ne verrait que des mailles envers. Son équivalent sur l'endroit est
  // T3/3G, qui ne renvoie pas vers elle : la double torsade a donc sa version en rond écrite à la main.
  "T3/3Venv_d": { nom: "torsade de 6 mailles à l'envers, aiguille devant", pluriel: "torsades de 6 mailles à l'envers, aiguille devant", abrege: "tors. 3/3 env. dev.", consomme: 6, produit: 6,
    endroit: fois("grain", 6), envers: [...fois("brinG+", 3), ...fois("brinD-", 3)], vuDeLAutreCote: null },
};

/** Explications des gestes nouveaux (même format que js/catalogue/techniques.js). */
export const TECHNIQUES_LOT = {
  "T1/1D_d": {
    titre: "Torsade de 2 mailles croisée à droite",
    explication:
      "Glisse 1 maille sur l'aiguille auxiliaire et laisse-la derrière le travail. Tricote la maille suivante à l'endroit, puis la maille de l'aiguille auxiliaire à l'endroit. La maille du dessus penche vers la droite.",
  },
  "T1/1G_d": {
    titre: "Torsade de 2 mailles croisée à gauche",
    explication:
      "Glisse 1 maille sur l'aiguille auxiliaire et laisse-la devant le travail. Tricote la maille suivante à l'endroit, puis la maille de l'aiguille auxiliaire à l'endroit. La maille du dessus penche vers la gauche.",
  },
  "T2/2D_d": {
    titre: "Torsade de 4 mailles croisée à droite",
    explication:
      "Glisse 2 mailles sur l'aiguille auxiliaire et laisse-la derrière le travail. Tricote les 2 mailles suivantes à l'endroit, puis les 2 de l'aiguille auxiliaire à l'endroit. Les mailles se croisent vers la droite.",
  },
  "T2/2G_d": {
    titre: "Torsade de 4 mailles croisée à gauche",
    explication:
      "Glisse 2 mailles sur l'aiguille auxiliaire et laisse-la devant le travail. Tricote les 2 mailles suivantes à l'endroit, puis les 2 de l'aiguille auxiliaire à l'endroit. Les mailles se croisent vers la gauche.",
  },
  "T4/4G_d": {
    titre: "Torsade de 8 mailles croisée à gauche",
    explication:
      "Glisse 4 mailles sur l'aiguille auxiliaire et laisse-la devant le travail. Tricote les 4 mailles suivantes à l'endroit, puis les 4 de l'aiguille auxiliaire à l'endroit. Les mailles se croisent vers la gauche.",
  },
  "T6/6G_d": {
    titre: "Torsade de 12 mailles croisée à gauche",
    explication:
      "Glisse 6 mailles sur l'aiguille auxiliaire et laisse-la devant le travail. Tricote les 6 mailles suivantes à l'endroit, puis les 6 de l'aiguille auxiliaire à l'endroit. C'est une grosse torsade : tire bien le fil sur les premières mailles.",
  },
  "T3/3Venv_d": {
    titre: "Torsade de 6 mailles à l'envers, aiguille devant",
    explication:
      "Sur ce rang envers, glisse 3 mailles sur l'aiguille auxiliaire et laisse-la devant le travail, c'est-à-dire de ton côté. Tricote les 3 mailles suivantes à l'envers, puis les 3 de l'aiguille auxiliaire à l'envers. Sur l'endroit, le croisement penche vers la gauche.",
  },
};

/** Points de ce lot. */
export const POINTS_LOT = [
  // ---------------- Torsades ----------------
  {
    id: "torsade-droite",
    nom: "Torsade croisée à droite",
    article: "la",
    synonymes: ["torsade 3/3 droite"],
    famille: "torsades",
    // Le pendant de la torsade croisée à gauche : même recette, aiguille auxiliaire derrière.
    rangs: [
      E(["env", "env", "env", ...fois("end", 6)], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
      E(["env", "env", "env", ...fois("end", 6)], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
      E(["env", "env", "env", "T3/3D"], { fin: fois("env", 3) }),
      V(["end", "end", "end", ...fois("env", 6)], { fin: fois("end", 3) }),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit : les torsades ne se voient que d'un côté."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli en bande décorative, mais il resserre le tricot.") },
    resume: "Des colonnes de 6 mailles qui se croisent vers la droite tous les 6 rangs, sur un fond de jersey envers.",
    source: TRICONAUTES + "point-torsade-tricot-differents-points-originaux/",
  },
  {
    id: "torsade-fuchsia",
    nom: "Torsade fuchsia",
    article: "la",
    synonymes: ["torsade florale", "torsade fuschia"],
    famille: "torsades",
    rangs: [
      E(["end", "end", ...fois("env", 4), "end", "end"], { debut: ["end"], fin: ["end"] }),
      V(["env", "env", ...fois("end", 4), "env", "env"], { debut: ["env"], fin: ["env"] }),
      E(["end", "end", ...fois("env", 4), "end", "end"], { debut: ["end"], fin: ["end"] }),
      V(["env", "env", ...fois("end", 4), "env", "env"], { debut: ["env"], fin: ["env"] }),
      E(["end", "end", ...fois("env", 4), "end", "end"], { debut: ["end"], fin: ["end"] }),
      V(["env", "env", ...fois("end", 4), "env", "env"], { debut: ["env"], fin: ["env"] }),
      E(["end"]),
      V(["env"]),
      E(["T2/2D_d", "T2/2G_d"], { debut: ["end"], fin: ["end"] }),
      V(["env", "env", ...fois("end", 4), "env", "env"], { debut: ["env"], fin: ["env"] }),
    ],
    densite: { mailles: 1.15, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli en bande décorative, mais le motif est haut (10 rangs).") },
    resume: "Des petites fleurs en relief : deux torsades de 4 mailles qui s'ouvrent l'une à droite, l'autre à gauche, tous les 10 rangs.",
    source: GUIDE_TORSADES,
  },
  {
    id: "double-torsade",
    nom: "Double torsade",
    article: "la",
    synonymes: ["grosse torsade double"],
    famille: "torsades",
    rangs: [
      E([...fois("env", 5), ...fois("end", 12)], { fin: fois("env", 5) }),
      V([...fois("env", 12), ...fois("end", 5)], { debut: fois("end", 5) }),
      E([...fois("env", 5), ...fois("end", 12)], { fin: fois("env", 5) }),
      V([...fois("env", 12), ...fois("end", 5)], { debut: fois("end", 5) }),
      E([...fois("env", 5), "T6/6G_d"], { fin: fois("env", 5) }),
      V([...fois("env", 12), ...fois("end", 5)], { debut: fois("end", 5) }),
      E([...fois("env", 5), ...fois("end", 12)], { fin: fois("env", 5) }),
      V([...fois("env", 12), ...fois("end", 5)], { debut: fois("end", 5) }),
      E([...fois("env", 5), ...fois("end", 12)], { fin: fois("env", 5) }),
      // Rang 10, sur l'envers : la petite torsade du centre se fait en tricotant à l'envers.
      V([...fois("env", 3), "T3/3Venv_d", ...fois("env", 3), ...fois("end", 5)], { debut: fois("end", 5) }),
    ],
    // En rond, tout se fait sur l'endroit : la petite torsade du tour 10 devient une torsade 3/3 croisée à gauche.
    rond: {
      mode: "manuel",
      rangs: [
        ...repeter([E([...fois("env", 5), ...fois("end", 12)])], 4),
        E([...fois("env", 5), "T6/6G_d"]),
        ...repeter([E([...fois("env", 5), ...fois("end", 12)])], 4),
        E([...fois("env", 5), ...fois("end", 3), "T3/3G", ...fois("end", 3)]),
      ],
    },
    densite: { mailles: 1.3, rangs: 1 },
    consommation: 1.25,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 3, niveau: 3 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit, et le motif est large : prévois une écharpe assez large."),
      snood: ok,
      bonnet: possible("Le motif fait 17 mailles de large : il faut un bonnet assez grand pour le placer."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Un motif large et épais : il resserre trop pour une bordure.") },
    resume: "Une large torsade de 12 mailles croisée tous les 10 rangs, avec une seconde petite torsade en son centre, croisée sur l'envers.",
    source: GUIDE_TORSADES,
  },
  {
    id: "torsade-tresses",
    nom: "Torsade à tresses",
    article: "la",
    synonymes: [],
    famille: "torsades",
    rangs: [
      E(["env", "env", "env", ...fois("end", 6), "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", ...fois("end", 6), "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", "end", "end", "T2/2D_d", "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", "T2/2G_d", "end", "end", "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", "end", "end", "T2/2D_d", "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", "T2/2G_d", "end", "end", "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", ...fois("end", 6), "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
      E(["env", "env", "env", ...fois("end", 6), "env", "env", "env"]),
      V(["end", "end", "end", ...fois("env", 6), "end", "end", "end"]),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 3 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli en bande décorative, mais le motif est haut (16 rangs).") },
    resume: "Une tresse à trois brins de 6 mailles, nattée sur 8 rangs puis laissée droite sur 8 rangs, sur un fond de jersey envers.",
    source: GUIDE_TORSADES,
  },
  {
    id: "torsade-nattee",
    nom: "Torsade nattée",
    article: "la",
    synonymes: ["torsade à 3 brins", "natte"],
    famille: "torsades",
    rangs: [
      E([...fois("end", 6), "env", "env", "env"], { debut: fois("env", 3) }),
      V([...fois("env", 6), "end", "end", "end"], { debut: fois("end", 3) }),
      E(["T2/2D_d", "end", "end", "env", "env", "env"], { debut: fois("env", 3) }),
      V([...fois("env", 6), "end", "end", "end"], { debut: fois("end", 3) }),
      E(["end", "end", "T2/2G_d", "env", "env", "env"], { debut: fois("env", 3) }),
      V([...fois("env", 6), "end", "end", "end"], { debut: fois("end", 3) }),
    ],
    densite: { mailles: 1.25, rangs: 1 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli en bande décorative, mais il resserre le tricot.") },
    resume: "Une vraie natte à trois brins : on croise à droite, puis à gauche, un rang endroit sur deux, sur un fond de jersey envers.",
    source: GUIDE_TORSADES,
  },
  {
    id: "torsade-grille-diamant",
    nom: "Torsade grille de diamant",
    article: "la",
    synonymes: ["grille de diamant"],
    famille: "torsades",
    rangs: [
      E(["T1/1G_d", "T1/1D_d", ...fois("end", 4)], { debut: ["end"], fin: ["T1/1G_d", "T1/1D_d", "end"] }),
      V(["env"]),
      E(["T1/1D_d", "T1/1G_d", ...fois("end", 4)], { debut: ["end"], fin: ["T1/1D_d", "T1/1G_d", "end"] }),
      V(["env"]),
      E([...fois("end", 4), "T1/1G_d", "T1/1D_d"], { debut: ["end"], fin: fois("end", 5) }),
      V(["env"]),
      E([...fois("end", 4), "T1/1D_d", "T1/1G_d"], { debut: ["end"], fin: fois("end", 5) }),
      V(["env"]),
    ],
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("Sur un fond de jersey, il roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Le fond est en jersey : une bordure s'enroulerait.") },
    resume: "De petits losanges en relief, faits de croisements de 2 mailles, en quinconce sur un fond de jersey.",
    source: GUIDE_TORSADES,
  },
  {
    id: "torsade-mousse-jersey",
    nom: "Torsade mixte mousse et jersey",
    article: "la",
    synonymes: ["torsade mousse et jersey"],
    famille: "torsades",
    // La moitié de la torsade est au point mousse, l'autre en jersey ; elles changent de côté à chaque croisement.
    rangs: [
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
      E([...fois("env", 4), "T4/4G_d", ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 4), ...fois("env", 4), ...fois("end", 8)]),
      E([...fois("env", 4), "T4/4G_d", ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
      E([...fois("env", 4), ...fois("end", 8), ...fois("env", 4)]),
      V([...fois("end", 8), ...fois("env", 4), ...fois("end", 4)]),
    ],
    densite: { mailles: 1.2, rangs: 1.1 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 3 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: deconseille("Le motif est très haut (24 rangs) : il ne se lit pas dans une bordure.") },
    resume: "Une torsade de 8 mailles dont une moitié est au point mousse et l'autre en jersey : les deux textures changent de côté à chaque croisement.",
    source: GUIDE_TORSADES,
  },
  {
    id: "torsade-xoxo",
    nom: "Torsade XOXO",
    article: "la",
    synonymes: ["xoxo", "torsade bisous câlins"],
    famille: "torsades",
    // L'article donne un panneau de 26 mailles (1 + 6 torsades + 1) ; la répétition de 16 en est tirée.
    rangs: [
      E(["end"], { debut: ["end"], fin: fois("end", 9) }),
      V(["env"]),
      E(["T2/2D_d", "T2/2G_d", "T2/2G_d", "T2/2D_d"], { debut: ["end"], fin: ["T2/2D_d", "T2/2G_d", "end"] }),
      V(["env"]),
      E(["end"]),
      V(["env"]),
      E(["T2/2G_d", "T2/2D_d", "T2/2D_d", "T2/2G_d"], { debut: ["end"], fin: ["T2/2G_d", "T2/2D_d", "end"] }),
      V(["env"]),
    ],
    densite: { mailles: 1.3, rangs: 1 },
    consommation: 1.25,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 3, niveau: 3 },
    ouvrages: {
      echarpe: possible("Sur un fond de jersey, il roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords et resserre beaucoup : prévois une bordure et beaucoup de mailles."),
    },
    zones: { bordure: deconseille("Il roule : en bord d'ouvrage, il s'enroule. Au milieu, en bande décorative autour d'un bonnet, il est très joli.") },
    resume: "Des torsades de 4 mailles qui dessinent une rangée de X et de O, sur un fond de jersey.",
    source: FANTAISIE,
  },
  {
    id: "mini-rayons-miel-torsades",
    nom: "Mini rayons de miel torsadés",
    article: "les",
    synonymes: ["mini nid d'abeille torsadé", "torsade mini rayons de miel"],
    famille: "torsades",
    rangs: [
      E(repeter(["T1/1D_d", "T1/1G_d"], 2)),
      V(["env"]),
      E(repeter(["T1/1G_d", "T1/1D_d"], 2)),
      V(["env"]),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("Sur un fond de jersey, il roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords et chaque rang endroit est fait de croisements : long à tricoter en grand."),
    },
    zones: { bordure: deconseille("Il roule : une bordure s'enroulerait.") },
    resume: "Un petit nid d'abeille en relief, fait uniquement de croisements de 2 mailles, un rang endroit sur deux.",
    source: FANTAISIE,
  },

  // ---------------- Côtes ----------------
  {
    id: "cotes-3-3",
    nom: "Côtes 3/3",
    article: "les",
    synonymes: ["côtes 3-3", "côtes triples"],
    famille: "cotes",
    rangs: [E(["end", "end", "end", "env", "env", "env"]), V(["end", "end", "end", "env", "env", "env"])],
    densite: { mailles: 1.25, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    resume: "Trois mailles endroit, trois mailles envers : des côtes larges, élastiques et pareilles des deux côtés.",
    source: COTES,
  },
  {
    id: "cotes-twist",
    nom: "Côtes twist",
    article: "les",
    synonymes: ["côtes torses", "côtes twists"],
    famille: "cotes",
    rangs: [E(["endT", "envT"], { fin: ["endT"] }), V(["envT", "endT"], { fin: ["envT"] })],
    densite: { mailles: 1.35, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Toutes les mailles se tricotent par le brin arrière : long à tricoter en grand."),
    },
    zones: { bordure: ok },
    resume: "Des côtes 1/1 dont toutes les mailles sont tricotées par le brin arrière : des colonnes vrillées, nettes et fermes.",
    source: COTES,
  },
  {
    id: "cotes-glissees",
    nom: "Côtes glissées",
    article: "les",
    synonymes: ["côtes à maille glissée"],
    famille: "cotes",
    // L'article commence par un rang envers. Son rang endroit oublie la maille endroit qui suit
    // la maille glissée (6 mailles au lieu de 5) : le simulateur l'impose pour garder 3 mailles en relief.
    rangs: [
      V(["end", "end", "env", "env", "env"], { fin: ["end", "end"] }),
      E(["end", "gl", "end", "env", "env"], { debut: ["env", "env"] }),
    ],
    densite: { mailles: 1.2, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit : les côtes y sont plus plates."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    resume: "Des côtes de 3 mailles en relief dont la maille du milieu est glissée un rang sur deux : une colonne bien marquée.",
    source: COTES,
  },
  {
    id: "cotes-perlees",
    nom: "Côtes perlées",
    article: "les",
    synonymes: ["côtes mousseuses"],
    famille: "cotes",
    rangs: [
      E(["env", "env", "end", "env", "end"], { fin: ["env", "env"] }),
      V(["env", "env", "env", "end", "end"], { debut: ["end", "end"] }),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    avertissements: { laineFloue: "Avec une laine floue comme le mohair, les petites perles se voient peu." },
    resume: "Des côtes dont la colonne en relief porte une petite perle au centre, un rang sur deux : élastique et délicat.",
    source: TRICONAUTES + "cotes-perlees/",
  },
];
