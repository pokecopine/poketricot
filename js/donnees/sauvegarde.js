// Sauvegarde par fichier : construire le fichier exporté, vérifier un fichier importé.
// Fonctions pures, testées sans navigateur.

import { COLLECTIONS, VERSION_BASE } from "./db.js";

export const FORMAT_SAUVEGARDE = "createur-patrons";

export function construireSauvegarde(donnees, { versionApp, maintenant = new Date() } = {}) {
  const contenu = {};
  for (const nom of COLLECTIONS) {
    contenu[nom] = Array.isArray(donnees[nom]) ? donnees[nom] : [];
  }
  return {
    format: FORMAT_SAUVEGARDE,
    versionBase: VERSION_BASE,
    versionApp: versionApp ?? null,
    exporteLe: maintenant.toISOString(),
    donnees: contenu,
  };
}

export function nomFichierSauvegarde(maintenant = new Date()) {
  const deux = (n) => String(n).padStart(2, "0");
  const date = `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
  return `createur-patrons-sauvegarde-${date}.json`;
}

/**
 * Vérifie un fichier de sauvegarde (texte brut).
 * Renvoie { ok: true, sauvegarde, resume } ou { ok: false, erreur }.
 */
export function lireSauvegarde(texte) {
  let objet;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { ok: false, erreur: "Ce fichier n'est pas lisible : ce n'est pas une sauvegarde du Créateur de patrons." };
  }
  if (!objet || typeof objet !== "object" || objet.format !== FORMAT_SAUVEGARDE) {
    return { ok: false, erreur: "Ce fichier ne vient pas du Créateur de patrons." };
  }
  if (typeof objet.versionBase !== "number" || objet.versionBase > VERSION_BASE) {
    return {
      ok: false,
      erreur: "Cette sauvegarde vient d'une version plus récente de l'outil. Mets d'abord l'application à jour.",
    };
  }
  if (!objet.donnees || typeof objet.donnees !== "object") {
    return { ok: false, erreur: "Ce fichier de sauvegarde est incomplet." };
  }
  const donnees = {};
  for (const nom of COLLECTIONS) {
    const liste = objet.donnees[nom] ?? [];
    if (!Array.isArray(liste) || liste.some((e) => !e || typeof e !== "object" || typeof e.id !== "string")) {
      return { ok: false, erreur: "Ce fichier de sauvegarde est abîmé (données illisibles)." };
    }
    donnees[nom] = liste;
  }
  return {
    ok: true,
    sauvegarde: { ...objet, donnees },
    resume: resumerSauvegarde({ ...objet, donnees }),
  };
}

export function resumerSauvegarde(sauvegarde) {
  const d = sauvegarde.donnees;
  return {
    exporteLe: sauvegarde.exporteLe ?? null,
    laines: d.laines.length,
    aiguilles: d.aiguilles.length,
    echantillons: d.echantillons.length,
    projets: d.projets.length,
    patrons: d.patrons.length,
  };
}

/** Faut-il rappeler de sauvegarder ? (plus de `jours` jours, et des données à protéger) */
export function rappelSauvegardeNecessaire(derniereSauvegarde, aDesDonnees, { maintenant = new Date(), jours = 30 } = {}) {
  if (!aDesDonnees) return false;
  if (!derniereSauvegarde) return true;
  const ecart = maintenant.getTime() - new Date(derniereSauvegarde).getTime();
  return ecart > jours * 24 * 3600 * 1000;
}
