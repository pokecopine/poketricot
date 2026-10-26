// Échantillon en 3D : le vrai chemin du fil, en volume, dans la couleur de la laine.
// Three.js n'est chargé qu'à l'ouverture de cette vue (le reste de l'application ne l'attend pas).
// On peut tourner l'échantillon (un doigt), zoomer (deux doigts) et le retourner pour voir l'envers.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { grilleMotif } from "../rendu/texture.js";
import { grilleEchantillon, cheminDuFil, brinsDuFil, rendu3dFidele, MODELE } from "../rendu/fil3d.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { comptesVariables } from "../moteur/simulateur.js";

/** Prépare la scène (pure, sans dessin) : chemins des brins et taille de l'échantillon. */
export function preparerEchantillon(point) {
  const motif = grilleMotif(point, { face: "endroit" });
  if (!motif) return null;
  const grille = grilleEchantillon(motif);
  const fil = cheminDuFil(grille);
  return {
    brins: brinsDuFil(fil.points),
    largeur: fil.largeur,
    hauteur: fil.hauteur,
    // Un point dont le nombre de mailles change (diminutions et augmentations) n'est qu'approché.
    fidele: rendu3dFidele(motif) && !comptesVariables(point),
    mailles: grille[0].length,
    rangs: grille.length,
  };
}

/** Chargé une seule fois. */
let chargement = null;
const chargerThree = () =>
  (chargement ||= Promise.all([import("../../vendor/three/three.module.min.js"), import("../../vendor/three/OrbitControls.js")]).then(
    ([THREE, { OrbitControls }]) => ({ THREE, OrbitControls })
  ));

/** Texture de la table : une toile de lin claire, fils fins réguliers. */
function textureTable(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#EDE4D6";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) {
    const a = 0.025 + Math.random() * 0.035;
    g.fillStyle = `rgba(110,90,70,${a})`;
    g.fillRect(0, i, 256, 1);
    g.fillStyle = `rgba(110,90,70,${0.02 + Math.random() * 0.03})`;
    g.fillRect(i, 0, 1, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Petite texture de fibres pour le relief du fil (carte de rugosité / de relief). */
function textureFibres(THREE) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 3 + Math.random() * 6, y + 8 + Math.random() * 18);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * L'échantillon en 3D.
 * face : "endroit" ou "envers" (la caméra passe de l'autre côté) ; hauteur en pixels.
 */
export function Echantillon3D({ point, couleur, face = "endroit", hauteur = 320 }) {
  const boite = useRef(null);
  const scene = useRef(null);
  const [etat, setEtat] = useState("chargement"); // chargement | pret | impossible
  const [fidele, setFidele] = useState(true);

  // Construire la scène pour ce point.
  useEffect(() => {
    let annule = false;
    let nettoyer = () => {};
    setEtat("chargement");
    chargerThree()
      .then(({ THREE, OrbitControls }) => {
        if (annule || !boite.current) return;
        const prep = preparerEchantillon(point);
        if (!prep) return setEtat("impossible");
        setFidele(prep.fidele);

        const largeurPx = boite.current.clientWidth || 340;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
        } catch {
          return setEtat("impossible");
        }
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(largeurPx, hauteur);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        boite.current.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute("aria-label", `Échantillon en 3D : ${point.nom}, ${prep.mailles} mailles sur ${prep.rangs} rangs`);

        const s = new THREE.Scene();
        s.background = new THREE.Color("#EDE4D6");
        const camera = new THREE.PerspectiveCamera(32, largeurPx / hauteur, 0.1, 400);

        // Lumière douce de fenêtre, et une lumière rasante qui fait ressortir le relief.
        s.add(new THREE.HemisphereLight("#FFF7EC", "#8C7A66", 0.75));
        const soleil = new THREE.DirectionalLight("#FFF1DE", 2.9);
        soleil.position.set(-16, 20, 18);
        soleil.castShadow = true;
        soleil.shadow.mapSize.set(2048, 2048);
        const portee = Math.max(prep.largeur, prep.hauteur) * 0.7;
        Object.assign(soleil.shadow.camera, { left: -portee, right: portee, top: portee, bottom: -portee, near: 1, far: 90 });
        soleil.shadow.bias = -0.0004;
        soleil.shadow.radius = 4;
        s.add(soleil);
        const contre = new THREE.DirectionalLight("#FFFFFF", 0.6);
        contre.position.set(12, -6, -20);
        s.add(contre);

        // La table, sous l'échantillon (on la voit à l'endroit ; elle passe derrière quand on regarde l'envers).
        const table = new THREE.Mesh(
          new THREE.PlaneGeometry(400, 400),
          new THREE.MeshStandardMaterial({ map: textureTable(THREE), roughness: 1 })
        );
        table.position.z = -MODELE.D - MODELE.rayon * 1.6;
        table.receiveShadow = true;
        s.add(table);

        // Le fil : un tube par brin, chaque brin d'une nuance à peine différente.
        const n = nuancesLaine(couleur);
        const base = new THREE.Color(n.maille);
        const fibres = textureFibres(THREE);
        fibres.repeat.set(1, 40);
        const groupe = new THREE.Group();
        const geometries = [];
        const materiaux = [];
        prep.brins.forEach((brin, k) => {
          const courbe = new THREE.CatmullRomCurve3(brin.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
          const g = new THREE.TubeGeometry(courbe, brin.length, MODELE.rayon * 0.62, 7, false);
          const teinte = base.clone().offsetHSL(0, 0, (k - 1) * 0.025);
          // Matière « tissu » : un léger voile de lumière sur les fibres (sheen), comme la laine.
          const m = new THREE.MeshPhysicalMaterial({
            color: teinte, roughness: 0.9, metalness: 0, roughnessMap: fibres, bumpMap: fibres, bumpScale: 0.12,
            sheen: 1, sheenRoughness: 0.6, sheenColor: base.clone().lerp(new THREE.Color("#FFFFFF"), 0.45),
          });
          const mesh = new THREE.Mesh(g, m);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          groupe.add(mesh);
          geometries.push(g);
          materiaux.push(m);
        });
        s.add(groupe);

        const controles = new OrbitControls(camera, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.12;
        controles.minDistance = Math.max(prep.largeur, prep.hauteur) * 0.35;
        controles.maxDistance = Math.max(prep.largeur, prep.hauteur) * 2.4;
        controles.enablePan = false;

        let enCours = true;
        const dessiner = () => renderer.render(s, camera);
        const boucle = () => {
          if (!enCours) return;
          if (controles.update()) dessiner();
          requestAnimationFrame(boucle);
        };
        controles.addEventListener("change", dessiner);

        const viser = (f) => {
          const d = Math.max(prep.largeur, prep.hauteur * 1.15) * 1.9;
          // Légèrement de biais et d'en bas, comme un échantillon posé qu'on regarde.
          const sens = f === "envers" ? -1 : 1;
          camera.position.set(sens * d * 0.12, -d * 0.18, sens * d);
          table.visible = f !== "envers";
          controles.target.set(0, 0, 0);
          controles.update();
          dessiner();
        };
        scene.current = { viser };
        viser(face);
        requestAnimationFrame(boucle);
        setEtat("pret");

        const surTaille = () => {
          const l = boite.current?.clientWidth;
          if (!l) return;
          renderer.setSize(l, hauteur);
          camera.aspect = l / hauteur;
          camera.updateProjectionMatrix();
          dessiner();
        };
        window.addEventListener("resize", surTaille);

        nettoyer = () => {
          enCours = false;
          window.removeEventListener("resize", surTaille);
          controles.dispose();
          geometries.forEach((g) => g.dispose());
          materiaux.forEach((m) => m.dispose());
          fibres.dispose();
          table.geometry.dispose();
          table.material.map.dispose();
          table.material.dispose();
          renderer.dispose();
          renderer.forceContextLoss?.();
          renderer.domElement.remove();
          scene.current = null;
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
  }, [point.id, couleur, hauteur]);

  // Endroit / envers : la caméra passe de l'autre côté.
  useEffect(() => {
    scene.current?.viser(face);
  }, [face]);

  return html`
    <div class="echantillon-3d">
      <div class="echantillon-3d-scene" ref=${boite} style=${`height:${hauteur}px`}>
        ${etat === "chargement" && html`<span class="echantillon-3d-attente">Je tricote l'échantillon…</span>`}
        ${etat === "impossible" &&
        html`<span class="echantillon-3d-attente">Ce téléphone ne peut pas afficher la 3D ici. Le schéma reste disponible.</span>`}
      </div>
      ${etat === "pret" &&
      html`<p class="note">
        Glisse un doigt pour tourner l'échantillon, pince pour zoomer.
        ${!fidele && html` <strong>Aperçu approché</strong> : les jetés, torsades, mailles glissées et diminutions ne sont pas encore dessinés fil par fil.`}
      </p>`}
    </div>`;
}
