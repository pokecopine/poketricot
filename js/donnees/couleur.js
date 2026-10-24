// Calculs de couleur pour le nuancier : teinte (angle), saturation (distance au centre),
// luminosité (réglette). Fonctions pures, testées sans navigateur.

const borner = (x, min, max) => Math.min(max, Math.max(min, x));

/** h en degrés (0–360), s et v entre 0 et 1 → "#RRGGBB" */
export function hsvVersHex(h, s, v) {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  const hex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** "#RRGGBB" → { h, s, v } ; null si le code est invalide. */
export function hexVersHsv(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}

/**
 * Point touché sur la roue → teinte et saturation.
 * dx, dy : écart au centre (dy vers le bas, comme à l'écran) ; rayon de la roue.
 * Le rouge est en haut, puis jaune, vert, cyan, bleu, magenta dans le sens des aiguilles d'une montre.
 */
export function pointVersTeinte(dx, dy, rayon) {
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { h: (angle + 360) % 360, s: borner(Math.hypot(dx, dy) / rayon, 0, 1) };
}

/** Teinte et saturation → position sur la roue (inverse de pointVersTeinte). */
export function teinteVersPoint(h, s, rayon) {
  const a = (h * Math.PI) / 180;
  return { x: Math.sin(a) * s * rayon, y: -Math.cos(a) * s * rayon };
}

/** Nom approximatif d'une couleur, pour la décrire en toutes lettres. */
export function nomCouleur(hex) {
  const c = hexVersHsv(hex);
  if (!c) return "";
  const { h, s, v } = c;
  if (v < 0.15) return "noir";
  if (s >= 0.05 && s < 0.3 && v > 0.8 && h >= 20 && h < 70) return "écru";
  if (s < 0.12) return v > 0.9 ? "blanc" : v > 0.75 ? "gris clair" : v > 0.4 ? "gris" : "gris foncé";
  let base;
  if (h < 15 || h >= 345) base = "rouge";
  else if (h < 40) base = v < 0.6 ? "brun" : "orange";
  else if (h < 65) base = v < 0.7 ? "moutarde" : "jaune";
  else if (h < 160) base = "vert";
  else if (h < 200) base = "turquoise";
  else if (h < 255) base = "bleu";
  else if (h < 290) base = "violet";
  else base = "rose";
  if (v < (base === "brun" ? 0.35 : 0.6)) return `${base} foncé`;
  if (s < 0.4 && v > 0.75) return `${base} pastel`;
  return base;
}
