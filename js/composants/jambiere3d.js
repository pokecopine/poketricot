// Les jambières finies en 3D (E4-23, maquette validée le 09/11) : une jambière sur une jambe de mannequin lisse,
// rigide et moulée dessus, sans physique de tissu : rien ne glisse ni ne tombe. Textures cuites de chaque zone
// (bords, corps ou sections, colonnes), dans la couleur de chaque laine ; à plat, la couture à l'arrière du mollet.
// Une seule jambière est montrée : l'autre est la même (carte « × 2 » à côté).
// Un doigt tourne autour, deux doigts zooment ; « Recentrer la vue ».

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { couleurDeLaine } from "./piece.js";
import { fabriqueDeMatieres, tuileDuRect } from "./piece3d.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { liberer } from "../rendu/cuisson.js";
import { environnement, libererEnvironnement } from "../rendu/lumiere.js";
import { pixelsPour10cm, echelleAffichee } from "../rendu/tube.js";
import { profilDeJambe, rayonDeJambiere, pointDeJambiere, nappeDeJambiere, tranchesDeJambiere, CHEVILLE, HAUT_JAMBE, OVALE } from "../rendu/jambe.js";
import { chargerThree } from "./echantillon3d.js";
import { IconeRecentrer } from "./icones.js";

const FOV = 34;
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Le texte qui décrit la vue (lecteurs d'écran). */
export function descriptionDesJambieres(projet, plan, laines = []) {
  const morceaux = [`Une jambière en 3D sur une jambe de mannequin : ${Math.round(plan.largeur.reelleCm)} cm de tour et ${Math.round(plan.longueur.reelleCm)} cm de long, de la cheville vers le genou`];
  for (const b of plan.blocs) {
    const l = laines.find((x) => x.id === (b.laineId || projet.laineId));
    const quoi = b.zone === "bas" ? "bord du bas" : b.zone === "haut" ? "bord du haut" : b.nom || "corps";
    morceaux.push(`${quoi} en ${b.colonnes?.length ? `${b.colonnes.length} colonnes` : minuscule(pointParId(b.pointId)?.nom || "")}${l && laines.length > 1 ? ` « ${l.nom} »` : ""}`);
  }
  if (plan.mode === "plat") morceaux.push("tricotée à plat : la couture est à l'arrière du mollet");
  return morceaux.join(", ") + ". L'autre jambière est la même. Glisse un doigt pour tourner autour, pince pour zoomer.";
}

export function Jambiere3D({ projet, plan, couleur, laines = [], densites = {}, hauteur = 440 }) {
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
        renderer.domElement.setAttribute("aria-label", descriptionDesJambieres(projet, plan, laines));

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#EDE4D6");
        const camera = new THREE.PerspectiveCamera(FOV, largeurPx / hauteur, 1, 3000);
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

        // ---- La jambe de mannequin, le pied et le socle ----
        const jambe = profilDeJambe(projet.taille?.molletCm || 36);
        const toile = new THREE.MeshStandardMaterial({ color: "#E6D9C3", roughness: 0.95 });
        const bois = new THREE.MeshStandardMaterial({ color: "#B08A5E", roughness: 0.7 });
        aJeter.push(toile, bois);
        const groupe = new THREE.Group();
        groupe.scale.set(OVALE.x, 1, OVALE.z);
        scene.add(groupe);
        poser(new THREE.LatheGeometry(jambe.points.filter((_, i) => i % 4 === 0).map((p) => new THREE.Vector2(p.r, p.y)), 96), toile, groupe);
        const dessus = poser(new THREE.CylinderGeometry(7.5 * jambe.echelle, 7.5 * jambe.echelle, 1.2, 64), bois, groupe);
        dessus.position.y = HAUT_JAMBE + 0.6;
        const pied = poser(new THREE.SphereGeometry(1, 64, 32), toile);
        pied.scale.set(4.2, 3.6, 12);
        pied.position.set(0, 4.2, 5.2);
        const talon = poser(new THREE.SphereGeometry(1, 48, 24), toile);
        talon.scale.set(3.8, 4.4, 4.2);
        talon.position.set(0, 5.4, -0.4);
        const socle = poser(new THREE.CylinderGeometry(14, 15, 2, 64), bois);
        socle.position.y = -0.2;

        // ---- La jambière : une tranche par bloc (et par colonne), dans la couleur de sa laine ----
        const { matiere, materiaux } = fabriqueDeMatieres(THREE, renderer);
        const tuiles = new Map();
        const tuile = (pointId, densite) => {
          if (!tuiles.has(pointId)) tuiles.set(pointId, tuileDuRect(THREE, renderer, { pointId }, densite ? { ...densites, [pointId]: densite } : densites) || { l: 1, h: 1 });
          return tuiles.get(pointId);
        };
        const tour = plan.largeur.reelleCm;
        const longueur = plan.longueur.reelleCm;
        const aPlat = plan.mode === "plat";
        const tranches = tranchesDeJambiere(plan.blocs, longueur);
        const surface = (n) => {
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(n.positions, 3));
          g.setAttribute("uv", new THREE.Float32BufferAttribute(n.uv, 2));
          g.setIndex(n.index);
          g.computeVertexNormals();
          return g;
        };
        for (const t of tranches) {
          const b = plan.blocs.find((x) => x.id === t.id);
          const vTexture = (v) => v - t.v0;
          if (b.colonnes?.length) {
            const somme = b.colonnes.reduce((s, c) => s + (c.largeurCm || 1), 0);
            let a = Math.PI;
            for (const c of b.colonnes) {
              const da = (2 * Math.PI * (c.largeurCm || 1)) / somme;
              if (pointParId(c.pointId)) {
                const laineId = aPlat && c.laineId ? c.laineId : b.laineId;
                poser(surface(nappeDeJambiere({ profil: jambe, tourCm: tour, v0: t.v0, v1: t.v1, a0: a, a1: a + da, tuile: tuile(c.pointId, c.densite), vTexture })),
                  matiere(c.pointId, couleurDeLaine(laineId, couleur, laines), "endroit"));
              }
              a += da;
            }
          } else if (pointParId(b.pointId)) {
            poser(surface(nappeDeJambiere({ profil: jambe, tourCm: tour, v0: t.v0, v1: t.v1, tuile: tuile(b.pointId, b.densite), vTexture })),
              matiere(b.pointId, couleurDeLaine(b.laineId, couleur, laines), "endroit"));
          }
        }
        // Les deux bords, à peine arrondis (l'épaisseur du tricot).
        for (const [b, v] of [[plan.blocs[0], 0], [plan.blocs.at(-1), longueur]]) {
          const y = CHEVILLE + v;
          const tore = new THREE.TorusGeometry(rayonDeJambiere(jambe, y, tour), 0.22, 8, 160);
          tore.rotateX(Math.PI / 2);
          const m = poser(tore, matiere(b.pointId, couleurDeLaine(b.laineId, couleur, laines), "endroit"));
          m.scale.set(OVALE.x, 1, OVALE.z);
          m.position.y = y;
        }
        // À plat : la couture, une ligne discrète à l'arrière du mollet.
        if (aPlat) {
          const pts = [];
          for (let v = 0; v <= longueur; v += 0.5) pts.push(new THREE.Vector3(...pointDeJambiere(jambe, tour, v, Math.PI, 0.05)));
          const teinte = new THREE.Color(nuancesLaine(couleurDeLaine(plan.blocs[0].laineId, couleur, laines)).maille).multiplyScalar(0.55);
          const mat = new THREE.MeshStandardMaterial({ color: teinte, roughness: 1 });
          aJeter.push(mat);
          poser(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.26, 8, false), mat);
        }

        // ---- Le fond ----
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: "#5A4632", opacity: 0.22 }));
        sol.rotation.x = -Math.PI / 2;
        sol.position.y = -1.2;
        sol.receiveShadow = true;
        scene.add(sol);
        aJeter.push(sol.geometry, sol.material);

        // ---- La lumière : comme le bonnet, avec un contre-jour plus fort pour lire la couture à l'arrière ----
        scene.environment = environnement(THREE, outils.RoomEnvironment, renderer);
        scene.environmentIntensity = 0.3;
        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.3));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        soleil.position.set(-36, 110, 54);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        Object.assign(soleil.shadow.camera, { left: -50, right: 50, top: 90, bottom: -10, near: 1, far: 400 });
        soleil.shadow.bias = -0.0004;
        soleil.shadow.normalBias = 0.02;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.9);
        contre.position.set(40, 40, -70);
        scene.add(contre);

        // ---- Caméra et commandes ----
        // Vue de départ : de trois quarts face ; à plat, de l'arrière, plus près, pour voir la couture.
        const centre = new THREE.Vector3(0, aPlat ? CHEVILLE + longueur * 0.57 : 36, 0);
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        controles.minPolarAngle = Math.PI * 0.2;
        controles.maxPolarAngle = Math.PI * 0.55;
        const loin = 150;
        const depart = aPlat ? Math.max(70, longueur * 2.4) : loin;
        controles.minDistance = 25;
        controles.maxDistance = loin * 1.4;
        const viser = () => {
          const polaire = Math.PI * 0.46;
          const azimut = aPlat ? Math.PI * 0.9 : 0.45;
          camera.position.set(
            centre.x + depart * Math.sin(polaire) * Math.sin(azimut),
            centre.y + depart * Math.cos(polaire),
            centre.z + depart * Math.sin(polaire) * Math.cos(azimut),
          );
          controles.update();
        };
        viser();

        const majEchelle = () => {
          if (!echelle.current) return;
          const distance = camera.position.distanceTo(controles.target);
          const px = pixelsPour10cm({ distance, rayon: jambe.molletR, hauteurPx: hauteur, fov: FOV }) / 10;
          const { cm, px: l } = echelleAffichee(px);
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
          // Pour les vérifications d'écran : une vue donnée (angle polaire et azimut en radians, distance).
          vue: (polaire, azimut, distance = depart) => {
            camera.position.set(centre.x + distance * Math.sin(polaire) * Math.sin(azimut), centre.y + distance * Math.cos(polaire), centre.z + distance * Math.sin(polaire) * Math.cos(azimut));
            controles.update();
            renderer.render(scene, camera);
            majEchelle();
          },
        };
        if (typeof window !== "undefined") window.__vueJambiere = commandes.current.vue;

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
          if (typeof window !== "undefined" && window.__vueJambiere) delete window.__vueJambiere;
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
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote ta jambière…</span>`}
        ${etat === "impossible" && html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le dessin reste disponible.</span>`}
        <div class="vue3d-echelle" ref=${echelle} aria-hidden="true" hidden=${etat !== "pret"}><i></i><span>10 cm</span></div>
        ${etat === "pret" &&
        html`<button type="button" class="vue3d-recentrer" aria-label="Recentrer la vue" onClick=${() => commandes.current?.recentrer()}>${IconeRecentrer()}</button>
          <p class="vue3d-aide" aria-hidden="true">Tourne la jambe avec un doigt · pince pour zoomer</p>`}
      </div>
    </div>`;
}
