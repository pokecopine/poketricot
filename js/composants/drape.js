// Aperçu de l'écharpe finie (maquette P8b) : drapée sur une barre en bois, les deux pans qui pendent.
// Le pan de devant montre le bas de l'écharpe (bordure du bas en bas), le pan de derrière le haut,
// chaque bloc rempli avec la texture de son point, à la vraie proportion des mailles, puis ombré.

import { html } from "../html.js";
import { useMotifs, motifDe, geometrieEcharpe, couleurDeLaine } from "./piece.js";
import { LARGEUR_MAILLE, HAUTEUR_RANG } from "../rendu/texture.js";
import { nuancesLaine } from "../donnees/couleur.js";

const f = (n) => Math.round(n * 100) / 100;

// Formes de la maquette (repère 350 × 500).
const AVANT = { haut: 70, bas: 476, gauche: 96, droite: 196, chemin: "M96 70 C102 200, 90 320, 100 470 L196 476 C188 330, 202 210, 194 70 Z" };
const ARRIERE = { haut: 70, bas: 404, gauche: 176, droite: 270, chemin: "M176 70 C180 190, 172 290, 182 400 L270 404 C264 290, 276 190, 268 70 Z" };
const PLI = "M94 74 C96 36, 270 36, 272 74 C250 56, 120 56, 94 74 Z";

/**
 * Rectangles d'un pan : la partie [de, a] de la longueur de l'écharpe (en cm), dessinée dans le cadre du pan.
 * inverse : le pan de derrière montre l'extrémité du haut en bas du pan.
 */
function rectsDuPan(geo, pan, de, a, inverse) {
  const hPx = pan.bas - pan.haut;
  const lPx = pan.droite - pan.gauche;
  const ky = hPx / (a - de);
  const kx = lPx / geo.largeur;
  const rects = [];
  for (const r of geo.rects) {
    const y0 = Math.max(de, r.y);
    const y1 = Math.min(a, r.y + r.h);
    if (y1 <= y0) continue;
    // Position à l'écran : depuis le bas du pan (pan de devant) ou depuis le haut (pan de derrière, retourné).
    const top = inverse ? pan.haut + (y0 - de) * ky : pan.bas - (y1 - de) * ky;
    // Le contour du pan ondule : les rectangles du bord débordent un peu pour ne laisser aucun vide.
    let x = pan.gauche + r.x * kx;
    let l = r.l * kx;
    if (r.x < 0.01) {
      x -= 12;
      l += 12;
    }
    if (r.x + r.l > geo.largeur - 0.01) l += 12;
    rects.push({ pointId: r.pointId, couleur: r.couleur, x, y: top, l, h: (y1 - y0) * ky, cote: r.cote });
  }
  return rects;
}

export function EcharpeDrapee({ projet, plan, couleur, laines = [], densite, face = "endroit", pointLoupe, libelle }) {
  const brut = geometrieEcharpe(projet, plan);
  const geo = { ...brut, rects: brut.rects.map((r) => ({ ...r, couleur: couleurDeLaine(r.laineId, couleur, laines) })) };
  const c = nuancesLaine(couleur);
  // Échelle des mailles : la largeur de l'écharpe occupe la largeur du pan de devant.
  const pxParCm = (AVANT.droite - AVANT.gauche) / geo.largeur;
  const mailles = densite?.mailles || 18;
  const rangs = densite?.rangs || 25;
  const echelle = { x: (pxParCm * 10) / mailles / LARGEUR_MAILLE, y: (pxParCm * 10) / rangs / HAUTEUR_RANG };
  const motifs = useMotifs(geo.rects.map((r) => ({ pointId: r.pointId, couleur: r.couleur })), echelle, "drape", face);
  const loupe = useMotifs(pointLoupe ? [{ pointId: pointLoupe, couleur }] : [], { x: echelle.x * 3, y: echelle.y * 3 }, "loupe", face);
  const moitie = geo.longueur / 2;
  // Un peu de l'écharpe passe par-dessus la barre : les pans montrent chacun un peu moins de la moitié.
  const avant = rectsDuPan(geo, AVANT, 0, moitie * 0.94, false);
  const arriere = rectsDuPan(geo, ARRIERE, moitie * 1.06, geo.longueur, true);
  // Le pli sur la barre : le milieu de l'écharpe (le corps, ou sa colonne du milieu).
  const auMilieu = geo.rects.filter((r) => !r.cote && r.y <= moitie && r.y + r.h >= moitie);
  const pli = auMilieu[Math.floor(auMilieu.length / 2)] || { pointId: projet.pointPrincipal, couleur };
  const remplir = (r) => {
    const m = motifDe(motifs, r.pointId, r.couleur);
    return m ? `url(#${m.id})` : nuancesLaine(r.couleur).maille;
  };
  const motifLoupe = pointLoupe && motifDe(loupe, pointLoupe, couleur);

  return html`
    <svg width="350" height="500" viewBox="0 0 350 500" role="img" aria-label=${libelle} style="display:block;max-width:100%;height:auto;margin:0 auto">
      <defs>
        ${Object.values(motifs).map(
          (m) => html`<pattern id=${m.id} patternUnits="userSpaceOnUse" width=${f(m.l)} height=${f(m.h)}>
            <image href=${m.url} width=${f(m.l)} height=${f(m.h)} preserveAspectRatio="none" /></pattern>`
        )}
        ${Object.values(motifs).map(
          (m) => html`<pattern id=${m.id + "-r"} patternUnits="userSpaceOnUse" width=${f(m.l)} height=${f(m.h)} patternTransform="rotate(180)">
            <image href=${m.url} width=${f(m.l)} height=${f(m.h)} preserveAspectRatio="none" /></pattern>`
        )}
        ${motifLoupe &&
        html`<pattern id=${motifLoupe.id} patternUnits="userSpaceOnUse" width=${f(motifLoupe.l)} height=${f(motifLoupe.h)}>
          <image href=${motifLoupe.url} width=${f(motifLoupe.l)} height=${f(motifLoupe.h)} preserveAspectRatio="none" /></pattern>`}
        <linearGradient id="drape-volume" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.32"></stop><stop offset="0.22" stop-color="#000" stop-opacity="0.05"></stop>
          <stop offset="0.55" stop-color="#fff" stop-opacity="0.10"></stop><stop offset="0.85" stop-color="#000" stop-opacity="0.10"></stop>
          <stop offset="1" stop-color="#000" stop-opacity="0.30"></stop>
        </linearGradient>
        <linearGradient id="drape-pli" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0.18"></stop><stop offset="1" stop-color="#000" stop-opacity="0.28"></stop>
        </linearGradient>
        <clipPath id="drape-avant"><path d=${AVANT.chemin}></path></clipPath>
        <clipPath id="drape-arriere"><path d=${ARRIERE.chemin}></path></clipPath>
        <clipPath id="drape-loupe"><circle cx="46" cy="46" r="43"></circle></clipPath>
      </defs>
      <ellipse cx="185" cy="486" rx="120" ry="8" fill="#000" fill-opacity="0.08"></ellipse>
      <rect x="40" y="56" width="270" height="12" rx="6" fill="#A8794F"></rect>
      <circle cx="40" cy="62" r="9" fill="#8E6440"></circle>
      <circle cx="310" cy="62" r="9" fill="#8E6440"></circle>
      <g clip-path="url(#drape-arriere)">
        <rect x="160" y="60" width="130" height="350" fill=${c.fond}></rect>
        ${arriere.map((r) => html`<rect x=${f(r.x)} y=${f(r.y)} width=${f(r.l)} height=${f(r.h + 0.5)} fill=${motifDe(motifs, r.pointId, r.couleur) ? `url(#${motifDe(motifs, r.pointId, r.couleur).id}-r)` : nuancesLaine(r.couleur).maille}></rect>`)}
        <rect x="170" y="60" width="110" height="350" fill="url(#drape-volume)"></rect>
        <rect x="160" y="60" width="130" height="350" fill="#000" fill-opacity="0.16"></rect>
      </g>
      <path d=${PLI} fill=${remplir(pli)}></path>
      <path d=${PLI} fill="url(#drape-pli)"></path>
      <g clip-path="url(#drape-avant)">
        <rect x="80" y="60" width="130" height="420" fill=${c.fond}></rect>
        ${avant.map((r) => html`<rect x=${f(r.x)} y=${f(r.y)} width=${f(r.l)} height=${f(r.h + 0.5)} fill=${remplir(r)}></rect>`)}
        <rect x="88" y="60" width="112" height="420" fill="url(#drape-volume)"></rect>
      </g>
      ${motifLoupe &&
      html`<g transform="translate(244 300)">
        <g clip-path="url(#drape-loupe)"><rect width="92" height="92" fill=${`url(#${motifLoupe.id})`}></rect></g>
        <circle cx="46" cy="46" r="43" fill="none" stroke="#FFFDF8" stroke-width="4"></circle>
      </g>`}
    </svg>`;
}
