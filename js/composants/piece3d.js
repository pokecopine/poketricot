// L'écharpe finie en 3D, sur une barre en bois ou autour du cou d'un buste de couturière, avec une physique de tissu légère.
// Chaque bloc (bordure, corps, bande, colonne, bandes latérales) est habillé des textures cuites de son point
// (cuisson depuis le tricot 3D), à l'échelle de l'échantillon, dans la couleur de sa laine.
// On tourne autour d'un doigt, on zoome en pinçant ; on attrape l'écharpe du doigt pour la faire bouger.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { geometrieEcharpe, couleurDeLaine } from "./piece.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { Tissu, BUSTE, sectionDuBuste } from "../rendu/tissu.js";
import { cuire, liberer } from "../rendu/cuisson.js";
import { lineaire, REBOND, environnement, libererEnvironnement } from "../rendu/lumiere.js";
import { chargerThree } from "./echantillon3d.js";

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
/** pose : "barre" (drapée sur une barre en bois) ou "cou" (autour du cou d'un buste de couturière). */
export function Piece3D({ projet, plan, couleur, laines = [], densites = {}, face = "endroit", pose = "barre", hauteur = 460 }) {
  const boite = useRef(null);
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
        renderer.domElement.setAttribute(
          "aria-label",
          `L'écharpe finie en 3D, ${pose === "cou" ? "autour du cou d'un buste de couturière" : "drapée sur une barre en bois"}. Glisse un doigt pour tourner autour, pince pour zoomer, attrape l'écharpe pour la faire bouger.`
        );

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#EAE0D0");
        const camera = new THREE.PerspectiveCamera(34, largeurPx / hauteur, 1, 2000);

        // ---- Le tissu ----
        const auCou = pose === "cou";
        const tissu = new Tissu({ largeur: geo.largeur, longueur: geo.longueur, pas: 2 });
        if (auCou) tissu.poserAutourDuCou();
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
            color: base, roughness: 0.78, metalness: 0,
            sheen: 0.55, sheenRoughness: 0.5, sheenColor: base.clone().lerp(new THREE.Color("#FFFFFF"), 0.35),
            side: cote === "envers" ? THREE.BackSide : THREE.FrontSide,
            alphaTest: 0.5,
          });
          if (t) {
            // Relief (normales cuites), ombre de contact (canal rouge) et jours (canal vert).
            Object.assign(m, { normalMap: t.normales, aoMap: t.ombre, aoMapIntensity: 1, alphaMap: t.ombre });
            m.normalScale.set(1.3, 1.3);
            // L'ombre de contact assombrit aussi la lumière directe, et les creux prennent la couleur de la laine
            // (interréflexions) : même calcul que l'échantillon (teinteDuCreux).
            const lin = lineaire(nuancesLaine(teinte).maille);
            const max = Math.max(...lin, 1e-3);
            m.onBeforeCompile = (shader) => {
              shader.uniforms.teinteRebond = { value: new THREE.Vector3(...lin.map((c) => (c / max) * REBOND)) };
              shader.fragmentShader = "uniform vec3 teinteRebond;\n" + shader.fragmentShader.replace(
                "#include <color_fragment>",
                "#include <color_fragment>\n#ifdef USE_AOMAP\n  float creux = texture2D( aoMap, vAoMapUv ).r;\n  diffuseColor.rgb *= creux + ( 1.0 - creux ) * teinteRebond;\n#endif"
              );
            };
            m.customProgramCacheKey = () => "piece3d-creux";
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
        const aJeter = [bois, boisFonce];
        const ajouter = (geometrie, materiau, reglages = {}) => {
          const m = new THREE.Mesh(geometrie, materiau);
          m.castShadow = m.receiveShadow = true;
          Object.assign(m.position, reglages.position || {});
          if (reglages.echelle) m.scale.set(...reglages.echelle);
          if (reglages.rotation) Object.assign(m.rotation, reglages.rotation);
          scene.add(m);
          aJeter.push(geometrie);
          return m;
        };
        if (auCou) {
          // Buste de couturière : toile de lin écrue, pied en bois. Un peu plus petit que les formes de collision,
          // pour que l'écharpe (qui a une épaisseur) le touche sans s'y enfoncer.
          const toile = new THREE.MeshStandardMaterial({ color: "#E6D9C3", roughness: 0.95 });
          aJeter.push(toile);
          // Le buste d'une seule pièce : des sections ovales empilées, de la base du cou au bas du torse.
          const haut = BUSTE.nuque.c[1] + BUSTE.nuque.r[1] - 0.05;
          const bas = BUSTE.torse.c[1] - BUSTE.torse.r[1] * 0.85;
          const etages = 70;
          const tours = 48;
          const sommets = [];
          for (let a = 0; a <= etages; a++) {
            const y = haut + ((bas - haut) * a) / etages;
            const s = sectionDuBuste(y) || { rx: 0.1, rz: 0.1, cz: -1 };
            for (let b = 0; b <= tours; b++) {
              const t = (2 * Math.PI * b) / tours;
              sommets.push(Math.sin(t) * (s.rx - 0.3), y, s.cz + Math.cos(t) * (s.rz - 0.3));
            }
          }
          const faces = [];
          for (let a = 0; a < etages; a++) {
            for (let b = 0; b < tours; b++) {
              const i = a * (tours + 1) + b;
              faces.push(i, i + tours + 1, i + 1, i + 1, i + tours + 1, i + tours + 2);
            }
          }
          const corps = new THREE.BufferGeometry();
          corps.setAttribute("position", new THREE.Float32BufferAttribute(sommets, 3));
          corps.setIndex(faces);
          corps.computeVertexNormals();
          ajouter(corps, toile);
          // Le dessous, fermé.
          const dessous = sectionDuBuste(bas) || { rx: 10, rz: 8, cz: -1 };
          ajouter(new THREE.CircleGeometry(1, 48), toile, {
            position: { x: 0, y: bas, z: dessous.cz }, echelle: [dessous.rx - 0.3, dessous.rz - 0.3, 1], rotation: { x: Math.PI / 2 },
          });
          // Le dessus des épaules, fermé autour du cou.
          const dessus = sectionDuBuste(haut) || { rx: 6, rz: 6, cz: -1 };
          ajouter(new THREE.CircleGeometry(1, 48), toile, {
            position: { x: 0, y: haut, z: dessus.cz }, echelle: [dessus.rx, dessus.rz, 1], rotation: { x: -Math.PI / 2 },
          });
          const { cou } = BUSTE;
          ajouter(new THREE.CylinderGeometry(cou.rayon - 0.2, cou.rayon - 0.2, cou.y1 - cou.y0, 40), toile, {
            position: { x: cou.cx, y: (cou.y0 + cou.y1) / 2, z: cou.cz },
          });
          // Le bouchon en bois sur le cou, et le pied.
          ajouter(new THREE.CylinderGeometry(cou.rayon * 0.75, cou.rayon - 0.2, 2.2, 40), bois, {
            position: { x: cou.cx, y: cou.y1 + 1.1, z: cou.cz },
          });
          const basTorse = BUSTE.torse.c[1] - BUSTE.torse.r[1];
          ajouter(new THREE.CylinderGeometry(1.4, 1.4, 60, 20), boisFonce, { position: { x: 0, y: basTorse - 28, z: BUSTE.torse.c[2] } });
        } else {
          const longueurBarre = geo.largeur * 2.6 + 20;
          const rayonBarre = tissu.obstacles[0].rayon;
          ajouter(new THREE.CylinderGeometry(rayonBarre, rayonBarre, longueurBarre, 32), bois, { rotation: { z: Math.PI / 2 } });
          const boule = new THREE.SphereGeometry(rayonBarre * 1.5, 24, 16);
          aJeter.push(boule);
          for (const sx of [-1, 1]) {
            const b = new THREE.Mesh(boule, boisFonce);
            b.position.x = (sx * longueurBarre) / 2;
            scene.add(b);
          }
        }

        // Éclairage indirect : une pièce claire tout autour (reflets doux, ombres qui ne sont jamais noires).
        scene.environment = environnement(THREE, outils.RoomEnvironment, renderer);
        scene.environmentIntensity = 0.3;
        scene.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.3));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.6);
        soleil.position.set(-60, 90, 110);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        const portee = geo.longueur * 0.45 + 20;
        Object.assign(soleil.shadow.camera, { left: -portee, right: portee, top: portee, bottom: -portee * 1.2, near: 10, far: 500 });
        soleil.shadow.bias = -0.0005;
        scene.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.5);
        contre.position.set(50, -20, -100);
        scene.add(contre);

        // ---- Caméra et commandes ----
        const centre = auCou ? new THREE.Vector3(0, -geo.longueur * 0.2, 0) : new THREE.Vector3(0, -geo.longueur * 0.24, 0);
        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.enablePan = false;
        controles.target.copy(centre);
        controles.minDistance = geo.longueur * 0.25;
        // On ne passe ni au-dessus ni en dessous : on tourne autour, comme dans une vitrine.
        controles.minPolarAngle = Math.PI * 0.18;
        controles.maxPolarAngle = Math.PI * 0.68;
        controles.maxDistance = geo.longueur * 2.2;
        const viser = (f) => {
          const d = geo.longueur * 1.05;
          const s = f === "envers" ? -1 : 1;
          if (auCou) camera.position.set(s * d * 0.22, centre.y + d * 0.08, s * d * 0.97);
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
        // Doigts posés sur l'image : avec deux doigts, on zoome (on n'attrape jamais l'écharpe).
        const doigts = new Map();
        let premierDoigt = null; // l'appui qui a attrapé l'écharpe (pour le rendre aux commandes de zoom)
        const versSouris = (e) => {
          const r = renderer.domElement.getBoundingClientRect();
          souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          rayon.setFromCamera(souris, camera);
        };
        const relacher = () => {
          tenu = -1;
          tissu.lacher();
          controles.enabled = true;
          repos = 0;
        };
        const surAppui = (e) => {
          if (e.__rejoue) return; // appui renvoyé aux commandes (voir plus bas)
          doigts.set(e.pointerId, e);
          if (doigts.size > 1) {
            // Deuxième doigt : on relâche l'écharpe et on rend le premier doigt aux commandes, pour qu'elles zooment.
            if (tenu >= 0 && premierDoigt) {
              relacher();
              const copie = new PointerEvent("pointerdown", {
                pointerId: premierDoigt.pointerId, pointerType: premierDoigt.pointerType, isPrimary: true,
                clientX: premierDoigt.clientX, clientY: premierDoigt.clientY, bubbles: true, cancelable: true,
              });
              copie.__rejoue = true;
              toile.dispatchEvent(copie);
            }
            premierDoigt = null;
            return;
          }
          versSouris(e);
          const touche = rayon.intersectObjects(groupe.children, false)[0];
          if (!touche) return;
          // Un seul doigt sur l'écharpe : on l'attrape, les commandes ne voient pas cet appui.
          e.stopImmediatePropagation();
          tenu = tissu.plusProche(touche.point.toArray());
          premierDoigt = e;
          plan3d.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), touche.point);
          controles.enabled = false;
          repos = 0;
        };
        const surGlisse = (e) => {
          if (doigts.has(e.pointerId)) doigts.set(e.pointerId, e);
          if (tenu < 0 || doigts.size > 1) return;
          versSouris(e);
          if (rayon.ray.intersectPlane(plan3d, point3d)) tissu.tenir(tenu, point3d.toArray());
          repos = 0;
        };
        const surLache = (e) => {
          doigts.delete(e.pointerId);
          if (premierDoigt && e.pointerId === premierDoigt.pointerId) premierDoigt = null;
          if (tenu >= 0 && doigts.size === 0) relacher();
        };
        const toile = renderer.domElement;
        toile.addEventListener("pointerdown", surAppui, { capture: true });
        toile.addEventListener("pointermove", surGlisse);
        window.addEventListener("pointerup", surLache);
        window.addEventListener("pointercancel", surLache);

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
        // L'écharpe se pose avant d'être montrée : par petites tranches, pour ne pas figer le téléphone.
        let poses = 0;
        const POSE = auCou ? 180 : 120;
        const installer = () => {
          if (!enCours) return;
          const debut = performance.now();
          while (poses < POSE && performance.now() - debut < 14) {
            tissu.pas(1 / 60);
            poses++;
          }
          if (poses < POSE) return requestAnimationFrame(installer);
          // Une fois posée, l'écharpe est accrochée à son appui (milieu sur la barre, nuque au cou) :
          // on peut tirer les pans, elle ne tombe plus.
          tissu.epinglerAncre(auCou ? 6 : 4);
          majMaillage();
          renderer.render(scene, camera);
          setEtat("pret");
          requestAnimationFrame(boucle);
        };
        requestAnimationFrame(installer);
        commandes.current = { viser: (f) => { viser(f); aDessiner = true; } };

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
          window.removeEventListener("pointerup", surLache);
          window.removeEventListener("pointercancel", surLache);
          controles.dispose();
          morceaux.forEach((m) => m.geometrie.dispose());
          for (const m of materiaux.values()) m.dispose();
          aJeter.forEach((x) => x.dispose());
          liberer(renderer);
          libererEnvironnement(renderer);
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
