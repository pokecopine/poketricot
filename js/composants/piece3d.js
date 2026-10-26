// L'écharpe finie en 3D, drapée sur une barre en bois, avec une physique de tissu légère.
// Chaque bloc (bordure, corps, bande, colonne, bandes latérales) est habillé des textures cuites de son point
// (cuisson depuis le tricot 3D), à l'échelle de l'échantillon, dans la couleur de sa laine.
// On tourne autour d'un doigt, on zoome en pinçant ; on attrape l'écharpe du doigt pour la faire bouger.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { geometrieEcharpe, couleurDeLaine } from "./piece.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { Tissu } from "../rendu/tissu.js";
import { cuire, liberer } from "../rendu/cuisson.js";

let chargement = null;
const chargerThree = () =>
  (chargement ||= Promise.all([import("../../vendor/three/three.module.min.js"), import("../../vendor/three/OrbitControls.js")]).then(
    ([THREE, { OrbitControls }]) => ({ THREE, OrbitControls })
  ));

/** Une grille de triangles pour un rectangle du tissu (cm), qui suivra la simulation. */
function grilleDuRect(THREE, rect, largeur, tuile) {
  const su = Math.max(2, Math.round(rect.l / 1.2));
  const sv = Math.max(2, Math.round(rect.h / 1.2));
  const n = (su + 1) * (sv + 1);
  const plat = new Float32Array(n * 2); // position à plat (cm) : u sur la largeur (de gauche à droite), v sur la longueur
  const uv = new Float32Array(n * 2);
  for (let b = 0; b <= sv; b++) {
    for (let a = 0; a <= su; a++) {
      const i = b * (su + 1) + a;
      // x = 0 : bord droit vu de l'endroit ; à l'écran, la gauche de l'écharpe est en u = 0.
      const xCm = rect.x + (rect.l * a) / su;
      const u = largeur - xCm;
      const v = rect.y + (rect.h * b) / sv;
      plat[i * 2] = u;
      plat[i * 2 + 1] = v;
      uv[i * 2] = u / tuile.l;
      uv[i * 2 + 1] = v / tuile.h;
    }
  }
  const index = [];
  for (let b = 0; b < sv; b++) {
    for (let a = 0; a < su; a++) {
      const i = b * (su + 1) + a;
      // u diminue quand a augmente : on garde des triangles tournés vers l'avant (endroit vers +z sur le pan de devant).
      index.push(i, i + su + 1, i + 1, i + 1, i + su + 1, i + su + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  return { geometrie: g, plat };
}

/**
 * entree : { projet, plan, couleur, laines, densites, face, hauteur }
 * densites : { [pointId]: { mailles, rangs } } pour 10 cm (celles du calcul du projet).
 */
/** pose : "barre" (drapée sur une barre en bois) ou "table" (posée en vague, avec ses plis). */
export function Piece3D({ projet, plan, couleur, laines = [], densites = {}, face = "endroit", pose = "barre", hauteur = 460 }) {
  const boite = useRef(null);
  const commandes = useRef(null);
  const [etat, setEtat] = useState("chargement");

  useEffect(() => {
    let annule = false;
    let nettoyer = () => {};
    setEtat("chargement");
    chargerThree()
      .then(({ THREE, OrbitControls }) => {
        if (annule || !boite.current) return;
        const geo = geometrieEcharpe(projet, plan);
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
        renderer.domElement.setAttribute("aria-label", "L'écharpe finie en 3D, drapée sur une barre en bois. Glisse un doigt pour tourner autour, attrape l'écharpe pour la faire bouger.");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#EAE0D0");
        const camera = new THREE.PerspectiveCamera(34, largeurPx / hauteur, 1, 2000);

        // ---- Le tissu ----
        const surTable = pose === "table";
        const tissu = new Tissu({ largeur: geo.largeur, longueur: geo.longueur, pas: 2, sol: -geo.longueur * 0.62 - 12 });
        if (surTable) tissu.poserSurLaTable();
        else tissu.poserSurLaBarre();

        // ---- Matières : une par point, laine et face ----
        const materiaux = new Map();
        const matiere = (pointId, teinte, cote) => {
          const cle = `${pointId}|${teinte}|${cote}`;
          if (materiaux.has(cle)) return materiaux.get(cle);
          const point = pointParId(pointId);
          const t = point && cuire(THREE, renderer, point, cote);
          const base = new THREE.Color(nuancesLaine(teinte).maille);
          const m = new THREE.MeshPhysicalMaterial({
            color: base, roughness: 0.8, metalness: 0,
            sheen: 0.6, sheenRoughness: 0.5, sheenColor: base.clone().lerp(new THREE.Color("#FFFFFF"), 0.35),
            side: cote === "envers" ? THREE.BackSide : THREE.FrontSide,
            alphaTest: 0.5,
          });
          if (t) {
            Object.assign(m, { normalMap: t.normales, aoMap: t.ombre, aoMapIntensity: 1, alphaMap: t.ombre });
            m.normalScale.set(1, 1);
          }
          materiaux.set(cle, m);
          return m;
        };

        // ---- Les morceaux de l'écharpe ----
        const morceaux = [];
        const groupe = new THREE.Group();
        for (const r of geo.rects) {
          const point = pointParId(r.pointId);
          if (!point) continue;
          const d = densites[r.pointId] || { mailles: 18 * point.densite.mailles, rangs: 25 * point.densite.rangs };
          const taille = { mailles: 1, rangs: 1 };
          const t = cuire(THREE, renderer, point, "endroit");
          if (t) Object.assign(taille, { mailles: t.mailles, rangs: t.rangs });
          // Une répétition du motif mesure (mailles × largeur d'une maille) sur (rangs × hauteur d'un rang).
          const tuile = { l: (taille.mailles * 10) / d.mailles, h: (taille.rangs * 10) / d.rangs };
          const { geometrie, plat } = grilleDuRect(THREE, r, geo.largeur, tuile);
          const teinte = couleurDeLaine(r.laineId, couleur, laines);
          for (const cote of ["endroit", "envers"]) {
            const mesh = new THREE.Mesh(geometrie, matiere(r.pointId, teinte, cote));
            mesh.castShadow = cote === "endroit";
            mesh.receiveShadow = true;
            mesh.userData.tissu = true;
            groupe.add(mesh);
          }
          morceaux.push({ geometrie, plat });
        }
        scene.add(groupe);

        const majMaillage = () => {
          for (const { geometrie, plat } of morceaux) {
            const p = geometrie.attributes.position.array;
            for (let i = 0; i < plat.length / 2; i++) tissu.positionA(plat[i * 2], plat[i * 2 + 1], p, i * 3);
            geometrie.attributes.position.needsUpdate = true;
            geometrie.computeVertexNormals();
            geometrie.computeBoundingSphere();
          }
        };

        // ---- La barre en bois, le sol, la lumière ----
        const bois = new THREE.MeshStandardMaterial({ color: "#A8794F", roughness: 0.55 });
        const boisFonce = new THREE.MeshStandardMaterial({ color: "#8E6440", roughness: 0.6 });
        const longueurBarre = geo.largeur * 2.6 + 20;
        const rayonBarre = 2.2;
        const barre = new THREE.Mesh(new THREE.CylinderGeometry(rayonBarre, rayonBarre, longueurBarre, 32), bois);
        const boule = new THREE.SphereGeometry(rayonBarre * 1.5, 24, 16);
        if (!surTable) {
          barre.rotation.z = Math.PI / 2;
          barre.castShadow = barre.receiveShadow = true;
          scene.add(barre);
          for (const s of [-1, 1]) {
            const b = new THREE.Mesh(boule, boisFonce);
            b.position.x = (s * longueurBarre) / 2;
            scene.add(b);
          }
        }
        // Le sol (sous la barre, il ne reçoit que l'ombre) ou la table en bois clair.
        const sol = new THREE.Mesh(
          new THREE.PlaneGeometry(4000, 4000),
          surTable ? new THREE.MeshStandardMaterial({ color: "#D9C3A5", roughness: 0.85 }) : new THREE.ShadowMaterial({ opacity: 0.12 })
        );
        sol.rotation.x = -Math.PI / 2;
        sol.position.y = tissu.sol;
        sol.receiveShadow = true;
        // Sous la barre, le sol est loin : on ne le montre pas (sa ligne d'horizon coupait l'image).
        if (surTable) scene.add(sol);

        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.85));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        soleil.position.set(-60, 90, 110);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        if (surTable) soleil.position.set(-50, 140, 60);
        const portee = geo.longueur * 0.45 + 20;
        Object.assign(soleil.shadow.camera, { left: -portee, right: portee, top: portee, bottom: -portee * 1.2, near: 10, far: 500 });
        soleil.shadow.bias = -0.0005;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.5);
        contre.position.set(50, -20, -100);
        scene.add(contre);

        // ---- Caméra et commandes ----
        const centre = surTable ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, -geo.longueur * 0.24, 0);
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        controles.minDistance = geo.longueur * 0.25;
        controles.maxDistance = geo.longueur * 2.2;
        const viser = (f) => {
          const d = geo.longueur * 1.05;
          const s = f === "envers" ? -1 : 1;
          // Sur la table, on regarde d'en haut, de biais ; l'envers : on passe sous la table… donc de l'autre côté.
          if (surTable) camera.position.set(d * 0.3, s * d * 0.95, d * 0.7);
          else camera.position.set(s * d * 0.35, centre.y + d * 0.12, s * d * 0.92);
          controles.update();
        };
        viser(face);

        // ---- Attraper l'écharpe du doigt ----
        const rayon = new THREE.Raycaster();
        const souris = new THREE.Vector2();
        const plan3d = new THREE.Plane();
        const point3d = new THREE.Vector3();
        let tenu = -1;
        let repos = 0;
        const versSouris = (e) => {
          const r = renderer.domElement.getBoundingClientRect();
          souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          rayon.setFromCamera(souris, camera);
        };
        const surAppui = (e) => {
          if (e.pointerType === "touch" && !e.isPrimary) return;
          versSouris(e);
          const touche = rayon.intersectObjects(groupe.children, false)[0];
          if (!touche) return;
          tenu = tissu.plusProche(touche.point.toArray());
          plan3d.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), touche.point);
          controles.enabled = false;
          renderer.domElement.setPointerCapture?.(e.pointerId);
          repos = 0;
        };
        const surGlisse = (e) => {
          if (tenu < 0) return;
          versSouris(e);
          if (rayon.ray.intersectPlane(plan3d, point3d)) tissu.tenir(tenu, point3d.toArray());
          repos = 0;
        };
        const surLache = () => {
          if (tenu < 0) return;
          tenu = -1;
          tissu.lacher();
          controles.enabled = true;
          repos = 0;
        };
        const toile = renderer.domElement;
        toile.addEventListener("pointerdown", surAppui, { capture: true });
        toile.addEventListener("pointermove", surGlisse);
        toile.addEventListener("pointerup", surLache);
        toile.addEventListener("pointercancel", surLache);

        // ---- Boucle : la physique ne tourne que tant que l'écharpe bouge ----
        let enCours = true;
        let aDessiner = true;
        controles.addEventListener("change", () => (aDessiner = true));
        const boucle = () => {
          if (!enCours) return;
          controles.update();
          if (tenu >= 0 || repos < 90) {
            tissu.pas(1 / 60);
            majMaillage();
            aDessiner = true;
            repos = tissu.mouvement() < 1e-4 && tenu < 0 ? repos + 1 : 0;
          }
          if (aDessiner) {
            renderer.render(scene, camera);
            aDessiner = false;
          }
          requestAnimationFrame(boucle);
        };
        // Sur la barre, l'écharpe se pose avant d'être montrée ; sur la table, on la voit tomber.
        for (let s = 0; s < (surTable ? 10 : 120); s++) tissu.pas(1 / 60);
        majMaillage();
        requestAnimationFrame(boucle);
        commandes.current = { viser: (f) => { viser(f); aDessiner = true; } };
        setEtat("pret");

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
          toile.removeEventListener("pointerdown", surAppui, { capture: true });
          toile.removeEventListener("pointermove", surGlisse);
          toile.removeEventListener("pointerup", surLache);
          toile.removeEventListener("pointercancel", surLache);
          controles.dispose();
          morceaux.forEach((m) => m.geometrie.dispose());
          for (const m of materiaux.values()) m.dispose();
          barre.geometry.dispose();
          sol.material.dispose();
          boule.dispose();
          bois.dispose();
          boisFonce.dispose();
          sol.geometry.dispose();
          liberer(renderer);
          renderer.dispose();
          renderer.forceContextLoss?.();
          toile.remove();
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
  }, [projet, plan, couleur, laines, hauteur, pose]);

  useEffect(() => {
    commandes.current?.viser(face);
  }, [face]);

  return html`
    <div class="echantillon-3d">
      <div class="echantillon-3d-scene piece-3d-scene" ref=${boite} style=${`height:${hauteur}px`}>
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote ton écharpe…</span>`}
        ${etat === "impossible" && html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le dessin reste disponible.</span>`}
      </div>
      ${etat === "pret" &&
      html`<p class="note">Glisse un doigt à côté de l'écharpe pour tourner autour, pince pour zoomer. Attrape l'écharpe pour la faire bouger.</p>`}
    </div>`;
}
