// Base de données sur le téléphone (IndexedDB).
// Une « collection » = un object store. Chaque enregistrement a un `id`
// et ses dates `creeLe` / `modifieLe`.

export const NOM_BASE = "createur-patrons";

export const COLLECTIONS = [
  "laines",
  "aiguilles",
  "echantillons",
  "projets",
  "patrons",
  "suivis",
  "preferences",
];

// Chaque migration fait passer la base d'une version à la suivante.
// Ne jamais modifier une migration déjà publiée : en ajouter une nouvelle.
export const MIGRATIONS = [
  // Version 1 : création des collections.
  (db) => {
    for (const nom of COLLECTIONS) {
      if (!db.objectStoreNames.contains(nom)) {
        db.createObjectStore(nom, { keyPath: "id" });
      }
    }
  },
];

export const VERSION_BASE = MIGRATIONS.length;

function promesse(requete) {
  return new Promise((resoudre, rejeter) => {
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

function finTransaction(tx) {
  return new Promise((resoudre, rejeter) => {
    tx.oncomplete = () => resoudre();
    tx.onerror = () => rejeter(tx.error);
    tx.onabort = () => rejeter(tx.error || new Error("Transaction annulée"));
  });
}

export function nouvelId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Ouvre la base, en appliquant les migrations nécessaires.
 * @param {object} [options]
 * @param {string} [options.nom] nom de la base (utile pour les tests)
 * @param {Array<Function>} [options.migrations] liste des migrations (tests)
 */
export function ouvrirBase({ nom = NOM_BASE, migrations = MIGRATIONS } = {}) {
  const version = migrations.length;
  const requete = indexedDB.open(nom, version);
  requete.onupgradeneeded = (evenement) => {
    const db = requete.result;
    const tx = requete.transaction;
    for (let v = evenement.oldVersion; v < version; v++) {
      migrations[v](db, tx);
    }
  };
  return promesse(requete).then((db) => new Base(db));
}

export class Base {
  constructor(db) {
    this.db = db;
  }

  fermer() {
    this.db.close();
  }

  async lister(collection) {
    const tx = this.db.transaction(collection, "readonly");
    return promesse(tx.objectStore(collection).getAll());
  }

  async lire(collection, id) {
    const tx = this.db.transaction(collection, "readonly");
    const resultat = await promesse(tx.objectStore(collection).get(id));
    return resultat ?? null;
  }

  /** Crée ou remplace un enregistrement ; renvoie l'enregistrement complété. */
  async ecrire(collection, objet) {
    const maintenant = new Date().toISOString();
    const complet = {
      ...objet,
      id: objet.id || nouvelId(),
      creeLe: objet.creeLe || maintenant,
      modifieLe: maintenant,
    };
    const tx = this.db.transaction(collection, "readwrite");
    tx.objectStore(collection).put(complet);
    await finTransaction(tx);
    return complet;
  }

  async supprimer(collection, id) {
    const tx = this.db.transaction(collection, "readwrite");
    tx.objectStore(collection).delete(id);
    await finTransaction(tx);
  }

  /** Toutes les collections, pour la sauvegarde. */
  async toutLire() {
    const noms = Array.from(this.db.objectStoreNames);
    const tx = this.db.transaction(noms, "readonly");
    const resultat = {};
    await Promise.all(
      noms.map(async (nom) => {
        resultat[nom] = await promesse(tx.objectStore(nom).getAll());
      })
    );
    return resultat;
  }

  /**
   * Remplace tout le contenu par celui d'une sauvegarde, en une seule
   * transaction : si quelque chose échoue, rien n'est modifié.
   */
  async toutRemplacer(donnees) {
    const noms = Array.from(this.db.objectStoreNames);
    const tx = this.db.transaction(noms, "readwrite");
    for (const nom of noms) {
      const store = tx.objectStore(nom);
      store.clear();
      for (const objet of donnees[nom] || []) {
        store.put(objet);
      }
    }
    await finTransaction(tx);
  }
}

/** Demande au navigateur de ne pas effacer les données (stockage persistant). */
export async function demanderStockagePersistant() {
  const stockage = globalThis.navigator && navigator.storage;
  if (!stockage || !stockage.persist) return "indisponible";
  try {
    if (await stockage.persisted()) return "accorde";
    return (await stockage.persist()) ? "accorde" : "refuse";
  } catch {
    return "indisponible";
  }
}

export async function etatStockage() {
  const stockage = globalThis.navigator && navigator.storage;
  if (!stockage) return { persistant: "indisponible", utilise: null };
  let persistant = "indisponible";
  let utilise = null;
  try {
    if (stockage.persisted) persistant = (await stockage.persisted()) ? "accorde" : "refuse";
    if (stockage.estimate) utilise = (await stockage.estimate()).usage ?? null;
  } catch {
    /* on garde les valeurs par défaut */
  }
  return { persistant, utilise };
}
