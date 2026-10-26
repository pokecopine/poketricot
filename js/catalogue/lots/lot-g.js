// Catalogue — lot G (26/10/2026) : le point d'étoile (blog trust the mojo, demandé par Deborah le 25/10) et
// 4 points des Triconautes mis de côté parce que leur nombre de mailles change au milieu du motif.
// Seuls les noms et la structure des points sont repris (articles relus le 26/10) ; les textes sont rédigés pour
// l'outil. Voir js/catalogue/points.js pour le format d'un point.
//
// Choix faits quand l'article laisse un doute :
//   - Côtés : aucun de ces articles ne dit quel rang est sur l'endroit ; le rang 1 est pris sur l'endroit
//     (convention de l'outil et des articles), puis les rangs alternent.
//   - Point d'étoile : rangs 1 et 3 à l'endroit, rangs 2 et 4 avec l'étoile sur l'envers ; le rang 4 commence par
//     3 mailles envers et finit par 2 (décalage de 2 mailles), ce qui tombe juste sur 4n + 1. Pas encore de version
//     en rond : le décalage du rang 4 tomberait à cheval sur le début du tour.
//   - Variation du point de riz : les astérisques des rangs 2 et 4 sont mal placés dans l'article ; lus comme
//     « 2 ens. end., *2 ens. env., 2 ens. end.* » (rang 2) et « 2 ens. env., *2 ens. end., 2 ens. env.* » (rang 4),
//     seule lecture qui ramène au nombre de départ (impair).
//   - Côtes de couverture : la première diminution du rang 2 (« 2 mailles ensemble ») est faite à l'endroit, pour
//     alterner avec la suite (*2 ens. env., 2 ens. end.*).
//   - Lignes pointillées : « (1 m. end., 1 jeté, 1 m. end.) dans la prochaine maille » = geste nouveau
//     « 1 maille en 3 avec un jeté » ; le rang 6 rassemble ces 3 mailles (3 ensemble à l'envers).
//   - Point de mûres : l'article ne donne pas le montage ; le compte des rangs donne un multiple de 6 + 1
//     (13 mailles au moins). « 3 mailles ensemble endroit torses » = 3 ensemble à l'endroit par le brin arrière.
//     Pas encore de version en rond (les gestes du rang envers n'ont pas encore d'équivalent).
//   - Propriétés (réversible, roule, élasticité, chaleur), densités et consommations : estimations de départ, comme
//     pour les autres lots ; les échantillons enregistrés les corrigent.
//
// Non codés (articles insuffisants, voir 10-catalogue.md) :
//   - Point roman : pas de montage, répétitions perdues dans le texte (rangs 4 et 5, 6 et 7 identiques).
//   - Noisette texturée : la façon de faire la noisette (5 mailles en 1) et les 5 mailles ensemble (endroit ou envers)
//     ne sont pas décrites ; le rang 13 compte 11 mailles au lieu de 10 ; le rang 2 ne correspond pas au rang 1.

import { TRICONAUTES, E, V, fois, ok, possible, deconseille } from "../aides.js";

/** Gestes nouveaux apportés par ce lot. Aspects vus côté endroit (voir gestes.js). */
export const GESTES_LOT = {
  // Point d'étoile, sur l'envers : 3 ensemble à l'envers sans lâcher, jeté, 3 ensemble à l'envers dans les mêmes.
  etoileEnv: {
    nom: "étoile à l'envers",
    pluriel: "étoiles à l'envers",
    abrege: "étoile env.",
    consomme: 3,
    produit: 3,
    endroit: ["grain", "trou", "grain"],
    envers: ["Vdroite", "trou", "Vgauche"],
    vuDeLAutreCote: null,
  },
  // (1 maille endroit, 1 jeté, 1 maille endroit) dans la même maille.
  "1en3j": {
    nom: "1 maille en 3 avec un jeté",
    pluriel: null,
    abrege: "(1 end., 1 j., 1 end.) ds la m.",
    consomme: 1,
    produit: 3,
    endroit: ["V", "trou", "V"],
    envers: ["grain", "trou", "grain"],
    vuDeLAutreCote: null,
  },
  "5ens": {
    nom: "5 mailles ensemble à l'endroit",
    pluriel: null,
    abrege: "5 m. ens. end.",
    consomme: 5,
    produit: 1,
    endroit: ["Vcentre"],
    envers: ["boule"],
    vuDeLAutreCote: null,
  },
  "3ensT": {
    nom: "3 mailles ensemble à l'endroit torses",
    pluriel: null,
    abrege: "3 m. ens. end. torses",
    consomme: 3,
    produit: 1,
    endroit: ["Vgauche"],
    envers: ["boule"],
    vuDeLAutreCote: null,
  },
};

export const TECHNIQUES_LOT = {
  etoileEnv: {
    titre: "Étoile (sur l'envers)",
    explication:
      "Fil devant, pique dans les 3 mailles suivantes comme pour les tricoter ensemble à l'envers et tricote-les ensemble, sans les lâcher de l'aiguille gauche. Fais un jeté (le fil fait un tour autour de l'aiguille droite), puis tricote encore une fois ces 3 mêmes mailles ensemble à l'envers, et laisse-les glisser. Tu as de nouveau 3 mailles : c'est une étoile.",
  },
  "1en3j": {
    titre: "1 maille en 3 avec un jeté",
    explication:
      "Tricote la maille à l'endroit sans la laisser glisser de l'aiguille gauche. Fais un jeté, puis tricote encore une fois la même maille à l'endroit, et laisse-la glisser. Une maille en donne trois, avec un petit trou au milieu.",
  },
  "5ens": {
    titre: "5 mailles ensemble à l'endroit",
    explication:
      "Pique dans les 5 mailles suivantes à la fois, comme pour les tricoter à l'endroit (en commençant par la plus éloignée), puis tricote-les ensemble : il n'en reste qu'une. Si c'est trop serré, écarte un peu les mailles avec la pointe de l'aiguille avant de piquer.",
  },
  "3ensT": {
    titre: "3 mailles ensemble à l'endroit torses",
    explication:
      "Pique dans le brin arrière des 3 mailles suivantes à la fois (l'aiguille droite passe derrière l'aiguille gauche), puis tricote-les ensemble à l'endroit : il n'en reste qu'une, légèrement penchée vers la gauche.",
  },
};

const MOJO = "https://www.trustthemojo.com/blog/star-stitch";

export const POINTS_LOT = [
  {
    id: "etoile",
    nom: "Point d'étoile",
    article: "le",
    synonymes: ["étoile", "étoiles", "star stitch"],
    famille: "textures",
    rangs: [
      E(["end"], { fin: ["end"] }),
      V(["etoileEnv", "env"], { debut: ["env"] }),
      E(["end"], { fin: ["end"] }),
      V(["etoileEnv", "env"], { debut: ["env", "env", "env"], fin: ["env", "env"] }),
    ],
    densite: { mailles: 1.15, rangs: 1.1 },
    consommation: 1.25,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 3, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les bords roulent un peu : prévois des bordures et des bandes latérales."),
      snood: possible("Pas encore de version en rond : à plat seulement pour l'instant."),
      bonnet: possible("Pas encore de version en rond : à plat seulement pour l'instant."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Ses bords roulent un peu : il tient mal une bordure.") },
    rond: { mode: "impossible", raison: "La version en rond de ce point n'est pas encore écrite : pour l'instant, il se tricote à plat." },
    resume:
      "De petites étoiles serrées : 3 mailles rassemblées autour d'un jeté, tous les 2 rangs, décalées d'une rangée à l'autre. Un relief dense et graphique, sur 4 rangs faciles à mémoriser.",
    source: MOJO,
  },
  {
    id: "variation-riz",
    nom: "Variation du point de riz",
    article: "la",
    synonymes: ["riz variation", "variante point de riz"],
    famille: "textures",
    rangs: [
      E(["aug"], { fin: ["aug"] }),
      V(["2ensEnv", "2ens"], { debut: ["2ens"] }),
      E(["aug"], { fin: ["aug"] }),
      V(["2ens", "2ensEnv"], { debut: ["2ensEnv"] }),
    ],
    densite: { mailles: 1.05, rangs: 1.1 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Chaque rang endroit double les mailles : c'est long sur une grande surface."),
    },
    zones: { bordure: possible("Il ne roule pas, mais un point plus simple (mousse, riz) suffit pour une bordure.") },
    resume:
      "Un cousin du point de riz : chaque maille est tricotée deux fois sur l'endroit, puis les mailles sont rassemblées deux par deux sur l'envers, en alternant endroit et envers. Une texture granuleuse plus marquée que le riz.",
    source: TRICONAUTES + "joli-point-echarpe/",
  },
  {
    id: "cotes-couverture",
    nom: "Côtes de couverture",
    article: "les",
    synonymes: ["point côtes de couverture", "côtes couverture"],
    famille: "cotes",
    rangs: [E(["aug"], { fin: ["aug"] }), V(["2ensEnv", "2ens"], { debut: ["2ens"] })],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 3, niveau: 2 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume:
      "Une alternative douillette au point mousse : chaque maille est tricotée deux fois sur l'endroit, puis rassemblée deux par deux sur l'envers. Des côtes moelleuses, sur 2 rangs seulement.",
    source: TRICONAUTES + "joli-point-echarpe/",
  },
  {
    id: "lignes-pointillees",
    nom: "Lignes pointillées",
    article: "les",
    synonymes: ["pointillés", "point lignes pointillées"],
    famille: "ajoures",
    rangs: [
      E(["end", "env", "env", "env"], { debut: fois("env", 3) }),
      V(["env", "end", "end", "end"], { debut: fois("end", 3) }),
      E(["end", "env", "env", "env"], { debut: fois("env", 3) }),
      V(["env", "end", "end", "end"], { debut: fois("end", 3) }),
      E(["1en3j", "env", "env", "env"], { debut: fois("env", 3) }),
      V(["3ensEnv", "end", "end", "end"], { debut: fois("end", 3) }),
    ],
    densite: { mailles: 1.05, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Fond de jersey envers : les bords roulent, prévois des bordures et des bandes latérales."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Discret sur une grande surface : il ressort mieux sur un pull ou un bonnet."),
    },
    zones: { bordure: deconseille("Il roule : une bordure en fond de jersey envers s'enroule.") },
    resume:
      "Des côtes fines d'une maille endroit sur fond de jersey envers, ponctuées tous les 6 rangs d'un petit nœud ajouré : on dirait des lignes en pointillés. Pensé pour les pulls.",
    source: TRICONAUTES + "points-tricot-pull/",
  },
  {
    id: "mures",
    nom: "Point de mûres",
    article: "le",
    synonymes: ["mûres", "point mûres"],
    famille: "textures",
    rangs: [
      E(["end", ...fois("env", 5)], { debut: fois("env", 3), fin: ["end", ...fois("env", 3)] }),
      V(["jete", "1en3j", "jete", "5ens"], { debut: ["3ens"], fin: ["jete", "1en3j", "jete", "3ensT"] }),
      E([...fois("env", 5), "end"], { debut: ["end"] }),
      V([...fois("end", 5), "env"], { debut: ["env"] }),
      E([...fois("env", 5), "end"], { debut: ["end"] }),
      V(["jete", "5ens", "jete", "1en3j"], { debut: ["endEnv_f"], fin: ["jete", "5ens", "jete", "endEnv_f"] }),
      E(["end", ...fois("env", 5)], { debut: fois("env", 3), fin: ["end", ...fois("env", 3)] }),
      V(["env", ...fois("end", 5)], { debut: fois("end", 3), fin: ["env", ...fois("end", 3)] }),
    ],
    densite: { mailles: 1.2, rangs: 1.1 },
    consommation: 1.35,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 3, niveau: 3 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les bords roulent : prévois des bordures et des bandes latérales."),
      snood: possible("Pas encore de version en rond : à plat seulement pour l'instant."),
      bonnet: possible("Pas encore de version en rond : à plat seulement pour l'instant."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Il roule et son motif est large : il tient mal une bordure.") },
    rond: { mode: "impossible", raison: "La version en rond de ce point n'est pas encore écrite : pour l'instant, il se tricote à plat." },
    resume:
      "Des grappes en relief, comme de petites mûres, sur fond de jersey envers : on fait 3 mailles dans une, puis on en rassemble 5, en décalant d'un rang de grappes à l'autre. Un point riche, pour l'hiver.",
    source: TRICONAUTES + "selection-points-tricots-faciles-jolis/",
  },
];
