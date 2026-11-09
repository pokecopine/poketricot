// Étape 3 : la taille (maquette 4). Mailles à monter et rangs calculés en direct par le moteur.
import { html } from "../html.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { formaterNombre } from "../donnees/reserve.js";
import { pointParId } from "../catalogue/points.js";
import {
  TAILLES_ECHARPE, LIMITES_ECHARPE, TAILLES_SNOOD, LIMITES_SNOOD, TOUR_MIN_TETE, tailleSnood, cheminEtape, calculerProjet, etapeParCle,
  TAILLES_BONNET, LIMITES_BONNET, AISANCE_BONNET, tailleBonnet, tourDuBonnet, avecRevers, avecPompon, BORD_BONNET,
} from "../donnees/projets.js";

const borner = (v, [min, max]) => Math.min(max, Math.max(min, v));

export function EtapeTaille({ id }) {
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  if (projet.type === "bonnet") return html`<${TailleBonnet} projet=${projet} laines=${laines} aiguilles=${aiguilles} echantillons=${echantillons} modifier=${modifier} />`;
  if (projet.type === "snood") return html`<${TailleSnood} projet=${projet} laines=${laines} aiguilles=${aiguilles} echantillons=${echantillons} modifier=${modifier} />`;
  const t = projet.taille;
  const tailles = TAILLES_ECHARPE[t.public];
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = calculerProjet({ projet, laine, aiguilles: aig, echantillons, laines });

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

function texteBordures(bordures) {
  if (!bordures.length) return "Tu pourras ajouter des bordures à l'étape suivante.";
  const p = pointParId(bordures[0].pointId);
  const memes = bordures.every((b) => b.pointId === bordures[0].pointId && b.hauteurCm === bordures[0].hauteurCm);
  const quoi = memes && bordures.length === 2
    ? `${formaterNombre(bordures[0].hauteurCm || 0)} cm en bas et en haut${p ? `, en ${p.nom.charAt(0).toLowerCase() + p.nom.slice(1)}` : ""}`
    : bordures.map((b) => `${formaterNombre(b.hauteurCm || 0)} cm ${b.zone === "bas" ? "en bas" : "en haut"}`).join(", ");
  return `Les bordures (${quoi}) sont comprises ; tu pourras les changer à l'étape suivante.`;
}

/** Étape 3 d'un snood (maquette validée le 02/11) : 1 ou 2 tours, tour et hauteur. */
function TailleSnood({ projet, laines, aiguilles, echantillons, modifier }) {
  const t = projet.taille;
  const tailles = TAILLES_SNOOD[t.public] || TAILLES_SNOOD.adulte;
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = calculerProjet({ projet, laine, aiguilles: aig, echantillons, laines });
  const majTaille = (patch) => modifier((p) => ({ ...p, taille: { ...p.taille, ...patch } }));
  const choisirPublic = (pub) => majTaille(tailleSnood(pub, t.preset));
  const changerTour = (d) => majTaille({ preset: "libre", tourCm: borner(t.tourCm + d, LIMITES_SNOOD.tour) });
  const changerHauteur = (d) => majTaille({ preset: "libre", hauteurCm: borner(t.hauteurCm + d, LIMITES_SNOOD.hauteur) });
  async function continuer() {
    await modifier((p) => ({ ...p, etape: Math.max(p.etape, 4) }));
    naviguer(cheminEtape(projet, 4));
  }
  const bordures = projet.blocs.filter((b) => b.zone === "bas" || b.zone === "haut");
  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${3} secours=${cheminEtape(projet, 2)} />
      <div class="ecran-contenu">
        <${Onglets} libelle="Pour qui ?" valeur=${t.public} surChoix=${choisirPublic}
          choix=${[{ valeur: "enfant", libelle: "Enfant" }, { valeur: "adulte", libelle: "Adulte" }]} />
        ${tailles.map(
          (l) => html`<button type="button" class="choix-taille" aria-pressed=${String(t.preset === l.preset)}
            onClick=${() => majTaille({ preset: l.preset, tourCm: l.tourCm, hauteurCm: l.hauteurCm })}>
            <span class="ligne-element-texte">
              <span class="ligne-element-nom">${l.nom}</span>
              <span class="ligne-element-detail">${l.detail}</span>
            </span>
            <span style=${t.preset === l.preset ? "font-weight:700" : "color:var(--texte-2)"}>${l.tourCm} × ${l.hauteurCm} cm</span>
          </button>`
        )}
        <section class="carte-bloc" aria-labelledby="titre-ajuster">
          <h2 id="titre-ajuster" style="font-size:18px">Ajuster</h2>
          <div class="reglage">
            <span>Tour</span>
            <div class="compteur">
              <button type="button" aria-label="Tour plus petit de 1 cm" onClick=${() => changerTour(-1)}>−</button>
              <output aria-live="polite">${t.tourCm} cm</output>
              <button type="button" aria-label="Tour plus grand de 1 cm" onClick=${() => changerTour(1)}>+</button>
            </div>
          </div>
          <div class="reglage">
            <span>Hauteur</span>
            <div class="compteur">
              <button type="button" aria-label="Moins haut de 1 cm" onClick=${() => changerHauteur(-1)}>−</button>
              <output aria-live="polite">${t.hauteurCm} cm</output>
              <button type="button" aria-label="Plus haut de 1 cm" onClick=${() => changerHauteur(1)}>+</button>
            </div>
          </div>
          <${Resultat} calcul=${calcul} rond=${true} />
          ${t.tourCm < TOUR_MIN_TETE && html`<${Encart} type="brique">Avec ${t.tourCm} cm de tour, il risque de ne pas passer la tête.<//>`}
          ${calcul?.cable && html`<${Encart} type="brique">Ton aiguille a un câble de ${formaterNombre(calcul.cable.cableCm, 0)} cm, plus long que le tour du snood (${t.tourCm} cm) : les mailles ne pourront pas se rejoindre. Prends un câble de ${calcul.cable.conseille} cm.<//>`}
        </section>
        <p class="note">${texteBordures(bordures)}</p>
      </div>
      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${continuer}>Construire ma pièce</button>
      </div>
    </main>`;
}

/** Étape 3 d'un bonnet (maquette validée le 09/11) : tour de tête, hauteur, revers, pompon, magic loop. */
function TailleBonnet({ projet, laines, aiguilles, echantillons, modifier }) {
  const t = projet.taille;
  const tailles = TAILLES_BONNET[t.public] || TAILLES_BONNET.adulte;
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = calculerProjet({ projet, laine, aiguilles: aig, echantillons, laines });
  const majTaille = (patch) => modifier((p) => ({ ...p, taille: { ...p.taille, ...patch } }));
  const choisirPublic = (pub) => {
    const n = tailleBonnet(pub);
    majTaille({ public: pub, preset: n.preset, teteCm: n.teteCm, hauteurCm: n.hauteurCm, pomponCm: n.pomponCm });
  };
  const changerTete = (d) => majTaille({ preset: "mesure", teteCm: borner(t.teteCm + d, LIMITES_BONNET.tete) });
  const changerHauteur = (d) => majTaille({ hauteurCm: borner(t.hauteurCm + d, LIMITES_BONNET.hauteur) });
  async function continuer() {
    await modifier((p) => ({ ...p, etape: Math.max(p.etape, 4) }));
    naviguer(cheminEtape(projet, 4));
  }
  const bord = projet.blocs.find((b) => b.zone === "bas");
  const pointBord = pointParId(bord?.pointId);
  const nomLaine = (id) => laines.find((l) => l.id === id)?.nom;
  const lainePompon = t.pomponLaineId ? nomLaine(t.pomponLaineId) : null;
  const tailleMm = aig ? formaterNombre(Number(String(aig.tailleMm).replace(",", ".")), 2) : null;
  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${3} secours=${cheminEtape(projet, 2)} />
      <div class="ecran-contenu">
        <${Onglets} libelle="Pour qui ?" valeur=${t.public} surChoix=${choisirPublic}
          choix=${[{ valeur: "enfant", libelle: "Enfant" }, { valeur: "adulte", libelle: "Adulte" }]} />
        ${tailles.map(
          (l) => html`<button type="button" class="choix-taille" aria-pressed=${String(t.preset === l.preset)}
            onClick=${() => majTaille({ preset: l.preset, teteCm: l.teteCm, hauteurCm: l.hauteurCm })}>
            <span class="ligne-element-texte">
              <span class="ligne-element-nom">${l.nom}</span>
              <span class="ligne-element-detail">${l.detail}</span>
            </span>
            <span style=${t.preset === l.preset ? "font-weight:700" : "color:var(--texte-2)"}>${l.teteCm} cm</span>
          </button>`
        )}
        <button type="button" class="choix-taille" aria-pressed=${String(t.preset === "mesure")} onClick=${() => majTaille({ preset: "mesure" })}>
          <span class="ligne-element-texte">
            <span class="ligne-element-nom">Tour de tête mesuré</span>
            <span class="ligne-element-detail">Mesure au-dessus des oreilles et des sourcils</span>
          </span>
          <span style=${t.preset === "mesure" ? "font-weight:700" : "color:var(--texte-2)"}>${t.preset === "mesure" ? `${t.teteCm} cm` : "— cm"}</span>
        </button>
        <section class="carte-bloc" aria-labelledby="titre-ajuster">
          <h2 id="titre-ajuster" style="font-size:18px">Ajuster</h2>
          <div class="reglage">
            <span>Tour de tête</span>
            <div class="compteur">
              <button type="button" aria-label="Tour de tête plus petit de 1 cm" onClick=${() => changerTete(-1)}>−</button>
              <output aria-live="polite">${t.teteCm} cm</output>
              <button type="button" aria-label="Tour de tête plus grand de 1 cm" onClick=${() => changerTete(1)}>+</button>
            </div>
          </div>
          <div class="reglage">
            <span>Hauteur</span>
            <div class="compteur">
              <button type="button" aria-label="Moins haut de 1 cm" onClick=${() => changerHauteur(-1)}>−</button>
              <output aria-live="polite">${t.hauteurCm} cm</output>
              <button type="button" aria-label="Plus haut de 1 cm" onClick=${() => changerHauteur(1)}>+</button>
            </div>
          </div>
          <${ResultatBonnet} calcul=${calcul} tour=${tourDuBonnet(projet)} />
          <p class="note">Hauteur sans le revers, du bord jusqu'en haut du sommet.</p>
        </section>
        <label class="case carte-option">
          <input type="checkbox" checked=${!!t.revers} onChange=${(e) => { const v = e.currentTarget.checked; modifier((p) => avecRevers(p, v)); }} />
          <span><strong>Revers replié</strong> Le bord fera ${t.revers ? formaterNombre(bord?.hauteurCm || BORD_BONNET.revers, 0) : BORD_BONNET.revers} cm et se repliera en deux.</span>
        </label>
        ${t.revers && pointBord && !pointBord.proprietes?.reversible &&
        html`<${Encart} type="brique">${pointBord.nom} n'est pas réversible : son envers se verrait une fois replié. Change le point du bord à l'étape suivante.<//>`}
        <label class="case carte-option">
          <input type="checkbox" checked=${!!t.pompon} onChange=${(e) => { const v = e.currentTarget.checked; modifier((p) => avecPompon(p, { pompon: v })); }} />
          <span><strong>Pompon</strong> ${formaterNombre(t.pomponCm || 6, 0)} cm, ${lainePompon ? `en « ${lainePompon} »` : "dans ta laine principale"}.</span>
        </label>
        ${calcul?.cable?.magicLoop
          ? html`<${Encart} type="brique">Ton câble de ${formaterNombre(calcul.cable.cableCm, 0)} cm est trop court pour le magic loop : prends un câble de ${calcul.cable.conseille} cm.<//>`
          : html`<${Encart}>Tout le bonnet se tricote en <strong>magic loop</strong>${tailleMm ? `, sur ton aiguille de ${tailleMm} mm${aig?.cableCm ? ` à câble de ${formaterNombre(Number(aig.cableCm), 0)} cm` : ""}` : ""}.<//>`}
        <p class="note">Le bord (${pointBord ? pointBord.nom.charAt(0).toLowerCase() + pointBord.nom.slice(1) : "côtes 1/1"}) et le sommet sont compris ; tu pourras les changer à l'étape suivante.</p>
      </div>
      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${continuer}>Construire ma pièce</button>
      </div>
    </main>`;
}

function ResultatBonnet({ calcul, tour }) {
  if (!calcul) return html`<${Resultat} calcul=${calcul} />`;
  if (!calcul.ok) return html`<${Encart} type="brique">${calcul.erreurs[0]?.message}<//>`;
  const { plan } = calcul;
  return html`
    <div aria-live="polite" style="display:flex;flex-direction:column;gap:8px">
      <${Encart}>
        Ton bonnet fera <strong>${formaterNombre(tour, 0)} cm de tour</strong> : ${AISANCE_BONNET} cm de moins que la tête, il serre un peu pour bien tenir.
        ${calcul.echantillon ? " Avec ton échantillon : " : " Estimation, en attendant ton échantillon : "}
        <strong>${plan.montage.mailles} mailles</strong> en rond, environ <strong>${plan.rangs.length} tours</strong>.
      <//>
      <p class="note">Dimensions réelles : ${formaterNombre(plan.largeur.reelleCm)} cm de tour × ${formaterNombre(plan.longueur.reelleCm)} cm de haut.</p>
      ${calcul.explications.map((e) => html`<p class="note">${e.charAt(0).toUpperCase() + e.slice(1)}${e.endsWith(".") ? "" : "."}</p>`)}
    </div>`;
}

function Resultat({ calcul, rond = false }) {
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
        <strong>${plan.montage.mailles} mailles</strong> à monter${rond ? " en rond" : ""}, environ <strong>${plan.rangs.length} ${rond ? "tours" : "rangs"}</strong>.
      <//>
      <p class="note">Dimensions réelles : ${rond ? `${formaterNombre(plan.largeur.reelleCm)} × ${formaterNombre(plan.longueur.reelleCm)}` : `${formaterNombre(plan.largeur.reelleCm)} × ${formaterNombre(plan.longueur.reelleCm, 0)}`} cm.</p>
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
