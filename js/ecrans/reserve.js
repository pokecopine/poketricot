import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { EnTete, Onglets, Pastille } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { pointParId } from "../catalogue/points.js";
import {
  trierEchantillons, filtrerParLaine, lainesAvecEchantillons, detailEchantillon, mentionsEchantillon, texteDensite,
} from "../donnees/echantillons.js";
import { IconePlus, IconeAiguilles } from "../composants/icones.js";
import {
  trierLaines, trierAiguilles, metrageLaine, texteMetrage, detailLaine, detailAiguilles, titreAiguilles,
} from "../donnees/reserve.js";

const ONGLETS = ["laines", "aiguilles", "echantillons"];

export function Reserve({ onglet = "laines" }) {
  const { base } = useApp();
  const [laines, setLaines] = useState(null);
  const [aiguilles, setAiguilles] = useState(null);
  const [echantillons, setEchantillons] = useState(null);
  const [filtreLaine, setFiltreLaine] = useState("");
  const [voirArchives, setVoirArchives] = useState(false);
  const actif = ONGLETS.includes(onglet) ? onglet : "laines";

  useEffect(() => {
    base.lister("laines").then((l) => setLaines(trierLaines(l)));
    base.lister("aiguilles").then((a) => setAiguilles(trierAiguilles(a)));
    base.lister("echantillons").then((e) => setEchantillons(trierEchantillons(e)));
  }, [base]);

  const compte = (liste) => (liste ? liste.filter((e) => !e.archivee).length : "…");
  const choix = [
    { valeur: "laines", libelle: `Laines · ${compte(laines)}` },
    { valeur: "aiguilles", libelle: `Aiguilles · ${compte(aiguilles)}` },
    { valeur: "echantillons", libelle: `Échantillons · ${echantillons ? echantillons.length : "…"}` },
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
        ${actif === "echantillons" && echantillons && laines &&
        html`<${ListeEchantillons} echantillons=${echantillons} laines=${laines}
          filtre=${filtreLaine} surFiltre=${setFiltreLaine} />`}

        ${actif !== "echantillons" && archivees > 0 &&
        html`<button type="button" class="bouton-lien" onClick=${() => setVoirArchives(!voirArchives)}>
          ${voirArchives ? "Masquer" : "Voir"} ${archivees > 1 ? `les ${archivees} archivées` : "l'élément archivé"}
        </button>`}

        ${actif === "laines" &&
        html`<p class="note">Une laine utilisée dans un projet sera « réservée » ; la quantité utilisée sera retirée quand le projet sera terminé.</p>`}
        ${actif === "aiguilles" &&
        html`<p class="note">Plus tard, l'outil ne proposera que les aiguilles qui conviennent : un câble assez long pour la pièce, ou pour le magic loop si la pièce est petite.</p>`}
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal"
          onClick=${() => naviguer(
            actif === "laines" ? "/reserve/laine/nouvelle"
              : actif === "aiguilles" ? "/reserve/aiguilles/nouvelles"
              : "/reserve/echantillon/nouveau" + (filtreLaine ? "?laine=" + encodeURIComponent(filtreLaine) : "")
          )}>
          ${IconePlus()} ${actif === "laines" ? "Ajouter une laine" : actif === "aiguilles" ? "Ajouter des aiguilles" : "Ajouter un échantillon"}
        </button>
      </div>
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

function ListeEchantillons({ echantillons, laines, filtre, surFiltre }) {
  const laineDe = (id) => laines.find((l) => l.id === id);
  const presentes = lainesAvecEchantillons(laines, echantillons);
  const filtreValide = presentes.some((l) => l.id === filtre) ? filtre : "";
  const visibles = filtrerParLaine(echantillons, filtreValide);
  return html`
    ${presentes.length > 1 &&
    html`<div class="filtres" role="group" aria-label="Filtrer par laine">
      <button type="button" class="filtre" aria-pressed=${String(!filtreValide)} onClick=${() => surFiltre("")}>Toutes les laines</button>
      ${presentes.map(
        (l) => html`<button type="button" class="filtre" aria-pressed=${String(filtreValide === l.id)} onClick=${() => surFiltre(l.id)}>
          <span class="filtre-pastille" style=${`background:${l.couleur}`} aria-hidden="true"></span>${l.nom}
        </button>`
      )}
    </div>`}
    ${visibles.length === 0 &&
    html`<div class="vide"><strong>Aucun échantillon</strong>
      <span>Tricote un carré d'environ 15 cm dans le point de ton choix, puis enregistre-le ici avec le bouton en bas.</span></div>`}
    ${visibles.map((e) => {
      const point = pointParId(e.pointId);
      const laine = laineDe(e.laineId);
      return html`
        <button type="button" class="ligne-element ligne-echantillon"
          onClick=${() => naviguer("/reserve/echantillon/" + encodeURIComponent(e.id))}>
          ${point && html`<${BandeTexture} point=${point} couleur=${laine?.couleur || "#9A9590"} hauteur=${56} rayon=${12}
            style="width:56px;flex:none" />`}
          <span class="ligne-element-texte">
            <span class="ligne-element-nom">${point?.nom || "Point inconnu"}</span>
            <span class="ligne-element-detail">${detailEchantillon(e, laine)}</span>
            <span class="ligne-element-etat">${mentionsEchantillon(e)}</span>
          </span>
          <span class="ligne-element-valeur">
            <span class="ligne-element-chiffre">${texteDensite(e)}</span>
            <span class="ligne-element-etat">sur 10 cm</span>
          </span>
        </button>`;
    })}
    <p class="note">Un échantillon est retrouvé tout seul dès qu'un projet reprend la même laine, le même point et la même taille d'aiguille.</p>`;
}
