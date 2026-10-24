// État partagé de l'application : base de données, préférences, messages.
import { createContext } from "preact";
import { useContext } from "preact/hooks";

export const ContexteApp = createContext(null);

export function useApp() {
  return useContext(ContexteApp);
}

export const ID_PREFERENCES = "prefs";

export const PREFERENCES_PAR_DEFAUT = {
  id: ID_PREFERENCES,
  theme: "auto", // clair | sombre | auto
  tailleTexte: "normale", // normale | grande
  abreviations: false,
  derniereSauvegarde: null,
  stockageDemande: false,
};

export function appliquerPreferencesAffichage(prefs) {
  const racine = document.documentElement;
  racine.dataset.theme = prefs.theme === "auto" ? "auto" : prefs.theme;
  racine.classList.toggle("texte-grand", prefs.tailleTexte === "grande");
  const sombre =
    prefs.theme === "sombre" ||
    (prefs.theme === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", sombre ? "#1E1A17" : "#F6F1E9");
    m.removeAttribute("media");
  });
}
