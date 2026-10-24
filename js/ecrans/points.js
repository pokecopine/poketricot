// Catalogue de points : liste par familles (écran 6, en consultation) et fiche détaillée d'un point.
import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { EnTete, Onglets, Encart } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { IconeChevron } from "../composants/icones.js";
import { POINTS, FAMILLES, PIECES, pointParId, rechercherPoints, avisPour } from "../catalogue/points.js";
import { etiquettesProprietes, texteConsommation, texteDensite, texteMultiple, texteOuvragesConseilles } from "../catalogue/fiche.js";
import { texteRang, texteCote } from "../catalogue/texte.js";
import { TECHNIQUES, techniquesDuPoint } from "../catalogue/techniques.js";
import { convertirEnRond } from "../moteur/simulateur.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";

// Choix gardés pendant la visite (liste → fiche → retour).
const memoire = { piece: null, couleur: null, recherche: "" };

/** Couleurs proposées : celles des laines de la réserve, sinon terracotta. */
function useCouleurs() {
  const { base } = useApp();
  const [laines, setLaines] = useState([]);
  useEffect(() => {
    base.lister("laines").then((l) => setLaines(l.filter((x) => !x.archivee)));
  }, [base]);
  return laines;
}

function ChoixCouleur({ laines, couleur, surChoix }) {
  if (laines.length === 0) {
    return html`<p class="note">Les textures sont dessinées en terracotta ; ajoute des laines à ta réserve pour les voir dans tes couleurs.</p>`;
  }
  return html`
    <div class="puces" role="group" aria-label="Voir les textures dans la couleur de…">
      ${laines.map(
        (l) => html`<button type="button" class="puce" aria-pressed=${String(l.couleur === couleur)}
          style="display:flex;align-items:center;gap:8px" onClick=${() => surChoix(l.couleur)}>
          <span style=${`width:18px;height:18px;border-radius:9px;background:${l.couleur};box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)`} aria-hidden="true"></span>
          ${l.nom}
        </button>`
      )}
    </div>`;
}

function Etiquettes({ point }) {
  return html`<div class="puces" style="gap:6px">
    ${etiquettesProprietes(point).map((t) => html`<span class="etiquette">${t}</span>`)}
  </div>`;
}

/** Fiche résumée d'un point (comme dans la maquette « Choix des points »). */
function CartePoint({ point, couleur, piece }) {
  const avis = piece ? avisPour(point, piece) : { avis: "conseille" };
  return html`
    <button type="button" class="carte-point" onClick=${() => naviguer("/points/" + point.id)}>
      <${BandeTexture} point=${point} couleur=${couleur} hauteur=${64} />
      <span class="carte-point-corps">
        <span class="carte-point-titre">
          <span>${point.nom}</span>${IconeChevron()}
        </span>
        <${Etiquettes} point=${point} />
        <span class="note">Conseillé pour : ${texteOuvragesConseilles(point)} · ${texteConsommation(point).toLowerCase()}</span>
        ${avis.avis !== "conseille" && avis.raison && html`<${Encart} type=${avis.avis === "deconseille" ? "brique" : "sauge"}>${avis.raison}<//>`}
      </span>
    </button>`;
}

function Famille({ titre, points, couleur, piece, ouverte, alerte }) {
  if (points.length === 0) return null;
  return html`
    <details class=${"famille" + (alerte ? " famille-alerte" : "")} open=${ouverte}>
      <summary>
        <span>${titre}</span>
        <span class="famille-nombre">${points.length} point${points.length > 1 ? "s" : ""}</span>
      </summary>
      <div class="famille-points">
        ${points.map((p) => html`<${CartePoint} key=${p.id} point=${p} couleur=${couleur} piece=${piece} />`)}
      </div>
    </details>`;
}

export function CataloguePoints() {
  const laines = useCouleurs();
  const [piece, setPiece] = useState(memoire.piece);
  const [recherche, setRecherche] = useState(memoire.recherche);
  const [couleurChoisie, setCouleur] = useState(memoire.couleur);
  const couleur = couleurChoisie || laines[0]?.couleur || COULEUR_PAR_DEFAUT;

  useEffect(() => {
    Object.assign(memoire, { piece, recherche, couleur: couleurChoisie });
  }, [piece, recherche, couleurChoisie]);

  const nomPiece = PIECES.find((p) => p.id === piece)?.nom.toLowerCase();
  const trouves = rechercherPoints(recherche);
  let familles;
  if (recherche.trim()) {
    familles = [{ id: "resultats", titre: `Résultats (${trouves.length})`, points: trouves, ouverte: true }];
  } else {
    const adaptes = (p) => !piece || avisPour(p, piece).avis !== "deconseille";
    familles = FAMILLES.map((f, i) => ({
      id: f.id,
      titre: f.nom,
      points: POINTS.filter((p) => p.famille === f.id && adaptes(p))
        // Les points conseillés pour la pièce en premier.
        .sort((a, b) => (piece ? (avisPour(a, piece).avis === "conseille" ? 0 : 1) - (avisPour(b, piece).avis === "conseille" ? 0 : 1) : 0)),
      ouverte: i === 0,
    }));
    if (piece) {
      familles.push({
        id: "peu-adaptes",
        titre: `Peu adaptés à ${nomPiece === "écharpe" ? "l'écharpe" : nomPiece === "couverture" ? "la couverture" : `au ${nomPiece}`}`,
        points: POINTS.filter((p) => avisPour(p, piece).avis === "deconseille"),
        ouverte: false,
        alerte: true,
      });
    }
  }

  return html`
    <main class="ecran">
      <${EnTete} titre="Catalogue de points" secours="/" libelleRetour="Retour à l'accueil" />
      <div class="ecran-contenu">
        <label class="champ">
          <span class="visuellement-cache">Rechercher un point</span>
          <input type="search" placeholder="Rechercher : riz, côtes, torsade…" value=${recherche}
            onInput=${(e) => setRecherche(e.currentTarget.value)} />
        </label>

        <span class="note" style="font-weight:700">Pour quelle pièce ?</span>
        <div class="puces" role="group" aria-label="Pièce">
          <button type="button" class="puce" aria-pressed=${String(!piece)} onClick=${() => setPiece(null)}>Toutes</button>
          ${PIECES.map(
            (p) => html`<button type="button" class="puce" aria-pressed=${String(piece === p.id)} onClick=${() => setPiece(p.id)}>${p.nom}</button>`
          )}
        </div>

        <span class="note" style="font-weight:700">Dans la couleur de</span>
        <${ChoixCouleur} laines=${laines} couleur=${couleur} surChoix=${setCouleur} />

        ${familles.map(
          (f) => html`<${Famille} key=${f.id + (piece || "") + recherche} titre=${f.titre} points=${f.points}
            couleur=${couleur} piece=${piece} ouverte=${f.ouverte} alerte=${f.alerte} />`
        )}
        ${recherche.trim() && trouves.length === 0 && html`<p class="note">Aucun point ne porte ce nom pour l'instant.</p>`}

        <p class="note">Première fournée : ${POINTS.length} points. Les autres arrivent ensuite.</p>
      </div>
    </main>`;
}

// ---------------- Fiche d'un point ----------------

function Recette({ point, mode }) {
  if (mode === "rond") {
    const rond = convertirEnRond(point);
    if (!rond.ok) return html`<${Encart} type="brique">${rond.erreur}<//>`;
    return html`
      <p class="note">Sur aiguilles circulaires, en rond : ${texteMultiple(point, "rond")}. Tous les tours se tricotent sur l'endroit.</p>
      <ol class="recette">
        ${rond.miseEnPlace.map((r) => html`<li class="recette-mep"><strong>Mise en place (une fois)</strong> ${texteRang(r, { tour: true })}</li>`)}
        ${rond.rangs.map((r, i) => html`<li><strong>Tour ${i + 1}</strong> ${texteRang(r, { tour: true })}</li>`)}
      </ol>
      <p class="note">Répète ces ${rond.rangs.length} tours.</p>`;
  }
  return html`
    <p class="note">À plat : ${texteMultiple(point, "plat")}, sans compter les mailles lisières.</p>
    <ol class="recette">
      ${(point.miseEnPlace || []).map(
        (r) => html`<li class="recette-mep"><strong>Mise en place (une fois, sur l'${texteCote(r.cote)})</strong> ${texteRang(r)}</li>`
      )}
      ${point.rangs.map((r, i) => html`<li><strong>Rang ${i + 1} (${texteCote(r.cote)})</strong> ${texteRang(r)}</li>`)}
    </ol>
    <p class="note">Répète ces ${point.rangs.length} rangs.</p>`;
}

export function FichePoint({ id }) {
  const laines = useCouleurs();
  const point = pointParId(id);
  const [face, setFace] = useState("endroit");
  const [mode, setMode] = useState("plat");
  const [couleurChoisie, setCouleur] = useState(memoire.couleur);
  const couleur = couleurChoisie || laines[0]?.couleur || COULEUR_PAR_DEFAUT;

  if (!point) {
    return html`<main class="ecran"><${EnTete} titre="Point introuvable" secours="/points" />
      <div class="ecran-contenu"><p>Ce point n'existe pas dans le catalogue.</p></div></main>`;
  }
  const techniques = techniquesDuPoint(point);

  return html`
    <main class="ecran">
      <${EnTete} titre=${point.nom} secours="/points" libelleRetour="Retour au catalogue" />
      <div class="ecran-contenu">
        <${BandeTexture} point=${point} couleur=${couleur} hauteur=${190} face=${face} echelle=${1.5} rayon=${20} />
        <${Onglets} libelle="Côté du tricot" valeur=${face}
          choix=${[{ valeur: "endroit", libelle: "Endroit" }, { valeur: "envers", libelle: "Envers" }]}
          surChoix=${setFace} />
        <${ChoixCouleur} laines=${laines} couleur=${couleur} surChoix=${(c) => { setCouleur(c); memoire.couleur = c; }} />

        <p style="font-size:16px">${point.resume}</p>
        <${Etiquettes} point=${point} />

        <section class="carte-bloc" aria-labelledby="titre-ouvrages">
          <h2 id="titre-ouvrages">Pour quels ouvrages ?</h2>
          <ul class="liste-avis">
            ${PIECES.map((p) => {
              const a = point.ouvrages[p.id];
              const libelle = { conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[a.avis];
              return html`<li>
                <span class=${"avis avis-" + a.avis}>${libelle}</span>
                <span><strong>${p.nom}</strong>${a.raison ? html` — ${a.raison}` : ""}</span>
              </li>`;
            })}
            ${point.zones?.bordure &&
            html`<li>
              <span class=${"avis avis-" + point.zones.bordure.avis}>${{ conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[point.zones.bordure.avis]}</span>
              <span><strong>En bordure</strong>${point.zones.bordure.raison ? html` — ${point.zones.bordure.raison}` : ""}</span>
            </li>`}
          </ul>
          <p class="note">${texteConsommation(point)}. ${texteDensite(point)} Ces chiffres sont des estimations : ton échantillon fera foi.</p>
          ${point.avertissements?.laineFloue && html`<${Encart}>${point.avertissements.laineFloue}<//>`}
          ${point.blocage && html`<${Encart}>Un blocage après lavage ouvre bien les jours de la dentelle.<//>`}
        </section>

        <section class="carte-bloc" aria-labelledby="titre-recette">
          <h2 id="titre-recette">Comment le tricoter</h2>
          <${Onglets} libelle="Tricot à plat ou en rond" valeur=${mode}
            choix=${[{ valeur: "plat", libelle: "À plat" }, { valeur: "rond", libelle: "En rond" }]}
            surChoix=${setMode} />
          <${Recette} point=${point} mode=${mode} />
        </section>

        ${techniques.length > 0 &&
        html`<section class="carte-bloc" aria-labelledby="titre-techniques">
          <h2 id="titre-techniques">Les gestes à connaître</h2>
          ${techniques.map(
            (t) => html`<div class="technique">
              <strong>${TECHNIQUES[t]?.titre || t}</strong>
              <p>${TECHNIQUES[t]?.explication || ""}</p>
            </div>`
          )}
        </section>`}

        <a class="bouton-secondaire" href=${point.source} target="_blank" rel="noopener">Voir l'article et la vidéo (Les Triconautes)</a>
        <p class="note">Le lien ouvre le site des Triconautes : il faut du réseau.</p>
      </div>
    </main>`;
}
