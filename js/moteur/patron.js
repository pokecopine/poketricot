// Générateur du patron : à partir du plan vérifié, toutes les étapes et tous les rangs en toutes lettres.
// Le patron est une photographie : il garde ses textes, les recettes des points et les explications des gestes,
// pour qu'une correction ultérieure du catalogue ne le change jamais.

import { geste } from "../catalogue/gestes.js";
import { TECHNIQUES } from "../catalogue/techniques.js";
import { pointParId } from "../catalogue/points.js";
import { texteGestes, texteDeplacement } from "../catalogue/texte.js";
import { consomme, convertirEnRond } from "./simulateur.js";
import { nomAvecArticle } from "./dimensions.js";
import { formaterNombre, lireNombre } from "../donnees/reserve.js";

const majuscule = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const pluriel = (n, mot, motPluriel = mot + "s") => `${n} ${n > 1 ? motPluriel : mot}`;

/** Explications propres au patron (montage, lisière, rabattage, finitions), méthode continentale. */
export const TECHNIQUES_PATRON = {
  montage: {
    titre: "Montage tricoté",
    explication:
      "Fais un nœud coulant et pose-le sur l'aiguille gauche : c'est la 1re maille. Pique l'aiguille droite dedans comme pour une maille endroit, attrape le fil, ramène la boucle vers toi, puis pose-la sur l'aiguille gauche en la tournant d'un quart de tour. Recommence dans la dernière maille posée, jusqu'au nombre voulu. Ne serre pas : le bord doit rester aussi souple que le tricot.",
  },
  lisiere: {
    titre: "Lisière chaînette",
    explication:
      "À chaque rang, glisse la 1re maille sans la tricoter, fil devant (en piquant comme pour une maille envers), puis remets le fil derrière pour la suite. Tricote toujours la dernière maille à l'endroit. Les bords forment une petite chaîne régulière, bien nette.",
  },
  rabattage: {
    titre: "Rabattage simple",
    explication:
      "Tricote 2 mailles comme le rang le demande. Avec l'aiguille gauche, passe la 1re maille de l'aiguille droite par-dessus la 2e et laisse-la tomber. Tricote 1 maille de plus et recommence. À la fin, coupe le fil à 15 cm et passe-le dans la dernière maille. Rabats souplement : si le bord tire, prends une aiguille d'une taille au-dessus.",
  },
  fils: {
    titre: "Rentrer les fils",
    explication:
      "Enfile chaque bout de fil dans une aiguille à laine et fais-le passer dans les mailles de l'envers sur 5 à 8 cm, en zigzag, de préférence le long d'une lisière. Coupe ce qui dépasse seulement après le blocage.",
  },
  laine: {
    titre: "Changer de laine",
    explication:
      "Au début du rang, glisse la lisière comme d'habitude. Laisse pendre 15 cm de la nouvelle laine sur l'envers et tricote la maille suivante avec elle, en tenant le bout pour qu'il ne file pas ; continue tout le rang avec cette laine. L'ancienne laine est coupée à 15 cm, sauf si le patron dit de la laisser en attente. Les bouts se rentrent à la fin, chacun dans les mailles de sa couleur.",
  },
  porte: {
    titre: "Fil porté le long du bord",
    explication:
      "La laine qui ne sert pas reste attachée et attend au bord du tricot. Tous les 2 rangs, au début du rang, passe le fil du rang par-dessus le fil en attente avant de glisser la lisière : il monte ainsi le long du bord, sans boucle. Ne tire pas dessus, pour que le bord ne fronce pas. Quand le patron le dit, reprends-la : elle est déjà au bon endroit.",
  },
  intarsia: {
    titre: "Changer de couleur en intarsia (croiser les fils)",
    explication:
      "Chaque colonne a sa propre petite pelote, qui pend sur l'envers. Tricote les mailles d'une colonne avec sa pelote. En arrivant à la colonne suivante, lâche le fil, prends celui de la nouvelle couleur en le faisant passer par-dessous l'ancien, puis tricote : les deux fils se croisent et le tricot ne s'ouvre pas entre les deux colonnes. Fais-le à chaque changement de couleur, sur l'endroit comme sur l'envers. Ne tire pas trop sur la 1re maille de la nouvelle couleur. Les pelotes s'emmêlent un peu en tournant le travail : démêle-les de temps en temps.",
  },
  joindre: {
    titre: "Joindre en rond",
    explication:
      "Étale les mailles sur le câble et vérifie que le bord du montage est bien du même côté tout le long, sans tourner autour du câble : sinon le tricot serait vrillé, et on ne peut plus le rattraper. Place un marqueur sur l'aiguille droite : il marque le début du tour. Tricote la 1re maille de l'aiguille gauche en tirant bien le fil, pour fermer le cercle. À chaque fois que tu arrives au marqueur, un tour est fini : fais-le passer d'une aiguille à l'autre et continue.",
  },
  marqueur: {
    titre: "Déplacer le début du tour",
    explication:
      "Dans ce point, le motif se décale d'un tour à l'autre. Pour que chaque tour commence pile au début d'un motif, sans geste coupé en deux, on déplace le marqueur avant certains tours. Vers la gauche : retire le marqueur, glisse le nombre de mailles indiqué sur l'aiguille droite sans les tricoter (en piquant comme pour une maille envers), puis remets le marqueur. Vers la droite : retire le marqueur, remets le nombre de mailles indiqué de l'aiguille droite sur l'aiguille gauche, puis remets le marqueur. Les mailles glissées seront tricotées à la fin du tour, comme les autres.",
  },
  laineRond: {
    titre: "Changer de laine en rond",
    explication:
      "Au marqueur, laisse pendre 15 cm de la nouvelle laine à l'intérieur du tricot et tricote la 1re maille du tour avec elle, en tenant le bout pour qu'il ne file pas ; continue tout le tour avec cette laine. En rond, les tours forment une spirale : au changement de couleur, une petite marche se voit au début du tour. C'est normal ; tirer un peu le fil de la 1re maille au tour suivant l'atténue. L'ancienne laine est coupée à 15 cm, sauf si le patron dit de la laisser en attente.",
  },
  porteRond: {
    titre: "Laine en attente au début du tour",
    explication:
      "La laine qui ne sert pas reste attachée et attend au début du tour, à l'intérieur. Tous les 2 tours, au marqueur, passe le fil du tour par-dessus la laine en attente avant de tricoter la 1re maille : elle monte ainsi avec le tricot, sans boucle. Ne tire pas dessus. Quand le patron le dit, reprends-la : elle est déjà au bon endroit.",
  },
  rabattageSouple: {
    titre: "Rabattage souple",
    explication:
      "Tricote 2 mailles comme le tour le demande. Avec l'aiguille gauche, passe la 1re maille de l'aiguille droite par-dessus la 2e et laisse-la tomber. Tricote 1 maille de plus et recommence, tout autour. Tricote sans serrer, avec une aiguille d'une taille au-dessus si tu en as une : le bord doit s'étirer autant que le tricot, pour passer la tête. À la fin, coupe le fil à 15 cm et passe-le dans la dernière maille.",
  },
  filsRond: {
    titre: "Rentrer les fils",
    explication:
      "Enfile chaque bout de fil dans une aiguille à laine et fais-le passer dans les mailles de l'envers (l'intérieur du tricot) sur 5 à 8 cm, en zigzag, de préférence dans une bordure ou dans les mailles de sa couleur. Coupe ce qui dépasse seulement après le blocage.",
  },
  blocageRond: {
    titre: "Blocage",
    explication:
      "Laisse tremper le tricot un quart d'heure dans de l'eau tiède avec un peu de savon doux, sans frotter. Presse-le dans une serviette (sans tordre), puis pose-le à plat, sans l'étirer, et laisse-le sécher complètement. Les mailles se régularisent et les jours de la dentelle s'ouvrent.",
  },
  magicLoop: {
    titre: "Magic loop",
    explication:
      "Tout se tricote sur une seule aiguille circulaire à long câble (80 cm). Après le montage, fais glisser les mailles sur le câble et sépare-les en deux moitiés égales. Au milieu, tire une boucle de câble entre les deux moitiés. Ramène les deux moitiés sur les pointes, côte à côte, le fil de travail sur la moitié de derrière. Tire la pointe de derrière pour que ses mailles passent sur le câble, et tricote avec elle les mailles de devant. Arrivée au bout, tourne le travail, refais glisser les mailles sur les pointes, et tricote l'autre moitié. Deux moitiés = un tour. Tire bien le fil à chaque changement de moitié pour ne pas faire d'échelle.",
  },
  sommet: {
    titre: "Diminuer au sommet",
    explication:
      "Le sommet est partagé en 8 parts égales, comme un gâteau. À chaque tour de diminutions, tricote les mailles de la part comme le patron le dit, puis les 2 dernières mailles de la part ensemble à l'endroit : pique l'aiguille droite dans les 2 mailles à la fois, comme pour une maille endroit, et tricote-les comme une seule. La diminution tombe toujours au même endroit : 8 lignes montent vers le centre. Si tu veux, place un anneau marqueur à la fin de chaque part : la diminution se fait juste avant lui.",
  },
  fermeture: {
    titre: "Fermer le sommet",
    explication:
      "Coupe le fil en laissant 20 cm et enfile-le dans une aiguille à laine. Passe-la dans chacune des mailles restantes, comme pour une maille envers, en les faisant tomber de l'aiguille une à une. Tire doucement le fil : les mailles se resserrent en rond et le trou se ferme. Passe l'aiguille à travers le centre vers l'intérieur, fais un ou deux points pour bloquer, puis rentre le fil.",
  },
  pompon: {
    titre: "Faire un pompon",
    explication:
      "Découpe deux disques de carton du diamètre du pompon, avec un trou au milieu de la moitié de ce diamètre (une fente d'un côté aide à les sortir). Pose-les l'un sur l'autre et enroule la laine tout autour, en passant par le trou, jusqu'à ce que le trou soit plein. Glisse la pointe des ciseaux entre les deux cartons et coupe tous les fils sur le bord. Passe un fil solide entre les deux cartons, serre très fort et fais deux nœuds. Retire les cartons, secoue le pompon et égalise-le aux ciseaux. Garde les deux bouts du nœud pour le coudre au sommet du bonnet.",
  },
  couture: {
    titre: "Maille de couture",
    explication:
      "La 1re et la dernière maille de chaque rang servent à la couture : tricote-les en jersey, à l'endroit sur un rang endroit et à l'envers sur un rang envers. Ne les glisse pas. Elles forment un bord régulier, où l'aiguille à laine passera facilement, et elles disparaissent à l'intérieur une fois la couture faite.",
  },
  matelas: {
    titre: "Couture au point de matelas",
    explication:
      "Pose la pièce à plat, endroit vers toi, et rapproche les deux bords côte à côte. Enfile le fil gardé au montage dans l'aiguille à laine. Entre la maille de couture et la maille d'à côté, il y a un petit brin horizontal à chaque rang. Prends ce brin sur un bord, puis le brin du même rang sur l'autre bord, puis le brin du rang suivant sur le premier bord, et ainsi de suite, en remontant d'un rang à chaque fois. Tous les 2 cm, tire doucement le fil : les bords se rejoignent et les mailles de couture passent à l'intérieur. Ne serre pas trop, la couture doit s'étirer comme le tricot. En haut, fais un petit point pour bloquer et rentre le fil à l'intérieur.",
  },
  rabattageJambiere: {
    titre: "Rabattage souple",
    explication:
      "Tricote 2 mailles comme elles se présentent. Avec l'aiguille gauche, passe la 1re maille de l'aiguille droite par-dessus la 2e et laisse-la tomber. Tricote 1 maille de plus et recommence. Rabats sans serrer, avec une aiguille d'une taille au-dessus si tu en as une : le bord doit s'étirer autant que les côtes, pour passer le pied et ne pas serrer la jambe. À la fin, coupe le fil à 15 cm et passe-le dans la dernière maille.",
  },
  blocage: {
    titre: "Blocage",
    explication:
      "Laisse tremper l'écharpe un quart d'heure dans de l'eau tiède avec un peu de savon doux, sans frotter. Presse-la dans une serviette (sans tordre), puis étale-la à plat aux bonnes dimensions et laisse-la sécher complètement. Les mailles se régularisent et les jours de la dentelle s'ouvrent.",
  },
};

/**
 * Décrit une suite de gestes de façon compacte : « 2 mailles endroit, *1 maille endroit, 1 maille envers* 14 fois, 1 maille endroit ».
 * Cherche le motif qui se répète le plus longtemps (au moins 2 fois).
 */
export function decrireGestes(gestes, { abreviations = false } = {}) {
  const n = gestes.length;
  if (n === 0) return "";
  const options = { abreviations };
  if (gestes.every((c) => c === gestes[0])) return texteGestes(gestes, options);
  let meilleur = null;
  for (let d = 0; d <= Math.min(8, n - 2); d++) {
    for (let p = 1; p <= Math.min(40, Math.floor((n - d) / 2)); p++) {
      let k = 1;
      while (d + (k + 1) * p <= n && gestes.slice(d + k * p, d + (k + 1) * p).every((c, i) => c === gestes[d + i])) k++;
      if (k < 2) continue;
      const couvert = k * p;
      // Un motif d'une seule sorte de geste se dit plus simplement sans étoiles.
      const bloc = gestes.slice(d, d + p);
      if (bloc.every((c) => c === bloc[0])) continue;
      if (!meilleur || couvert > meilleur.couvert || (couvert === meilleur.couvert && p < meilleur.p)) meilleur = { d, p, k, couvert };
    }
  }
  if (!meilleur || meilleur.couvert < n / 2) return texteGestes(gestes, options);
  const { d, p, k } = meilleur;
  const morceaux = [];
  if (d > 0) morceaux.push(texteGestes(gestes.slice(0, d), options));
  morceaux.push(`*${texteGestes(gestes.slice(d, d + p), options)}* ${k} fois`);
  const reste = gestes.slice(d + k * p);
  if (reste.length) morceaux.push(texteGestes(reste, options));
  return morceaux.join(", ");
}

const NOMS_SEGMENTS = { bandeD: "Bande latérale", bandeG: "Bande latérale", corps: null };

/** Étiquette d'une colonne : « Colonne 2 · point de riz » ; en intarsia, « Col. 2 · jersey · Mérinos écru ». */
function etiquetteColonne(s, laine = null) {
  const p = pointParId(s.pointId);
  if (laine) return `Col. ${s.colonne}${p ? ` · ${minuscule(p.nom)}` : ""} · ${laine.nom}`;
  return `Colonne ${s.colonne}${p ? ` · ${minuscule(p.nom)}` : ""}`;
}

/**
 * Lignes d'un rang du plan, dans l'ordre où on tricote.
 * Les zones voisines tricotées pareil (bordure en mousse et bandes latérales en mousse) sont réunies.
 */
export function lignesDuRang(rang, nomBloc, { abreviations = false, rond = false, laines = null } = {}) {
  if (rang.sommet) return [{ zone: "corps", etiquette: `Sommet (${rang.sommet.avant} m.)`, texte: texteDuSommet(rang, { abreviations }) }];
  const lignes = [];
  const segments = rang.segments;
  const premier = segments[0]?.lisiere ? segments[0] : null;
  const dernier = segments.at(-1)?.lisiere ? segments.at(-1) : null;
  const milieu = segments.filter((s) => !s.lisiere);
  const texteCouture = (s) => (s.gestes[0] === "env"
    ? (abreviations ? "1 env. (couture)" : "1 maille envers (maille de couture)")
    : (abreviations ? "1 end. (couture)" : "1 maille endroit (maille de couture)"));
  if (premier) lignes.push({ zone: "lisiere", texte: premier.couture ? texteCouture(premier) : abreviations ? "1 gl. f. dev. (lisière)" : "Glisse la 1re maille, fil devant (lisière)" });
  const tous = milieu.flatMap((s) => s.gestes);
  if (milieu.length > 1 && !rang.intarsia && tous.every((c) => c === tous[0])) {
    lignes.push({ zone: "tout", texte: majuscule(texteGestes(tous, { abreviations })) });
  } else {
    for (const s of milieu) {
      // En intarsia, chaque colonne nomme sa laine et porte sa couleur (pastille dans le suivi).
      const laine = rang.intarsia && s.colonne && laines ? laines.get(s.laineId) || laines.values().next().value : null;
      const etiquette = s.colonne
        ? etiquetteColonne(s, laine)
        : s.zone === "corps" ? (rang.type === "transition" ? (rond ? "Tour de transition" : "Rang de transition") : majuscule(nomBloc)) : NOMS_SEGMENTS[s.zone];
      lignes.push({
        zone: s.zone, etiquette: `${etiquette} (${consomme(s.gestes)} m.)`, texte: majuscule(decrireGestes(s.gestes, { abreviations })),
        ...(laine ? { couleur: laine.couleur || null } : {}),
      });
    }
  }
  if (dernier) lignes.push({ zone: "lisiere", texte: dernier.couture ? texteCouture(dernier) : abreviations ? "1 end. (lisière)" : "Tricote la dernière maille à l'endroit (lisière)" });
  return lignes;
}

/**
 * Un tour du sommet du bonnet (0.17.0) : « *7 mailles en riz (…), 2 mailles ensemble à l'endroit*, 8 fois » ;
 * sans diminution : « Tout le tour en riz, sans diminuer (64 mailles) ».
 */
export function texteDuSommet(rang, { abreviations = false } = {}) {
  const { sommet } = rang;
  const s = rang.segments[0];
  const point = pointParId(s.pointId);
  const uni = sommet.base?.length === 1 ? sommet.base[0] : null;
  const k = sommet.avant / sommet.parts;
  const n = sommet.diminution ? k - 2 : null;
  const commentFaire = point && point.id !== "jersey" && sommet.lecture ? ` (${sommet.lecture})` : "";
  const enPoint = point ? `en ${minuscule(point.nom)}` : "";
  if (!sommet.diminution) {
    if (uni) return `Tout le tour ${uni === "end" ? "à l'endroit" : "à l'envers"}, sans diminuer (${sommet.apres} mailles)`;
    return `Tout le tour ${enPoint}${commentFaire}, sans diminuer (${sommet.apres} mailles)`;
  }
  const dim = abreviations ? geste("2ens").abrege : "2 mailles ensemble à l'endroit";
  let avant = "";
  if (n > 0) {
    if (uni) avant = `${texteGestes(Array(n).fill(uni), { abreviations })}, `;
    else avant = `${n} maille${n > 1 ? "s" : ""} ${enPoint}${commentFaire}, `;
  }
  return `*${avant}${dim}*, ${sommet.parts} fois`;
}

/** Codes des gestes d'un rang, dans l'ordre d'apparition. */
function gestesDuRang(rang) {
  const vus = [];
  for (const s of rang.segments) for (const c of s.gestes) if (!vus.includes(c)) vus.push(c);
  return vus;
}

/** Distance (en rangs) au-delà de laquelle une laine en attente est coupée plutôt que portée le long du bord. */
export const RANGS_MAX_FIL_PORTE = 8;

const guillemets = (l) => `« ${l?.nom || "ta laine"} »`;

/**
 * Changements de laine, rang par rang.
 * Une laine qui attend pendant un nombre pair de rangs (8 au plus) peut être portée le long du bord (option filPorte) :
 * elle attend du côté où le rang commence. Sinon, elle est coupée.
 * rangsLaine : la laine de chaque rang (id). Renvoie { parRang: Map(index → changement), croisements: Set(index), bouts }.
 */
export function changementsDeLaine(rangsLaine, { filPorte = false, rond = false, portable = () => true } = {}) {
  const parRang = new Map();
  const croisements = new Set();
  if (!rangsLaine.length) return { parRang, croisements, bouts: 0 };
  // Suites de rangs dans la même laine.
  const suites = [];
  rangsLaine.forEach((l, i) => {
    if (!suites.length || suites.at(-1).laineId !== l) suites.push({ laineId: l, debut: i });
  });
  let bouts = 2; // le bout du montage et celui du rabattage
  const enAttente = new Map(); // laine → rang où elle a été laissée
  for (let k = 1; k < suites.length; k++) {
    const { laineId: nouvelle, debut } = suites[k];
    const ancienne = suites[k - 1].laineId;
    const prochaine = suites.slice(k + 1).find((x) => x.laineId === ancienne);
    const ecart = prochaine ? prochaine.debut - debut : null;
    // À plat, la laine attend du côté où le rang commence : il faut un nombre pair de rangs. En rond, elle attend au début du tour.
    const porter = filPorte && ecart !== null && (rond || ecart % 2 === 0) && ecart <= RANGS_MAX_FIL_PORTE && portable(ancienne) && portable(nouvelle);
    if (porter) {
      enAttente.set(ancienne, debut);
      for (let i = debut + 2; i < prochaine.debut; i += 2) croisements.add(i);
    } else {
      bouts += 1; // l'ancienne laine est coupée
    }
    const reprise = enAttente.has(nouvelle);
    if (reprise) enAttente.delete(nouvelle);
    else bouts += 1; // la nouvelle laine commence
    parRang.set(debut, { ancienne, nouvelle, porter, reprise });
  }
  return { parRang, croisements, bouts };
}

/** Lignes d'un changement de laine (en début de rang, avant la lisière). */
function lignesChangement(c, laines, { abreviations = false, rond = false } = {}) {
  const a = laines.get(c.ancienne);
  const n = laines.get(c.nouvelle);
  if (abreviations) {
    return `Chgt laine : ${c.porter ? `${a?.nom || "ancienne"} en attente` : `couper ${a?.nom || "ancienne"}`}, ${c.reprise ? "reprendre" : "prendre"} ${n?.nom || "nouvelle"}`;
  }
  const ou = rond ? "au début du tour" : "au bord";
  const avant = c.porter ? `Laisse ${guillemets(a)} en attente ${ou}, sans la couper` : `Coupe ${guillemets(a)} en laissant 15 cm`;
  const apres = c.reprise ? `reprends ${guillemets(n)}, qui attend ${ou}` : `commence le ${rond ? "tour" : "rang"} avec ${guillemets(n)}`;
  return `${avant}, puis ${apres}`;
}

/**
 * Construit le patron.
 * entree = { projet, plan, laine, aiguilles, echantillon, densites, metrage, laineSuffit, laines, parLaine, maintenant }
 * laines : les laines du projet (la principale et celles des blocs) ; parLaine : métrage de chacune (calculerProjet).
 */
export function genererPatron({
  projet, plan, laine, aiguilles, echantillon, densites, metrage, laineSuffit, laines = [], parLaine = [], maintenant = new Date(),
}) {
  const dCorps = densites?.[projet.pointPrincipal];
  const approximatif = !dCorps || dCorps.statut !== "mesuree";
  const rond = plan.mode === "rond";
  const motRang = rond ? "tour" : "rang";
  const piece = { echarpe: "l'écharpe", snood: "le snood", bonnet: "le bonnet", jambieres: "chaque jambière" }[plan.type] || "la pièce";
  const bonnet = plan.type === "bonnet";
  // Jambières (0.19.0) : le patron décrit une jambière, à tricoter 2 fois ; à plat, une couture au point de matelas.
  const jambieres = plan.type === "jambieres";
  const exemplaires = plan.exemplaires || 1;
  const couture = jambieres && plan.couture ? plan.couture : null;
  const magicLoop = bonnet || (jambieres && rond);
  const filCouture = couture ? `${formaterNombre(couture.filCm / 100, 1)} m` : null;
  const nomBlocDe = (id) => {
    const b = plan.blocs.find((x) => x.id === id);
    if (!b) return "";
    if (b.section) return b.nom;
    // Un corps coupé par des bandes : « corps (partie 2) ».
    const parties = plan.blocs.filter((x) => x.zone === "corps");
    if (b.zone === "corps" && parties.length > 1) return `corps, partie ${parties.indexOf(b) + 1}`;
    return b.nom;
  };

  // ---- Laines : la principale, puis celles des blocs ----
  const principaleId = laine?.id || "principale";
  const mesLaines = new Map([[principaleId, laine || { id: principaleId, nom: "ta laine" }]]);
  for (const l of laines) if (l && !mesLaines.has(l.id)) mesLaines.set(l.id, l);
  const laineDuRang = (r) => (r.laineId && mesLaines.has(r.laineId) ? r.laineId : principaleId);
  // Intarsia (E3c-4) : un bloc dont les colonnes ont des laines différentes se tricote avec une petite pelote par colonne.
  const CLE_INTARSIA = "intarsia:";
  const cleDuRang = (r) => (r.intarsia ? CLE_INTARSIA + r.blocId : laineDuRang(r));
  const estIntarsia = (cle) => String(cle).startsWith(CLE_INTARSIA);
  const changements = changementsDeLaine(plan.rangs.map(cleDuRang), { filPorte: !!projet.filPorte, rond, portable: (c) => !estIntarsia(c) });
  const plusieurs = mesLaines.size > 1;
  const nomDeLaine = (id) => mesLaines.get(id && mesLaines.has(id) ? id : principaleId);
  const pelotesDuBloc = (b) => {
    if (!b?.intarsia) return [];
    const parLaine = new Map();
    for (const c of b.colonnes) {
      const id = c.laineId && mesLaines.has(c.laineId) ? c.laineId : principaleId;
      parLaine.set(id, (parLaine.get(id) || 0) + 1);
    }
    return [...parLaine].map(([laineId, nombre]) => ({ laineId, nombre, laine: mesLaines.get(laineId) }));
  };
  const textePelotes = (b) => {
    const p = pelotesDuBloc(b);
    const n = p.reduce((t, x) => t + x.nombre, 0);
    return `${n} petites pelotes : ${p.map((x) => `${x.nombre} en ${guillemets(x.laine)}`).join(", ")}`;
  };
  const blocDeCle = (cle) => plan.blocs.find((b) => CLE_INTARSIA + b.id === cle);

  // ---- Techniques : chaque geste expliqué au premier rang qui l'utilise ----
  const techniques = { ...TECHNIQUES_PATRON };
  const dejaVus = new Set(["end", "env"]);
  let hauteur = 0;
  const rangs = plan.rangs.map((r, index) => {
    hauteur += r.hauteurCm;
    const bloc = plan.blocs.find((b) => b.id === r.blocId);
    const corps = r.segments.find((s) => s.zone === "corps");
    const point = corps?.pointId ? pointParId(corps.pointId) : null;
    const enColonnes = !!bloc?.colonnes;
    const nouveaux = [];
    const codes = gestesDuRang(r);
    for (const code of codes) {
      if (TECHNIQUES[code] && !techniques[code]) techniques[code] = { titre: TECHNIQUES[code].titre, explication: TECHNIQUES[code].explication };
      if (dejaVus.has(code)) continue;
      dejaVus.add(code);
      if (TECHNIQUES[code]) nouveaux.push(code);
    }
    if (r.numero === 1 && plan.lisieres.mailles) nouveaux.unshift("lisiere");
    if (r.marqueur && !dejaVus.has("marqueur")) {
      dejaVus.add("marqueur");
      nouveaux.unshift("marqueur");
    }
    const nomPoint = enColonnes ? `${majuscule(nomBlocDe(r.blocId))} en colonnes` : point ? majuscule(point.nom) : "";
    if (r.sommet?.diminution && !dejaVus.has("sommet")) {
      dejaVus.add("sommet");
      nouveaux.unshift("sommet");
    }
    let repere;
    if (r.sommet) repere = r.sommet.diminution ? `Sommet · diminution ${r.sommet.diminution} sur ${r.sommet.diminutions}` : "Sommet · sans diminuer";
    else if (r.type === "transition") repere = rond ? "Tour de transition" : "Rang de transition";
    else if (r.type === "miseEnPlace") repere = `${nomPoint} · mise en place`;
    else repere = `${nomPoint} · ${motRang} ${r.numeroMotif} du motif${r.rangsDuMotif > 1 ? ` sur ${r.rangsDuMotif}` : ""}`;

    // Changement de laine, ou laine en attente à croiser : une ligne avant la lisière.
    const laineId = laineDuRang(r);
    const changement = changements.parRang.get(index);
    const avant = [];
    const avantAbrege = [];
    if (r.marqueur) {
      avant.push({ zone: "marqueur", texte: texteDeplacement(r.marqueur.mailles, r.marqueur.sens) + (r.marqueur.raison === "retour" ? " Il retrouve ainsi sa place de départ." : "") });
      avantAbrege.push({ zone: "marqueur", texte: texteDeplacement(r.marqueur.mailles, r.marqueur.sens, { abreviations: true }) });
    }
    const entreIntarsia = r.intarsia && (index === 0 || (changement && estIntarsia(changement.nouvelle)));
    if (changement && (estIntarsia(changement.nouvelle) || estIntarsia(changement.ancienne))) {
      // Entrée ou sortie d'un bloc en intarsia.
      const sortie = estIntarsia(changement.ancienne) ? blocDeCle(changement.ancienne) : null;
      const morceaux = [];
      morceaux.push(sortie ? "Coupe les petites pelotes en laissant 15 cm" : `Coupe ${guillemets(nomDeLaine(changement.ancienne))} en laissant 15 cm`);
      morceaux.push(entreIntarsia
        ? `prépare ${textePelotes(bloc)} (une par colonne) et commence le rang, chaque colonne avec sa pelote`
        : `commence le rang avec ${guillemets(nomDeLaine(changement.nouvelle))}`);
      const couleur = entreIntarsia ? null : nomDeLaine(changement.nouvelle)?.couleur || null;
      avant.push({ zone: "laine", couleur, texte: `${morceaux[0]}, puis ${morceaux[1]}` });
      avantAbrege.push({ zone: "laine", couleur, texte: entreIntarsia ? `Chgt laine : ${textePelotes(bloc)}` : `Chgt laine : couper les pelotes, prendre ${nomDeLaine(changement.nouvelle)?.nom}` });
      if (!entreIntarsia && !dejaVus.has("laine")) {
        dejaVus.add("laine");
        nouveaux.unshift("laine");
      }
    } else if (entreIntarsia) {
      avant.push({ zone: "laine", texte: `Prépare ${textePelotes(bloc)} (une par colonne) : chaque colonne se tricote avec sa pelote` });
      avantAbrege.push({ zone: "laine", texte: textePelotes(bloc) });
    } else if (changement) {
      const couleur = mesLaines.get(changement.nouvelle)?.couleur || null;
      avant.push({ zone: "laine", couleur, texte: lignesChangement(changement, mesLaines, { rond }) });
      avantAbrege.push({ zone: "laine", couleur, texte: lignesChangement(changement, mesLaines, { abreviations: true }) });
      const tLaine = rond ? "laineRond" : "laine";
      const tPorte = rond ? "porteRond" : "porte";
      if (!dejaVus.has(tLaine)) {
        dejaVus.add(tLaine);
        nouveaux.unshift(tLaine);
      }
      if (changement.porter && !dejaVus.has(tPorte)) {
        dejaVus.add(tPorte);
        nouveaux.unshift(tPorte);
      }
    } else if (changements.croisements.has(index)) {
      avant.push({ zone: "laine", texte: rond ? "Au début du tour, croise le fil du tour avec la laine en attente" : "Avant la lisière, croise le fil du rang avec la laine en attente" });
      avantAbrege.push({ zone: "laine", texte: "Croiser avec la laine en attente" });
    }
    if (r.intarsia && !dejaVus.has("intarsia")) {
      dejaVus.add("intarsia");
      nouveaux.unshift("intarsia");
    }
    return {
      numero: r.numero,
      cote: r.cote,
      blocId: r.blocId,
      nomBloc: nomBlocDe(r.blocId),
      debutBloc: bloc?.premierRang === r.numero,
      type: r.type,
      numeroMotif: r.numeroMotif,
      rangsDuMotif: r.rangsDuMotif,
      pointId: corps?.pointId || null,
      repere,
      mailles: r.mailles,
      gestes: codes,
      laineId: plusieurs ? laineId : undefined,
      lignes: [...avant, ...lignesDuRang(r, nomBlocDe(r.blocId), { rond, laines: mesLaines })],
      lignesAbregees: [...avantAbrege, ...lignesDuRang(r, nomBlocDe(r.blocId), { abreviations: true, rond, laines: mesLaines })],
      ...(r.intarsia ? { intarsia: true } : {}),
      ...(r.marqueur ? { marqueur: r.marqueur } : {}),
      ...(r.sommet ? { sommet: { diminution: r.sommet.diminution, diminutions: r.sommet.diminutions, avant: r.sommet.avant, apres: r.sommet.apres } } : {}),
      techniques: nouveaux,
      longueurCm: Math.round(hauteur * 10) / 10,
    };
  });

  // Un rang qui se répète à l'identique peut être dit « comme le rang n ».
  const texteCle = (r) => JSON.stringify([r.cote, r.laineId || null, r.lignes]);
  const premiers = new Map();
  for (const r of rangs) {
    const cle = texteCle(r);
    if (premiers.has(cle)) r.commeLeRang = premiers.get(cle);
    else premiers.set(cle, r.numero);
  }

  // ---- Étapes ----
  const t = plan.montage.repartition;
  const motBord = couture ? ["maille de couture", "mailles de couture"] : ["lisière", "lisières"];
  const repartition = [
    t.bordD ? pluriel(t.bordD, ...motBord) : null,
    t.bandeD ? `${t.bandeD} de bande latérale` : null,
    `${t.corps} pour le corps`,
    t.bandeG ? `${t.bandeG} de bande latérale` : null,
    t.bordG ? pluriel(t.bordG, ...motBord) : null,
  ].filter(Boolean).join(", ");

  const etapes = [];
  const metresDe = (id) => parLaine.find((x) => x.laineId === id)?.metres;
  const lignesLaines = plusieurs
    ? [...mesLaines.values()].map((l, i) => {
        const m = metresDe(l.id) ?? (i === 0 ? metrage?.metres : null);
        return `${l.nom}${m ? ` : environ ${m} m` : ""}${i === 0 ? " (laine principale)" : ""}`;
      })
    : [`${laine?.nom || "Ta laine"}${metrage ? ` : environ ${metrage.metres} m${exemplaires > 1 ? " pour la paire" : ""}` : ""}`];
  const blocsIntarsia = plan.blocs.filter((b) => b.intarsia);
  const nbPelotes = blocsIntarsia.reduce((t, b) => t + b.colonnes.length, 0);
  const materiel = [
    ...lignesLaines,
    ...(blocsIntarsia.length
      ? [`De quoi préparer ${nbPelotes} petites pelotes pour l'intarsia (${blocsIntarsia.map((b) => `${majuscule(nomBlocDe(b.id))} : ${textePelotes(b).replace(/^\d+ petites pelotes : /, "")}`).join(" ; ")})`]
      : []),
    `Aiguilles circulaires de ${formaterNombre(lireNombre(aiguilles.tailleMm), 2)} mm${lireNombre(aiguilles.cableCm) ? `, câble ${formaterNombre(lireNombre(aiguilles.cableCm), 0)} cm` : ""} (${magicLoop ? "on tricote en rond, en magic loop : câble de 80 cm conseillé" : rond ? "on tricote en rond" : "on tricote à plat, en allers-retours"})`,
    ...(rond ? ["Un marqueur de début de tour (un anneau ou un bout de laine d'une autre couleur)"] : []),
    ...(bonnet && plan.pompon ? [`Un morceau de carton pour le pompon (deux disques de ${formaterNombre(plan.pompon.cm, 0)} cm)`] : []),
    couture ? "Une aiguille à laine pour la couture et pour rentrer les fils" : "Une aiguille à laine pour rentrer les fils",
    "Une paire de ciseaux",
  ];
  if (exemplaires > 1) materiel.unshift(`Ce patron décrit une jambière : tricote-le ${exemplaires} fois pour la paire (la laine est comptée pour les deux)`);
  etapes.push({ cle: "materiel", titre: "Matériel", detail: materiel.join(" · "), liste: materiel });
  etapes.push(rond
    ? {
      cle: "montage", titre: "Montage", detail: `Monter ${plan.montage.mailles} mailles, joindre en rond`,
      texte: magicLoop
        ? `Monte ${plan.montage.mailles} mailles avec le montage tricoté. Sépare-les en deux moitiés pour le magic loop (${Math.ceil(plan.montage.mailles / 2)} et ${Math.floor(plan.montage.mailles / 2)}). Joins en rond sans vriller les mailles et place un marqueur : il marque le début du tour. ${bonnet ? "Tout le bonnet" : "Toute la jambière"} se tricote en magic loop.`
        : `Monte ${plan.montage.mailles} mailles avec le montage tricoté. Joins en rond sans vriller les mailles et place un marqueur : il marque le début du tour.`,
      techniques: magicLoop ? ["montage", "magicLoop", "joindre"] : ["montage", "joindre"],
    }
    : {
      cle: "montage", titre: "Montage", detail: `Monter ${plan.montage.mailles} mailles (montage tricoté)`,
      texte: couture
        ? `Laisse pendre un fil d'environ ${filCouture} avant la 1re maille : il servira à la couture. Monte ${plan.montage.mailles} mailles avec le montage tricoté : ${repartition}.`
        : `Monte ${plan.montage.mailles} mailles avec le montage tricoté : ${repartition}.`,
      techniques: ["montage"],
    });
  for (const b of plan.blocs) {
    const point = pointParId(b.pointId);
    const transitions = plan.rangs.filter((r) => r.blocId === b.id && r.type === "transition").length;
    const nomPoints = b.colonnes
      ? `${b.colonnes.length} colonnes`
      : point ? majuscule(point.nom) : "";
    const autreLaine = !b.intarsia && b.laineId && b.laineId !== principaleId ? mesLaines.get(b.laineId) : null;
    const colonnesTexte = b.colonnes
      ? ` En colonnes, ${rond ? "depuis le marqueur, tout autour" : "du bord droit (début des rangs endroit) au bord gauche"} : ${b.colonnes
          .map((c, j) => `colonne ${j + 1} en ${minuscule(pointParId(c.pointId)?.nom || "")}${b.intarsia ? ` dans ${guillemets(nomDeLaine(c.laineId))}` : ""} (${c.mailles} mailles)`)
          .join(", ")}.${b.intarsia ? ` Intarsia : ${textePelotes(b)}, une par colonne ; les bords se tricotent avec la pelote de la colonne d'à côté.` : ""}`
      : "";
    etapes.push({
      cle: "bloc", blocId: b.id, titre: majuscule(nomBlocDe(b.id)),
      detail: `${nomPoints}${autreLaine ? ` · ${autreLaine.nom}` : ""} · ${b.premierRang === b.dernierRang ? `${motRang} ${b.premierRang}` : `${motRang}s ${b.premierRang} à ${b.dernierRang}`}`,
      texte: `${b.rangs} ${motRang}${b.rangs > 1 ? "s" : ""}, environ ${formaterNombre(b.hauteurCm)} cm${transitions ? `, dont ${transitions} ${motRang} de transition au début` : ""}.${colonnesTexte}${autreLaine ? ` Avec ${guillemets(autreLaine)}, sur ${rond ? "tout le tour" : "toute la largeur"}.` : ""}${
        plan.rangs.some((r, i) => r.blocId === b.id && changements.croisements.has(i))
          ? rond ? " Tous les 2 tours, au début du tour, croise le fil du tour avec la laine en attente." : " Tous les 2 rangs, avant la lisière, croise le fil du rang avec la laine en attente."
          : ""}${b.marqueur ? " Le motif se décale d'un tour à l'autre : avant certains tours, le patron te dit de déplacer le marqueur." : ""}${
        bonnet && b.zone === "bas" && plan.revers ? " Ce bord se repliera en deux à la fin : c'est le revers." : ""}${
        b.zone === "sommet" ? ` ${plan.sommet.diminutions} tours de diminutions (8 diminutions chacun), un tour sur deux puis à chaque tour, jusqu'à ${plan.rabattage.mailles} mailles.${plan.sommet.jersey && plan.sommet.raison ? ` ${plan.sommet.raison}` : ""}` : ""}`,
      premierRang: b.premierRang, dernierRang: b.dernierRang, pointId: b.pointId, laineId: autreLaine?.id || null,
    });
  }
  const dernierRang = rangs.at(-1);
  if (bonnet) {
    etapes.push({
      cle: "rabattage", titre: "Fermer le sommet",
      detail: `Passer le fil dans les ${plan.rabattage.mailles} mailles et serrer`,
      texte: `Il reste ${plan.rabattage.mailles} mailles. Coupe le fil en laissant 20 cm, passe-le dans les ${plan.rabattage.mailles} mailles avec l'aiguille à laine, serre bien, et rentre le fil à l'intérieur.`,
      techniques: ["fermeture"],
    });
    if (plan.pompon) {
      const lp = nomDeLaine(plan.pompon.laineId);
      etapes.push({
        cle: "pompon", titre: "Le pompon",
        detail: `Pompon de ${formaterNombre(plan.pompon.cm, 0)} cm${plusieurs ? ` en ${guillemets(lp)}` : ""}`,
        texte: `Fais un pompon de ${formaterNombre(plan.pompon.cm, 0)} cm${plusieurs ? ` avec ${guillemets(lp)}` : ""}, puis couds-le au sommet avec les deux bouts du nœud, en les passant à travers le centre vers l'intérieur.`,
        techniques: ["pompon"],
      });
    }
  } else etapes.push(rond
    ? {
      cle: "rabattage", titre: "Rabattage",
      detail: `Rabattre les ${plan.rabattage.mailles} mailles, souplement`,
      texte: `Au marqueur, rabats les ${plan.rabattage.mailles} mailles souplement, en tricotant chaque maille comme elle se présente : le bord doit pouvoir passer ${jambieres ? "le pied" : "la tête"}. Retire le marqueur en arrivant dessus.`,
      techniques: ["rabattage"],
    }
    : {
      cle: "rabattage", titre: "Rabattage",
      detail: `Rabattre les ${plan.rabattage.mailles} mailles, souplement`,
      texte: `Sur l'${dernierRang.cote === "E" ? "envers" : "endroit"}, rabats les ${plan.rabattage.mailles} mailles avec le rabattage ${jambieres ? "souple" : "simple"}, en tricotant chaque maille comme elle se présente.`,
      techniques: ["rabattage"],
    });
  if (couture) {
    etapes.push({
      cle: "assemblage", titre: "Assemblage",
      detail: "Coudre au point de matelas, du bas vers le haut",
      texte: `Ferme la jambière par une couture au point de matelas, du bas vers le haut, avec le fil gardé au montage (environ ${filCouture}) : ${plan.rangs.length} rangs à coudre, endroit vers toi.`,
      techniques: ["matelas"],
    });
  }
  // Une petite pelote = 2 bouts (début et fin) ; le bloc en intarsia était compté comme une seule laine.
  const bouts = changements.bouts + blocsIntarsia.reduce((t, b) => t + 2 * b.colonnes.length - 2, 0);
  etapes.push({
    cle: "finitions", titre: "Finitions", detail: "Rentrer les fils, bloquer",
    texte: bouts > 2
      ? `Rentre les ${bouts} bouts de fil (début, fin et changements de laine)${jambieres ? " de chaque jambière" : ""}, chacun dans les mailles de sa couleur, puis bloque ${piece} pour régulariser les mailles.${bonnet && plan.revers ? " Une fois sec, replie le bord en deux vers l'extérieur : c'est le revers." : ""}`
      : `Rentre les deux bouts de fil (début et fin)${jambieres ? " de chaque jambière" : ""}, puis bloque ${piece} pour régulariser les mailles.${bonnet && plan.revers ? " Une fois sec, replie le bord en deux vers l'extérieur : c'est le revers." : ""}`,
    techniques: ["fils", "blocage"],
  });

  if (jambieres) techniques.rabattage = techniques.rabattageJambiere;
  else if (rond) techniques.rabattage = techniques.rabattageSouple;
  if (couture) techniques.lisiere = techniques.couture;
  if (rond) {
    techniques.fils = techniques.filsRond;
    techniques.blocage = techniques.blocageRond;
    delete techniques.lisiere;
    delete techniques.laine;
    delete techniques.porte;
  }
  for (const c of ["rabattageSouple", "rabattageJambiere", "filsRond", "blocageRond", "couture"]) delete techniques[c];
  if (!couture) delete techniques.matelas;
  if (!rond) for (const c of ["joindre", "marqueur", "laineRond", "porteRond"]) delete techniques[c];
  if (!bonnet) for (const c of [...(magicLoop ? [] : ["magicLoop"]), "sommet", "fermeture", "pompon"]) delete techniques[c];
  else {
    delete techniques.rabattage;
    if (!plan.pompon) delete techniques.pompon;
  }
  if (!blocsIntarsia.length) delete techniques.intarsia;
  if (jambieres && !rond) techniques.blocage = { ...techniques.blocage, explication: TECHNIQUES_PATRON.blocageRond.explication };

  // ---- Copie des points utilisés (recettes figées) ----
  const pointIds = [...new Set([
    ...plan.blocs.flatMap((b) => [b.pointId, ...(b.colonnes || []).map((c) => c.pointId)]),
    plan.bandesLaterales?.pointId,
  ].filter(Boolean))];
  const points = {};
  for (const id of pointIds) {
    const p = pointParId(id);
    if (!p) continue;
    const copie = { id: p.id, nom: p.nom, article: p.article, famille: p.famille, resume: p.resume, rangs: p.rangs, miseEnPlace: p.miseEnPlace, proprietes: p.proprietes, source: p.source };
    if (rond) {
      const r = convertirEnRond(p);
      if (r.ok) copie.rond = { rangs: r.rangs, miseEnPlace: r.miseEnPlace, marqueur: r.marqueur };
    }
    points[id] = structuredClone(copie);
  }

  const explications = [...(plan.explications || [])];
  const resumeBlocs = plan.blocs.map((b) => {
    const pts = b.colonnes
      ? `${b.colonnes.length} colonnes (${b.colonnes.map((c) => minuscule(pointParId(c.pointId)?.nom || "")).join(", ")})`
      : `${minuscule(pointParId(b.pointId)?.nom || "")}`;
    const autre = b.intarsia ? " en intarsia" : b.laineId && b.laineId !== principaleId ? ` dans ${guillemets(mesLaines.get(b.laineId))}` : "";
    return `${nomBlocDe(b.id)} en ${pts}${autre}`;
  });
  if (plan.bandesLaterales) resumeBlocs.push(`bandes latérales de ${plan.bandesLaterales.mailles} mailles en ${minuscule(pointParId(plan.bandesLaterales.pointId)?.nom || "")}`);

  return {
    id: projet.id,
    projetId: projet.id,
    nom: projet.nom,
    type: projet.type,
    mode: rond ? "rond" : "plat",
    creeLe: maintenant.toISOString(),
    approximatif,
    origineDensite: dCorps?.origine || null,
    projet: structuredClone(projet),
    laine: laine ? { id: laine.id, nom: laine.nom, couleur: laine.couleur, epaisseur: laine.epaisseur } : null,
    laines: [...mesLaines.values()].map((l) => ({ id: l.id, nom: l.nom, couleur: l.couleur, epaisseur: l.epaisseur, metres: metresDe(l.id) ?? null })),
    bouts,
    aiguilles: { id: aiguilles.id, tailleMm: lireNombre(aiguilles.tailleMm), cableCm: lireNombre(aiguilles.cableCm) },
    echantillon: echantillon
      ? { id: echantillon.id, pointId: echantillon.pointId, maillesPour10cm: echantillon.maillesPour10cm, rangsPour10cm: echantillon.rangsPour10cm, date: echantillon.date }
      : null,
    densiteCorps: dCorps ? { mailles: dCorps.mailles, rangs: dCorps.rangs, statut: dCorps.statut, origine: dCorps.origine } : null,
    dimensions: { largeurCm: plan.largeur.reelleCm, longueurCm: plan.longueur.reelleCm, largeurViseeCm: plan.largeur.viseeCm, longueurViseeCm: plan.longueur.viseeCm },
    // Snood : largeur = tour, longueur = hauteur.
    montage: plan.montage,
    rabattage: plan.rabattage,
    blocs: plan.blocs.map((b) => ({
      id: b.id, zone: b.zone, nom: nomBlocDe(b.id), pointId: b.pointId, premierRang: b.premierRang, dernierRang: b.dernierRang, hauteurCm: b.hauteurCm,
      laineId: b.laineId || null,
      colonnes: b.colonnes ? b.colonnes.map((c) => ({ id: c.id, pointId: c.pointId, mailles: c.mailles, largeurCm: c.largeurCm, laineId: c.laineId || null })) : null,
      ...(b.intarsia ? { intarsia: true, pelotes: pelotesDuBloc(b).map((x) => ({ laineId: x.laineId, nombre: x.nombre })) } : {}),
      ...(b.section ? { section: true } : {}),
    })),
    bandesLaterales: plan.bandesLaterales,
    ...(bonnet ? { revers: plan.revers, sommet: plan.sommet, pompon: plan.pompon } : {}),
    ...(jambieres ? { exemplaires, couture } : {}),
    resume: majuscule(resumeBlocs.join(", ")) + (bonnet && plan.pompon ? `, pompon de ${formaterNombre(plan.pompon.cm, 0)} cm` : "") + (bonnet && plan.revers ? ", revers replié" : "")
      + (jambieres ? `${couture ? ", à plat avec une couture" : ", en magic loop"} ; à tricoter ${exemplaires} fois` : "") + ".",
    metrage: metrage ? { metres: metrage.metres, methode: metrage.methode } : null,
    laineSuffit: laineSuffit ? { statut: laineSuffit.statut, disponible: laineSuffit.disponible } : null,
    verification: { ok: true, verifieLe: maintenant.toISOString() },
    explications,
    etapes,
    rangs,
    techniques,
    points,
  };
}

/** Phrase de vérification pour un point : « le point de riz est réversible ». */
export function texteReversible(point, piece = "echarpe") {
  if (piece === "jambieres") {
    return point.proprietes.reversible
      ? `${majuscule(nomAvecArticle(point))} est réversible : les jambières peuvent se porter retournées`
      : `${majuscule(nomAvecArticle(point))} a un envers différent : il reste à l'intérieur des jambières`;
  }
  if (piece === "bonnet") {
    return point.proprietes.reversible
      ? `${majuscule(nomAvecArticle(point))} est réversible : l'intérieur du bonnet est joli aussi`
      : `${majuscule(nomAvecArticle(point))} a un envers différent : il reste à l'intérieur du bonnet`;
  }
  if (piece === "snood") {
    return point.proprietes.reversible
      ? `${majuscule(nomAvecArticle(point))} est réversible : le snood peut se porter retourné`
      : `${majuscule(nomAvecArticle(point))} a un envers différent : il reste à l'intérieur du snood`;
  }
  return point.proprietes.reversible
    ? `${majuscule(nomAvecArticle(point))} est réversible : l'écharpe est belle des deux côtés`
    : `${majuscule(nomAvecArticle(point))} a un envers différent : l'écharpe a un beau côté`;
}

/** Combien de fois le patron se tricote (2 pour une paire de jambières). */
export const exemplairesDuPatron = (patron) => patron?.exemplaires || 1;

/**
 * Pas du suivi : chaque rang de chaque exemplaire, plus une pause entre deux exemplaires
 * (rabattage, et couture à plat, avant de repartir au rang 1).
 */
export function pasDuSuivi(patron) {
  const e = exemplairesDuPatron(patron);
  return patron.rangs.length * e + (e - 1);
}

/** Où en est le suivi : { exemplaire (1, 2…), index (rang dans l'exemplaire), pause, fini }. */
export function positionSuivi(patron, faits) {
  const n = patron.rangs.length;
  const e = exemplairesDuPatron(patron);
  const total = pasDuSuivi(patron);
  const f = Math.max(0, Math.min(faits || 0, total));
  if (f >= total) return { exemplaire: e, index: n, pause: false, fini: true };
  const exemplaire = Math.floor(f / (n + 1));
  const index = f % (n + 1);
  return { exemplaire: exemplaire + 1, index, pause: index === n, fini: false };
}

/** « 1re jambière », « 2e jambière ». */
export const nomExemplaire = (k) => `${k === 1 ? "1re" : `${k}e`} jambière`;

/** Suivi neuf d'un patron. */
export function nouveauSuivi(patron) {
  return { id: patron.id, patronId: patron.id, rangsFaits: 0, coches: [], derniereCoche: null, termine: false };
}

/** Coche le rang en cours. */
export function cocherRang(suivi, total, maintenant = new Date()) {
  if (suivi.rangsFaits >= total) return suivi;
  const le = maintenant.toISOString();
  return { ...suivi, rangsFaits: suivi.rangsFaits + 1, coches: [...suivi.coches, { rang: suivi.rangsFaits + 1, le }].slice(-200), derniereCoche: le };
}

/** Annule la dernière coche. */
export function decocherRang(suivi) {
  if (suivi.rangsFaits <= 0) return suivi;
  return { ...suivi, rangsFaits: suivi.rangsFaits - 1, coches: suivi.coches.slice(0, -1), termine: false };
}

/** « Rang 42 sur 380 · 11 % » */
export function texteProgression(suivi, total, { rond = false } = {}) {
  const fait = suivi?.rangsFaits || 0;
  if (fait >= total) return `Les ${total} ${rond ? "tours" : "rangs"} sont tricotés`;
  return `${rond ? "Tour" : "Rang"} ${fait + 1} sur ${total} · ${Math.floor((fait / total) * 100)} %`;
}

/** Projet en conception reconstruit depuis un patron, pour « Dupliquer en variante ». */
export function projetVariante(patron) {
  const p = structuredClone(patron.projet);
  delete p.id;
  delete p.creeLe;
  delete p.modifieLe;
  return { ...p, nom: `${patron.nom} (variante)`, nomAuto: false, statut: "conception", etape: 4, patronId: undefined };
}

/**
 * Les rangs d'un bloc, présentés sans répétitions inutiles :
 * les rangs particuliers (transition, mise en place), puis une fois le motif, puis « répète ».
 * Renvoie [{ rang } | { repete: { rangs, fois, jusqua } }].
 */
export function rangsCondenses(patron, bloc) {
  const liste = patron.rangs.filter((r) => r.blocId === bloc.id);
  const sortie = [];
  const motif = liste.filter((r) => r.type === "motif");
  for (const r of liste.filter((r) => r.type !== "motif")) sortie.push({ rang: r });
  if (!motif.length) return sortie;
  const L = motif[0].rangsDuMotif || 1;
  // Le motif peut se répéter dans un même rang (mousse : 1 rang) ; on montre au moins 2 rangs, pour les deux côtés.
  const montres = Math.min(motif.length, L === 1 ? 2 : L);
  for (const r of motif.slice(0, montres)) sortie.push({ rang: r });
  const reste = motif.length - montres;
  if (reste > 0) {
    sortie.push({
      repete: {
        de: motif[0].numero, a: motif[montres - 1].numero,
        fois: reste / montres, jusqua: motif.at(-1).numero, rangs: reste,
        marqueur: motif.slice(montres).some((r) => r.marqueur),
      },
    });
  }
  return sortie;
}
