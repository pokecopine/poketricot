// Le bonnet fini en 3D (E4-17, décision du 06/11, maquette validée le 09/11) : sur une tête de mannequin lisse,
// sans visage, le bonnet rigide moulé dessus, sans physique de tissu : il ne glisse pas et ne tombe pas.
// Textures cuites de chaque zone (bord, corps ou sections, sommet), dans la couleur de chaque laine ;
// revers replié avec son pli ; 8 lignes de diminutions au sommet ; pompon duveteux.
// Un doigt tourne autour (de face jusqu'à la vue d'au-dessus), deux doigts zooment ; « Recentrer la vue ».

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { couleurDeLaine } from "./piece.js";
import { fabriqueDeMatieres, tuileDuRect } from "./piece3d.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { liberer } from "../rendu/cuisson.js";
import { environnement, libererEnvironnement } from "../rendu/lumiere.js";
import { pixelsPour10cm, echelleAffichee } from "../rendu/tube.js";
import { profilDeTete, nappeDuBonnet, tranchesDuBonnet, pointDuBonnet, surArc, APLATISSEMENT, ECART_BONNET } from "../rendu/tete.js";
import { chargerThree } from "./echantillon3d.js";
import { IconeRecentrer } from "./icones.js";

const FOV = 34;
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function geometrie(THREE, { positions, normales, uv, index }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/** Le texte qui décrit la vue (lecteurs d'écran). */
export function descriptionDuBonnet(projet, plan, laines = []) {
  const morceaux = [`Bonnet en 3D sur une tête de mannequin : ${Math.round(plan.largeur.reelleCm)} cm de tour et ${Math.round(plan.longueur.reelleCm)} cm de haut`];
  const bord = plan.blocs.find((b) => b.zone === "bas");
  if (bord) morceaux.push(`bord en ${minuscule(pointParId(bord.pointId)?.nom || "")}${plan.revers ? " avec revers replié" : ""}`);
  const parties = plan.blocs.filter((b) => b.zone === "corps");
  for (const b of parties) {
    const l = laines.find((x) => x.id === (b.laineId || projet.laineId));
    morceaux.push(`${parties.length > 1 ? b.nom || "section" : "corps"} en ${minuscule(pointParId(b.pointId)?.nom || "")}${l ? ` « ${l.nom} »` : ""}`);
  }
  if (plan.sommet) morceaux.push(`sommet en ${minuscule(pointParId(plan.sommet.pointId)?.nom || "jersey")}`);
  if (plan.pompon) morceaux.push(`pompon de ${plan.pompon.cm} cm`);
  return morceaux.join(", ") + ". Glisse un doigt pour tourner autour, pince pour zoomer.";
}

export function Bonnet3D({ projet, plan, couleur, laines = [], densites = {}, hauteur = 440 }) {
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
        renderer.domElement.setAttribute("aria-label", descriptionDuBonnet(projet, plan, laines));

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

        // ---- La tête, le cou, le pied ----
        const tete = profilDeTete((plan.largeur.reelleCm || 51) + 5);
        const toile = new THREE.MeshStandardMaterial({ color: "#E6D9C3", roughness: 0.95 });
        const bois = new THREE.MeshStandardMaterial({ color: "#B08A5E", roughness: 0.7 });
        aJeter.push(toile, bois);
        const groupe = new THREE.Group();
        groupe.scale.set(APLATISSEMENT.x, 1, APLATISSEMENT.z);
        scene.add(groupe);
        const contour = tete.points.filter((_, i) => i % 15 === 0).map((p) => new THREE.Vector2(Math.max(p.r, 0.001), p.y)).reverse();
        poser(new THREE.LatheGeometry(contour, 96), toile, groupe);
        const cou = poser(new THREE.CylinderGeometry(5.2 * tete.echelle, 5.6 * tete.echelle, 10, 48), toile);
        cou.position.y = -2;
        const pied = poser(new THREE.CylinderGeometry(1.2, 1.2, 14, 20), bois);
        pied.position.y = -14;
        const socle = poser(new THREE.CylinderGeometry(7, 8, 2, 48), bois);
        socle.position.y = -21;

        // ---- Le bonnet ----
        const { matiere, materiaux } = fabriqueDeMatieres(THREE, renderer);
        const tuiles = new Map();
        const tuile = (pointId, densite) => {
          if (!tuiles.has(pointId)) tuiles.set(pointId, tuileDuRect(THREE, renderer, { pointId }, densite ? { ...densites, [pointId]: densite } : densites) || { l: 1, h: 1 });
          return tuiles.get(pointId);
        };
        const tour = plan.largeur.reelleCm;
        const zones = tranchesDuBonnet(plan.blocs.map((b) => ({ id: b.id, zone: b.zone, hauteurCm: b.hauteurCm })), plan.revers?.hauteurCm || 0);
        const blocDe = (id) => plan.blocs.find((b) => b.id === id);
        // Cm de tricot au point v : d'abord la tranche, puis l'avancée dans la tranche.
        for (const t of zones.tranches) {
          const b = blocDe(t.id);
          if (!pointParId(b.pointId)) continue;
          const teinte = couleurDeLaine(b.laineId, couleur, laines);
          const tl = tuile(b.pointId, b.densite);
          poser(geometrie(THREE, nappeDuBonnet({ profil: tete, arc: zones.arc, v0: t.v0, v1: t.v1, tour, tuile: tl, texture: zones.k })), matiere(b.pointId, teinte, "endroit"));
        }
        // Revers : la moitié basse du bord, repliée vers l'extérieur, avec son pli.
        if (zones.revers) {
          const bord = plan.blocs.find((b) => b.zone === "bas");
          const teinte = couleurDeLaine(bord.laineId, couleur, laines);
          const tl = tuile(bord.pointId, bord.densite);
          const m = matiere(bord.pointId, teinte, "endroit");
          poser(geometrie(THREE, nappeDuBonnet({ profil: tete, arc: zones.arc, v0: zones.revers.v0, v1: zones.revers.v1, decalage: ECART_BONNET + 0.6, tour, tuile: tl, texture: zones.kRevers })), m);
          const bas = surArc(tete, zones.arc);
          const pli = new THREE.TorusGeometry(bas.r + bas.nr * (ECART_BONNET + 0.3), 0.42, 10, 128);
          pli.rotateX(Math.PI / 2);
          const p = poser(pli, m, groupe);
          p.position.y = bas.y + bas.ny * ECART_BONNET - 0.15;
          const hautRevers = surArc(tete, zones.arc - zones.revers.v1);
          const bourrelet = new THREE.TorusGeometry(hautRevers.r + hautRevers.nr * (ECART_BONNET + 0.3), 0.34, 10, 128);
          bourrelet.rotateX(Math.PI / 2);
          const q = poser(bourrelet, m, groupe);
          q.position.y = hautRevers.y + hautRevers.ny * (ECART_BONNET + 0.3);
        } else {
          // Sans revers, un bord légèrement arrondi.
          const bord = plan.blocs.find((b) => b.zone === "bas") || plan.blocs[0];
          const bas = surArc(tete, zones.arc);
          const tore = new THREE.TorusGeometry(bas.r + bas.nr * ECART_BONNET, 0.25, 8, 128);
          tore.rotateX(Math.PI / 2);
          const t = poser(tore, matiere(bord.pointId, couleurDeLaine(bord.laineId, couleur, laines), "endroit"), groupe);
          t.position.y = bas.y + bas.ny * ECART_BONNET;
        }
        // Les 8 lignes de diminutions du sommet : de petites côtes en relief qui montent vers le centre.
        const sommet = zones.tranches.find((t) => t.zone === "sommet");
        if (sommet) {
          const b = blocDe(sommet.id);
          const teinte = nuancesLaine(couleurDeLaine(b.laineId, couleur, laines));
          const ligne = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(teinte.grain), roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(teinte.eclat) });
          aJeter.push(ligne);
          for (let k = 0; k < 8; k++) {
            const ang = (2 * Math.PI * (k + 1)) / 8;
            const pts = [];
            // Jusqu'à 1,5 cm du centre : au-delà, les 8 lignes se rejoignent sous le pompon.
            const fin = zones.arc - 1.5;
            for (let i = 0; i <= 24; i++) {
              const v = sommet.v0 + ((fin - sommet.v0) * i) / 24;
              pts.push(new THREE.Vector3(...pointDuBonnet(tete, zones.arc, v, ang, ECART_BONNET + 0.02)));
            }
            const courbe = new THREE.CatmullRomCurve3(pts);
            poser(new THREE.TubeGeometry(courbe, 32, 0.13, 6, false), ligne);
          }
        }
        // ---- Le pompon : une boule duveteuse ----
        if (plan.pompon) {
          const rayon = plan.pompon.cm / 2;
          const g = new THREE.SphereGeometry(rayon, 96, 64);
          const pos = g.attributes.position;
          const v = new THREE.Vector3();
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const n = 1 + 0.07 * Math.sin(v.x * 9.1 / rayon * 3) * Math.sin(v.y * 7.3 / rayon * 3) * Math.sin(v.z * 8.7 / rayon * 3)
              + 0.04 * Math.sin((v.x * 23 + v.z * 17) / rayon * 3) * Math.sin(v.y * 21 / rayon * 3);
            v.multiplyScalar(n);
            pos.setXYZ(i, v.x, v.y, v.z);
          }
          g.computeVertexNormals();
          const laine = new THREE.Color(nuancesLaine(couleurDeLaine(plan.pompon.laineId, couleur, laines)).maille);
          const mat = new THREE.MeshPhysicalMaterial({ color: laine, roughness: 1, sheen: 1, sheenRoughness: 0.8, sheenColor: laine.clone().lerp(new THREE.Color("#FFFFFF"), 0.4) });
          aJeter.push(mat);
          const p = poser(g, mat);
          p.position.y = tete.hauteur + ECART_BONNET + rayon * 1.05;
        }

        // ---- Le fond ----
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: "#5A4632", opacity: 0.22 }));
        sol.rotation.x = -Math.PI / 2;
        sol.position.y = -22;
        sol.receiveShadow = true;
        scene.add(sol);
        aJeter.push(sol.geometry, sol.material);

        // ---- La lumière : comme le snood ----
        scene.environment = environnement(THREE, outils.RoomEnvironment, renderer);
        scene.environmentIntensity = 0.3;
        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.3));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        soleil.position.set(-36, 90, 54);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        Object.assign(soleil.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 300 });
        soleil.shadow.bias = -0.0004;
        soleil.shadow.normalBias = 0.02;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.5);
        contre.position.set(30, 12, -60);
        scene.add(contre);

        // ---- Caméra et commandes ----
        const centre = new THREE.Vector3(0, tete.hauteur * 0.66, 0);
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        // De face jusqu'à la vue d'au-dessus (pour lire le sommet), jamais en dessous.
        controles.minPolarAngle = Math.PI * 0.05;
        controles.maxPolarAngle = Math.PI * 0.5;
        const depart = (tete.hauteur * 2.6) / Math.tan((FOV * Math.PI) / 360) / 2;
        controles.minDistance = tete.rayon + 6;
        controles.maxDistance = depart * 1.6;
        const viser = () => {
          const polaire = Math.PI * 0.42;
          const azimut = 0.35;
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
          const px = pixelsPour10cm({ distance, rayon: tete.rayon, hauteurPx: hauteur, fov: FOV }) / 10;
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
        if (typeof window !== "undefined") window.__vueBonnet = commandes.current.vue;

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
          if (typeof window !== "undefined" && window.__vueBonnet) delete window.__vueBonnet;
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
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote ton bonnet…</span>`}
        ${etat === "impossible" && html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le dessin reste disponible.</span>`}
        <div class="vue3d-echelle" ref=${echelle} aria-hidden="true" hidden=${etat !== "pret"}><i></i><span>10 cm</span></div>
        ${etat === "pret" &&
        html`<button type="button" class="vue3d-recentrer" aria-label="Recentrer la vue" onClick=${() => commandes.current?.recentrer()}>${IconeRecentrer()}</button>
          <p class="vue3d-aide" aria-hidden="true">Tourne la tête avec un doigt · pince pour zoomer</p>`}
      </div>
    </div>`;
}
