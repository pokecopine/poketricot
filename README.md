# Créateur de patrons

Un atelier de tricot dans le téléphone : on part de sa laine et de ses aiguilles, on assemble des blocs et des points, on voit le résultat, puis on suit le patron rang par rang.

- **Application** : https://pokecopine.github.io/poketricot/
- **Hors connexion** : une fois ouverte, l'application s'installe sur l'écran d'accueil et fonctionne en mode avion.
- **Données** : tout reste sur le téléphone. La sauvegarde se fait par fichier (Réglages → Exporter / Importer).

## État

| Étape | Contenu | État |
| --- | --- | --- |
| E0 — Socle | Installation, hors connexion, base de données, réserve (laines et aiguilles), réglages et sauvegarde | ✅ |
| E1 — Catalogue | Notation des points, simulateur, conversion en rond, rendu des textures, échantillon en 3D (fil lisse, tournable, ombres de contact, éclairage indirect et nuances), écran de consultation (dessin et vignette 3D sur chaque carte, recherche par nom et par critères), favoris et points à tester | ✅ 103 points (0.12.0) (7 lots, dont les 7 points de De Rerum Natura et le point d'étoile) |
| E2 — Moteur | Densités (mesurées ou estimées), mailles et rangs qui tombent juste, rangs de transition, plan complet de l'écharpe vérifié par le simulateur, métrage | ✅ moteur et onglet Échantillons de la réserve |
| E3 — Écharpe | Nouveau projet, matériel, taille, builder, aperçu en 3D (sur une barre ou autour du cou, physique de tissu), patron figé rang par rang, suivi des rangs, suppression d'un projet | ✅ (0.9.1) ; reste l'essai 📱 |
| E3b — Colonnes et couleurs | Nombre de mailles du rang visible, corps et bandes en colonnes (damier), bandes et bordures dans une autre laine, fil porté en option, métrage par laine | ✅ (0.6.0) |
| E4 à E6 | Bonnet / snood / couverture, laine insuffisante, bibliothèque | À venir |

## Installer sur le téléphone (Chrome Android)

1. Ouvrir https://pokecopine.github.io/poketricot/ dans Chrome.
2. Menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
3. L'icône pelote apparaît : l'application s'ouvre en plein écran, même sans réseau.

## Pour le développement

- Aucune compilation : HTML, CSS et JavaScript en modules, avec [Preact](https://preactjs.com/) et [htm](https://github.com/developit/htm) copiés dans `vendor/`, et [Three.js](https://threejs.org/) dans `vendor/three/` avec ses commandes de caméra et sa pièce d'éclairage `RoomEnvironment` (chargé seulement pour les vues 3D).
- Lancer en local : `npm run serve`, puis ouvrir http://localhost:8080.
- Tests : `npm install` puis `npm test`.
- Chaque envoi sur `main` lance les tests ; s'ils passent, GitHub Pages publie le site (voir `.github/workflows/publier.yml`).
- À chaque publication, changer la version dans `js/version.js` **et** `sw.js` ; tout nouveau fichier doit être ajouté à la liste de `sw.js` (les tests le vérifient).

## Organisation

```
index.html            une seule page
manifest.webmanifest  installation sur l'écran d'accueil
sw.js                 fonctionnement hors connexion et mises à jour
css/pelote.css        couleurs et formes de l'ambiance Pelote (clair et sombre)
js/app.js             démarrage et navigation
js/ecrans/            un fichier par écran (projet-*.js : étapes 1 à 5 ; patron.js : patron figé et suivi)
js/composants/        éléments réutilisables (dont echantillon3d.js et vignette3d.js : photos 3D du catalogue)
js/donnees/           base de données, réserve, sauvegarde, couleurs
js/catalogue/         gestes, points (première fournée + lots/), avis sur les côtés (cotes.js), critères de recherche, techniques, consignes écrites
js/moteur/            simulateur (comptage des mailles, conversion en rond), densités, dimensions,
                      plan de l'écharpe et sa vérification, métrage, générateur du patron et suivi
js/rendu/             textures en SVG ; 3D : chemin du fil, ombres de contact (occlusion.js), lumière et nuances (lumiere.js), cuisson des textures, simulation de tissu
tests/                tests automatiques
```

## Licences

- Polices Fraunces et Nunito : SIL Open Font License 1.1.
- Preact et htm : licence MIT (voir `vendor/`).
- Three.js 0.168 (rendu 3D des échantillons) : licence MIT (voir `vendor/three/`).
- Les points de tricot s'appuient sur les articles des [Triconautes](https://www.lestriconautes.com/) et du blog [De Rerum Natura](https://blog.dererumnatura.fr/) : seuls les noms et la structure des points sont repris, avec un lien vers chaque article ; aucun texte ni image de ces sites n'est reproduit.
