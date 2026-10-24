// Étape 2 : mon matériel (maquettes 3 et 3b) — laine, aiguilles, point principal, échantillon.
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart, Pastille } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { pointParId } from "../catalogue/points.js";
import { etiquettesProprietes } from "../catalogue/fiche.js";
import { trierLaines, trierAiguilles, titreAiguilles, lireNombre, formaterNombre } from "../donnees/reserve.js";
import { texteDate, estPese } from "../donnees/echantillons.js";
import {
  cheminEtape, detailLaineProjet, conseilAiguille, echantillonDuProjet, materielManquant, nomPropose, avisPointPrincipal,
} from "../donnees/projets.js";
import { densiteJerseyProvisoire } from "../moteur/densite.js";

export function EtapeMateriel({ id }) {
  const { flash } = useApp();
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;

  const listeLaines = trierLaines(laines.filter((l) => !l.archivee || l.id === projet.laineId));
  const listeAiguilles = trierAiguilles(aiguilles.filter((a) => !a.archivee || a.id === projet.aiguillesId));
  const laine = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const point = pointParId(projet.pointPrincipal);
  const echantillon = echantillonDuProjet(projet, aig, echantillons);
  const conseil = laine && aig ? conseilAiguille(laine, aig.tailleMm) : null;
  const taille = lireNombre(aig?.tailleMm);

  const choisirLaine = (l) =>
    modifier((p) => ({ ...p, laineId: l.id, echantillonId: "", nom: p.nomAuto ? nomPropose(p.type, l) : p.nom }));
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
        <div class="titre-section">
          <h2>1. Laine, dans ma réserve</h2>
          <a href="#/reserve/laine/nouvelle">+ Nouvelle</a>
        </div>
        ${listeLaines.length === 0 && html`<${Encart} type="brique">Ta réserve n'a pas encore de laine : ajoute celle de ce projet.<//>`}
        ${listeLaines.map(
          (l) => html`<button type="button" class="choix-laine" aria-pressed=${String(l.id === projet.laineId)} onClick=${() => choisirLaine(l)}>
            <${Pastille} couleur=${l.couleur} taille=${40} />
            <span class="ligne-element-texte">
              <span class="ligne-element-nom">${l.nom}</span>
              <span class="ligne-element-detail">${detailLaineProjet(l)}</span>
            </span>
            ${l.id === projet.laineId && html`<span class="badge">Choisie</span>`}
          </button>`
        )}

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
        ${conseil && html`<${Encart} type=${conseil.ok ? "sauge" : "brique"}>${conseil.texte}<//>`}

        <div class="titre-section">
          <h2>3. Point principal</h2>
          ${point && html`<a href=${`#/projet/${encodeURIComponent(projet.id)}/point/corps`}>Changer</a>`}
        </div>
        ${point
          ? html`<${CartePointPrincipal} point=${point} couleur=${laine?.couleur || "#D07E5B"} type=${projet.type} />`
          : html`<button type="button" class="bouton-secondaire" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/point/corps`)}>
              Choisir le point principal
            </button>
            <p class="note">C'est le point du corps de l'écharpe : ton échantillon se tricote dans ce point.</p>`}

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
          ? html`<span class="note">Conseillé pour une écharpe. C'est le point du corps : ton échantillon se tricote dans ce point.</span>`
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
      ${projet.sansEchantillon ? "✓ Je continue sans échantillon pour l'instant" : "Continuer sans échantillon pour l'instant"}
    </button>
    ${projet.sansEchantillon &&
    html`<${Encart} type="brique">${provisoire
      ? `Dimensions estimées d'après ${provisoire.origine === "etiquette" ? `l'étiquette (${formaterNombre(provisoire.mailles)} mailles en jersey)` : "l'épaisseur de la laine"}. Le patron demandera ton vrai échantillon.`
      : "Sans échantillon ni étiquette, l'outil ne peut pas estimer les dimensions : indique l'échantillon de l'étiquette dans ta laine, ou tricote ton échantillon."}<//>`}
  </div>`;
}
