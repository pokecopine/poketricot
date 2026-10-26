// Catalogue de points : liste par familles (écran 6, en consultation) et fiche détaillée d'un point.
import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer, retour } from "../routeur.js";
import { useProjet } from "../composants/etape.js";
import { PatronDejaCree } from "./patron.js";
import { zoneAvis, avecPointDuBloc, avecPointDeColonne, cheminEtape, avisPourBloc } from "../donnees/projets.js";
import { NOMS_DES_ZONES } from "../moteur/plan.js";
import { EnTete, Onglets, Encart } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { Echantillon3D } from "../composants/echantillon3d.js";
import { IconeChevron, IconeCoeur, IconeEprouvette } from "../composants/icones.js";
import { MARQUES, pointsMarques, estMarque, basculerMarque } from "../donnees/marques.js";
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

/** Nom du site d'où vient un point : « Les Triconautes », ou le nom de domaine. */
export function nomSource(url) {
  try {
    const hote = new URL(url).hostname.replace(/^www\./, "");
    return hote.includes("lestriconautes") ? "Les Triconautes" : hote;
  } catch {
    return "la source";
  }
}

/** Cœur (favori) et éprouvette (à tester) d'un point : boutons à cocher. */
function MarquesPoint({ point, classe = "marques-point" }) {
  const { prefs, majPrefs, flash } = useApp();
  const bouton = (marque, Icone) => {
    const actif = estMarque(prefs, marque.cle, point.id);
    return html`<button type="button" class=${"marque marque-" + marque.cle} aria-pressed=${String(actif)}
      aria-label=${`${actif ? marque.retirer : marque.ajouter} : ${point.nom}`} title=${actif ? marque.retirer : marque.ajouter}
      onClick=${async (e) => {
        e.stopPropagation();
        await majPrefs((p) => basculerMarque(p, marque.cle, point.id));
        flash(actif ? marque.retire : marque.ajoute);
      }}>
      ${Icone({ plein: actif })}
    </button>`;
  };
  return html`<div class=${classe}>${bouton(MARQUES.favoris, IconeCoeur)}${bouton(MARQUES.aTester, IconeEprouvette)}</div>`;
}

/** Fiche résumée d'un point (comme dans la maquette « Choix des points »). */
function CartePoint({ point, couleur, piece, zone = "corps", selection }) {
  const avis = selection?.avis ? selection.avis(point) : piece ? avisPour(point, piece, zone) : { avis: "conseille" };
  const choisi = selection && selection.actuel === point.id;
  return html`
    <div class=${"carte-point-cadre" + (choisi ? " carte-point-choisie" : "")}>
      <button type="button" class="carte-point" aria-pressed=${selection ? String(choisi) : undefined}
        onClick=${() => (selection ? selection.choisir(point.id) : naviguer("/points/" + point.id))}>
        <${BandeTexture} point=${point} couleur=${couleur} hauteur=${64} />
        <span class="carte-point-corps">
          <span class="carte-point-titre">
            <span>${point.nom}</span>${choisi ? html`<span class="badge">Choisi</span>` : selection ? null : IconeChevron()}
          </span>
          <${Etiquettes} point=${point} />
          <span class="note">Conseillé pour : ${texteOuvragesConseilles(point)} · ${texteConsommation(point).toLowerCase()}</span>
          ${avis.avis !== "conseille" && avis.raison && html`<${Encart} type=${avis.avis === "deconseille" ? "brique" : "sauge"}>${avis.raison}<//>`}
        </span>
      </button>
      <${MarquesPoint} point=${point} />
      ${selection && point.source &&
      html`<a class="carte-point-lien" href=${point.source} target="_blank" rel="noopener">
        Voir l'article et la vidéo (${nomSource(point.source)})
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"></path><path d="M20 4l-9 9"></path><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"></path></svg>
      </a>`}
    </div>`;
}

function Famille({ titre, points, couleur, piece, zone, selection, ouverte, alerte, icone, classe = "" }) {
  if (points.length === 0) return null;
  return html`
    <details class=${"famille" + (alerte ? " famille-alerte" : "") + (icone ? " famille-marque" : "") + (classe ? " " + classe : "")} open=${ouverte}>
      <summary>
        ${icone && html`<span class="famille-icone">${icone}</span>`}
        <span>${titre}</span>
        <span class="famille-nombre">${points.length} point${points.length > 1 ? "s" : ""}</span>
      </summary>
      <div class="famille-points">
        ${points.map((p) => html`<${CartePoint} key=${p.id} point=${p} couleur=${couleur} piece=${piece} zone=${zone} selection=${selection} />`)}
      </div>
    </details>`;
}

export function CataloguePoints({ selection = null } = {}) {
  const { prefs } = useApp();
  const laines = useCouleurs();
  const [pieceLibre, setPiece] = useState(memoire.piece);
  const [rechercheLibre, setRecherche] = useState(memoire.recherche);
  const [rechercheSelection, setRechercheSelection] = useState("");
  const [couleurChoisie, setCouleur] = useState(memoire.couleur);
  const piece = selection ? selection.piece : pieceLibre;
  const zone = selection ? selection.zone : "corps";
  const recherche = selection ? rechercheSelection : rechercheLibre;
  const couleur = selection?.couleur || couleurChoisie || laines[0]?.couleur || COULEUR_PAR_DEFAUT;

  useEffect(() => {
    if (!selection) Object.assign(memoire, { piece: pieceLibre, recherche: rechercheLibre, couleur: couleurChoisie });
  }, [pieceLibre, rechercheLibre, couleurChoisie]);
  const avis = (p) => (selection?.avis ? selection.avis(p) : avisPour(p, piece, zone)).avis;

  const nomPiece = PIECES.find((p) => p.id === piece)?.nom.toLowerCase();
  const trouves = rechercherPoints(recherche);
  let familles;
  if (recherche.trim()) {
    familles = [{ id: "resultats", titre: `Résultats (${trouves.length})`, points: trouves, ouverte: true }];
  } else {
    const adaptes = (p) => !piece || avis(p) !== "deconseille";
    const familleOuverte = selection ? pointParId(selection.actuel)?.famille || FAMILLES[0].id : FAMILLES[0].id;
    familles = FAMILLES.map((f) => ({
      id: f.id,
      titre: f.nom,
      points: POINTS.filter((p) => p.famille === f.id && adaptes(p))
        // Les points conseillés pour la pièce (et la zone) en premier.
        .sort((a, b) => (piece ? (avis(a) === "conseille" ? 0 : 1) - (avis(b) === "conseille" ? 0 : 1) : 0)),
      ouverte: f.id === familleOuverte,
    }));
    // Mes points favoris et ceux à tester, en tête : ils restent aussi dans leur famille d'origine.
    const conseillesDabord = (liste) =>
      liste.sort((a, b) => (piece ? (avis(a) === "conseille" ? 0 : avis(a) === "possible" ? 1 : 2) - (avis(b) === "conseille" ? 0 : avis(b) === "possible" ? 1 : 2) : 0));
    const marques = [
      { m: MARQUES.favoris, icone: IconeCoeur({ plein: true, taille: 18 }) },
      { m: MARQUES.aTester, icone: IconeEprouvette({ plein: true, taille: 18 }) },
    ].map(({ m, icone }) => ({
      id: m.cle, titre: m.titre, icone, ouverte: true, classe: "famille-" + m.cle,
      points: conseillesDabord(pointsMarques(prefs, m.cle).map(pointParId)),
    }));
    familles = [...marques, ...familles];
    if (piece) {
      familles.push({
        id: "peu-adaptes",
        titre: selection?.titrePeuAdaptes || `Peu adaptés à ${nomPiece === "écharpe" ? "l'écharpe" : nomPiece === "couverture" ? "la couverture" : `au ${nomPiece}`}`,
        points: POINTS.filter((p) => avis(p) === "deconseille"),
        ouverte: false,
        alerte: true,
      });
    }
  }

  return html`
    <main class="ecran">
      ${selection
        ? html`<${EnTete} titre=${selection.titre} secours=${selection.secours} libelleRetour="Revenir sans changer" />`
        : html`<${EnTete} titre="Catalogue de points" secours="/" libelleRetour="Retour à l'accueil" />`}
      <div class="ecran-contenu">
        <label class="champ">
          <span class="visuellement-cache">Rechercher un point</span>
          <input type="search" placeholder="Rechercher : riz, côtes, torsade…" value=${recherche}
            onInput=${(e) => (selection ? setRechercheSelection : setRecherche)(e.currentTarget.value)} />
        </label>
        ${selection && html`<p class="note">${selection.aide}</p>`}

        ${!selection && html`<span class="note" style="font-weight:700">Pour quelle pièce ?</span>`}
        ${!selection && html`<div class="puces" role="group" aria-label="Pièce">
          <button type="button" class="puce" aria-pressed=${String(!piece)} onClick=${() => setPiece(null)}>Toutes</button>
          ${PIECES.map(
            (p) => html`<button type="button" class="puce" aria-pressed=${String(piece === p.id)} onClick=${() => setPiece(p.id)}>${p.nom}</button>`
          )}
        </div>

        <span class="note" style="font-weight:700">Dans la couleur de</span>
        <${ChoixCouleur} laines=${laines} couleur=${couleur} surChoix=${setCouleur} />`}

        ${familles.map(
          (f) => html`<${Famille} key=${f.id + (piece || "") + recherche} titre=${f.titre} points=${f.points} icone=${f.icone} classe=${f.classe}
            couleur=${couleur} piece=${piece} zone=${zone} selection=${selection} ouverte=${f.ouverte} alerte=${f.alerte} />`
        )}
        ${!recherche.trim() && !pointsMarques(prefs, "favoris").length && !pointsMarques(prefs, "aTester").length &&
        html`<p class="note astuce-marques">Touche le ${IconeCoeur({ taille: 15 })} d'un point pour le garder dans « Mes points favoris », ou l'${IconeEprouvette({ taille: 15 })} pour le mettre dans « À tester en priorité ».</p>`}
        ${recherche.trim() && trouves.length === 0 && html`<p class="note">Aucun point ne porte ce nom pour l'instant.</p>`}

        <p class="note">Catalogue : ${POINTS.length} points. D'autres arrivent ensuite.</p>
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
  const [vue, setVue] = useState(memoire.vue || "schema");
  const choisirVue = (v) => {
    memoire.vue = v;
    setVue(v);
  };
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
        <${Onglets} libelle="Vue du point" valeur=${vue} surChoix=${choisirVue}
          choix=${[{ valeur: "schema", libelle: "Schéma" }, { valeur: "3d", libelle: "Échantillon en 3D" }]} />
        <div class="fiche-texture">
          ${vue === "3d"
            ? html`<${Echantillon3D} key=${point.id} point=${point} couleur=${couleur} face=${face} hauteur=${330} />`
            : html`<${BandeTexture} point=${point} couleur=${couleur} hauteur=${190} face=${face} echelle=${1.5} rayon=${20} />`}
          <${MarquesPoint} point=${point} />
        </div>
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

        <a class="bouton-secondaire" href=${point.source} target="_blank" rel="noopener">Voir l'article et la vidéo (${nomSource(point.source)})</a>
        <p class="note">Le lien ouvre le site ${nomSource(point.source) === "Les Triconautes" ? "des Triconautes" : nomSource(point.source)} : il faut du réseau.</p>
      </div>
    </main>`;
}

// ---------------- Choix du point d'un bloc (mode sélection) ----------------

const AIDES_ZONES = {
  corps: "Le point du corps est aussi le point de ton échantillon.",
  bas: "La bordure du bas empêche l'écharpe de rouler : les points qui ne roulent pas sont proposés d'abord.",
  haut: "La bordure du haut empêche l'écharpe de rouler : les points qui ne roulent pas sont proposés d'abord.",
  cotes: "Les bandes latérales bordent l'écharpe sur toute sa longueur : les points qui ne roulent pas sont proposés d'abord.",
  bande: "Une bande décorative dans la longueur de l'écharpe.",
};

export function ChoixPointDuBloc({ id, blocId, colonneId = null }) {
  const { projet, laines, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<main class="ecran"><${EnTete} titre="Projet introuvable" secours="/" /></main>`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;
  const bloc = projet.blocs.find((b) => b.id === blocId);
  if (!bloc) return html`<main class="ecran"><${EnTete} titre="Bloc introuvable" secours=${cheminEtape(projet)} /></main>`;
  const laine = laines.find((l) => l.id === (bloc.laineId || projet.laineId)) || laines.find((l) => l.id === projet.laineId);
  const nomZone = NOMS_DES_ZONES[bloc.zone];
  const iColonne = colonneId ? (bloc.colonnes || []).findIndex((c) => c.id === colonneId) : -1;
  if (iColonne >= 0) {
    const c = bloc.colonnes[iColonne];
    const retourBuilder = `/projet/${encodeURIComponent(projet.id)}/builder`;
    return html`<${CataloguePoints} selection=${{
      piece: projet.type,
      zone: "corps",
      couleur: laine?.couleur,
      actuel: c.pointId,
      avis: (p) => avisPourBloc(p, projet.type, "corps"),
      titre: `Point : colonne ${iColonne + 1} ${bloc.zone === "corps" ? "du corps" : "de la bande"}`,
      aide: "Une colonne dans la longueur de l'écharpe, à côté des autres : chaque point garde son motif.",
      secours: retourBuilder,
      choisir: async (pointId) => {
        await modifier((p) => avecPointDeColonne(p, blocId, colonneId, pointId));
        retour(retourBuilder);
      },
    }} />`;
  }
  const selection = {
    piece: projet.type,
    zone: zoneAvis(bloc.zone),
    couleur: laine?.couleur,
    actuel: bloc.pointId,
    avis: (p) => avisPourBloc(p, projet.type, bloc.zone),
    titrePeuAdaptes: { bas: "Peu adaptés à une bordure", haut: "Peu adaptés à une bordure", cotes: "Peu adaptés aux bandes latérales" }[bloc.zone],
    titre: bloc.zone === "corps" ? "Point principal" : `Point : ${nomZone}`,
    aide: AIDES_ZONES[bloc.zone] || "",
    secours: projet.etape >= 4 ? `/projet/${encodeURIComponent(projet.id)}/builder` : cheminEtape(projet),
    choisir: async (pointId) => {
      await modifier((p) => avecPointDuBloc(p, blocId, pointId));
      retour(projet.etape >= 4 ? `/projet/${encodeURIComponent(projet.id)}/builder` : cheminEtape(projet));
    },
  };
  return html`<${CataloguePoints} selection=${selection} />`;
}
