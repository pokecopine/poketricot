// Catalogue — lot A (deuxième fournée). Voir js/catalogue/points.js pour le format d'un point.
// Seuls les noms et la structure des points sont repris des Triconautes ; les textes sont rédigés pour l'outil.
//
// Les articles des Triconautes n'ont pas pu être ouverts pendant le codage de ce lot. Les points ci-dessous
// ont été vérifiés contre une autre source fiable dont la structure (multiple, nombre de rangs, gestes)
// correspond exactement au relevé de l'inventaire ; les autres ne sont pas codés, faute de pouvoir
// garantir la recette.
//
// NON CODÉS dans ce lot (plusieurs ont été codés ensuite dans le lot E, d'après les articles lus le 25/10) :
//   - Losange et diamant de riz (12, 44 rangs) : article inaccessible ; 44 rangs impossibles à vérifier ailleurs.
//   - Point zig-zag en côtes (6, 12 rangs) : article inaccessible, pas de source sûre pour ces 12 rangs.
//   - Point de nasse (pair, 4 rangs) : article inaccessible, aucune autre source trouvée.
//   - Point de pointillés (4+3, 4 rangs) : article inaccessible, aucune autre source trouvée.
//   - Petites coquilles (7+2, 4 rangs) : article inaccessible, aucune autre source trouvée.
//   - Point de boucles / rayon de miel glissé / étamines (2+2, 4 rangs) : article inaccessible ; la seule autre
//     source trouvée (« stamen stitch ») est sur un nombre impair : structure différente, donc pas sûre.
//   - Côtes décalées 2/2 (4, 4 rangs) : article inaccessible ; décalage exact des côtes non vérifiable.
//   - Point de sable, variante 2+1 : article inaccessible, impossible de savoir si elle diffère du point de sable.
//   - Point croisé (pair, 2 rangs) : article inaccessible, ordre exact des gestes non vérifiable.
//   - Point motif de maille (pair, 2 rangs) : article inaccessible, aucune autre source trouvée.
//   - Variation du point de riz (impair, 4 rangs) : article inaccessible, aucune autre source trouvée.
//   - Côtes de couverture (impair, 2 rangs) : article inaccessible, aucune autre source trouvée.
//   - Triangles de jersey (5, 6 rangs) : article inaccessible, aucune autre source trouvée.
//   - Côtes brisées (4+3, 12 rangs) : article inaccessible, aucune autre source trouvée.
//   - Point de godron (3 ou 6 rangs) : article inaccessible, le doute sur le nombre de rangs ne peut pas être levé.
//   - Point de claie / point de haie (4, 4 rangs) : article inaccessible ; le « hurdle stitch » trouvé ailleurs
//     est sur un nombre pair (multiple de 2), pas de 4 : structure différente, donc pas sûre.
//   - Point de claie, variante quadrillage (2+1, 4 rangs) : article inaccessible.
//   - Point perlé contrarié (2+1, 4 rangs) : article inaccessible, aucune autre source trouvée.
//   - Parallélogrammes de riz (10, 6 rangs) : article inaccessible, aucune autre source trouvée.
//   - Point de lin : article inaccessible, structure inconnue.
//
// Sources de vérification (structure seulement) :
//   bambou : studioknitsf.com (bamboo stitch) ; boîtes : dummies.com (box stitch) ;
//   dentelle nouée : weareknitters (knotted lace stitch) ; point tissé : dummies.com (half linen stitch) ;
//   point tissé double : newstitchaday.com (double woven stitch, multiple de 4) ;
//   andalou : studioknitsf.com et handylittleme.com ; andalou double : undergroundcrafter.com ;
//   œil-de-perdrix : stitch-maps.com.

import { TRICONAUTES, E, V, fois, ok, possible, deconseille } from "../aides.js";

/** Gestes nouveaux apportés par ce lot (même format que js/catalogue/gestes.js). */
export const GESTES_LOT = {
  // Jeté, 2 mailles endroit, puis le jeté passé par-dessus ces 2 mailles (point de bambou).
  "2envJ_a": {
    nom: "2 mailles endroit enveloppées d'un jeté",
    pluriel: null,
    abrege: "2 m. end. envel. d'un j.",
    consomme: 2,
    produit: 2,
    endroit: ["V", "V"],
    envers: null,
    vuDeLAutreCote: null,
  },
  // 3 mailles endroit, puis la première tricotée passée par-dessus les 2 autres (dentelle nouée).
  "3p1_a": {
    nom: "3 mailles endroit, la 1re passée par-dessus les 2 autres",
    pluriel: null,
    abrege: "3 m. end., pass. 1re",
    consomme: 3,
    produit: 2,
    endroit: ["V", "V"],
    envers: null,
    vuDeLAutreCote: null,
  },
};

/** Explications des gestes nouveaux (même format que js/catalogue/techniques.js). */
export const TECHNIQUES_LOT = {
  "2envJ_a": {
    titre: "2 mailles endroit enveloppées d'un jeté",
    explication:
      "Fais un jeté : passe le fil par-dessus l'aiguille droite, d'avant en arrière. Tricote les 2 mailles suivantes à l'endroit. Avec la pointe de l'aiguille gauche, attrape le jeté (il est juste à droite de ces 2 mailles) et fais-le passer par-dessus les 2 mailles, puis hors de l'aiguille. Tu as toujours 2 mailles.",
  },
  "3p1_a": {
    titre: "3 mailles endroit, la 1re passée par-dessus",
    explication:
      "Tricote 3 mailles à l'endroit. Avec la pointe de l'aiguille gauche, attrape la première des trois (la plus loin de la pointe de l'aiguille droite) et fais-la passer par-dessus les 2 autres, puis hors de l'aiguille. Il te reste 2 mailles : le jeté qui suit remplace la troisième.",
  },
};

/** Points de ce lot. */
export const POINTS_LOT = [
  // ---------------- Texturés ----------------
  {
    id: "bambou",
    nom: "Point de bambou",
    article: "le",
    synonymes: ["bambou", "point bambou"],
    famille: "textures",
    rangs: [E(["2envJ_a"]), V(["env"])],
    densite: { mailles: 1.1, rangs: 1.1 },
    consommation: 1.15,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les côtés roulent : ajoute une bordure (mousse ou riz)."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour (joli pour une couverture de bébé)."),
    },
    zones: { bordure: deconseille("Il roule : une bordure en point de bambou s'enroule.") },
    resume: "Des petites tiges en relief, comme des cannes de bambou, avec un seul rang à retenir.",
    source: TRICONAUTES + "point-bambou/",
  },
  {
    id: "andalou",
    nom: "Point andalou",
    article: "le",
    synonymes: ["andalou"],
    famille: "textures",
    rangs: [E(["end"]), V(["env"]), E(["end", "env"]), V(["env"])],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("Il roule sur les côtés comme le jersey et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Il roule comme le jersey : une bordure s'enroulerait.") },
    resume: "Du jersey parsemé d'un rang de petits grains tous les 4 rangs : un quadrillage discret.",
    source: TRICONAUTES + "point-andalou/",
  },
  {
    id: "andalou-double",
    nom: "Point andalou double",
    article: "le",
    synonymes: ["andalou double"],
    famille: "textures",
    // Le « + 1 » est écrit dès le rang 1 (tout à l'endroit) pour que le compte du motif se lise partout.
    rangs: [E(fois("end", 3), { fin: ["end"] }), V(["env"]), E(["end"]), V(["end", "end", "env"], { debut: ["env"] })],
    densite: { mailles: 1, rangs: 1 },
    consommation: 1.05,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("Il roule sur les côtés comme le jersey et son envers est différent : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Il roule sur les bords : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Il roule comme le jersey : une bordure s'enroulerait.") },
    resume: "Comme le point andalou, mais avec des paires de grains : un quadrillage un peu plus marqué.",
    source: TRICONAUTES + "point-andalou/",
  },
  {
    id: "boites",
    nom: "Point de boîtes",
    article: "le",
    synonymes: ["boîtes", "point de boîte", "box stitch"],
    famille: "textures",
    rangs: [
      E(["env", "env", "end", "end"], { debut: ["end", "end"] }),
      V(["end", "end", "env", "env"], { debut: ["env", "env"] }),
      E(["end", "end", "env", "env"], { debut: ["env", "env"] }),
      V(["env", "env", "end", "end"], { debut: ["end", "end"] }),
    ],
    densite: { mailles: 1.1, rangs: 1.05 },
    consommation: 1.15,
    proprietes: { reversible: true, roule: false, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: { echarpe: ok, snood: ok, bonnet: ok, couverture: ok },
    zones: { bordure: ok },
    resume: "Un damier de petits carrés de 2 mailles sur 2 rangs, pareil des deux côtés : parfait pour une écharpe.",
    source: TRICONAUTES + "point-reversible-echarpe/",
  },
  {
    id: "tisse",
    nom: "Point tissé",
    article: "le",
    synonymes: ["tissé", "demi point de toile"],
    famille: "textures",
    miseEnPlace: [V(["env"])],
    rangs: [
      E(["glAv", "end"], { debut: ["end"] }),
      V(["env"]),
      E(["glAv", "end"], { debut: ["end", "end"], fin: ["end"] }),
      V(["env"]),
    ],
    densite: { mailles: 1.15, rangs: 1.3 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les côtés peuvent rouler un peu : ajoute une bordure."),
      snood: ok,
      bonnet: possible("Peu élastique : prévois un bord en côtes."),
      couverture: possible("Les bords peuvent rouler : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Peu élastique et les bords roulent : mieux vaut une bordure en mousse ou en côtes.") },
    resume: "De petits brins de fil couchés devant les mailles, en quinconce : on dirait un tissu tissé.",
    source: TRICONAUTES + "point-fantaisie-4-rangs/",
  },
  {
    id: "tisse-double",
    nom: "Point tissé double",
    article: "le",
    synonymes: ["tissé double"],
    famille: "textures",
    rangs: [
      E(["glAv", "glAv", "end", "end"], { debut: fois("end", 3), fin: ["end"] }),
      V(["env"]),
      E(["glAv", "glAv", "end", "end"], { debut: ["end"], fin: ["glAv", "glAv", "end"] }),
      V(["env"]),
    ],
    densite: { mailles: 1.15, rangs: 1.3 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 1, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les côtés peuvent rouler un peu : ajoute une bordure."),
      snood: ok,
      bonnet: possible("Peu élastique : prévois un bord en côtes."),
      couverture: possible("Les bords peuvent rouler : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Peu élastique et les bords roulent : mieux vaut une bordure en mousse ou en côtes.") },
    resume: "Des brins de fil couchés sur 2 mailles, en quinconce : un effet de vannerie bien visible.",
    source: TRICONAUTES + "point-fantaisie-4-rangs/",
  },
  {
    id: "oeil-de-perdrix",
    nom: "Œil-de-perdrix",
    article: "l'",
    synonymes: ["oeil de perdrix", "point œil-de-perdrix", "point de talon"],
    famille: "textures",
    rangs: [
      E(["gl", "end"], { debut: ["end"] }),
      V(["env"]),
      E(["gl", "end"], { debut: ["end", "end"], fin: ["end"] }),
      V(["env"]),
    ],
    densite: { mailles: 1.1, rangs: 1.25 },
    consommation: 1.1,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 2, niveau: 1 },
    ouvrages: {
      echarpe: possible("L'envers est différent et les côtés peuvent rouler un peu : ajoute une bordure."),
      snood: ok,
      bonnet: ok,
      couverture: possible("Les bords peuvent rouler : prévois une bordure tout autour."),
    },
    zones: { bordure: deconseille("Les bords roulent : mieux vaut une bordure en mousse ou en côtes.") },
    resume: "Des mailles glissées en quinconce qui dessinent de petits yeux : un tricot dense et solide.",
    source: TRICONAUTES + "point-fantaisie-tricot-comment-tricoter-des-points-originaux/",
  },

  // ---------------- Ajourés ----------------
  {
    id: "dentelle-nouee",
    nom: "Dentelle nouée",
    article: "la",
    synonymes: ["point noué ajouré"],
    famille: "ajoures",
    // Le premier rang se tricote sur l'envers.
    rangs: [
      V(["env"]),
      E(["jete", "3p1_a"], { debut: ["end", "end"], fin: ["end"] }),
      V(["env"]),
      E(["3p1_a", "jete"], { debut: ["end"], fin: ["end", "end"] }),
    ],
    // En rond, le décalage des nœuds tomberait à cheval sur le début du tour : version en rond non écrite.
    rond: { mode: "impossible", raison: "Les nœuds se décalent d'une maille tous les 2 tours : il faudrait déplacer le début du tour, ce que l'outil ne sait pas encore expliquer." },
    densite: { mailles: 0.95, rangs: 1 },
    consommation: 0.95,
    proprietes: { reversible: false, roule: true, elasticite: 2, chaleur: 1, niveau: 2 },
    ouvrages: {
      echarpe: possible("Son envers est différent et les côtés roulent : ajoute une bordure (mousse ou riz)."),
      snood: deconseille("L'outil ne sait pas encore expliquer ce point en rond."),
      bonnet: deconseille("L'outil ne sait pas encore expliquer ce point en rond."),
      couverture: possible("Ajouré et léger : plutôt une couverture de mi-saison, avec une bordure."),
    },
    zones: { bordure: deconseille("Il roule : une bordure en dentelle nouée s'enroulerait.") },
    resume: "Une dentelle légère de petits trous et de petits nœuds en quinconce, sur un fond de jersey.",
    source: TRICONAUTES + "point-fantaisie-4-rangs/",
  },
];
