import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { retour } from "../routeur.js";
import { EnTete, Champ, Liste, Onglets, Fenetre, Encart } from "../composants/base.js";
import { Nuancier } from "../composants/nuancier.js";
import { IconeFermer, IconePlus } from "../composants/icones.js";
import {
  EPAISSEURS, FIBRES, PALETTE, metrageLaine, verifierLaine, lireNombre, formaterNombre,
  texteFourchette, metresPour100g, epaisseurProbable, compositionDe, totalComposition,
} from "../donnees/reserve.js";

/** Composition : une ou plusieurs fibres avec leur pourcentage. */
function Composition({ composition, surChangement, erreur }) {
  // surChangement reçoit une fonction (ancienne composition → nouvelle) : jamais d'état périmé.
  const changer = (i, patch) => surChangement((liste) => liste.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const retirer = (i) => surChangement((liste) => liste.filter((_, j) => j !== i));
  const ajouter = () =>
    surChangement((liste) => {
      // La nouvelle fibre reçoit ce qui manque pour arriver à 100 %, s'il manque quelque chose.
      const reste = Math.max(0, 100 - totalComposition(liste));
      return [...liste, { fibre: "", pourcentage: reste > 0 ? String(reste) : "" }];
    });
  const plusieurs = composition.length > 1;
  const total = totalComposition(composition);
  return html`
    <section class="carte-bloc" aria-labelledby="titre-composition">
      <h2 id="titre-composition">Composition</h2>
      <p class="note">Recopie l'étiquette : par exemple 70 % mérinos et 30 % polyamide.</p>
      ${composition.map(
        (c, i) => html`
          <div class="fibre">
            <label class="champ">
              ${i === 0 ? "Fibre" : html`<span class="visuellement-cache">Fibre ${i + 1}</span>`}
              <select value=${c.fibre} onChange=${(e) => changer(i, { fibre: e.currentTarget.value })}>
                <option value="" disabled>Choisir…</option>
                ${FIBRES.map((f) => html`<option value=${f}>${f}</option>`)}
                ${c.fibre && !FIBRES.includes(c.fibre) && html`<option value=${c.fibre}>${c.fibre}</option>`}
              </select>
            </label>
            <label class="champ champ-pourcent">
              ${i === 0 ? "Part" : html`<span class="visuellement-cache">Pourcentage de ${c.fibre || "cette fibre"}</span>`}
              <input type="text" inputmode="decimal" value=${c.pourcentage ?? ""}
                placeholder=${plusieurs ? "" : "100"}
                onInput=${(e) => changer(i, { pourcentage: e.currentTarget.value })} />
            </label>
            ${plusieurs
              ? html`<button type="button" class="bouton-rond" aria-label=${`Retirer ${c.fibre || "cette fibre"}`}
                  onClick=${() => retirer(i)}>${IconeFermer()}</button>`
              : html`<span></span>`}
          </div>`
      )}
      <button type="button" class="bouton-pilule" style="align-self:flex-start" onClick=${ajouter}>
        ${IconePlus({ taille: 18 })} Ajouter une fibre
      </button>
      ${plusieurs &&
      html`<div class="total" style=${Math.abs(total - 100) > 0.01 ? "background:var(--brique-fond);color:var(--brique)" : ""}>
        <span>Total</span><strong>${formaterNombre(total)} %</strong>
      </div>`}
      ${erreur && html`<span class="message-erreur">${erreur}</span>`}
    </section>`;
}

/** Aide au choix de l'épaisseur : repères, et déduction depuis l'étiquette. */
function AideEpaisseur({ laine, surChoix }) {
  const m100 = metresPour100g(laine);
  const probable = epaisseurProbable(m100);
  const choisie = EPAISSEURS.find((e) => e.id === laine.epaisseur);
  if (probable) {
    return html`
      <div class="encart encart-sauge" style="flex-direction:column;gap:6px">
        <span>D'après l'étiquette : <strong>${m100} m pour 100 g</strong>, c'est probablement du <strong>${probable.nom}</strong> (${probable.detail}, aiguilles ${probable.aiguilles}).</span>
        ${laine.epaisseur !== probable.id &&
        html`<button type="button" class="bouton-lien" style="align-self:flex-start;padding:0"
          onClick=${() => surChoix(probable.id)}>Choisir ${probable.nom}</button>`}
      </div>`;
  }
  return html`
    <p class="note">
      ${choisie ? html`${choisie.nom} : ${texteFourchette(choisie)}, aiguilles ${choisie.aiguilles}. ` : ""}
      Pas sûre ? Indique plus bas les mètres et les grammes d'une pelote : l'outil devinera l'épaisseur.
    </p>`;
}

const LAINE_VIDE = {
  nom: "",
  epaisseur: "",
  composition: [{ fibre: "Laine", pourcentage: "100" }],
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
          composition: compositionDe(l).length ? compositionDe(l) : LAINE_VIDE.composition,
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

  // Mises à jour à partir de l'état le plus récent : deux saisies rapides ne s'écrasent pas.
  const maj = (patch) => setLaine((l) => ({ ...l, ...patch }));
  const majQ = (patch) => setLaine((l) => ({ ...l, quantite: { ...l.quantite, ...patch } }));
  const majE = (patch) => setLaine((l) => ({ ...l, echantillonEtiquette: { ...l.echantillonEtiquette, ...patch } }));
  const q = laine.quantite;
  const metrage = metrageLaine(laine);

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
    // L'ancienne « matière » unique est remplacée par la composition.
    const { matiere, ...sansMatiere } = laine;
    const composition =
      laine.composition.length === 1 ? [{ ...laine.composition[0], pourcentage: "100" }] : laine.composition;
    await base.ecrire("laines", { ...sansMatiere, composition, nom: laine.nom.trim() });
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

        <${Liste} libelle="Épaisseur" valeur=${laine.epaisseur} erreur=${erreurs.epaisseur}
          options=${EPAISSEURS.map((e) => ({ valeur: e.id, libelle: `${e.nom} · ${texteFourchette(e)}` }))}
          surChangement=${(v) => maj({ epaisseur: v })} />
        <${AideEpaisseur} laine=${laine} surChoix=${(v) => maj({ epaisseur: v })} />
        <${Champ} libelle="Aiguille conseillée sur l'étiquette (mm, facultatif)" mode="decimal" placeholder="ex. 9"
          valeur=${laine.echantillonEtiquette.aiguilleMm} erreur=${erreurs.aiguilleMm}
          aide="Si tu la notes, l'outil s'y fiera pour te conseiller tes aiguilles."
          surChangement=${(v) => majE({ aiguilleMm: v })} />
        <${Composition} composition=${laine.composition} erreur=${erreurs.composition}
          surChangement=${(f) => setLaine((l) => ({ ...l, composition: f(l.composition) }))} />

        <section class="carte-bloc" aria-labelledby="titre-couleur">
          <h2 id="titre-couleur">Couleur</h2>
          <p class="note">Touche la roue ou fais glisser le doigt : pâle au centre, vive au bord. La réglette assombrit.</p>
          <${Nuancier} valeur=${laine.couleur} surChangement=${(hex) => maj({ couleur: hex })} />
          <span class="note" style="font-weight:700">Couleurs rapides</span>
          <div class="palette" role="group" aria-label="Couleurs rapides">
            ${PALETTE.map(
              (c) => html`<button type="button" aria-label=${c.nom}
                aria-pressed=${String(c.hex.toLowerCase() === laine.couleur.toLowerCase())}
                style=${`background:${c.hex}`} onClick=${() => maj({ couleur: c.hex })}></button>`
            )}
          </div>
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
              aide="Sert à deviner l'épaisseur et, plus tard, à estimer les restes par pesée."
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
          ${(() => {
            const p = epaisseurProbable(metresPour100g(laine));
            return p && laine.epaisseur !== p.id
              ? html`<${AideEpaisseur} laine=${laine} surChoix=${(v) => maj({ epaisseur: v })} />`
              : null;
          })()}
        </section>

        <details class="carte-bloc">
          <summary style="font-family:var(--titre);font-size:18px;font-weight:600;min-height:44px;display:flex;align-items:center">
            Échantillon de l'étiquette (facultatif)
          </summary>
          <p class="note">Il sert d'estimation tant que tu n'as pas tricoté ton propre échantillon.</p>
          <${Champ} libelle="Mailles sur 10 cm (en jersey)" mode="decimal" valeur=${laine.echantillonEtiquette.mailles}
            erreur=${erreurs.echantillonMailles} surChangement=${(v) => majE({ mailles: v })} />
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
