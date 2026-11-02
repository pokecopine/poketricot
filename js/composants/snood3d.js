// Le snood fini en 3D (E4-9, décision du 02/11) : seul, sans mannequin, comme un tube rigide et tendu,
// à ses vraies dimensions, pour que le point se lise sur tout le tour. Pas de physique de tissu.
// Les textures sont celles de l'écharpe (cuites depuis le tricot 3D de chaque point), bloc par bloc,
// dans la couleur de chaque laine : l'endroit à l'extérieur, l'envers à l'intérieur.
// Un doigt tourne autour (de face à un peu au-dessus), deux doigts zooment ; « Recentrer la vue » revient au départ.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { geometrieSnood, couleurDeLaine } from "./piece.js";
import { fabriqueDeMatieres, tuileDuRect } from "./piece3d.js";
import { liberer } from "../rendu/cuisson.js";
import { environnement, libererEnvironnement } from "../rendu/lumiere.js";
import { tubeRigide, distanceDeCadrage, pixelsPour10cm, echelleAffichee } from "../rendu/tube.js";
import { chargerThree } from "./echantillon3d.js";
import { IconeRecentrer } from "./icones.js";

const FOV = 34;
const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Une BufferGeometry depuis les tableaux d'un morceau du tube. */
function geometrie(THREE, { positions, normales, uv, index }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/** Le texte qui décrit la vue (lecteurs d'écran). */
export function descriptionDuSnood(projet, plan, laines = []) {
  const geo = geometrieSnood(projet, plan);
  const corps = pointParId(projet.blocs.find((b) => b.zone === "corps")?.pointId || projet.pointPrincipal);
  const bas = pointParId(projet.blocs.find((b) => b.zone === "bas")?.pointId);
  const laine = laines.find((l) => l.id === projet.laineId);
  const morceaux = [`Snood en 3D : un tube de ${Math.round(geo.tour)} cm de tour et ${Math.round(geo.hauteur)} cm de haut`];
  const sections = projet.blocs.filter((b) => b.zone === "corps" && b.section);
  if (sections.length > 1) {
    // E3c : chaque section nommée avec son point et sa laine.
    sections.forEach((b, i) => {
      const p = pointParId(b.pointId);
      const l = laines.find((x) => x.id === (b.laineId || projet.laineId));
      morceaux.push(`section ${i + 1} en ${p ? minuscule(p.nom) : "point à choisir"}${l ? ` « ${l.nom} »` : ""}`);
    });
  } else if (corps) morceaux.push(`corps en ${minuscule(corps.nom)}${laine ? ` « ${laine.nom} »` : ""}`);
  if (bas) morceaux.push(`bordures en ${minuscule(bas.nom)}`);
  return morceaux.join(", ") + ". Glisse un doigt pour tourner autour, pince pour zoomer.";
}

export function Snood3D({ projet, plan, couleur, laines = [], densites = {}, hauteur = 460 }) {
  const boite = useRef(null);
  const echelle = useRef(null);
  const commandes = useRef(null);
  const [etat, setEtat] = useState("chargement");

  useEffect(() => {
    let annule = false;
    let nettoyer = () => {};
    setEtat("chargement");
    chargerThree()
      .then((outils) => {
        const { THREE, OrbitControls } = outils;
        if (annule || !boite.current) return;
        const geo = geometrieSnood(projet, plan);
        const largeurPx = boite.current.clientWidth || 340;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        } catch {
          return setEtat("impossible");
        }
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(largeurPx, hauteur);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        boite.current.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute("aria-label", descriptionDuSnood(projet, plan, laines));

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#EDE4D6");
        const camera = new THREE.PerspectiveCamera(FOV, largeurPx / hauteur, 1, 3000);

        // ---- Le tube ----
        const { matiere, materiaux } = fabriqueDeMatieres(THREE, renderer);
        const tuiles = new Map();
        const tuile = (r) => {
          if (!tuiles.has(r)) tuiles.set(r, tuileDuRect(THREE, renderer, r, densites) || { l: 1, h: 1 });
          return tuiles.get(r);
        };
        const rects = geo.rects.filter((r) => pointParId(r.pointId));
        const tube = tubeRigide({ tour: geo.tour, hauteur: geo.hauteur, rects, tuiles: tuile });
        const geometries = [];
        const groupe = new THREE.Group();
        const poser = (donnees, materiau) => {
          const g = geometrie(THREE, donnees);
          geometries.push(g);
          const mesh = new THREE.Mesh(g, materiau);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          groupe.add(mesh);
        };
        for (const m of tube.morceaux) {
          const teinte = couleurDeLaine(m.rect.laineId, couleur, laines);
          poser(m.exterieur, matiere(m.rect.pointId, teinte, "endroit"));
          poser(m.interieur, matiere(m.rect.pointId, teinte, "envers"));
          for (const b of m.bords) poser(b, matiere(m.rect.pointId, teinte, "endroit"));
        }
        scene.add(groupe);

        // ---- Le fond : seule l'ombre du tube se voit ----
        const etendue = tube.rayon * 6 + 60;
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(etendue, etendue), new THREE.ShadowMaterial({ color: "#5A4632", opacity: 0.22 }));
        sol.rotation.x = -Math.PI / 2;
        sol.receiveShadow = true;
        scene.add(sol);
        const aJeter = [sol.geometry, sol.material];

        // ---- La lumière : éclairage indirect, fenêtre rasante d'en haut à gauche, contre-jour ----
        scene.environment = environnement(THREE, outils.RoomEnvironment, renderer);
        scene.environmentIntensity = 0.3;
        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.3));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        const taille = Math.max(tube.rayon * 2, geo.hauteur);
        // Assez haut pour que l'ombre portée reste courte, assez rasante sur la paroi pour le relief des mailles.
        soleil.position.set(-taille * 1.2, taille * 3, taille * 1.8);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        const portee = tube.rayon * 2 + geo.hauteur * 1.6;
        Object.assign(soleil.shadow.camera, { left: -portee, right: portee, top: portee, bottom: -portee, near: 1, far: taille * 8 });
        soleil.shadow.bias = -0.0004;
        soleil.shadow.normalBias = 0.02;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.5);
        contre.position.set(taille, taille * 0.4, -taille * 2);
        scene.add(contre);

        // ---- Caméra et commandes ----
        const centre = new THREE.Vector3(0, tube.base + geo.hauteur / 2, 0);
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        // De la vue de face à un peu au-dessus (pour voir l'intérieur), jamais en dessous.
        controles.minPolarAngle = Math.PI * 0.28;
        controles.maxPolarAngle = Math.PI * 0.5;
        const depart = distanceDeCadrage({ rayon: tube.rayon, hauteur: geo.hauteur, fov: FOV, aspect: largeurPx / hauteur });
        // Zoom jusqu'à lire les mailles : la face avant à 5 cm de la caméra.
        controles.minDistance = tube.rayon + 5;
        controles.maxDistance = depart * 1.6;
        const viser = () => {
          // Vue de départ : de face (le début du tour est derrière), un peu au-dessus.
          const polaire = Math.PI * 0.37;
          camera.position.set(0, centre.y + depart * Math.cos(polaire), depart * Math.sin(polaire));
          controles.update();
        };
        viser();

        const majEchelle = () => {
          if (!echelle.current) return;
          const distance = camera.position.distanceTo(controles.target);
          const px = pixelsPour10cm({ distance, rayon: tube.rayon, hauteurPx: hauteur, fov: FOV }) / 10;
          const { cm, px: l } = echelleAffichee(px);
          echelle.current.style.setProperty("--longueur", `${Math.round(l)}px`);
          echelle.current.querySelector("span").textContent = `${cm} cm`;
        };

        // ---- Boucle : on ne redessine que quand la vue change ----
        let enCours = true;
        let aDessiner = true;
        controles.addEventListener("change", () => {
          aDessiner = true;
          majEchelle();
        });
        const boucle = () => {
          if (!enCours) return;
          controles.update();
          if (aDessiner) {
            renderer.render(scene, camera);
            aDessiner = false;
          }
          requestAnimationFrame(boucle);
        };
        majEchelle();
        renderer.render(scene, camera);
        setEtat("pret");
        requestAnimationFrame(boucle);
        commandes.current = { recentrer: () => { viser(); aDessiner = true; majEchelle(); } };

        const surTaille = () => {
          const l = boite.current?.clientWidth;
          if (!l) return;
          renderer.setSize(l, hauteur);
          camera.aspect = l / hauteur;
          camera.updateProjectionMatrix();
          aDessiner = true;
        };
        window.addEventListener("resize", surTaille);

        nettoyer = () => {
          enCours = false;
          window.removeEventListener("resize", surTaille);
          controles.dispose();
          geometries.forEach((g) => g.dispose());
          for (const m of materiaux.values()) m.dispose();
          aJeter.forEach((x) => x.dispose());
          liberer(renderer);
          libererEnvironnement(renderer);
          renderer.dispose();
          renderer.forceContextLoss?.();
          renderer.domElement.remove();
          commandes.current = null;
        };
      })
      .catch((e) => {
        console.error(e);
        if (!annule) setEtat("impossible");
      });
    return () => {
      annule = true;
      nettoyer();
    };
  }, [projet, plan, couleur, laines, hauteur]);

  return html`
    <div class="echantillon-3d">
      <div class="echantillon-3d-scene piece-3d-scene" ref=${boite} style=${`height:${hauteur}px`}>
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote ton snood…</span>`}
        ${etat === "impossible" && html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le dessin reste disponible.</span>`}
        <div class="vue3d-echelle" ref=${echelle} aria-hidden="true" hidden=${etat !== "pret"}><i></i><span>10 cm</span></div>
        ${etat === "pret" &&
        html`<button type="button" class="vue3d-recentrer" aria-label="Recentrer la vue" onClick=${() => commandes.current?.recentrer()}>${IconeRecentrer()}</button>
          <p class="vue3d-aide" aria-hidden="true">Tourne-le avec un doigt · pince pour zoomer</p>`}
      </div>
    </div>`;
}
