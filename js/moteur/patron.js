// Générateur du patron : à partir du plan vérifié, toutes les étapes et tous les rangs en toutes lettres.
// Le patron est une photographie : il garde ses textes, les recettes des points et les explications des gestes,
// pour qu'une correction ultérieure du catalogue ne le change jamais.

import { geste } from "../catalogue/gestes.js";
import { TECHNIQUES } from "../catalogue/techniques.js";
import { pointParId } from "../catalogue/points.js";
import { texteGestes } from "../catalogue/texte.js";
import { consomme } from "./simulateur.js";
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

/** Étiquette d'une colonne : « Colonne 2 · point de riz ». */
function etiquetteColonne(s) {
  const p = pointParId(s.pointId);
  return `Colonne ${s.colonne}${p ? ` · ${minuscule(p.nom)}` : ""}`;
}

/**
 * Lignes d'un rang du plan, dans l'ordre où on tricote.
 * Les zones voisines tricotées pareil (bordure en mousse et bandes latérales en mousse) sont réunies.
 */
export function lignesDuRang(rang, nomBloc, { abreviations = false } = {}) {
  const lignes = [];
  const segments = rang.segments;
  const premier = segments[0]?.lisiere ? segments[0] : null;
  const dernier = segments.at(-1)?.lisiere ? segments.at(-1) : null;
  const milieu = segments.filter((s) => !s.lisiere);
  if (premier) lignes.push({ zone: "lisiere", texte: abreviations ? "1 gl. f. dev. (lisière)" : "Glisse la 1re maille, fil devant (lisière)" });
  const tous = milieu.flatMap((s) => s.gestes);
  if (milieu.length > 1 && tous.every((c) => c === tous[0])) {
    lignes.push({ zone: "tout", texte: majuscule(texteGestes(tous, { abreviations })) });
  } else {
    for (const s of milieu) {
      const etiquette = s.colonne
        ? etiquetteColonne(s)
        : s.zone === "corps" ? (rang.type === "transition" ? "Rang de transition" : majuscule(nomBloc)) : NOMS_SEGMENTS[s.zone];
      lignes.push({ zone: s.zone, etiquette: `${etiquette} (${consomme(s.gestes)} m.)`, texte: majuscule(decrireGestes(s.gestes, { abreviations })) });
    }
  }
  if (dernier) lignes.push({ zone: "lisiere", texte: abreviations ? "1 end. (lisière)" : "Tricote la dernière maille à l'endroit (lisière)" });
  return lignes;
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
export function changementsDeLaine(rangsLaine, { filPorte = false } = {}) {
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
    const porter = filPorte && ecart !== null && ecart % 2 === 0 && ecart <= RANGS_MAX_FIL_PORTE;
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
function lignesChangement(c, laines, { abreviations = false } = {}) {
  const a = laines.get(c.ancienne);
  const n = laines.get(c.nouvelle);
  if (abreviations) {
    return `Chgt laine : ${c.porter ? `${a?.nom || "ancienne"} en attente` : `couper ${a?.nom || "ancienne"}`}, ${c.reprise ? "reprendre" : "prendre"} ${n?.nom || "nouvelle"}`;
  }
  const avant = c.porter ? `Laisse ${guillemets(a)} en attente au bord, sans la couper` : `Coupe ${guillemets(a)} en laissant 15 cm`;
  const apres = c.reprise ? `reprends ${guillemets(n)}, qui attend au bord` : `commence le rang avec ${guillemets(n)}`;
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
  const nomBlocDe = (id) => {
    const b = plan.blocs.find((x) => x.id === id);
    if (!b) return "";
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
  const changements = changementsDeLaine(plan.rangs.map(laineDuRang), { filPorte: !!projet.filPorte });
  const plusieurs = mesLaines.size > 1;

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
    const nomPoint = enColonnes ? `${majuscule(nomBlocDe(r.blocId))} en colonnes` : point ? majuscule(point.nom) : "";
    let repere;
    if (r.type === "transition") repere = "Rang de transition";
    else if (r.type === "miseEnPlace") repere = `${nomPoint} · mise en place`;
    else repere = `${nomPoint} · rang ${r.numeroMotif} du motif${r.rangsDuMotif > 1 ? ` sur ${r.rangsDuMotif}` : ""}`;

    // Changement de laine, ou laine en attente à croiser : une ligne avant la lisière.
    const laineId = laineDuRang(r);
    const changement = changements.parRang.get(index);
    const avant = [];
    const avantAbrege = [];
    if (changement) {
      const couleur = mesLaines.get(changement.nouvelle)?.couleur || null;
      avant.push({ zone: "laine", couleur, texte: lignesChangement(changement, mesLaines) });
      avantAbrege.push({ zone: "laine", couleur, texte: lignesChangement(changement, mesLaines, { abreviations: true }) });
      if (!dejaVus.has("laine")) {
        dejaVus.add("laine");
        nouveaux.unshift("laine");
      }
      if (changement.porter && !dejaVus.has("porte")) {
        dejaVus.add("porte");
        nouveaux.unshift("porte");
      }
    } else if (changements.croisements.has(index)) {
      avant.push({ zone: "laine", texte: "Avant la lisière, croise le fil du rang avec la laine en attente" });
      avantAbrege.push({ zone: "laine", texte: "Croiser avec la laine en attente" });
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
      lignes: [...avant, ...lignesDuRang(r, nomBlocDe(r.blocId))],
      lignesAbregees: [...avantAbrege, ...lignesDuRang(r, nomBlocDe(r.blocId), { abreviations: true })],
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
  const repartition = [
    t.bordD ? pluriel(t.bordD, "lisière", "lisières") : null,
    t.bandeD ? `${t.bandeD} de bande latérale` : null,
    `${t.corps} pour le corps`,
    t.bandeG ? `${t.bandeG} de bande latérale` : null,
    t.bordG ? pluriel(t.bordG, "lisière", "lisières") : null,
  ].filter(Boolean).join(", ");

  const etapes = [];
  const metresDe = (id) => parLaine.find((x) => x.laineId === id)?.metres;
  const lignesLaines = plusieurs
    ? [...mesLaines.values()].map((l, i) => {
        const m = metresDe(l.id) ?? (i === 0 ? metrage?.metres : null);
        return `${l.nom}${m ? ` : environ ${m} m` : ""}${i === 0 ? " (laine principale)" : ""}`;
      })
    : [`${laine?.nom || "Ta laine"}${metrage ? ` : environ ${metrage.metres} m` : ""}`];
  const materiel = [
    ...lignesLaines,
    `Aiguilles circulaires de ${formaterNombre(lireNombre(aiguilles.tailleMm), 2)} mm${lireNombre(aiguilles.cableCm) ? `, câble ${formaterNombre(lireNombre(aiguilles.cableCm), 0)} cm` : ""} (on tricote à plat, en allers-retours)`,
    "Une aiguille à laine pour rentrer les fils",
    "Une paire de ciseaux",
  ];
  etapes.push({ cle: "materiel", titre: "Matériel", detail: materiel.join(" · "), liste: materiel });
  etapes.push({
    cle: "montage", titre: "Montage", detail: `Monter ${plan.montage.mailles} mailles (montage tricoté)`,
    texte: `Monte ${plan.montage.mailles} mailles avec le montage tricoté : ${repartition}.`, techniques: ["montage"],
  });
  for (const b of plan.blocs) {
    const point = pointParId(b.pointId);
    const transitions = plan.rangs.filter((r) => r.blocId === b.id && r.type === "transition").length;
    const nomPoints = b.colonnes
      ? `${b.colonnes.length} colonnes`
      : point ? majuscule(point.nom) : "";
    const autreLaine = b.laineId && b.laineId !== principaleId ? mesLaines.get(b.laineId) : null;
    const colonnesTexte = b.colonnes
      ? ` En colonnes, du bord droit (début des rangs endroit) au bord gauche : ${b.colonnes
          .map((c, j) => `colonne ${j + 1} en ${minuscule(pointParId(c.pointId)?.nom || "")} (${c.mailles} mailles)`)
          .join(", ")}.`
      : "";
    etapes.push({
      cle: "bloc", blocId: b.id, titre: majuscule(nomBlocDe(b.id)),
      detail: `${nomPoints}${autreLaine ? ` · ${autreLaine.nom}` : ""} · ${b.premierRang === b.dernierRang ? `rang ${b.premierRang}` : `rangs ${b.premierRang} à ${b.dernierRang}`}`,
      texte: `${b.rangs} rang${b.rangs > 1 ? "s" : ""}, environ ${formaterNombre(b.hauteurCm)} cm${transitions ? `, dont ${transitions} rang de transition au début` : ""}.${colonnesTexte}${autreLaine ? ` Avec ${guillemets(autreLaine)}, sur toute la largeur.` : ""}${
        plan.rangs.some((r, i) => r.blocId === b.id && changements.croisements.has(i)) ? " Tous les 2 rangs, avant la lisière, croise le fil du rang avec la laine en attente." : ""}`,
      premierRang: b.premierRang, dernierRang: b.dernierRang, pointId: b.pointId, laineId: autreLaine?.id || null,
    });
  }
  const dernierRang = rangs.at(-1);
  etapes.push({
    cle: "rabattage", titre: "Rabattage",
    detail: `Rabattre les ${plan.rabattage.mailles} mailles, souplement`,
    texte: `Sur l'${dernierRang.cote === "E" ? "envers" : "endroit"}, rabats les ${plan.rabattage.mailles} mailles avec le rabattage simple, en tricotant chaque maille comme elle se présente.`,
    techniques: ["rabattage"],
  });
  const bouts = changements.bouts;
  etapes.push({
    cle: "finitions", titre: "Finitions", detail: "Rentrer les fils, bloquer",
    texte: bouts > 2
      ? `Rentre les ${bouts} bouts de fil (début, fin et changements de laine), chacun dans les mailles de sa couleur, puis bloque l'écharpe pour régulariser les mailles.`
      : "Rentre les deux bouts de fil (début et fin), puis bloque l'écharpe pour régulariser les mailles.",
    techniques: ["fils", "blocage"],
  });

  // ---- Copie des points utilisés (recettes figées) ----
  const pointIds = [...new Set([
    ...plan.blocs.flatMap((b) => [b.pointId, ...(b.colonnes || []).map((c) => c.pointId)]),
    plan.bandesLaterales?.pointId,
  ].filter(Boolean))];
  const points = {};
  for (const id of pointIds) {
    const p = pointParId(id);
    if (p) points[id] = structuredClone({ id: p.id, nom: p.nom, article: p.article, famille: p.famille, resume: p.resume, rangs: p.rangs, miseEnPlace: p.miseEnPlace, proprietes: p.proprietes, source: p.source });
  }

  const explications = [...(plan.explications || [])];
  const resumeBlocs = plan.blocs.map((b) => {
    const pts = b.colonnes
      ? `${b.colonnes.length} colonnes (${b.colonnes.map((c) => minuscule(pointParId(c.pointId)?.nom || "")).join(", ")})`
      : `${minuscule(pointParId(b.pointId)?.nom || "")}`;
    const autre = b.laineId && b.laineId !== principaleId ? ` dans ${guillemets(mesLaines.get(b.laineId))}` : "";
    return `${nomBlocDe(b.id)} en ${pts}${autre}`;
  });
  if (plan.bandesLaterales) resumeBlocs.push(`bandes latérales de ${plan.bandesLaterales.mailles} mailles en ${minuscule(pointParId(plan.bandesLaterales.pointId)?.nom || "")}`);

  return {
    id: projet.id,
    projetId: projet.id,
    nom: projet.nom,
    type: projet.type,
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
    montage: plan.montage,
    rabattage: plan.rabattage,
    blocs: plan.blocs.map((b) => ({
      id: b.id, zone: b.zone, nom: nomBlocDe(b.id), pointId: b.pointId, premierRang: b.premierRang, dernierRang: b.dernierRang, hauteurCm: b.hauteurCm,
      laineId: b.laineId || null,
      colonnes: b.colonnes ? b.colonnes.map((c) => ({ id: c.id, pointId: c.pointId, mailles: c.mailles, largeurCm: c.largeurCm })) : null,
    })),
    bandesLaterales: plan.bandesLaterales,
    resume: majuscule(resumeBlocs.join(", ")) + ".",
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
export function texteReversible(point) {
  return point.proprietes.reversible
    ? `${majuscule(nomAvecArticle(point))} est réversible : l'écharpe est belle des deux côtés`
    : `${majuscule(nomAvecArticle(point))} a un envers différent : l'écharpe a un beau côté`;
}

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
export function texteProgression(suivi, total) {
  const fait = suivi?.rangsFaits || 0;
  if (fait >= total) return `Les ${total} rangs sont tricotés`;
  return `Rang ${fait + 1} sur ${total} · ${Math.floor((fait / total) * 100)} %`;
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
      },
    });
  }
  return sortie;
}
