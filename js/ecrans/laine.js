import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { retour } from "../routeur.js";
import { EnTete, Champ, Liste, Onglets, Fenetre, Encart } from "../composants/base.js";
import {
  EPAISSEURS, MATIERES, PALETTE, metrageLaine, verifierLaine, lireNombre,
} from "../donnees/reserve.js";

const LAINE_VIDE = {
  nom: "",
  epaisseur: "",
  matiere: "Laine",
  couleur: PALETTE[0].hex,
  quantite: { mode: "etiquette", metresParPelote: "", grammesParPelote: "", pelotes: "", grammes: "", metresReference: "", grammesReference: "" },
  echantillonEtiquette: { mailles: "", aiguilleMm: "" },
  note: "",
  archivee: false,
};

export function FicheLaine({ id }) {
  const { base, flash } = useApp();
  const nouvelle = !id || id === "nouvelle";
  const [laine, setLaine] = useState(nouvelle ? LAINE_VIDE : null);
  const [autres, setAutres] = useState([]);
  const [erreurs, setErreurs] = useState({});
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    base.lister("laines").then((toutes) => setAutres(toutes.filter((l) => l.id !== id)));
    if (!nouvelle) {
      base.lire("laines", id).then((l) => {
        if (!l) return setIntrouvable(true);
        setLaine({
          ...LAINE_VIDE,
          ...l,
          quantite: { ...LAINE_VIDE.quantite, ...l.quantite },
          echantillonEtiquette: { ...LAINE_VIDE.echantillonEtiquette, ...l.echantillonEtiquette },
        });
      });
    }
  }, [base, id]);

  if (introuvable) {
    return html`<main class="ecran"><${EnTete} titre="Laine introuvable" secours="/reserve/laines" />
      <div class="ecran-contenu"><p>Cette laine n'existe plus dans ta réserve.</p></div></main>`;
  }
  if (!laine) return null;

  const maj = (patch) => setLaine({ ...laine, ...patch });
  const majQ = (patch) => setLaine({ ...laine, quantite: { ...laine.quantite, ...patch } });
  const majE = (patch) => setLaine({ ...laine, echantillonEtiquette: { ...laine.echantillonEtiquette, ...patch } });
  const q = laine.quantite;
  const metrage = metrageLaine(laine);
  const couleurDeLaPalette = PALETTE.some((c) => c.hex.toLowerCase() === laine.couleur.toLowerCase());

  // Laines de la réserve qui peuvent servir de référence pour une pesée.
  const references = autres.filter((l) => {
    const qq = l.quantite || {};
    return qq.mode === "etiquette" && lireNombre(qq.metresParPelote) > 0 && lireNombre(qq.grammesParPelote) > 0;
  });

  async function enregistrer() {
    const e = verifierLaine(laine);
    setErreurs(e);
    if (Object.keys(e).length > 0) {
      flash("Il manque quelques informations.", true);
      return;
    }
    await base.ecrire("laines", { ...laine, nom: laine.nom.trim() });
    flash(nouvelle ? "Laine ajoutée à ta réserve." : "Laine enregistrée.");
    retour("/reserve/laines");
  }

  async function basculerArchive() {
    await base.ecrire("laines", { ...laine, archivee: !laine.archivee });
    flash(laine.archivee ? "Laine remise dans la réserve." : "Laine archivée : ses échantillons restent disponibles.");
    retour("/reserve/laines");
  }

  async function supprimer() {
    await base.supprimer("laines", laine.id);
    setConfirmerSuppression(false);
    flash("Laine supprimée.");
    retour("/reserve/laines");
  }

  return html`
    <main class="ecran">
      <${EnTete} titre=${nouvelle ? "Ajouter une laine" : "Ma laine"} fermer secours="/reserve/laines" />

      <form class="ecran-contenu" onSubmit=${(e) => { e.preventDefault(); enregistrer(); }} novalidate>
        <${Champ} libelle="Nom" valeur=${laine.nom} erreur=${erreurs.nom} placeholder="ex. Mérinos terracotta"
          surChangement=${(v) => maj({ nom: v })} />

        <div class="rangee">
          <${Liste} libelle="Épaisseur" valeur=${laine.epaisseur} erreur=${erreurs.epaisseur}
            options=${EPAISSEURS.map((e) => ({ valeur: e.id, libelle: `${e.nom} (${e.detail})` }))}
            surChangement=${(v) => maj({ epaisseur: v })} />
          <${Liste} libelle="Matière" valeur=${laine.matiere}
            options=${MATIERES.map((m) => ({ valeur: m, libelle: m }))}
            surChangement=${(v) => maj({ matiere: v })} />
        </div>

        <section class="carte-bloc" aria-labelledby="titre-couleur">
          <h2 id="titre-couleur">Couleur</h2>
          <div class="palette" role="group" aria-label="Couleurs proposées">
            ${PALETTE.map(
              (c) => html`<button type="button" aria-label=${c.nom}
                aria-pressed=${String(c.hex.toLowerCase() === laine.couleur.toLowerCase())}
                style=${`background:${c.hex}`} onClick=${() => maj({ couleur: c.hex })}></button>`
            )}
          </div>
          <label class=${"couleur-libre" + (couleurDeLaPalette ? "" : " choisie")}>
            <input type="color" value=${laine.couleur} aria-label="Choisir une couleur libre"
              onInput=${(e) => maj({ couleur: e.currentTarget.value.toUpperCase() })} />
            <span style="display:flex;flex-direction:column">
              <strong style="font-size:15px">Autre couleur</strong>
              <span class="note">${couleurDeLaPalette ? "Touche pour choisir n'importe quelle teinte" : `${laine.couleur} · touche pour ajuster`}</span>
            </span>
          </label>
          ${erreurs.couleur && html`<span class="message-erreur">${erreurs.couleur}</span>`}
        </section>

        <section class="carte-bloc" aria-labelledby="titre-quantite">
          <h2 id="titre-quantite">Quantité</h2>
          <${Onglets} libelle="Comment connais-tu la quantité ?" valeur=${q.mode}
            choix=${[{ valeur: "etiquette", libelle: "J'ai l'étiquette" }, { valeur: "pesee", libelle: "Je pèse" }]}
            surChoix=${(v) => majQ({ mode: v })} />

          ${q.mode === "etiquette" &&
          html`
            <div class="rangee-fois">
              <${Champ} libelle="Mètres par pelote" mode="decimal" valeur=${q.metresParPelote}
                erreur=${erreurs.metresParPelote} surChangement=${(v) => majQ({ metresParPelote: v })} />
              <span class="signe-fois" aria-hidden="true">×</span>
              <${Champ} libelle="Pelotes" mode="decimal" valeur=${q.pelotes}
                erreur=${erreurs.pelotes} surChangement=${(v) => majQ({ pelotes: v })} />
            </div>
            <p class="note">Une pelote entamée ? Écris par exemple 2,5.</p>
            <${Champ} libelle="Grammes par pelote (facultatif)" mode="decimal" valeur=${q.grammesParPelote}
              aide="Utile plus tard pour estimer les restes par pesée."
              surChangement=${(v) => majQ({ grammesParPelote: v })} />`}

          ${q.mode === "pesee" &&
          html`
            <${Champ} libelle="Poids pesé (en grammes)" mode="decimal" valeur=${q.grammes}
              erreur=${erreurs.grammes} surChangement=${(v) => majQ({ grammes: v })} />
            <p class="note">Référence : combien de mètres pour combien de grammes ? (une étiquette de la même laine, ou d'une laine semblable)</p>
            ${references.length > 0 &&
            html`<${Liste} libelle="Reprendre une laine de ma réserve" valeur=""
              options=${references.map((l) => ({ valeur: l.id, libelle: l.nom }))}
              surChangement=${(idRef) => {
                const ref = references.find((l) => l.id === idRef);
                if (ref) majQ({ metresReference: ref.quantite.metresParPelote, grammesReference: ref.quantite.grammesParPelote });
              }} />`}
            <div class="rangee-fois">
              <${Champ} libelle="Mètres" mode="decimal" valeur=${q.metresReference} placeholder="ex. 100"
                erreur=${erreurs.metresReference} surChangement=${(v) => majQ({ metresReference: v })} />
              <span class="signe-fois">pour</span>
              <${Champ} libelle="Grammes" mode="decimal" valeur=${q.grammesReference} placeholder="ex. 50"
                erreur=${erreurs.grammesReference} surChangement=${(v) => majQ({ grammesReference: v })} />
            </div>`}

          <div class="total" aria-live="polite">
            <span>${q.mode === "pesee" ? "Estimation" : "Total"}</span>
            <strong>${metrage ? `${metrage.estime ? "≈ " : ""}${metrage.metres} m` : "—"}</strong>
          </div>
        </section>

        <details class="carte-bloc">
          <summary style="font-family:var(--titre);font-size:18px;font-weight:600;min-height:44px;display:flex;align-items:center">
            Échantillon de l'étiquette (facultatif)
          </summary>
          <p class="note">Il sert d'estimation tant que tu n'as pas tricoté ton propre échantillon.</p>
          <div class="rangee">
            <${Champ} libelle="Mailles sur 10 cm" mode="decimal" valeur=${laine.echantillonEtiquette.mailles}
              erreur=${erreurs.echantillonMailles} surChangement=${(v) => majE({ mailles: v })} />
            <${Champ} libelle="Aiguille conseillée (mm)" mode="decimal" valeur=${laine.echantillonEtiquette.aiguilleMm}
              surChangement=${(v) => majE({ aiguilleMm: v })} />
          </div>
        </details>

        ${!nouvelle &&
        html`<div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">
          <button type="button" class="bouton-lien" onClick=${basculerArchive}>
            ${laine.archivee ? "Remettre dans la réserve" : "Archiver (laine épuisée)"}
          </button>
          <button type="button" class="bouton-lien bouton-danger" onClick=${() => setConfirmerSuppression(true)}>
            Supprimer cette laine
          </button>
        </div>`}

        <button type="submit" class="visuellement-cache" tabindex="-1">Enregistrer</button>
      </form>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${enregistrer}>
          ${nouvelle ? "Ajouter à ma réserve" : "Enregistrer"}
        </button>
      </div>

      <${Fenetre} ouverte=${confirmerSuppression} titre="Supprimer cette laine ?"
        surFermeture=${() => setConfirmerSuppression(false)}
        actions=${html`
          <button type="button" class="bouton-principal" onClick=${supprimer}>Supprimer définitivement</button>
          <button type="button" class="bouton-secondaire" onClick=${() => setConfirmerSuppression(false)}>Annuler</button>`}>
        <p>« ${laine.nom || "Cette laine"} » sera retirée de ta réserve. Cette action ne peut pas être annulée.</p>
        <${Encart}>Si la laine est simplement épuisée, mieux vaut l'archiver : ses échantillons restent utilisables.<//>
      <//>
    </main>`;
}
