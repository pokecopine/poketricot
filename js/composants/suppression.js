// Supprimer un projet, avec confirmation : le projet, son patron et son suivi des rangs.
// La laine, les aiguilles et les échantillons restent dans la réserve.
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { Fenetre, Encart } from "./base.js";

/** Supprime un projet et tout ce qui en dépend. */
export async function supprimerProjet(base, projet) {
  if (projet.patronId) {
    await base.supprimer("suivis", projet.patronId);
    await base.supprimer("patrons", projet.patronId);
  }
  await base.supprimer("projets", projet.id);
}

/** Ce que la suppression fait perdre, en une phrase. */
function textePerte(projet, suivi) {
  if (projet.statut === "termine") return "Le patron de cette écharpe terminée sera supprimé de ta bibliothèque.";
  if (projet.statut === "patron") {
    const faits = suivi?.rangsFaits || 0;
    return faits > 0
      ? `Le patron et ton suivi des rangs (${faits} rang${faits > 1 ? "s" : ""} coché${faits > 1 ? "s" : ""}) seront supprimés.`
      : "Le patron sera supprimé.";
  }
  return "Tout ce que tu as choisi pour ce projet sera supprimé.";
}

/**
 * Fenêtre de confirmation. projet = null : fermée.
 * surSuppression() est appelé une fois le projet supprimé.
 */
export function ConfirmerSuppression({ projet, suivi = null, surFermeture, surSuppression }) {
  const { base, flash } = useApp();
  async function supprimer() {
    try {
      await supprimerProjet(base, projet);
      flash("Projet supprimé.");
      surSuppression?.();
    } catch (e) {
      console.error(e);
      flash("Le projet n'a pas pu être supprimé. Réessaie.", true);
    }
  }
  return html`<${Fenetre} ouverte=${!!projet} titre="Supprimer ce projet ?" surFermeture=${surFermeture}
    actions=${html`
      <button type="button" class="bouton-principal" onClick=${supprimer}>Supprimer définitivement</button>
      <button type="button" class="bouton-secondaire" onClick=${surFermeture}>Annuler</button>`}>
    ${projet && html`
      <p>« ${projet.nom} » : ${textePerte(projet, suivi).charAt(0).toLowerCase() + textePerte(projet, suivi).slice(1)}</p>
      <p>Ta laine, tes aiguilles et tes échantillons restent dans ta réserve.</p>
      <${Encart}>Cette action ne peut pas être annulée.<//>`}
  <//>`;
}
