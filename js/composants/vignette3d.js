// Vignette 3D d'un point dans le catalogue : une « photo » de l'échantillon, pas une vue 3D en direct.
// Un seul moteur de rendu, caché, pour tout le catalogue : il tricote un petit échantillon, le photographie,
// puis passe au suivant (un point à la fois, seulement les cartes visibles à l'écran).
// Les photos restent en mémoire pendant la visite : rouvrir une famille ne refait pas le calcul.

import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { chargerThree, preparerEchantillon, monterScene, cadrer } from "./echantillon3d.js";

const TAILLE_ECHANTILLON = { mailles: 12, rangs: 14, max: 360 };
const COTE_PX = 384; // côté de la photo (pixels réels)

const photos = new Map(); // clé → URL de l'image
const enAttente = new Map(); // clé → promesse
const file = [];
let moteur = null;
let occupe = false;

const cleDe = (point, couleur) => `${point.id}|${couleur}`;

function obtenirMoteur(THREE) {
  if (moteur) return moteur;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(COTE_PX, COTE_PX, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  return (moteur = { renderer, camera });
}

/** Photographie un point (appelé par la file, un à la fois). */
async function photographier(point, couleur) {
  const { THREE } = await chargerThree();
  const prep = preparerEchantillon(point, TAILLE_ECHANTILLON);
  if (!prep) return null;
  const { renderer, camera } = obtenirMoteur(THREE);
  const { scene, table, liberer } = monterScene(THREE, prep, couleur, { ombres: 1024 });
  // Cadré serré : la vignette montre la texture, pas les bords de l'échantillon.
  cadrer(camera, prep, "endroit", table, 1.25);
  renderer.render(scene, camera);
  const blob = await new Promise((ok) => renderer.domElement.toBlob(ok, "image/webp", 0.85));
  liberer();
  return blob ? URL.createObjectURL(blob) : null;
}

function suivant() {
  if (occupe || file.length === 0) return;
  occupe = true;
  const { cle, point, couleur, ok } = file.shift();
  // Laisser le téléphone respirer entre deux photos (défilement fluide).
  const lancer = globalThis.requestIdleCallback || ((f) => setTimeout(f, 16));
  lancer(() =>
    photographier(point, couleur)
      .catch(() => null)
      .then((url) => {
        if (url) photos.set(cle, url);
        enAttente.delete(cle);
        ok(url);
        occupe = false;
        suivant();
      })
  );
}

/** Demande la photo d'un point (déjà prise, en cours, ou ajoutée à la file). */
export function demanderPhoto(point, couleur) {
  const cle = cleDe(point, couleur);
  if (photos.has(cle)) return Promise.resolve(photos.get(cle));
  if (enAttente.has(cle)) return enAttente.get(cle);
  const promesse = new Promise((ok) => file.push({ cle, point, couleur, ok }));
  enAttente.set(cle, promesse);
  suivant();
  return promesse;
}

/** Vignette carrée : dessinée seulement quand la carte arrive à l'écran. */
export function Vignette3D({ point, couleur, largeur = "64px", hauteur = 64, rayon = 0 }) {
  const cle = cleDe(point, couleur);
  const [url, setUrl] = useState(photos.get(cle) || null);
  const boite = useRef(null);
  useEffect(() => {
    if (photos.has(cle)) return setUrl(photos.get(cle));
    setUrl(null);
    let vivant = true;
    const observer = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        demanderPhoto(point, couleur).then((u) => vivant && setUrl(u));
      },
      { rootMargin: "200px" }
    );
    if (boite.current) observer.observe(boite.current);
    return () => {
      vivant = false;
      observer.disconnect();
    };
  }, [cle]);
  return html`<span class="vignette-3d" ref=${boite} aria-hidden="true"
    style=${`width:${largeur};height:${hauteur}px;border-radius:${rayon}px`}>
    ${url ? html`<img src=${url} alt="" />` : html`<span class="vignette-3d-attente"></span>`}
  </span>`;
}
