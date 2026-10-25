// Dessin de l'écharpe découpée en blocs, chaque bloc rempli avec la texture de son point.
// L'écharpe est dessinée comme elle se tricote (bordure du bas en bas, bandes latérales sur les côtés),
// puis tournée pour l'affichage à l'horizontale : la texture tourne avec elle.

import { useMemo } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { tuileSVG } from "../rendu/texture.js";
import { nuancesLaine } from "../donnees/couleur.js";

const f = (n) => Math.round(n * 100) / 100;

/**
 * Géométrie de l'écharpe en centimètres : une liste de rectangles { blocId, pointId, x, y, l, h }
 * (x sur la largeur, y le long de l'écharpe à partir du bas).
 * Avec un plan calculé, les vraies hauteurs ; sinon, celles demandées, le corps prenant le reste.
 */
export function geometrieEcharpe(projet, plan) {
  const largeur = plan ? plan.largeur.reelleCm : projet.taille.largeurCm;
  const longueur = plan ? plan.longueur.reelleCm : projet.taille.longueurCm;
  const lateral = projet.blocs.find((b) => b.zone === "cotes");
  const bandeCm = plan
    ? plan.bandesLaterales?.largeurCm || 0
    : lateral ? Math.min(largeur / 4, (lateral.largeurMailles || 4) * 0.5) : 0;
  const horizontaux = projet.blocs.filter((b) => b.zone !== "cotes");
  let hauteurs;
  if (plan) {
    hauteurs = horizontaux.map((b) => plan.blocs.find((p) => p.id === b.id)?.hauteurCm || 0);
    // Rangs de transition : comptés avec le bloc qui suit (ils sont dans son plan).
  } else {
    const fixes = horizontaux.filter((b) => b.zone !== "corps").reduce((t, b) => t + (b.hauteurCm || 0), 0);
    const nCorps = horizontaux.filter((b) => b.zone === "corps").length || 1;
    const corps = Math.max(longueur * 0.2, longueur - fixes) / nCorps;
    hauteurs = horizontaux.map((b) => (b.zone === "corps" ? corps : b.hauteurCm || 0));
  }
  const total = hauteurs.reduce((t, h) => t + h, 0) || 1;
  const rects = [];
  let y = 0;
  horizontaux.forEach((b, i) => {
    const h = (hauteurs[i] * longueur) / total;
    rects.push({ blocId: b.id, pointId: b.pointId, x: bandeCm, y, l: largeur - 2 * bandeCm, h });
    y += h;
  });
  if (lateral && bandeCm > 0) {
    rects.push({ blocId: lateral.id, pointId: lateral.pointId, x: 0, y: 0, l: bandeCm, h: longueur, cote: "droit" });
    rects.push({ blocId: lateral.id, pointId: lateral.pointId, x: largeur - bandeCm, y: 0, l: bandeCm, h: longueur, cote: "gauche" });
  }
  return { largeur, longueur, rects };
}

/**
 * Motifs SVG (un par point utilisé), à l'échelle voulue.
 * echelle : un nombre, ou { x, y } pour respecter la vraie proportion des mailles.
 */
export function useMotifs(pointIds, couleur, echelle, prefixe, face = "endroit") {
  const cle = [...new Set(pointIds)].sort().join(",");
  const ex = typeof echelle === "number" ? echelle : echelle.x;
  const ey = typeof echelle === "number" ? echelle : echelle.y;
  return useMemo(() => {
    const motifs = {};
    for (const id of new Set(pointIds)) {
      const point = pointParId(id);
      const t = point && tuileSVG(point, couleur, { face });
      if (!t) continue;
      motifs[id] = {
        id: `${prefixe}-${id}`,
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.svg)}`,
        l: t.largeur * ex,
        h: t.hauteur * ey,
      };
    }
    return motifs;
  }, [cle, couleur, ex, ey, prefixe, face]);
}

/**
 * L'écharpe dessinée.
 * orientation "horizontale" (comme la maquette du builder) ou "verticale" (« voir en long »).
 * blocChoisi : contour terracotta autour de ce bloc. surChoix(blocId) : toucher un bloc le choisit.
 */
export function DessinEcharpe({
  projet, plan, couleur, orientation = "horizontale", blocChoisi = null, surChoix = null,
  largeurPx = 340, longueurVerticalePx = 460, echelleTexture = 0.42, prefixe = "ech", libelle,
}) {
  const geo = geometrieEcharpe(projet, plan);
  const motifs = useMotifs(geo.rects.map((r) => r.pointId).filter(Boolean), couleur, echelleTexture, prefixe);
  const c = nuancesLaine(couleur);
  const marge = 8;

  // Échelle : la longueur remplit l'espace ; la largeur suit, avec des limites pour rester lisible.
  const longueurPx = orientation === "horizontale" ? largeurPx - 2 * marge : longueurVerticalePx - 2 * marge;
  const k = longueurPx / geo.longueur;
  const largeurReellePx = geo.largeur * k;
  const epaisseurPx = Math.min(orientation === "horizontale" ? 96 : 150, Math.max(orientation === "horizontale" ? 44 : 60, largeurReellePx));
  const kx = epaisseurPx / geo.largeur;
  const minBande = 5;

  // Hauteurs à l'écran : une bordure ou une bande reste visible (quelques pixels au moins), le corps prend le reste.
  const minBloc = 8;
  const horiz = geo.rects.filter((r) => !r.cote);
  const corpsIds = new Set(projet.blocs.filter((b) => b.zone === "corps").map((b) => b.id));
  const hPx = new Map(horiz.map((r) => [r, corpsIds.has(r.blocId) ? r.h * k : Math.max(minBloc, r.h * k)]));
  const fixe = horiz.filter((r) => !corpsIds.has(r.blocId)).reduce((t, r) => t + hPx.get(r), 0);
  const corpsBrut = horiz.filter((r) => corpsIds.has(r.blocId)).reduce((t, r) => t + r.h * k, 0) || 1;
  for (const r of horiz) if (corpsIds.has(r.blocId)) hPx.set(r, (r.h * k * Math.max(0, longueurPx - fixe)) / corpsBrut);
  let cumul = 0;
  const yPx = new Map();
  for (const r of horiz) {
    yPx.set(r, longueurPx - cumul - hPx.get(r));
    cumul += hPx.get(r);
  }

  // Coordonnées « tricot » : x sur la largeur, y vers le haut. On dessine dans un repère où le bas est en bas.
  const formes = geo.rects.map((r) => {
    let x = r.x * kx;
    let l = r.l * kx;
    // Bandes latérales jamais plus fines que quelques pixels, pour qu'on les voie.
    if (r.cote === "droit") l = Math.max(minBande, l);
    if (r.cote === "gauche") {
      l = Math.max(minBande, l);
      x = epaisseurPx - l;
    }
    if (!r.cote && geo.rects.some((q) => q.cote)) {
      const b = Math.max(minBande, geo.rects.find((q) => q.cote).l * kx);
      x = b;
      l = epaisseurPx - 2 * b;
    }
    const y = r.cote ? 0 : yPx.get(r);
    const h = r.cote ? longueurPx : hPx.get(r);
    return { ...r, px: { x: f(x), y: f(y), l: f(l), h: f(h) } };
  });

  const transform =
    orientation === "horizontale"
      ? `translate(${marge + longueurPx} ${marge}) rotate(90)`
      : `translate(${marge} ${marge})`;
  const largeurSvg = orientation === "horizontale" ? largeurPx : epaisseurPx + 2 * marge;
  const hauteurSvg = orientation === "horizontale" ? epaisseurPx + 2 * marge : longueurVerticalePx;

  const choisis = formes.filter((r) => r.blocId === blocChoisi);

  return html`
    <svg width=${largeurSvg} height=${hauteurSvg} viewBox=${`0 0 ${largeurSvg} ${hauteurSvg}`} role="img"
      aria-label=${libelle || "Dessin de l'écharpe avec ses blocs"} style="max-width:100%;height:auto;display:block;margin:0 auto">
      <defs>
        ${Object.values(motifs).map(
          (m) => html`<pattern id=${m.id} patternUnits="userSpaceOnUse" width=${f(m.l)} height=${f(m.h)}>
            <image href=${m.url} width=${f(m.l)} height=${f(m.h)} preserveAspectRatio="none" />
          </pattern>`
        )}
        <clipPath id=${`${prefixe}-contour`}>
          <rect x="0" y="0" width=${epaisseurPx} height=${longueurPx} rx="6" />
        </clipPath>
      </defs>
      <g transform=${transform}>
        <g clip-path=${`url(#${prefixe}-contour)`}>
          <rect x="0" y="0" width=${epaisseurPx} height=${longueurPx} fill=${c.fond} />
          ${formes.map(
            (r) => html`<rect x=${r.px.x} y=${r.px.y} width=${r.px.l} height=${r.px.h}
              fill=${motifs[r.pointId] ? `url(#${motifs[r.pointId].id})` : c.maille}
              style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix(r.blocId) : undefined} />`
          )}
          ${formes.filter((r) => !r.cote).slice(1).map(
            (r) => html`<line x1="0" x2=${epaisseurPx} y1=${f(r.px.y + r.px.h)} y2=${f(r.px.y + r.px.h)} stroke=${c.contour} stroke-width="0.8" opacity="0.6" />`
          )}
        </g>
        ${choisis.map(
          (r) => html`<rect x=${f(r.px.x - 2)} y=${f(Math.max(-2, r.px.y - 2))} width=${f(r.px.l + 4)} height=${f(Math.min(longueurPx + 4, r.px.h + 4))}
            rx="5" fill="none" stroke="var(--accent)" stroke-width="3" pointer-events="none" />`
        )}
      </g>
    </svg>`;
}
