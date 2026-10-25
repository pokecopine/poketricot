// Étape 1 : la pièce et le nom du projet (maquette 2). Crée le projet, ou le modifie.
import { useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Champ, Fenetre, Encart } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { supprimerProjet } from "../composants/suppression.js";
import { nouveauProjet, cheminEtape, TYPES_DISPONIBLES } from "../donnees/projets.js";

const PIECES = [
  {
    id: "echarpe", nom: "Écharpe",
    dessin: html`<path d="M18 6h12v34H18z"></path><path d="M30 14h10v36H30z"></path><path d="M18 40v8M22 40v8M26 40v8M34 50v4M38 50v4"></path>`,
  },
  {
    id: "snood", nom: "Snood",
    dessin: html`<ellipse cx="28" cy="18" rx="18" ry="6"></ellipse><path d="M10 18v18c0 4 8 8 18 8s18-4 18-8V18"></path><path d="M10 36c0-4 8-6 18-6s18 2 18 6"></path>`,
  },
  {
    id: "bonnet", nom: "Bonnet",
    dessin: html`<path d="M12 38c0-16 7-26 16-26s16 10 16 26"></path><path d="M10 38h36v10H10z"></path><path d="M16 38v10M22 38v10M28 38v10M34 38v10M40 38v10"></path><circle cx="28" cy="9" r="4"></circle>`,
  },
  {
    id: "couverture", nom: "Couverture",
    dessin: html`<rect x="8" y="10" width="40" height="36" rx="3"></rect><path d="M8 18h40M8 38h40M16 10v36M40 10v36"></path>`,
  },
];

function Formulaire({ titre, type, setType, nom, setNom, erreur, actions, enTete }) {
  return html`
    <main class="ecran">
      ${enTete}
      <form class="ecran-contenu" onSubmit=${(e) => { e.preventDefault(); actions.continuer(); }} novalidate>
        <h2 style="font-size:26px">${titre}</h2>
        <div class="grille-pieces" role="group" aria-label="Pièce à tricoter">
          ${PIECES.map((p) => {
            const dispo = TYPES_DISPONIBLES.includes(p.id);
            return html`<button type="button" class="piece" aria-pressed=${String(type === p.id)} disabled=${!dispo}
              onClick=${() => setType(p.id)}>
              ${!dispo && html`<span class="piece-bientot">bientôt</span>`}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.dessin}</svg>
              ${p.nom}
            </button>`;
          })}
        </div>
        <div class="encadre-bientot">
          <strong style="font-size:13px">Bientôt</strong>
          <span>Snood, bonnet et couverture · pull et t-shirt sans couture · gants, mitaines et chaussettes en magic loop · châle</span>
        </div>
        <${Champ} libelle="Nom du projet" valeur=${nom} erreur=${erreur} placeholder="ex. Écharpe d'hiver"
          aide="Tu pourras le changer plus tard." surChangement=${setNom} />
        ${actions.supprimer &&
        html`<button type="button" class="bouton-lien bouton-danger" onClick=${actions.supprimer}>Supprimer ce projet</button>`}
        <button type="submit" class="visuellement-cache" tabindex="-1">Continuer</button>
      </form>
      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${actions.continuer}>Continuer</button>
      </div>
    </main>`;
}

/** Nouveau projet : rien n'est enregistré avant « Continuer ». */
export function NouveauProjet() {
  const { base } = useApp();
  const [type, setType] = useState("echarpe");
  const [nom, setNom] = useState("");

  async function continuer() {
    const projet = await base.ecrire("projets", { ...nouveauProjet({ type, nom }), etape: 2 });
    // Le retour du téléphone depuis le matériel revient sur la pièce de ce projet, pas sur un formulaire vide.
    naviguer(cheminEtape(projet, 1), { remplacer: true });
    naviguer(cheminEtape(projet, 2));
  }

  return html`<${Formulaire} titre="Que veux-tu tricoter ?" type=${type} setType=${setType} nom=${nom} setNom=${setNom}
    enTete=${html`<${EnTeteEtape} titre="Nouveau projet" numero=${1} fermer secours="/" />`}
    actions=${{ continuer }} />`;
}

/** Étape 1 d'un projet déjà créé : changer le nom, ou supprimer le projet. */
export function EtapePiece({ id }) {
  const { base, flash } = useApp();
  const { projet, introuvable, modifier } = useProjet(id);
  const [nom, setNom] = useState(null);
  const [confirmer, setConfirmer] = useState(false);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  const nomAffiche = nom ?? projet.nom;

  async function continuer() {
    const propre = nomAffiche.trim();
    if (propre && propre !== projet.nom) await modifier((p) => ({ ...p, nom: propre, nomAuto: false }));
    naviguer(cheminEtape(projet, 2));
  }
  async function supprimer() {
    await supprimerProjet(base, projet);
    setConfirmer(false);
    flash("Projet supprimé.");
    naviguer("/", { remplacer: true });
  }

  return html`
    <${Formulaire} titre="Que veux-tu tricoter ?" type=${projet.type} setType=${() => {}} nom=${nomAffiche} setNom=${setNom}
      enTete=${html`<${EnTeteEtape} titre=${projet.nom} numero=${1} fermer secours="/" />`}
      actions=${{ continuer, supprimer: () => setConfirmer(true) }} />
    <${Fenetre} ouverte=${confirmer} titre="Supprimer ce projet ?" surFermeture=${() => setConfirmer(false)}
      actions=${html`
        <button type="button" class="bouton-principal" onClick=${supprimer}>Supprimer définitivement</button>
        <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(false)}>Annuler</button>`}>
      <p>« ${projet.nom} » sera supprimé. Ta laine, tes aiguilles et tes échantillons restent dans ta réserve.</p>
      <${Encart}>Cette action ne peut pas être annulée.<//>
    <//>`;
}

export function ProjetIntrouvable() {
  return html`<main class="ecran">
    <${EnTeteEtape} titre="Projet introuvable" numero=${1} fermer secours="/" />
    <div class="ecran-contenu"><p>Ce projet n'existe plus.</p></div>
  </main>`;
}
