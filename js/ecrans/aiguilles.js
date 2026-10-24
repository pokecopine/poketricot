import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { retour } from "../routeur.js";
import { EnTete, Champ, Fenetre } from "../composants/base.js";
import { verifierAiguilles, lireNombre } from "../donnees/reserve.js";

const TAILLES = ["2", "2,5", "3", "3,5", "4", "4,5", "5", "5,5", "6", "7", "8", "9", "10", "12"];
const CABLES = ["40", "60", "80", "100", "120", "150"];
const MATIERES = ["Bambou", "Bois", "Métal", "Plastique", "Carbone"];

const AIGUILLES_VIDES = { tailleMm: "", cableCm: "", matiere: "", note: "", archivee: false };

/** Puces de choix rapide, avec une saisie libre en dessous. */
function Puces({ libelle, valeurs, valeur, surChoix, suffixe }) {
  const v = lireNombre(valeur);
  return html`
    <div class="puces" role="group" aria-label=${libelle}>
      ${valeurs.map(
        (x) => html`<button type="button" class="puce" aria-pressed=${String(v !== null && lireNombre(x) === v)}
          onClick=${() => surChoix(x)}>${x}${suffixe}</button>`
      )}
    </div>`;
}

export function FicheAiguilles({ id }) {
  const { base, flash } = useApp();
  const nouvelles = !id || id === "nouvelles";
  const [a, setA] = useState(nouvelles ? AIGUILLES_VIDES : null);
  const [erreurs, setErreurs] = useState({});
  const [confirmer, setConfirmer] = useState(false);
  const [introuvables, setIntrouvables] = useState(false);

  useEffect(() => {
    if (!nouvelles) {
      base.lire("aiguilles", id).then((x) => (x ? setA({ ...AIGUILLES_VIDES, ...x }) : setIntrouvables(true)));
    }
  }, [base, id]);

  if (introuvables) {
    return html`<main class="ecran"><${EnTete} titre="Aiguilles introuvables" secours="/reserve/aiguilles" />
      <div class="ecran-contenu"><p>Ces aiguilles n'existent plus dans ta réserve.</p></div></main>`;
  }
  if (!a) return null;
  const maj = (patch) => setA((x) => ({ ...x, ...patch }));

  async function enregistrer() {
    const e = verifierAiguilles(a);
    setErreurs(e);
    if (Object.keys(e).length > 0) return flash("Il manque quelques informations.", true);
    await base.ecrire("aiguilles", {
      ...a,
      tailleMm: lireNombre(a.tailleMm),
      cableCm: lireNombre(a.cableCm),
      note: a.note.trim(),
    });
    flash(nouvelles ? "Aiguilles ajoutées à ta réserve." : "Aiguilles enregistrées.");
    retour("/reserve/aiguilles");
  }

  async function basculerArchive() {
    await base.ecrire("aiguilles", { ...a, archivee: !a.archivee });
    flash(a.archivee ? "Aiguilles remises dans la réserve." : "Aiguilles archivées.");
    retour("/reserve/aiguilles");
  }

  async function supprimer() {
    await base.supprimer("aiguilles", a.id);
    setConfirmer(false);
    flash("Aiguilles supprimées.");
    retour("/reserve/aiguilles");
  }

  return html`
    <main class="ecran">
      <${EnTete} titre=${nouvelles ? "Ajouter des aiguilles" : "Mes aiguilles"} fermer secours="/reserve/aiguilles" />

      <form class="ecran-contenu" onSubmit=${(e) => { e.preventDefault(); enregistrer(); }} novalidate>
        <section class="carte-bloc" aria-labelledby="titre-taille">
          <h2 id="titre-taille">Taille des aiguilles</h2>
          <${Puces} libelle="Tailles courantes" valeurs=${TAILLES} valeur=${a.tailleMm} suffixe=" mm"
            surChoix=${(v) => maj({ tailleMm: v })} />
          <${Champ} libelle="Ou une autre taille (mm)" mode="decimal" valeur=${a.tailleMm}
            erreur=${erreurs.tailleMm} surChangement=${(v) => maj({ tailleMm: v })} />
        </section>

        <section class="carte-bloc" aria-labelledby="titre-cable">
          <h2 id="titre-cable">Longueur du câble</h2>
          <p class="note">Mesurée d'une pointe à l'autre. À partir de 80 cm, le magic loop est possible.</p>
          <${Puces} libelle="Longueurs courantes" valeurs=${CABLES} valeur=${a.cableCm} suffixe=" cm"
            surChoix=${(v) => maj({ cableCm: v })} />
          <${Champ} libelle="Ou une autre longueur (cm)" mode="decimal" valeur=${a.cableCm}
            erreur=${erreurs.cableCm} surChangement=${(v) => maj({ cableCm: v })} />
        </section>

        <section class="carte-bloc" aria-labelledby="titre-matiere">
          <h2 id="titre-matiere">Matière (facultatif)</h2>
          <div class="puces" role="group" aria-label="Matière">
            ${MATIERES.map(
              (m) => html`<button type="button" class="puce" aria-pressed=${String(a.matiere === m)}
                onClick=${() => maj({ matiere: a.matiere === m ? "" : m })}>${m}</button>`
            )}
          </div>
          <${Champ} libelle="Note" valeur=${a.note} placeholder="ex. pointes interchangeables"
            surChangement=${(v) => maj({ note: v })} />
        </section>

        ${!nouvelles &&
        html`<div style="display:flex;flex-direction:column;gap:4px">
          <button type="button" class="bouton-lien" onClick=${basculerArchive}>
            ${a.archivee ? "Remettre dans la réserve" : "Archiver (prêtées, abîmées…)"}
          </button>
          <button type="button" class="bouton-lien bouton-danger" onClick=${() => setConfirmer(true)}>Supprimer ces aiguilles</button>
        </div>`}
        <button type="submit" class="visuellement-cache" tabindex="-1">Enregistrer</button>
      </form>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${enregistrer}>
          ${nouvelles ? "Ajouter à ma réserve" : "Enregistrer"}
        </button>
      </div>

      <${Fenetre} ouverte=${confirmer} titre="Supprimer ces aiguilles ?" surFermeture=${() => setConfirmer(false)}
        actions=${html`
          <button type="button" class="bouton-principal" onClick=${supprimer}>Supprimer définitivement</button>
          <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(false)}>Annuler</button>`}>
        <p>Elles seront retirées de ta réserve. Cette action ne peut pas être annulée.</p>
      <//>
    </main>`;
}
