// Règles de la réserve : listes de choix, calcul du métrage, vérification des saisies.
// Fonctions pures, testées sans navigateur.

export const EPAISSEURS = [
  { id: "lace", nom: "Lace", detail: "très fine" },
  { id: "fingering", nom: "Fingering", detail: "fine, chaussettes" },
  { id: "sport", nom: "Sport", detail: "fine à moyenne" },
  { id: "dk", nom: "DK", detail: "moyenne" },
  { id: "worsted", nom: "Worsted", detail: "moyenne à épaisse" },
  { id: "aran", nom: "Aran", detail: "épaisse" },
  { id: "bulky", nom: "Bulky", detail: "très épaisse" },
  { id: "super-bulky", nom: "Super bulky", detail: "extra épaisse" },
];

export const MATIERES = [
  "Laine", "Mérinos", "Alpaga", "Mohair", "Coton", "Lin", "Soie",
  "Acrylique", "Laine et acrylique", "Laine et coton", "Autre",
];

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
  if (laine.matiere) morceaux.push(laine.matiere.toLowerCase());
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
