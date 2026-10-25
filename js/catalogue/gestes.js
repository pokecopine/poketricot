import { GESTES_LOT as GA } from "./lots/lot-a.js";
import { GESTES_LOT as GB } from "./lots/lot-b.js";
import { GESTES_LOT as GC } from "./lots/lot-c.js";
import { GESTES_LOT as GD } from "./lots/lot-d.js";
import { GESTES_LOT as GE } from "./lots/lot-e.js";

// Les gestes du tricot, sous forme codée.
// Chaque geste dit combien de mailles il prend sur l'aiguille gauche (consomme),
// combien il en pose sur l'aiguille droite (produit), et à quoi ressemblent
// ces mailles vues côté endroit (aspect), selon qu'il est fait sur l'endroit ou sur l'envers.
//
// Aspects possibles (pour le dessin) :
//   V          maille endroit           grain      maille envers (petite bosse)
//   Vtorse     maille endroit torse     trou       jeté
//   Vdroite    diminution penchée à droite (2 ensemble)
//   Vgauche    diminution penchée à gauche (surjet simple)
//   Vcentre    diminution double centrée
//   Vdouble    maille double (tirée du rang du dessous)
//   Vlongue    maille glissée           boule      noisette
//   brinG+ / brinG-   brin de torsade penché vers la gauche, dessus (+) ou dessous (-)
//   brinD+ / brinD-   brin de torsade penché vers la droite, dessus (+) ou dessous (-)
//
// Ordre des mailles : dans un rang endroit, on tricote de droite à gauche. La première maille
// produite (indice 0) est donc la plus à droite quand on regarde l'endroit du tricot.

export const GESTES = {
  end: { nom: "maille endroit", pluriel: "mailles endroit", abrege: "end.", consomme: 1, produit: 1, endroit: ["V"], envers: ["grain"], vuDeLAutreCote: "env" },
  env: { nom: "maille envers", pluriel: "mailles envers", abrege: "env.", consomme: 1, produit: 1, endroit: ["grain"], envers: ["V"], vuDeLAutreCote: "end" },
  endT: { nom: "maille endroit torse", pluriel: "mailles endroit torses", abrege: "end. torse", consomme: 1, produit: 1, endroit: ["Vtorse"], envers: ["grain"], vuDeLAutreCote: "envT" },
  envT: { nom: "maille envers torse", pluriel: "mailles envers torses", abrege: "env. torse", consomme: 1, produit: 1, endroit: ["grain"], envers: ["Vtorse"], vuDeLAutreCote: "endT" },
  gl: { nom: "maille glissée fil derrière", pluriel: "mailles glissées fil derrière", abrege: "gl.", consomme: 1, produit: 1, endroit: ["Vlongue"], envers: ["Vlongue"], vuDeLAutreCote: "glAv" },
  glAv: { nom: "maille glissée fil devant", pluriel: "mailles glissées fil devant", abrege: "gl. f. dev.", consomme: 1, produit: 1, endroit: ["Vlongue"], envers: ["Vlongue"], vuDeLAutreCote: "gl" },
  jete: { nom: "jeté", pluriel: "jetés", abrege: "j.", consomme: 0, produit: 1, endroit: ["trou"], envers: ["trou"], vuDeLAutreCote: "jete" },
  "2ens": { nom: "2 mailles ensemble à l'endroit", pluriel: null, abrege: "2 m. ens. end.", consomme: 2, produit: 1, endroit: ["Vdroite"], envers: ["grain"], vuDeLAutreCote: "2ensEnv" },
  "2ensEnv": { nom: "2 mailles ensemble à l'envers", pluriel: null, abrege: "2 m. ens. env.", consomme: 2, produit: 1, endroit: ["grain"], envers: ["Vdroite"], vuDeLAutreCote: "2ens" },
  ssk: { nom: "surjet simple", pluriel: "surjets simples", abrege: "surj. s.", consomme: 2, produit: 1, endroit: ["Vgauche"], envers: ["grain"], vuDeLAutreCote: "ssp" },
  ssp: { nom: "2 mailles ensemble à l'envers par le brin arrière", pluriel: null, abrege: "2 m. ens. env. br. arr.", consomme: 2, produit: 1, endroit: ["grain"], envers: ["Vgauche"], vuDeLAutreCote: "ssk" },
  "3ens": { nom: "3 mailles ensemble à l'endroit", pluriel: null, abrege: "3 m. ens. end.", consomme: 3, produit: 1, endroit: ["boule"], envers: ["grain"], vuDeLAutreCote: "3ensEnv" },
  "3ensEnv": { nom: "3 mailles ensemble à l'envers", pluriel: null, abrege: "3 m. ens. env.", consomme: 3, produit: 1, endroit: ["grain"], envers: ["boule"], vuDeLAutreCote: "3ens" },
  sd: { nom: "surjet double centré", pluriel: "surjets doubles centrés", abrege: "surj. d. c.", consomme: 3, produit: 1, endroit: ["Vcentre"], envers: ["grain"], vuDeLAutreCote: null },
  md: { nom: "maille double endroit", pluriel: "mailles doubles endroit", abrege: "m. d. end.", consomme: 1, produit: 1, endroit: ["Vdouble"], envers: ["grain"], vuDeLAutreCote: "mdEnv" },
  mdEnv: { nom: "maille double envers", pluriel: "mailles doubles envers", abrege: "m. d. env.", consomme: 1, produit: 1, endroit: ["grain"], envers: ["Vdouble"], vuDeLAutreCote: "md" },
  // Augmentations des rangs de transition : la maille est tricotée par le brin avant, puis par le brin arrière.
  aug: { nom: "1 maille tricotée 2 fois à l'endroit", pluriel: null, abrege: "aug. end.", consomme: 1, produit: 2, endroit: ["V", "grain"], envers: ["grain", "V"], vuDeLAutreCote: "augEnv" },
  augEnv: { nom: "1 maille tricotée 2 fois à l'envers", pluriel: null, abrege: "aug. env.", consomme: 1, produit: 2, endroit: ["grain", "V"], envers: ["V", "grain"], vuDeLAutreCote: "aug" },
  "1en3": { nom: "1 maille en 3", pluriel: null, abrege: "1 m. en 3", consomme: 1, produit: 3, endroit: ["V", "grain", "V"], envers: ["grain", "V", "grain"], vuDeLAutreCote: null },
  "T3/3G": { nom: "torsade de 6 mailles croisée à gauche", pluriel: "torsades de 6 mailles croisées à gauche", abrege: "tors. 3/3 g.", consomme: 6, produit: 6,
    // 3 mailles en attente devant : elles passent à gauche, par-dessus.
    endroit: ["brinD-", "brinD-", "brinD-", "brinG+", "brinG+", "brinG+"], envers: null, vuDeLAutreCote: null },
  "T3/3D": { nom: "torsade de 6 mailles croisée à droite", pluriel: "torsades de 6 mailles croisées à droite", abrege: "tors. 3/3 d.", consomme: 6, produit: 6,
    // 3 mailles en attente derrière : les 3 suivantes passent à droite, par-dessus.
    endroit: ["brinD+", "brinD+", "brinD+", "brinG-", "brinG-", "brinG-"], envers: null, vuDeLAutreCote: null },
};

// Gestes apportés par les lots de la deuxième fournée.
for (const lot of [GA, GB, GC, GD, GE]) {
  for (const [code, g] of Object.entries(lot)) {
    if (GESTES[code]) throw new Error(`Geste défini deux fois : ${code}`);
    GESTES[code] = g;
  }
}

export function geste(code) {
  const g = GESTES[code];
  if (!g) throw new Error(`Geste inconnu : ${code}`);
  return g;
}
