// Étape 4 : le builder (maquettes 5 et 5b). L'écharpe dessinée par blocs, les réglages du bloc choisi,
// l'ajout d'un bloc et la jauge de laine. Tout est recalculé par le moteur à chaque modification.
import { useMemo, useState } from "preact/hooks";
import { html } from "../html.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets, Fenetre } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { BandeTexture } from "../composants/texture.js";
import { DessinEcharpe } from "../composants/piece.js";
import { IconePlus } from "../composants/icones.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { pointParId, avisPour } from "../catalogue/points.js";
import { etiquettesProprietes } from "../catalogue/fiche.js";
import { formaterNombre, lireNombre } from "../donnees/reserve.js";
import { nomAvecArticle } from "../moteur/dimensions.js";
import {
  cheminEtape, calculerProjet, zoneAvis, avisPourBloc, nomBloc, nomCourtBloc, blocsHorizontaux, blocLateral,
  ajouterBloc, supprimerBloc, avecHauteurBloc, avecLargeurBandes, avecBandesLaterales, LIMITES_BLOCS,
} from "../donnees/projets.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";
const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Bloc choisi gardé pendant la visite (aller choisir un point, puis revenir).
const memoire = {};

export function EtapeBuilder({ id }) {
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  const [choisi, setChoisi] = useState(memoire[id] || "corps");
  const [orientation, setOrientation] = useState("horizontale");
  const [loupe, setLoupe] = useState(false);
  const [ajout, setAjout] = useState(false);

  const laine = projet && laines.find((l) => l.id === projet.laineId);
  const aig = projet && aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = useMemo(
    () => (projet ? calculerProjet({ projet, laine, aiguilles: aig, echantillons }) : null),
    [projet, laine, aig, echantillons]
  );

  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  const choisir = (blocId) => {
    memoire[id] = blocId;
    setChoisi(blocId);
  };
  const bloc = projet.blocs.find((b) => b.id === choisi) || projet.blocs.find((b) => b.zone === "corps");
  const couleur = laine?.couleur || COULEUR_PAR_DEFAUT;
  const plan = calcul?.ok ? calcul.plan : null;
  const t = projet.taille;

  async function continuer() {
    await modifier((p) => ({ ...p, etape: Math.max(p.etape, 5) }));
    naviguer(cheminEtape(projet, 5));
  }

  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${4} secours=${cheminEtape(projet, 3)} />
      <div class="ecran-contenu">
        <p class="note" style="margin-top:-6px">
          ${t.public === "enfant" ? "Enfant" : "Adulte"} · ${t.largeurCm} × ${t.longueurCm} cm${aig ? ` · aiguilles ${formaterNombre(lireNombre(aig.tailleMm), 2)} mm` : ""}
        </p>

        <${BandeauEstimation} projet=${projet} calcul=${calcul} aiguilles=${aig} />

        <section class="atelier" aria-label="L'écharpe">
          <${DessinEcharpe} projet=${projet} plan=${plan} couleur=${couleur} orientation=${orientation}
            blocChoisi=${bloc?.id} surChoix=${choisir} prefixe="builder"
            libelle=${`L'écharpe : ${blocsHorizontaux(projet).map((b) => `${minuscule(nomBloc(b))} en ${minuscule(pointParId(b.pointId)?.nom || "point à choisir")}`).join(", ")}`} />
          <${LegendeBloc} bloc=${bloc} plan=${plan} projet=${projet} />
          <div class="atelier-boutons">
            <button type="button" onClick=${() => setLoupe(true)}>Zoom texture</button>
            <button type="button" aria-pressed=${String(orientation === "verticale")}
              onClick=${() => setOrientation(orientation === "horizontale" ? "verticale" : "horizontale")}>
              ${orientation === "horizontale" ? "Voir en long" : "Voir en large"}
            </button>
          </div>
        </section>

        <h2 style="font-size:17px">Blocs de la pièce</h2>
        <div class="blocs" role="group" aria-label="Choisir un bloc">
          ${[...blocsHorizontaux(projet), ...(blocLateral(projet) ? [blocLateral(projet)] : [])].map((b) => {
            const p = pointParId(b.pointId);
            return html`<button type="button" class=${"bloc" + (b.zone === "corps" ? " bloc-corps" : "")}
              aria-pressed=${String(b.id === bloc?.id)} onClick=${() => choisir(b.id)}
              aria-label=${`${nomBloc(b)} : ${p ? minuscule(p.nom) : "point à choisir"}`}>
              ${p ? html`<${BandeTexture} point=${p} couleur=${couleur} hauteur=${20} rayon=${5} echelle=${0.6} />` : html`<span class="bloc-vide"></span>`}
              <span>${nomCourtBloc(b)}</span>
            </button>`;
          })}
          <button type="button" class="bloc bloc-ajout" aria-label="Ajouter un bloc" onClick=${() => setAjout(true)}>${IconePlus()}</button>
        </div>
        ${!blocLateral(projet) &&
        html`<button type="button" class="bouton-lien" onClick=${() => modifier(avecBandesLaterales)}>Remettre des bandes latérales</button>`}

        ${bloc && html`<${ReglagesBloc} key=${bloc.id} projet=${projet} bloc=${bloc} plan=${plan} calcul=${calcul}
          modifier=${modifier} surSuppression=${() => choisir("corps")} />`}

        <${Verifications} calcul=${calcul} />
        <${JaugeLaine} calcul=${calcul} laine=${laine} />
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" disabled=${!calcul?.ok} onClick=${continuer}>Voir l'écharpe finie</button>
      </div>

      <${Fenetre} ouverte=${loupe} titre=${bloc ? `${nomBloc(bloc)} · ${minuscule(pointParId(bloc.pointId)?.nom || "")}` : "Texture"}
        surFermeture=${() => setLoupe(false)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setLoupe(false)}>Fermer</button>`}>
        ${loupe && bloc && pointParId(bloc.pointId) && html`<${Loupe} point=${pointParId(bloc.pointId)} couleur=${couleur} />`}
      <//>

      ${ajout && html`<${AjoutBloc} projet=${projet} couleur=${couleur} surFermeture=${() => setAjout(false)}
        surAjout=${async ({ type, position, pointId, hauteurCm }) => {
          let nouvelId;
          await modifier((p) => {
            const r = ajouterBloc(p, { type, position, pointId, hauteurCm });
            nouvelId = r.blocId;
            return r.projet;
          });
          setAjout(false);
          choisir(nouvelId);
          // On enchaîne sur le choix du point de la nouvelle bande.
          naviguer(`/projet/${encodeURIComponent(projet.id)}/point/${encodeURIComponent(nouvelId)}`);
        }} />`}
    </main>`;
}

/** « Corps : 168 cm », sous le dessin. */
function LegendeBloc({ bloc, plan, projet }) {
  if (!bloc) return null;
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  let texte;
  if (bloc.zone === "cotes") {
    const bl = plan?.bandesLaterales;
    texte = bl ? `${bl.mailles} mailles de chaque côté, environ ${formaterNombre(bl.largeurCm)} cm` : `${bloc.largeurMailles} mailles de chaque côté`;
  } else if (bloc.zone === "corps" && plan) {
    const parties = plan.blocs.filter((b) => b.zone === "corps");
    const total = parties.reduce((s, b) => s + b.hauteurCm, 0);
    texte = parties.length > 1 ? `${parties.length} parties, ${formaterNombre(total, 0)} cm en tout` : `${formaterNombre(total, 0)} cm`;
  } else {
    texte = pb ? `${formaterNombre(pb.hauteurCm)} cm` : `${bloc.hauteurCm || 0} cm`;
  }
  const total = plan ? ` · écharpe ${formaterNombre(plan.largeur.reelleCm)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm` : "";
  return html`<p class="atelier-legende">${nomBloc(bloc)} : ${texte}${total}</p>`;
}

function BandeauEstimation({ projet, calcul, aiguilles }) {
  if (!calcul) return null;
  const dCorps = calcul.densites?.[projet.pointPrincipal];
  if (!dCorps || dCorps.statut === "mesuree") return null;
  const point = pointParId(projet.pointPrincipal);
  const taille = lireNombre(aiguilles?.tailleMm);
  const q = new URLSearchParams({ laine: projet.laineId, point: projet.pointPrincipal, aiguille: String(taille), projet: projet.id });
  const lien = html` <a href=${"#/reserve/echantillon/nouveau?" + q.toString()}>Saisir un échantillon en ${minuscule(point.nom)}</a>`;
  if (dCorps.origine === "conversion") {
    const depuis = pointParId(dCorps.depuis);
    return html`<${Encart} type="brique">
      Ton échantillon est en ${minuscule(depuis?.nom || "un autre point")}, le corps est maintenant en ${minuscule(point.nom)} : dimensions estimées.${lien}
    <//>`;
  }
  return html`<${Encart} type="brique">
    Dimensions estimées d'après ${dCorps.origine === "etiquette" ? "l'échantillon de l'étiquette de ta laine" : "l'épaisseur de ta laine"}, en attendant ton échantillon.${lien}
  <//>`;
}

function ReglagesBloc({ projet, bloc, plan, calcul, modifier, surSuppression }) {
  const point = pointParId(bloc.pointId);
  const avis = point ? avisPourBloc(point, projet.type, bloc.zone) : null;
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  const adresseChoix = `/projet/${encodeURIComponent(projet.id)}/point/${encodeURIComponent(bloc.id)}`;
  const supprimable = bloc.zone !== "corps";
  const densite = calcul?.densites?.[bloc.pointId];

  return html`
    <section class="carte-bloc reglages-bloc" aria-labelledby="titre-bloc">
      <div class="titre-section" style="margin:0">
        <h2 id="titre-bloc" style="font-size:19px">${nomBloc(bloc)} · ${point ? minuscule(point.nom) : "point à choisir"}</h2>
      </div>
      ${point && html`<span class="proprietes">${etiquettesProprietes(point).join(" · ")}</span>`}
      ${avis && avis.avis !== "conseille" && html`<${Encart} type=${avis.avis === "deconseille" ? "brique" : "sauge"}>${avis.raison}<//>`}

      <div class="rangee-boutons">
        <button type="button" class="bouton-secondaire" onClick=${() => naviguer(adresseChoix)}>${point ? "Changer de point" : "Choisir le point"}</button>
        ${bloc.zone === "corps" &&
        html`<button type="button" class="bouton-secondaire" onClick=${() => naviguer(cheminEtape(projet, 3))}>Longueur</button>`}
      </div>

      ${bloc.zone === "corps" &&
      html`<p class="note">La longueur du corps s'ajuste toute seule : il complète la longueur de l'écharpe${plan && plan.blocs.filter((b) => b.zone === "corps").length > 1 ? ", partagée entre ses parties" : ""}. C'est aussi le point de ton échantillon.</p>`}

      ${["bas", "haut", "bande"].includes(bloc.zone) &&
      html`<div class="reglage">
        <span>Hauteur</span>
        <div class="compteur">
          <button type="button" aria-label="1 cm de moins" disabled=${bloc.hauteurCm <= LIMITES_BLOCS.hauteurCm[0]}
            onClick=${() => modifier((p) => avecHauteurBloc(p, bloc.id, (bloc.hauteurCm || 0) - 1))}>−</button>
          <output aria-live="polite">${bloc.hauteurCm} cm</output>
          <button type="button" aria-label="1 cm de plus" onClick=${() => modifier((p) => avecHauteurBloc(p, bloc.id, (bloc.hauteurCm || 0) + 1))}>+</button>
        </div>
      </div>
      ${pb && html`<p class="note">Motif complet : ${pb.rangs} rang${pb.rangs > 1 ? "s" : ""}, soit environ ${formaterNombre(pb.hauteurCm)} cm.</p>`}`}

      ${bloc.zone === "cotes" &&
      html`<div class="reglage">
        <span>Largeur</span>
        <div class="compteur">
          <button type="button" aria-label="1 maille de moins" disabled=${bloc.largeurMailles <= LIMITES_BLOCS.largeurMailles[0]}
            onClick=${() => modifier((p) => avecLargeurBandes(p, (bloc.largeurMailles || 0) - 1))}>−</button>
          <output aria-live="polite">${bloc.largeurMailles} m.</output>
          <button type="button" aria-label="1 maille de plus" onClick=${() => modifier((p) => avecLargeurBandes(p, (bloc.largeurMailles || 0) + 1))}>+</button>
        </div>
      </div>
      <p class="note">Ces mailles bordent l'écharpe à droite et à gauche, sur toute sa longueur, à chaque rang.</p>`}

      ${densite && densite.statut !== "mesuree" && bloc.zone !== "corps" && point &&
      html`<p class="note">Pour ${nomAvecArticle(point)}, les dimensions sont estimées depuis ton échantillon du corps.</p>`}

      ${supprimable &&
      html`<button type="button" class="bouton-lien bouton-danger" onClick=${() => { modifier((p) => supprimerBloc(p, bloc.id)); surSuppression(); }}>
        ${bloc.zone === "cotes" ? "Enlever les bandes latérales" : "Enlever ce bloc"}
      </button>`}
    </section>`;
}

function Verifications({ calcul }) {
  if (!calcul) {
    return html`<${Encart} type="brique">L'outil ne peut pas encore calculer : il manque l'échantillon, ou au moins l'échantillon de l'étiquette ou l'épaisseur de ta laine (étape 2).<//>`;
  }
  if (!calcul.ok) {
    const e = calcul.erreurs[0];
    return html`<${Encart} type="brique">${e?.nomBloc ? `${majuscule(e.nomBloc)} : ` : ""}${e?.message}<//>`;
  }
  if (!calcul.explications.length) return null;
  return html`<details class="ajustements">
    <summary>Ajustements faits pour que tout tombe juste (${calcul.explications.length})</summary>
    ${calcul.explications.map((e) => html`<p class="note">${majuscule(e)}${e.endsWith(".") ? "" : "."}</p>`)}
  </details>`;
}

/** Jauge de laine : besoin estimé (marge de 10 % comprise) sur métrage disponible. */
export function JaugeLaine({ calcul, laine }) {
  if (!calcul?.ok || !calcul.metrage) return null;
  const m = calcul.metrage;
  const c = calcul.laineSuffit;
  if (!c || c.statut === "inconnu") {
    return html`<div class="jauge">
      <div class="jauge-ligne"><strong>Laine : environ ${m.metres} m</strong><span>métrage de ta laine inconnu</span></div>
      <p class="note">Indique le métrage de « ${laine?.nom} » dans ta réserve pour savoir s'il suffit.</p>
    </div>`;
  }
  const part = Math.min(1, m.metres / c.disponible);
  const manque = c.statut === "insuffisant";
  return html`<div class="jauge">
    <div class="jauge-ligne">
      <strong>Laine : environ ${m.metres} m</strong>
      <span>sur ${c.estime ? "environ " : ""}${c.disponible} m disponibles</span>
    </div>
    <div class="jauge-barre" role="meter" aria-valuemin="0" aria-valuemax=${c.disponible} aria-valuenow=${Math.min(m.metres, c.disponible)}
      aria-label="Laine nécessaire sur laine disponible">
      <div class="jauge-plein" style=${`width:${Math.round(part * 100)}%`}></div>
      ${manque && html`<div class="jauge-manque"></div>`}
    </div>
    ${manque && html`<${Encart} type="brique">Il manque environ ${Math.ceil(c.manque)} m de laine. Raccourcis l'écharpe, ou choisis un point moins gourmand.<//>`}
    ${c.statut === "juste" && html`<p class="note">Ça devrait suffire, mais de justesse.</p>`}
    <p class="note">${m.methode === "pesee" ? "Calculé d'après la pesée de ton échantillon" : "Estimation sans pesée de l'échantillon"}, marge de 10 % comprise.</p>
  </div>`;
}

function Loupe({ point, couleur }) {
  const [face, setFace] = useState("endroit");
  return html`
    <${BandeTexture} point=${point} couleur=${couleur} hauteur=${200} face=${face} echelle=${1.5} rayon=${16} />
    ${!point.proprietes.reversible &&
    html`<${Onglets} libelle="Côté du tricot" valeur=${face} surChoix=${setFace}
      choix=${[{ valeur: "endroit", libelle: "Endroit" }, { valeur: "envers", libelle: "Envers" }]} />`}
    <p class="note">${point.resume}</p>`;
}

const POSITIONS_BANDE = [
  { valeur: "milieu", libelle: "Au milieu du corps" },
  { valeur: "debut", libelle: "Au début du corps" },
  { valeur: "fin", libelle: "À la fin du corps" },
];
const POSITIONS_BORDURE = [
  { valeur: "bas", libelle: "En bas, contre le corps" },
  { valeur: "haut", libelle: "En haut, contre le corps" },
];

/** Écran 5b : ajouter une bande dans le corps, ou une bordure de plus. */
function AjoutBloc({ projet, couleur, surFermeture, surAjout }) {
  const [type, setType] = useState("bande");
  const [position, setPosition] = useState("milieu");
  const [hauteur, setHauteur] = useState(10);
  const pointId = type === "bande" ? "sillon" : "riz";
  const point = pointParId(pointId);
  const positions = type === "bande" ? POSITIONS_BANDE : POSITIONS_BORDURE;
  const changerType = (t) => {
    setType(t);
    setPosition(t === "bande" ? "milieu" : "bas");
    setHauteur(t === "bande" ? 10 : 3);
  };
  const apercu = ajouterBloc(projet, { type, position, pointId, hauteurCm: hauteur });

  return html`
    <${Fenetre} ouverte=${true} titre="Ajouter un bloc" surFermeture=${surFermeture}
      actions=${html`
        <button type="button" class="bouton-principal" onClick=${() => surAjout({ type, position, pointId, hauteurCm: hauteur })}>
          ${type === "bande" ? "Ajouter la bande" : "Ajouter la bordure"} et choisir son point
        </button>
        <button type="button" class="bouton-secondaire" onClick=${surFermeture}>Annuler</button>`}>
      <div class="rangee-choix" role="group" aria-label="Sorte de bloc">
        <button type="button" class="choix-carte" aria-pressed=${String(type === "bande")} onClick=${() => changerType("bande")}>
          <strong>Bande de point</strong><span>Une bande d'un autre point dans le corps</span>
        </button>
        <button type="button" class="choix-carte" aria-pressed=${String(type === "bordure")} onClick=${() => changerType("bordure")}>
          <strong>Bordure en plus</strong><span>Doubler une bordure</span>
        </button>
      </div>
      <div class="atelier">
        <${DessinEcharpe} projet=${apercu.projet} plan=${null} couleur=${couleur} blocChoisi=${apercu.blocId}
          largeurPx=${300} prefixe="ajout" libelle="Aperçu de l'écharpe avec le nouveau bloc" />
      </div>
      <label class="champ">
        Où ?
        <select value=${position} onChange=${(e) => setPosition(e.currentTarget.value)}>
          ${positions.map((p) => html`<option value=${p.valeur}>${p.libelle}</option>`)}
        </select>
      </label>
      <div class="reglage">
        <span>Hauteur</span>
        <div class="compteur">
          <button type="button" aria-label="1 cm de moins" onClick=${() => setHauteur((h) => Math.max(1, h - 1))}>−</button>
          <output aria-live="polite">${hauteur} cm</output>
          <button type="button" aria-label="1 cm de plus" onClick=${() => setHauteur((h) => Math.min(80, h + 1))}>+</button>
        </div>
      </div>
      <p class="note">Point proposé : ${minuscule(point.nom)}. Tu le choisis juste après.</p>
    <//>`;
}
