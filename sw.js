// Service worker : garde tous les fichiers de l'application pour qu'elle marche hors connexion.
// À chaque publication, changer VERSION (identique à js/version.js : un test le vérifie).
// Tout nouveau fichier de l'application doit être ajouté à FICHIERS (un test le vérifie aussi).

const VERSION = "0.4.2";
const CACHE = "createur-patrons-" + VERSION;

const FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/pelote.css",
  "icones/icone.svg",
  "icones/icone-192.png",
  "icones/icone-512.png",
  "icones/icone-maskable-512.png",
  "polices/fraunces-latin-500-normal.woff2",
  "polices/fraunces-latin-600-normal.woff2",
  "polices/nunito-latin-400-normal.woff2",
  "polices/nunito-latin-600-normal.woff2",
  "polices/nunito-latin-700-normal.woff2",
  "vendor/preact.module.js",
  "vendor/hooks.module.js",
  "vendor/htm.module.js",
  "js/app.js",
  "js/etat.js",
  "js/html.js",
  "js/routeur.js",
  "js/version.js",
  "js/composants/base.js",
  "js/composants/etape.js",
  "js/composants/icones.js",
  "js/composants/nuancier.js",
  "js/composants/texture.js",
  "js/catalogue/fiche.js",
  "js/catalogue/gestes.js",
  "js/catalogue/points.js",
  "js/catalogue/techniques.js",
  "js/catalogue/texte.js",
  "js/moteur/densite.js",
  "js/moteur/dimensions.js",
  "js/moteur/metrage.js",
  "js/moteur/plan.js",
  "js/moteur/simulateur.js",
  "js/rendu/texture.js",
  "js/donnees/couleur.js",
  "js/donnees/db.js",
  "js/donnees/echantillons.js",
  "js/donnees/projets.js",
  "js/donnees/reserve.js",
  "js/donnees/sauvegarde.js",
  "js/ecrans/accueil.js",
  "js/ecrans/echantillon.js",
  "js/ecrans/aiguilles.js",
  "js/ecrans/laine.js",
  "js/ecrans/points.js",
  "js/ecrans/projet-materiel.js",
  "js/ecrans/projet-piece.js",
  "js/ecrans/projet-taille.js",
  "js/ecrans/reglages.js",
  "js/ecrans/reserve.js",
];

self.addEventListener("install", (evenement) => {
  // Pas de skipWaiting ici : la nouvelle version attend que Deborah choisisse « Mettre à jour ».
  evenement.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" }))))
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith("createur-patrons-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (evenement) => {
  if (evenement.data && evenement.data.type === "ACTIVER_NOUVELLE_VERSION") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Ouverture de l'application : toujours la page en cache (marche en mode avion).
  if (requete.mode === "navigate") {
    evenement.respondWith(caches.match("index.html").then((r) => r || fetch(requete)));
    return;
  }

  // Fichiers : d'abord le cache, sinon le réseau.
  evenement.respondWith(caches.match(requete).then((r) => r || fetch(requete)));
});
