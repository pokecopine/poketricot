// Étape 6 : le patron figé (maquette P8), et le suivi des rangs (maquette A-Suivi).
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart, Fenetre, EnTete, BoutonRetour, Pastille } from "../composants/base.js";
import { DessinEcharpe, DessinSnood, DessinBonnet } from "../composants/piece.js";
import { ConfirmerSuppression } from "../composants/suppression.js";
import { pointParId } from "../catalogue/points.js";
import { nomSource } from "./points.js";
import { formaterNombre } from "../donnees/reserve.js";
import { texteDate } from "../donnees/echantillons.js";
import { rangsCondenses, cocherRang, decocherRang, projetVariante, nouveauSuivi, pasDuSuivi, positionSuivi, nomExemplaire } from "../moteur/patron.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";
const minuscule = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const majuscule = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const cote = (c) => (c === "E" ? "Côté endroit" : "Côté envers");

/** Vocabulaire du patron : « rang » à plat, « tour » en rond. */
const motsDe = (patron) => (patron?.type === "jambieres"
  ? patron.mode === "rond"
    ? { Rang: "Tour", rang: "tour", rangs: "tours", piece: "les jambières", Piece: "Les jambières", ton: "tes jambières" }
    : { Rang: "Rang", rang: "rang", rangs: "rangs", piece: "les jambières", Piece: "Les jambières", ton: "tes jambières" }
  : patron?.type === "bonnet"
  ? { Rang: "Tour", rang: "tour", rangs: "tours", piece: "le bonnet", Piece: "Le bonnet", ton: "ton bonnet" }
  : patron?.mode === "rond"
  ? { Rang: "Tour", rang: "tour", rangs: "tours", piece: "le snood", Piece: "Le snood", ton: "ton snood" }
  : { Rang: "Rang", rang: "rang", rangs: "rangs", piece: "l'écharpe", Piece: "L'écharpe", ton: "ton écharpe" });

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
  sommet: patron.sommet,
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
  const pas = pasDuSuivi(patron);
  const faits = suivi?.rangsFaits || 0;
  const position = positionSuivi(patron, faits);
  const corps = patron.points[patron.projet.pointPrincipal];
  const mots = motsDe(patron);
  const rond = patron.mode === "rond";
  const codesTechniques = [
    "montage", "joindre", "lisiere",
    ...[...new Set(patron.rangs.flatMap((r) => r.techniques))].filter((c) => c !== "lisiere"),
    "rabattage", "matelas", "fermeture", "pompon", "fils", "blocage",
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
            ${patron.type === "jambieres"
              ? html`<${DessinSnood} projet=${patron.projet} plan=${planDuPatron(patron)} couleur=${couleur} laines=${patron.laines || []}
                  largeurPx=${100} hauteurMinPx=${90} hauteurMaxPx=${130} prefixe="patron" echelleTexture=${0.3} reperes=${false} couture=${patron.mode === "plat"} libelle=${patron.resume} />`
              : patron.type === "bonnet"
              ? html`<${DessinBonnet} projet=${patron.projet} plan=${planDuPatron(patron)} couleur=${couleur} laines=${patron.laines || []}
                  largeurPx=${120} hauteurMinPx=${50} hauteurMaxPx=${80} prefixe="patron" echelleTexture=${0.3} reperes=${false} libelle=${patron.resume} />`
              : rond
              ? html`<${DessinSnood} projet=${patron.projet} plan=${planDuPatron(patron)} couleur=${couleur} laines=${patron.laines || []}
                  largeurPx=${120} hauteurMinPx=${60} hauteurMaxPx=${110} prefixe="patron" echelleTexture=${0.3} reperes=${false} libelle=${patron.resume} />`
              : html`<${DessinEcharpe} projet=${patron.projet} plan=${planDuPatron(patron)} couleur=${couleur} laines=${patron.laines || []} orientation="verticale"
                  longueurVerticalePx=${170} prefixe="patron" echelleTexture=${0.3} libelle=${patron.resume} />`}
          </div>
          <div class="recap-texte">
            <strong>${patron.type === "jambieres"
              ? `${formaterNombre(patron.dimensions.largeurCm, 0)} cm de tour × ${formaterNombre(patron.dimensions.longueurCm, 0)} cm`
              : rond
              ? `${formaterNombre(patron.dimensions.largeurCm, 0)} cm de tour × ${formaterNombre(patron.dimensions.longueurCm, 0)} cm`
              : `${formaterNombre(patron.dimensions.largeurCm, 0)} × ${formaterNombre(patron.dimensions.longueurCm, 0)} cm`}</strong>
            ${patron.exemplaires > 1 && html`<span><strong>À tricoter ${patron.exemplaires} fois</strong> : une paire</span>`}
            <span>Aiguilles ${formaterNombre(patron.aiguilles.tailleMm, 2)} mm${patron.aiguilles.cableCm ? `, câble ${formaterNombre(patron.aiguilles.cableCm, 0)} cm` : ""}, tricot ${patron.type === "jambieres" ? (rond ? "en magic loop" : "à plat, avec une couture") : rond ? "en rond" : "à plat"}</span>
            ${patron.laines?.length > 1
              ? html`<span class="liste-laines">${patron.laines.map((l) => html`<span><${Pastille} couleur=${l.couleur} taille=${12} />${l.nom}${l.metres ? ` · environ ${l.metres} m` : ""}</span>`)}</span>`
              : patron.laine && html`<span>${patron.laine.nom}${patron.metrage ? ` · environ ${patron.metrage.metres} m${patron.laineSuffit?.disponible ? ` sur ${patron.laineSuffit.disponible} m` : ""}` : ""}</span>`}
            <span>${patron.echantillon
              ? `Échantillon en ${minuscule(pointParId(patron.echantillon.pointId)?.nom || patron.echantillon.pointId)} : ${formaterNombre(patron.echantillon.maillesPour10cm)} mailles × ${formaterNombre(patron.echantillon.rangsPour10cm)} rangs = 10 cm`
              : patron.densiteCorps ? `Estimé : ${formaterNombre(patron.densiteCorps.mailles)} mailles × ${formaterNombre(patron.densiteCorps.rangs)} rangs = 10 cm` : ""}</span>
          </div>
        </div>
        ${patron.approximatif &&
        html`<${Encart} type="brique">Tailles approximatives : le patron a été calculé sans échantillon tricoté dans le point du corps. Mesure ton tricot après ${rond ? "quelques" : "une quinzaine de"} centimètres : le suivi indique la longueur attendue à chaque ${mots.rang}.<//>`}
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
                ${e.cle === "bloc" && html`<${RangsDuBloc} patron=${patron} bloc=${patron.blocs.find((b) => b.id === e.blocId)} abreviations=${prefs.abreviations} mots=${mots} />`}
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
        ${corps?.source && html`<p class="note">Le point du corps vient ${nomSource(corps.source) === "Les Triconautes" ? "des Triconautes" : `du site ${nomSource(corps.source)}`} : <a href=${corps.source} target="_blank" rel="noopener">voir l'article et la vidéo</a> (il faut du réseau).</p>`}
        <p class="note">Patron créé le ${texteDate(patron.creeLe.slice(0, 10))}, vérifié ${mots.rang} par ${mots.rang} par l'outil : ${total} ${mots.rangs}${pas > total ? `, à tricoter ${patron.exemplaires} fois` : ""}.</p>
        <button type="button" class="bouton-lien bouton-danger" onClick=${() => setSupprimer(true)}>Supprimer ce projet</button>
      </div>

      <div class="ecran-pied ecran-pied-pile">
        ${projet.statut !== "termine" &&
        html`<button type="button" class="bouton-principal" onClick=${() => naviguer(`/projet/${encodeURIComponent(projet.id)}/suivi`)}>
          ${faits === 0 ? `Commencer le suivi des ${mots.rangs}` : faits >= pas ? `Terminer ${mots.piece}`
            : position.pause ? `Reprendre : fin de la ${nomExemplaire(position.exemplaire)}`
            : `Reprendre au ${mots.rang} ${position.index + 1}${pas > total ? ` (${nomExemplaire(position.exemplaire)})` : ""}`}
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

function RangsDuBloc({ patron, bloc, abreviations, mots }) {
  if (!bloc) return null;
  return html`<div class="rangs-bloc">
    ${rangsCondenses(patron, bloc).map((x) =>
      x.rang
        ? html`<div class="rang-court">
            <div class="rang-court-titre"><strong>${mots.Rang} ${x.rang.numero}</strong><span>${x.rang.cote === "E" ? "endroit" : "envers"} · ${x.rang.mailles} m.</span></div>
            <${Lignes} rang=${x.rang} abreviations=${abreviations} />
            ${x.rang.techniques.filter((c) => c !== "lisiere").map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
          </div>`
        : html`<p class="repete">Répète ${x.repete.de === x.repete.a ? `le ${mots.rang} ${x.repete.de}` : `les ${mots.rangs} ${x.repete.de} à ${x.repete.a}`} jusqu'au ${mots.rang} ${x.repete.jusqua} (${x.repete.rangs} ${mots.rangs} de plus)${x.repete.marqueur ? ", en déplaçant le marqueur comme indiqué : le suivi le rappelle à chaque tour concerné" : ""}.</p>`
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
  // Jambières (0.19.0) : le patron se tricote 2 fois, avec une pause entre les deux (rabattage, couture à plat).
  const n = patron.rangs.length;
  const total = pasDuSuivi(patron);
  const paire = total > n;
  const faits = Math.min(suivi.rangsFaits, total);
  const pos = positionSuivi(patron, faits);
  const fini = pos.fini;
  const pause = pos.pause;
  const rang = fini || pause ? null : patron.rangs[pos.index];
  const suivant = rang ? patron.rangs[pos.index + 1] : null;
  const precedent = pos.index > 0 ? patron.rangs[pos.index - 1] : null;
  const pourcent = Math.floor((faits / total) * 100);
  const ab = prefs.abreviations;
  const montage = patron.etapes.find((e) => e.cle === "montage");
  const rabattage = patron.etapes.find((e) => e.cle === "rabattage");
  const assemblage = patron.etapes.find((e) => e.cle === "assemblage");
  const finitions = patron.etapes.find((e) => e.cle === "finitions");
  const pompon = patron.etapes.find((e) => e.cle === "pompon");
  const mots = motsDe(patron);
  const rond = patron.mode === "rond";
  const ex = nomExemplaire(pos.exemplaire);

  async function terminer() {
    await majProjet((p) => ({ ...p, statut: "termine", termineLe: new Date().toISOString() }));
    majSuivi((s) => ({ ...s, termine: true }));
    flash(patron.type === "jambieres" ? "Bravo, tes jambières sont terminées !" : patron.type === "bonnet" ? "Bravo, ton bonnet est terminé !" : rond ? "Bravo, ton snood est terminé !" : "Bravo, ton écharpe est terminée !");
    naviguer("/reglages?sauvegarde=1", { remplacer: true });
  }

  const titreProgression = fini
    ? paire ? `Les ${patron.exemplaires} jambières sont tricotées` : `Les ${n} ${mots.rangs} sont tricotés`
    : pause ? `${majuscule(ex)} · terminée`
    : `${paire ? `${majuscule(ex)} · ` : ""}${mots.Rang} ${pos.index + 1} sur ${n}`;
  const retourTexte = pause || fini ? `Revenir au ${mots.rang} ${n}` : pos.index === 0 ? `Revenir à la fin de la ${nomExemplaire(pos.exemplaire - 1)}` : `Revenir au ${mots.rang} ${pos.index}`;

  const carteRabattage = html`<div class="carte-etape-suivi">
    <strong>${patron.type === "bonnet" ? `Après le ${mots.rang} ${n} : ${minuscule(rabattage.titre)}` : paire ? `Après le ${mots.rang} ${n} : le rabattage` : "Rabattage"}</strong>
    <p>${rabattage.texte}${pompon ? " Puis : le pompon." : ""}</p>
    ${(rabattage.techniques || ["rabattage"]).map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
  </div>`;
  const carteAssemblage = assemblage && html`<section class="carte-rang" aria-labelledby="titre-assemblage">
    <div class="carte-rang-titre">
      <h2 id="titre-assemblage">Assemblage</h2>
      <span class="carte-rang-cote">${ex}</span>
    </div>
    <ul class="lignes-rang grand"><li class="ligne-corps"><span>${assemblage.texte}</span></li></ul>
    <div class="puces carte-rang-reperes">
      <span class="etiquette">Point de matelas</span>
      <span class="etiquette">Endroit vers toi</span>
      <span class="etiquette">${n} rangs à coudre</span>
    </div>
    ${(assemblage.techniques || []).map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
  </section>`;

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
          <div class="jauge-ligne"><strong>${titreProgression}</strong><span>${pourcent} %</span></div>
          <div class="jauge-barre" role="progressbar" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${faits} aria-label=${rond ? "Tours tricotés" : "Rangs tricotés"}>
            <div class="jauge-plein suivi-plein" style=${`width:${pourcent}%`}></div>
          </div>
        </div>
      </header>

      <div class="ecran-contenu">
        ${(precedent || pause || fini) && html`<div class="rang-fait">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>
          <span>${mots.Rang} ${pause || fini ? n : precedent.numero} · fait</span>
        </div>`}

        ${pos.index === 0 && !pause && !fini && montage &&
        html`<div class="carte-etape-suivi">
          <strong>${paire ? `${majuscule(ex)} · avant le ${mots.rang} 1 : le montage` : `Avant le ${mots.rang} 1 : le montage`}</strong>
          <p>${montage.texte}</p>
          <${Technique} code="montage" patron=${patron} />
          ${patron.techniques.magicLoop && html`<${Technique} code="magicLoop" patron=${patron} />`}
          ${rond && html`<${Technique} code="joindre" patron=${patron} />`}
        </div>`}

        ${rang &&
        html`<section class="carte-rang" aria-live="polite" aria-labelledby="titre-rang">
          ${rang.debutBloc && html`<span class="debut-bloc">Nouveau bloc : ${rang.nomBloc}</span>`}
          <div class="carte-rang-titre">
            <h2 id="titre-rang">${mots.Rang} ${rang.numero}</h2>
            <span class="carte-rang-cote">${rang.sommet ? (rang.sommet.diminution ? "sommet · diminutions" : "sommet") : rond ? "sur l'endroit" : cote(rang.cote)}</span>
          </div>
          <${Lignes} rang=${rang} abreviations=${ab} grand=${true} />
          <div class="puces carte-rang-reperes">
            ${paire && html`<span class="etiquette">${majuscule(ex)}</span>`}
            <span class="etiquette">${rang.repere}</span>
            ${rang.sommet?.diminution && html`<span class="etiquette">${rang.sommet.avant} → ${rang.sommet.apres} mailles</span>`}
            ${rang.intarsia && html`<span class="etiquette">Intarsia : une petite pelote par colonne</span>`}
            ${!rang.intarsia && rang.laineId && patron.laines?.length > 1 &&
            html`<span class="etiquette etiquette-laine"><${Pastille} couleur=${patron.laines.find((l) => l.id === rang.laineId)?.couleur} taille=${12} />${patron.laines.find((l) => l.id === rang.laineId)?.nom}</span>`}
            ${!rang.sommet?.diminution && html`<span class="etiquette">${rang.mailles} mailles</span>`}
            <span class="etiquette">≈ ${formaterNombre(rang.longueurCm, 0)} cm tricotés à la fin du ${mots.rang}</span>
          </div>
          ${pos.exemplaire === 1 && rang.techniques.map((c) => html`<${Technique} code=${c} patron=${patron} />`)}
          <button type="button" class="bouton-lien" onClick=${() => setAide(true)}>Un doute sur un geste de ce ${mots.rang} ?</button>
        </section>`}

        ${rang && suivant &&
        html`<div class="rang-suivant">
          <span class="rang-suivant-titre">Ensuite · ${mots.rang} ${suivant.numero}${suivant.debutBloc ? ` · ${suivant.nomBloc}` : ""}</span>
          <span>${suivant.commeLeRang
            ? `Comme le ${mots.rang} ${suivant.commeLeRang}.`
            : (ab ? suivant.lignesAbregees : suivant.lignes).filter((l) => l.zone !== "lisiere").map((l) => l.texte).join(" · ")}</span>
        </div>`}
        ${rang && !suivant && html`<div class="rang-suivant"><span class="rang-suivant-titre">Ensuite</span><span>${patron.type === "bonnet" ? `La fermeture du sommet : c'est le dernier ${mots.rang} !` : `Le rabattage : c'est le dernier ${mots.rang}${paire ? ` de la ${ex}` : ""} !`}</span></div>`}

        ${pause && html`
          ${carteRabattage}
          ${carteAssemblage}
          <div class="rang-suivant">
            <span class="rang-suivant-titre">Ensuite · ${nomExemplaire(pos.exemplaire + 1)}</span>
            <span>On repart au ${mots.rang} 1 : monte ${patron.montage.mailles} mailles${assemblage && patron.couture ? `, en gardant un fil d'environ ${formaterNombre(patron.couture.filCm / 100, 1)} m pour la couture` : ""}.</span>
          </div>`}

        ${fini &&
        html`${carteRabattage}
        ${carteAssemblage}
        ${pompon && html`<div class="carte-etape-suivi">
          <strong>${pompon.titre}</strong>
          <p>${pompon.texte}</p>
          <${Technique} code="pompon" patron=${patron} />
        </div>`}
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
          : pause
          ? html`<button type="button" class="bouton-principal bouton-rang" onClick=${() => majSuivi((s) => cocherRang(s, total))}>
              ${assemblage ? "Couture terminée" : `${majuscule(ex)} terminée`}
            </button>`
          : html`<button type="button" class="bouton-principal bouton-rang" onClick=${() => majSuivi((s) => cocherRang(s, total))}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>
              ${mots.Rang} ${rang.numero} terminé
            </button>`}
        ${faits > 0 &&
        html`<button type="button" class="bouton-lien bouton-retour-rang" onClick=${() => majSuivi(decocherRang)}>${retourTexte}</button>`}
      </div>

      <${Fenetre} ouverte=${aide} titre=${`Les gestes de ce ${mots.rang}`} surFermeture=${() => setAide(false)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setAide(false)}>Fermer</button>`}>
        ${aide && rang && html`<${GestesDuRang} rang=${rang} patron=${patron} />`}
      <//>
    </main>`;
}

/** Les explications des gestes du rang en cours (lisière comprise). */
function GestesDuRang({ rang, patron }) {
  const utiles = ["lisiere", ...(rang.marqueur ? ["marqueur"] : []), ...(rang.gestes || [])].filter((c, i, t) => patron.techniques[c] && t.indexOf(c) === i);
  return html`${utiles.map((c) => html`<${Technique} code=${c} patron=${patron} />`)}`;
}
