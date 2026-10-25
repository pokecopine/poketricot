// Étape 3 : la taille (maquette 4). Mailles à monter et rangs calculés en direct par le moteur.
import { html } from "../html.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { formaterNombre } from "../donnees/reserve.js";
import { TAILLES_ECHARPE, LIMITES_ECHARPE, cheminEtape, calculerProjet, etapeParCle } from "../donnees/projets.js";

const borner = (v, [min, max]) => Math.min(max, Math.max(min, v));

export function EtapeTaille({ id }) {
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  const t = projet.taille;
  const tailles = TAILLES_ECHARPE[t.public];
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = calculerProjet({ projet, laine, aiguilles: aig, echantillons });

  const majTaille = (patch) => modifier((p) => ({ ...p, taille: { ...p.taille, ...patch } }));
  const choisirPublic = (pub) => {
    const ref = TAILLES_ECHARPE[pub];
    const l = ref.longueurs.find((x) => x.preset === t.preset) || ref.longueurs[1];
    majTaille({ public: pub, preset: l.preset, longueurCm: l.longueurCm, largeurCm: ref.largeurCm });
  };
  const changerLongueur = (d) => majTaille({ preset: "libre", longueurCm: borner(t.longueurCm + d, LIMITES_ECHARPE.longueur) });
  const changerLargeur = (d) => majTaille({ largeurCm: borner(t.largeurCm + d, LIMITES_ECHARPE.largeur) });

  async function continuer() {
    await modifier((p) => ({ ...p, etape: Math.max(p.etape, 4) }));
    naviguer(cheminEtape(projet, 4));
  }

  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${3} secours=${cheminEtape(projet, 2)} />
      <div class="ecran-contenu">
        <${Onglets} libelle="Pour qui ?" valeur=${t.public} surChoix=${choisirPublic}
          choix=${[{ valeur: "enfant", libelle: "Enfant" }, { valeur: "adulte", libelle: "Adulte" }]} />

        ${tailles.longueurs.map(
          (l) => html`<button type="button" class="choix-taille" aria-pressed=${String(t.preset === l.preset)}
            onClick=${() => majTaille({ preset: l.preset, longueurCm: l.longueurCm })}>
            <span class="ligne-element-texte">
              <span class="ligne-element-nom">${l.nom}</span>
              <span class="ligne-element-detail">${l.detail}</span>
            </span>
            <span style=${t.preset === l.preset ? "font-weight:700" : "color:var(--texte-2)"}>${l.longueurCm} cm</span>
          </button>`
        )}

        <section class="carte-bloc" aria-labelledby="titre-ajuster">
          <h2 id="titre-ajuster" style="font-size:18px">Ajuster</h2>
          <div class="reglage">
            <span>Longueur</span>
            <div class="compteur">
              <button type="button" aria-label="Raccourcir de 5 cm" onClick=${() => changerLongueur(-5)}>−</button>
              <output aria-live="polite">${t.longueurCm} cm</output>
              <button type="button" aria-label="Rallonger de 5 cm" onClick=${() => changerLongueur(5)}>+</button>
            </div>
          </div>
          <div class="reglage">
            <span>Largeur</span>
            <div class="compteur">
              <button type="button" aria-label="Rétrécir de 1 cm" onClick=${() => changerLargeur(-1)}>−</button>
              <output aria-live="polite">${t.largeurCm} cm</output>
              <button type="button" aria-label="Élargir de 1 cm" onClick=${() => changerLargeur(1)}>+</button>
            </div>
          </div>
          <${Resultat} calcul=${calcul} />
        </section>
        <p class="note">Les bordures (3 cm en haut et en bas) et les bandes latérales en point mousse sont comprises ; tu pourras les changer à l'étape suivante.</p>
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${continuer}>Construire ma pièce</button>
      </div>
    </main>`;
}

function Resultat({ calcul }) {
  if (!calcul) {
    return html`<${Encart} type="brique">L'outil ne peut pas encore calculer : il manque l'échantillon, ou au moins l'échantillon de l'étiquette ou l'épaisseur de ta laine.<//>`;
  }
  if (!calcul.ok) {
    return html`<${Encart} type="brique">${calcul.erreurs[0]?.message}<//>`;
  }
  const { plan } = calcul;
  return html`
    <div aria-live="polite" style="display:flex;flex-direction:column;gap:8px">
      <${Encart}>
        ${calcul.echantillon ? "Avec ton échantillon : " : "Estimation, en attendant ton échantillon : "}
        <strong>${plan.montage.mailles} mailles</strong> à monter, environ <strong>${plan.rangs.length} rangs</strong>.
      <//>
      <p class="note">Dimensions réelles : ${formaterNombre(plan.largeur.reelleCm)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm.</p>
      ${calcul.echantillon && calcul.estime &&
      html`<p class="note">Les autres points (bordures, bandes) sont estimés à partir de ton échantillon, tant que tu n'en as pas tricoté dans ces points.</p>`}
      ${calcul.explications.map((e) => html`<p class="note">${e.charAt(0).toUpperCase() + e.slice(1)}${e.endsWith(".") ? "" : "."}</p>`)}
    </div>`;
}

/** Étapes suivantes (builder, aperçu, patron) : en préparation. */
export function EtapeBientot({ id, etape }) {
  const { projet, introuvable } = useProjet(id);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  const e = etapeParCle(etape);
  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${e.numero} secours=${cheminEtape(projet, Math.max(1, e.numero - 1))} />
      <div class="ecran-contenu">
        <div class="vide">
          <strong>Bientôt</strong>
          <span>Cette étape arrive dans une prochaine version. Ton projet est enregistré : tu le retrouveras sur l'accueil, là où tu t'es arrêtée.</span>
          <button type="button" class="bouton-pilule" onClick=${() => naviguer("/")}>Retour à l'accueil</button>
        </div>
      </div>
    </main>`;
}
