import { TECHNIQUES_LOT as TA } from "./lots/lot-a.js";
import { TECHNIQUES_LOT as TB } from "./lots/lot-b.js";
import { TECHNIQUES_LOT as TC } from "./lots/lot-c.js";
import { TECHNIQUES_LOT as TD } from "./lots/lot-d.js";
import { TECHNIQUES_LOT as TE } from "./lots/lot-e.js";
import { TECHNIQUES_LOT as TF } from "./lots/lot-f.js";
import { TECHNIQUES_LOT as TG } from "./lots/lot-g.js";

// Explications des gestes, rédigées pour l'outil, pour la méthode continentale
// (le fil est tenu dans la main gauche). Une explication courte, au moment où le geste apparaît.

export const TECHNIQUES = {
  end: {
    titre: "Maille endroit",
    explication:
      "Fil derrière le travail. Pique l'aiguille droite dans la maille de gauche, de gauche à droite et d'avant en arrière, attrape le fil avec la pointe, ramène la boucle vers toi et laisse glisser l'ancienne maille.",
  },
  env: {
    titre: "Maille envers",
    explication:
      "Fil devant le travail. Pique l'aiguille droite dans la maille de gauche, de droite à gauche, par l'avant. Avec l'index gauche, passe le fil autour de la pointe, d'avant en arrière, puis fais ressortir la boucle vers l'arrière et laisse glisser l'ancienne maille.",
  },
  jete: {
    titre: "Jeté",
    explication:
      "Fais passer le fil par-dessus l'aiguille droite, d'avant en arrière, sans tricoter de maille. Au rang suivant, cette boucle se tricote comme une maille : elle laisse un petit trou.",
  },
  "2ens": {
    titre: "2 mailles ensemble à l'endroit",
    explication:
      "Pique dans les deux premières mailles de l'aiguille gauche en même temps, comme pour une maille endroit, et tricote-les ensemble. Il te reste une seule maille, penchée vers la droite.",
  },
  "2ensEnv": {
    titre: "2 mailles ensemble à l'envers",
    explication: "Fil devant, pique dans les deux premières mailles à la fois, comme pour une maille envers, et tricote-les ensemble à l'envers.",
  },
  ssk: {
    titre: "Surjet simple",
    explication:
      "Glisse une maille comme pour la tricoter à l'endroit, puis une deuxième de la même façon. Pique l'aiguille gauche dans ces deux mailles, par l'avant, et tricote-les ensemble à l'endroit. La diminution penche vers la gauche.",
  },
  ssp: {
    titre: "2 mailles ensemble à l'envers par le brin arrière",
    explication: "Glisse deux mailles une à une comme à l'endroit, remets-les sur l'aiguille gauche, puis tricote-les ensemble à l'envers en piquant par le brin arrière.",
  },
  sd: {
    titre: "Surjet double centré",
    explication:
      "Glisse deux mailles ensemble comme pour les tricoter à l'endroit, tricote la maille suivante à l'endroit, puis passe les deux mailles glissées par-dessus. Trois mailles n'en font plus qu'une, bien droite au centre.",
  },
  "3ens": {
    titre: "3 mailles ensemble à l'endroit",
    explication: "Pique dans les trois premières mailles à la fois, comme pour une maille endroit, et tricote-les ensemble : elles forment une petite boule.",
  },
  md: {
    titre: "Maille double",
    explication:
      "Au lieu de piquer dans la maille de l'aiguille gauche, pique dans la maille juste en dessous (celle du rang précédent), tricote-la à l'endroit et laisse glisser les deux ensemble. C'est ce qui donne du gonflant.",
  },
  mdEnv: {
    titre: "Maille double envers",
    explication: "Fil devant, pique dans la maille juste en dessous de celle de l'aiguille gauche, tricote-la à l'envers et laisse glisser les deux ensemble.",
  },
  "1en3": {
    titre: "1 maille en 3",
    explication:
      "Dans la même maille, sans la laisser glisser : tricote 1 maille endroit, ramène le fil devant et tricote 1 maille envers, ramène le fil derrière et tricote encore 1 maille endroit. Laisse ensuite glisser la maille : tu en as fait trois.",
  },
  "T3/3G": {
    titre: "Torsade croisée à gauche",
    explication:
      "Glisse 3 mailles sur une aiguille auxiliaire et laisse-la devant le travail. Tricote les 3 mailles suivantes à l'endroit, puis les 3 mailles de l'aiguille auxiliaire à l'endroit. Les mailles se croisent vers la gauche.",
  },
  "T3/3D": {
    titre: "Torsade croisée à droite",
    explication:
      "Glisse 3 mailles sur une aiguille auxiliaire et laisse-la derrière le travail. Tricote les 3 mailles suivantes à l'endroit, puis les 3 de l'aiguille auxiliaire à l'endroit. Les mailles se croisent vers la droite.",
  },
  gl: { titre: "Maille glissée fil derrière", explication: "Fil derrière, fais passer la maille de l'aiguille gauche sur l'aiguille droite sans la tricoter, en piquant comme pour une maille envers." },
  glAv: { titre: "Maille glissée fil devant", explication: "Fil devant, fais passer la maille sur l'aiguille droite sans la tricoter, en piquant comme pour une maille envers, puis remets le fil où il était." },
  endT: { titre: "Maille endroit torse", explication: "Tricote la maille à l'endroit en piquant dans le brin arrière : elle se vrille et devient plus nette." },
  envT: { titre: "Maille envers torse", explication: "Tricote la maille à l'envers en piquant dans le brin arrière." },
  aug: {
    titre: "1 maille tricotée 2 fois à l'endroit",
    explication:
      "Tricote la maille à l'endroit sans la laisser glisser de l'aiguille gauche, puis pique dans son brin arrière et tricote-la une deuxième fois à l'endroit. Laisse-la glisser : tu as 2 mailles au lieu d'une.",
  },
  augEnv: {
    titre: "1 maille tricotée 2 fois à l'envers",
    explication:
      "Tricote la maille à l'envers sans la laisser glisser de l'aiguille gauche, puis tricote-la une deuxième fois à l'envers en piquant dans son brin arrière. Laisse-la glisser : tu as 2 mailles au lieu d'une.",
  },
};

Object.assign(TECHNIQUES, TA, TB, TC, TD, TE, TF, TG);

/** Gestes utilisés par un point (dans l'ordre d'apparition), hors endroit et envers de base. */
export function techniquesDuPoint(point, { inclureBases = false } = {}) {
  const vus = new Set();
  for (const r of [...(point.miseEnPlace || []), ...point.rangs]) {
    for (const code of [...(r.debut || []), ...r.motif, ...(r.fin || [])]) vus.add(code);
  }
  return [...vus].filter((c) => inclureBases || (c !== "end" && c !== "env"));
}
