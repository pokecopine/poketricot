// Bande de texture : un rectangle rempli avec le dessin du point, dans la couleur de la laine.
import { useMemo } from "preact/hooks";
import { html } from "../html.js";
import { styleTexture } from "../rendu/texture.js";

export function BandeTexture({ point, couleur, hauteur = 64, face = "endroit", echelle = 1, rayon = 0, style = "" }) {
  const fond = useMemo(() => styleTexture(point, couleur, { face, echelle }), [point.id, couleur, face, echelle]);
  return html`<div role="img" aria-label=${`Texture du ${point.nom.toLowerCase()}${face === "envers" ? ", vue de l'envers" : ""}`}
    style=${`${fond};height:${hauteur}px;border-radius:${rayon}px;width:100%;${style}`}></div>`;
}
