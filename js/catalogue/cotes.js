// Avis « sur les côtés » (bandes latérales d'une écharpe), séparé de l'avis « en bordure » (haut et bas).
// Liste proposée par Claude et validée par Deborah le 26/10/2026 (0.13.0) : jugement de tricot,
// pas tiré des articles sources. Un point absent de la table reçoit un avis calculé depuis ses propriétés.
import { ok, possible, deconseille } from "./aides.js";

export const AVIS_COTES = {
  mousse: { ...ok, raison: "Plat et réversible, il tient le bord et ne roule pas." },
  riz: { ...ok, raison: "Plat et réversible, il tient le bord et ne roule pas." },
  ble: { ...ok, raison: "Plat et réversible, il tient le bord et ne roule pas." },
  sable: { ...ok, raison: "Plat, il tient le bord et ne roule pas." },
  "cotes-1-1": possible("Le bord tient, mais les côtes le resserrent un peu."),
  "cotes-2-2": possible("Le bord tient, mais les côtes le resserrent un peu."),
};

/** Avis d'un point pour les bandes latérales : { avis, raison }. */
export function avisCotes(point) {
  if (AVIS_COTES[point.id]) return AVIS_COTES[point.id];
  if (point.proprietes?.roule) return deconseille("Il roule : le bord de l'écharpe s'enroulerait.");
  return possible("Il ne roule pas, mais tient moins bien le bord qu'un point mousse ou un point de riz.");
}
