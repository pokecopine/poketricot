// En-tête d'une étape de conception : bouton retour, nom du projet, « Étape n sur 6 · … », barre de 6 segments.
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "../html.js";
import { useApp } from "../etat.js";
import { BoutonRetour } from "./base.js";
import { ETAPES } from "../donnees/projets.js";

export function EnTeteEtape({ titre, numero, secours = "/", fermer = false }) {
  const etape = ETAPES[numero - 1];
  return html`
    <header class="ecran-entete">
      <div class="ecran-entete-ligne">
        <${BoutonRetour} secours=${secours} fermer=${fermer} libelle=${fermer ? "Fermer" : "Étape précédente"} />
        <div class="entete-etape">
          <h1 class="entete-etape-titre">${titre}</h1>
          <span class="entete-etape-sous-titre">Étape ${numero} sur 6 · ${etape.titre}</span>
        </div>
      </div>
      <div class="barre-etapes" role="progressbar" aria-label="Avancement de la conception"
        aria-valuemin="1" aria-valuemax="6" aria-valuenow=${numero}>
        ${ETAPES.map((e) => html`<span class=${e.numero <= numero ? "fait" : ""}></span>`)}
      </div>
    </header>`;
}

/**
 * Charge un projet et tout ce qu'il faut autour (réserve, échantillons).
 * Renvoie { projet, laines, aiguilles, echantillons, introuvable, modifier(f) }.
 * modifier(f) part toujours du projet le plus récent (deux choix rapides ne s'écrasent pas) et l'enregistre.
 */
export function useProjet(id) {
  const { base } = useApp();
  const [etat, setEtat] = useState({ projet: null, laines: [], aiguilles: [], echantillons: [], introuvable: false });

  useEffect(() => {
    let actif = true;
    Promise.all([
      base.lire("projets", id), base.lister("laines"), base.lister("aiguilles"), base.lister("echantillons"),
    ]).then(([projet, laines, aiguilles, echantillons]) => {
      if (!actif) return;
      setEtat({ projet, laines, aiguilles, echantillons, introuvable: !projet });
    });
    return () => {
      actif = false;
    };
  }, [base, id]);

  const dernier = useRef(null);
  dernier.current = etat.projet;
  const file = useRef(Promise.resolve());

  const modifier = (f) => {
    const nouveau = f(dernier.current);
    dernier.current = nouveau;
    setEtat((e) => ({ ...e, projet: nouveau }));
    // Les écritures se suivent dans l'ordre, la dernière l'emporte.
    file.current = file.current.then(() => base.ecrire("projets", nouveau));
    return file.current;
  };
  return { ...etat, modifier };
}
