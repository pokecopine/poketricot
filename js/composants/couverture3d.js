// La couverture finie en 3D (E4-29, 0.21.0, maquettes 4a à 4c validées le 09/11) : rigide, drapée sur un meuble
// qui dépend de la taille (canapé pour le plaid, lit 1 personne, lit 2 personnes), sans physique de tissu.
// Textures cuites de chaque zone (bordure, corps ou sections, colonnes de chaque panneau), dans la couleur de
// chaque laine ; en panneaux, les coutures se voient, discrètes. Un doigt tourne autour, deux doigts zooment.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { couleurDeLaine, geometrieCouverture } from "./piece.js";
import { fabriqueDeMatieres, tuileDuRect } from "./piece3d.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { liberer } from "../rendu/cuisson.js";
import { environnement, libererEnvironnement } from "../rendu/lumiere.js";
import { pixelsPour10cm, echelleAffichee } from "../rendu/tube.js";
import { DECORS, nappeDeCouverture, morceauDeNappe, decrireCouverture } from "../rendu/couverture.js";
import { decorCouverture } from "../donnees/projets.js";
import { chargerThree } from "./echantillon3d.js";
import { IconeRecentrer } from "./icones.js";

const FOV = 34;
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function Couverture3D({ projet, plan, couleur, laines = [], densites = {}, hauteur = 360 }) {
  const boite = useRef(null);
  const echelle = useRef(null);
  const commandes = useRef(null);
  const [etat, setEtat] = useState("chargement");
  const decor = decorCouverture(projet.taille);

  useEffect(() => {
    let annule = false;
    let nettoyer = () => {};
    setEtat("chargement");
    chargerThree()
      .then((outils) => {
        const { THREE, OrbitControls } = outils;
        if (annule || !boite.current) return;
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
        const corps = plan.blocs.find((b) => b.zone === "corps");
        const bordure = pointParId(projet.blocs.find((b) => b.id === "bas")?.pointId);
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute("aria-label", decrireCouverture({
          decor, largeurCm: plan.largeur.reelleCm, longueurCm: plan.longueur.reelleCm, panneaux: plan.panneaux?.length || 1,
          corps: corps?.colonnes ? `${corps.colonnes.length} colonnes` : minuscule(pointParId(corps?.pointId)?.nom || ""),
          bordure: bordure ? minuscule(bordure.nom) : null,
        }));

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#EDE4D6");
        const camera = new THREE.PerspectiveCamera(FOV, largeurPx / hauteur, 1, 4000);
        const geometries = [];
        const aJeter = [];
        const poser = (g, materiau, parent = scene) => {
          geometries.push(g);
          const m = new THREE.Mesh(g, materiau);
          m.castShadow = true;
          m.receiveShadow = true;
          parent.add(m);
          return m;
        };
        const boiteA = (l, h, p, materiau, x, y, z) => {
          const m = poser(new THREE.BoxGeometry(l, h, p), materiau);
          m.position.set(x, y, z);
          return m;
        };

        // ---- Le meuble ----
        const d = DECORS[decor];
        const bois = new THREE.MeshStandardMaterial({ color: "#B08A5E", roughness: 0.7 });
        aJeter.push(bois);
        if (d.type === "lit") {
          const drap = new THREE.MeshStandardMaterial({ color: "#F4EEE4", roughness: 0.95 });
          const blanc = new THREE.MeshStandardMaterial({ color: "#FBF8F2", roughness: 0.95 });
          const teteBois = new THREE.MeshStandardMaterial({ color: "#B89A74", roughness: 0.75 });
          aJeter.push(drap, blanc, teteBois);
          const L = d.longueur;
          const W = d.largeur;
          boiteA(W - 6, 18, L - 6, bois, 0, 14, 0);
          // Le matelas dessiné un peu en retrait : la couverture passe sur ses arêtes sans les laisser voir.
          boiteA(W - 4, d.matelas - 25, L - 4, drap, 0, 23 + (d.matelas - 25) / 2, 0);
          boiteA(W + 8, 100, 5, teteBois, 0, 50, -L / 2 - 3);
          for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const pied = poser(new THREE.CylinderGeometry(2.5, 2.5, 6, 16), bois);
            pied.position.set(x * (W / 2 - 6), 3, z * (L / 2 - 6));
          }
          // Les oreillers, posés sur le haut de la couverture.
          const n = d.oreillers;
          for (let i = 0; i < n; i++) {
            const o = poser(new THREE.SphereGeometry(1, 48, 24), blanc);
            const lo = n === 1 ? 62 : 66;
            o.scale.set(lo / 2, 7, 22);
            o.position.set(n === 1 ? 0 : (i - 0.5) * 74, d.matelas + 7.5, -L / 2 + 26);
          }
        } else {
          const tissu = new THREE.MeshStandardMaterial({ color: "#8E9C8A", roughness: 0.95 });
          const coussin = new THREE.MeshStandardMaterial({ color: "#A3B09F", roughness: 0.95 });
          aJeter.push(tissu, coussin);
          const W = d.largeurAssise;
          const P = d.profondeurAssise;
          boiteA(W, d.assise - 12, P, tissu, 0, 6 + (d.assise - 12) / 2, 0);
          boiteA(W, 12, P, coussin, 0, d.assise - 6, 0);
          boiteA(W, d.dossier - 6, d.epaisseurDossier, tissu, 0, 6 + (d.dossier - 6) / 2, -P / 2 - d.epaisseurDossier / 2);
          for (const s of [-1, 1]) boiteA(d.largeurAccoudoir, d.accoudoir - 6, P + d.epaisseurDossier, tissu, s * (W / 2 + d.largeurAccoudoir / 2), 6 + (d.accoudoir - 6) / 2, -d.epaisseurDossier / 2);
          for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const pied = poser(new THREE.CylinderGeometry(2, 2, 6, 12), bois);
            pied.position.set(x * (W / 2 + 10), 3, z * (P / 2));
          }
        }

        // ---- La couverture : un morceau par zone (et par colonne), dans la couleur de sa laine ----
        const { matiere, materiaux } = fabriqueDeMatieres(THREE, renderer);
        const tuiles = new Map();
        const tuile = (pointId) => {
          if (!tuiles.has(pointId)) tuiles.set(pointId, tuileDuRect(THREE, renderer, { pointId }, densites) || { l: 1, h: 1 });
          return tuiles.get(pointId);
        };
        const largeur = plan.largeur.reelleCm;
        const longueur = plan.longueur.reelleCm;
        const nappe = nappeDeCouverture({ largeurCm: largeur, longueurCm: longueur, decor });
        const surface = (n) => {
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(n.positions, 3));
          g.setAttribute("uv", new THREE.Float32BufferAttribute(n.uv, 2));
          g.setIndex(n.index);
          g.computeVertexNormals();
          return g;
        };
        const geo = geometrieCouverture(projet, plan);
        for (const r of geo.rects) {
          if (!pointParId(r.pointId) || r.l <= 0 || r.h <= 0) continue;
          poser(surface(morceauDeNappe(nappe, { u0: r.x, u1: r.x + r.l, v0: r.y, v1: r.y + r.h, tuile: tuile(r.pointId) })),
            matiere(r.pointId, couleurDeLaine(r.laineId, couleur, laines), "endroit"));
        }
        // Le dessous (l'envers), d'un seul tenant, dans le point du corps.
        if (pointParId(projet.pointPrincipal)) {
          const t = tuile(projet.pointPrincipal);
          const dessous = { positions: nappe.positions, index: nappe.index, uv: nappe.uv.map((x, i) => (i % 2 ? x / t.h : x / t.l)) };
          poser(surface(dessous), matiere(projet.pointPrincipal, couleur, "envers"));
        }
        // Les coutures : une ligne un peu plus foncée, à peine au-dessus.
        if (geo.coutures.length) {
          const teinte = new THREE.Color(nuancesLaine(couleur).maille).multiplyScalar(0.6);
          const mat = new THREE.MeshStandardMaterial({ color: teinte, roughness: 1 });
          aJeter.push(mat);
          for (const u of geo.coutures) {
            const pts = [];
            for (let v = 0; v <= longueur; v += 2) {
              const [x, y, z] = nappe.point(u, v);
              pts.push(new THREE.Vector3(x, y + 0.2, z));
            }
            poser(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.ceil(longueur / 2), 0.3, 6, false), mat);
          }
        }

        // ---- Le sol ----
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ color: "#5A4632", opacity: 0.22 }));
        sol.rotation.x = -Math.PI / 2;
        sol.receiveShadow = true;
        scene.add(sol);
        aJeter.push(sol.geometry, sol.material);

        // ---- La lumière ----
        scene.environment = environnement(THREE, outils.RoomEnvironment, renderer);
        scene.environmentIntensity = 0.32;
        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.3));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        soleil.position.set(-120, 260, 160);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        Object.assign(soleil.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 900 });
        soleil.shadow.bias = -0.0004;
        soleil.shadow.normalBias = 0.03;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.6);
        contre.position.set(150, 120, -150);
        scene.add(contre);

        // ---- Caméra : de trois quarts, un peu au-dessus ----
        const centre = new THREE.Vector3(0, d.type === "lit" ? d.matelas * 0.75 : d.assise * 1.05, d.type === "lit" ? 10 : 0);
        const taille = Math.max(largeur, longueur, d.type === "lit" ? d.longueur : d.largeurAssise);
        const depart = taille * 1.55 + 40;
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        controles.minPolarAngle = Math.PI * 0.12;
        controles.maxPolarAngle = Math.PI * 0.48;
        controles.minDistance = 30;
        controles.maxDistance = depart * 1.5;
        const placer = (polaire, azimut, distance) => {
          camera.position.set(
            centre.x + distance * Math.sin(polaire) * Math.sin(azimut),
            centre.y + distance * Math.cos(polaire),
            centre.z + distance * Math.sin(polaire) * Math.cos(azimut),
          );
          controles.update();
        };
        const viser = () => placer(Math.PI * 0.34, 0.6, depart);
        viser();

        const majEchelle = () => {
          if (!echelle.current) return;
          const distance = camera.position.distanceTo(controles.target);
          const px = pixelsPour10cm({ distance, rayon: 0, hauteurPx: hauteur, fov: FOV }) / 10;
          const { cm, px: l } = echelleAffichee(px, [5, 10, 20, 50, 100]);
          echelle.current.style.setProperty("--longueur", `${Math.round(l)}px`);
          echelle.current.querySelector("span").textContent = `${cm} cm`;
        };

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
        commandes.current = {
          recentrer: () => { viser(); aDessiner = true; majEchelle(); },
          vue: (polaire, azimut, distance = depart) => {
            placer(polaire, azimut, distance);
            renderer.render(scene, camera);
            majEchelle();
          },
        };
        if (typeof window !== "undefined") window.__vueCouverture = commandes.current.vue;

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
          if (typeof window !== "undefined" && window.__vueCouverture) delete window.__vueCouverture;
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
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote ta couverture…</span>`}
        ${etat === "impossible" && html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le dessin reste disponible.</span>`}
        <div class="vue3d-echelle" ref=${echelle} aria-hidden="true" hidden=${etat !== "pret"}><i></i><span>50 cm</span></div>
        ${etat === "pret" &&
        html`<button type="button" class="vue3d-recentrer" aria-label="Recentrer la vue" onClick=${() => commandes.current?.recentrer()}>${IconeRecentrer()}</button>
          <p class="vue3d-aide" aria-hidden="true">Tourne ${decor === "canape" ? "le canapé" : "le lit"} avec un doigt · pince pour zoomer</p>`}
      </div>
    </div>`;
}
