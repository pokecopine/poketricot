// « Cuisson » des textures d'un point : on tricote en 3D une répétition du motif (avec une maille de voisinage
// tout autour, pour que la texture se raccorde sans couture), puis on la photographie de face :
//   - une carte des normales (le relief de chaque maille, pour la lumière) ;
//   - une carte « ombre et jours » : rouge = ombre de contact (le fil caché par ses voisins, et la profondeur),
//     vert = présence du fil
//     (les jours entre les mailles deviennent transparents).
// Ces textures habillent ensuite une écharpe entière, à l'échelle de l'échantillon, sans dessiner chaque fil.
// La couleur de la laine n'entre pas dans la cuisson : la même cuisson sert pour toutes les laines.

import { grilleMotif } from "./texture.js";
import { cheminDuFil, MODELE } from "./fil3d.js";
import { occlusionDesSommets } from "./occlusion.js";

/** Grille d'une répétition entourée d'une maille et d'un rang de voisinage (le motif continue). */
export function grilleAvecVoisinage(motif) {
  const H = motif.length;
  const W = motif[0].length;
  return Array.from({ length: H + 2 }, (_, r) =>
    Array.from({ length: W + 2 }, (_, c) => motif[(r - 1 + H) % H][(c - 1 + W) % W])
  );
}

/** Taille d'une répétition du motif, en mailles et en rangs. */
export function tailleMotif(point) {
  const m = grilleMotif(point);
  return m ? { mailles: m[0].length, rangs: m.length } : null;
}

const SOMMET = `
attribute float ao;
varying vec3 vNormale;
varying vec3 vPos;
varying float vAo;
void main() {
  vNormale = normalize(normalMatrix * normal);
  vPos = position;
  vAo = ao;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const NORMALES = `
varying vec3 vNormale;
void main() {
  vec3 n = normalize(vNormale);
  if (!gl_FrontFacing) n = -n;
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;

const OMBRE = `
varying vec3 vPos;
varying float vAo;
uniform float sens;
uniform float profondeur;
void main() {
  float h = clamp((vPos.z * sens + profondeur) / (2.0 * profondeur), 0.0, 1.0);
  // Ombre de contact du fil (occlusion), adoucie par la profondeur : ce qui est au fond est un peu plus sombre.
  gl_FragColor = vec4(vAo * (0.6 + 0.4 * h), 1.0, 0.0, 1.0);
}`;

const caches = new WeakMap();

/**
 * Textures cuites d'un point, pour une face ("endroit" ou "envers").
 * Renvoie { normales, ombre, mailles, rangs } (textures Three.js, à répéter) ou null.
 * Gardées en mémoire pour ce moteur de rendu ; liberer(renderer) les jette.
 */
export function cuire(THREE, renderer, point, face = "endroit") {
  if (!caches.has(renderer)) caches.set(renderer, new Map());
  const cache = caches.get(renderer);
  const cle = `${point.id}|${face}`;
  if (cache.has(cle)) return cache.get(cle);

  const motif = grilleMotif(point, { face: "endroit" });
  if (!motif) return null;
  const W = motif[0].length;
  const H = motif.length;
  const { points } = cheminDuFil(grilleAvecVoisinage(motif));
  const courbe = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geometrie = new THREE.TubeGeometry(courbe, points.length * 2, MODELE.rayon, 10, false);
  // Ombre de contact de chaque sommet, calculée sur le fil (vue de l'endroit ou de l'envers, le calcul est le même).
  const ao = occlusionDesSommets(geometrie.attributes.position.array, geometrie.attributes.normal.array, points, MODELE.rayon, { force: 0.7, plancher: 0.15 });
  geometrie.setAttribute("ao", new THREE.BufferAttribute(ao, 1));

  const largeurU = W;
  const hauteurU = H * MODELE.pas;
  const pxParU = Math.min(56, 1024 / Math.max(largeurU, hauteurU));
  const lpx = Math.max(16, Math.round(largeurU * pxParU));
  const hpx = Math.max(16, Math.round(hauteurU * pxParU));

  const sens = face === "envers" ? -1 : 1;
  const camera = new THREE.OrthographicCamera(-largeurU / 2, largeurU / 2, hauteurU / 2, -hauteurU / 2, 0.1, 20);
  camera.position.set(0, 0, 5 * sens);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(geometrie);
  scene.add(mesh);

  const cible = () => {
    const rt = new THREE.WebGLRenderTarget(lpx, hpx, { samples: 4, type: THREE.UnsignedByteType });
    rt.texture.wrapS = rt.texture.wrapT = THREE.RepeatWrapping;
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.colorSpace = THREE.NoColorSpace;
    return rt;
  };
  const photographier = (materiau, fond) => {
    const rt = cible();
    mesh.material = materiau;
    const avant = renderer.getRenderTarget();
    const couleurAvant = renderer.getClearColor(new THREE.Color());
    const alphaAvant = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(fond[0], fond[1]);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(avant);
    renderer.setClearColor(couleurAvant, alphaAvant);
    return rt;
  };

  const matNormales = new THREE.ShaderMaterial({ vertexShader: SOMMET, fragmentShader: NORMALES, side: THREE.DoubleSide });
  const matOmbre = new THREE.ShaderMaterial({
    vertexShader: SOMMET, fragmentShader: OMBRE, side: THREE.DoubleSide,
    uniforms: { sens: { value: sens }, profondeur: { value: MODELE.D + MODELE.rayon } },
  });
  // Fond : normale « à plat » (vers la caméra) ; ombre noire et pas de fil (vert = 0).
  const rtNormales = photographier(matNormales, [new THREE.Color(0.5, 0.5, 1), 1]);
  const rtOmbre = photographier(matOmbre, [new THREE.Color(0, 0, 0), 1]);

  geometrie.dispose();
  matNormales.dispose();
  matOmbre.dispose();

  // L'envers est photographié de dos : on le retourne pour le poser sur l'autre face du tissu.
  if (face === "envers") for (const rt of [rtNormales, rtOmbre]) rt.texture.repeat.set(-1, 1);
  const resultat = { normales: rtNormales.texture, ombre: rtOmbre.texture, cibles: [rtNormales, rtOmbre], mailles: W, rangs: H };
  cache.set(cle, resultat);
  return resultat;
}

/** Jette les textures cuites pour ce moteur de rendu. */
export function liberer(renderer) {
  const cache = caches.get(renderer);
  if (!cache) return;
  for (const r of cache.values()) r.cibles.forEach((c) => c.dispose());
  caches.delete(renderer);
}
