import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { EnTete, Onglets, Fenetre, Encart } from "../composants/base.js";
import { IconeExporter, IconeImporter, IconeCoche } from "../composants/icones.js";
import { etatStockage, demanderStockagePersistant } from "../donnees/db.js";
import { construireSauvegarde, nomFichierSauvegarde, lireSauvegarde } from "../donnees/sauvegarde.js";
import { formaterNombre } from "../donnees/reserve.js";
import { VERSION } from "../version.js";

function dateCourte(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ilYA(iso, maintenant = new Date()) {
  const jours = Math.floor((maintenant - new Date(iso)) / (24 * 3600 * 1000));
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}

function taille(octets) {
  if (octets === null || octets === undefined) return "—";
  if (octets < 1024 * 1024) return `${formaterNombre(octets / 1024, 0)} ko`;
  return `${formaterNombre(octets / (1024 * 1024), 1)} Mo`;
}

/** Propose le fichier : feuille de partage Android si possible, sinon téléchargement. */
async function proposerFichier(nom, texte) {
  const fichier = new File([texte], nom, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: "Sauvegarde du Créateur de patrons" });
      return "partage";
    } catch (e) {
      if (e && e.name === "AbortError") return "annule";
      /* sinon on retombe sur le téléchargement */
    }
  }
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "telechargement";
}

/** L'application est-elle ouverte depuis l'icône installée (et non dans un onglet de Chrome) ? */
function estInstallee() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function Reglages({ apresProjet = false } = {}) {
  const { base, prefs, majPrefs, flash } = useApp();
  const [stockage, setStockage] = useState(null);
  const [aImporter, setAImporter] = useState(null); // { sauvegarde, resume }
  const [erreurImport, setErreurImport] = useState(null);
  const champFichier = useRef(null);

  const rafraichirStockage = () => etatStockage().then(setStockage);
  useEffect(() => { rafraichirStockage(); }, []);

  async function exporter() {
    const donnees = await base.toutLire();
    const sauvegarde = construireSauvegarde(donnees, { versionApp: VERSION });
    const resultat = await proposerFichier(nomFichierSauvegarde(), JSON.stringify(sauvegarde, null, 1));
    if (resultat === "annule") return;
    await majPrefs({ derniereSauvegarde: sauvegarde.exporteLe });
    flash(resultat === "partage" ? "Sauvegarde envoyée." : "Sauvegarde téléchargée.");
  }

  async function fichierChoisi(e) {
    const fichier = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = "";
    if (!fichier) return;
    const resultat = lireSauvegarde(await fichier.text());
    if (!resultat.ok) {
      setErreurImport(resultat.erreur);
      return;
    }
    setErreurImport(null);
    setAImporter(resultat);
  }

  async function confirmerImport() {
    const { sauvegarde } = aImporter;
    // Les préférences d'affichage de ce téléphone sont gardées ; le reste vient du fichier.
    const donnees = { ...sauvegarde.donnees, preferences: [{ ...prefs, derniereSauvegarde: sauvegarde.exporteLe }] };
    await base.toutRemplacer(donnees);
    setAImporter(null);
    await majPrefs({ derniereSauvegarde: sauvegarde.exporteLe });
    flash("Sauvegarde importée : tes données sont revenues.");
  }

  async function demanderProtection() {
    const r = await demanderStockagePersistant();
    await rafraichirStockage();
    flash(r === "accorde" ? "Stockage protégé activé." : "Pas encore accordé : Chrome décidera plus tard. Tes données restent enregistrées.");
  }

  const r = aImporter?.resume;

  return html`
    <main class="ecran">
      <${EnTete} titre="Réglages" secours="/" libelleRetour="Retour à l'accueil" />
      <div class="ecran-contenu">
        ${apresProjet && html`<${Encart}>Ton écharpe est terminée : c'est le bon moment pour faire une sauvegarde de tes données.<//>`}

        <section class="carte-bloc" aria-labelledby="titre-sauvegarde">
          <h2 id="titre-sauvegarde">Sauvegarde</h2>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
            <span class="note" style="font-size:14px">Dernière sauvegarde</span>
            <strong style="font-size:15px;text-align:right">
              ${prefs.derniereSauvegarde ? `${dateCourte(prefs.derniereSauvegarde)} · ${ilYA(prefs.derniereSauvegarde)}` : "jamais"}
            </strong>
          </div>
          <p style="font-size:14px">Le fichier contient ta réserve, tes échantillons, tes projets et ta progression. Range-le dans Google Drive ou envoie-le-toi par mail.</p>
          <button type="button" class="bouton-principal" onClick=${exporter}>${IconeExporter()} Exporter une sauvegarde</button>
          <button type="button" class="bouton-secondaire" onClick=${() => champFichier.current.click()}>
            ${IconeImporter()} Importer une sauvegarde
          </button>
          <input type="file" ref=${champFichier} accept="application/json,.json" class="visuellement-cache"
            tabindex="-1" aria-hidden="true" onChange=${fichierChoisi} />
          ${erreurImport && html`<${Encart} type="brique" alerte>${erreurImport}<//>`}
          <${Encart} type="brique">Importer remplace toutes les données de ce téléphone. L'outil te montre d'abord ce que contient le fichier, et demande confirmation.<//>
        </section>

        <section class="carte-bloc" aria-labelledby="titre-stockage">
          <h2 id="titre-stockage">Stockage</h2>
          ${stockage?.persistant === "accorde"
            ? html`<div class="encart encart-sauge">
                ${IconeCoche({ couleur: "var(--sauge)" })}
                <span><strong style="color:var(--sauge-texte)">Stockage protégé : activé</strong><br />
                Chrome ne supprimera pas tes données pour faire de la place.</span>
              </div>`
            : html`<div class="encart" style="background:var(--lin);flex-direction:column;gap:6px">
                <strong style="font-size:14px">Stockage protégé : pas encore accordé par Chrome</strong>
                <span>Tes données sont bien enregistrées. Sans cette protection, Chrome ne les effacerait que si le téléphone manquait vraiment de place.</span>
                <span>Chrome l'accorde de lui-même, en général quand l'application est installée et utilisée régulièrement. L'outil la redemande à chaque ouverture.</span>
                ${!estInstallee() &&
                html`<span><strong>Tu utilises la version navigateur.</strong> Installe l'application : menu ⋮ de Chrome → « Installer l'application ».</span>`}
                <button type="button" class="bouton-lien" style="align-self:flex-start;padding:0" onClick=${demanderProtection}>Redemander maintenant</button>
              </div>`}
          <div style="display:flex;justify-content:space-between;font-size:14px">
            <span class="note" style="font-size:14px">Espace utilisé</span>
            <strong>${taille(stockage?.utilise)}</strong>
          </div>
          <p class="note">Vider les données du site dans Chrome efface aussi ta réserve : la sauvegarde est ta vraie protection.</p>
        </section>

        <section class="carte-bloc" aria-labelledby="titre-affichage">
          <h2 id="titre-affichage">Affichage</h2>
          <span class="note" style="font-weight:700;font-size:14px">Thème</span>
          <${Onglets} libelle="Thème" valeur=${prefs.theme}
            choix=${[{ valeur: "clair", libelle: "Clair" }, { valeur: "sombre", libelle: "Sombre" }, { valeur: "auto", libelle: "Comme le téléphone" }]}
            surChoix=${(v) => majPrefs({ theme: v })} />
          <span class="note" style="font-weight:700;font-size:14px">Taille du texte pendant le suivi</span>
          <${Onglets} libelle="Taille du texte pendant le suivi" valeur=${prefs.tailleTexte}
            choix=${[{ valeur: "normale", libelle: "Normale" }, { valeur: "grande", libelle: "Grande" }]}
            surChoix=${(v) => majPrefs({ tailleTexte: v })} />
          <label class="case">
            <span style="display:flex;flex-direction:column;gap:2px;flex:1">
              <strong style="font-size:15px">Abréviations dans les patrons</strong>
              <span class="note">« 2 m. end. » au lieu de « 2 mailles endroit »</span>
            </span>
            <input type="checkbox" role="switch" checked=${prefs.abreviations}
              onChange=${(e) => majPrefs({ abreviations: e.currentTarget.checked })} />
          </label>
        </section>

        <div style="display:flex;flex-direction:column;gap:4px;padding:0 4px">
          <strong style="font-size:14px">Créateur de patrons · version ${VERSION}</strong>
          <p class="note">Fonctionne hors connexion. Aucune donnée ne quitte ce téléphone, sauf quand tu exportes une sauvegarde.</p>
        </div>
      </div>

      <${Fenetre} ouverte=${!!aImporter} titre="Importer cette sauvegarde ?" surFermeture=${() => setAImporter(null)}
        actions=${html`
          <button type="button" class="bouton-principal" onClick=${confirmerImport}>Remplacer mes données</button>
          <button type="button" class="bouton-secondaire" onClick=${() => setAImporter(null)}>Annuler</button>`}>
        ${r &&
        html`<dl class="resume">
          <dt>Sauvegarde du</dt><dd>${r.exporteLe ? dateCourte(r.exporteLe) : "date inconnue"}</dd>
          <dt>Laines</dt><dd>${r.laines}</dd>
          <dt>Aiguilles</dt><dd>${r.aiguilles}</dd>
          <dt>Échantillons</dt><dd>${r.echantillons}</dd>
          <dt>Projets</dt><dd>${r.projets}</dd>
          <dt>Patrons</dt><dd>${r.patrons}</dd>
        </dl>`}
        <${Encart} type="brique">Tout ce qui est actuellement sur ce téléphone sera remplacé par le contenu du fichier.<//>
      <//>
    </main>`;
}
