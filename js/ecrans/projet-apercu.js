// Étape 5 : l'écharpe finie (maquette P8b), puis « Créer le patron ».
import { useMemo, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets, Fenetre, Pastille } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { Piece3D } from "../composants/piece3d.js";
import { Snood3D } from "../composants/snood3d.js";
import { Bonnet3D } from "../composants/bonnet3d.js";
import { Jambiere3D } from "../composants/jambiere3d.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { pointParId } from "../catalogue/points.js";
import { formaterNombre } from "../donnees/reserve.js";
import { genererPatron, nouveauSuivi, texteReversible } from "../moteur/patron.js";
import { cheminEtape, calculerProjet, etatCreationPatron, lainesDuProjet, toursPortes, enRond } from "../donnees/projets.js";

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
  const [pose, setPose] = useState("barre");
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const laine = projet && laines.find((l) => l.id === projet.laineId);
  const aig = projet && aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = useMemo(() => (projet ? calculerProjet({ projet, laine, aiguilles: aig, echantillons, laines }) : null), [projet, laine, aig, echantillons, laines]);

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
  const manques = etat.manques || [];
  const avertir = etat.possible && (etat.approximatif || manques.length > 0);
  // Seules les laines vraiment utilisées (une laine du projet peut attendre au Matériel sans servir).
  const utilisees = calcul?.parLaine?.length ? calcul.parLaine.map((x) => x.laine) : lainesDuProjet(projet, laines).slice(0, 1);
  const bonnet = projet.type === "bonnet";
  const jambieres = projet.type === "jambieres";
  const snood = enRond(projet);

  async function creer() {
    if (!etat.possible || enCours) return;
    setEnCours(true);
    try {
      const patron = genererPatron({
        projet, plan, laine, aiguilles: aig, echantillon: calcul.echantillon,
        densites: calcul.densites, metrage: calcul.metrage, laineSuffit: calcul.laineSuffit,
        laines: utilisees, parLaine: calcul.parLaine,
      });
      await base.ecrire("patrons", patron);
      await base.ecrire("suivis", nouveauSuivi(patron));
      await modifier((p) => ({
        ...p, statut: "patron", etape: 6, patronId: patron.id,
        patron: { nbRangs: patron.rangs.length, approximatif: patron.approximatif, creeLe: patron.creeLe, ...(patron.exemplaires > 1 ? { exemplaires: patron.exemplaires } : {}) },
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
      <${EnTeteEtape} titre=${jambieres ? "Tes jambières, terminées" : bonnet ? "Ton bonnet, terminé" : snood ? "Ton snood, terminé" : "Ton écharpe, terminée"} numero=${5} secours=${cheminEtape(projet, 4)} />
      <div class="ecran-contenu">
        ${plan && jambieres
          ? html`<${Jambiere3D} key=${`jambiere-${projet.mode}`} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} densites=${calcul.densites} />
            <div class="chiffres-cles chiffres-snood">
              <div><strong>${formaterNombre(plan.largeur.reelleCm, 0)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm</strong><span>tour × longueur</span></div>
              <div><strong>× ${plan.exemplaires}</strong><span>une paire à tricoter</span></div>
            </div>
            <p class="note">Sur une jambe de mannequin (mollet de ${formaterNombre(projet.taille.molletCm, 0)} cm)${projet.mode === "plat" ? ", tricotée à plat : la couture est à l'arrière du mollet" : ""}. Une seule jambière est montrée : l'autre est la même.</p>`
          : plan && bonnet
          ? html`<${Bonnet3D} key="bonnet" projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} densites=${calcul.densites} />
            <div class="chiffres-cles chiffres-snood">
              <div><strong>${formaterNombre(plan.largeur.reelleCm, 0)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm</strong><span>tour × hauteur</span></div>
              <div><strong>${formaterNombre(projet.taille.teteCm, 0)} cm</strong><span>sur une tête de</span></div>
            </div>
            <p class="note">Le bonnet est posé, bien tendu : il ne glisse pas et ne tombe pas.</p>`
          : plan && snood
          ? html`<${Snood3D} key="snood" projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} densites=${calcul.densites} />
            <div class="chiffres-cles chiffres-snood">
              <div><strong>${formaterNombre(plan.largeur.reelleCm, 0)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm</strong><span>tour × hauteur</span></div>
              <div><strong>en ${toursPortes(projet, plan)} tour${toursPortes(projet, plan) > 1 ? "s" : ""}</strong><span>se porte</span></div>
            </div>`
          : plan
          ? html`<${Onglets} libelle="Où voir l'écharpe" valeur=${pose} surChoix=${setPose}
              choix=${[{ valeur: "barre", libelle: "Sur une barre" }, { valeur: "cou", libelle: "Autour du cou" }]} />
            <${Piece3D} key=${pose} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} densites=${calcul.densites} face=${face} pose=${pose} />
            <p class="note vitrine-mesures">${formaterNombre(plan.largeur.reelleCm, 0)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm${corps ? ` · ${minuscule(corps.nom)}` : ""}</p>`
          : html`<${Encart} type="brique">${jambieres ? "La jambière" : bonnet ? "Le bonnet" : snood ? "Le snood" : "L'écharpe"} s'affichera en 3D dès que les mailles tombent juste (voir ci-dessous).<//>`}

        ${!snood && !jambieres && corps && !corps.proprietes.reversible &&
        html`<${Onglets} libelle=${snood ? "Côté du snood" : "Côté de l'écharpe"} valeur=${face} surChoix=${setFace}
          choix=${[{ valeur: "endroit", libelle: "Endroit" }, { valeur: "envers", libelle: "Envers" }]} />`}

        ${utilisees.length > 0 &&
        html`<div class="ligne-couleur">
          ${utilisees.map((l) => html`<${Pastille} couleur=${l.couleur} taille=${28} />`)}
          <span><strong>${utilisees.map((l) => l.nom).join(" · ")}</strong></span>
        </div>`}

        ${plan &&
        html`<div class="chiffres-cles">
          <div><strong>${plan.montage.mailles}</strong><span>mailles à monter</span></div>
          <div><strong>${plan.rangs.length}</strong><span>${snood ? "tours" : "rangs"}${jambieres ? " × 2" : ""}</span></div>
          <div><strong>${m ? `≈ ${m.metres} m` : "?"}</strong><span>${calcul.parLaine?.length > 1 ? `de laine en tout (${calcul.parLaine.length} laines)` : c?.disponible ? `sur ${c.disponible} m` : "de laine"}</span></div>
        </div>`}

        <ul class="verifs">
          <${Coche} ok=${!!calcul?.ok}>${calcul?.ok ? "Les motifs tombent juste et le patron a été tricoté en entier par l'outil, sans erreur" : etat.raison}<//>
          ${(calcul?.parLaine?.length > 1 ? calcul.parLaine : c ? [{ laine, suffit: c }] : []).filter((x) => x.suffit && x.suffit.statut !== "inconnu").map((x) => {
            const nom = calcul.parLaine?.length > 1 ? ` « ${x.laine.nom} »` : "";
            const s = x.suffit;
            return html`<${Coche} ok=${s.statut !== "insuffisant"}>
              ${s.statut === "insuffisant" ? `Il manque environ ${Math.ceil(s.manque)} m de laine${nom}` : s.statut === "juste" ? `La laine${nom} devrait suffire, de justesse` : `La laine${nom} suffit`}
            <//>`;
          })}
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
          ${corps && html`<${Coche} ok=${true}>${texteReversible(corps, projet.type)}<//>`}
          ${calcul?.cable && html`<${Coche} ok=${false}>${calcul.cable.magicLoop
            ? `Ton câble (${formaterNombre(calcul.cable.cableCm, 0)} cm) est trop court pour le magic loop : prends un câble de ${calcul.cable.conseille} cm`
            : `Ton câble (${formaterNombre(calcul.cable.cableCm, 0)} cm) est plus long que le tour du snood : prends un câble de ${calcul.cable.conseille} cm`}<//>`}
          ${bonnet && plan?.sommet && html`<${Coche} ok=${true}>${plan.sommet.jersey ? plan.sommet.raison.replace(/\.$/, "") : `Le sommet continue en ${minuscule(pointParId(plan.sommet.pointId)?.nom || "jersey")} : 8 parts, ${plan.sommet.diminutions} tours de diminutions`}<//>`}
          ${snood && calcul?.echantillon && calcul.echantillon.mode !== "rond" && html`<${Coche} ok=${true}>Échantillon tricoté à plat : en rond, le tricot peut être un peu plus serré<//>`}
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
        ${manques.map((x) => html`<${Encart} type="brique">Il manque environ ${x.metres} m${manques.length > 1 || utilisees.length > 1 ? ` de « ${x.nom} »` : " de laine"} : prévois une pelote de plus, du même bain si possible.<//>`)}
        ${dCorps?.origine === "etiquette" && corps &&
        html`<p class="note">Astuce : tricote les ${snood ? "5" : "15"} premiers centimètres du corps, mesure-les, et compare avec le patron (il indique la longueur tricotée à chaque ${snood ? "tour" : "rang"}).</p>`}
      <//>
    </main>`;
}
