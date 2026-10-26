// Catalogue — lot F (26/10/2026) : les 7 points du blog De Rerum Natura, catégorie « Tutoriel points tricot »,
// demandés par Deborah. Seuls les noms et la structure des points sont repris (articles lus le 26/10) ;
// les textes sont rédigés pour l'outil. Voir js/catalogue/points.js pour le format d'un point.
//
// Choix faits quand l'article laisse un doute :
//   - « SS » (surjet simple de l'article : glisser 1, tricoter 1, passer la glissée par-dessus) est codé avec le
//     surjet simple de l'outil (« ssk ») : même diminution penchée à gauche.
//   - Lisières : les articles ajoutent 2 mailles de lisière (jersey ou mousse) à leur échantillon ; l'outil pose ses
//     propres lisières, elles ne sont pas comptées ici. Pour « Jours en angle » et « Muguets », la maille de bord
//     écrite dans chaque rang (« lisière ») fait partie du motif : elle est gardée (maille endroit, ou envers sur l'envers).
//   - Pommes de pin : seuls les rangs 2 et 20 sont écrits sur l'envers ; les autres rangs pairs se tricotent aussi
//     à l'envers (fond de jersey). L'échantillon de l'article (34 mailles, 48 rangs) ne tombe pas juste sur 10 + 1
//     et 20 rangs : la recette, elle, tombe juste.
//   - Rayures granitées : le rang 6 est un rang envers où l'on tricote 2 mailles ensemble à l'endroit (l'article dit
//     « env » et « 2mens end ») : codé tel quel, cela fait la petite côte en relief côté endroit. Rang 7 : chaque maille
//     tricotée à l'endroit puis à l'envers (la variante « augmentation barrée » de l'article n'est pas proposée).
//     Les rangs 6 et 7 peuvent se faire dans une autre couleur selon l'article : l'outil ne change pas encore de
//     couleur pour 2 rangs seulement.
//   - Millepertuis : la maille glissée est glissée comme pour la tricoter à l'envers (« glissée env »), puis passée
//     par-dessus les 2 mailles endroit qui suivent ; le jeté du rang envers redonne la maille.
//   - Les flots : « AID » (augmentation intercalaire droite) est un geste nouveau ; le rang 3 est un rang endroit.
//
// Le millepertuis et les rayures granitées changent de nombre de mailles au milieu du motif : le moteur sait
// les compter depuis la version 0.7.0.

import { E, V, fois, ok, possible, deconseille } from "../aides.js";

const DERERUM = "https://blog.dererumnatura.fr/";

/** Gestes nouveaux apportés par ce lot. */
export const GESTES_LOT = {
  // Millepertuis : glisser 1 (comme à l'envers), 2 mailles endroit, passer la glissée par-dessus les 2.
  glPar2_f: {
    nom: "1 maille glissée passée par-dessus 2 mailles endroit",
    pluriel: null,
    abrege: "gl. 1, 2 end., pass.",
    consomme: 3,
    produit: 2,
    endroit: ["Vgauche", "V"],
    envers: null,
    vuDeLAutreCote: null,
  },
  // Rayures granitées : une maille tricotée à l'endroit puis à l'envers.
  endEnv_f: {
    nom: "1 maille tricotée à l'endroit puis à l'envers",
    pluriel: null,
    abrege: "1 m. end. et env.",
    consomme: 1,
    produit: 2,
    endroit: ["V", "grain"],
    envers: ["grain", "V"],
    vuDeLAutreCote: null,
  },
  // Les flots : augmentation intercalaire penchée à droite.
  augID_f: {
    nom: "augmentation intercalaire droite",
    pluriel: "augmentations intercalaires droites",
    abrege: "aug. int. d.",
    consomme: 0,
    produit: 1,
    endroit: ["Vdroite"],
    envers: null,
    vuDeLAutreCote: null,
  },
};

export const TECHNIQUES_LOT = {
  glPar2_f: {
    titre: "Glisser 1, 2 endroit, passer par-dessus",
    explication:
      "Fil derrière, glisse 1 maille sur l'aiguille droite en piquant comme pour la tricoter à l'envers. Tricote les 2 mailles suivantes à l'endroit. Avec la pointe de l'aiguille gauche, attrape la maille glissée et fais-la passer par-dessus ces 2 mailles, puis hors de l'aiguille. Il reste 2 mailles au lieu de 3 : le jeté du rang suivant redonnera la maille.",
  },
  endEnv_f: {
    titre: "1 maille tricotée à l'endroit puis à l'envers",
    explication:
      "Tricote la maille à l'endroit sans la lâcher de l'aiguille gauche. Ramène le fil devant, tricote la même maille à l'envers, puis laisse-la glisser de l'aiguille gauche et remets le fil derrière. Une maille en donne deux.",
  },
  augID_f: {
    titre: "Augmentation intercalaire droite",
    explication:
      "Entre la maille que tu viens de tricoter et la suivante, il y a un fil horizontal. Avec la pointe de l'aiguille gauche, soulève-le en piquant de l'arrière vers l'avant, puis tricote-le à l'endroit en piquant dans le brin de devant. La nouvelle maille penche vers la droite et ne laisse presque pas de trou.",
  },
};

// Écailles : le jeté avance d'une maille à chaque rang endroit, sur 6 rangs endroit.
const ECAILLES_ENDROIT = [0, 1, 2, 3, 4, 5].map((k) =>
  E(["jete", ...fois("end", k), "ssk", ...fois("end", 5 - k)], { debut: ["end", "end"], fin: ["jete", "2ens"] })
);

// Pommes de pin : rangs endroit à motif (3, 5, 13, 15) ; 7 et 9 comme 3 ; 17 et 19 comme 13.
const PIN_3 = E(["end", "end", "end", "end", "end", "2ens", "jete", "end", "jete", "ssk"], {
  debut: ["end", "end", "end", "2ens", "jete", "end", "jete", "ssk"],
  fin: ["end", "end", "end"],
});
const PIN_5 = E(["end", "end", "end", "2ens", "jete", "end", "end", "end", "jete", "ssk"], {
  debut: ["end", "end", "2ens", "jete", "end", "end", "end", "jete", "ssk"],
  fin: ["end", "end"],
});
const PIN_13 = E(["jete", "ssk", "end", "end", "end", "end", "end", "2ens", "jete", "end"], { debut: ["end"] });
const PIN_15 = E(["end", "end", "end", "jete", "ssk", "end", "end", "end", "2ens", "jete"], {
  debut: ["end", "end", "jete", "ssk", "end", "end", "end", "2ens", "jete"],
  fin: ["end", "end"],
});
const TOUT_ENDROIT = E(["end"]);
const TOUT_ENVERS = V(["env"]);
const PIN_ENDROIT = [TOUT_ENDROIT, PIN_3, PIN_5, PIN_3, PIN_3, TOUT_ENDROIT, PIN_13, PIN_15, PIN_13, PIN_13];

// Muguets : les fleurs de droite (rangs 1 à 9), puis celles de gauche (rangs 11 à 19).
const MUGUET = (motif) => E(motif, { debut: ["end"], fin: ["end", "end"] });
const MUGUET_A = MUGUET(["end", "end", "ssk", "2ens", "end", "end", "jete", "end", "jete"]);
const MUGUET_B = MUGUET(["end", "end", "jete", "end", "jete", "end", "end", "ssk", "2ens"]);

// Jours en angle : la maille de bord du motif, de chaque côté.
const ANGLE = (motif) => E(motif, { debut: ["end"], fin: ["end"] });

const entreEnvers = (rangsEndroit) => rangsEndroit.flatMap((r) => [r, TOUT_ENVERS]);

export const POINTS_LOT = [
  {
    id: "millepertuis",
    nom: "Point millepertuis",
    article: "le",
    synonymes: ["millepertuis"],
    famille: "textures",
    rangs: [
      E(["glPar2_f", "end", "end", "end"]),
      V(["env", "env", "env", "env", "jete", "env"]),
      E(["end", "end", "end", "glPar2_f"]),
      V(["env", "jete", "env", "env", "env", "env"]),
    ],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 3 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Fin et un peu ajouré : plutôt une couverture de bébé, avec une bordure."),
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume:
      "Des petites mailles enroulées et de minuscules jours sur fond de jersey, décalés tous les 2 rangs : un point délicat, idéal pour la layette. Le nombre de mailles baisse sur les rangs endroit et revient sur les rangs envers.",
    source: DERERUM + "point-de-tricot-millepertuis/",
  },
  {
    id: "jours-en-angle",
    nom: "Jours en angle",
    article: "les",
    synonymes: ["jours en V", "point de jours en angle"],
    famille: "ajoures",
    rangs: entreEnvers([
      ANGLE(["jete", "ssk", ...fois("end", 8)]),
      ANGLE(["end", "jete", "ssk", ...fois("end", 5), "2ens", "jete"]),
      ANGLE(["end", "end", "jete", "ssk", "end", "end", "end", "2ens", "jete", "end"]),
      ANGLE([...fois("end", 5), "jete", "ssk", "end", "end", "end"]),
      ANGLE(["end", "end", "end", "2ens", "jete", "end", "jete", "ssk", "end", "end"]),
      ANGLE(["end", "end", "2ens", "jete", "end", "end", "end", "jete", "ssk", "end"]),
    ]),
    densite: { mailles: 1, rangs: 1 },
    consommation: 0.95,
    blocage: true,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 3 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok,
      bonnet: possible("Ajouré : un bonnet léger, de mi-saison."),
      couverture: possible("Léger et ajouré : plutôt une couverture d'été."),
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume:
      "Des lignes de jours qui se rejoignent en pointe, sur fond de jersey, sur 12 rangs : un ajouré léger, en motif continu ou en panneau.",
    source: DERERUM + "point-de-tricot-jours-en-angle/",
  },
  {
    id: "ecailles",
    nom: "Écailles",
    article: "les",
    synonymes: ["point écailles", "écailles"],
    famille: "ajoures",
    rangs: entreEnvers(ECAILLES_ENDROIT),
    densite: { mailles: 1, rangs: 1 },
    consommation: 0.95,
    blocage: true,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: possible("En rond, le tricot a tendance à pencher (biais)."),
      bonnet: possible("En rond, le tricot a tendance à pencher (biais)."),
      couverture: possible("Sur une grande surface, le tricot a tendance à pencher (biais)."),
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume:
      "Des colonnes de jours qui glissent d'une maille à chaque rang endroit et dessinent des écailles en biais : beau dans une laine qui tombe bien (lin, soie), pour une étole ou une écharpe.",
    source: DERERUM + "point-de-tricot-les-ecailles/",
  },
  {
    id: "pommes-de-pin",
    nom: "Pommes de pin",
    article: "les",
    synonymes: ["point pommes de pin", "pomme de pin"],
    famille: "ajoures",
    rangs: entreEnvers(PIN_ENDROIT),
    densite: { mailles: 1, rangs: 1 },
    consommation: 0.95,
    blocage: true,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 3 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok,
      bonnet: possible("Le motif fait 20 rangs : il se voit peu sur un petit bonnet."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Il roule sur les bords et son motif fait 20 rangs.") },
    resume:
      "Des petites pommes de pin ajourées, en quinconce sur fond de jersey, sur 20 rangs : pour une étole, un gilet ou une couverture de bébé bordée de mousse.",
    source: DERERUM + "point-de-tricot-pommes-de-pin/",
  },
  {
    id: "muguets",
    nom: "Muguets",
    article: "les",
    synonymes: ["point muguet", "muguet"],
    famille: "ajoures",
    rangs: entreEnvers([...fois(MUGUET_A, 5), ...fois(MUGUET_B, 5)]),
    densite: { mailles: 1, rangs: 1 },
    consommation: 0.95,
    blocage: true,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: possible("Le bord ondulé, joli sur une écharpe, se perd sur un snood fermé."),
      bonnet: possible("Le motif fait 20 rangs : il se voit peu sur un petit bonnet."),
      couverture: possible("Léger et ajouré : plutôt une couverture d'été."),
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume:
      "Des clochettes ajourées qui penchent d'un côté puis de l'autre tous les 10 rangs, et des bords qui ondulent : pour une étole ou une écharpe.",
    source: DERERUM + "point-de-tricot-muguets/",
  },
  {
    id: "rayures-granitees",
    nom: "Rayures granitées",
    article: "les",
    synonymes: ["point granité", "rayures granité"],
    famille: "textures",
    rangs: [
      TOUT_ENDROIT, TOUT_ENVERS, TOUT_ENDROIT, TOUT_ENVERS, TOUT_ENDROIT,
      V(["2ens"]),
      E(["endEnv_f"]),
      TOUT_ENVERS,
    ],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: deconseille("Il roule sur les bords : il ne tient pas une bordure.") },
    resume:
      "Du jersey traversé tous les 8 rangs d'une fine rayure granitée, ajourée : un air de marinière. Le nombre de mailles est divisé par deux au rang 6 et revient au rang 7.",
    source: DERERUM + "point-de-tricot-rayures-granitees/",
  },
  {
    id: "flots",
    nom: "Flots",
    article: "les",
    synonymes: ["point les flots", "flots", "vagues en relief"],
    famille: "textures",
    rangs: [
      TOUT_ENDROIT,
      TOUT_ENVERS,
      E(["2ens", "2ens", "augID_f", "end", "augID_f", "end", "augID_f", "end", "augID_f", "2ens", "2ens"]),
      TOUT_ENVERS,
    ],
    densite: { mailles: 1, rangs: 1.05 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 3 },
    ouvrages: {
      echarpe: possible("Fond jersey : il faut des bordures et des bandes latérales qui ne roulent pas."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("En bas d'un ouvrage, quelques rangs font un joli bord à volants, mais il roule un peu.") },
    resume:
      "Des vagues en relief, sans jours : les augmentations et les diminutions groupées font onduler les rangs. En motif continu, en panneau ou en bord à volants.",
    source: DERERUM + "point-de-tricot-les-flots/",
  },
];
