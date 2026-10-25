// Démarrage de l'application : base de données, préférences, navigation, mises à jour.
import { render } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { html } from "./html.js";
import { ouvrirBase, demanderStockagePersistant } from "./donnees/db.js";
import { ContexteApp, PREFERENCES_PAR_DEFAUT, ID_PREFERENCES, appliquerPreferencesAffichage } from "./etat.js";
import { useChemin, morceaux, parametre } from "./routeur.js";
import { MessageFlash } from "./composants/base.js";
import { Accueil } from "./ecrans/accueil.js";
import { Reserve } from "./ecrans/reserve.js";
import { FicheLaine } from "./ecrans/laine.js";
import { FicheAiguilles } from "./ecrans/aiguilles.js";
import { FicheEchantillon } from "./ecrans/echantillon.js";
import { NouveauProjet, EtapePiece } from "./ecrans/projet-piece.js";
import { EtapeMateriel } from "./ecrans/projet-materiel.js";
import { EtapeTaille, EtapeBientot } from "./ecrans/projet-taille.js";
import { ChoixPointDuBloc } from "./ecrans/points.js";
import { EtapeBuilder } from "./ecrans/projet-builder.js";
import { EtapeApercu } from "./ecrans/projet-apercu.js";
import { EcranPatron, EcranSuivi } from "./ecrans/patron.js";
import { Reglages } from "./ecrans/reglages.js";
import { CataloguePoints, FichePoint } from "./ecrans/points.js";

function Ecran({ chemin }) {
  const [premier, deuxieme, troisieme, quatrieme] = morceaux(chemin);
  if (premier === "reserve") {
    if (deuxieme === "laine") return html`<${FicheLaine} key=${troisieme} id=${troisieme} />`;
    if (deuxieme === "aiguilles" && troisieme) return html`<${FicheAiguilles} key=${troisieme} id=${troisieme} />`;
    if (deuxieme === "echantillon") {
      return html`<${FicheEchantillon} key=${troisieme} id=${troisieme} laineProposee=${parametre(chemin, "laine")}
        pointPropose=${parametre(chemin, "point")} aiguilleProposee=${parametre(chemin, "aiguille")} />`;
    }
    return html`<${Reserve} onglet=${deuxieme} />`;
  }
  if (premier === "reglages") return html`<${Reglages} apresProjet=${parametre(chemin, "sauvegarde") === "1"} />`;
  if (premier === "projet") {
    if (deuxieme === "nouveau") return html`<${NouveauProjet} />`;
    const id = deuxieme;
    if (troisieme === "piece") return html`<${EtapePiece} key=${id} id=${id} />`;
    if (troisieme === "materiel") return html`<${EtapeMateriel} key=${id} id=${id} />`;
    if (troisieme === "taille") return html`<${EtapeTaille} key=${id} id=${id} />`;
    if (troisieme === "builder") return html`<${EtapeBuilder} key=${id} id=${id} />`;
    if (troisieme === "apercu") return html`<${EtapeApercu} key=${id} id=${id} />`;
    if (troisieme === "patron") return html`<${EcranPatron} key=${id} id=${id} />`;
    if (troisieme === "suivi") return html`<${EcranSuivi} key=${id} id=${id} />`;
    if (troisieme === "point") {
      const colonne = parametre(chemin, "colonne");
      return html`<${ChoixPointDuBloc} key=${id + quatrieme + (colonne || "")} id=${id} blocId=${quatrieme} colonneId=${colonne} />`;
    }
    return html`<${EtapeBientot} key=${id} id=${id} etape=${troisieme} />`;
  }
  if (premier === "points") {
    return deuxieme ? html`<${FichePoint} key=${deuxieme} id=${deuxieme} />` : html`<${CataloguePoints} />`;
  }
  return html`<${Accueil} />`;
}

/** Bandeau « Nouvelle version disponible » : rien ne se recharge sans l'accord de Deborah. */
// Vrai seulement quand Deborah a touché « Mettre à jour » : c'est le seul cas où l'on recharge.
let miseAJourDemandee = false;

function BandeauMiseAJour({ enAttente, chemin }) {
  // Jamais pendant le suivi des rangs : on ne dérange pas le tricot.
  if (!enAttente || /\/suivi(\?|$)/.test(chemin)) return null;
  const mettreAJour = () => {
    miseAJourDemandee = true;
    enAttente.postMessage({ type: "ACTIVER_NOUVELLE_VERSION" });
  };
  return html`
    <div class="bandeau-maj" role="status">
      <span>Nouvelle version disponible</span>
      <button type="button" onClick=${mettreAJour}>Mettre à jour</button>
    </div>`;
}

function App({ base, prefsInitiales }) {
  const chemin = useChemin();
  const [prefs, setPrefs] = useState(prefsInitiales);
  const [message, setMessage] = useState(null);
  const [versionEnAttente, setVersionEnAttente] = useState(null);
  const minuterie = useRef(null);

  useEffect(() => appliquerPreferencesAffichage(prefs), [prefs]);

  // Suivre le thème du téléphone quand le réglage est « Comme le téléphone ».
  useEffect(() => {
    const requete = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!requete) return;
    const surChangement = () => appliquerPreferencesAffichage(prefs);
    requete.addEventListener("change", surChangement);
    return () => requete.removeEventListener("change", surChangement);
  }, [prefs]);

  useEffect(() => surveillerMisesAJour(setVersionEnAttente), []);

  const flash = useCallback((texte, erreur = false) => {
    clearTimeout(minuterie.current);
    setMessage({ texte, erreur });
    minuterie.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  const majPrefs = useCallback(
    async (patch) => {
      const nouvelles = await base.ecrire("preferences", { ...prefs, ...patch, id: ID_PREFERENCES });
      setPrefs(nouvelles);
      return nouvelles;
    },
    [base, prefs]
  );

  return html`
    <${ContexteApp.Provider} value=${{ base, prefs, majPrefs, flash }}>
      <${Ecran} chemin=${chemin} />
      <${MessageFlash} message=${message} />
      <${BandeauMiseAJour} enAttente=${versionEnAttente} chemin=${chemin} />
    <//>`;
}

function surveillerMisesAJour(signaler) {
  if (!("serviceWorker" in navigator)) return;
  let dejaRecharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // À la première installation, le service worker prend la main sans qu'on recharge :
    // sinon une saisie en cours serait perdue.
    if (!miseAJourDemandee || dejaRecharge) return;
    dejaRecharge = true;
    location.reload();
  });
  navigator.serviceWorker
    .register("sw.js")
    .then((inscription) => {
      const verifier = () => {
        if (inscription.waiting && navigator.serviceWorker.controller) signaler(inscription.waiting);
      };
      verifier();
      inscription.addEventListener("updatefound", () => {
        const nouveau = inscription.installing;
        nouveau?.addEventListener("statechange", () => {
          if (nouveau.state === "installed") verifier();
        });
      });
      // Vérifier aussi quand on revient sur l'application.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") inscription.update().catch(() => {});
      });
    })
    .catch(() => {
      /* hors ligne au premier lancement, ou navigateur sans service worker : l'app marche quand même */
    });
}

async function demarrer() {
  const conteneur = document.getElementById("app");
  try {
    const base = await ouvrirBase();
    let prefs = { ...PREFERENCES_PAR_DEFAUT, ...((await base.lire("preferences", ID_PREFERENCES)) || {}) };
    appliquerPreferencesAffichage(prefs);
    // Chrome accorde (ou non) la protection de lui-même, sans rien demander à l'utilisatrice :
    // on la redemande à chaque ouverture tant qu'elle n'est pas accordée, il peut changer d'avis.
    if (prefs.stockageResultat !== "accorde") {
      const resultat = await demanderStockagePersistant();
      if (resultat !== prefs.stockageResultat || !prefs.stockageDemande) {
        prefs = await base.ecrire("preferences", { ...prefs, stockageDemande: true, stockageResultat: resultat });
      }
    }
    conteneur.textContent = "";
    render(html`<${App} base=${base} prefsInitiales=${prefs} />`, conteneur);
  } catch (erreur) {
    console.error(erreur);
    conteneur.innerHTML =
      '<main class="ecran"><div class="ecran-contenu"><h1>Oups</h1><p>L\'application n\'a pas pu ouvrir sa base de données. ' +
      "Vérifie que Chrome n'est pas en navigation privée, puis recharge la page.</p></div></main>";
  }
}

demarrer();
