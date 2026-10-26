// Dessin d'une texture de tricot en SVG, maille par maille, à partir de la recette du point.
// La grille vient du simulateur (version en rond = motif qui se répète sans bord),
// donc ce qui est dessiné correspond exactement à ce qui sera tricoté.

import { simuler, convertirEnRond, largeurMotif, consomme } from "../moteur/simulateur.js";
import { nuancesLaine } from "../donnees/couleur.js";

export const LARGEUR_MAILLE = 12;
export const HAUTEUR_RANG = 9;

const f = (n) => Math.round(n * 100) / 100;

function jambes(cx, cy, c, { ecart = 2.6, rx = 2.5, ry = 4.7, angleG = -22, angleD = 22, remplissage = c.maille, dy = 0 } = {}) {
  const y = cy + dy;
  return (
    `<ellipse cx="${f(cx - ecart)}" cy="${f(y)}" rx="${rx}" ry="${ry}" transform="rotate(${angleG} ${f(cx - ecart)} ${f(y)})" fill="${remplissage}" stroke="${c.contour}" stroke-width="0.6"/>` +
    `<ellipse cx="${f(cx + ecart)}" cy="${f(y)}" rx="${rx}" ry="${ry}" transform="rotate(${angleD} ${f(cx + ecart)} ${f(y)})" fill="${remplissage}" stroke="${c.contour}" stroke-width="0.6"/>`
  );
}

/** Dessine une maille selon son aspect, centrée en (cx, cy). */
export function dessinerMaille(aspect, cx, cy, c) {
  switch (aspect) {
    case "V":
      return jambes(cx, cy, c);
    case "Vtorse":
      return jambes(cx, cy, c, { ecart: 1.8, angleG: -12, angleD: 12, rx: 2.3 });
    case "Vdouble":
      return jambes(cx, cy, c, { rx: 3, ry: 5.3, remplissage: c.eclat });
    case "Vlongue":
      return jambes(cx, cy, c, { ry: 7.6, dy: -3.2, angleG: -10, angleD: 10, ecart: 2.2 });
    case "Vdroite":
      return jambes(cx, cy, c, { angleG: 14, angleD: 40, ecart: 1.8 });
    case "Vgauche":
      return jambes(cx, cy, c, { angleG: -40, angleD: -14, ecart: 1.8 });
    case "Vcentre":
      return (
        jambes(cx, cy, c, { angleG: -14, angleD: 14, ry: 5.4, ecart: 2.2 }) +
        `<ellipse cx="${f(cx)}" cy="${f(cy - 0.6)}" rx="1.7" ry="4.8" fill="${c.eclat}" stroke="${c.contour}" stroke-width="0.5"/>`
      );
    case "grain":
      return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="5.2" ry="2.7" fill="${c.grain}" stroke="${c.contour}" stroke-width="0.6"/>`;
    case "trou":
      return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="2.9" ry="3.1" fill="${c.trou}" stroke="${c.contour}" stroke-width="0.8"/>`;
    case "boule":
      return (
        `<ellipse cx="${f(cx)}" cy="${f(cy + 1)}" rx="7.4" ry="6.4" fill="${c.contour}" opacity="0.55"/>` +
        `<circle cx="${f(cx)}" cy="${f(cy)}" r="6.2" fill="${c.eclat}" stroke="${c.contour}" stroke-width="0.9"/>` +
        `<circle cx="${f(cx - 1.8)}" cy="${f(cy - 2)}" r="2.2" fill="#FFFFFF" opacity="0.35"/>`
      );
    // Brins de torsade : longs et penchés ; ceux du dessus sont dessinés en dernier, plus clairs.
    case "brinG+":
      return jambes(cx, cy, c, { angleG: -48, angleD: -30, ecart: 2.4, rx: 3, ry: 7.2, remplissage: c.eclat });
    case "brinD+":
      return jambes(cx, cy, c, { angleG: 30, angleD: 48, ecart: 2.4, rx: 3, ry: 7.2, remplissage: c.eclat });
    case "brinG-":
      return jambes(cx, cy, c, { angleG: -48, angleD: -30, ecart: 2.4, rx: 2.6, ry: 6.4, remplissage: c.grain });
    case "brinD-":
      return jambes(cx, cy, c, { angleG: 30, angleD: 48, ecart: 2.4, rx: 2.6, ry: 6.4, remplissage: c.grain });
    default:
      return jambes(cx, cy, c);
  }
}

/** L'aspect d'une maille vue de l'envers du tricot. */
export function aspectVuDeLEnvers(aspect) {
  if (aspect === "grain") return "V";
  if (aspect === "trou") return "trou";
  return "grain";
}

/**
 * Grille d'une répétition du motif, vue de l'endroit (ou de l'envers).
 * grille[0] = rang du bas ; dans un rang, l'indice 0 est la maille la plus à droite.
 */
export function grilleMotif(point, { face = "endroit" } = {}) {
  const grille = grilleEndroit(point);
  if (!grille) return null;
  if (face === "endroit") return grille;
  // Vu de l'envers : chaque maille change d'aspect, et la droite devient la gauche.
  return grille.map((rang) => [...rang].reverse().map(aspectVuDeLEnvers));
}

/**
 * Un rang ramené à w mailles pour le dessin : quand le point change de nombre de mailles en cours de motif,
 * les rangs plus courts (ou plus longs) sont étirés pour garder une grille rectangulaire.
 */
const ajuster = (rang, w) => (rang.length === w ? rang : Array.from({ length: w }, (_, i) => rang[Math.floor((i * rang.length) / w)]));

/** Une répétition du motif vue de l'endroit : en rond si le point s'y prête, sinon découpée au milieu d'un tricot à plat. */
function grilleEndroit(point) {
  const largeur = largeurMotif(point);
  const rond = convertirEnRond(point);
  if (rond.ok) {
    const sim = simuler({ ...point, rond: { mode: "manuel", rangs: rond.rangs } }, { mailles: largeur, rangs: rond.rangs.length, mode: "rond" });
    if (sim.ok) return sim.grille.map((r) => ajuster(r, largeur));
  }
  // À plat : 3 répétitions, on garde celle du milieu (loin des mailles du début et de la fin).
  const r0 = point.rangs[0];
  const extras = consomme(r0.debut) + consomme(r0.fin);
  const premier = point.rangs.find((r) => r.cote === "E");
  const d0 = premier ? consomme(premier.debut) : 0;
  const total = extras + 3 * largeur;
  const sim = simuler({ ...point, miseEnPlace: [] }, { mailles: total, rangs: point.rangs.length });
  if (!sim.ok) return null;
  return sim.grille.map((rang) => ajuster(rang, total).slice(d0 + largeur, d0 + 2 * largeur));
}

/**
 * SVG d'une tuile (une répétition du motif), à répéter pour couvrir n'importe quelle surface.
 * Renvoie { svg, largeur, hauteur } (en pixels de dessin) ou null.
 */
export function tuileSVG(point, couleur, { face = "endroit" } = {}) {
  const grille = grilleMotif(point, { face });
  if (!grille) return null;
  const c = nuancesLaine(couleur);
  const nbRangs = grille.length;
  const nbMailles = grille[0].length;
  const L = nbMailles * LARGEUR_MAILLE;
  const H = nbRangs * HAUTEUR_RANG;
  let formes = "";
  let dessus = "";
  // On dessine aussi une rangée et une colonne de chaque côté (en boucle), pour que les mailles
  // coupées au bord de la tuile se raccordent parfaitement quand la tuile est répétée.
  for (let r = -1; r <= nbRangs; r++) {
    const rang = grille[((r % nbRangs) + nbRangs) % nbRangs];
    const cy = H - (r + 0.5) * HAUTEUR_RANG;
    for (let col = -1; col <= nbMailles; col++) {
      const aspect = rang[((col % nbMailles) + nbMailles) % nbMailles];
      // Indice 0 = maille de droite : on dessine de droite à gauche.
      const cx = L - (col + 0.5) * LARGEUR_MAILLE;
      // Ce qui passe par-dessus (brins de torsade, boules) est dessiné après tout le reste.
      if (aspect.endsWith("+") || aspect === "boule") dessus += dessinerMaille(aspect, cx, cy, c);
      else formes += dessinerMaille(aspect, cx, cy, c);
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">` +
    `<rect width="${L}" height="${H}" fill="${c.fond}"/>${formes}${dessus}</svg>`;
  return { svg, largeur: L, hauteur: H };
}

/** Style CSS pour remplir un élément avec la texture (image de fond répétée). */
export function styleTexture(point, couleur, { face = "endroit", echelle = 1 } = {}) {
  const t = tuileSVG(point, couleur, { face });
  if (!t) return `background:${nuancesLaine(couleur).maille}`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.svg)}`;
  return (
    `background-color:${nuancesLaine(couleur).fond};background-image:url('${url}');` +
    `background-size:${f(t.largeur * echelle)}px ${f(t.hauteur * echelle)}px;background-repeat:repeat;background-position:center bottom`
  );
}
