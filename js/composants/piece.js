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
 * Géométrie de l'écharpe en centimètres : une liste de rectangles
 * { blocId, colonneId?, pointId, laineId, rangee, x, y, l, h, cote? }
 * (x sur la largeur à partir du bord droit, y le long de l'écharpe à partir du bas ; rangee : indice du bloc horizontal).
 * Avec un plan calculé, les vraies hauteurs et largeurs de colonnes ; sinon, celles demandées, le corps prenant le reste.
 * Les bandes latérales sont découpées à la hauteur de chaque bloc : elles prennent sa laine.
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
  const milieu = largeur - 2 * bandeCm;
  let y = 0;
  horizontaux.forEach((b, i) => {
    const h = (hauteurs[i] * longueur) / total;
    const laineId = b.laineId || null;
    const pb = plan?.blocs.find((p) => p.id === b.id);
    const colonnes = pb ? pb.colonnes : b.colonnes?.length >= 2 ? b.colonnes : null;
    if (colonnes) {
      // Largeurs réelles des colonnes si le plan les donne, sinon parts égales.
      const poids = colonnes.map((c) => c.largeurCm || 1);
      const somme = poids.reduce((t, w) => t + w, 0);
      let x = bandeCm;
      colonnes.forEach((c, j) => {
        const l = (poids[j] / somme) * milieu;
        rects.push({ blocId: b.id, colonneId: c.id, colonne: j + 1, pointId: c.pointId, laineId, rangee: i, x, y, l, h });
        x += l;
      });
    } else {
      rects.push({ blocId: b.id, pointId: b.pointId, laineId, rangee: i, x: bandeCm, y, l: milieu, h });
    }
    if (lateral && bandeCm > 0) {
      rects.push({ blocId: lateral.id, pointId: lateral.pointId, laineId, rangee: i, x: 0, y, l: bandeCm, h, cote: "droit" });
      rects.push({ blocId: lateral.id, pointId: lateral.pointId, laineId, rangee: i, x: largeur - bandeCm, y, l: bandeCm, h, cote: "gauche" });
    }
    y += h;
  });
  return { largeur, longueur, rects, rangees: horizontaux.map((b, i) => ({ blocId: b.id, zone: b.zone, hauteur: (hauteurs[i] * longueur) / total })) };
}

/** Couleur d'un rectangle : celle de la laine du bloc, sinon celle de la laine principale. */
export function couleurDeLaine(laineId, couleur, laines = []) {
  return (laineId && laines.find((l) => l.id === laineId)?.couleur) || couleur;
}

const cleMotif = (pointId, couleur) => `${pointId}|${couleur}`;

/**
 * Motifs SVG (un par point et par couleur utilisés), à l'échelle voulue.
 * paires : [{ pointId, couleur }] ; echelle : un nombre, ou { x, y } pour respecter la vraie proportion des mailles.
 * Renvoie un dictionnaire indexé par motifDe(pointId, couleur).
 */
export function useMotifs(paires, echelle, prefixe, face = "endroit") {
  const uniques = [...new Map(paires.filter((p) => p.pointId).map((p) => [cleMotif(p.pointId, p.couleur), p])).values()];
  const cle = uniques.map((p) => cleMotif(p.pointId, p.couleur)).sort().join(",");
  const ex = typeof echelle === "number" ? echelle : echelle.x;
  const ey = typeof echelle === "number" ? echelle : echelle.y;
  return useMemo(() => {
    const motifs = {};
    uniques.forEach(({ pointId, couleur }, i) => {
      const point = pointParId(pointId);
      const t = point && tuileSVG(point, couleur, { face });
      if (!t) return;
      motifs[cleMotif(pointId, couleur)] = {
        id: `${prefixe}-${pointId}-${String(couleur).replace(/[^0-9a-z]/gi, "")}-${i}`,
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.svg)}`,
        l: t.largeur * ex,
        h: t.hauteur * ey,
      };
    });
    return motifs;
  }, [cle, ex, ey, prefixe, face]);
}
export const motifDe = (motifs, pointId, couleur) => motifs[cleMotif(pointId, couleur)];

/** Contour (en coordonnées écran) qui entoure une liste de formes. */
function boite(formes) {
  const x0 = Math.min(...formes.map((r) => r.px.x));
  const y0 = Math.min(...formes.map((r) => r.px.y));
  const x1 = Math.max(...formes.map((r) => r.px.x + r.px.l));
  const y1 = Math.max(...formes.map((r) => r.px.y + r.px.h));
  return { x: x0, y: y0, l: x1 - x0, h: y1 - y0 };
}

/**
 * L'écharpe dessinée.
 * orientation "horizontale" (comme la maquette du builder) ou "verticale" (« voir en long »).
 * blocChoisi : contour terracotta autour de ce bloc. surChoix(blocId) : toucher un bloc le choisit.
 */
export function DessinEcharpe({
  projet, plan, couleur, laines = [], orientation = "horizontale", blocChoisi = null, colonneChoisie = null, surChoix = null,
  largeurPx = 340, longueurVerticalePx = 460, echelleTexture = 0.42, prefixe = "ech", libelle,
}) {
  const geo = geometrieEcharpe(projet, plan);
  const teinte = (r) => couleurDeLaine(r.laineId, couleur, laines);
  const motifs = useMotifs(geo.rects.map((r) => ({ pointId: r.pointId, couleur: teinte(r) })), echelleTexture, prefixe);
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
  const rangees = geo.rangees.map((r) => ({ ...r, corps: r.zone === "corps" }));
  const hPx = rangees.map((r) => (r.corps ? r.hauteur * k : Math.max(minBloc, r.hauteur * k)));
  const fixe = rangees.reduce((t, r, i) => t + (r.corps ? 0 : hPx[i]), 0);
  const corpsBrut = rangees.reduce((t, r) => t + (r.corps ? r.hauteur * k : 0), 0) || 1;
  rangees.forEach((r, i) => {
    if (r.corps) hPx[i] = (r.hauteur * k * Math.max(0, longueurPx - fixe)) / corpsBrut;
  });
  const yPx = [];
  let cumul = 0;
  rangees.forEach((r, i) => {
    yPx[i] = longueurPx - cumul - hPx[i];
    cumul += hPx[i];
  });

  // Bandes latérales jamais plus fines que quelques pixels, pour qu'on les voie.
  const lateralCm = geo.rects.find((q) => q.cote)?.l || 0;
  const bandePx = lateralCm ? Math.max(minBande, lateralCm * kx) : 0;
  const milieuCm = geo.largeur - 2 * lateralCm;
  const milieuPx = epaisseurPx - 2 * bandePx;
  const formes = geo.rects.map((r) => {
    let x;
    let l;
    if (r.cote === "droit") [x, l] = [0, bandePx];
    else if (r.cote === "gauche") [x, l] = [epaisseurPx - bandePx, bandePx];
    else [x, l] = [bandePx + ((r.x - lateralCm) / milieuCm) * milieuPx, (r.l / milieuCm) * milieuPx];
    return { ...r, couleur: teinte(r), px: { x: f(x), y: f(yPx[r.rangee]), l: f(l), h: f(hPx[r.rangee]) } };
  });

  const transform =
    orientation === "horizontale"
      ? `translate(${marge + longueurPx} ${marge}) rotate(90)`
      : `translate(${marge} ${marge})`;
  const largeurSvg = orientation === "horizontale" ? largeurPx : epaisseurPx + 2 * marge;
  const hauteurSvg = orientation === "horizontale" ? epaisseurPx + 2 * marge : longueurVerticalePx;

  // Contour du bloc choisi (un par côté pour les bandes latérales), ou de la colonne choisie.
  const choisis = formes.filter((r) => r.blocId === blocChoisi && (!colonneChoisie || r.colonneId === colonneChoisie));
  const contours = ["droit", "gauche", undefined]
    .map((cote) => choisis.filter((r) => r.cote === cote))
    .filter((liste) => liste.length)
    .map(boite);
  const remplir = (r) => {
    const m = motifDe(motifs, r.pointId, r.couleur);
    return m ? `url(#${m.id})` : nuancesLaine(r.couleur).maille;
  };

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
            (r) => html`<rect x=${r.px.x} y=${r.px.y} width=${r.px.l} height=${f(r.px.h + 0.4)}
              fill=${remplir(r)}
              style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix(r.blocId, r.colonneId) : undefined} />`
          )}
          ${rangees.slice(1).map(
            (r, i) => html`<line x1="0" x2=${epaisseurPx} y1=${f(yPx[i + 1] + hPx[i + 1])} y2=${f(yPx[i + 1] + hPx[i + 1])} stroke=${c.contour} stroke-width="0.8" opacity="0.6" />`
          )}
          ${formes.filter((r) => r.colonne > 1).map(
            (r) => html`<line x1=${r.px.x} x2=${r.px.x} y1=${r.px.y} y2=${f(r.px.y + r.px.h)} stroke=${nuancesLaine(r.couleur).contour} stroke-width="0.8" opacity="0.7" />`
          )}
        </g>
        ${contours.map(
          (b) => html`<rect x=${f(b.x - 2)} y=${f(Math.max(-2, b.y - 2))} width=${f(b.l + 4)} height=${f(Math.min(longueurPx + 4, b.h + 4))}
            rx="5" fill="none" stroke="var(--accent)" stroke-width="3" pointer-events="none" />`
        )}
      </g>
    </svg>`;
}
