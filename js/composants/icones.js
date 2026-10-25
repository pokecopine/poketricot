// Icônes au trait, dessinées en ligne (aucun fichier externe).
import { html } from "../html.js";

const trait = (contenu, { taille = 20, epaisseur = 2, couleur = "currentColor" } = {}) => html`
  <svg width=${taille} height=${taille} viewBox="0 0 24 24" fill="none" stroke=${couleur}
    stroke-width=${epaisseur} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenu}</svg>`;

export const IconeRetour = (o) => trait(html`<path d="M15 18l-6-6 6-6"></path>`, o);
export const IconeFermer = (o) => trait(html`<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path>`, o);
export const IconePlus = (o) => trait(html`<path d="M12 5v14"></path><path d="M5 12h14"></path>`, { epaisseur: 2.5, ...o });
export const IconeReglages = (o) =>
  trait(html`<path d="M4 7h9M17 7h3M4 17h3M11 17h9"></path><circle cx="15" cy="7" r="2"></circle><circle cx="9" cy="17" r="2"></circle>`, o);
export const IconePelote = (o) =>
  trait(html`<circle cx="12" cy="12" r="8"></circle><path d="M6 9c4 1 8 1 12 0M5 14c5 1.5 9 1.5 14 0M9 5c-1 5-1 9 1 14"></path>`, { taille: 18, ...o });
export const IconeInfo = (o) =>
  trait(html`<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>`, { taille: 16, ...o });
export const IconeAttention = (o) =>
  trait(html`<path d="M12 3l10 18H2z"></path><path d="M12 10v4"></path><path d="M12 17h.01"></path>`, { taille: 16, ...o });
export const IconeCoche = (o) => trait(html`<path d="M5 12l5 5 9-10"></path>`, { epaisseur: 2.4, ...o });
export const IconeExporter = (o) =>
  trait(html`<path d="M12 4v11"></path><path d="M7 10l5 5 5-5"></path><path d="M5 19h14"></path>`, { epaisseur: 2.2, ...o });
export const IconeImporter = (o) =>
  trait(html`<path d="M12 15V4"></path><path d="M7 9l5-5 5 5"></path><path d="M5 19h14"></path>`, { epaisseur: 2.2, ...o });
export const IconeCorbeille = (o) =>
  trait(html`<path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M6 7l1 13h10l1-13"></path><path d="M10 11v6M14 11v6"></path>`, o);
/** Cœur des favoris : plein quand le point est en favori. */
export const IconeCoeur = ({ plein = false, taille = 22 } = {}) =>
  html`<svg width=${taille} height=${taille} viewBox="0 0 24 24" fill=${plein ? "currentColor" : "none"} stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20.5l-1.3-1.2C5.8 14.9 3 12.3 3 8.9 3 6.1 5.2 4 7.9 4c1.6 0 3.1.7 4.1 1.9C13 4.7 14.5 4 16.1 4 18.8 4 21 6.1 21 8.9c0 3.4-2.8 6-7.7 10.4L12 20.5z"></path>
  </svg>`;
/** Éprouvette (test de chimie) : remplie quand le point est à tester. */
export const IconeEprouvette = ({ plein = false, taille = 22 } = {}) =>
  html`<svg width=${taille} height=${taille} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${plein && html`<path d="M9 12.5h6v4.7a3 3 0 01-6 0z" fill="currentColor" stroke="none"></path>`}
    <path d="M7.5 3h9"></path><path d="M9 3v14.2a3 3 0 006 0V3"></path><path d="M9 8.5h3"></path>
  </svg>`;
export const IconeChevron = (o) => trait(html`<path d="M9 18l6-6-6-6"></path>`, { taille: 18, ...o });

export const IconeAiguilles = ({ couleur = "var(--accent)" } = {}) => html`
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke=${couleur} stroke-width="2.5"
    stroke-linecap="round" aria-hidden="true" style="flex: none">
    <path d="M8 10l10 10"></path><path d="M36 10L26 20"></path>
    <path d="M18 20c-2 14 10 18 8 0" stroke="var(--texte-2)"></path>
  </svg>`;
