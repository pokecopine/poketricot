// Catalogue — lot B (deuxième fournée). Voir js/catalogue/points.js pour le format d'un point.
// Seuls les noms et la structure des points sont repris des Triconautes ; les textes sont rédigés pour l'outil.
//
// NON CODÉS :
// - Point de chevron (mailles tombées), Chevron penché, Chevrons ombrés, Œillets en chevrons :
//   l'article « point-chevron » n'a pas pu être ouvert, et aucune autre source ne garantit la même recette.
// - Noisette texturée : 5 mailles en une, puis 5 ensemble six rangs plus haut ; le nombre de mailles change d'un rang à l'autre.
// - Point d'astrakan (grappe, ronce, framboise, trinité, mûre) : article inaccessible ; la seule autre source trouvée
//   (en anglais) ne dit pas sur quel côté se font les boules ni sur quel fond, rien ne garantit la version des Triconautes.
// - Lignes pointillées : 1 maille en 3 au rang 5, 3 ensemble au rang 6 ; le nombre de mailles change d'un rang à l'autre.
// - Point alvéole : la « maille double » du rang 3 et le « fil qui a glissé » à relever au rang 4 ne se laissent pas
//   interpréter de façon sûre (maille piquée dessous, ou maille glissée avec jeté ?).
// - Point de mûres : pas de multiple donné ; le début et la fin des rangs 2 et 6 ne gardent pas chacun leur nombre de mailles
//   (3 ensemble au début, 1 maille en 3 à la fin), et la fin du rang 2 (« torses ») est ambiguë.
//
// ÉCARTS DANS LES ARTICLES (le simulateur arbitre) :
// - Côtes allongées alternées : l'article annonce « multiple de 4 + 2 », mais ses rangs (côtes 3/3) demandent 6 + 3.
//   Le rang 7 est écrit comme le rang 6 : c'est bien le décalage des côtes (rangs 7 à 12 inversés).
// - Chevron réversible : le rang 4 est écrit d'un bloc pour 33 mailles ; découpé en début + motif de 16 + fin, même rang.
// - Point de vagues : « 18 + 2 lisières », les 2 lisières sont ajoutées par l'outil.
// - Point pavillon : l'article ne donne que les rangs impairs ; les rangs pairs (« comme les mailles se présentent »)
//   sont déduits de chacun d'eux.
// - Noisette aérée : le rang 3 répète le groupe « jeté, glissée, 2 endroit, passer » sans maille entre deux,
//   le rang 7 avec 3 mailles endroit entre deux ; codé tel quel, c'est la seule lecture qui tombe juste sur 6 + 5.
// - Point brioche : article inaccessible ; recette standard de la brioche à une couleur (nombre pair, mise en place,
//   puis un seul rang répété), vérifiée sur une autre source.
// - Côtes chevrons : lues dans l'article « points-tricot-pull » (même multiple 10 + 1 et mêmes 4 rangs que l'inventaire).
import { TRICONAUTES, E, V, fois, ok, possible, deconseille } from "../aides.js";

/** Gestes nouveaux apportés par ce lot (même format que js/catalogue/gestes.js). */
export const GESTES_LOT = {
  // Brioche : la maille glissée et son jeté restent ensemble et comptent pour une seule maille.
  gljete_b: { nom: "maille glissée avec jeté", pluriel: "mailles glissées avec jeté", abrege: "gl. j.", consomme: 1, produit: 1, endroit: ["Vlongue"], envers: ["Vlongue"], vuDeLAutreCote: "gljete_b" },
  brEnd_b: { nom: "maille brioche endroit (la maille et son jeté ensemble à l'endroit)", pluriel: "mailles brioche endroit", abrege: "br. end.", consomme: 1, produit: 1, endroit: ["Vdouble"], envers: ["grain"], vuDeLAutreCote: "brEnv_b" },
  brEnv_b: { nom: "maille brioche envers (la maille et son jeté ensemble à l'envers)", pluriel: "mailles brioche envers", abrege: "br. env.", consomme: 1, produit: 1, endroit: ["grain"], envers: ["Vdouble"], vuDeLAutreCote: "brEnd_b" },
  // Noisette aérée : glisser 1, 2 mailles endroit, passer la maille glissée par-dessus les 2.
  gl2pp_b: { nom: "1 glissée, 2 endroit, glissée passée par-dessus", pluriel: null, abrege: "gl. 1, 2 end., pass.", consomme: 3, produit: 2, endroit: ["V", "V"], envers: null, vuDeLAutreCote: null },
  // Côtes souples : 1 maille endroit sans la lâcher, puis la même avec la suivante, ensemble.
  croise_b: { nom: "maille croisée des côtes souples", pluriel: "mailles croisées des côtes souples", abrege: "m. crois.", consomme: 2, produit: 2, endroit: ["V", "Vdroite"], envers: null, vuDeLAutreCote: null },
  // Point cluster : 3 mailles enroulées 6 fois par le fil.
  cluster3_b: { nom: "cluster de 3 mailles", pluriel: "clusters de 3 mailles", abrege: "clust. 3", consomme: 3, produit: 3, endroit: ["Vdroite", "Vcentre", "Vgauche"], envers: null, vuDeLAutreCote: null },
};

/** Explications des gestes nouveaux (même format que js/catalogue/techniques.js). */
export const TECHNIQUES_LOT = {
  gljete_b: {
    titre: "Maille glissée avec jeté",
    explication:
      "Ramène le fil devant. Glisse la maille suivante sur l'aiguille droite comme pour la tricoter à l'envers, sans la tricoter. Puis repasse le fil par-dessus l'aiguille droite vers l'arrière : il forme un jeté posé sur la maille glissée. Si la maille suivante se tricote à l'envers, ramène ensuite le fil devant, entre les aiguilles. La maille et son jeté comptent pour une seule maille.",
  },
  brEnd_b: {
    titre: "Maille brioche endroit",
    explication:
      "La maille suivante porte un jeté posé dessus. Pique dans la maille et dans son jeté en même temps, comme pour une maille endroit, et tricote-les ensemble. Il te reste une seule maille.",
  },
  brEnv_b: {
    titre: "Maille brioche envers",
    explication:
      "Fil devant, pique dans la maille et dans son jeté en même temps, comme pour une maille envers, et tricote-les ensemble à l'envers. Il te reste une seule maille.",
  },
  gl2pp_b: {
    titre: "1 glissée, 2 endroit, passer par-dessus",
    explication:
      "Le fil devant (il y est déjà après le jeté), glisse 1 maille sur l'aiguille droite comme pour la tricoter à l'endroit. Ramène le fil derrière et tricote les 2 mailles suivantes à l'endroit. Avec la pointe de l'aiguille gauche, attrape la maille glissée et fais-la passer par-dessus ces 2 mailles. Il en reste 2 au lieu de 3 ; le jeté qui précède remplace la maille en moins.",
  },
  croise_b: {
    titre: "Maille croisée des côtes souples",
    explication:
      "Tricote la maille suivante à l'endroit mais ne la laisse pas tomber de l'aiguille gauche. Pique ensuite dans cette même maille et dans la suivante, comme pour 2 mailles ensemble à l'endroit, tricote-les ensemble et laisse tomber les deux. Tu as toujours 2 mailles.",
  },
  cluster3_b: {
    titre: "Cluster de 3 mailles",
    explication:
      "Glisse les 3 mailles suivantes sur une aiguille auxiliaire. Enroule le fil 6 fois autour de ces 3 mailles, dans le sens des aiguilles d'une montre, sans serrer trop. Ramène le fil derrière le travail, puis tricote à l'endroit les 3 mailles de l'aiguille auxiliaire.",
  },
};

// « Tricoter les mailles comme elles se présentent » : le rang envers qui suit un rang endroit de mailles endroit et envers.
// Sur l'envers, on reprend les gestes du rang endroit dans l'ordre inverse, l'endroit devenant envers et inversement.
const inverse = { end: "env", env: "end" };
const retourner = (liste) => [...liste].reverse().map((c) => inverse[c]);
const presentes = (rang) => V(retourner(rang.motif), { debut: retourner(rang.fin), fin: retourner(rang.debut) });

/** Développe une suite écrite comme [[nombre, geste], ...] : suite([2, "end"], [1, "env"]) → ["end", "end", "env"]. */
const suite = (...groupes) => groupes.flatMap(([n, code]) => fois(code, n));

// ---------- Point pavillon : les rangs impairs de l'article, les rangs pairs « comme les mailles se présentent ». ----------
const pavillonImpairs = [
  /* 1 */ E(suite([2, "end"], [1, "env"], [5, "end"], [7, "env"], [3, "end"])),
  /* 3 */ E(suite([1, "end"], [1, "env"], [1, "end"], [1, "env"], [5, "end"], [5, "env"], [4, "end"])),
  /* 5 */ E(suite([1, "env"], [3, "end"], [1, "env"], [5, "end"], [3, "env"], [5, "end"])),
  /* 7 */ E(suite([5, "end"], [1, "env"], [5, "end"], [7, "env"])),
  /* 9 */ E(suite([1, "env"], [5, "end"], [1, "env"], [5, "end"], [5, "env"], [1, "end"])),
  /* 11 */ E(suite([1, "end"], [1, "env"], [5, "end"], [1, "env"], [5, "end"], [3, "env"], [2, "end"])),
  /* 13 */ E(suite([1, "env"], [5, "end"]), { debut: suite([2, "end"]), fin: suite([1, "env"], [3, "end"]) }),
  /* 15 */ E(suite([3, "end"], [1, "env"], [5, "end"], [1, "env"], [3, "end"], [1, "env"], [1, "end"], [1, "env"], [2, "end"])),
  /* 17 */ E(suite([4, "end"], [1, "env"], [5, "end"], [1, "env"], [1, "end"], [1, "env"], [3, "end"], [1, "env"], [1, "end"])),
  /* 19 */ E(suite([5, "end"], [7, "env"], [5, "end"], [1, "env"])),
  /* 21 */ E(suite([1, "env"], [5, "end"], [5, "env"], [5, "end"], [1, "env"], [1, "end"])),
  /* 23 */ E(suite([1, "end"], [1, "env"], [5, "end"], [3, "env"], [5, "end"], [1, "env"], [2, "end"])),
  /* 25 */ E(suite([2, "end"], [7, "env"], [5, "end"], [1, "env"], [3, "end"])),
  /* 27 */ E(suite([1, "end"], [1, "env"], [1, "end"], [5, "env"], [5, "end"], [1, "env"], [4, "end"])),
  /* 29 */ E(suite([1, "env"], [3, "end"], [3, "env"], [5, "end"], [1, "env"], [5, "end"])),
  /* 31 */ E(suite([5, "end"], [1, "env"])),
  /* 33 */ E(suite([4, "end"], [1, "env"], [1, "end"], [1, "env"], [3, "end"], [1, "env"], [5, "end"], [1, "env"], [1, "end"])),
  /* 35 */ E(suite([3, "end"], [1, "env"], [3, "end"], [1, "env"], [1, "end"], [1, "env"], [5, "end"], [1, "env"], [2, "end"])),
];
// Rangs 1 à 36 : chaque rang impair suivi de son rang pair.
const pavillonRangs = pavillonImpairs.flatMap((r) => [r, presentes(r)]);

// ---------- Point cloqué ----------
const cloque1 = E(["end", "env", "end", "env"], { fin: ["end"] });
const cloque3 = E(["env", "end", "end", "end"], { fin: ["env"] });
const cloque7 = E(["end", "end", "env", "end"], { fin: ["end"] });

// ---------- Côtes riz gaufré ----------
const rizGaufre1 = E(suite([3, "env"], [1, "end"], [1, "env"], [2, "end"]), { fin: fois("env", 3) });
const rizGaufre3 = E(suite([3, "env"], [2, "end"], [1, "env"], [1, "end"]), { fin: fois("env", 3) });

// ---------- Point de grille (les rangs 6, 7, 8 répètent les rangs 4, 3, 2) ----------
const grille2 = V(suite([1, "end"], [5, "env"], [1, "end"], [1, "env"]));
const grille3 = E(suite([2, "end"], [1, "env"], [3, "end"], [1, "env"], [1, "end"]));
const grille4 = V(suite([2, "env"], [1, "end"], [1, "env"], [1, "end"], [3, "env"]));

// ---------- Damier 4/4 : deux rangs, réutilisés sur l'un ou l'autre côté ----------
const damierA = { debut: fois("end", 4), motif: suite([4, "env"], [4, "end"]) };
const damierB = { debut: fois("env", 4), motif: suite([4, "end"], [4, "env"]) };

// ---------- Côtes allongées alternées ----------
const allongeesA = { motif: suite([3, "end"], [3, "env"]), fin: fois("end", 3) };
const allongeesB = { motif: suite([3, "env"], [3, "end"]), fin: fois("env", 3) };

// ---------- Petites pyramides ----------
const pyramidesA = { debut: fois("end", 5), motif: suite([1, "env"], [5, "end"]) };
const pyramidesB = { debut: ["end"], motif: suite([3, "env"], [3, "end"]), fin: suite([3, "env"], [1, "end"]) };
const pyramidesC = { debut: fois("env", 2), motif: suite([1, "end"], [5, "env"]), fin: suite([1, "end"], [2, "env"]) };

// ---------- Manne version mousse ----------
const manne4 = V(suite([4, "end"], [2, "env"]), { debut: fois("env", 2) });
const manne10 = V(suite([1, "end"], [2, "env"], [3, "end"]), { debut: fois("end", 2) });

/** Points de ce lot. */
export const POINTS_LOT = [
  // ---------------- Côtes ----------------
  {
    id: "cotes-chevrons",
    nom: "Côtes chevrons",
    article: "les",
    synonymes: ["côtes en chevrons", "côtes zigzag"],
    famille: "cotes",
    rangs: [
      E(["end", "env", "end", "end", "env", "end", "end", "env", "end", "env"], { debut: ["env"] }),
      V(["env", "env", "end", "env", "end", "env", "end", "env", "env", "end"], { debut: ["end"] }),
      E(suite([3, "end"], [3, "env"], [3, "end"], [1, "env"]), { debut: ["env"] }),
      V(suite([3, "end"], [3, "env"], [1, "end"], [3, "env"]), { debut: suite([2, "end"], [3, "env"], [1, "end"], [3, "env"]), fin: fois("end", 2) }),
    ],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers montre un dessin différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: ok },
    resume: "Des côtes qui dessinent de petits zigzags en relief, sur 4 rangs faciles à retenir.",
    source: TRICONAUTES + "points-tricot-pull/",
  },
  {
    id: "brioche",
    nom: "Point brioche",
    article: "le",
    synonymes: ["côtes brioche", "brioche", "brioche stitch"],
    famille: "cotes",
    // Rang de mise en place sur l'endroit, puis le même geste sur chaque rang.
    miseEnPlace: [E(["end", "gljete_b"])],
    rangs: [V(["brEnd_b", "gljete_b"]), E(["brEnd_b", "gljete_b"])],
    densite: { mailles: 1, rangs: 2 },
    consommation: 1.8,
    proprietes: { reversible: true, roule: false, elasticite: 3, chaleur: 3, niveau: 2 },
    ouvrages: {
      echarpe: ok,
      snood: ok,
      bonnet: ok,
      couverture: possible("Très gourmand en laine : une couverture demandera beaucoup de pelotes."),
    },
    zones: { bordure: possible("Très épais et très élastique : il peut gondoler à côté d'un point plus plat.") },
    avertissements: {
      compte: "Une maille et le jeté posé dessus comptent pour une seule maille : ne les compte pas séparément.",
      rangs: "Chaque côte visible demande deux rangs tricotés : le travail monte lentement.",
    },
    resume: "Des côtes épaisses et moelleuses, pareilles des deux côtés, grâce à une maille glissée avec un jeté.",
    source: TRICONAUTES + "point-brioche-tricot/",
  },
  {
    id: "cotes-souples",
    nom: "Côtes souples",
    article: "les",
    synonymes: [],
    famille: "cotes",
    rangs: [E(["croise_b", "end"], { debut: ["end"] }), V(["env"])],
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Le fond est un jersey : il roule sur les côtés et son envers est différent ; ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Le fond en jersey roule : une bordure s'enroulerait.") },
    resume: "Des colonnes de petites mailles croisées sur un fond de jersey, avec un seul rang travaillé sur deux.",
    source: TRICONAUTES + "selection-points-tricots-faciles-jolis/",
  },
  {
    id: "cotes-riz-gaufre",
    nom: "Côtes riz gaufré",
    article: "les",
    synonymes: [],
    famille: "cotes",
    rangs: [rizGaufre1, presentes(rizGaufre1), rizGaufre3, presentes(rizGaufre3)],
    densite: { mailles: 1.2, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: false, elasticite: 3, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les côtes resserrent le tricot : il faudra beaucoup de mailles pour une grande largeur."),
    },
    zones: { bordure: ok },
    resume: "Des côtes envers séparées par de petites bandes de riz qui changent à chaque rang endroit.",
    source: TRICONAUTES + "selection-points-tricots-faciles-jolis/",
  },
  {
    id: "cotes-allongees-alternees",
    nom: "Côtes allongées alternées",
    article: "les",
    synonymes: [],
    famille: "cotes",
    // 6 rangs de côtes 3/3, puis 6 rangs où les côtes sont décalées.
    rangs: [
      E(allongeesA.motif, allongeesA),
      V(allongeesB.motif, allongeesB),
      E(allongeesA.motif, allongeesA),
      V(allongeesB.motif, allongeesB),
      E(allongeesA.motif, allongeesA),
      V(allongeesB.motif, allongeesB),
      E(allongeesB.motif, allongeesB),
      V(allongeesA.motif, allongeesA),
      E(allongeesB.motif, allongeesB),
      V(allongeesA.motif, allongeesA),
      E(allongeesB.motif, allongeesB),
      V(allongeesA.motif, allongeesA),
    ],
    densite: { mailles: 1.15, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Des côtes 3/3 qui changent de place tous les 6 rangs, comme un grand damier en longueur.",
    source: TRICONAUTES + "points-tricot-pull/",
  },

  // ---------------- Texturés ----------------
  {
    id: "cloque",
    nom: "Point cloqué",
    article: "le",
    synonymes: ["cloqué"],
    famille: "textures",
    rangs: [cloque1, presentes(cloque1), cloque3, presentes(cloque3), cloque1, presentes(cloque1), cloque7, presentes(cloque7)],
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli, mais moins net qu'une bordure en mousse ou en côtes.") },
    resume: "Des petits creux en quinconce sur un fond de côtes, en tricotant les mailles comme elles se présentent un rang sur deux.",
    source: TRICONAUTES + "point-tricot-relief/",
  },
  {
    id: "thermes",
    nom: "Point de thermes",
    article: "le",
    synonymes: ["thermes"],
    famille: "textures",
    rangs: [E(["end", "end", "env", "env"], { fin: ["end", "end"] }), V(["env", "env", "end", "end"], { fin: ["env", "env"] }), E(["end"]), V(["env"])],
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Deux rangs de jersey sur quatre : le bord peut onduler un peu.") },
    resume: "Deux rangs de côtes 2/2 et deux rangs de jersey : de petits pavés réguliers, très faciles.",
    source: TRICONAUTES + "point-tricot-relief/",
  },
  {
    id: "double-panier",
    nom: "Double panier",
    article: "le",
    synonymes: ["point double panier"],
    famille: "textures",
    rangs: [
      E(["end"]),
      V(["end", "end", "end", "env"], { fin: fois("end", 3) }),
      E(["end"]),
      V(["end"]),
      E(["end"]),
      V(["env", "end", "end", "end"], { debut: ["end"], fin: ["env", "end"] }),
      E(["end"]),
      V(["env", "end", "end", "end"], { debut: ["end"], fin: ["env", "end"] }),
    ],
    densite: { mailles: 1, rangs: 1.6 },
    consommation: 1.2,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("Les deux faces se ressemblent mais ne sont pas identiques."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: ok },
    resume: "Un point mousse parsemé de petites mailles en relief, qui peut remplacer la mousse en bordure.",
    source: TRICONAUTES + "point-tricot-facile/",
  },
  {
    id: "grille",
    nom: "Point de grille",
    article: "le",
    synonymes: ["grille"],
    famille: "textures",
    rangs: [
      E(suite([1, "env"], [7, "end"])),
      grille2,
      grille3,
      grille4,
      E(suite([4, "end"], [1, "env"], [3, "end"])),
      grille4,
      grille3,
      grille2,
    ],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Il roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Le fond en jersey roule : une bordure s'enroulerait.") },
    resume: "Un treillis de losanges dessiné par des mailles envers sur un fond de jersey.",
    source: TRICONAUTES + "point-tricot-facile/",
  },
  {
    id: "barres-verticales-lignees",
    nom: "Barres verticales lignées",
    article: "les",
    synonymes: ["point de barres verticales lignées"],
    famille: "textures",
    // Au rang 2 (envers), le fil reste derrière l'ouvrage, du côté endroit : il passe devant les mailles glissées.
    rangs: [E(["env", "env", "end", "end"], { fin: ["env", "env"] }), V(["end", "end", "gl", "gl"], { fin: ["end", "end"] })],
    densite: { mailles: 1.2, rangs: 1.2 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit ; l'article conseille une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("L'article conseille d'ajouter une bordure tout autour."),
    },
    zones: { bordure: possible("Les mailles glissées resserrent un peu le bord.") },
    resume: "Des côtes dont les colonnes endroit sont barrées d'un petit fil, en glissant deux mailles au rang envers.",
    source: TRICONAUTES + "point-tricot-facile/",
  },
  {
    id: "damier-4-4",
    nom: "Damier 4/4",
    article: "le",
    synonymes: ["point de damier", "damier"],
    famille: "textures",
    rangs: [
      E(damierA.motif, damierA),
      V(damierB.motif, damierB),
      E(damierA.motif, damierA),
      V(damierB.motif, damierB),
      E(damierB.motif, damierB),
      V(damierA.motif, damierA),
      E(damierB.motif, damierB),
      V(damierA.motif, damierA),
    ],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Joli, mais les carrés se voient mal sur une bordure étroite.") },
    resume: "Des carrés de 4 mailles sur 4 rangs, alternant endroit et envers : un damier réversible.",
    source: TRICONAUTES + "8-differents-points-tricot/",
  },
  {
    id: "chevron-reversible",
    nom: "Chevron réversible",
    article: "le",
    synonymes: ["point de chevron réversible"],
    famille: "textures",
    rangs: [
      E(suite([3, "end"], [2, "env"], [2, "end"], [2, "env"], [1, "end"], [2, "env"], [2, "end"], [2, "env"]), {
        debut: suite([2, "end"], [2, "env"], [2, "end"], [2, "env"], [1, "end"], [2, "env"], [2, "end"], [2, "env"]),
        fin: fois("end", 2),
      }),
      V(suite([2, "end"], [2, "env"], [2, "end"], [3, "env"], [2, "end"], [2, "env"], [2, "end"], [1, "env"]), { debut: ["env"] }),
      E(suite([1, "env"], [2, "end"], [2, "env"], [5, "end"], [2, "env"], [2, "end"], [1, "env"], [1, "end"]), { debut: ["end"] }),
      // L'article écrit ce rang pour 33 mailles ; on le découpe en un motif de 16 qui donne le même rang sur 33 mailles.
      V(suite([5, "env"], [2, "end"], [2, "env"], [1, "end"], [1, "env"], [1, "end"], [2, "env"], [2, "end"]), {
        debut: suite([3, "env"], [2, "end"], [2, "env"], [1, "end"], [1, "env"], [1, "end"], [2, "env"], [2, "end"]),
        fin: fois("env", 3),
      }),
    ],
    densite: { mailles: 1.1, rangs: 1 },
    consommation: 1.1,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 3 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: possible("Joli en bande, mais un motif de 16 mailles se voit mal sur une bordure étroite.") },
    resume: "Des chevrons dessinés en mailles endroit et envers, aussi beaux d'un côté que de l'autre.",
    source: TRICONAUTES + "8-differents-points-tricot/",
  },
  {
    id: "pavillon",
    nom: "Point pavillon",
    article: "le",
    synonymes: ["pavillon"],
    famille: "textures",
    rangs: pavillonRangs,
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 3 },
    ouvrages: {
      echarpe: possible("L'envers montre le dessin en négatif, moins net."),
      snood: ok,
      bonnet: possible("Le motif fait 18 mailles sur 36 rangs : il se verra à peine sur un bonnet."),
      couverture: ok,
    },
    zones: { bordure: deconseille("Le motif est trop grand pour une bordure.") },
    avertissements: { long: "Un motif de 36 rangs : coche chaque rang au fur et à mesure." },
    resume: "Un grand motif de mailles endroit et envers sur 18 mailles et 36 rangs ; les rangs envers se tricotent comme les mailles se présentent.",
    source: TRICONAUTES + "selection-points-tricots-faciles-jolis/",
  },
  {
    id: "cluster",
    nom: "Point cluster",
    article: "le",
    synonymes: ["cluster", "point de grappes enroulées"],
    famille: "textures",
    rangs: [
      E(["end"]),
      V(["env"]),
      E([...fois("end", 5), "cluster3_b"], { fin: fois("end", 5) }),
      V(["env"]),
      E(["end"]),
      V(["env"]),
      E(["cluster3_b", ...fois("end", 5)], { debut: ["end"], fin: ["cluster3_b", "end"] }),
      V(["env"]),
    ],
    densite: { mailles: 1.05, rangs: 1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("Le fond en jersey roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Le fond en jersey roule : une bordure s'enroulerait.") },
    resume: "Des petits paquets de 3 mailles serrées par le fil, en quinconce sur un fond de jersey.",
    source: TRICONAUTES + "selection-points-tricots-faciles-jolis/",
  },
  {
    id: "petites-pyramides",
    nom: "Petites pyramides",
    article: "les",
    synonymes: ["point de petites pyramides"],
    famille: "textures",
    rangs: [
      E(pyramidesA.motif, pyramidesA),
      V(pyramidesB.motif, pyramidesB),
      E(pyramidesC.motif, pyramidesC),
      V(pyramidesC.motif, pyramidesC),
      E(pyramidesB.motif, pyramidesB),
      V(pyramidesA.motif, pyramidesA),
    ],
    densite: { mailles: 1.05, rangs: 1.05 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: false, elasticite: 2, chaleur: 2, niveau: 2 },
    ouvrages: {
      echarpe: possible("L'envers est différent de l'endroit."),
      snood: ok,
      bonnet: ok,
      couverture: ok,
    },
    zones: { bordure: possible("Joli, mais moins net qu'une bordure en mousse ou en côtes.") },
    resume: "Des petits triangles en mailles envers qui poussent en quinconce, sur 6 rangs.",
    source: TRICONAUTES + "points-tricot-pull/",
  },
  {
    id: "manne-mousse",
    nom: "Manne version mousse",
    article: "la",
    synonymes: ["point de manne mousse", "vannerie mousse"],
    famille: "textures",
    rangs: [E(["end"]), V(["env"]), E(["end"]), manne4, E(["end"]), manne4, E(["end"]), V(["env"]), E(["end"]), manne10, E(["end"]), manne10],
    densite: { mailles: 1, rangs: 1.2 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("Les rangs de jersey roulent un peu sur les côtés, et l'envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les bords peuvent rouler : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Les rangs de jersey roulent : une bordure s'enroulerait.") },
    resume: "Des petits blocs de point mousse décalés tous les 6 rangs, comme un panier tressé.",
    source: TRICONAUTES + "points-tricot-pull/",
  },
  {
    id: "grain-de-poudre",
    nom: "Grain de poudre",
    article: "le",
    synonymes: ["point grain de poudre"],
    famille: "textures",
    rangs: [E(["env", "gl"], { fin: ["env"] }), V(["env"]), E(["gl", "env"], { fin: ["env"] }), V(["env"])],
    densite: { mailles: 1.05, rangs: 1.3 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les bords peuvent rouler : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les bords peuvent rouler : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Les rangs de jersey roulent : une bordure s'enroulerait.") },
    resume: "Un semis de petits grains et de mailles glissées, très simple, avec un seul rang travaillé sur deux.",
    source: TRICONAUTES + "points-tricot-pull/",
  },

  // ---------------- Ajourés ----------------
  {
    id: "noisette-aeree",
    nom: "Noisette aérée",
    article: "la",
    synonymes: ["point de noisette ajouré", "noisette ajourée"],
    famille: "ajoures",
    rangs: [
      E(["end"]),
      V(["env"]),
      E(["jete", "gl2pp_b"], { debut: ["end"], fin: ["end"] }),
      V(["env"]),
      E(["end"]),
      V(["env"]),
      E(["jete", "gl2pp_b", "end", "end", "end"], { debut: fois("end", 4), fin: ["end"] }),
      V(["env"]),
    ],
    // En rond : comme à plat, les noisettes du rang 7 tombent au-dessus d'une noisette sur deux du rang 3.
    rond: {
      mode: "manuel",
      rangs: [E(["end"]), E(["end"]), E(["jete", "gl2pp_b"]), E(["end"]), E(["end"]), E(["end"]), E(["end", "end", "end", "jete", "gl2pp_b"]), E(["end"])],
    },
    densite: { mailles: 1, rangs: 1 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Le fond en jersey roule sur les côtés et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: possible("Peu élastique : il tient moins bien sur la tête."),
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Le fond en jersey roule : une bordure s'enroulerait.") },
    resume: "Des petites noisettes entourées d'un jour, en lignes espacées sur un fond de jersey.",
    source: TRICONAUTES + "point-noisette-tricot/",
  },
  {
    id: "vagues",
    nom: "Point de vagues",
    article: "le",
    synonymes: ["vagues"],
    famille: "ajoures",
    rangs: [
      E(["end"]),
      V(["env"]),
      E(["end"]),
      V(["env"]),
      E([...fois("2ensEnv", 3), "end", "jete", "end", "jete", "end", "jete", "end", "jete", "end", "jete", "end", "jete", ...fois("2ensEnv", 3)]),
      V(["env"]),
    ],
    densite: { mailles: 0.95, rangs: 1 },
    consommation: 1,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Idéal pour une écharpe d'après l'article, mais le fond en jersey roule un peu et l'envers est différent : ajoute une bordure."),
      snood: possible("Ajouré : plutôt pour la mi-saison."),
      bonnet: possible("Ajouré : plutôt pour la mi-saison."),
      couverture: possible("Joli en couverture légère, avec une bordure."),
    },
    zones: { bordure: deconseille("Le fond en jersey roule : une bordure s'enroulerait.") },
    blocage: true,
    resume: "Des vagues ondulées faites de jetés et de diminutions envers, sur un fond de jersey ; un seul rang travaillé sur six.",
    source: TRICONAUTES + "8-differents-points-tricot/",
  },
];
