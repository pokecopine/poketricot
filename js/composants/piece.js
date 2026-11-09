// Dessin de l'écharpe découpée en blocs, chaque bloc rempli avec la texture de son point.
// L'écharpe est dessinée comme elle se tricote (bordure du bas en bas, bandes latérales sur les côtés),
// puis tournée pour l'affichage à l'horizontale : la texture tourne avec elle.

import { useMemo } from "preact/hooks";
import { html } from "../html.js";
import { pointParId } from "../catalogue/points.js";
import { tuileSVG } from "../rendu/texture.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { pointSimpleAuSommet } from "../moteur/plan-bonnet.js";

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
    // Intarsia (0.16.0) : chaque colonne dans sa laine ; la bande droite prend celle de la colonne 1, la gauche celle de la dernière.
    const laineCol = (c) => (pb ? (c.laineId !== undefined ? c.laineId : laineId) : c.laineId || laineId);
    let laineDroite = laineId;
    let laineGauche = laineId;
    if (colonnes) {
      // Largeurs réelles des colonnes si le plan les donne, sinon parts égales.
      const poids = colonnes.map((c) => c.largeurCm || 1);
      const somme = poids.reduce((t, w) => t + w, 0);
      let x = bandeCm;
      colonnes.forEach((c, j) => {
        const l = (poids[j] / somme) * milieu;
        rects.push({ blocId: b.id, colonneId: c.id, colonne: j + 1, pointId: c.pointId, laineId: laineCol(c), rangee: i, x, y, l, h });
        x += l;
      });
      laineDroite = laineCol(colonnes[0]);
      laineGauche = laineCol(colonnes.at(-1));
    } else {
      rects.push({ blocId: b.id, pointId: b.pointId, laineId, rangee: i, x: bandeCm, y, l: milieu, h });
    }
    if (lateral && bandeCm > 0) {
      rects.push({ blocId: lateral.id, pointId: lateral.pointId, laineId: laineDroite, rangee: i, x: 0, y, l: bandeCm, h, cote: "droit" });
      rects.push({ blocId: lateral.id, pointId: lateral.pointId, laineId: laineGauche, rangee: i, x: largeur - bandeCm, y, l: bandeCm, h, cote: "gauche" });
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

/**
 * Géométrie du snood ouvert et posé à plat, en centimètres (0.14.0) : largeur = tour, hauteur = hauteur du snood.
 * Rectangles { blocId, colonneId?, colonne?, pointId, laineId, rangee, x, y, l, h } ; x depuis le bord droit
 * (le début du tour), y depuis le bas. Les colonnes partent du marqueur, vers la gauche.
 */
export function geometrieSnood(projet, plan) {
  const tour = plan ? plan.largeur.reelleCm : projet.taille.tourCm;
  const hauteur = plan ? plan.longueur.reelleCm : projet.taille.hauteurCm;
  const horizontaux = projet.blocs.filter((b) => b.zone !== "cotes");
  let hauteurs;
  if (plan) {
    hauteurs = horizontaux.map((b) => plan.blocs.find((p) => p.id === b.id)?.hauteurCm || 0);
  } else {
    const fixes = horizontaux.filter((b) => b.zone !== "corps").reduce((t, b) => t + (b.hauteurCm || 0), 0);
    const nCorps = horizontaux.filter((b) => b.zone === "corps").length || 1;
    const corps = Math.max(hauteur * 0.2, hauteur - fixes) / nCorps;
    hauteurs = horizontaux.map((b) => (b.zone === "corps" ? corps : b.hauteurCm || 0));
  }
  const total = hauteurs.reduce((t, h) => t + h, 0) || 1;
  const rects = [];
  let y = 0;
  horizontaux.forEach((b, i) => {
    const h = (hauteurs[i] * hauteur) / total;
    const laineId = b.laineId || null;
    const pb = plan?.blocs.find((p) => p.id === b.id);
    const colonnes = pb ? pb.colonnes : b.colonnes?.length >= 2 ? b.colonnes : null;
    if (colonnes) {
      const poids = colonnes.map((c) => c.largeurCm || 1);
      const somme = poids.reduce((t, w) => t + w, 0);
      let x = 0;
      colonnes.forEach((c, j) => {
        const l = (poids[j] / somme) * tour;
        rects.push({ blocId: b.id, colonneId: c.id, colonne: j + 1, pointId: c.pointId, laineId, rangee: i, x, y, l, h });
        x += l;
      });
    } else {
      rects.push({ blocId: b.id, pointId: b.pointId, laineId, rangee: i, x: 0, y, l: tour, h });
    }
    y += h;
  });
  return { tour, hauteur, rects, rangees: horizontaux.map((b, i) => ({ blocId: b.id, zone: b.zone, hauteur: (hauteurs[i] * hauteur) / total })) };
}

/**
 * Le snood dessiné ouvert et posé à plat (maquette validée le 02/11) : les blocs empilés du bas vers le haut,
 * le début du tour marqué par un trait pointillé sur le bord droit.
 */
export function DessinSnood({
  projet, plan, couleur, laines = [], blocChoisi = null, colonneChoisie = null, surChoix = null,
  largeurPx = 300, hauteurMinPx = 84, hauteurMaxPx = 170, echelleTexture = 0.42, prefixe = "snood", libelle, reperes = true,
}) {
  const geo = geometrieSnood(projet, plan);
  const teinte = (r) => couleurDeLaine(r.laineId, couleur, laines);
  const motifs = useMotifs(geo.rects.map((r) => ({ pointId: r.pointId, couleur: teinte(r) })), echelleTexture, prefixe);
  const c = nuancesLaine(couleur);
  const W = largeurPx;
  const H = Math.min(hauteurMaxPx, Math.max(hauteurMinPx, (W * geo.hauteur) / geo.tour));
  const minBloc = 10;
  const hPx = geo.rangees.map((r) => (r.zone === "corps" ? 0 : Math.max(minBloc, (r.hauteur * H) / geo.hauteur)));
  const fixe = hPx.reduce((t, h) => t + h, 0);
  const corpsBrut = geo.rangees.reduce((t, r) => t + (r.zone === "corps" ? r.hauteur : 0), 0) || 1;
  geo.rangees.forEach((r, i) => {
    if (r.zone === "corps") hPx[i] = (r.hauteur * Math.max(0, H - fixe)) / corpsBrut;
  });
  const yPx = [];
  let cumul = 0;
  geo.rangees.forEach((r, i) => {
    yPx[i] = H - cumul - hPx[i];
    cumul += hPx[i];
  });
  const mx = 4;
  const my = 8;
  const bas = reperes ? 26 : 0;
  const formes = geo.rects.map((r) => {
    const l = (r.l / geo.tour) * W;
    const x = W - (r.x / geo.tour) * W - l;
    return { ...r, couleur: teinte(r), px: { x: f(x), y: f(yPx[r.rangee]), l: f(l), h: f(hPx[r.rangee]) } };
  });
  const choisis = formes.filter((r) => r.blocId === blocChoisi && (!colonneChoisie || r.colonneId === colonneChoisie));
  const contour = choisis.length ? boite(choisis) : null;
  const remplir = (r) => {
    const m = motifDe(motifs, r.pointId, r.couleur);
    return m ? `url(#${m.id})` : nuancesLaine(r.couleur).maille;
  };
  return html`
    <svg width=${W + 2 * mx} height=${H + 2 * my + bas} viewBox=${`0 0 ${W + 2 * mx} ${H + 2 * my + bas}`} role="img"
      aria-label=${libelle || "Le snood ouvert et posé à plat, avec ses blocs ; le début du tour est sur le bord droit"}
      style="max-width:100%;height:auto;display:block;margin:0 auto">
      <defs>
        ${Object.values(motifs).map(
          (m) => html`<pattern id=${m.id} patternUnits="userSpaceOnUse" width=${f(m.l)} height=${f(m.h)}>
            <image href=${m.url} width=${f(m.l)} height=${f(m.h)} preserveAspectRatio="none" />
          </pattern>`
        )}
        <clipPath id=${`${prefixe}-contour`}><rect x="0" y="0" width=${W} height=${H} rx="6" /></clipPath>
      </defs>
      <g transform=${`translate(${mx} ${my})`}>
        <g clip-path=${`url(#${prefixe}-contour)`}>
          <rect x="0" y="0" width=${W} height=${H} fill=${c.fond} />
          ${formes.map(
            (r) => html`<rect x=${r.px.x} y=${r.px.y} width=${r.px.l} height=${f(r.px.h + 0.4)} fill=${remplir(r)}
              style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix(r.blocId, r.colonneId) : undefined} />`
          )}
          ${geo.rangees.slice(1).map((r, i) => html`<line x1="0" x2=${W} y1=${f(yPx[i + 1] + hPx[i + 1])} y2=${f(yPx[i + 1] + hPx[i + 1])} stroke=${c.contour} stroke-width="0.8" opacity="0.6" />`)}
          ${formes.filter((r) => r.colonne > 1).map(
            (r) => html`<line x1=${f(r.px.x + r.px.l)} x2=${f(r.px.x + r.px.l)} y1=${r.px.y} y2=${f(r.px.y + r.px.h)} stroke=${nuancesLaine(r.couleur).contour} stroke-width="0.8" opacity="0.7" />`
          )}
        </g>
        <rect x="0" y="0" width=${W} height=${H} rx="6" fill="none" stroke=${c.contour} stroke-opacity="0.35" />
        ${contour && html`<rect x=${f(contour.x + 1.5)} y=${f(contour.y + 1.5)} width=${f(contour.l - 3)} height=${f(contour.h - 3)}
          rx="4" fill="none" stroke="var(--accent)" stroke-width="3" pointer-events="none" />`}
        <line x1=${W} x2=${W} y1="-6" y2=${H + 6} stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" />
        ${reperes && html`
          <text x=${W - 2} y=${H + 22} text-anchor="end" font-size="12" font-weight="700" fill="var(--accent)" font-family="var(--corps)">début du tour ↑</text>
          <text x="0" y=${H + 22} font-size="12" fill="var(--texte-2)" font-family="var(--corps)">← le tour continue</text>`}
      </g>
    </svg>`;
}

/** Point du sommet d'un bonnet sans plan calculé : celui de la dernière partie du corps s'il est simple, sinon le jersey. */
function pointDuSommetSansPlan(projet) {
  const haut = projet.blocs.filter((b) => b.zone === "corps").at(-1);
  return haut?.pointId && !(haut.colonnes?.length >= 2) && pointSimpleAuSommet(pointParId(haut.pointId)) ? haut.pointId : "jersey";
}

/**
 * Géométrie du bonnet ouvert et posé à plat (0.17.0) : le bord et le corps comme un snood (largeur = tour),
 * puis le sommet (sa hauteur, son point, sa laine) et le pompon.
 */
export function geometrieBonnet(projet, plan) {
  const sommetPlan = plan?.blocs.find((b) => b.zone === "sommet");
  const basCorps = plan ? plan.blocs.filter((b) => b.zone !== "sommet").reduce((t, b) => t + b.hauteurCm, 0) : null;
  const tour = plan ? plan.largeur.reelleCm : (projet.taille.teteCm || 56) - 5;
  const sommetCm = sommetPlan?.hauteurCm ?? 6;
  const corps = geometrieSnood(
    { ...projet, taille: { tourCm: tour, hauteurCm: Math.max(4, (projet.taille.hauteurCm || 22) - sommetCm + (projet.taille.revers ? 5 : 0)) } },
    plan ? { ...plan, longueur: { reelleCm: basCorps } } : null,
  );
  const haut = projet.blocs.filter((b) => b.zone === "corps").at(-1);
  return {
    ...corps,
    sommet: { blocId: "sommet", pointId: plan?.sommet?.pointId || pointDuSommetSansPlan(projet), laineId: haut?.laineId || null, h: sommetCm },
    pompon: projet.taille.pompon ? { cm: projet.taille.pomponCm || 6, laineId: projet.taille.pomponLaineId || null } : null,
    revers: !!projet.taille.revers,
  };
}

/**
 * Le bonnet dessiné ouvert et posé à plat (maquette validée le 09/11) : le bord (avec le repli du revers),
 * le corps, le sommet en 8 pointes, le pompon au-dessus ; le début du tour sur le bord droit.
 */
export function DessinBonnet({
  projet, plan, couleur, laines = [], blocChoisi = null, colonneChoisie = null, surChoix = null,
  largeurPx = 300, hauteurMinPx = 90, hauteurMaxPx = 190, echelleTexture = 0.42, prefixe = "bonnet", libelle, reperes = true,
}) {
  const geo = geometrieBonnet(projet, plan);
  const teinte = (r) => couleurDeLaine(r.laineId, couleur, laines);
  const motifs = useMotifs(
    [...geo.rects.map((r) => ({ pointId: r.pointId, couleur: teinte(r) })), { pointId: geo.sommet.pointId, couleur: teinte(geo.sommet) }],
    echelleTexture, prefixe,
  );
  const c = nuancesLaine(couleur);
  const W = largeurPx;
  const H = Math.min(hauteurMaxPx, Math.max(hauteurMinPx, (W * geo.hauteur) / geo.tour));
  const minBloc = 12;
  const hPx = geo.rangees.map((r) => (r.zone === "corps" ? 0 : Math.max(minBloc, (r.hauteur * H) / geo.hauteur)));
  const fixe = hPx.reduce((t, h) => t + h, 0);
  const corpsBrut = geo.rangees.reduce((t, r) => t + (r.zone === "corps" ? r.hauteur : 0), 0) || 1;
  geo.rangees.forEach((r, i) => {
    if (r.zone === "corps") hPx[i] = (r.hauteur * Math.max(0, H - fixe)) / corpsBrut;
  });
  const hSommet = Math.max(30, Math.min(70, (geo.sommet.h * H) / geo.hauteur));
  const hPompon = geo.pompon ? 34 : 0;
  const haut = hPompon + hSommet;
  const yPx = [];
  let cumul = 0;
  geo.rangees.forEach((r, i) => {
    yPx[i] = haut + H - cumul - hPx[i];
    cumul += hPx[i];
  });
  const mx = 6;
  const my = 6;
  const bas = reperes ? 24 : 0;
  const formes = geo.rects.map((r) => {
    const l = (r.l / geo.tour) * W;
    const x = W - (r.x / geo.tour) * W - l;
    return { ...r, couleur: teinte(r), px: { x: f(x), y: f(yPx[r.rangee]), l: f(l), h: f(hPx[r.rangee]) } };
  });
  const remplir = (pointId, coul) => {
    const m = motifDe(motifs, pointId, coul);
    return m ? `url(#${m.id})` : nuancesLaine(coul).maille;
  };
  // Les 8 pointes du sommet : chaque part se resserre jusqu'à une petite pointe.
  const yS = hPompon;
  const pointes = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * W) / 8;
    const b = ((i + 1) * W) / 8;
    const m = (a + b) / 2;
    pointes.push(`${f(a)},${f(yS + hSommet)} ${f(m - W * 0.012)},${f(yS + 2)} ${f(m + W * 0.012)},${f(yS + 2)}`);
  }
  const couleurSommet = teinte(geo.sommet);
  const choisis = blocChoisi === "sommet" || blocChoisi === "pompon" ? [] : formes.filter((r) => r.blocId === blocChoisi && (!colonneChoisie || r.colonneId === colonneChoisie));
  const contour = choisis.length ? boite(choisis) : null;
  const iBord = geo.rangees.findIndex((r) => r.zone === "bas");
  const yRepli = iBord >= 0 ? yPx[iBord] + hPx[iBord] / 2 : null;
  const couleurPompon = geo.pompon ? couleurDeLaine(geo.pompon.laineId, couleur, laines) : null;
  const np = couleurPompon ? nuancesLaine(couleurPompon) : null;
  const total = haut + H;
  return html`
    <svg width=${W + 2 * mx} height=${total + 2 * my + bas} viewBox=${`0 0 ${W + 2 * mx} ${total + 2 * my + bas}`} role="img"
      aria-label=${libelle || "Le bonnet ouvert et posé à plat : le bord en bas, le sommet en 8 parts en haut, le pompon au-dessus ; le début du tour est sur le bord droit"}
      style="max-width:100%;height:auto;display:block;margin:0 auto">
      <defs>
        ${Object.values(motifs).map(
          (m) => html`<pattern id=${m.id} patternUnits="userSpaceOnUse" width=${f(m.l)} height=${f(m.h)}>
            <image href=${m.url} width=${f(m.l)} height=${f(m.h)} preserveAspectRatio="none" />
          </pattern>`
        )}
        <clipPath id=${`${prefixe}-corps`}><rect x="0" y=${haut} width=${W} height=${H} rx="5" /></clipPath>
        ${np && html`<radialGradient id=${`${prefixe}-pompon`} cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stop-color=${np.eclat} /><stop offset="0.55" stop-color=${np.maille} /><stop offset="1" stop-color=${np.contour} />
        </radialGradient>`}
      </defs>
      <g transform=${`translate(${mx} ${my})`}>
        ${geo.pompon && html`<circle cx=${f(W / 2)} cy=${f(hPompon / 2 + 1)} r=${f(hPompon / 2 - 2)} fill=${`url(#${prefixe}-pompon)`}
          stroke=${blocChoisi === "pompon" ? "var(--accent)" : np.contour} stroke-width=${blocChoisi === "pompon" ? 3 : 1}
          style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix("pompon") : undefined} />`}
        <polygon points=${pointes.join(" ") + ` ${f(W)},${f(yS + hSommet)}`} fill=${remplir(geo.sommet.pointId, couleurSommet)}
          stroke=${blocChoisi === "sommet" ? "var(--accent)" : nuancesLaine(couleurSommet).contour} stroke-width=${blocChoisi === "sommet" ? 2.5 : 0.8} stroke-linejoin="round"
          style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix("sommet") : undefined} />
        <g clip-path=${`url(#${prefixe}-corps)`}>
          ${formes.map(
            (r) => html`<rect x=${r.px.x} y=${r.px.y} width=${r.px.l} height=${f(r.px.h + 0.4)} fill=${remplir(r.pointId, r.couleur)}
              style=${surChoix ? "cursor:pointer" : ""} onClick=${surChoix ? () => surChoix(r.blocId, r.colonneId) : undefined} />`
          )}
          ${geo.rangees.slice(1).map((r, i) => html`<line x1="0" x2=${W} y1=${f(yPx[i + 1] + hPx[i + 1])} y2=${f(yPx[i + 1] + hPx[i + 1])} stroke=${c.contour} stroke-width="0.8" opacity="0.6" />`)}
          ${formes.filter((r) => r.colonne > 1).map(
            (r) => html`<line x1=${f(r.px.x + r.px.l)} x2=${f(r.px.x + r.px.l)} y1=${r.px.y} y2=${f(r.px.y + r.px.h)} stroke=${nuancesLaine(r.couleur).contour} stroke-width="0.8" opacity="0.7" />`
          )}
        </g>
        <rect x="0" y=${haut} width=${W} height=${H} rx="5" fill="none" stroke=${c.contour} stroke-opacity="0.35" />
        ${contour && html`<rect x=${f(contour.x + 1.5)} y=${f(contour.y + 1.5)} width=${f(contour.l - 3)} height=${f(contour.h - 3)}
          rx="4" fill="none" stroke="var(--accent)" stroke-width="3" pointer-events="none" />`}
        ${geo.revers && yRepli !== null && html`
          <line x1="-5" x2=${W + 5} y1=${f(yRepli)} y2=${f(yRepli)} stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4" pointer-events="none" />
          ${reperes && html`<text x=${W - 4} y=${f(yRepli - 5)} text-anchor="end" font-size="12" font-weight="700" fill="var(--accent)" font-family="var(--corps)"
            paint-order="stroke" stroke="var(--fond)" stroke-width="4">repli du revers</text>`}`}
        <line x1=${W} x2=${W} y1=${haut} y2=${total + 6} stroke="var(--texte-2)" stroke-width="1.5" stroke-dasharray="4 4" />
        ${reperes && html`<text x=${W - 2} y=${total + 20} text-anchor="end" font-size="12" fill="var(--texte-2)" font-family="var(--corps)">début du tour ↑</text>`}
      </g>
    </svg>`;
}
