// Étape 2 : mon matériel (maquettes 3 et 3b) — laine, aiguilles, point principal, échantillon.
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { useState } from "preact/hooks";
import { Encart, Pastille, Fenetre } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { pointParId } from "../catalogue/points.js";
import { etiquettesProprietes } from "../catalogue/fiche.js";
import { texteConseilFourchette } from "../moteur/aiguille.js";
import { cableMagicLoop, CABLE_MAGIC_LOOP } from "../moteur/plan-bonnet.js";
import { trierLaines, trierAiguilles, titreAiguilles, lireNombre, formaterNombre, EPAISSEURS, aiguillesEtiquette } from "../donnees/reserve.js";
import { texteDate, estPese } from "../donnees/echantillons.js";
import {
  cheminEtape, detailLaineProjet, conseilAiguille, echantillonDuProjet, materielManquant, nomPropose, avisPointPrincipal, noteEchantillonEnRond,
  avecLainePrincipale, avecLaineDuProjet, sansLaineDuProjet, blocsDeLaLaine, idsLainesDuProjet,
} from "../donnees/projets.js";
import { densiteJerseyProvisoire } from "../moteur/densite.js";

export function EtapeMateriel({ id }) {
  const { flash } = useApp();
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  const listeLaines = trierLaines(laines.filter((l) => !l.archivee || l.id === projet.laineId));
  const listeAiguilles = trierAiguilles(aiguilles.filter((a) => !a.archivee || a.id === projet.aiguillesId));
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const point = pointParId(projet.pointPrincipal);
  const echantillon = echantillonDuProjet(projet, aig, echantillons);
  const conseil = laine && aig ? conseilAiguille(laine, aig.tailleMm) : null;
  const taille = lireNombre(aig?.tailleMm);
  // 0.18.0 (C-1) : la bonne taille dans la fourchette de l'étiquette, selon la pièce et le point principal.
  const fourchette = laine && aig && point ? texteConseilFourchette({ piece: projet.type, point, fourchette: aiguillesEtiquette(laine), tailleChoisie: taille }) : null;

  const choisirLaine = (l) =>
    modifier((p) => ({ ...avecLainePrincipale(p, l.id), echantillonId: "", nom: p.nomAuto ? nomPropose(p.type, l) : p.nom }));
  const choisirAiguilles = (a) => modifier((p) => ({ ...p, aiguillesId: a.id, echantillonId: "" }));

  const adresseEchantillon = () => {
    const q = new URLSearchParams({ laine: projet.laineId, point: projet.pointPrincipal, aiguille: String(taille), projet: projet.id });
    return "/reserve/echantillon/nouveau?" + q.toString();
  };

  async function continuer() {
    const manque = materielManquant(projet, { echantillon });
    if (manque.length) return flash(`Il manque ${manque.join(", ")}.`, true);
    await modifier((p) => ({ ...p, echantillonId: echantillon?.id || "", etape: Math.max(p.etape, 3) }));
    naviguer(cheminEtape(projet, 3));
  }

  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${2} secours=${cheminEtape(projet, 1)} />
      <div class="ecran-contenu">
        <${LainesDuProjet} projet=${projet} laines=${listeLaines} laine=${laine} surPrincipale=${choisirLaine} modifier=${modifier} />

        <div class="titre-section">
          <h2>2. Aiguilles, dans ma réserve</h2>
          <a href="#/reserve/aiguilles/nouvelles">+ Nouvelles</a>
        </div>
        ${listeAiguilles.length === 0 && html`<${Encart} type="brique">Ta réserve n'a pas encore d'aiguilles : ajoute celles de ce projet.<//>`}
        <div class="puces" role="group" aria-label="Aiguilles">
          ${listeAiguilles.map(
            (a) => html`<button type="button" class="puce" aria-pressed=${String(a.id === projet.aiguillesId)} onClick=${() => choisirAiguilles(a)}>
              ${titreAiguilles(a)}
            </button>`
          )}
        </div>
        ${fourchette
          ? html`<${Encart} type="sauge">${fourchette.debut}<strong>${fourchette.tailleTexte}</strong>${fourchette.fin}${fourchette.choisie ? " C'est ton aiguille." : fourchette.douce ? " " + fourchette.douce : ""}<//>
            ${conseil && !fourchette.choisie && !fourchette.douce && html`<${Encart} type=${conseil.ok ? "sauge" : "brique"}>${conseil.texte}<//>`}`
          : conseil && html`<${Encart} type=${conseil.ok ? "sauge" : "brique"}>${conseil.texte}<//>`}
        ${projet.type === "bonnet" && (aig && cableMagicLoop(lireNombre(aig.cableCm))
          ? html`<${Encart} type="brique">Ton câble de ${formaterNombre(lireNombre(aig.cableCm), 0)} cm est trop court pour le magic loop : prends un câble de ${CABLE_MAGIC_LOOP} cm.<//>`
          : html`<p class="note">Tout le bonnet se tricote en magic loop : prends un câble de ${CABLE_MAGIC_LOOP} cm.</p>`)}

        <div class="titre-section">
          <h2>3. Point principal</h2>
          ${point && html`<a href=${`#/projet/${encodeURIComponent(projet.id)}/point/corps`}>Changer</a>`}
        </div>
        ${point
          ? html`<${CartePointPrincipal} point=${point} couleur=${laine?.couleur || "#D07E5B"} type=${projet.type} />`
          : html`<button type="button" class="bouton-secondaire" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/point/corps`)}>
              Choisir le point principal
            </button>
            <p class="note">C'est le point du corps ${{ snood: "du snood", bonnet: "du bonnet" }[projet.type] || "de l'écharpe"} : ton échantillon se tricote dans ce point.</p>`}

        <${CarteEchantillon} projet=${projet} laine=${laine} point=${point} taille=${taille} echantillon=${echantillon}
          adresse=${adresseEchantillon} modifier=${modifier} />
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${continuer}>Continuer</button>
      </div>
    </main>`;
}

function CartePointPrincipal({ point, couleur, type }) {
  const avis = avisPointPrincipal(point, type);
  return html`
    <div class="carte-point" style="cursor:default">
      <${BandeTexture} point=${point} couleur=${couleur} hauteur=${56} />
      <span class="carte-point-corps">
        <span class="carte-point-titre"><span>${point.nom}</span></span>
        <div class="puces" style="gap:6px">${etiquettesProprietes(point).map((t) => html`<span class="etiquette">${t}</span>`)}</div>
        ${avis.avis === "conseille"
          ? html`<span class="note">Conseillé pour ${{ snood: "un snood", bonnet: "un bonnet" }[type] || "une écharpe"}. C'est le point du corps : ton échantillon se tricote dans ce point.</span>`
          : html`<${Encart} type=${avis.avis === "deconseille" ? "brique" : "sauge"}>${avis.raison}<//>`}
      </span>
    </div>`;
}

function CarteEchantillon({ projet, laine, point, taille, echantillon, adresse, modifier }) {
  if (!laine || !point || taille === null) {
    return html`<div class="carte-echantillon">
      <h2 style="font-size:18px">4. Mon échantillon</h2>
      <p class="note">Choisis d'abord la laine, les aiguilles et le point principal : l'outil cherchera ton échantillon tout seul.</p>
    </div>`;
  }
  const nomPoint = point.nom.charAt(0).toLowerCase() + point.nom.slice(1);
  if (echantillon) {
    return html`<div class="carte-echantillon retrouve">
      <div class="titre-section" style="margin:0">
        <h2>4. Mon échantillon</h2><span class="badge badge-sauge">Retrouvé</span>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <${BandeTexture} point=${point} couleur=${laine.couleur} hauteur=${56} rayon=${12} style="width:56px;flex:none" />
        <span class="ligne-element-texte">
          <span class="ligne-element-nom">${point.nom} · ${formaterNombre(taille, 2)} mm</span>
          <span class="ligne-element-detail">${laine.nom} · tricoté le ${texteDate(echantillon.date)}</span>
          <span class="ligne-element-detail">${[echantillon.lave ? "Lavé et séché" : "Pas lavé", estPese(echantillon) ? `pesé (${echantillon.pesee.grammes} g)` : "pas pesé"].join(" · ")}</span>
        </span>
      </div>
      <div class="chiffres">
        <div><strong>${formaterNombre(echantillon.maillesPour10cm)}</strong><span>mailles sur 10 cm</span></div>
        <div><strong>${formaterNombre(echantillon.rangsPour10cm)}</strong><span>rangs sur 10 cm</span></div>
      </div>
      <span class="note" style="color:var(--sauge-texte)">Même laine, même point, même taille d'aiguille : pas besoin de le retricoter.</span>
      ${noteEchantillonEnRond(projet, echantillon) && html`<span class="note">${noteEchantillonEnRond(projet, echantillon)}</span>`}
      <a href=${"#" + adresse()}>J'ai tricoté un nouvel échantillon</a>
    </div>`;
  }
  const provisoire = densiteJerseyProvisoire(laine, taille);
  return html`<div class="carte-echantillon">
    <h2 style="font-size:18px">4. Mon échantillon</h2>
    <p>Tu n'as pas encore d'échantillon en <strong>${nomPoint}</strong> avec cette laine et des aiguilles de ${formaterNombre(taille, 2)} mm.</p>
    <button type="button" class="bouton-principal" onClick=${() => naviguer(adresse())}>Saisir mon échantillon</button>
    <p class="note">Le guide t'explique comment tricoter un carré d'environ 15 cm, le mesurer et le peser.</p>
    <button type="button" class="bouton-secondaire" aria-pressed=${String(!!projet.sansEchantillon)}
      onClick=${() => modifier((p) => ({ ...p, sansEchantillon: !p.sansEchantillon }))}>
      ${provisoire?.origine === "etiquette"
        ? projet.sansEchantillon ? "✓ J'utilise l'échantillon de l'étiquette" : "Utiliser l'échantillon de l'étiquette pour l'instant"
        : projet.sansEchantillon ? "✓ Je continue sans échantillon pour l'instant" : "Continuer sans échantillon pour l'instant"}
    </button>
    ${projet.sansEchantillon &&
    html`<${Encart} type="brique">${provisoire
      ? `Dimensions estimées d'après ${provisoire.origine === "etiquette" ? `l'échantillon de l'étiquette (${formaterNombre(provisoire.mailles)} mailles${provisoire.rangsEtiquette ? ` × ${formaterNombre(provisoire.rangs)} rangs` : ""} en jersey${Math.abs(provisoire.mailles - lireNombre(laine.echantillonEtiquette?.mailles)) > 0.05 ? ", ajusté à tes aiguilles" : ""})` : "l'épaisseur de la laine"}. Ça suffit pour créer le patron, avec des tailles approximatives ; ton échantillon les rendra justes.`
      : "Sans échantillon ni étiquette, l'outil ne peut pas estimer les dimensions : indique l'échantillon de l'étiquette dans ta laine, ou tricote ton échantillon."}<//>`}
  </div>`;
}

/** E3c-1 : la laine principale, puis les autres laines du projet (ajouter, retirer). */
function LainesDuProjet({ projet, laines, laine, surPrincipale, modifier }) {
  const [changer, setChanger] = useState(false);
  const [ajouter, setAjouter] = useState(false);
  const [aRetirer, setARetirer] = useState(null);
  const ids = idsLainesDuProjet(projet);
  const autres = ids.filter((id) => id !== projet.laineId).map((id) => laines.find((l) => l.id === id)).filter(Boolean);
  const disponibles = laines.filter((l) => !ids.includes(l.id));
  const ep = (id) => EPAISSEURS.find((e) => e.id === id)?.nom.toLowerCase() || id;
  const retirer = (l) => {
    if (blocsDeLaLaine(projet, l.id) > 0) setARetirer(l);
    else modifier((p) => sansLaineDuProjet(p, l.id));
  };
  const n = aRetirer ? blocsDeLaLaine(projet, aRetirer.id) : 0;
  const ligne = (l, actions) => html`<div class="choix-laine laine-projet">
    <${Pastille} couleur=${l.couleur} taille=${36} />
    <span class="ligne-element-texte">
      <span class="ligne-element-nom">${l.nom}</span>
      <span class="ligne-element-detail">${detailLaineProjet(l)}</span>
    </span>
    ${actions}
  </div>`;
  const listeChoix = (liste, surChoix) => liste.map(
    (l) => html`<button type="button" class="choix-laine" aria-pressed=${String(l.id === projet.laineId)} onClick=${() => surChoix(l)}>
      <${Pastille} couleur=${l.couleur} taille=${40} />
      <span class="ligne-element-texte">
        <span class="ligne-element-nom">${l.nom}</span>
        <span class="ligne-element-detail">${detailLaineProjet(l)}</span>
      </span>
      ${l.id === projet.laineId && html`<span class="badge">Choisie</span>`}
    </button>`
  );

  return html`
    <div class="titre-section">
      <h2>1. Laine principale</h2>
      ${laine && !changer
        ? html`<button type="button" class="bouton-lien" onClick=${() => setChanger(true)}>Changer</button>`
        : html`<a href="#/reserve/laine/nouvelle">+ Nouvelle</a>`}
    </div>
    ${laines.length === 0 && html`<${Encart} type="brique">Ta réserve n'a pas encore de laine : ajoute celle de ce projet.<//>`}
    ${laine && !changer
      ? html`${ligne(laine, html`<span class="badge badge-sauge">Principale</span>`)}
          <p class="note">Elle donne l'échantillon et l'aiguille.</p>`
      : listeChoix(laines.filter((l) => !ids.includes(l.id) || l.id === projet.laineId), (l) => { setChanger(false); surPrincipale(l); })}
    ${laine && changer && html`<button type="button" class="bouton-lien" onClick=${() => setChanger(false)}>Garder ${laine.nom}</button>`}

    ${laine && html`
      <div class="titre-section">
        <h2 style="font-size:17px">Autres laines du projet</h2>
      </div>
      ${autres.length === 0 && html`<p class="note">Pour des bandes, des sections ou des colonnes d'une autre couleur, ajoute ici les autres laines de ce projet.</p>`}
      ${autres.map((l) => html`
        ${ligne(l, html`<button type="button" class="bouton-lien" aria-label=${`Retirer ${l.nom} du projet`} onClick=${() => retirer(l)}>Retirer</button>`)}
        ${laine.epaisseur && l.epaisseur && l.epaisseur !== laine.epaisseur &&
        html`<${Encart} type="brique">« ${l.nom} » est ${ep(l.epaisseur)}, ta laine principale est ${ep(laine.epaisseur)} : les blocs dans cette laine n'auront pas tout à fait la même taille. Choisis plutôt une laine de même épaisseur.<//>`}`)}
      ${ajouter
        ? html`<div class="sous-liste">
            ${disponibles.length === 0 && html`<p class="note">Toutes les laines de ta réserve sont déjà dans le projet.</p>`}
            ${listeChoix(disponibles, (l) => { setAjouter(false); modifier((p) => avecLaineDuProjet(p, l.id)); })}
            <div class="rangee-boutons">
              <a class="bouton-lien" href="#/reserve/laine/nouvelle">Nouvelle laine</a>
              <button type="button" class="bouton-lien" onClick=${() => setAjouter(false)}>Fermer</button>
            </div>
          </div>`
        : html`<button type="button" class="bouton-secondaire" onClick=${() => setAjouter(true)}>+ Ajouter une laine du projet</button>`}
    `}

    <${Fenetre} ouverte=${!!aRetirer} titre=${aRetirer ? `Retirer « ${aRetirer.nom} » du projet ?` : ""} surFermeture=${() => setARetirer(null)}
      actions=${html`
        <button type="button" class="bouton-principal" onClick=${() => { const id = aRetirer.id; setARetirer(null); modifier((p) => sansLaineDuProjet(p, id)); }}>Retirer</button>
        <button type="button" class="bouton-secondaire" onClick=${() => setARetirer(null)}>Annuler</button>`}>
      <p>${n} bloc${n > 1 ? "s reprendront" : " reprendra"} la laine principale${laine ? ` (« ${laine.nom} »)` : ""}. La laine reste dans ta réserve.</p>
    <//>`;
}
