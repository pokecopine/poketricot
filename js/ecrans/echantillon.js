// Ajouter ou modifier un échantillon (maquette 3b, version réserve).
import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { retour } from "../routeur.js";
import { EnTete, Champ, Fenetre, Encart } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { POINTS, FAMILLES, pointParId } from "../catalogue/points.js";
import { lireNombre, formaterNombre, trierLaines } from "../donnees/reserve.js";
import {
  echantillonVide, verifierEchantillon, normaliserEchantillon, alertePesee, memeCombinaison, maillesPourLeCarre,
  texteDate, texteDensite, COTE_CONSEILLE,
} from "../donnees/echantillons.js";
import { nomAvecArticle } from "../moteur/dimensions.js";

export function FicheEchantillon({ id, laineProposee, pointPropose, aiguilleProposee }) {
  const { base, flash } = useApp();
  const nouveau = !id || id === "nouveau";
  const [e, setE] = useState(null);
  const [laines, setLaines] = useState([]);
  const [aiguilles, setAiguilles] = useState([]);
  const [tous, setTous] = useState([]);
  const [erreurs, setErreurs] = useState({});
  const [confirmer, setConfirmer] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    Promise.all([base.lister("laines"), base.lister("aiguilles"), base.lister("echantillons")]).then(([l, a, ech]) => {
      setLaines(trierLaines(l));
      setAiguilles(a.filter((x) => !x.archivee));
      setTous(ech);
      if (nouveau) {
        const actives = l.filter((x) => !x.archivee);
        const laineId = l.some((x) => x.id === laineProposee) ? laineProposee : actives.length === 1 ? actives[0].id : "";
        const pointId = pointParId(pointPropose) ? pointPropose : "";
        const t = lireNombre(aiguilleProposee);
        setE(echantillonVide({ laineId, pointId, tailleAiguille: t === null ? "" : t }));
      } else {
        const trouve = ech.find((x) => x.id === id);
        if (!trouve) return setIntrouvable(true);
        setE({
          ...echantillonVide(),
          ...trouve,
          tailleAiguille: formaterNombre(trouve.tailleAiguille, 2),
          maillesPour10cm: formaterNombre(trouve.maillesPour10cm),
          rangsPour10cm: formaterNombre(trouve.rangsPour10cm),
          pesee: {
            grammes: trouve.pesee ? String(trouve.pesee.grammes) : "",
            largeurCm: trouve.pesee ? formaterNombre(trouve.pesee.largeurCm) : "",
            hauteurCm: trouve.pesee ? formaterNombre(trouve.pesee.hauteurCm) : "",
          },
        });
      }
    });
  }, [base, id]);

  if (introuvable) {
    return html`<main class="ecran"><${EnTete} titre="Échantillon introuvable" secours="/reserve/echantillons" />
      <div class="ecran-contenu"><p>Cet échantillon n'existe plus dans ta réserve.</p></div></main>`;
  }
  if (!e) return null;

  const maj = (patch) => setE((x) => ({ ...x, ...patch }));
  const majP = (patch) => setE((x) => ({ ...x, pesee: { ...x.pesee, ...patch } }));
  const laine = laines.find((l) => l.id === e.laineId);
  const point = pointParId(e.pointId);
  const choixLaines = laines.filter((l) => !l.archivee || l.id === e.laineId);
  const tailles = [...new Set(aiguilles.map((a) => lireNombre(a.tailleMm)).filter((t) => t !== null))].sort((a, b) => a - b);
  const deja = memeCombinaison(tous, e);
  const mailles = laine && point ? maillesPourLeCarre({ laine, pointId: e.pointId, tailleAiguille: e.tailleAiguille, echantillons: tous }) : null;
  const alerte = alertePesee(e);

  async function enregistrer() {
    const err = verifierEchantillon(e);
    setErreurs(err);
    if (Object.keys(err).length > 0) return flash("Il manque quelques informations.", true);
    await base.ecrire("echantillons", normaliserEchantillon(e));
    flash(nouveau ? "Échantillon ajouté à ta réserve." : "Échantillon enregistré.");
    retour("/reserve/echantillons");
  }

  async function supprimer() {
    await base.supprimer("echantillons", e.id);
    setConfirmer(false);
    flash("Échantillon supprimé.");
    retour("/reserve/echantillons");
  }

  return html`
    <main class="ecran">
      <${EnTete} titre=${nouveau ? "Ajouter un échantillon" : "Mon échantillon"} fermer secours="/reserve/echantillons" />

      <form class="ecran-contenu" onSubmit=${(ev) => { ev.preventDefault(); enregistrer(); }} novalidate>
        ${point && html`
          <div class="carte" style="overflow:hidden;padding:0">
            <${BandeTexture} point=${point} couleur=${laine?.couleur || "#9A9590"} hauteur=${72} />
          </div>`}

        <section class="carte-bloc" aria-labelledby="titre-combinaison">
          <h2 id="titre-combinaison">Laine, aiguilles et point</h2>
          ${choixLaines.length === 0
            ? html`<${Encart} type="brique">Ajoute d'abord une laine dans ta réserve.<//>`
            : html`<label class=${"champ" + (erreurs.laineId ? " champ-erreur" : "")}>
                Laine
                <select value=${e.laineId} onChange=${(ev) => maj({ laineId: ev.currentTarget.value })}>
                  <option value="" disabled>Choisir…</option>
                  ${choixLaines.map((l) => html`<option value=${l.id}>${l.nom}${l.archivee ? " (archivée)" : ""}</option>`)}
                </select>
                ${erreurs.laineId && html`<span class="message-erreur">${erreurs.laineId}</span>`}
              </label>`}

          <span class="note" style="font-weight:700">Taille d'aiguille</span>
          ${tailles.length > 0 &&
          html`<div class="puces" role="group" aria-label="Tailles de ma réserve">
            ${tailles.map(
              (t) => html`<button type="button" class="puce" aria-pressed=${String(lireNombre(e.tailleAiguille) === t)}
                onClick=${() => maj({ tailleAiguille: formaterNombre(t, 2) })}>${formaterNombre(t, 2)} mm</button>`
            )}
          </div>`}
          <${Champ} libelle=${tailles.length ? "Ou une autre taille (mm)" : "Taille (mm)"} mode="decimal" valeur=${e.tailleAiguille}
            erreur=${erreurs.tailleAiguille} aide="La longueur du câble ne compte pas." surChangement=${(v) => maj({ tailleAiguille: v })} />

          <label class=${"champ" + (erreurs.pointId ? " champ-erreur" : "")}>
            Point
            <select value=${e.pointId} onChange=${(ev) => maj({ pointId: ev.currentTarget.value })}>
              <option value="" disabled>Choisir…</option>
              ${FAMILLES.map(
                (f) => html`<optgroup label=${f.nom}>
                  ${POINTS.filter((p) => p.famille === f.id).map((p) => html`<option value=${p.id}>${p.nom}</option>`)}
                </optgroup>`
              )}
            </select>
            ${erreurs.pointId && html`<span class="message-erreur">${erreurs.pointId}</span>`}
          </label>
        </section>

        ${deja.length > 0 &&
        html`<${Encart}>Tu as déjà un échantillon de cette combinaison (du ${texteDate(deja[0].date)}, ${texteDensite(deja[0])}).
          Le plus récent sera proposé dans tes projets.<//>`}

        <details class="carte-bloc" open=${nouveau}>
          <summary class="resume-depliable">Comment faire l'échantillon</summary>
          <ol class="guide">
            <li>${mailles
              ? html`Monte environ <strong>${mailles} mailles</strong>, de quoi faire ${COTE_CONSEILLE} cm de large, et tricote environ ${COTE_CONSEILLE} cm${point ? ` en ${point.nom.charAt(0).toLowerCase() + point.nom.slice(1)}` : ""}.`
              : html`Monte de quoi faire environ ${COTE_CONSEILLE} cm de large, et tricote environ ${COTE_CONSEILLE} cm dans le point choisi.`}</li>
            <li>Rabats, lave l'échantillon comme tu laveras l'ouvrage et laisse-le sécher à plat.</li>
            <li>Au centre, compte les mailles et les rangs sur 10 cm, loin des bords.</li>
            <li>Mesure le carré entier, en largeur et en hauteur.</li>
            <li>Pèse-le : avec une balance au gramme, un carré de ${COTE_CONSEILLE} cm donne un métrage bien plus précis.</li>
          </ol>
        </details>

        <section class="carte-bloc" aria-labelledby="titre-mesures">
          <h2 id="titre-mesures">Mes mesures</h2>
          <div class="rangee">
            <${Champ} libelle="Mailles sur 10 cm" mode="decimal" placeholder="ex. 17" valeur=${e.maillesPour10cm}
              erreur=${erreurs.maillesPour10cm} surChangement=${(v) => maj({ maillesPour10cm: v })} />
            <${Champ} libelle="Rangs sur 10 cm" mode="decimal" placeholder="ex. 28" valeur=${e.rangsPour10cm}
              erreur=${erreurs.rangsPour10cm} surChangement=${(v) => maj({ rangsPour10cm: v })} />
          </div>
          <label class="case">
            <input type="checkbox" checked=${e.lave} onChange=${(ev) => maj({ lave: ev.currentTarget.checked })} />
            Lavé et séché avant de mesurer
          </label>
          ${!e.lave && html`<p class="note">Un échantillon lavé est plus fiable : la laine peut se resserrer ou s'élargir au premier lavage.</p>`}
        </section>

        <section class="carte-bloc" aria-labelledby="titre-pesee">
          <h2 id="titre-pesee">Pesée (facultatif)</h2>
          <${Champ} libelle="Poids (en grammes)" mode="numeric" placeholder="ex. 12" valeur=${e.pesee.grammes}
            erreur=${erreurs.grammes} surChangement=${(v) => majP({ grammes: v })} />
          <div class="rangee">
            <${Champ} libelle="Largeur du carré (cm)" mode="decimal" placeholder=${`ex. ${COTE_CONSEILLE}`} valeur=${e.pesee.largeurCm}
              erreur=${erreurs.largeurCm} surChangement=${(v) => majP({ largeurCm: v })} />
            <${Champ} libelle="Hauteur du carré (cm)" mode="decimal" placeholder=${`ex. ${COTE_CONSEILLE}`} valeur=${e.pesee.hauteurCm}
              erreur=${erreurs.hauteurCm} surChangement=${(v) => majP({ hauteurCm: v })} />
          </div>
          ${alerte && html`<${Encart} type="brique">${alerte}<//>`}
        </section>

        <section class="carte-bloc" aria-labelledby="titre-autres">
          <h2 id="titre-autres">Date et note</h2>
          <${Champ} libelle="Tricoté le" type="date" valeur=${e.date} erreur=${erreurs.date} surChangement=${(v) => maj({ date: v })} />
          <${Champ} libelle="Note (facultatif)" valeur=${e.note} placeholder="ex. tricoté un peu serré"
            surChangement=${(v) => maj({ note: v })} />
        </section>

        <${Encart}>${point && laine
          ? `Il sera gardé dans ta réserve : pour un prochain projet en ${nomAvecArticle(point).replace(/^(le|la|les) /, "")} avec cette laine et ces aiguilles, il sera retrouvé tout seul.`
          : "Il sera gardé dans ta réserve et retrouvé tout seul dès qu'un projet reprendra la même laine, le même point et la même taille d'aiguille."}<//>

        ${!nouveau &&
        html`<button type="button" class="bouton-lien bouton-danger" onClick=${() => setConfirmer(true)}>Supprimer cet échantillon</button>`}
        <button type="submit" class="visuellement-cache" tabindex="-1">Enregistrer</button>
      </form>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" onClick=${enregistrer} disabled=${choixLaines.length === 0}>
          ${nouveau ? "Enregistrer l'échantillon" : "Enregistrer"}
        </button>
      </div>

      <${Fenetre} ouverte=${confirmer} titre="Supprimer cet échantillon ?" surFermeture=${() => setConfirmer(false)}
        actions=${html`
          <button type="button" class="bouton-principal" onClick=${supprimer}>Supprimer définitivement</button>
          <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(false)}>Annuler</button>`}>
        <p>Il sera retiré de ta réserve, et les projets ne pourront plus le retrouver. Cette action ne peut pas être annulée.</p>
      <//>
    </main>`;
}
