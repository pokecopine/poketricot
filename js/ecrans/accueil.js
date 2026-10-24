import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart } from "../composants/base.js";
import { IconePelote, IconeReglages, IconePlus } from "../composants/icones.js";
import { rappelSauvegardeNecessaire } from "../donnees/sauvegarde.js";

function salutation(maintenant = new Date()) {
  const h = maintenant.getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

export function Accueil() {
  const { base, prefs } = useApp();
  const [compte, setCompte] = useState(null);

  useEffect(() => {
    Promise.all([base.lister("laines"), base.lister("aiguilles")]).then(([l, a]) =>
      setCompte({ laines: l.length, aiguilles: a.length })
    );
  }, [base]);

  const aDesDonnees = compte && compte.laines + compte.aiguilles > 0;
  const rappel = rappelSauvegardeNecessaire(prefs.derniereSauvegarde, aDesDonnees);

  return html`
    <main class="ecran">
      <header class="accueil-entete">
        <div class="accueil-ligne">
          <p class="accueil-salut">${salutation()}</p>
          <button type="button" class="bouton-rond" aria-label="Réglages et sauvegarde"
            onClick=${() => naviguer("/reglages")}>${IconeReglages()}</button>
        </div>
        <div class="accueil-ligne">
          <h1 class="accueil-titre">Mes tricots</h1>
          <button type="button" class="bouton-pilule" onClick=${() => naviguer("/reserve/laines")}>
            ${IconePelote()} Ma réserve
          </button>
        </div>
      </header>

      <div class="ecran-contenu">
        ${rappel &&
        html`<${Encart} type="brique">
          ${prefs.derniereSauvegarde ? "Ta dernière sauvegarde date de plus d'un mois." : "Tu n'as encore jamais sauvegardé tes données."}
          ${" "}<a href="#/reglages">Faire une sauvegarde</a>
        <//>`}

        <h2 style="font-size:18px">En cours</h2>
        <div class="vide">
          <strong>Aucun projet pour l'instant</strong>
          <span>La création de projets arrive bientôt. En attendant, tu peux déjà ranger tes laines et tes aiguilles dans ta réserve.</span>
          <button type="button" class="bouton-pilule" onClick=${() => naviguer("/reserve/laines")}>
            ${IconePelote()} Ouvrir ma réserve
          </button>
        </div>

        <div class="section-titre"><h2>Ma bibliothèque</h2></div>
        <p class="note">Tes projets terminés apparaîtront ici.</p>

        ${compte &&
        html`<p class="note">
          Dans ta réserve : ${compte.laines} laine${compte.laines > 1 ? "s" : ""} et
          ${" "}${compte.aiguilles} paire${compte.aiguilles > 1 ? "s" : ""} d'aiguilles.
        </p>`}
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal sombre" disabled aria-describedby="nouveau-bientot">
          ${IconePlus()} Nouveau projet <span class="bientot" id="nouveau-bientot">bientôt</span>
        </button>
      </div>
    </main>`;
}
