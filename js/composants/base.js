// Composants réutilisables de l'ambiance Pelote.
import { useEffect, useRef } from "preact/hooks";
import { html } from "../html.js";
import { IconeRetour, IconeFermer, IconeInfo, IconeAttention } from "./icones.js";
import { retour } from "../routeur.js";

export function BoutonRetour({ libelle = "Retour", secours = "/", fermer = false, surClic }) {
  return html`
    <button type="button" class="bouton-rond" aria-label=${libelle}
      onClick=${() => (surClic ? surClic() : retour(secours))}>
      ${fermer ? IconeFermer() : IconeRetour()}
    </button>`;
}

/** En-tête d'un écran simple : bouton retour + titre. */
export function EnTete({ titre, secours = "/", fermer = false, libelleRetour, children }) {
  return html`
    <header class="ecran-entete">
      <div class="ecran-entete-ligne">
        <${BoutonRetour} secours=${secours} fermer=${fermer}
          libelle=${libelleRetour || (fermer ? "Fermer" : "Retour")} />
        <h1 class="ecran-titre">${titre}</h1>
      </div>
      ${children}
    </header>`;
}

export function Encart({ type = "sauge", alerte = false, children }) {
  return html`
    <div class=${"encart encart-" + type} role=${alerte ? "alert" : undefined}>
      ${type === "brique" ? IconeAttention() : IconeInfo()}
      <span>${children}</span>
    </div>`;
}

export function Pastille({ couleur, taille = 44 }) {
  return html`<span class="pastille" aria-hidden="true"
    style=${`background:${couleur};width:${taille}px;height:${taille}px;border-radius:${taille / 2}px`}></span>`;
}

/** Champ texte avec libellé et message d'erreur. */
export function Champ({ libelle, valeur, surChangement, erreur, aide, type = "text", mode, placeholder, id, autoFocus }) {
  return html`
    <label class=${"champ" + (erreur ? " champ-erreur" : "")}>
      ${libelle}
      <input type=${type} value=${valeur ?? ""} inputmode=${mode} placeholder=${placeholder} id=${id}
        autofocus=${autoFocus}
        aria-invalid=${erreur ? "true" : undefined}
        onInput=${(e) => surChangement(e.currentTarget.value)} />
      ${aide && html`<span class="aide">${aide}</span>`}
      ${erreur && html`<span class="message-erreur">${erreur}</span>`}
    </label>`;
}

export function Liste({ libelle, valeur, options, surChangement, erreur }) {
  return html`
    <label class=${"champ" + (erreur ? " champ-erreur" : "")}>
      ${libelle}
      <select value=${valeur ?? ""} onChange=${(e) => surChangement(e.currentTarget.value)}>
        <option value="" disabled>Choisir…</option>
        ${options.map((o) => html`<option value=${o.valeur}>${o.libelle}</option>`)}
      </select>
      ${erreur && html`<span class="message-erreur">${erreur}</span>`}
    </label>`;
}

/**
 * Onglets segmentés. `role` vaut "tablist" (onglets de navigation)
 * ou "group" (choix d'une valeur, comme le thème).
 */
export function Onglets({ choix, valeur, surChoix, libelle, role = "group" }) {
  const estOnglet = role === "tablist";
  return html`
    <div class="onglets" role=${role} aria-label=${libelle}>
      ${choix.map(
        (c) => html`
          <button type="button" role=${estOnglet ? "tab" : undefined}
            aria-selected=${estOnglet ? String(c.valeur === valeur) : undefined}
            aria-pressed=${estOnglet ? undefined : String(c.valeur === valeur)}
            onClick=${() => surChoix(c.valeur)}>${c.libelle}</button>`
      )}
    </div>`;
}

/** Fenêtre modale (élément <dialog>) : focus et touche Échap gérés par le navigateur. */
export function Fenetre({ ouverte, titre, surFermeture, children, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);
  return html`
    <dialog class="fenetre" ref=${ref} aria-label=${titre}
      onClose=${() => ouverte && surFermeture && surFermeture()}>
      <h2>${titre}</h2>
      <div class="fenetre-corps">${children}</div>
      <div class="fenetre-actions">${actions}</div>
    </dialog>`;
}

export function MessageFlash({ message }) {
  if (!message) return null;
  return html`<div class=${"message-flash" + (message.erreur ? " erreur" : "")} role="status">${message.texte}</div>`;
}
