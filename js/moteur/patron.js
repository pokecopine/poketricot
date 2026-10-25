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
      const etiquette = s.zone === "corps" ? (rang.type === "transition" ? "Rang de transition" : majuscule(nomBloc)) : NOMS_SEGMENTS[s.zone];
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

/**
 * Construit le patron.
 * entree = { projet, plan, laine, aiguilles, echantillon, densites, metrage, laineSuffit, maintenant }
 */
export function genererPatron({ projet, plan, laine, aiguilles, echantillon, densites, metrage, laineSuffit, maintenant = new Date() }) {
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

  // ---- Techniques : chaque geste expliqué au premier rang qui l'utilise ----
  const techniques = { ...TECHNIQUES_PATRON };
  const dejaVus = new Set(["end", "env"]);
  let hauteur = 0;
  const rangs = plan.rangs.map((r) => {
    hauteur += r.hauteurCm;
    const bloc = plan.blocs.find((b) => b.id === r.blocId);
    const corps = r.segments.find((s) => s.zone === "corps");
    const point = corps?.pointId ? pointParId(corps.pointId) : null;
    const nouveaux = [];
    const codes = gestesDuRang(r);
    for (const code of codes) {
      if (TECHNIQUES[code] && !techniques[code]) techniques[code] = { titre: TECHNIQUES[code].titre, explication: TECHNIQUES[code].explication };
      if (dejaVus.has(code)) continue;
      dejaVus.add(code);
      if (TECHNIQUES[code]) nouveaux.push(code);
    }
    if (r.numero === 1 && plan.lisieres.mailles) nouveaux.unshift("lisiere");
    let repere;
    if (r.type === "transition") repere = "Rang de transition";
    else if (r.type === "miseEnPlace") repere = `${point ? majuscule(point.nom) : ""} · mise en place`;
    else repere = `${point ? majuscule(point.nom) : ""} · rang ${r.numeroMotif} du motif${r.rangsDuMotif > 1 ? ` sur ${r.rangsDuMotif}` : ""}`;
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
      lignes: lignesDuRang(r, nomBlocDe(r.blocId)),
      lignesAbregees: lignesDuRang(r, nomBlocDe(r.blocId), { abreviations: true }),
      techniques: nouveaux,
      longueurCm: Math.round(hauteur * 10) / 10,
    };
  });

  // Un rang qui se répète à l'identique peut être dit « comme le rang n ».
  const texteCle = (r) => JSON.stringify([r.cote, r.lignes]);
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
  const materiel = [
    `${laine?.nom || "Ta laine"}${metrage ? ` : environ ${metrage.metres} m` : ""}`,
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
    etapes.push({
      cle: "bloc", blocId: b.id, titre: majuscule(nomBlocDe(b.id)),
      detail: `${point ? majuscule(point.nom) : ""} · ${b.premierRang === b.dernierRang ? `rang ${b.premierRang}` : `rangs ${b.premierRang} à ${b.dernierRang}`}`,
      texte: `${b.rangs} rang${b.rangs > 1 ? "s" : ""}, environ ${formaterNombre(b.hauteurCm)} cm${transitions ? `, dont ${transitions} rang de transition au début` : ""}.`,
      premierRang: b.premierRang, dernierRang: b.dernierRang, pointId: b.pointId,
    });
  }
  const dernierRang = rangs.at(-1);
  etapes.push({
    cle: "rabattage", titre: "Rabattage",
    detail: `Rabattre les ${plan.rabattage.mailles} mailles, souplement`,
    texte: `Sur l'${dernierRang.cote === "E" ? "envers" : "endroit"}, rabats les ${plan.rabattage.mailles} mailles avec le rabattage simple, en tricotant chaque maille comme elle se présente.`,
    techniques: ["rabattage"],
  });
  etapes.push({
    cle: "finitions", titre: "Finitions", detail: "Rentrer les fils, bloquer",
    texte: "Rentre les deux bouts de fil (début et fin), puis bloque l'écharpe pour régulariser les mailles.",
    techniques: ["fils", "blocage"],
  });

  // ---- Copie des points utilisés (recettes figées) ----
  const pointIds = [...new Set([...plan.blocs.map((b) => b.pointId), plan.bandesLaterales?.pointId].filter(Boolean))];
  const points = {};
  for (const id of pointIds) {
    const p = pointParId(id);
    if (p) points[id] = structuredClone({ id: p.id, nom: p.nom, article: p.article, famille: p.famille, resume: p.resume, rangs: p.rangs, miseEnPlace: p.miseEnPlace, proprietes: p.proprietes, source: p.source });
  }

  const explications = [...(plan.explications || [])];
  const resumeBlocs = plan.blocs.map((b) => `${nomBlocDe(b.id)} en ${minuscule(pointParId(b.pointId)?.nom || "")}`);
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
    aiguilles: { id: aiguilles.id, tailleMm: lireNombre(aiguilles.tailleMm), cableCm: lireNombre(aiguilles.cableCm) },
    echantillon: echantillon
      ? { id: echantillon.id, pointId: echantillon.pointId, maillesPour10cm: echantillon.maillesPour10cm, rangsPour10cm: echantillon.rangsPour10cm, date: echantillon.date }
      : null,
    densiteCorps: dCorps ? { mailles: dCorps.mailles, rangs: dCorps.rangs, statut: dCorps.statut, origine: dCorps.origine } : null,
    dimensions: { largeurCm: plan.largeur.reelleCm, longueurCm: plan.longueur.reelleCm, largeurViseeCm: plan.largeur.viseeCm, longueurViseeCm: plan.longueur.viseeCm },
    montage: plan.montage,
    rabattage: plan.rabattage,
    blocs: plan.blocs.map((b) => ({ id: b.id, zone: b.zone, nom: nomBlocDe(b.id), pointId: b.pointId, premierRang: b.premierRang, dernierRang: b.dernierRang, hauteurCm: b.hauteurCm })),
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
