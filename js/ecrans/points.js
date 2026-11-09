// Catalogue de points : liste par familles (écran 6, en consultation) et fiche détaillée d'un point.
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer, retour } from "../routeur.js";
import { useProjet } from "../composants/etape.js";
import { PatronDejaCree } from "./patron.js";
import { zoneAvis, avecPointDuBloc, avecPointDeColonne, cheminEtape, avisPourBloc, nomBloc, numeroSection, largeurDuBlocCm, echantillonDuProjet, enRond } from "../donnees/projets.js";
const minusculeNom = (s) => s.charAt(0).toLowerCase() + s.slice(1);
import { NOMS_DES_ZONES } from "../moteur/plan.js";
import { EnTete, Onglets, Encart } from "../composants/base.js";
import { BandeTexture } from "../composants/texture.js";
import { Echantillon3D } from "../composants/echantillon3d.js";
import { Vignette3D } from "../composants/vignette3d.js";
import { IconeChevron, IconeCoeur, IconeEprouvette } from "../composants/icones.js";
import { MARQUES, pointsMarques, estMarque, basculerMarque } from "../donnees/marques.js";
import { POINTS, FAMILLES, PIECES, pointParId, rechercherPoints, avisPour } from "../catalogue/points.js";
import { etiquettesProprietes, texteConsommation, texteDensite, texteMultiple, texteOuvragesConseilles } from "../catalogue/fiche.js";
import { texteRang, texteCote, texteDeplacement } from "../catalogue/texte.js";
import { TECHNIQUES, techniquesDuPoint } from "../catalogue/techniques.js";
import { convertirEnRond } from "../moteur/simulateur.js";
import { CRITERES, filtrerParCriteres } from "../catalogue/criteres.js";
import { avisCotes } from "../catalogue/cotes.js";
import { avisAvecLaLaine, rangLaine, grosseurDeLaine, GROSSEURS, motifDansLeBloc, maillesEstimees } from "../catalogue/laine.js";
import { nomEpaisseur, lireNombre } from "../donnees/reserve.js";
import { densitePoint } from "../moteur/densite.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";

// Choix gardés pendant la visite (liste → fiche → retour).
const memoire = { piece: null, couleur: null, recherche: "", criteres: [] };

/** Couleurs proposées : celles des laines de la réserve, sinon terracotta. */
function useCouleurs() {
  const { base } = useApp();
  const [laines, setLaines] = useState([]);
  useEffect(() => {
    base.lister("laines").then((l) => setLaines(l.filter((x) => !x.archivee)));
  }, [base]);
  return laines;
}

/** Menu déroulant des couleurs : la pastille de la laine choisie reste visible, et chaque choix a la sienne. */
function ChoixCouleur({ laines, couleur, surChoix }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e) => !boite.current?.contains(e.target) && setOuvert(false);
    const echap = (e) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  if (laines.length === 0) {
    return html`<p class="note">Les textures sont dessinées en terracotta ; ajoute des laines à ta réserve pour les voir dans tes couleurs.</p>`;
  }
  const actuelle = laines.find((l) => l.couleur === couleur) || laines[0];
  const pastille = (c) => html`<span class="pastille-couleur" style=${`background:${c}`} aria-hidden="true"></span>`;
  return html`
    <div class="choix-couleur" ref=${boite}>
      <button type="button" class="choix-couleur-bouton" aria-haspopup="listbox" aria-expanded=${String(ouvert)}
        aria-label=${`Couleur des textures : ${actuelle.nom}`} onClick=${() => setOuvert(!ouvert)}>
        ${pastille(actuelle.couleur)}<span class="choix-couleur-nom">${actuelle.nom}</span>
        <span class="choix-couleur-fleche" aria-hidden="true">▾</span>
      </button>
      ${ouvert &&
      html`<ul class="choix-couleur-liste" role="listbox" aria-label="Voir les textures dans la couleur de…">
        ${laines.map(
          (l) => html`<li role="option" aria-selected=${String(l.id === actuelle.id)}>
            <button type="button" onClick=${() => { surChoix(l.couleur); setOuvert(false); }}>
              ${pastille(l.couleur)}<span>${l.nom}</span>${l.id === actuelle.id && html`<span class="choix-couleur-coche" aria-hidden="true">✓</span>`}
            </button>
          </li>`
        )}
      </ul>`}
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

/** Cœur (favori) et éprouvette (à tester) d'un point : boutons à cocher, à côté du nom (0.13.0). */
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

/** Dessin du point et sa vignette en échantillon 3D, côte à côte, avant d'ouvrir la fiche. */
function VisuelCarte({ point, couleur }) {
  return html`<span class="carte-visuel">
    <${BandeTexture} point=${point} couleur=${couleur} hauteur=${112} />
    <${Vignette3D} point=${point} couleur=${couleur} largeur="100%" hauteur=${112} />
  </span>`;
}

/** Fiche résumée d'un point (comme dans la maquette « Choix des points »). */
/** Laine du menu « Dans la couleur de » (catalogue) : celle de la couleur choisie, sinon la première. */
function laineDuMenu(laines, couleur) {
  return laines.find((l) => l.couleur === couleur) || laines[0] || null;
}

/** « Avec ta laine » sur une carte (0.18.0) : sauge si conseillé, brique si peu adapté, jamais bloquant. */
function LigneLaine({ avis }) {
  if (!avis) return null;
  const lignes = [];
  if (avis.raison) lignes.push({ classe: { conseille: "ligne-laine-conseil", possible: "ligne-laine-possible", deconseille: "ligne-laine-alerte" }[avis.avis], texte: avis.raison });
  if (avis.motif) lignes.push({ classe: "ligne-laine-possible", texte: avis.motif });
  return lignes.map((l) => html`<span class=${"ligne-laine " + l.classe}><span class="ligne-laine-pelote" aria-hidden="true"></span>${l.texte}</span>`);
}

function CartePoint({ point, couleur, piece, zone = "corps", selection, avisLaine = null }) {
  const avis = selection?.avis ? selection.avis(point) : piece ? avisPour(point, piece, zone) : { avis: "conseille" };
  const choisi = selection && selection.actuel === point.id;
  // Refusé (bord d'un bonnet avec revers, 0.17.0) : la carte est grisée et ne choisit rien.
  const refuse = !!selection && avis.avis === "refuse";
  const { flash } = useApp();
  return html`
    <div class=${"carte-point-cadre" + (choisi ? " carte-point-choisie" : "") + (refuse ? " carte-point-refusee" : "")}>
      <button type="button" class="carte-point" aria-pressed=${selection ? String(choisi) : undefined} aria-disabled=${refuse ? "true" : undefined}
        onClick=${() => (refuse ? flash(selection.messageRefus || "Ce point ne peut pas être choisi ici.") : selection ? selection.choisir(point.id) : naviguer("/points/" + point.id))}>
        <${VisuelCarte} point=${point} couleur=${couleur} />
        <span class="carte-point-corps">
          <span class="carte-point-titre">
            <span class="carte-point-nom">${point.nom}${!choisi && !selection ? html`<span class="carte-point-chevron">${IconeChevron()}</span>` : null}</span>${choisi && html`<span class="badge">Choisi</span>`}
          </span>
          <${Etiquettes} point=${point} />
          <span class="note">Conseillé pour : ${texteOuvragesConseilles(point)} · ${texteConsommation(point).toLowerCase()}</span>
          ${avis.avis !== "conseille" && avis.raison && html`<${Encart} type=${avis.avis === "deconseille" || refuse ? "brique" : "sauge"}>${avis.raison}<//>`}
          <${LigneLaine} avis=${avisLaine} />
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

function Famille({ titre, points, couleur, piece, zone, selection, ouverte, alerte, icone, classe = "", avisLaine }) {
  if (points.length === 0) return null;
  return html`
    <details class=${"famille" + (alerte ? " famille-alerte" : "") + (icone ? " famille-marque" : "") + (classe ? " " + classe : "")} open=${ouverte}>
      <summary>
        ${icone && html`<span class="famille-icone">${icone}</span>`}
        <span>${titre}</span>
        <span class="famille-nombre">${points.length} point${points.length > 1 ? "s" : ""}</span>
      </summary>
      <div class="famille-points">
        ${points.map((p) => html`<${CartePoint} key=${p.id} point=${p} couleur=${couleur} piece=${piece} zone=${zone} selection=${selection} avisLaine=${avisLaine(p)} />`)}
      </div>
    </details>`;
}

export function CataloguePoints({ selection = null } = {}) {
  const { prefs, flash } = useApp();
  const laines = useCouleurs();
  const [pieceLibre, setPiece] = useState(memoire.piece);
  const [rechercheLibre, setRecherche] = useState(memoire.recherche);
  const [rechercheSelection, setRechercheSelection] = useState("");
  const [couleurChoisie, setCouleur] = useState(memoire.couleur);
  const [criteres, setCriteres] = useState(selection ? [] : memoire.criteres);
  const basculerCritere = (id) => setCriteres((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const piece = selection ? selection.piece : pieceLibre;
  const zone = selection ? selection.zone : "corps";
  const recherche = selection ? rechercheSelection : rechercheLibre;
  const couleur = selection?.couleur || couleurChoisie || laines[0]?.couleur || COULEUR_PAR_DEFAUT;

  useEffect(() => {
    if (!selection) Object.assign(memoire, { piece: pieceLibre, recherche: rechercheLibre, couleur: couleurChoisie, criteres });
  }, [pieceLibre, rechercheLibre, couleurChoisie, criteres]);
  const avis = (p) => (selection?.avis ? selection.avis(p) : avisPour(p, piece, zone)).avis;
  // 0.18.0 : la laine qui juge les points — celle du bloc pendant un projet, celle du menu dans le catalogue.
  const laine = selection ? selection.laine || null : laineDuMenu(laines, couleur);
  const cacheLaine = new Map();
  const avisLaine = (p) => {
    if (!laine) return null;
    if (!cacheLaine.has(p.id)) cacheLaine.set(p.id, avisAvecLaLaine(p, laine, selection?.motif ? selection.motif(p) : null));
    return cacheLaine.get(p.id);
  };
  // Dans chaque famille : conseillés pour la pièce et pour la laine, puis pour la pièce, puis pour la laine ; peu adaptés à la laine en dernier.
  const rangTri = (p) => {
    const r = rangLaine(avisLaine(p));
    const pieceOk = !piece || avis(p) === "conseille";
    return (pieceOk ? 0 : 2) + (r === 0 ? 0 : 1) + (r === 3 ? 4 : 0);
  };

  const nomPiece = PIECES.find((p) => p.id === piece)?.nom.toLowerCase();
  const filtre = recherche.trim() || criteres.length > 0;
  const trouves = filtrerParCriteres(rechercherPoints(recherche), criteres, laine ? { avisLaine, grosseur: grosseurDeLaine(laine) } : null);
  let familles;
  if (filtre) {
    familles = [{ id: "resultats", titre: "Résultats", points: trouves, ouverte: true }];
  } else {
    const adaptes = (p) => !piece || (avis(p) !== "deconseille" && avis(p) !== "refuse");
    // Tout est fermé au départ (catalogue comme choix d'un point pour un projet) : on ouvre la famille qu'on veut.
    familles = FAMILLES.map((f) => ({
      id: f.id,
      titre: f.nom,
      points: POINTS.filter((p) => p.famille === f.id && adaptes(p))
        // Les points conseillés pour la pièce (et la zone) et pour la laine en premier (0.18.0).
        .sort((a, b) => rangTri(a) - rangTri(b)),
      ouverte: false,
    }));
    // Mes points favoris et ceux à tester, en tête : ils restent aussi dans leur famille d'origine.
    const conseillesDabord = (liste) =>
      liste.sort((a, b) => (piece ? (avis(a) === "conseille" ? 0 : avis(a) === "possible" ? 1 : 2) - (avis(b) === "conseille" ? 0 : avis(b) === "possible" ? 1 : 2) : 0));
    const marques = [
      { m: MARQUES.favoris, icone: IconeCoeur({ plein: true, taille: 18 }) },
      { m: MARQUES.aTester, icone: IconeEprouvette({ plein: true, taille: 18 }) },
    ].map(({ m, icone }) => ({
      id: m.cle, titre: m.titre, icone, ouverte: false, classe: "famille-" + m.cle,
      points: conseillesDabord(pointsMarques(prefs, m.cle).map(pointParId)),
    }));
    familles = [...marques, ...familles];
    // Choix du point des bandes latérales : les points qui tiennent les bords, en tête et ouverts (0.13.0).
    if (zone === "cotes") {
      familles.unshift({
        id: "pour-cotes", titre: "Conseillés pour les côtés", ouverte: true, classe: "famille-cotes",
        points: POINTS.filter((p) => avis(p) === "conseille"),
      });
    }
    if (piece) {
      familles.push({
        id: "peu-adaptes",
        titre: selection?.titrePeuAdaptes || `Peu adaptés à ${nomPiece === "écharpe" ? "l'écharpe" : nomPiece === "couverture" ? "la couverture" : nomPiece === "jambières" ? "des jambières" : `au ${nomPiece}`}`,
        points: POINTS.filter((p) => avis(p) === "deconseille"),
        ouverte: false,
        alerte: true,
      });
      // Bord d'un bonnet avec revers : les points non réversibles, grisés, tout en dernier (0.17.0).
      const refuses = POINTS.filter((p) => avis(p) === "refuse");
      if (refuses.length) {
        familles.push({ id: "refuses", titre: selection?.titreRefuses || "Ne conviennent pas ici", points: refuses, ouverte: false, alerte: true });
      }
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
        <div class="puces criteres" role="group" aria-label="Critères">
          ${CRITERES.map((c) => {
            const grise = c.besoinLaine && !laine;
            return html`<button type="button" class="puce puce-critere" aria-pressed=${String(criteres.includes(c.id) && !grise)}
              aria-disabled=${grise ? "true" : undefined} title=${grise ? "Choisis une laine" : c.aide || c.libelle}
              onClick=${() => (grise ? flash("Choisis une laine : ajoute-en une à ta réserve.") : basculerCritere(c.id))}>${c.libelle}</button>`;
          })}
          ${criteres.length > 0 && html`<button type="button" class="puce-effacer" onClick=${() => setCriteres([])}>Effacer</button>`}
        </div>
        ${criteres.includes("grandMotif") && html`<p class="note">Grand motif : ${CRITERES.find((c) => c.id === "grandMotif").aide}.</p>`}
        ${criteres.includes("cotes") && html`<p class="note">Pour les côtés : ${CRITERES.find((c) => c.id === "cotes").aide}.</p>`}
        ${!laine && html`<p class="note">Pour ma laine : choisis une laine.</p>`}
        ${laine && criteres.includes("laine") && html`<p class="note">Pour ma laine (« ${laine.nom} »${grosseurDeLaine(laine) ? `, ${nomEpaisseur(laine.epaisseur)}, laine ${GROSSEURS.find((g) => g.id === grosseurDeLaine(laine)).nom}` : ""}) : ${["moyenne", null].includes(grosseurDeLaine(laine)) ? "en laine moyenne, tous les points vont bien ; seuls les motifs qui ne tiennent pas assez de fois sont retirés" : CRITERES.find((c) => c.id === "laine").aide}.</p>`}
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
          (f) => html`<${Famille} key=${f.id + (piece || "") + recherche + criteres.join() + (laine?.id || "")} titre=${f.titre} points=${f.points} icone=${f.icone} classe=${f.classe}
            couleur=${couleur} piece=${piece} zone=${zone} selection=${selection} ouverte=${f.ouverte} alerte=${f.alerte} avisLaine=${avisLaine} />`
        )}
        ${!filtre && !pointsMarques(prefs, "favoris").length && !pointsMarques(prefs, "aTester").length &&
        html`<p class="note astuce-marques">Touche le ${IconeCoeur({ taille: 15 })} d'un point pour le garder dans « Mes points favoris », ou l'${IconeEprouvette({ taille: 15 })} pour le mettre dans « À tester en priorité ».</p>`}
        ${filtre && trouves.length === 0 &&
        html`<p class="note">${criteres.length ? "Aucun point ne remplit tous ces critères" + (recherche.trim() ? " avec ce nom" : "") + " : décoche un critère." : "Aucun point ne porte ce nom pour l'instant."}</p>`}

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
        ${rond.rangs.map((r, i) => html`<li>${r.decale ? html`<span class="recette-marqueur">${texteDeplacement(r.decale)}</span> ` : ""}<strong>Tour ${i + 1}</strong> ${texteRang(r, { tour: true })}</li>`)}
      </ol>
      <p class="note">Répète ces ${rond.rangs.length} tours.${rond.marqueur ? " Le motif se décale d'un tour à l'autre : en déplaçant le marqueur, chaque tour commence au début d'un motif (pas au tout premier tour)." : ""}</p>`;
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
      <${EnTete} titre=${point.nom} secours="/points" libelleRetour="Retour au catalogue"
        actions=${html`<${MarquesPoint} point=${point} classe="marques-point marques-titre" />`} />
      <div class="ecran-contenu">
        <${Onglets} libelle="Vue du point" valeur=${vue} surChoix=${choisirVue}
          choix=${[{ valeur: "schema", libelle: "Schéma" }, { valeur: "3d", libelle: "Échantillon en 3D" }]} />
        <div class="fiche-texture">
          ${vue === "3d"
            ? html`<${Echantillon3D} key=${point.id} point=${point} couleur=${couleur} face=${face} hauteur=${330} />`
            : html`<${BandeTexture} point=${point} couleur=${couleur} hauteur=${190} face=${face} echelle=${1.5} rayon=${20} />`}
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
              const a = avisPour(point, p.id);
              const libelle = { conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[a.avis];
              return html`<li>
                <span class=${"avis avis-" + a.avis}>${libelle}</span>
                <span><strong>${p.nom}</strong>${a.raison ? html` — ${a.raison}` : ""}</span>
              </li>`;
            })}
            ${point.zones?.bordure &&
            html`<li>
              <span class=${"avis avis-" + point.zones.bordure.avis}>${{ conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[point.zones.bordure.avis]}</span>
              <span><strong>En bordure (haut et bas)</strong>${point.zones.bordure.raison ? html` — ${point.zones.bordure.raison}` : ""}</span>
            </li>`}
            ${(() => {
              const l = laineDuMenu(laines, couleur);
              if (!l) return null;
              const a = avisAvecLaLaine(point, l);
              const ep = nomEpaisseur(l.epaisseur);
              return html`<li>
                ${a?.avis
                  ? html`<span class=${"avis avis-" + a.avis}>${{ conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[a.avis]}</span>`
                  : html`<span class="avis avis-possible">Possible</span>`}
                <span><strong>Avec ta laine</strong> (« ${l.nom} »${ep ? `, ${ep}` : ""})${a?.raison ? html` — ${a.raison}` : grosseurDeLaine(l) ? " — rien de particulier pour cette grosseur de laine." : " — indique l'épaisseur de ta laine pour avoir un avis."}</span>
              </li>`;
            })()}
            ${(() => {
              const a = avisCotes(point);
              return html`<li>
                <span class=${"avis avis-" + a.avis}>${{ conseille: "Conseillé", possible: "Possible", deconseille: "Peu adapté" }[a.avis]}</span>
                <span><strong>Sur les côtés</strong>${a.raison ? html` — ${a.raison}` : ""}</span>
              </li>`;
            })()}
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
  cotes: "Les bandes latérales bordent l'écharpe sur toute sa longueur : les points qui tiennent les bords et ne roulent pas sont proposés en tête.",
  bande: "Une bande décorative dans la longueur de l'écharpe.",
};

const AIDES_ZONES_BONNET = {
  corps: "Le point du corps est aussi le point de ton échantillon. Un point simple continue jusqu'au sommet ; un grand motif passe en jersey au sommet.",
  bas: "Le bord tient le bonnet sur la tête : les côtes sont élastiques et ne roulent pas.",
};

const AIDES_ZONES_SNOOD = {
  corps: "Le point du corps est aussi le point de ton échantillon.",
  bas: "La bordure du bas tient le bord du snood : les points qui ne roulent pas sont proposés d'abord.",
  haut: "La bordure du haut tient le bord du snood : les points qui ne roulent pas sont proposés d'abord.",
  bande: "Une bande décorative tout autour du snood.",
};

const AIDES_ZONES_JAMBIERES = {
  corps: "Le point du corps est aussi le point de ton échantillon.",
  bas: "Le bord du bas tient la jambière à la cheville : les côtes sont élastiques et ne roulent pas.",
  haut: "Le bord du haut tient la jambière sous le genou : les côtes sont élastiques et ne roulent pas.",
  bande: "Une bande décorative tout autour de la jambière.",
};

export function ChoixPointDuBloc({ id, blocId, colonneId = null }) {
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  if (introuvable) return html`<main class="ecran"><${EnTete} titre="Projet introuvable" secours="/" /></main>`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;
  const bloc = projet.blocs.find((b) => b.id === blocId);
  if (!bloc) return html`<main class="ecran"><${EnTete} titre="Bloc introuvable" secours=${cheminEtape(projet)} /></main>`;
  const laine = laines.find((l) => l.id === (bloc.laineId || projet.laineId)) || laines.find((l) => l.id === projet.laineId);
  const nomZone = NOMS_DES_ZONES[bloc.zone];
  const section1 = bloc.section && numeroSection(projet, bloc) === 1;
  const iColonne = colonneId ? (bloc.colonnes || []).findIndex((c) => c.id === colonneId) : -1;
  // 0.18.0 (C-3) : combien de fois le motif tient dans le bloc, avec la densité de la laine principale dans ce point.
  const principale = laines.find((l) => l.id === projet.laineId);
  const aig = aiguilles.find((a) => a.id === projet.aiguillesId);
  const largeurCm = largeurDuBlocCm(projet, bloc, { colonne: iColonne >= 0 });
  const echantillonPrincipal = echantillonDuProjet(projet, aig, echantillons);
  const motif = (p) => {
    if (!largeurCm || !principale) return null;
    const d = densitePoint({ pointId: p.id, laine: principale, tailleAiguille: lireNombre(aig?.tailleMm), echantillons, echantillonPrincipal });
    return motifDansLeBloc(p, maillesEstimees(largeurCm, d), { enRond: enRond(projet), colonne: iColonne >= 0 });
  };
  if (iColonne >= 0) {
    const c = bloc.colonnes[iColonne];
    const retourBuilder = `/projet/${encodeURIComponent(projet.id)}/builder`;
    return html`<${CataloguePoints} selection=${{
      piece: projet.type,
      zone: "corps",
      couleur: laine?.couleur,
      laine,
      motif,
      actuel: c.pointId,
      avis: (p) => avisPourBloc(p, projet.type, "corps", { colonne: true, rond: enRond(projet) }),
      titre: `Point : colonne ${iColonne + 1} ${bloc.section ? `de la ${minusculeNom(nomBloc(bloc, projet))}` : bloc.zone === "corps" ? "du corps" : "de la bande"}`,
      aide: enRond(projet)
        ? "Une colonne autour du tour, à côté des autres : chaque point garde son motif. Un point qui déplace le début du tour prend tout le tour."
        : projet.type === "jambieres"
        ? "Une colonne dans la longueur de la jambière, à côté des autres : chaque point garde son motif."
        : "Une colonne dans la longueur de l'écharpe, à côté des autres : chaque point garde son motif.",
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
    laine,
    motif,
    actuel: bloc.pointId,
    avis: (p) => avisPourBloc(p, projet.type, bloc.zone, { revers: projet.type === "bonnet" && !!projet.taille?.revers && bloc.zone === "bas" }),
    titrePeuAdaptes: { bas: projet.type === "bonnet" || projet.type === "jambieres" ? "Peu adaptés à un bord" : "Peu adaptés à une bordure", haut: projet.type === "jambieres" ? "Peu adaptés à un bord" : "Peu adaptés à une bordure", cotes: "Peu adaptés aux bandes latérales" }[bloc.zone],
    titreRefuses: "Pas réversibles : l'envers se verrait une fois replié",
    messageRefus: "Avec un revers, choisis un point réversible.",
    titre: section1 || (bloc.zone === "corps" && !bloc.section) ? "Point principal" : bloc.section ? `Point : ${minusculeNom(nomBloc(bloc, projet))}` : (projet.type === "bonnet" && bloc.zone === "bas") || (projet.type === "jambieres" && bloc.zone !== "corps" && bloc.zone !== "bande") ? `Point : ${minusculeNom(nomBloc(bloc, projet))}` : `Point : ${nomZone}`,
    aide: bloc.section && !section1
      ? `Une section du corps, sur ${enRond(projet) || projet.type === "jambieres" ? "tout le tour" : "toute la largeur"} : chaque section a son point.`
      : (projet.type === "jambieres" ? AIDES_ZONES_JAMBIERES : projet.type === "bonnet" ? AIDES_ZONES_BONNET : projet.type === "snood" ? AIDES_ZONES_SNOOD : AIDES_ZONES)[bloc.zone] || "",
    secours: projet.etape >= 4 ? `/projet/${encodeURIComponent(projet.id)}/builder` : cheminEtape(projet),
    choisir: async (pointId) => {
      await modifier((p) => avecPointDuBloc(p, blocId, pointId));
      retour(projet.etape >= 4 ? `/projet/${encodeURIComponent(projet.id)}/builder` : cheminEtape(projet));
    },
  };
  return html`<${CataloguePoints} selection=${selection} />`;
}
