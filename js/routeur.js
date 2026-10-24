// Navigation par adresse (#/reserve, #/reglages…) : le bouton retour du téléphone fonctionne.
import { useEffect, useState } from "preact/hooks";

let pasDansLApp = 0;

export function cheminActuel() {
  const brut = (globalThis.location?.hash || "").replace(/^#/, "");
  return brut.startsWith("/") ? brut : "/";
}

/** Découpe un chemin en morceaux : "/reserve/laine/abc" → ["reserve", "laine", "abc"]. */
export function morceaux(chemin) {
  return chemin.split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
}

export function useChemin() {
  const [chemin, setChemin] = useState(cheminActuel());
  useEffect(() => {
    const surChangement = () => {
      setChemin(cheminActuel());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", surChangement);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);
  return chemin;
}

export function naviguer(chemin, { remplacer = false } = {}) {
  const cible = "#" + chemin;
  if (remplacer) {
    history.replaceState(null, "", cible);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    pasDansLApp++;
    location.hash = cible;
  }
}

/** Revient à l'écran précédent, ou à `secours` si on est arrivé directement ici. */
export function retour(secours = "/") {
  if (pasDansLApp > 0) {
    pasDansLApp--;
    history.back();
  } else {
    naviguer(secours, { remplacer: true });
  }
}

/** Valeur d'un paramètre de l'adresse : "/reserve/echantillon/nouveau?laine=abc" → parametre(chemin, "laine") = "abc". */
export function parametre(chemin, nom) {
  const requete = chemin.split("?")[1] || "";
  return new URLSearchParams(requete).get(nom);
}
