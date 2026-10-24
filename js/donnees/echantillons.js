// Règles des échantillons enregistrés : vérification des saisies, tri, filtres, textes, guide.
// Fonctions pures, testées sans navigateur.
//
// Un échantillon : { id, laineId, aiguillesId?, tailleAiguille, pointId, mode: "plat",
//   maillesPour10cm, rangsPour10cm, lave, pesee?: { grammes, largeurCm, hauteurCm }, date: "AAAA-MM-JJ", note }

import { lireNombre, formaterNombre } from "./reserve.js";
import { pointParId } from "../catalogue/points.js";
import { densitePoint, echantillonsCorrespondants } from "../moteur/densite.js";
import { maillesLesPlusProches } from "../moteur/simulateur.js";

/** Avec une balance au gramme près, un échantillon plus léger donne un métrage peu précis. */
export const POIDS_MINIMUM = 8;
/** Taille conseillée du carré d'échantillon (cm). */
export const COTE_CONSEILLE = 15;

export function aujourdhui(date = new Date()) {
  const deux = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

export function echantillonVide({ laineId = "", pointId = "", tailleAiguille = "" } = {}) {
  return {
    laineId, aiguillesId: "", tailleAiguille: tailleAiguille === "" ? "" : String(tailleAiguille).replace(".", ","),
    pointId, mode: "plat",
    maillesPour10cm: "", rangsPour10cm: "", lave: true,
    pesee: { grammes: "", largeurCm: "", hauteurCm: "" },
    date: aujourdhui(), note: "",
  };
}

const vide = (v) => v === undefined || v === null || String(v).trim() === "";

/** Vérifie un échantillon saisi ; renvoie { champ: message } (vide si tout va bien). */
export function verifierEchantillon(e) {
  const erreurs = {};
  if (!e.laineId) erreurs.laineId = "Choisis la laine.";
  if (!e.pointId || !pointParId(e.pointId)) erreurs.pointId = "Choisis le point.";
  const t = lireNombre(e.tailleAiguille);
  if (t === null || t < 1.5 || t > 25) erreurs.tailleAiguille = "Indique une taille d'aiguille entre 1,5 et 25 mm.";
  const m = lireNombre(e.maillesPour10cm);
  if (m === null || m <= 0 || m > 80) erreurs.maillesPour10cm = "Indique le nombre de mailles sur 10 cm.";
  const r = lireNombre(e.rangsPour10cm);
  if (r === null || r <= 0 || r > 150) erreurs.rangsPour10cm = "Indique le nombre de rangs sur 10 cm.";
  const p = e.pesee || {};
  if (!vide(p.grammes) || !vide(p.largeurCm) || !vide(p.hauteurCm)) {
    const g = lireNombre(p.grammes);
    if (g === null || g <= 0 || !Number.isInteger(g)) erreurs.grammes = "Indique le poids en grammes entiers.";
    const l = lireNombre(p.largeurCm);
    if (l === null || l < 5 || l > 60) erreurs.largeurCm = "Mesure la largeur du carré entier (en cm).";
    const h = lireNombre(p.hauteurCm);
    if (h === null || h < 5 || h > 60) erreurs.hauteurCm = "Mesure la hauteur du carré entier (en cm).";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) erreurs.date = "Indique la date.";
  return erreurs;
}

/** Message d'avertissement si l'échantillon est trop léger pour une balance au gramme ; sinon null. */
export function alertePesee(e) {
  const g = lireNombre(e?.pesee?.grammes);
  if (g === null || g <= 0) return null;
  if (g < POIDS_MINIMUM) return "Échantillon un peu petit pour ta balance : le métrage sera moins précis.";
  return null;
}

export function estPese(e) {
  const p = e?.pesee;
  return !!p && lireNombre(p.grammes) > 0 && lireNombre(p.largeurCm) > 0 && lireNombre(p.hauteurCm) > 0;
}

/** Version prête à enregistrer : nombres convertis, pesée retirée si elle est vide. */
export function normaliserEchantillon(e) {
  const resultat = {
    ...e,
    tailleAiguille: lireNombre(e.tailleAiguille),
    maillesPour10cm: lireNombre(e.maillesPour10cm),
    rangsPour10cm: lireNombre(e.rangsPour10cm),
    lave: !!e.lave,
    mode: e.mode || "plat",
    note: (e.note || "").trim(),
  };
  if (estPese(e)) {
    resultat.pesee = {
      grammes: lireNombre(e.pesee.grammes),
      largeurCm: lireNombre(e.pesee.largeurCm),
      hauteurCm: lireNombre(e.pesee.hauteurCm),
    };
  } else {
    delete resultat.pesee;
  }
  return resultat;
}

/** Le plus récent d'abord (date du tricot, puis date d'enregistrement). */
export function trierEchantillons(liste) {
  return [...liste].sort(
    (a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.creeLe || "").localeCompare(String(a.creeLe || ""))
  );
}

export function filtrerParLaine(liste, laineId) {
  return laineId ? liste.filter((e) => e.laineId === laineId) : liste;
}

/** Laines qui ont au moins un échantillon, dans l'ordre de la réserve. */
export function lainesAvecEchantillons(laines, echantillons) {
  const ids = new Set(echantillons.map((e) => e.laineId));
  return laines.filter((l) => ids.has(l.id));
}

/** « 12/10/2026 » */
export function texteDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** « Mérinos terracotta · 4,5 mm » */
export function detailEchantillon(e, laine) {
  return [laine?.nom || "Laine supprimée", `${formaterNombre(lireNombre(e.tailleAiguille), 2)} mm`].join(" · ");
}

/** « 12/10/2026 · lavé · pesé » */
export function mentionsEchantillon(e) {
  return [texteDate(e.date), e.lave ? "lavé" : null, estPese(e) ? "pesé" : null].filter(Boolean).join(" · ");
}

/** « 17 × 28 » */
export function texteDensite(e) {
  return `${formaterNombre(lireNombre(e.maillesPour10cm))} × ${formaterNombre(lireNombre(e.rangsPour10cm))}`;
}

/**
 * Autres échantillons de la même combinaison (laine, point, taille d'aiguille), le plus récent d'abord.
 * Sert à prévenir : « tu en as déjà un ; le plus récent sera proposé ».
 */
export function memeCombinaison(echantillons, e) {
  if (!e.laineId || !e.pointId || lireNombre(e.tailleAiguille) === null) return [];
  return echantillonsCorrespondants(echantillons, {
    laineId: e.laineId, pointId: e.pointId, tailleAiguille: lireNombre(e.tailleAiguille),
  }).filter((x) => x.id !== e.id);
}

/**
 * Nombre de mailles à monter pour un carré d'environ 15 cm, d'après ce qu'on sait déjà de la laine
 * (autre échantillon, étiquette ou épaisseur), arrondi pour que le point tombe juste.
 * Renvoie null si on ne sait rien.
 */
export function maillesPourLeCarre({ laine, pointId, tailleAiguille, echantillons = [] }) {
  const point = pointParId(pointId);
  const t = lireNombre(tailleAiguille);
  if (!point || !laine || t === null) return null;
  const d = densitePoint({ pointId, laine, tailleAiguille: t, echantillons });
  if (!d) return null;
  return maillesLesPlusProches(point, Math.max(1, Math.round((COTE_CONSEILLE * d.mailles) / 10)));
}
