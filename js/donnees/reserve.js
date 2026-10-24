// Règles de la réserve : listes de choix, calcul du métrage, vérification des saisies.
// Fonctions pures, testées sans navigateur.

// Repères usuels : mètres pour 100 g (min inclus, max exclu) et aiguilles conseillées.
// Ce sont des fourchettes approximatives : les fabricants ne sont pas tous d'accord.
export const EPAISSEURS = [
  { id: "lace", nom: "Lace", detail: "très fine", min: 600, max: null, aiguilles: "2 à 2,5 mm" },
  { id: "fingering", nom: "Fingering", detail: "fine, chaussettes", min: 350, max: 600, aiguilles: "2,25 à 3,25 mm" },
  { id: "sport", nom: "Sport", detail: "fine à moyenne", min: 260, max: 350, aiguilles: "3,25 à 3,75 mm" },
  { id: "dk", nom: "DK", detail: "moyenne", min: 200, max: 260, aiguilles: "3,75 à 4,5 mm" },
  { id: "worsted", nom: "Worsted", detail: "moyenne à épaisse", min: 170, max: 200, aiguilles: "4,5 à 5,5 mm" },
  { id: "aran", nom: "Aran", detail: "épaisse", min: 120, max: 170, aiguilles: "5 à 6 mm" },
  { id: "bulky", nom: "Bulky", detail: "très épaisse", min: 80, max: 120, aiguilles: "6 à 8 mm" },
  { id: "super-bulky", nom: "Super bulky", detail: "extra épaisse", min: 0, max: 80, aiguilles: "8 mm et plus" },
];

/** « 200 à 260 m pour 100 g » */
export function texteFourchette(e) {
  if (e.max === null) return `plus de ${e.min} m pour 100 g`;
  if (e.min === 0) return `moins de ${e.max} m pour 100 g`;
  return `${e.min} à ${e.max} m pour 100 g`;
}

/** Mètres pour 100 g d'après l'étiquette (ou la référence de pesée) ; null si inconnu. */
export function metresPour100g(laine) {
  const q = laine?.quantite || {};
  const [m, g] =
    q.mode === "pesee"
      ? [lireNombre(q.metresReference), lireNombre(q.grammesReference)]
      : [lireNombre(q.metresParPelote), lireNombre(q.grammesParPelote)];
  if (m === null || g === null || m <= 0 || g <= 0) return null;
  return Math.round((m * 100) / g);
}

/** Épaisseur la plus probable pour un métrage aux 100 g. */
export function epaisseurProbable(mPour100g) {
  if (mPour100g === null || mPour100g === undefined || mPour100g <= 0) return null;
  return EPAISSEURS.find((e) => mPour100g >= e.min && (e.max === null || mPour100g < e.max)) ?? null;
}

// Fibres proposées pour la composition (une laine peut en mélanger plusieurs).
export const FIBRES = [
  "Laine", "Mérinos", "Alpaga", "Mohair", "Cachemire", "Angora", "Yak", "Soie",
  "Coton", "Lin", "Chanvre", "Bambou", "Viscose", "Lyocell",
  "Acrylique", "Polyamide (nylon)", "Polyester", "Élasthanne", "Autre",
];

/**
 * Composition d'une laine : liste de { fibre, pourcentage }.
 * Les laines enregistrées avant la version 0.1.2 n'avaient qu'une « matière » :
 * elle est relue ici comme une composition (« Laine et coton » → laine + coton, % inconnus).
 */
export function compositionDe(laine) {
  if (Array.isArray(laine?.composition) && laine.composition.length > 0) return laine.composition;
  const m = (laine?.matiere || "").trim();
  if (!m) return [];
  const morceaux = m.split(/\s+et\s+/i).map((x) => x.trim()).filter(Boolean);
  if (morceaux.length === 1) return [{ fibre: morceaux[0], pourcentage: 100 }];
  return morceaux.map((f) => ({ fibre: f.charAt(0).toUpperCase() + f.slice(1), pourcentage: "" }));
}

/** « 70 % mérinos, 30 % polyamide (nylon) » ; « mérinos » s'il n'y a qu'une fibre. */
export function texteComposition(composition) {
  const liste = (composition || []).filter((c) => c.fibre);
  if (liste.length === 0) return "";
  if (liste.length === 1) return liste[0].fibre.toLowerCase();
  const tousLesPourcentages = liste.every((c) => lireNombre(c.pourcentage) !== null);
  return liste
    .map((c) => (tousLesPourcentages ? `${formaterNombre(lireNombre(c.pourcentage))} % ` : "") + c.fibre.toLowerCase())
    .join(tousLesPourcentages ? ", " : " / ");
}

export function totalComposition(composition) {
  return (composition || []).reduce((t, c) => t + (lireNombre(c.pourcentage) ?? 0), 0);
}

/** Vérifie la composition ; renvoie un message d'erreur ou null. */
export function verifierComposition(composition) {
  const liste = composition || [];
  if (liste.length === 0) return "Indique au moins une fibre.";
  if (liste.some((c) => !c.fibre)) return "Choisis la fibre de chaque ligne.";
  const noms = liste.map((c) => c.fibre);
  if (new Set(noms).size !== noms.length) return "La même fibre apparaît deux fois.";
  for (const c of liste) {
    const p = lireNombre(c.pourcentage);
    if (String(c.pourcentage ?? "").trim() !== "" && (p === null || p <= 0 || p > 100)) {
      return "Chaque pourcentage doit être entre 1 et 100.";
    }
  }
  if (liste.length === 1) {
    const p = lireNombre(liste[0].pourcentage);
    return p === null || p === 100 ? null : "Avec une seule fibre, la laine en contient 100 %.";
  }
  if (liste.some((c) => lireNombre(c.pourcentage) === null)) return "Indique le pourcentage de chaque fibre.";
  const total = totalComposition(liste);
  if (Math.abs(total - 100) > 0.01) return `Le total fait ${formaterNombre(total)} % : il doit faire 100 %.`;
  return null;
}

export const PALETTE = [
  { nom: "Terracotta", hex: "#D07E5B" },
  { nom: "Sauge", hex: "#9DB7A2" },
  { nom: "Moutarde", hex: "#DDBC6C" },
  { nom: "Bleu nuit", hex: "#6A7BAA" },
  { nom: "Écru", hex: "#F1E8D6" },
  { nom: "Gris chiné", hex: "#9A9590" },
  { nom: "Rose poudré", hex: "#E3B3B0" },
  { nom: "Brun", hex: "#7A5A43" },
  { nom: "Noir", hex: "#2E2A28" },
];

export function nomEpaisseur(id) {
  return EPAISSEURS.find((e) => e.id === id)?.nom ?? "";
}

/** Lit un nombre saisi à la française (« 2,5 ») ; renvoie null si vide ou invalide. */
export function lireNombre(saisie) {
  if (saisie === null || saisie === undefined) return null;
  if (typeof saisie === "number") return Number.isFinite(saisie) ? saisie : null;
  const texte = String(saisie).trim().replace(/\s/g, "").replace(",", ".");
  if (texte === "") return null;
  const n = Number(texte);
  return Number.isFinite(n) ? n : null;
}

/** Affiche un nombre à la française (virgule, sans zéros inutiles). */
export function formaterNombre(n, decimales = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const arrondi = Math.round(n * 10 ** decimales) / 10 ** decimales;
  return String(arrondi).replace(".", ",");
}

/**
 * Métrage d'une laine.
 * - par étiquette : mètres par pelote × nombre de pelotes ;
 * - par pesée : grammes pesés × (mètres de référence ÷ grammes de référence).
 * Renvoie { metres, estime } ou null si les informations manquent.
 */
export function metrageLaine(laine) {
  const q = laine?.quantite;
  if (!q) return null;
  if (q.mode === "etiquette") {
    const m = lireNombre(q.metresParPelote);
    const p = lireNombre(q.pelotes);
    if (m === null || p === null || m <= 0 || p < 0) return null;
    return { metres: Math.round(m * p), estime: false };
  }
  if (q.mode === "pesee") {
    const g = lireNombre(q.grammes);
    const mRef = lireNombre(q.metresReference);
    const gRef = lireNombre(q.grammesReference);
    if (g === null || mRef === null || gRef === null || g < 0 || mRef <= 0 || gRef <= 0) return null;
    return { metres: Math.round((g * mRef) / gRef), estime: true };
  }
  return null;
}

export function texteMetrage(laine) {
  const r = metrageLaine(laine);
  if (!r) return "—";
  return `${r.estime ? "≈ " : ""}${r.metres} m`;
}

/** Ligne de détail d'une laine, comme dans la maquette : « Aran · mérinos · 4 pelotes ». */
export function detailLaine(laine) {
  const morceaux = [];
  const ep = nomEpaisseur(laine.epaisseur);
  if (ep) morceaux.push(ep);
  const compo = texteComposition(compositionDe(laine));
  if (compo) morceaux.push(compo);
  const q = laine.quantite;
  if (q?.mode === "etiquette") {
    const p = lireNombre(q.pelotes);
    if (p !== null) morceaux.push(`${formaterNombre(p)} pelote${p > 1 ? "s" : ""}`);
  } else if (q?.mode === "pesee") {
    const g = lireNombre(q.grammes);
    if (g !== null) morceaux.push(`pesé ${formaterNombre(g, 0)} g`);
  }
  return morceaux.join(" · ");
}

export function detailAiguilles(a) {
  const morceaux = [];
  if (a.matiere) morceaux.push(a.matiere);
  if (lireNombre(a.cableCm) >= 80) morceaux.push("compatible magic loop");
  if (a.note) morceaux.push(a.note);
  return morceaux.join(" · ");
}

export function titreAiguilles(a) {
  return `${formaterNombre(lireNombre(a.tailleMm), 2)} mm · câble ${formaterNombre(lireNombre(a.cableCm), 0)} cm`;
}

/** Vérifie une laine saisie ; renvoie un objet { champ: message } (vide si tout va bien). */
export function verifierLaine(laine) {
  const erreurs = {};
  if (!laine.nom || !laine.nom.trim()) erreurs.nom = "Donne un nom à cette laine.";
  if (!laine.epaisseur) erreurs.epaisseur = "Choisis une épaisseur.";
  if (!/^#[0-9a-fA-F]{6}$/.test(laine.couleur || "")) erreurs.couleur = "Choisis une couleur.";
  const erreurCompo = verifierComposition(compositionDe(laine));
  if (erreurCompo) erreurs.composition = erreurCompo;
  const q = laine.quantite || {};
  if (q.mode === "etiquette") {
    const m = lireNombre(q.metresParPelote);
    const p = lireNombre(q.pelotes);
    if (m === null || m <= 0) erreurs.metresParPelote = "Indique les mètres d'une pelote.";
    if (p === null || p < 0) erreurs.pelotes = "Indique le nombre de pelotes.";
  } else if (q.mode === "pesee") {
    const g = lireNombre(q.grammes);
    const mRef = lireNombre(q.metresReference);
    const gRef = lireNombre(q.grammesReference);
    if (g === null || g < 0) erreurs.grammes = "Indique le poids pesé.";
    if (mRef === null || mRef <= 0) erreurs.metresReference = "Indique les mètres de la référence.";
    if (gRef === null || gRef <= 0) erreurs.grammesReference = "Indique le poids de la référence.";
  } else {
    erreurs.quantite = "Indique la quantité.";
  }
  const ech = laine.echantillonEtiquette || {};
  const mailles = lireNombre(ech.mailles);
  if (ech.mailles !== undefined && String(ech.mailles).trim() !== "" && (mailles === null || mailles <= 0)) {
    erreurs.echantillonMailles = "Nombre de mailles invalide.";
  }
  return erreurs;
}

export function verifierAiguilles(a) {
  const erreurs = {};
  const t = lireNombre(a.tailleMm);
  const c = lireNombre(a.cableCm);
  if (t === null || t < 1.5 || t > 25) erreurs.tailleMm = "Indique une taille entre 1,5 et 25 mm.";
  if (c === null || c < 20 || c > 200) erreurs.cableCm = "Indique une longueur de câble entre 20 et 200 cm.";
  return erreurs;
}

/** Trie pour l'affichage : actives d'abord, puis par nom. */
export function trierLaines(laines) {
  return [...laines].sort((a, b) =>
    (a.archivee === b.archivee ? 0 : a.archivee ? 1 : -1) || a.nom.localeCompare(b.nom, "fr")
  );
}

export function trierAiguilles(aiguilles) {
  return [...aiguilles].sort((a, b) =>
    (a.archivee === b.archivee ? 0 : a.archivee ? 1 : -1) ||
    (lireNombre(a.tailleMm) ?? 0) - (lireNombre(b.tailleMm) ?? 0) ||
    (lireNombre(a.cableCm) ?? 0) - (lireNombre(b.cableCm) ?? 0)
  );
}
