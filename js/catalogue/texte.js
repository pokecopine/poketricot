// Transforme les gestes codés en phrases françaises lisibles.
import { geste } from "./gestes.js";
import { consomme } from "../moteur/simulateur.js";

/** Regroupe les gestes identiques qui se suivent : ["end","end","env"] → [[end,2],[env,1]]. */
export function regrouper(gestes) {
  const groupes = [];
  for (const code of gestes) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier[0] === code) dernier[1]++;
    else groupes.push([code, 1]);
  }
  return groupes;
}

function texteGroupe([code, nombre], { abreviations = false } = {}) {
  const g = geste(code);
  if (abreviations) {
    if (code === "end" || code === "env") return `${nombre} m. ${g.abrege}`;
    return nombre === 1 ? g.abrege : `${nombre} × ${g.abrege}`;
  }
  // « 1 maille endroit », « 3 mailles envers », « 1 jeté », « 2 mailles ensemble à l'endroit »…
  if (g.nom.startsWith("maille")) return `${nombre} ${nombre > 1 ? g.pluriel : g.nom}`;
  if (/^\d/.test(g.nom)) return nombre === 1 ? g.nom : `${nombre} fois « ${g.nom} »`;
  if (nombre === 1) return `1 ${g.nom}`;
  return `${nombre} ${g.pluriel || g.nom}`;
}

export function texteGestes(gestes, options) {
  return regrouper(gestes).map((gr) => texteGroupe(gr, options)).join(", ");
}

/**
 * Phrase complète pour un rang.
 * { tour: true } pour un tour en rond (« tout le tour » au lieu de « tout le rang »).
 */
export function texteRang(rang, { tour = false, abreviations = false } = {}) {
  const options = { abreviations };
  const mot = tour ? "tour" : "rang";
  const debut = rang.debut || [];
  const fin = rang.fin || [];
  const groupesMotif = regrouper(rang.motif);

  // Tout le rang avec le même geste : « Tout le rang en mailles envers. »
  const uniforme = groupesMotif.length === 1 && [...debut, ...fin].every((c) => c === rang.motif[0]);
  if (uniforme) {
    const g = geste(rang.motif[0]);
    const nom = g.pluriel || g.nom;
    return abreviations ? `Tout le ${mot} : ${g.abrege}` : `Tout le ${mot} en ${nom}.`;
  }

  const morceaux = [];
  if (debut.length) morceaux.push(texteGestes(debut, options));
  const repete = texteGestes(rang.motif, options);
  let jusqua;
  const nFin = consomme(fin);
  if (nFin === 0) jusqua = `jusqu'à la fin du ${mot}`;
  else if (nFin === 1) jusqua = "jusqu'à la dernière maille";
  else jusqua = `jusqu'aux ${nFin} dernières mailles`;
  morceaux.push(`*${repete}*, à répéter ${jusqua}`);
  if (fin.length) morceaux.push(texteGestes(fin, options));
  const phrase = morceaux.join(", puis ");
  const point = phrase.endsWith(".") ? "" : ".";
  return phrase.charAt(0).toUpperCase() + phrase.slice(1) + point;
}

export function texteCote(cote) {
  return cote === "E" ? "endroit" : "envers";
}
