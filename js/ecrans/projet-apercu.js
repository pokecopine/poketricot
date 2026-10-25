// Étape 5 : l'écharpe finie (maquette P8b), puis « Créer le patron ».
import { useMemo, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets, Fenetre, Pastille } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { EcharpeDrapee } from "../composants/drape.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { pointParId } from "../catalogue/points.js";
import { formaterNombre } from "../donnees/reserve.js";
import { genererPatron, nouveauSuivi, texteReversible } from "../moteur/patron.js";
import { cheminEtape, calculerProjet, etatCreationPatron } from "../donnees/projets.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";
const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function Coche({ ok, children }) {
  return html`<li class=${"verif" + (ok ? "" : " verif-non")}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${ok ? html`<path d="M5 12l5 5L20 7"></path>` : html`<path d="M12 8v5"></path><path d="M12 16.5v.5"></path>`}
    </svg>
    <span>${children}</span>
  </li>`;
}

export function EtapeApercu({ id }) {
  const { base, flash } = useApp();
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  const [face, setFace] = useState("endroit");
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const laine = projet && laines.find((l) => l.id === projet.laineId);
  const aig = projet && aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = useMemo(() => (projet ? calculerProjet({ projet, laine, aiguilles: aig, echantillons }) : null), [projet, laine, aig, echantillons]);

  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  const couleur = laine?.couleur || COULEUR_PAR_DEFAUT;
  const plan = calcul?.ok ? calcul.plan : null;
  const etat = etatCreationPatron(projet, calcul);
  const corps = pointParId(projet.pointPrincipal);
  const dCorps = calcul?.densites?.[projet.pointPrincipal];
  const m = calcul?.metrage;
  const c = calcul?.laineSuffit;
  const avertir = etat.possible && (etat.approximatif || etat.laineManque > 0);

  async function creer() {
    if (!etat.possible || enCours) return;
    setEnCours(true);
    try {
      const patron = genererPatron({
        projet, plan, laine, aiguilles: aig, echantillon: calcul.echantillon,
        densites: calcul.densites, metrage: calcul.metrage, laineSuffit: calcul.laineSuffit,
      });
      await base.ecrire("patrons", patron);
      await base.ecrire("suivis", nouveauSuivi(patron));
      await modifier((p) => ({
        ...p, statut: "patron", etape: 6, patronId: patron.id,
        patron: { nbRangs: patron.rangs.length, approximatif: patron.approximatif, creeLe: patron.creeLe },
      }));
      setConfirmer(false);
      naviguer(`/projet/${encodeURIComponent(projet.id)}/patron`, { remplacer: true });
    } catch (e) {
      console.error(e);
      flash("Le patron n'a pas pu être enregistré. Réessaie.", true);
      setEnCours(false);
    }
  }

  return html`
    <main class="ecran">
      <${EnTeteEtape} titre="Ton écharpe, terminée" numero=${5} secours=${cheminEtape(projet, 4)} />
      <div class="ecran-contenu">
        <div class="vitrine">
          <${EcharpeDrapee} projet=${projet} plan=${plan} couleur=${couleur} densite=${dCorps} face=${face}
            pointLoupe=${projet.pointPrincipal}
            libelle=${`Illustration de l'écharpe terminée, drapée sur une barre en bois : ${projet.blocs.filter((b) => b.zone !== "cotes").map((b) => `${b.zone === "corps" ? "corps" : b.zone === "bande" ? "bande" : "bordure"} en ${minuscule(pointParId(b.pointId)?.nom || "")}`).join(", ")}. La loupe grossit le corps trois fois.`} />
          <span class="vitrine-etiquette">
            ${plan ? `${formaterNombre(plan.largeur.reelleCm, 0)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm` : `${projet.taille.largeurCm} × ${projet.taille.longueurCm} cm`}${corps ? ` · ${minuscule(corps.nom)}` : ""}
          </span>
        </div>

        ${corps && !corps.proprietes.reversible &&
        html`<${Onglets} libelle="Côté de l'écharpe" valeur=${face} surChoix=${setFace}
          choix=${[{ valeur: "endroit", libelle: "Endroit" }, { valeur: "envers", libelle: "Envers" }]} />`}

        ${laine &&
        html`<div class="ligne-couleur">
          <${Pastille} couleur=${couleur} taille=${28} />
          <span><strong>${laine.nom}</strong></span>
        </div>`}

        ${plan &&
        html`<div class="chiffres-cles">
          <div><strong>${plan.montage.mailles}</strong><span>mailles à monter</span></div>
          <div><strong>${plan.rangs.length}</strong><span>rangs</span></div>
          <div><strong>${m ? `≈ ${m.metres} m` : "?"}</strong><span>${c?.disponible ? `sur ${c.disponible} m` : "de laine"}</span></div>
        </div>`}

        <ul class="verifs">
          <${Coche} ok=${!!calcul?.ok}>${calcul?.ok ? "Les motifs tombent juste et le patron a été tricoté en entier par l'outil, sans erreur" : etat.raison}<//>
          ${c && c.statut !== "inconnu" &&
          html`<${Coche} ok=${c.statut !== "insuffisant"}>
            ${c.statut === "insuffisant" ? `Il manque environ ${Math.ceil(c.manque)} m de laine` : c.statut === "juste" ? "La laine devrait suffire, de justesse" : "La laine suffit"}
          <//>`}
          ${dCorps &&
          html`<${Coche} ok=${dCorps.statut === "mesuree"}>
            ${dCorps.statut === "mesuree"
              ? `Calculé avec ton échantillon en ${minuscule(corps.nom)}`
              : dCorps.origine === "etiquette"
                ? "Calculé avec l'échantillon de l'étiquette : tailles approximatives"
                : dCorps.origine === "conversion"
                  ? `Calculé depuis ton échantillon en ${minuscule(pointParId(dCorps.depuis)?.nom || "un autre point")} : tailles approximatives`
                  : "Pas d'échantillon : il en faut un pour créer le patron"}
          <//>`}
          ${corps && html`<${Coche} ok=${true}>${texteReversible(corps)}<//>`}
        </ul>
        ${!etat.possible && calcul?.ok && html`<${Encart} type="brique">${etat.raison}<//>`}
        ${calcul?.ok && calcul.explications.length > 0 &&
        html`<details class="ajustements">
          <summary>Ajustements faits pour que tout tombe juste (${calcul.explications.length})</summary>
          ${calcul.explications.map((e) => html`<p class="note">${e.charAt(0).toUpperCase() + e.slice(1)}${e.endsWith(".") ? "" : "."}</p>`)}
        </details>`}
        <p class="note">Une fois créé, le patron est figé : il ne change plus, même si tu modifies ta réserve. Tu pourras toujours le dupliquer en variante.</p>
      </div>

      <div class="ecran-pied ecran-pied-double">
        <button type="button" class="bouton-secondaire" onClick=${() => naviguer(cheminEtape(projet, 4))}>Modifier</button>
        <button type="button" class="bouton-principal" disabled=${!etat.possible || enCours}
          onClick=${() => (avertir ? setConfirmer(true) : creer())}>${enCours ? "Création…" : "Créer le patron"}</button>
      </div>

      <${Fenetre} ouverte=${confirmer} titre="Créer le patron quand même ?" surFermeture=${() => setConfirmer(false)}
        actions=${html`
          <button type="button" class="bouton-principal" disabled=${enCours} onClick=${creer}>Créer le patron</button>
          <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(false)}>Pas encore</button>`}>
        ${etat.approximatif &&
        html`<${Encart} type="brique"><strong>Tailles approximatives</strong> : sans échantillon tricoté en ${corps ? minuscule(corps.nom) : "ce point"}, l'écart réel peut dépasser 10 %. Le patron portera cette mention.<//>`}
        ${etat.laineManque > 0 && html`<${Encart} type="brique">Il manque environ ${etat.laineManque} m de laine : prévois une pelote de plus, du même bain si possible.<//>`}
        ${dCorps?.origine === "etiquette" && corps &&
        html`<p class="note">Astuce : tricote les 15 premiers centimètres du corps, mesure-les, et compare avec le patron (il indique la longueur tricotée à chaque rang).</p>`}
      <//>
    </main>`;
}
