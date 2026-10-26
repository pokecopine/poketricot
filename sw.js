// Service worker : garde tous les fichiers de l'application pour qu'elle marche hors connexion.
// À chaque publication, changer VERSION (identique à js/version.js : un test le vérifie).
// Tout nouveau fichier de l'application doit être ajouté à FICHIERS (un test le vérifie aussi).

const VERSION = "0.12.0";
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
  "vendor/three/three.module.min.js",
  "vendor/three/OrbitControls.js",
  "vendor/three/RoomEnvironment.js",
  "js/app.js",
  "js/etat.js",
  "js/html.js",
  "js/routeur.js",
  "js/version.js",
  "js/composants/base.js",
  "js/composants/etape.js",
  "js/composants/icones.js",
  "js/composants/nuancier.js",
  "js/composants/piece.js",
  "js/composants/suppression.js",
  "js/composants/echantillon3d.js",
  "js/composants/piece3d.js",
  "js/composants/vignette3d.js",
  "js/composants/texture.js",
  "js/catalogue/aides.js",
  "js/catalogue/criteres.js",
  "js/catalogue/fiche.js",
  "js/catalogue/lots/lot-a.js",
  "js/catalogue/lots/lot-b.js",
  "js/catalogue/lots/lot-c.js",
  "js/catalogue/lots/lot-d.js",
  "js/catalogue/lots/lot-e.js",
  "js/catalogue/lots/lot-f.js",
  "js/catalogue/lots/lot-g.js",
  "js/catalogue/gestes.js",
  "js/catalogue/points.js",
  "js/catalogue/techniques.js",
  "js/catalogue/texte.js",
  "js/moteur/colonnes.js",
  "js/moteur/densite.js",
  "js/moteur/dimensions.js",
  "js/moteur/metrage.js",
  "js/moteur/plan.js",
  "js/moteur/patron.js",
  "js/moteur/simulateur.js",
  "js/rendu/texture.js",
  "js/rendu/fil3d.js",
  "js/rendu/tissu.js",
  "js/rendu/cuisson.js",
  "js/rendu/occlusion.js",
  "js/rendu/lumiere.js",
  "js/donnees/couleur.js",
  "js/donnees/db.js",
  "js/donnees/echantillons.js",
  "js/donnees/marques.js",
  "js/donnees/projets.js",
  "js/donnees/reserve.js",
  "js/donnees/sauvegarde.js",
  "js/ecrans/accueil.js",
  "js/ecrans/echantillon.js",
  "js/ecrans/aiguilles.js",
  "js/ecrans/laine.js",
  "js/ecrans/points.js",
  "js/ecrans/projet-materiel.js",
  "js/ecrans/projet-builder.js",
  "js/ecrans/projet-apercu.js",
  "js/ecrans/patron.js",
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
