// Étape 6 : le patron figé (maquette P8), et le suivi des rangs (maquette A-Suivi).
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart, Fenetre, EnTete, BoutonRetour, Pastille } from "../composants/base.js";
import { DessinEcharpe } from "../composants/piece.js";
import { ConfirmerSuppression } from "../composants/suppression.js";
import { pointParId } from "../catalogue/points.js";
import { formaterNombre } from "../donnees/reserve.js";
import { texteDate } from "../donnees/echantillons.js";
import { rangsCondenses, cocherRang, decocherRang, projetVariante, nouveauSuivi } from "../moteur/patron.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const cote = (c) => (c === "E" ? "Côté endroit" : "Côté envers");

/** Charge le projet, son patron et son suivi. */
function usePatron(id) {
  const { base } = useApp();
  const [etat, setEtat] = useState({ charge: false });
  useEffect(() => {
    let actif = true;
    base.lire("projets", id).then(async (projet) => {
      const patron = projet?.patronId ? await base.lire("patrons", projet.patronId) : null;
      let suivi = patron ? await base.lire("suivis", patron.id) : null;
      if (patron && !suivi) suivi = nouveauSuivi(patron);
      if (actif) setEtat({ charge: true, projet, patron, suivi });
    });
    return () => {
      actif = false;
    };
  }, [base, id]);
  const file = useRef(Promise.resolve());
  const majSuivi = (f) => {
    setEtat((e) => {
      const suivi = f(e.suivi);
      file.current = file.current.then(() => base.ecrire("suivis", suivi));
      return { ...e, suivi };
    });
  };
  const majProjet = async (f) => {
    const projet = f(etat.projet);
    await base.ecrire("projets", projet);
    setEtat((e) => ({ ...e, projet }));
  };
  return { ...etat, majSuivi, majProjet };
}

/** Plan minimal reconstruit depuis le patron, pour le dessin. */
const planDuPatron = (patron) => ({
  largeur: { reelleCm: patron.dimensions.largeurCm },
  longueur: { reelleCm: patron.dimensions.longueurCm },
  bandesLaterales: patron.bandesLaterales,
  blocs: patron.blocs,
});

/** Pour les écrans de conception d'un projet dont le patron existe déjà. */
export function PatronDejaCree({ projet }) {
  return html`<main class="ecran">
    <${EnTete} titre=${projet.nom} secours="/" />
    <div class="ecran-contenu">
      <${Encart}>Le patron de ce projet est créé : il est figé. Pour changer quelque chose, duplique-le en variante depuis le patron.<//>
      <button type="button" class="bouton-principal" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/patron`, { remplacer: true })}>Voir le patron</button>
    </div>
  </main>`;
}

function Lignes({ rang, abreviations, grand = false }) {
  const lignes = abreviations ? rang.lignesAbregees : rang.lignes;
  return html`<ul class=${"lignes-rang" + (grand ? " grand" : "")}>
    ${lignes.map((l) => html`<li class=${"ligne-" + l.zone}>
      ${l.etiquette && html`<span class="ligne-etiquette">${l.etiquette}</span>`}
      <span>${l.couleur && html`<${Pastille} couleur=${l.couleur} taille=${14} />`}${l.texte}${l.texte.endsWith(".") ? "" : "."}</span>
    </li>`)}
  </ul>`;
}

function Technique({ code, patron }) {
  const t = patron.techniques[code];
  if (!t) return null;
  return html`<div class="astuce">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
    <span><strong>${t.titre} :</strong> ${t.explication}</span>
  </div>`;
}

// ---------------- Patron figé ----------------

export function EcranPatron({ id }) {
  const { base, prefs, flash } = useApp();
  const { charge, projet, patron, suivi } = usePatron(id);
  const [technique, setTechnique] = useState(null);
  const [coches, setCoches] = useState({});
  const [supprimer, setSupprimer] = useState(false);

  if (!charge) return null;
  if (!projet || !patron) {
    return html`<main class="ecran"><${EnTete} titre="Patron introuvable" secours="/" />
      <div class="ecran-contenu"><p>Ce patron n'existe plus.</p></div></main>`;
  }
  const couleur = patron.laine?.couleur || COULEUR_PAR_DEFAUT;
  const total = patron.rangs.length;
  const faits = suivi?.rangsFaits || 0;
  const corps = patron.points[patron.projet.pointPrincipal];
  const codesTechniques = [
    "montage", "lisiere",
    ...[...new Set(patron.rangs.flatMap((r) => r.techniques))].filter((c) => c !== "lisiere"),
    "rabattage", "fils", "blocage",
  ].filter((c, i, t) => patron.techniques[c] && t.indexOf(c) === i);

  async function dupliquer() {
    const variante = await base.ecrire("projets", projetVariante(patron));
    flash("Variante créée : modifie-la librement.");
    naviguer(`/projet/${encodeURIComponent(variante.id)}/builder`);
  }

  return html`
    <main class="ecran">
      <header class="ecran-entete">
        <div class="ecran-entete-ligne">
          <${BoutonRetour} secours="/" libelle="Mes tricots" />
          <div class="entete-etape">
            <h1 class="entete-etape-titre">${patron.nom}</h1>
            <span class="entete-fige">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg>
              ${projet.statut === "termine" ? "Terminé" : "Patron validé, figé"}${patron.approximatif ? " · tailles approximatives" : ""}
            </span>
          </div>
        </div>
      </header>
      <div class="ecran-contenu">
        <div class="recap-patron">
          <div class="recap-dessin">
            <${DessinEcharpe} projet=${patron.projet} plan=${planDuPatron(patron)} couleur=${couleur} laines=${patron.laines || []} orientation="verticale"
              longueurVerticalePx=${170} prefixe="patron" echelleTexture=${0.3} libelle=${patron.resume} />
          </div>
          <div class="recap-texte">
            <strong>${formaterNombre(patron.dimensions.largeurCm, 0)} × ${formaterNombre(patron.dimensions.longueurCm, 0)} cm</strong>
            <span>Aiguilles ${formaterNombre(patron.aiguilles.tailleMm, 2)} mm${patron.aiguilles.cableCm ? `, câble ${formaterNombre(patron.aiguilles.cableCm, 0)} cm` : ""}, tricot à plat</span>
            ${patron.laines?.length > 1
              ? html`<span class="liste-laines">${patron.laines.map((l) => html`<span><${Pastille} couleur=${l.couleur} taille=${12} />${l.nom}${l.metres ? ` · environ ${l.metres} m` : ""}</span>`)}</span>`
              : patron.laine && html`<span>${patron.laine.nom}${patron.metrage ? ` · environ ${patron.metrage.metres} m${patron.laineSuffit?.disponible ? ` sur ${patron.laineSuffit.disponible} m` : ""}` : ""}</span>`}
            <span>${patron.echantillon
              ? `Échantillon en ${minuscule(pointParId(patron.echantillon.pointId)?.nom || patron.echantillon.pointId)} : ${formaterNombre(patron.echantillon.maillesPour10cm)} mailles × ${formaterNombre(patron.echantillon.rangsPour10cm)} rangs = 10 cm`
              : patron.densiteCorps ? `Estimé : ${formaterNombre(patron.densiteCorps.mailles)} mailles × ${formaterNombre(patron.densiteCorps.rangs)} rangs = 10 cm` : ""}</span>
          </div>
        </div>
        ${patron.approximatif &&
        html`<${Encart} type="brique">Tailles approximatives : le patron a été calculé sans échantillon tricoté dans le point du corps. Mesure ton tricot après une quinzaine de centimètres : le suivi indique la longueur attendue à chaque rang.<//>`}
        <p class="note">${patron.resume}</p>

        <h2 style="font-size:18px">Les étapes</h2>
        <ol class="etapes-patron">
          ${patron.etapes.map((e, i) => html`<li>
            <details>
              <summary>
                <span class="etape-numero">${i + 1}</span>
                <span class="etape-texte"><strong>${e.titre}</strong><span>${e.detail}</span></span>
              </summary>
              <div class="etape-corps">
                ${e.cle === "materiel" &&
                html`${e.liste.map((x, j) => html`<label class="case"><input type="checkbox" checked=${!!coches[j]}
                  onChange=${(ev) => setCoches({ ...coches, [j]: ev.currentTarget.checked })} /> ${x}</label>`)}`}
                ${e.texte && html`<p>${e.texte}</p>`}
                ${(e.techniques || []).map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
                ${e.cle === "bloc" && html`<${RangsDuBloc} patron=${patron} bloc=${patron.blocs.find((b) => b.id === e.blocId)} abreviations=${prefs.abreviations} />`}
              </div>
            </details>
          </li>`)}
        </ol>

        <div class="titre-section"><h2 style="font-size:16px">Techniques utilisées, expliquées en chemin</h2></div>
        <div class="puces">
          ${codesTechniques.map((c) => html`<button type="button" class="etiquette-technique" onClick=${() => setTechnique(c)}>${patron.techniques[c].titre}</button>`)}
        </div>

        ${patron.explications.length > 0 &&
        html`<details class="ajustements">
          <summary>Ajustements faits par l'outil (${patron.explications.length})</summary>
          ${patron.explications.map((e) => html`<p class="note">${e.charAt(0).toUpperCase() + e.slice(1)}${e.endsWith(".") ? "" : "."}</p>`)}
        </details>`}
        ${corps?.source && html`<p class="note">Le point du corps vient des Triconautes : <a href=${corps.source} target="_blank" rel="noopener">voir l'article et la vidéo</a> (il faut du réseau).</p>`}
        <p class="note">Patron créé le ${texteDate(patron.creeLe.slice(0, 10))}, vérifié rang par rang par l'outil : ${total} rangs.</p>
        <button type="button" class="bouton-lien bouton-danger" onClick=${() => setSupprimer(true)}>Supprimer ce projet</button>
      </div>

      <div class="ecran-pied ecran-pied-pile">
        ${projet.statut !== "termine" &&
        html`<button type="button" class="bouton-principal" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/suivi`)}>
          ${faits === 0 ? "Commencer le suivi des rangs" : faits >= total ? "Terminer l'écharpe" : `Reprendre au rang ${faits + 1}`}
        </button>`}
        <button type="button" class="bouton-secondaire" onClick=${dupliquer}>Dupliquer en variante</button>
      </div>

      <${ConfirmerSuppression} projet=${supprimer ? projet : null} suivi=${suivi}
        surFermeture=${() => setSupprimer(false)}
        surSuppression=${() => naviguer("/", { remplacer: true })} />

      <${Fenetre} ouverte=${!!technique} titre=${technique ? patron.techniques[technique].titre : ""} surFermeture=${() => setTechnique(null)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setTechnique(null)}>Fermer</button>`}>
        ${technique && html`<p>${patron.techniques[technique].explication}</p>`}
      <//>
    </main>`;
}

function RangsDuBloc({ patron, bloc, abreviations }) {
  if (!bloc) return null;
  return html`<div class="rangs-bloc">
    ${rangsCondenses(patron, bloc).map((x) =>
      x.rang
        ? html`<div class="rang-court">
            <div class="rang-court-titre"><strong>Rang ${x.rang.numero}</strong><span>${x.rang.cote === "E" ? "endroit" : "envers"} · ${x.rang.mailles} m.</span></div>
            <${Lignes} rang=${x.rang} abreviations=${abreviations} />
            ${x.rang.techniques.filter((c) => c !== "lisiere").map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
          </div>`
        : html`<p class="repete">Répète ${x.repete.de === x.repete.a ? `le rang ${x.repete.de}` : `les rangs ${x.repete.de} à ${x.repete.a}`} jusqu'au rang ${x.repete.jusqua} (${x.repete.rangs} rangs de plus).</p>`
    )}
  </div>`;
}

// ---------------- Suivi des rangs ----------------

/** Garde l'écran allumé tant que le suivi est ouvert (si le navigateur le permet). */
function useEcranAllume() {
  useEffect(() => {
    let verrou = null;
    let actif = true;
    const demander = async () => {
      try {
        if (actif && document.visibilityState === "visible" && navigator.wakeLock) verrou = await navigator.wakeLock.request("screen");
      } catch {
        /* refusé (économie d'énergie) : tant pis */
      }
    };
    demander();
    const surVisibilite = () => document.visibilityState === "visible" && demander();
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", surVisibilite);
      verrou?.release().catch(() => {});
    };
  }, []);
}

export function EcranSuivi({ id }) {
  const { prefs, flash } = useApp();
  const { charge, projet, patron, suivi, majSuivi, majProjet } = usePatron(id);
  const [aide, setAide] = useState(false);
  useEcranAllume();

  if (!charge) return null;
  if (!projet || !patron) {
    return html`<main class="ecran"><${EnTete} titre="Patron introuvable" secours="/" /></main>`;
  }
  const total = patron.rangs.length;
  const faits = Math.min(suivi.rangsFaits, total);
  const rang = patron.rangs[faits];
  const suivant = patron.rangs[faits + 1];
  const precedent = faits > 0 ? patron.rangs[faits - 1] : null;
  const pourcent = Math.floor((faits / total) * 100);
  const ab = prefs.abreviations;
  const fini = faits >= total;
  const montage = patron.etapes.find((e) => e.cle === "montage");
  const rabattage = patron.etapes.find((e) => e.cle === "rabattage");
  const finitions = patron.etapes.find((e) => e.cle === "finitions");

  async function terminer() {
    await majProjet((p) => ({ ...p, statut: "termine", termineLe: new Date().toISOString() }));
    majSuivi((s) => ({ ...s, termine: true }));
    flash("Bravo, ton écharpe est terminée !");
    naviguer("/reglages?sauvegarde=1", { remplacer: true });
  }

  return html`
    <main class="ecran ecran-suivi">
      <header class="ecran-entete">
        <div class="suivi-entete">
          <${BoutonRetour} secours="/" libelle="Mes tricots" />
          <h1 class="suivi-titre">${patron.nom}</h1>
          <button type="button" class="bouton-rond" aria-label="Voir le patron complet" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/patron`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h10"></path></svg>
          </button>
        </div>
        <div class="suivi-progression">
          <div class="jauge-ligne"><strong>${fini ? `Les ${total} rangs sont tricotés` : `Rang ${faits + 1} sur ${total}`}</strong><span>${pourcent} %</span></div>
          <div class="jauge-barre" role="progressbar" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${faits} aria-label="Rangs tricotés">
            <div class="jauge-plein suivi-plein" style=${`width:${pourcent}%`}></div>
          </div>
        </div>
      </header>

      <div class="ecran-contenu">
        ${precedent && html`<div class="rang-fait">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>
          <span>Rang ${precedent.numero} · fait</span>
        </div>`}

        ${faits === 0 && montage &&
        html`<div class="carte-etape-suivi">
          <strong>Avant le rang 1 : le montage</strong>
          <p>${montage.texte}</p>
          <${Technique} code="montage" patron=${patron} />
        </div>`}

        ${!fini && rang &&
        html`<section class="carte-rang" aria-live="polite" aria-labelledby="titre-rang">
          ${rang.debutBloc && html`<span class="debut-bloc">Nouveau bloc : ${rang.nomBloc}</span>`}
          <div class="carte-rang-titre">
            <h2 id="titre-rang">Rang ${rang.numero}</h2>
            <span class="carte-rang-cote">${cote(rang.cote)}</span>
          </div>
          <${Lignes} rang=${rang} abreviations=${ab} grand=${true} />
          <div class="puces carte-rang-reperes">
            <span class="etiquette">${rang.repere}</span>
            ${rang.laineId && patron.laines?.length > 1 &&
            html`<span class="etiquette etiquette-laine"><${Pastille} couleur=${patron.laines.find((l) => l.id === rang.laineId)?.couleur} taille=${12} />${patron.laines.find((l) => l.id === rang.laineId)?.nom}</span>`}
            <span class="etiquette">${rang.mailles} mailles</span>
            <span class="etiquette">≈ ${formaterNombre(rang.longueurCm, 0)} cm tricotés à la fin du rang</span>
          </div>
          ${rang.techniques.map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
          <button type="button" class="bouton-lien" onClick=${() => setAide(true)}>Un doute sur un geste de ce rang ?</button>
        </section>`}

        ${!fini && suivant &&
        html`<div class="rang-suivant">
          <span class="rang-suivant-titre">Ensuite · rang ${suivant.numero}${suivant.debutBloc ? ` · ${suivant.nomBloc}` : ""}</span>
          <span>${suivant.commeLeRang
            ? `Comme le rang ${suivant.commeLeRang}.`
            : (ab ? suivant.lignesAbregees : suivant.lignes).filter((l) => l.zone !== "lisiere").map((l) => l.texte).join(" · ")}</span>
        </div>`}
        ${!fini && !suivant && html`<div class="rang-suivant"><span class="rang-suivant-titre">Ensuite</span><span>Le rabattage : c'est le dernier rang !</span></div>`}

        ${fini &&
        html`<div class="carte-etape-suivi">
          <strong>Rabattage</strong>
          <p>${rabattage.texte}</p>
          <${Technique} code="rabattage" patron=${patron} />
        </div>
        <div class="carte-etape-suivi">
          <strong>Finitions</strong>
          <p>${finitions.texte}</p>
          <${Technique} code="fils" patron=${patron} />
          <${Technique} code="blocage" patron=${patron} />
        </div>`}
      </div>

      <div class="ecran-pied ecran-pied-pile suivi-pied">
        ${fini
          ? html`<button type="button" class="bouton-principal bouton-rang" onClick=${terminer}>Marquer comme terminé</button>`
          : html`<button type="button" class="bouton-principal bouton-rang" onClick=${() => majSuivi((s) => cocherRang(s, total))}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>
              Rang ${rang.numero} terminé
            </button>`}
        ${faits > 0 &&
        html`<button type="button" class="bouton-lien bouton-retour-rang" onClick=${() => majSuivi(decocherRang)}>Revenir au rang ${faits}</button>`}
      </div>

      <${Fenetre} ouverte=${aide} titre="Les gestes de ce rang" surFermeture=${() => setAide(false)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setAide(false)}>Fermer</button>`}>
        ${aide && rang && html`<${GestesDuRang} rang=${rang} patron=${patron} />`}
      <//>
    </main>`;
}

/** Les explications des gestes du rang en cours (lisière comprise). */
function GestesDuRang({ rang, patron }) {
  const utiles = ["lisiere", ...(rang.gestes || [])].filter((c, i, t) => patron.techniques[c] && t.indexOf(c) === i);
  return html`${utiles.map((c) => html`<${Technique} code=${c} patron=${patron} />`)}`;
}
