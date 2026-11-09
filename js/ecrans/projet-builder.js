// Étape 4 : le builder (maquettes 5 et 5b). L'écharpe dessinée par blocs, les réglages du bloc choisi,
// l'ajout d'un bloc et la jauge de laine. Tout est recalculé par le moteur à chaque modification.
import { useMemo, useState } from "preact/hooks";
import { html } from "../html.js";
import { naviguer } from "../routeur.js";
import { Encart, Onglets, Fenetre, Pastille } from "../composants/base.js";
import { EnTeteEtape, useProjet } from "../composants/etape.js";
import { BandeTexture } from "../composants/texture.js";
import { DessinEcharpe, DessinSnood, DessinBonnet, DessinCouverture, couleurDeLaine } from "../composants/piece.js";
import { texteLaineCouverture } from "./projet-taille.js";
import { IconePlus } from "../composants/icones.js";
import { ProjetIntrouvable } from "./projet-piece.js";
import { PatronDejaCree } from "./patron.js";
import { pointParId, avisPour } from "../catalogue/points.js";
import { etiquettesProprietes } from "../catalogue/fiche.js";
import { formaterNombre, lireNombre } from "../donnees/reserve.js";
import { nuancesLaine } from "../donnees/couleur.js";
import { nomAvecArticle } from "../moteur/dimensions.js";
import { maillesVoisines, COLONNES_MIN, COLONNES_MAX } from "../moteur/colonnes.js";
import {
  cheminEtape, calculerProjet, zoneAvis, avisPourBloc, nomBloc, nomCourtBloc, blocsHorizontaux, blocLateral,
  ajouterBloc, supprimerBloc, avecHauteurBloc, avecLargeurBandes, avecBandesLaterales, LIMITES_BLOCS,
  divisible, diviserBloc, nePlusDiviser, changerLargeurColonne, repartirEgalement, apercuDecoupe, colonnesEgalesPossibles,
  coloriable, avecLaineDuBloc, plusieursLaines, laineDuBloc, noteEchantillonEnRond,
  lainesDuProjet, laineDeColonne, avecLaineDeColonne, blocEnIntarsia, petitesPelotes, estSection, sectionsDuProjet, enSections,
  numeroSection, diviserEnSections, sansSections, avecHauteurSection, repartirSections, sectionsFixees, faireUnDamier, defaireLeDamier,
  estUnDamier, premiereSection, SECTIONS_MIN, SECTIONS_MAX, enRond, nomPiece,
  avecRevers, avecPompon, bordAvecRevers, LIMITES_BONNET, lainesDuProjet as lainesProjet,
  TAILLES_COUVERTURE, largeursBordure, avecLargeurBordure, avecBordureSeparee, avecLaineBordure, LIMITES_BORDURE,
} from "../donnees/projets.js";

const COULEUR_PAR_DEFAUT = "#D07E5B";
const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Bloc choisi gardé pendant la visite (aller choisir un point, puis revenir).
const memoire = {};

export function EtapeBuilder({ id }) {
  const { projet, laines, aiguilles, echantillons, introuvable, modifier } = useProjet(id);
  const [choisi, setChoisi] = useState(memoire[id] || "corps");
  const [colonne, setColonne] = useState(null);
  const [orientation, setOrientation] = useState("horizontale");
  const [loupe, setLoupe] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [grand, setGrand] = useState(false);

  const laine = projet && laines.find((l) => l.id === projet.laineId);
  const aig = projet && aiguilles.find((a) => a.id === projet.aiguillesId);
  const calcul = useMemo(
    () => (projet ? calculerProjet({ projet, laine, aiguilles: aig, echantillons, laines }) : null),
    [projet, laine, aig, echantillons, laines]
  );

  if (introuvable) return html`<${ProjetIntrouvable} />`;
  if (!projet) return null;
  if (projet.statut !== "conception") return html`<${PatronDejaCree} projet=${projet} />`;

  const choisir = (blocId, colonneId = null) => {
    memoire[id] = blocId;
    setChoisi(blocId);
    setColonne(colonneId);
  };
  const bonnet = projet.type === "bonnet";
  // Bonnet : le sommet et le pompon ne sont pas des blocs enregistrés, mais se choisissent comme eux.
  const virtuel = bonnet && (choisi === "sommet" || choisi === "pompon") ? choisi : null;
  const bloc = virtuel ? null : projet.blocs.find((b) => b.id === choisi) || projet.blocs.find((b) => b.zone === "corps");
  const couleur = laine?.couleur || COULEUR_PAR_DEFAUT;
  const plan = calcul?.ok ? calcul.plan : null;
  const t = projet.taille;
  const snood = enRond(projet);
  // Jambières (0.19.0) : dessinées comme le snood (ouvertes à plat), en rond ou à plat avec une couture.
  const jambieres = projet.type === "jambieres";
  const plat = jambieres && projet.mode === "plat";
  const tube = snood || jambieres;
  // Couverture (0.21.0, maquette 3) : la couverture entière, la bordure tout autour, les coutures.
  const couverture = projet.type === "couverture";
  const bordureChoisie = couverture && bloc && ["bas", "haut", "cotes"].includes(bloc.id);
  const libelleJambiere = `${plat ? "La jambière à plat, avant la couture" : "Une jambière ouverte et posée à plat"} : ${blocsHorizontaux(projet).map((b) => `${minuscule(nomBloc(b, projet))} en ${minuscule(pointParId(b.pointId)?.nom || "point à choisir")}`).join(", ")} ; la cheville en bas, le genou en haut${plat ? " ; une maille de couture de chaque côté" : " ; le début du tour est sur le bord droit"}`;
  const presetSnood = { "1tour": "1 tour", "2tours": "2 tours" }[t.preset];
  const presetBonnet = { femme: "Adulte femme", homme: "Adulte homme", enfant: "Enfant" }[t.preset] || (t.public === "enfant" ? "Enfant" : "Adulte");
  const aiguilleTexte = aig ? `${formaterNombre(lireNombre(aig.tailleMm), 2)} mm${lireNombre(aig.cableCm) ? `, câble ${formaterNombre(lireNombre(aig.cableCm), 0)} cm` : ""}` : "";

  async function continuer() {
    await modifier((p) => ({ ...p, etape: Math.max(p.etape, 5) }));
    naviguer(cheminEtape(projet, 5));
  }

  return html`
    <main class="ecran">
      <${EnTeteEtape} titre=${projet.nom} numero=${4} secours=${cheminEtape(projet, 3)} />
      <div class="ecran-contenu">
        <p class="note" style="margin-top:-6px">
          ${couverture
            ? `${TAILLES_COUVERTURE.find((x) => x.preset === t.preset)?.nom || "Mesures libres"} · ${t.largeurCm} × ${t.longueurCm} cm · ${plan?.panneaux ? `en ${plan.panneaux.length} panneaux cousus` : "en une pièce"}${aig ? ` · aiguilles ${formaterNombre(lireNombre(aig.tailleMm), 2)} mm` : ""}`
            : jambieres
            ? `Mollet ${t.molletCm} cm · ${t.longueurCm} cm de long · ${plat ? "à plat, avec une couture" : "en magic loop"}${aig ? ` · ${plat ? `${formaterNombre(lireNombre(aig.tailleMm), 2)} mm` : aiguilleTexte}` : ""}`
            : bonnet
            ? `${presetBonnet} · ${t.teteCm} cm · ${t.hauteurCm} cm de haut${aig ? ` · ${aiguilleTexte} (magic loop)` : ""}`
            : snood
            ? `${t.public === "enfant" ? "Enfant" : "Adulte"}${presetSnood ? ` · ${presetSnood}` : ""} · ${t.tourCm} × ${t.hauteurCm} cm${aig ? ` · aiguilles ${formaterNombre(lireNombre(aig.tailleMm), 2)} mm${lireNombre(aig.cableCm) ? `, câble ${formaterNombre(lireNombre(aig.cableCm), 0)} cm` : ""}` : ""}`
            : `${t.public === "enfant" ? "Enfant" : "Adulte"} · ${t.largeurCm} × ${t.longueurCm} cm${aig ? ` · aiguilles ${formaterNombre(lireNombre(aig.tailleMm), 2)} mm` : ""}`}
        </p>

        <${BandeauEstimation} projet=${projet} calcul=${calcul} aiguilles=${aig} />

        <section class="atelier" aria-label=${couverture ? "La couverture" : jambieres ? "Une jambière" : bonnet ? "Le bonnet" : snood ? "Le snood" : "L'écharpe"}>
          ${couverture
            ? html`<${DessinCouverture} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines}
                blocChoisi=${bloc?.id} surChoix=${choisir} prefixe="builder" />
              <div class="legende-couverture" aria-hidden="true">
                <span><span class="legende-pastille" style="background:#9C7F55"></span>Bordure</span>
                <span><span class="legende-pastille" style=${`background:${couleur}`}></span>Corps</span>
                ${plan?.panneaux && html`<span><span class="legende-couture"></span>Couture</span>`}
              </div>`
            : jambieres
            ? html`<${DessinSnood} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines}
                blocChoisi=${bloc?.id} colonneChoisie=${colonne} surChoix=${choisir} prefixe="builder"
                largeurPx=${230} hauteurMinPx=${150} hauteurMaxPx=${260} couture=${plat} extremites=${{ haut: "genou", bas: "cheville" }}
                libelle=${libelleJambiere} />`
            : bonnet
            ? html`<${DessinBonnet} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines}
                blocChoisi=${virtuel || bloc?.id} colonneChoisie=${colonne} surChoix=${choisir} prefixe="builder"
                libelle=${`Le bonnet ouvert et posé à plat : ${blocsHorizontaux(projet).map((b) => `${minuscule(nomBloc(b, projet))} en ${minuscule(pointParId(b.pointId)?.nom || "point à choisir")}`).join(", ")}, sommet en 8 parts${t.pompon ? ", pompon au-dessus" : ""} ; le début du tour est sur le bord droit`} />`
            : snood
            ? html`<${DessinSnood} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines}
                blocChoisi=${bloc?.id} colonneChoisie=${colonne} surChoix=${choisir} prefixe="builder"
                libelle=${`Le snood ouvert et posé à plat : ${blocsHorizontaux(projet).map((b) => `${minuscule(nomBloc(b, projet))} en ${minuscule(pointParId(b.pointId)?.nom || "point à choisir")}`).join(", ")} ; le début du tour est sur le bord droit`} />`
            : html`<${DessinEcharpe} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} orientation=${orientation}
                blocChoisi=${bloc?.id} colonneChoisie=${colonne} surChoix=${choisir} prefixe="builder"
                libelle=${`L'écharpe : ${blocsHorizontaux(projet).map((b) => `${minuscule(nomBloc(b, projet))} en ${minuscule(pointParId(b.pointId)?.nom || "point à choisir")}`).join(", ")}`} />`}
          ${couverture
            ? null
            : bonnet
            ? html`<p class="atelier-legende">Le bonnet ouvert et posé à plat · sommet en 8 parts</p>`
            : html`<${LegendeBloc} bloc=${bloc} plan=${plan} projet=${projet} orientation=${orientation} />`}
          ${couverture
            ? null
            : bonnet && (!bloc || bloc.zone === "corps" || bloc.zone === "bas") && !(bloc?.colonnes?.length >= COLONNES_MIN)
            ? html`<${TourEnParts} plan=${plan} calcul=${calcul} bloc=${bloc} />`
            : html`<${RangEnMailles} projet=${projet} bloc=${bloc} plan=${plan} calcul=${calcul} colonne=${colonne} />`}
          ${!couverture && html`<div class="atelier-boutons">
            <button type="button" onClick=${() => setLoupe(true)}>Zoom texture</button>
            ${tube
              ? html`<button type="button" onClick=${() => setGrand(true)}>Voir en grand</button>`
              : html`<button type="button" aria-pressed=${String(orientation === "verticale")}
                  onClick=${() => setOrientation(orientation === "horizontale" ? "verticale" : "horizontale")}>
                  ${orientation === "horizontale" ? "Voir en long" : "Voir en large"}
                </button>`}
          </div>`}
        </section>

        ${couverture && html`<${BordureCouverture} projet=${projet} plan=${plan} laines=${laines} couleur=${couleur} modifier=${modifier} choisie=${bordureChoisie} surChoix=${() => choisir("bas")} />`}
        ${couverture && html`<${RangCouverture} plan=${plan} calcul=${calcul} />`}

        <h2 style="font-size:17px">Blocs de la pièce</h2>
        <div class="blocs" role="group" aria-label="Choisir un bloc">
          ${(couverture
            ? blocsHorizontaux(projet).filter((b) => b.id !== "bas" && b.id !== "haut")
            : [...blocsHorizontaux(projet), ...(blocLateral(projet) ? [blocLateral(projet)] : [])]).map((b) => {
            const p = pointParId(b.pointId);
            return html`<button type="button" class=${"bloc" + (b.zone === "corps" ? " bloc-corps" : "")}
              aria-pressed=${String(b.id === bloc?.id)} onClick=${() => choisir(b.id)}
              aria-label=${`${nomBloc(b, projet)} : ${p ? minuscule(p.nom) : "point à choisir"}`}>
              ${b.colonnes?.length >= COLONNES_MIN
                ? html`<span class="bloc-colonnes">${b.colonnes.map((c) => pointParId(c.pointId)
                    ? html`<${BandeTexture} point=${pointParId(c.pointId)} couleur=${couleurDeLaine(laineDeColonne(projet, b, c, laines), couleur, laines)} hauteur=${20} rayon=${3} echelle=${0.5} />`
                    : html`<span class="bloc-vide"></span>`)}</span>`
                : p ? html`<${BandeTexture} point=${p} couleur=${couleurDeLaine(laineDuBloc(projet, b, laines), couleur, laines)} hauteur=${20} rayon=${5} echelle=${0.6} />` : html`<span class="bloc-vide"></span>`}
              <span>${nomCourtBloc(b, projet)}</span>
            </button>`;
          })}
          ${bonnet && html`<${BlocsDuBonnet} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} virtuel=${virtuel} choisir=${choisir} />`}
          ${!bonnet && html`<button type="button" class="bloc bloc-ajout" aria-label="Ajouter un bloc" onClick=${() => setAjout(true)}>${IconePlus()}</button>`}
        </div>
        ${couverture
          ? plan?.panneaux && enSections(projet) && html`<p class="note">Les sections traversent toute la couverture ; les colonnes et le damier se font dans chaque panneau.</p>`
          : plat
          ? html`<p class="note">Pas de bandes latérales : la couture les remplace.</p>`
          : snood
          ? !bonnet && html`<p class="note">Pas de bandes latérales ni de lisières : en rond, il n'y a pas de bord.</p>`
          : !blocLateral(projet) &&
            html`<button type="button" class="bouton-lien" onClick=${() => modifier(avecBandesLaterales)}>Remettre des bandes latérales</button>`}

        ${virtuel === "sommet" && html`<${ReglagesSommet} projet=${projet} plan=${plan} couleur=${couleurDeLaine(laineDuBloc(projet, projet.blocs.filter((b) => b.zone === "corps").at(-1), laines), couleur, laines)} />`}
        ${virtuel === "pompon" && html`<${ReglagesPompon} projet=${projet} laines=${laines} calcul=${calcul} modifier=${modifier} />`}
        ${bloc && !bordureChoisie && html`<${ReglagesBloc} key=${bloc.id} projet=${projet} bloc=${bloc} plan=${plan} calcul=${calcul}
          laines=${laines} couleur=${couleur} colonne=${colonne} surColonne=${(c) => setColonne(c)}
          modifier=${modifier} surSuppression=${() => choisir("corps")} />`}

        ${plusieursLaines(projet) &&
        html`<label class="case carte-option">
          <input type="checkbox" checked=${!!projet.filPorte} onChange=${(e) => { const v = e.currentTarget.checked; modifier((p) => ({ ...p, filPorte: v })); }} />
          ${snood
            ? html`<span><strong>Laisser la laine en attente au début du tour</strong> pour les bandes fines (8 tours au plus) : elle attend au lieu d'être coupée, moins de fils à rentrer.</span>`
            : html`<span><strong>Faire monter le fil le long du bord</strong> pour les bandes fines (8 rangs au plus, en nombre pair) : la laine attend au bord au lieu d'être coupée, moins de fils à rentrer.${projet.blocs.some((b) => blocEnIntarsia(projet, b, laines)) ? " Sauf dans les blocs en intarsia." : ""}</span>`}
        </label>`}

        <${Verifications} calcul=${calcul} />
        ${calcul?.avertissements?.map((a) => html`<${Encart} type="brique">${a}<//>`)}
        <${JaugeLaine} calcul=${calcul} laine=${laine} piece=${projet.type} />
        ${jambieres && calcul?.metrage?.exemplaires &&
        html`<p class="note" style="margin-top:-6px">Pour la paire (2 × ${calcul.metrage.parExemplaire} m)${plat ? ", fil de couture compris" : ""}.</p>`}
        ${couverture && calcul?.metrage &&
        html`<p class="note" style="margin-top:-6px">Toute la couverture${plan?.panneaux ? ", fil de couture compris" : ""} · ${texteLaineCouverture(calcul.metrage.metres, laine).replace(/^Environ /, "environ ")}.</p>`}
        ${bonnet && calcul?.metrage?.parBloc?.some((b) => b.blocId === "pompon") &&
        html`<p class="note" style="margin-top:-6px">Pompon compris (environ ${Math.ceil(calcul.metrage.parBloc.find((b) => b.blocId === "pompon").metres)} m).</p>`}
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal" disabled=${!calcul?.ok} onClick=${continuer}>${couverture ? "Voir l'aperçu" : jambieres ? "Voir les jambières finies" : bonnet ? "Voir le bonnet fini" : snood ? "Voir le snood fini" : "Voir l'écharpe finie"}</button>
      </div>

      <${Fenetre} ouverte=${loupe} titre=${bloc ? `${nomBloc(bloc, projet)} · ${minuscule(pointParId(bloc.pointId)?.nom || "")}` : "Texture"}
        surFermeture=${() => setLoupe(false)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setLoupe(false)}>Fermer</button>`}>
        ${loupe && bloc && pointParId(bloc.pointId) && html`<${Loupe} point=${pointParId(bloc.pointId)} couleur=${couleur} />`}
      <//>

      <${Fenetre} ouverte=${grand} titre=${jambieres ? (plat ? "La jambière à plat, avant la couture" : "Une jambière ouverte et posée à plat") : "Le snood ouvert et posé à plat"} surFermeture=${() => setGrand(false)}
        actions=${html`<button type="button" class="bouton-secondaire" onClick=${() => setGrand(false)}>Fermer</button>`}>
        ${grand && html`<${DessinSnood} projet=${projet} plan=${plan} couleur=${couleur} laines=${laines} largeurPx=${jambieres ? 240 : 320}
          hauteurMinPx=${160} hauteurMaxPx=${320} echelleTexture=${0.7} prefixe="grand" couture=${plat} extremites=${jambieres ? { haut: "genou", bas: "cheville" } : null} />`}
      <//>

      ${ajout && html`<${AjoutBloc} projet=${projet} couleur=${couleur} surFermeture=${() => setAjout(false)}
        surAjout=${async ({ type, position, pointId, hauteurCm }) => {
          let nouvelId;
          await modifier((p) => {
            const r = ajouterBloc(p, { type, position, pointId, hauteurCm });
            nouvelId = r.blocId;
            return r.projet;
          });
          setAjout(false);
          choisir(nouvelId);
          // On enchaîne sur le choix du point de la nouvelle bande.
          naviguer(`/projet/${encodeURIComponent(projet.id)}/point/${encodeURIComponent(nouvelId)}`);
        }} />`}
    </main>`;
}

/** « Corps : 168 cm », sous le dessin. */
function LegendeBloc({ bloc, plan, projet, orientation = "horizontale" }) {
  if (!bloc) return null;
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  let texte;
  if (bloc.zone === "cotes") {
    const bl = plan?.bandesLaterales;
    texte = bl ? `${bl.mailles} mailles de chaque côté, environ ${formaterNombre(bl.largeurCm)} cm` : `${bloc.largeurMailles} mailles de chaque côté`;
  } else if (estSection(bloc)) {
    texte = pb ? `${formaterNombre(pb.hauteurCm)} cm` : "";
  } else if (bloc.zone === "corps" && plan) {
    const parties = plan.blocs.filter((b) => b.zone === "corps");
    const total = parties.reduce((s, b) => s + b.hauteurCm, 0);
    texte = parties.length > 1 ? `${parties.length} parties, ${formaterNombre(total, 0)} cm en tout` : `${formaterNombre(total, 0)} cm`;
  } else {
    texte = pb ? `${formaterNombre(pb.hauteurCm)} cm` : `${bloc.hauteurCm || 0} cm`;
  }
  if (enRond(projet) || projet.type === "jambieres") {
    if (bloc.zone === "corps" && !estSection(bloc) && plan) texte = `${formaterNombre(plan.blocs.filter((b) => b.zone === "corps").reduce((s, b) => s + b.hauteurCm, 0), 0)} cm`;
    const quoi = projet.type === "jambieres" ? (projet.mode === "plat" ? "Une jambière à plat, avant la couture" : "Une jambière ouverte et posée à plat") : "Le snood ouvert et posé à plat";
    return html`<p class="atelier-legende">${quoi} · ${minuscule(nomBloc(bloc, projet))} : ${texte}${enSections(projet) ? " · la section 1 est en bas" : ""}</p>`;
  }
  const total = plan ? ` · écharpe ${formaterNombre(plan.largeur.reelleCm)} × ${formaterNombre(plan.longueur.reelleCm, 0)} cm` : "";
  return html`<p class="atelier-legende">${nomBloc(bloc, projet)} : ${texte}${total}${enSections(projet) ? html`<br />La section 1 est ${orientation === "verticale" ? "en bas" : "à gauche"} (début du tricot).` : ""}</p>`;
}

function BandeauEstimation({ projet, calcul, aiguilles }) {
  if (!calcul) return null;
  const dCorps = calcul.densites?.[projet.pointPrincipal];
  if (!dCorps || dCorps.statut === "mesuree") return null;
  const point = pointParId(projet.pointPrincipal);
  const taille = lireNombre(aiguilles?.tailleMm);
  const q = new URLSearchParams({ laine: projet.laineId, point: projet.pointPrincipal, aiguille: String(taille), projet: projet.id });
  const lien = html` <a href=${"#/reserve/echantillon/nouveau?" + q.toString()}>Saisir un échantillon en ${minuscule(point.nom)}</a>`;
  if (dCorps.origine === "conversion") {
    const depuis = pointParId(dCorps.depuis);
    return html`<${Encart} type="brique">
      Ton échantillon est en ${minuscule(depuis?.nom || "un autre point")}, le corps est maintenant en ${minuscule(point.nom)} : dimensions estimées.${lien}
    <//>`;
  }
  return html`<${Encart} type="brique">
    Dimensions estimées d'après ${dCorps.origine === "etiquette" ? "l'échantillon de l'étiquette de ta laine" : "l'épaisseur de ta laine"}, en attendant ton échantillon.${lien}
  <//>`;
}

function ReglagesBloc({ projet, bloc, plan, calcul, laines, couleur, colonne, surColonne, modifier, surSuppression }) {
  const point = pointParId(bloc.pointId);
  const enColonnes = bloc.colonnes?.length >= COLONNES_MIN;
  const avis = point ? avisPourBloc(point, projet.type, bloc.zone, { revers: bordAvecRevers(projet, bloc) }) : null;
  const bonnet = projet.type === "bonnet";
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  const adresseChoix = `/projet/${encodeURIComponent(projet.id)}/point/${encodeURIComponent(bloc.id)}`;
  const section = estSection(bloc);
  const sections = sectionsDuProjet(projet);
  const section1 = section && numeroSection(projet, bloc) === 1;
  const corpsEntier = bloc.zone === "corps" && !section;
  const supprimable = bloc.zone !== "corps" && projet.type !== "bonnet";
  const densite = calcul?.densites?.[bloc.pointId];
  const snood = enRond(projet);
  const titre = section ? `Section ${numeroSection(projet, bloc)} sur ${sections.length}` : nomBloc(bloc, projet);

  return html`
    <section class="carte-bloc reglages-bloc" aria-labelledby="titre-bloc">
      <div class="titre-section" style="margin:0">
        <h2 id="titre-bloc" style="font-size:19px">${titre} · ${enColonnes ? `${bloc.colonnes.length} colonnes` : point ? minuscule(point.nom) : "point à choisir"}</h2>
      </div>
      ${!enColonnes && point && html`<span class="proprietes">${etiquettesProprietes(point).join(" · ")}</span>`}
      ${!enColonnes && avis && avis.avis !== "conseille" && html`<${Encart} type=${avis.avis === "deconseille" || avis.avis === "refuse" ? "brique" : "sauge"}>${avis.avis === "refuse" ? `${point.nom} : ${minuscule(avis.raison)} Change de point.` : avis.raison}<//>`}

      ${(!enColonnes || (bloc.zone === "corps" && (!section || section1))) &&
      html`<div class="rangee-boutons">
        <button type="button" class="bouton-secondaire" onClick=${() => naviguer(adresseChoix)}>
          ${enColonnes ? "Point de l'échantillon" : point ? "Changer de point" : "Choisir le point"}
        </button>
        ${corpsEntier &&
        html`<button type="button" class="bouton-secondaire" onClick=${() => naviguer(cheminEtape(projet, 3))}>${snood && projet.type !== "jambieres" ? "Hauteur" : "Longueur"}</button>`}
      </div>`}
      ${enColonnes && bloc.zone === "corps" && (!section || section1) && point &&
      html`<p class="note">${section ? "La section 1" : "Le corps"} est en colonnes. Ton échantillon reste en ${minuscule(point.nom)} : il sert à calculer les dimensions de toutes les colonnes.</p>`}
      ${section1 && !enColonnes && html`<p class="note">C'est aussi le point de ton échantillon${noteEchantillonEnRond(projet, calcul?.echantillon) ? " (tricoté à plat : en rond, le tricot peut être un peu plus serré)" : ""}.</p>`}

      ${section && html`<${HauteurSection} projet=${projet} bloc=${bloc} pb=${pb} modifier=${modifier} />`}
      ${coloriable(bloc) && html`<${LaineDuBloc} projet=${projet} bloc=${bloc} laines=${laines} calcul=${calcul} modifier=${modifier} />`}

      ${corpsEntier && !enColonnes
        ? html`<${DiviserCorps} projet=${projet} bloc=${bloc} plan=${plan} modifier=${modifier} />`
        : divisible(bloc) && html`<${Colonnes} projet=${projet} bloc=${bloc} plan=${plan} laines=${laines}
            couleur=${couleurDeLaine(laineDuBloc(projet, bloc, laines), couleur, laines)} titre=${section ? "Diviser cette section en colonnes" : "Diviser en colonnes"}
            colonne=${colonne} surColonne=${surColonne} modifier=${modifier} />`}
      ${blocEnIntarsia(projet, bloc, laines) && html`<${EncartIntarsia} projet=${projet} bloc=${bloc} laines=${laines} lateral=${!!blocLateral(projet)} />`}
      ${section && html`<${ToutesLesSections} projet=${projet} bloc=${bloc} modifier=${modifier} surColonne=${surColonne} />`}

      ${corpsEntier && !enColonnes && projet.type === "jambieres" &&
      html`<p class="note">La longueur du corps s'ajuste toute seule : il complète la longueur de la jambière, entre ses deux bords${plan && plan.blocs.filter((b) => b.zone === "corps").length > 1 ? ", partagée entre ses parties" : ""}. C'est aussi le point de ton échantillon${noteEchantillonEnRond(projet, calcul?.echantillon) ? " (tricoté à plat : en rond, le tricot peut être un peu plus serré)" : ""}.</p>`}
      ${corpsEntier && !enColonnes && !snood && projet.type !== "jambieres" &&
      html`<p class="note">La longueur du corps s'ajuste toute seule : il complète la longueur ${projet.type === "couverture" ? "de la couverture" : "de l'écharpe"}${plan && plan.blocs.filter((b) => b.zone === "corps").length > 1 ? ", partagée entre ses parties" : ""}. C'est aussi le point de ton échantillon.</p>`}
      ${corpsEntier && !enColonnes && snood && projet.type !== "jambieres" &&
      html`<p class="note">La hauteur du corps s'ajuste toute seule : il complète la hauteur ${bonnet ? "du bonnet, sommet compris" : "du snood"}${plan && plan.blocs.filter((b) => b.zone === "corps").length > 1 ? ", partagée entre ses parties" : ""}. C'est aussi le point de ton échantillon${noteEchantillonEnRond(projet, calcul?.echantillon) ? " (tricoté à plat : en rond, le tricot peut être un peu plus serré)" : ""}.</p>`}

      ${["bas", "haut", "bande"].includes(bloc.zone) &&
      html`<div class="reglage">
        <span>Hauteur</span>
        <div class="compteur">
          <button type="button" aria-label="1 cm de moins" disabled=${bloc.hauteurCm <= LIMITES_BLOCS.hauteurCm[0]}
            onClick=${() => modifier((p) => avecHauteurBloc(p, bloc.id, (bloc.hauteurCm || 0) - 1))}>−</button>
          <output aria-live="polite">${bloc.hauteurCm} cm</output>
          <button type="button" aria-label="1 cm de plus" onClick=${() => modifier((p) => avecHauteurBloc(p, bloc.id, (bloc.hauteurCm || 0) + 1))}>+</button>
        </div>
      </div>
      ${pb && html`<p class="note">Motif complet : ${pb.rangs} ${snood ? "tour" : "rang"}${pb.rangs > 1 ? "s" : ""}, soit environ ${formaterNombre(pb.hauteurCm)} cm.</p>`}
      ${bonnet && bloc.zone === "bas" && html`
        <label class="case carte-option">
          <input type="checkbox" checked=${!!projet.taille.revers} onChange=${(e) => { const v = e.currentTarget.checked; modifier((p) => avecRevers(p, v)); }} />
          <span><strong>Revers replié</strong> ${projet.taille.revers ? `Les ${formaterNombre(bloc.hauteurCm, 0)} cm se replient en deux : il reste ${formaterNombre(bloc.hauteurCm / 2, 1)} cm visibles.` : "Le bord fera 10 cm et se repliera en deux."}</span>
        </label>
        ${projet.taille.revers && html`<p class="note">Avec un revers, l'intérieur du bord se voit une fois replié : seuls les <strong>points réversibles</strong> sont proposés (côtes, mousse, riz, blé…). Les autres sont grisés.</p>`}`}`}

      ${bloc.zone === "cotes" &&
      html`<div class="reglage">
        <span>Largeur</span>
        <div class="compteur">
          <button type="button" aria-label="1 maille de moins" disabled=${bloc.largeurMailles <= LIMITES_BLOCS.largeurMailles[0]}
            onClick=${() => modifier((p) => avecLargeurBandes(p, (bloc.largeurMailles || 0) - 1))}>−</button>
          <output aria-live="polite">${bloc.largeurMailles} m.</output>
          <button type="button" aria-label="1 maille de plus" onClick=${() => modifier((p) => avecLargeurBandes(p, (bloc.largeurMailles || 0) + 1))}>+</button>
        </div>
      </div>
      <p class="note">Ces mailles bordent l'écharpe à droite et à gauche, sur toute sa longueur, à chaque rang.${projet.blocs.some((b) => blocEnIntarsia(projet, b, laines)) ? " En intarsia, chacune se tricote dans la laine de la colonne qu'elle touche." : ""}</p>`}

      ${densite && densite.statut !== "mesuree" && !(bloc.zone === "corps" && (!section || section1)) && point &&
      html`<p class="note">Pour ${nomAvecArticle(point)}, les dimensions sont estimées depuis ton échantillon du corps.</p>`}

      ${supprimable &&
      html`<button type="button" class="bouton-lien bouton-danger" onClick=${() => { modifier((p) => supprimerBloc(p, bloc.id)); surSuppression(); }}>
        ${bloc.zone === "cotes" ? "Enlever les bandes latérales" : "Enlever ce bloc"}
      </button>`}
    </section>`;
}

/** E3c-2 : diviser le corps, en colonnes (dans la largeur) ou en sections (dans la longueur). */
function DiviserCorps({ projet, bloc, plan, modifier }) {
  const [sens, setSens] = useState("sections");
  const [nombre, setNombre] = useState(4);
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  const total = pb?.maillesCorps;
  const longueurCorps = plan ? plan.blocs.filter((b) => b.zone === "corps").reduce((t, b) => t + b.hauteurCm, 0) : null;
  const apercu = sens === "colonnes" && total ? apercuDecoupe(projet, bloc.id, nombre, total) : null;
  const min = sens === "sections" ? SECTIONS_MIN : COLONNES_MIN;
  const max = sens === "sections" ? SECTIONS_MAX : COLONNES_MAX;
  const mot = sens === "sections" ? "section" : "colonne";
  let phrase;
  if (sens === "sections") {
    phrase = longueurCorps
      ? `${nombre} sections d'environ ${formaterNombre(longueurCorps / nombre, 0)} cm, empilées ${enRond(projet) ? "du bas vers le haut, chacune sur tout le tour" : "dans la longueur, chacune sur toute la largeur"}. Chacune peut avoir son point et sa laine.`
      : `${nombre} sections empilées dans la longueur, chacune avec son point et sa laine.`;
  } else {
    phrase = !total
      ? "Les colonnes se calculent dès que l'outil connaît le nombre de mailles."
      : apercu
        ? apercu.egales
          ? `${nombre} colonnes de ${apercu.mailles[0]} mailles (${total} en tout), côte à côte dans la largeur.`
          : `${nombre} colonnes de ${apercu.mailles.join(" · ")} mailles (${total} en tout) ; l'outil cherchera des colonnes égales en ajustant un peu la largeur.`
        : `Pour ${total} mailles, l'outil ajustera un peu la largeur pour que les ${nombre} colonnes tombent juste.`;
  }
  const n = Math.min(max, Math.max(min, nombre));
  return html`<div class="sous-section diviser-corps">
    <h3 style="font-size:16px;margin:0">Diviser le corps</h3>
    <${Onglets} libelle="Sens de la division" valeur=${sens} surChoix=${setSens}
      choix=${[{ valeur: "colonnes", libelle: "En colonnes" }, { valeur: "sections", libelle: "En sections" }]} />
    <div class="reglage">
      <span>Nombre de ${mot}s</span>
      <div class="compteur">
        <button type="button" aria-label=${`1 ${mot} de moins`} disabled=${n <= min} onClick=${() => setNombre(n - 1)}>−</button>
        <output aria-live="polite">${n}</output>
        <button type="button" aria-label=${`1 ${mot} de plus`} disabled=${n >= max} onClick=${() => setNombre(n + 1)}>+</button>
      </div>
    </div>
    <p class="note">${phrase}${sens === "colonnes" ? " Les colonnes paires partent avec un autre point ; tu choisis ensuite le point de chaque colonne." : " La section 1 est en bas, au début du tricot, dans ton point principal ; les sections paires partent avec un autre point."}
      ${sens === "colonnes" && enRond(projet) ? " Les colonnes font tout le tour ; la première part du marqueur. Un point qui déplace le début du tour (point d'étoile, jours obliques…) prend tout le tour." : ""}</p>
    <button type="button" class="bouton-secondaire"
      onClick=${() => modifier((p) => (sens === "sections" ? diviserEnSections(p, n) : diviserBloc(p, bloc.id, n)))}>
      Diviser en ${n} ${mot}s
    </button>
  </div>`;
}

/** Hauteur d'une section, au motif près. */
function HauteurSection({ projet, bloc, pb, modifier }) {
  const motRang = enRond(projet) ? "tour" : "rang";
  if (!pb) return null;
  const motif = pb.colonnes ? null : pointParId(bloc.pointId)?.rangs.length;
  const pas = motif ? (motif * 10) / pb.densite.rangs : Math.max(1, pb.hauteurCm / Math.max(1, pb.rangs / 8));
  const fixee = bloc.hauteurCm > 0;
  const changer = (sens) => modifier((p) => avecHauteurSection(p, bloc.id, Math.max(pas, pb.hauteurCm + sens * pas)));
  return html`<div class="reglage">
    <span>Hauteur</span>
    <div class="compteur">
      <button type="button" aria-label="Un motif de moins" disabled=${pb.hauteurCm - pas < pas * 0.99} onClick=${() => changer(-1)}>−</button>
      <output aria-live="polite">${formaterNombre(pb.hauteurCm, 0)} cm${fixee ? "*" : ""}</output>
      <button type="button" aria-label="Un motif de plus" onClick=${() => changer(1)}>+</button>
    </div>
  </div>
  <p class="note">${pb.rangs} ${motRang}${pb.rangs > 1 ? "s" : ""}, au motif près.${fixee ? " * hauteur choisie par toi ; les autres sections se partagent le reste." : " Les sections se partagent la longueur du corps."}</p>`;
}

/** Réglages communs à toutes les sections : hauteurs égales, damier, ne plus diviser. */
function ToutesLesSections({ projet, bloc, modifier, surColonne }) {
  const [confirmer, setConfirmer] = useState(false);
  const damier = estUnDamier(projet);
  return html`<div class="sous-section">
    <h3 style="font-size:16px;margin:0">Toutes les sections</h3>
    <div class="rangee-boutons">
      ${sectionsFixees(projet) && html`<button type="button" class="bouton-secondaire" onClick=${() => modifier(repartirSections)}>Répartir également</button>`}
      <button type="button" class="bouton-secondaire" onClick=${() => { surColonne(null); modifier((p) => (damier ? defaireLeDamier(p) : faireUnDamier(p, bloc.id))); }}>
        ${damier ? "Défaire le damier" : "Faire un damier"}
      </button>
      <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(true)}>Ne plus diviser</button>
    </div>
    ${!damier && html`<p class="note">Damier : chaque section est coupée en ${bloc.colonnes?.length >= COLONNES_MIN ? bloc.colonnes.length : 4} colonnes, et les points${enRond(projet) ? "" : " et les laines"} se décalent d'une colonne à chaque section.</p>`}
    <${Fenetre} ouverte=${confirmer} titre="Ne plus diviser le corps ?" surFermeture=${() => setConfirmer(false)}
      actions=${html`
        <button type="button" class="bouton-principal" onClick=${() => { setConfirmer(false); modifier(sansSections); }}>Ne plus diviser</button>
        <button type="button" class="bouton-secondaire" onClick=${() => setConfirmer(false)}>Annuler</button>`}>
      <p>Le corps redeviendra d'un seul tenant, dans le point et la laine principaux. Les points, les laines et les colonnes des sections seront oubliés.</p>
    <//>
  </div>`;
}

/** Encart sauge : intarsia, petites pelotes à préparer. */
function EncartIntarsia({ projet, bloc, laines, lateral }) {
  const pelotes = petitesPelotes(projet, bloc, laines);
  const total = pelotes.reduce((t, x) => t + x.nombre, 0);
  const nom = (id) => laines.find((l) => l.id === (id || projet.laineId))?.nom || "ta laine";
  return html`<div class="encart encart-sauge encart-intarsia">
    <span>
      <strong>Intarsia</strong>
      Chaque colonne a sa propre petite pelote. Prépare ${total} petites pelotes : ${pelotes.map((x) => `${x.nombre} en « ${nom(x.laineId)} »`).join(", ")}.
      À chaque changement de couleur, croise les deux fils pour ne pas faire de trou.${lateral ? " Les bandes latérales se tricotent dans la laine de la colonne d'à côté." : ""}
    </span>
  </div>`;
}

function Verifications({ calcul }) {
  if (!calcul) {
    return html`<${Encart} type="brique">L'outil ne peut pas encore calculer : il manque l'échantillon, ou au moins l'échantillon de l'étiquette ou l'épaisseur de ta laine (étape 2).<//>`;
  }
  if (!calcul.ok) {
    const e = calcul.erreurs[0];
    return html`<${Encart} type="brique">${e?.nomBloc ? `${majuscule(e.nomBloc)} : ` : ""}${e?.message}<//>`;
  }
  if (!calcul.explications.length) return null;
  return html`<details class="ajustements">
    <summary>Ajustements faits pour que tout tombe juste (${calcul.explications.length})</summary>
    ${calcul.explications.map((e) => html`<p class="note">${majuscule(e)}${e.endsWith(".") ? "" : "."}</p>`)}
  </details>`;
}

/** Jauges de laine : besoin estimé (marge de 10 % comprise) sur métrage disponible, une par laine. */
export function JaugeLaine({ calcul, laine, piece = "echarpe" }) {
  if (!calcul?.ok || !calcul.metrage) return null;
  const m = calcul.metrage;
  const liste = calcul.parLaine?.length ? calcul.parLaine : [{ laine, metres: m.metres, suffit: calcul.laineSuffit, principale: true }];
  const plusieurs = liste.length > 1;
  return html`<div class="jauge">
    ${liste.map((x) => html`<${UneJauge} x=${x} plusieurs=${plusieurs} piece=${piece} />`)}
    <p class="note">${m.methode === "pesee" ? "Calculé d'après la pesée de ton échantillon" : "Estimation sans pesée de l'échantillon"}, marge de 10 % comprise.</p>
  </div>`;
}

function UneJauge({ x, plusieurs, piece }) {
  const c = x.suffit;
  const nom = plusieurs ? html`<${Pastille} couleur=${x.laine?.couleur} taille=${14} /> ${x.laine?.nom}` : "Laine";
  if (!c || c.statut === "inconnu") {
    return html`<div class="jauge-une">
      <div class="jauge-ligne"><strong class="jauge-nom">${nom} : environ ${x.metres} m</strong><span>métrage inconnu</span></div>
      <p class="note">Indique le métrage de « ${x.laine?.nom} » dans ta réserve pour savoir s'il suffit.</p>
    </div>`;
  }
  const part = Math.min(1, x.metres / c.disponible);
  const manque = c.statut === "insuffisant";
  return html`<div class="jauge-une">
    <div class="jauge-ligne">
      <strong class="jauge-nom">${nom} : environ ${x.metres} m</strong>
      <span>sur ${c.estime ? "environ " : ""}${c.disponible} m disponibles</span>
    </div>
    <div class="jauge-barre" role="meter" aria-valuemin="0" aria-valuemax=${c.disponible} aria-valuenow=${Math.min(x.metres, c.disponible)}
      aria-label=${`${x.laine?.nom || "Laine"} : nécessaire sur disponible`}>
      <div class="jauge-plein" style=${`width:${Math.round(part * 100)}%`}></div>
      ${manque && html`<div class="jauge-manque"></div>`}
    </div>
    ${manque && html`<${Encart} type="brique">Il manque environ ${Math.ceil(c.manque)} m de « ${x.laine?.nom} ». ${x.principale ? (piece === "jambieres" ? "Raccourcis les jambières, ou choisis un point moins gourmand (la laine est comptée pour la paire)." : piece === "bonnet" ? "Rends le bonnet moins haut, enlève le pompon, ou choisis un point moins gourmand." : piece === "snood" ? "Rends le snood moins haut ou moins large, ou choisis un point moins gourmand." : "Raccourcis l'écharpe, ou choisis un point moins gourmand.") : "Réduis la hauteur des blocs dans cette laine, ou prévois une pelote de plus."}<//>`}
    ${c.statut === "juste" && html`<p class="note">Ça devrait suffire, mais de justesse.</p>`}
  </div>`;
}

/** Bonnet : les blocs « Sommet » et « Pompon » (ils suivent le corps et la taille). */
function BlocsDuBonnet({ projet, plan, couleur, laines, virtuel, choisir }) {
  const haut = projet.blocs.filter((b) => b.zone === "corps").at(-1);
  const idSommet = plan?.sommet?.pointId || (haut?.pointId && !(haut.colonnes?.length >= COLONNES_MIN) ? haut.pointId : "jersey");
  const pSommet = pointParId(idSommet);
  const t = projet.taille;
  const couleurPompon = couleurDeLaine(t.pomponLaineId && t.pomponLaineId !== projet.laineId ? t.pomponLaineId : null, couleur, laines);
  return html`
    <button type="button" class="bloc" aria-pressed=${String(virtuel === "sommet")} onClick=${() => choisir("sommet")}
      aria-label=${`Sommet : ${pSommet ? minuscule(pSommet.nom) : "jersey"}`}>
      ${pSommet && html`<${BandeTexture} point=${pSommet} couleur=${couleurDeLaine(laineDuBloc(projet, haut, laines), couleur, laines)} hauteur=${20} rayon=${5} echelle=${0.6} />`}
      <span>Sommet</span>
    </button>
    <button type="button" class="bloc" aria-pressed=${String(virtuel === "pompon")} onClick=${() => choisir("pompon")}
      aria-label=${t.pompon ? `Pompon de ${t.pomponCm} cm` : "Pompon : pas de pompon"}>
      <span style="height:20px;width:100%;display:flex;justify-content:center">
        <span style=${`width:20px;height:20px;border-radius:50%;background:${t.pompon ? `radial-gradient(circle at 38% 35%, ${nuancesLaine(couleurPompon).eclat}, ${nuancesLaine(couleurPompon).maille} 55%, ${nuancesLaine(couleurPompon).contour})` : "transparent"};${t.pompon ? "" : "border:2px dashed var(--bordure)"}`}></span>
      </span>
      <span>Pompon</span>
    </button>`;
}

/** Bonnet : le sommet suit le point de la dernière partie du corps, ou passe en jersey (décision du 06/11). */
function ReglagesSommet({ projet, plan, couleur }) {
  const s = plan?.sommet;
  const haut = projet.blocs.filter((b) => b.zone === "corps").at(-1);
  const point = pointParId(s?.pointId || "jersey");
  const pointCorps = pointParId(haut?.pointId);
  const pb = plan?.blocs.find((b) => b.zone === "sommet");
  return html`<section class="carte-bloc reglages-bloc" aria-labelledby="titre-sommet">
    <div class="titre-section" style="margin:0"><h2 id="titre-sommet" style="font-size:19px">Sommet · ${point ? minuscule(point.nom) : "jersey"}</h2></div>
    ${point && html`<${BandeTexture} point=${point} couleur=${couleur} hauteur=${22} rayon=${5} echelle=${0.6} />`}
    ${s?.jersey
      ? html`<${Encart}>${s.raison || "Au sommet, le motif passe en jersey : il se casserait avec les diminutions."}<//>
          <p class="note">Les points simples (4 mailles de large au plus, seulement des mailles endroit et envers) continuent jusqu'en haut.</p>`
      : s && pointCorps && html`<p class="note">${majuscule(nomAvecArticle(pointCorps))} est un point simple : il continue jusqu'en haut.</p>`}
    ${s && pb && html`<p class="note">${pb.rangs} tours, 8 diminutions par tour de diminutions${s.transition ? " (après un tour de transition)" : ""}, jusqu'à ${plan.rabattage.mailles} mailles. Environ ${formaterNombre(pb.hauteurCm)} cm.</p>`}
    ${!s && html`<p class="note">Le sommet se calcule dès que l'outil connaît le nombre de mailles.</p>`}
    <p class="note">Il prend la laine ${enSections(projet) ? "de la dernière section" : "du corps"} ; pour changer son point, change celui ${enSections(projet) ? "de la dernière section" : "du corps"}.</p>
  </section>`;
}

/** Bonnet : le pompon (oui ou non, taille, laine). */
function ReglagesPompon({ projet, laines, calcul, modifier }) {
  const t = projet.taille;
  const lainesP = lainesProjet(projet, laines);
  const choisie = t.pomponLaineId || projet.laineId;
  const metres = calcul?.metrage?.parBloc?.find((b) => b.blocId === "pompon")?.metres;
  return html`<section class="carte-bloc reglages-bloc" aria-labelledby="titre-pompon">
    <div class="titre-section" style="margin:0"><h2 id="titre-pompon" style="font-size:19px">Pompon</h2></div>
    <label class="case carte-option">
      <input type="checkbox" checked=${!!t.pompon} onChange=${(e) => { const v = e.currentTarget.checked; modifier((p) => avecPompon(p, { pompon: v })); }} />
      <span><strong>Un pompon</strong> au sommet du bonnet.</span>
    </label>
    ${t.pompon && html`
      <div class="reglage">
        <span>Taille</span>
        <div class="compteur">
          <button type="button" aria-label="Pompon plus petit" disabled=${t.pomponCm <= LIMITES_BONNET.pompon[0]} onClick=${() => modifier((p) => avecPompon(p, { pomponCm: (t.pomponCm || 6) - 1 }))}>−</button>
          <output aria-live="polite">${t.pomponCm} cm</output>
          <button type="button" aria-label="Pompon plus grand" disabled=${t.pomponCm >= LIMITES_BONNET.pompon[1]} onClick=${() => modifier((p) => avecPompon(p, { pomponCm: (t.pomponCm || 6) + 1 }))}>+</button>
        </div>
      </div>
      <div class="sous-section">
        <h3 style="font-size:16px;margin:0">Laine du pompon</h3>
        ${lainesP.length > 1
          ? html`<div class="choix-laines-bloc" role="group" aria-label="Laine du pompon">
              ${lainesP.map((l) => html`<button type="button" aria-pressed=${String(l.id === choisie)}
                onClick=${() => modifier((p) => avecPompon(p, { pomponLaineId: l.id }))}>
                <${Pastille} couleur=${l.couleur} taille=${28} /> ${l.nom}${l.id === projet.laineId ? " (principale)" : ""}
              </button>`)}
            </div>`
          : html`<p class="note">Ta laine principale. <a href=${"#" + cheminEtape(projet, 2)}>Ajoute d'autres laines à l'étape Matériel</a> pour le faire dans une autre couleur.</p>`}
      </div>
      ${metres && html`<p class="note">Il faut environ ${Math.ceil(metres)} m de laine pour le pompon (compris dans la jauge).</p>`}`}
  </section>`;
}

/** Bonnet : un tour du corps, découpé en 8 parts (maquette du 09/11). */
function TourEnParts({ plan, calcul, bloc }) {
  if (!calcul) return html`<p class="note rang-mailles-vide">Le nombre de mailles s'affiche dès que l'outil peut calculer (échantillon, étape 2).</p>`;
  if (!plan) return null;
  const pb = plan.blocs.find((b) => b.id === bloc?.id) || plan.blocs.find((b) => b.zone === "corps");
  const n = pb.maillesCorps;
  const parts = n % 8 === 0 ? n / 8 : null;
  return html`<div class="rang-mailles" role="group" aria-label=${`Un tour : ${n} mailles${parts ? `, 8 parts de ${parts}` : ""}`}>
    <div class="rang-mailles-titre"><span>Un tour ${bloc?.zone === "bas" ? "du bord" : "du corps"}</span><strong>${n} mailles</strong></div>
    ${parts
      ? html`<div class="rang-mailles-ligne" aria-hidden="true">
          ${Array.from({ length: 8 }, (_, i) => html`<span class="rang-morceau rang-morceau-milieu" style="flex-grow:1"><strong>${parts}</strong>${i === 0 ? html`<span>part</span>` : ""}</span>`)}
        </div>
        <p class="note" style="margin-top:6px">${n} = 8 parts de ${parts} : ${plan.sommet?.jersey ? "le point et le sommet tombent juste" : "le point, le bord et le sommet tombent juste"}.</p>`
      : html`<p class="note">${n} mailles : un tour de transition au début du sommet ramène à ${plan.sommet?.mailles} mailles (8 parts de ${plan.sommet ? plan.sommet.mailles / 8 : "?"}).</p>`}
  </div>`;
}

/** Le rang en mailles : lisières, bandes latérales et corps (ou ses colonnes), du bord droit au bord gauche. */
function RangEnMailles({ projet, bloc, plan, calcul, colonne }) {
  if (!calcul) return html`<p class="note rang-mailles-vide">Le nombre de mailles s'affiche dès que l'outil peut calculer (échantillon, étape 2).</p>`;
  if (!plan) return null;
  const horizontal = bloc && bloc.zone !== "cotes" ? bloc : blocsHorizontaux(projet).find((b) => b.zone === "corps");
  const pb = plan.blocs.find((b) => b.id === horizontal?.id);
  if (!pb) return null;
  const lis = plan.lisieres.mailles;
  const bande = plan.bandesLaterales?.mailles || 0;
  const total = 2 * lis + 2 * bande + pb.maillesCorps;
  const morceaux = [
    lis ? { cle: "ld", nom: plan.lisieres.type === "couture" ? "couture" : "lisière", n: lis } : null,
    bande ? { cle: "bd", nom: "bande", n: bande, lateral: true } : null,
    ...(pb.colonnes
      ? pb.colonnes.map((c, j) => ({ cle: c.id, nom: `col. ${j + 1}`, n: c.mailles, milieu: true, choisi: c.id === colonne }))
      : [{ cle: "corps", nom: horizontal.zone === "corps" && !estSection(horizontal) ? "corps" : minuscule(nomBloc(horizontal, projet)), n: pb.maillesCorps, milieu: true, choisi: true }]),
    bande ? { cle: "bg", nom: "bande", n: bande, lateral: true } : null,
    lis ? { cle: "lg", nom: plan.lisieres.type === "couture" ? "couture" : "lisière", n: lis } : null,
  ].filter(Boolean);
  const nomDuBloc = estSection(horizontal) ? `de la ${minuscule(nomBloc(horizontal, projet))}` : horizontal.zone === "corps" ? "du corps" : `de ${minuscule(nomBloc(horizontal)) === "bande" ? "la bande" : minuscule(nomBloc(horizontal))}`;
  const motRang = enRond(projet) ? "tour" : "rang";
  return html`<div class="rang-mailles" role="group" aria-label=${`Un ${motRang} ${nomDuBloc} : ${morceaux.map((m) => `${m.nom} ${m.n}`).join(", ")}, ${total} mailles en tout`}>
    <div class="rang-mailles-titre">
      <span>Un ${motRang} ${nomDuBloc}</span>
      <strong>${total} mailles</strong>
    </div>
    <div class="rang-mailles-ligne" aria-hidden="true">
      ${morceaux.map((m) => html`<span class=${"rang-morceau" + (m.milieu ? " rang-morceau-milieu" : "") + (m.choisi ? " rang-morceau-choisi" : "")}
        style=${`flex-grow:${m.n}`}><strong>${m.n}</strong><span>${m.nom}</span></span>`)}
    </div>
    ${pb.colonnes && html`<p class="note">${enRond(projet) ? "Tout le tour" : "Corps de ce bloc"} : ${pb.maillesCorps} mailles = ${pb.colonnes.map((c) => c.mailles).join(" + ")}.</p>`}
    ${plan.lisieres.type === "couture" && html`<p class="note" style="margin-top:6px">1 maille de couture de chaque côté, en jersey : elle disparaît dans la couture.</p>`}
  </div>`;
}

/** Colonnes d'un bloc : diviser, choisir le point et la largeur de chaque colonne, ne plus diviser. */
function Colonnes({ projet, bloc, plan, couleur, laines = [], titre = "Diviser en colonnes", colonne, surColonne, modifier }) {
  const [menu, setMenu] = useState(null);
  const lainesP = lainesDuProjet(projet, laines);
  const aPlat = !enRond(projet);
  const pb = plan?.blocs.find((b) => b.id === bloc.id);
  const enColonnes = bloc.colonnes?.length >= COLONNES_MIN;
  const [nombre, setNombre] = useState(enColonnes ? bloc.colonnes.length : 4);
  const total = pb?.maillesCorps;

  if (!enColonnes) {
    const apercu = total ? apercuDecoupe(projet, bloc.id, nombre, total) : null;
    return html`<div class="sous-section">
      <div class="reglage">
        <span>${titre}</span>
        <div class="compteur">
          <button type="button" aria-label="1 colonne de moins" disabled=${nombre <= COLONNES_MIN} onClick=${() => setNombre(nombre - 1)}>−</button>
          <output aria-live="polite">${nombre}</output>
          <button type="button" aria-label="1 colonne de plus" disabled=${nombre >= COLONNES_MAX} onClick=${() => setNombre(nombre + 1)}>+</button>
        </div>
      </div>
      <p class="note">
        ${!total
          ? "Les colonnes se calculent dès que l'outil connaît le nombre de mailles."
          : apercu
            ? apercu.egales
              ? `${nombre} colonnes de ${apercu.mailles[0]} mailles (${total} en tout).`
              : `${nombre} colonnes de ${apercu.mailles.join(" · ")} mailles (${total} en tout) ; l'outil cherchera des colonnes égales en ajustant un peu la largeur. `
            : `Pour ${total} mailles, l'outil ajustera un peu la largeur pour que les ${nombre} colonnes tombent juste. `}
        Les colonnes paires partent avec un autre point ; tu choisis ensuite le point de chaque colonne.
        ${enRond(projet) ? " Les colonnes font tout le tour ; la première part du marqueur. Un point qui déplace le début du tour (point d'étoile, jours obliques…) prend tout le tour." : ""}
      </p>
      <button type="button" class="bouton-secondaire" onClick=${() => modifier((p) => diviserBloc(p, bloc.id, nombre))}>
        Diviser en ${nombre} colonnes
      </button>
    </div>`;
  }

  const actuelles = pb?.colonnes?.map((c) => c.mailles) || null;
  const fixees = bloc.colonnes.some((c) => Number.isInteger(c.mailles));
  const egales = actuelles && actuelles.every((m) => m === actuelles[0]);
  const options = !egales && !fixees && total ? colonnesEgalesPossibles(bloc, total, enRond(projet) ? "rond" : "plat") : null;
  const estimeLargeur = (t) => {
    const corpsCm = pb.colonnes.reduce((s, c) => s + c.largeurCm, 0);
    return plan.largeur.reelleCm + ((t - total) * corpsCm) / total;
  };
  const adresse = (c) => `/projet/${encodeURIComponent(projet.id)}/point/${encodeURIComponent(bloc.id)}?colonne=${encodeURIComponent(c.id)}`;

  return html`<div class="sous-section">
    <div class="reglage">
      <span>Colonnes</span>
      <div class="compteur">
        <button type="button" aria-label="1 colonne de moins" disabled=${bloc.colonnes.length <= COLONNES_MIN}
          onClick=${() => modifier((p) => diviserBloc(p, bloc.id, bloc.colonnes.length - 1))}>−</button>
        <output aria-live="polite">${bloc.colonnes.length}</output>
        <button type="button" aria-label="1 colonne de plus" disabled=${bloc.colonnes.length >= COLONNES_MAX}
          onClick=${() => modifier((p) => diviserBloc(p, bloc.id, bloc.colonnes.length + 1))}>+</button>
      </div>
    </div>
    <p class="note">${enRond(projet)
      ? "Les colonnes font tout le tour : la colonne 1 part du marqueur, la dernière revient jusqu'à lui. En rond, une colonne garde la laine de sa section : l'intarsia ne se tricote pas en rond."
      : "De la colonne 1 (bord droit, là où commencent les rangs endroit) à la dernière. Touche la pastille d'une colonne pour lui donner une autre laine (intarsia)."}</p>
    <ul class="liste-colonnes">
      ${bloc.colonnes.map((c, j) => {
        const point = pointParId(c.pointId);
        const m = actuelles?.[j];
        const modeCol = enRond(projet) ? "rond" : "plat";
        const plus = m && point && maillesVoisines(point, m, 1, modeCol);
        const moins = m && point && maillesVoisines(point, m, -1, modeCol);
        const changer = (sens) => modifier((p) => changerLargeurColonne(p, bloc.id, c.id, sens, { total, actuelles }));
        const idLaine = laineDeColonne(projet, bloc, c, laines) || projet.laineId;
        const laineC = laines.find((l) => l.id === idLaine);
        const couleurC = laineC?.couleur || couleur;
        return html`<li class=${"colonne" + (colonne === c.id ? " colonne-choisie" : "")}>
          ${aPlat && html`<button type="button" class="pastille-colonne" aria-expanded=${String(menu === c.id)}
            aria-label=${`Laine de la colonne ${j + 1} : ${laineC?.nom || "laine principale"}. Changer`}
            onClick=${() => setMenu(menu === c.id ? null : c.id)}><span style=${`background:${couleurC}`}></span></button>`}
          <button type="button" class="colonne-point" onClick=${() => { surColonne(c.id); naviguer(adresse(c)); }}
            aria-label=${`Colonne ${j + 1} : ${point ? minuscule(point.nom) : "point à choisir"}. Changer de point`}>
            ${point ? html`<${BandeTexture} point=${point} couleur=${couleurC} hauteur=${34} rayon=${6} echelle=${0.55} />` : html`<span class="bloc-vide"></span>`}
            <span><strong>Colonne ${j + 1}</strong><span>${point ? minuscule(point.nom) : "point à choisir"}</span></span>
          </button>
          <div class="compteur compteur-petit">
            <button type="button" aria-label=${`Colonne ${j + 1} plus étroite`} disabled=${!moins} onClick=${() => { surColonne(c.id); changer(-1); }}>−</button>
            <output aria-live="polite">${m ?? "?"} m.${Number.isInteger(c.mailles) ? "*" : ""}</output>
            <button type="button" aria-label=${`Colonne ${j + 1} plus large`} disabled=${!plus} onClick=${() => { surColonne(c.id); changer(1); }}>+</button>
          </div>
          ${menu === c.id && html`<div class="menu-laines" role="group" aria-label=${`Laine de la colonne ${j + 1}`} style="flex-basis:100%">
            ${lainesP.length < 2 && html`<p class="note" style="margin:0">Ajoute d'autres laines à l'<a href=${"#" + cheminEtape(projet, 2)}>étape Matériel</a>.</p>`}
            ${lainesP.map((l) => html`<button type="button" aria-pressed=${String(l.id === idLaine)}
              onClick=${() => { setMenu(null); modifier((p) => avecLaineDeColonne(p, bloc.id, c.id, l.id)); }}>
              <${Pastille} couleur=${l.couleur} taille=${24} /> ${l.nom}
            </button>`)}
          </div>`}
        </li>`;
      })}
    </ul>
    ${fixees && html`<p class="note">* largeur choisie par toi ; les autres colonnes se partagent le reste.</p>`}
    ${options && (options.dessous || options.dessus) &&
    html`<p class="note">Pour des colonnes toutes égales, il faudrait ${[options.dessous, options.dessus].filter(Boolean)
      .map((o) => `${o.total} mailles (${o.parColonne} par colonne, ${enRond(projet) ? "tour" : "écharpe"} d'environ ${formaterNombre(estimeLargeur(o.total), 0)} cm)`)
      .join(" ou ")} : change ${enRond(projet) ? "le tour" : "la largeur"} à l'étape 3, ou choisis des points qui s'accordent.</p>`}
    <div class="rangee-boutons">
      ${fixees && html`<button type="button" class="bouton-secondaire" onClick=${() => modifier((p) => repartirEgalement(p, bloc.id))}>Répartir également</button>`}
      <button type="button" class="bouton-secondaire" onClick=${() => { surColonne(null); modifier((p) => nePlusDiviser(p, bloc.id)); }}>${estSection(bloc) ? "Plus de colonnes" : "Ne plus diviser"}</button>
    </div>
  </div>`;
}

/** Laine d'une bordure, d'une bande ou d'une section : une des laines du projet (étape Matériel). */
function LaineDuBloc({ projet, bloc, laines, calcul, modifier }) {
  const actuelle = laineDuBloc(projet, bloc, laines) || projet.laineId;
  const lainesP = lainesDuProjet(projet, laines);
  const besoin = calcul?.parLaine?.find((x) => x.laineId === actuelle);
  const nomZone = estSection(bloc) ? "cette section" : "ce bloc";
  return html`<div class="sous-section">
    <span class="champ" id=${`laine-${bloc.id}`}>Laine de ${nomZone}</span>
    <div class="choix-laines-bloc" role="group" aria-labelledby=${`laine-${bloc.id}`}>
      ${lainesP.map((l) => html`<button type="button" aria-pressed=${String(l.id === actuelle)}
        onClick=${() => modifier((p) => avecLaineDuBloc(p, bloc.id, l.id))}>
        <${Pastille} couleur=${l.couleur} taille=${28} /> ${l.nom}${l.id === projet.laineId ? " (principale)" : ""}
      </button>`)}
    </div>
    ${lainesP.length < 2
      ? html`<p class="note">Ajoute d'autres laines à l'<a href=${"#" + cheminEtape(projet, 2)}>étape Matériel</a> pour changer de couleur.</p>`
      : actuelle !== projet.laineId
        ? html`<p class="note">${enRond(projet) ? "La couleur change sur tout le tour, au début du tour." : "La couleur change sur toute la largeur du rang, bandes latérales comprises."}${besoin ? ` Il en faut environ ${besoin.metres} m.` : ""}</p>`
        : null}
  </div>`;
}

function Loupe({ point, couleur }) {
  const [face, setFace] = useState("endroit");
  return html`
    <${BandeTexture} point=${point} couleur=${couleur} hauteur=${200} face=${face} echelle=${1.5} rayon=${16} />
    ${!point.proprietes.reversible &&
    html`<${Onglets} libelle="Côté du tricot" valeur=${face} surChoix=${setFace}
      choix=${[{ valeur: "endroit", libelle: "Endroit" }, { valeur: "envers", libelle: "Envers" }]} />`}
    <p class="note">${point.resume}</p>`;
}

const POSITIONS_BANDE = [
  { valeur: "milieu", libelle: "Au milieu du corps" },
  { valeur: "debut", libelle: "Au début du corps" },
  { valeur: "fin", libelle: "À la fin du corps" },
];
const POSITIONS_BORDURE = [
  { valeur: "bas", libelle: "En bas, contre le corps" },
  { valeur: "haut", libelle: "En haut, contre le corps" },
];

/** Écran 5b : ajouter une bande dans le corps, ou une bordure de plus. */
function AjoutBloc({ projet, couleur, surFermeture, surAjout }) {
  const [type, setType] = useState("bande");
  const [position, setPosition] = useState("milieu");
  const [hauteur, setHauteur] = useState(10);
  const pointId = type === "bande" ? "sillon" : "riz";
  const point = pointParId(pointId);
  const positions = type === "bande" ? POSITIONS_BANDE : POSITIONS_BORDURE;
  const changerType = (t) => {
    setType(t);
    setPosition(t === "bande" ? "milieu" : "bas");
    setHauteur(t === "bande" ? 10 : 3);
  };
  const apercu = ajouterBloc(projet, { type, position, pointId, hauteurCm: hauteur });

  return html`
    <${Fenetre} ouverte=${true} titre="Ajouter un bloc" surFermeture=${surFermeture}
      actions=${html`
        <button type="button" class="bouton-principal" onClick=${() => surAjout({ type, position, pointId, hauteurCm: hauteur })}>
          ${type === "bande" ? "Ajouter la bande" : "Ajouter la bordure"} et choisir son point
        </button>
        <button type="button" class="bouton-secondaire" onClick=${surFermeture}>Annuler</button>`}>
      <div class="rangee-choix" role="group" aria-label="Sorte de bloc">
        <button type="button" class="choix-carte" aria-pressed=${String(type === "bande")} onClick=${() => changerType("bande")}>
          <strong>Bande de point</strong><span>Une bande d'un autre point dans le corps</span>
        </button>
        <button type="button" class="choix-carte" aria-pressed=${String(type === "bordure")} onClick=${() => changerType("bordure")}>
          <strong>Bordure en plus</strong><span>Doubler une bordure</span>
        </button>
      </div>
      <div class="atelier">
        ${enRond(projet)
          ? html`<${DessinSnood} projet=${apercu.projet} plan=${null} couleur=${couleur} blocChoisi=${apercu.blocId}
              largeurPx=${280} prefixe="ajout" reperes=${false} libelle="Aperçu du snood avec le nouveau bloc" />`
          : html`<${DessinEcharpe} projet=${apercu.projet} plan=${null} couleur=${couleur} blocChoisi=${apercu.blocId}
              largeurPx=${300} prefixe="ajout" libelle="Aperçu de l'écharpe avec le nouveau bloc" />`}
      </div>
      <label class="champ">
        Où ?
        <select value=${position} onChange=${(e) => setPosition(e.currentTarget.value)}>
          ${positions.map((p) => html`<option value=${p.valeur}>${p.libelle}</option>`)}
        </select>
      </label>
      <div class="reglage">
        <span>Hauteur</span>
        <div class="compteur">
          <button type="button" aria-label="1 cm de moins" onClick=${() => setHauteur((h) => Math.max(1, h - 1))}>−</button>
          <output aria-live="polite">${hauteur} cm</output>
          <button type="button" aria-label="1 cm de plus" onClick=${() => setHauteur((h) => Math.min(80, h + 1))}>+</button>
        </div>
      </div>
      <p class="note">Point proposé : ${minuscule(point.nom)}. Tu le choisis juste après.</p>
    <//>`;
}

// ---------------- Couverture (0.21.0, maquette 3) ----------------

/** Carte « Bordure tout autour » : un point, une laine, une largeur (ou chaque côté à part). */
function BordureCouverture({ projet, plan, laines, couleur, modifier, choisie, surChoix }) {
  const bas = projet.blocs.find((b) => b.id === "bas");
  const point = pointParId(bas?.pointId);
  const l = largeursBordure(projet);
  const separee = !!projet.taille?.bordureSeparee;
  const avis = point ? avisPourBloc(point, "couverture", "bas") : null;
  const lainesP = lainesDuProjet(projet, laines);
  const laineB = projet.blocs.find((b) => b.id === "cotes")?.laineId || null;
  const ligne = (nom, cote, v) => html`<div class="reglage">
    <span>${nom}</span>
    <div class="compteur">
      <button type="button" aria-label=${`${nom} : réduire de 1 cm`} disabled=${v <= LIMITES_BORDURE[0]} onClick=${() => modifier((p) => avecLargeurBordure(p, v - 1, cote))}>−</button>
      <output aria-live="polite">${formaterNombre(v)} cm</output>
      <button type="button" aria-label=${`${nom} : élargir de 1 cm`} disabled=${v >= LIMITES_BORDURE[1]} onClick=${() => modifier((p) => avecLargeurBordure(p, v + 1, cote))}>+</button>
    </div>
  </div>`;
  return html`<section class=${"carte-bloc" + (choisie ? " carte-choisie" : "")} aria-labelledby="titre-bordure">
    <h2 id="titre-bordure" style="font-size:18px">Bordure tout autour</h2>
    <button type="button" class="ligne-point" onClick=${() => { surChoix(); naviguer(`/projet/${encodeURIComponent(projet.id)}/point/bas`); }}>
      <span class="ligne-point-vignette">${point ? html`<${BandeTexture} point=${point} couleur=${couleurDeLaine(laineB, couleur, laines)} hauteur=${32} rayon=${8} echelle=${0.6} />` : html`<span class="bloc-vide"></span>`}</span>
      <span class="ligne-point-nom">${point ? point.nom : "Choisir le point"}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>
    </button>
    ${avis && avis.avis === "deconseille" && html`<${Encart} type="brique">${avis.raison}<//>`}
    ${separee
      ? html`${ligne("En bas", "bas", l.bas)}${ligne("En haut", "haut", l.haut)}${ligne("À gauche", "gauche", l.gauche)}${ligne("À droite", "droite", l.droite)}
        <button type="button" class="bouton-lien" style="align-self:flex-start" onClick=${() => modifier((p) => avecBordureSeparee(p, false))}>Même largeur partout</button>`
      : html`${ligne("Largeur", null, l.bas)}
        <button type="button" class="bouton-lien" style="align-self:flex-start" onClick=${() => modifier((p) => avecBordureSeparee(p, true))}>Régler chaque côté à part</button>`}
    ${lainesP.length > 1 && html`<div class="sous-section">
      <span class="champ" id="laine-bordure">Laine de la bordure</span>
      <div class="choix-laines-bloc" role="group" aria-labelledby="laine-bordure">
        ${lainesP.map((x) => {
          const id = x.id === projet.laineId ? null : x.id;
          return html`<button type="button" aria-pressed=${String((laineB || null) === id)} onClick=${() => modifier((p) => avecLaineBordure(p, id))}>
            <${Pastille} couleur=${x.couleur} taille=${28} /> ${x.nom}${x.id === projet.laineId ? " (principale)" : ""}
          </button>`;
        })}
      </div>
    </div>`}
  </section>`;
}

/** « Panneau 1 : 103 mailles = 4 bordure + 98 corps + 1 de couture. » */
function RangCouverture({ plan, calcul }) {
  if (!calcul) return html`<p class="note rang-mailles-vide">Le nombre de mailles s'affiche dès que l'outil peut calculer (échantillon, étape 2).</p>`;
  if (!plan) return null;
  const corps = plan.blocs.find((b) => b.zone === "corps");
  const morceaux = (t) => {
    const g = [];
    if (t.bandeG) g.push(`${t.bandeG} bordure`);
    if (t.bordG) g.push(`${t.bordG} de couture`);
    const d = [];
    if (t.bandeD) d.push(`${t.bandeD} bordure`);
    if (t.bordD) d.push(`${t.bordD} de couture`);
    return [...g, `${corps?.maillesCorps ?? t.corps} corps`, ...d.reverse()].join(" + ");
  };
  if (!plan.panneaux) {
    const t = plan.montage.repartition;
    return html`<div class="encart-lin">Un rang : <strong>${plan.montage.mailles} mailles</strong> = ${morceaux(t)}.</div>`;
  }
  const n = plan.panneaux.length;
  const p1 = plan.panneaux[0];
  return html`<div class="encart-lin">
    Panneau 1 : <strong>${p1.montage.mailles} mailles</strong> = ${morceaux(p1.montage.repartition)}.
    ${n === 2 ? " Le panneau 2 est le même, en miroir." : ` Le panneau ${n} est le même, en miroir ; ${n === 3 ? "celui du milieu a" : "ceux du milieu ont"} une maille de couture de chaque côté (${plan.panneaux[1].montage.mailles} mailles).`}
  </div>`;
}
