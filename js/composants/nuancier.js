// Nuancier circulaire : on touche ou on fait glisser le doigt sur la roue pour la teinte
// (pâle au centre, vive au bord) ; la réglette assombrit. Utilisable aussi au clavier.
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { hsvVersHex, hexVersHsv, pointVersTeinte, teinteVersPoint, nomCouleur } from "../donnees/couleur.js";

export function Nuancier({ valeur, surChangement }) {
  const roue = useRef(null);
  const [hsv, setHsv] = useState(() => hexVersHsv(valeur) || { h: 15, s: 0.6, v: 0.8 });
  const dernierEmis = useRef(valeur);

  // Si la couleur change ailleurs (pastille de la palette), la roue suit.
  useEffect(() => {
    if (valeur && valeur.toUpperCase() !== (dernierEmis.current || "").toUpperCase()) {
      const c = hexVersHsv(valeur);
      if (c) setHsv(c);
      dernierEmis.current = valeur;
    }
  }, [valeur]);

  const appliquer = (nouveau) => {
    setHsv(nouveau);
    const hex = hsvVersHex(nouveau.h, nouveau.s, nouveau.v);
    dernierEmis.current = hex;
    surChangement(hex);
  };

  const depuisPointeur = (e) => {
    const r = roue.current.getBoundingClientRect();
    const rayon = r.width / 2;
    const { h, s } = pointVersTeinte(e.clientX - r.left - rayon, e.clientY - r.top - rayon, rayon);
    appliquer({ ...hsv, h, s });
  };

  const surAppui = (e) => {
    e.preventDefault();
    roue.current.setPointerCapture?.(e.pointerId);
    depuisPointeur(e);
  };
  const surGlisse = (e) => {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    if (!roue.current.hasPointerCapture?.(e.pointerId)) return;
    depuisPointeur(e);
  };

  const surTouche = (e) => {
    const pas = e.shiftKey ? 15 : 5;
    const actions = {
      ArrowRight: () => ({ ...hsv, h: (hsv.h + pas + 360) % 360 }),
      ArrowLeft: () => ({ ...hsv, h: (hsv.h - pas + 360) % 360 }),
      ArrowUp: () => ({ ...hsv, s: Math.min(1, hsv.s + pas / 100) }),
      ArrowDown: () => ({ ...hsv, s: Math.max(0, hsv.s - pas / 100) }),
    };
    if (actions[e.key]) {
      e.preventDefault();
      appliquer(actions[e.key]());
    }
  };

  const hex = hsvVersHex(hsv.h, hsv.s, hsv.v);
  const vive = hsvVersHex(hsv.h, hsv.s, 1);
  const point = teinteVersPoint(hsv.h, hsv.s, 50); // en % du rayon
  const nom = nomCouleur(hex);

  return html`
    <div class="nuancier">
      <div class="nuancier-roue" ref=${roue} tabindex="0" role="slider"
        aria-label="Nuancier : flèches gauche et droite pour la teinte, haut et bas pour l'intensité"
        aria-valuetext=${`${nom}, ${hex}`} aria-valuenow=${Math.round(hsv.h)} aria-valuemin="0" aria-valuemax="360"
        onPointerDown=${surAppui} onPointerMove=${surGlisse} onKeyDown=${surTouche}>
        <span class="nuancier-repere" aria-hidden="true"
          style=${`left:${50 + point.x}%;top:${50 + point.y}%;background:${hex}`}></span>
      </div>

      <label class="champ nuancier-reglette">
        Luminosité
        <input type="range" min="8" max="100" step="1" value=${Math.round(hsv.v * 100)}
          style=${`--fond-reglette: linear-gradient(to right, #000, ${vive})`}
          onInput=${(e) => appliquer({ ...hsv, v: Number(e.currentTarget.value) / 100 })} />
      </label>

      <div class="nuancier-apercu">
        <span class="pastille" style=${`background:${hex}`} aria-hidden="true"></span>
        <span style="display:flex;flex-direction:column">
          <strong style="font-size:15px">${nom.charAt(0).toUpperCase() + nom.slice(1)}</strong>
          <span class="note">${hex}</span>
        </span>
      </div>
    </div>`;
}
