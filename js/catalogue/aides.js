// Petites aides pour écrire les recettes des points (partagées par tous les lots du catalogue).

export const TRICONAUTES = "https://www.lestriconautes.com/";

/** Rang tricoté sur l'endroit / sur l'envers : début (une fois), motif (répété), fin (une fois). */
export const E = (motif, { debut = [], fin = [] } = {}) => ({ cote: "E", debut, motif, fin });
export const V = (motif, { debut = [], fin = [] } = {}) => ({ cote: "V", debut, motif, fin });
/** fois("end", 3) → ["end", "end", "end"] */
export const fois = (code, n) => Array(n).fill(code);
/** Répète une suite de gestes : repeter(["end", "env"], 2) → ["end", "env", "end", "env"] */
export const repeter = (suite, n) => Array.from({ length: n }, () => suite).flat();

export const ok = { avis: "conseille" };
export const possible = (raison) => ({ avis: "possible", raison });
export const deconseille = (raison) => ({ avis: "deconseille", raison });
