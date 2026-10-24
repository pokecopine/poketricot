import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { EnTete, Onglets, Pastille } from "../composants/base.js";
import { IconePlus, IconeAiguilles } from "../composants/icones.js";
import {
  trierLaines, trierAiguilles, metrageLaine, texteMetrage, detailLaine, detailAiguilles, titreAiguilles,
} from "../donnees/reserve.js";

const ONGLETS = ["laines", "aiguilles", "echantillons"];

export function Reserve({ onglet = "laines" }) {
  const { base } = useApp();
  const [laines, setLaines] = useState(null);
  const [aiguilles, setAiguilles] = useState(null);
  const [voirArchives, setVoirArchives] = useState(false);
  const actif = ONGLETS.includes(onglet) ? onglet : "laines";

  useEffect(() => {
    base.lister("laines").then((l) => setLaines(trierLaines(l)));
    base.lister("aiguilles").then((a) => setAiguilles(trierAiguilles(a)));
  }, [base]);

  const compte = (liste) => (liste ? liste.filter((e) => !e.archivee).length : "…");
  const choix = [
    { valeur: "laines", libelle: `Laines · ${compte(laines)}` },
    { valeur: "aiguilles", libelle: `Aiguilles · ${compte(aiguilles)}` },
    { valeur: "echantillons", libelle: "Échantillons · 0" },
  ];

  const liste = actif === "laines" ? laines : actif === "aiguilles" ? aiguilles : [];
  const archivees = (liste || []).filter((e) => e.archivee).length;
  const visibles = (liste || []).filter((e) => voirArchives || !e.archivee);

  return html`
    <main class="ecran">
      <${EnTete} titre="Ma réserve" secours="/" libelleRetour="Retour à l'accueil">
        <${Onglets} role="tablist" libelle="Contenu de la réserve" choix=${choix} valeur=${actif}
          surChoix=${(v) => naviguer("/reserve/" + v, { remplacer: true })} />
      <//>

      <div class="ecran-contenu" role="tabpanel">
        ${actif === "laines" && laines && html`<${ListeLaines} laines=${visibles} />`}
        ${actif === "aiguilles" && aiguilles && html`<${ListeAiguilles} aiguilles=${visibles} />`}
        ${actif === "echantillons" &&
        html`<div class="vide">
          <strong>Bientôt</strong>
          <span>Tes échantillons seront rangés ici, avec leur laine, leur point et leur taille d'aiguille. Quand un projet reprendra la même combinaison, l'échantillon sera retrouvé tout seul.</span>
        </div>`}

        ${actif !== "echantillons" && archivees > 0 &&
        html`<button type="button" class="bouton-lien" onClick=${() => setVoirArchives(!voirArchives)}>
          ${voirArchives ? "Masquer" : "Voir"} ${archivees > 1 ? `les ${archivees} archivées` : "l'élément archivé"}
        </button>`}

        ${actif === "laines" &&
        html`<p class="note">Une laine utilisée dans un projet sera « réservée » ; la quantité utilisée sera retirée quand le projet sera terminé.</p>`}
        ${actif === "aiguilles" &&
        html`<p class="note">Plus tard, l'outil ne proposera que les aiguilles qui conviennent : un câble assez long pour la pièce, ou pour le magic loop si la pièce est petite.</p>`}
      </div>

      ${actif !== "echantillons" &&
      html`<div class="ecran-pied">
        <button type="button" class="bouton-principal"
          onClick=${() => naviguer(actif === "laines" ? "/reserve/laine/nouvelle" : "/reserve/aiguilles/nouvelles")}>
          ${IconePlus()} ${actif === "laines" ? "Ajouter une laine" : "Ajouter des aiguilles"}
        </button>
      </div>`}
    </main>`;
}

function ListeLaines({ laines }) {
  if (laines.length === 0) {
    return html`<div class="vide"><strong>Aucune laine</strong><span>Ajoute ta première laine avec le bouton en bas.</span></div>`;
  }
  return laines.map((l) => {
    const m = metrageLaine(l);
    return html`
      <button type="button" class=${"ligne-element" + (l.archivee ? " archive" : "")}
        onClick=${() => naviguer("/reserve/laine/" + encodeURIComponent(l.id))}>
        <${Pastille} couleur=${l.couleur} />
        <span class="ligne-element-texte">
          <span class="ligne-element-nom">${l.nom}</span>
          <span class="ligne-element-detail">${detailLaine(l)}</span>
        </span>
        <span class="ligne-element-valeur">
          <span class="ligne-element-chiffre">${texteMetrage(l)}</span>
          <span class="ligne-element-etat">${l.archivee ? "archivée" : m?.estime ? "estimé" : "libre"}</span>
        </span>
      </button>`;
  });
}

function ListeAiguilles({ aiguilles }) {
  if (aiguilles.length === 0) {
    return html`<div class="vide"><strong>Aucune aiguille</strong><span>Ajoute tes aiguilles circulaires avec le bouton en bas.</span></div>`;
  }
  return aiguilles.map(
    (a) => html`
      <button type="button" class=${"ligne-element" + (a.archivee ? " archive" : "")}
        onClick=${() => naviguer("/reserve/aiguilles/" + encodeURIComponent(a.id))}>
        <${IconeAiguilles} couleur=${a.archivee ? "var(--texte-2)" : "var(--sauge)"} />
        <span class="ligne-element-texte">
          <span class="ligne-element-nom">${titreAiguilles(a)}</span>
          <span class="ligne-element-detail">${detailAiguilles(a)}</span>
        </span>
        ${a.archivee && html`<span class="ligne-element-etat">archivées</span>`}
      </button>`
  );
}
