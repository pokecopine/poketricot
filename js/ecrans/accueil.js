import { useEffect, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { naviguer } from "../routeur.js";
import { Encart } from "../composants/base.js";
import { IconePelote, IconeReglages, IconePlus, IconeChevron } from "../composants/icones.js";
import { BandeTexture } from "../composants/texture.js";
import { POINTS, pointParId } from "../catalogue/points.js";
import { rappelSauvegardeNecessaire } from "../donnees/sauvegarde.js";
import { trierProjets, texteEtat, cheminProjet, pointVignette } from "../donnees/projets.js";

function salutation(maintenant = new Date()) {
  const h = maintenant.getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

export function Accueil() {
  const { base, prefs } = useApp();
  const [compte, setCompte] = useState(null);
  const [projets, setProjets] = useState(null);
  const [laines, setLaines] = useState([]);
  const [termines, setTermines] = useState([]);
  const [suivis, setSuivis] = useState({});

  useEffect(() => {
    Promise.all([base.lister("laines"), base.lister("aiguilles"), base.lister("projets"), base.lister("suivis")]).then(([l, a, p, s]) => {
      setCompte({ laines: l.length, aiguilles: a.length });
      setLaines(l);
      setProjets(trierProjets(p));
      setTermines(p.filter((x) => x.statut === "termine").sort((x, y) => String(y.termineLe || "").localeCompare(String(x.termineLe || ""))));
      setSuivis(Object.fromEntries(s.map((x) => [x.id, x])));
    });
  }, [base]);

  const carte = (p) => {
    const laine = laines.find((l) => l.id === p.laineId);
    const suivi = p.patronId ? suivis[p.patronId] : null;
    const total = p.patron?.nbRangs || 0;
    return html`<button type="button" class="carte-accueil" onClick=${() => naviguer(cheminProjet(p, suivi))}>
      <span class="carte-accueil-texture" style="width:72px;height:56px">
        <${BandeTexture} point=${pointVignette(p)} couleur=${laine?.couleur || "#9A9590"} hauteur=${56} />
      </span>
      <span class="ligne-element-texte">
        <span class="ligne-element-nom" style="font-family:var(--titre);font-size:17px;font-weight:600">${p.nom}</span>
        <span class="ligne-element-detail">${texteEtat(p, suivi)}</span>
        ${p.statut === "patron" && total > 0 && suivi?.rangsFaits > 0 &&
        html`<span class="mini-jauge" aria-hidden="true"><span style=${`width:${Math.floor((suivi.rangsFaits / total) * 100)}%`}></span></span>`}
      </span>
      ${IconeChevron()}
    </button>`;
  };

  const aDesDonnees = compte && compte.laines + compte.aiguilles + (projets?.length || 0) > 0;
  const rappel = rappelSauvegardeNecessaire(prefs.derniereSauvegarde, aDesDonnees);

  return html`
    <main class="ecran">
      <header class="accueil-entete">
        <div class="accueil-ligne">
          <p class="accueil-salut">${salutation()}</p>
          <button type="button" class="bouton-rond" aria-label="Réglages et sauvegarde"
            onClick=${() => naviguer("/reglages")}>${IconeReglages()}</button>
        </div>
        <div class="accueil-ligne">
          <h1 class="accueil-titre">Mes tricots</h1>
          <button type="button" class="bouton-pilule" onClick=${() => naviguer("/reserve/laines")}>
            ${IconePelote()} Ma réserve
          </button>
        </div>
      </header>

      <div class="ecran-contenu">
        ${rappel &&
        html`<${Encart} type="brique">
          ${prefs.derniereSauvegarde ? "Ta dernière sauvegarde date de plus d'un mois." : "Tu n'as encore jamais sauvegardé tes données."}
          ${" "}<a href="#/reglages">Faire une sauvegarde</a>
        <//>`}

        <h2 style="font-size:18px">En cours</h2>
        ${projets && projets.length === 0 &&
        html`<div class="vide">
          <strong>Aucun projet pour l'instant</strong>
          <span>Commence ta première écharpe avec « Nouveau projet ». Tu peux aussi ranger d'abord tes laines, tes aiguilles et tes échantillons dans ta réserve.</span>
        </div>`}
        ${(projets || []).map(carte)}

        <div class="section-titre"><h2>Les points</h2></div>
        <button type="button" class="carte-accueil" onClick=${() => naviguer("/points")}>
          <span class="carte-accueil-texture"><${BandeTexture} point=${pointParId("torsade-gauche")} couleur="#D07E5B" hauteur=${60} /></span>
          <span class="ligne-element-texte">
            <span class="ligne-element-nom">Catalogue de points</span>
            <span class="ligne-element-detail">${POINTS.length} points à découvrir : textures, recettes et gestes expliqués</span>
          </span>
          ${IconeChevron()}
        </button>

        <div class="section-titre"><h2>Ma bibliothèque</h2></div>
        ${termines.length === 0
          ? html`<p class="note">Tes projets terminés apparaîtront ici.</p>`
          : termines.map(carte)}

        ${compte &&
        html`<p class="note">
          Dans ta réserve : ${compte.laines} laine${compte.laines > 1 ? "s" : ""} et
          ${" "}${compte.aiguilles} paire${compte.aiguilles > 1 ? "s" : ""} d'aiguilles.
        </p>`}
      </div>

      <div class="ecran-pied">
        <button type="button" class="bouton-principal sombre" onClick=${() => naviguer("/projet/nouveau")}>
          ${IconePlus()} Nouveau projet
        </button>
      </div>
    </main>`;
}
