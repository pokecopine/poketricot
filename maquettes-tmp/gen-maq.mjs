import { writeFileSync } from "fs";
import { styleTexture } from "/home/claude/poketricot/js/rendu/texture.js";
import { pointParId } from "/home/claude/poketricot/js/catalogue/points.js";
const C = "#7E9C84";
const tex = (id, e = 0.6) => styleTexture(pointParId(id), C, { echelle: e });
const info = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
const warn = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"></path></svg>`;
const retour = `<button type="button" class="bouton-rond"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button>`;
const entete = (n, t) => `<header class="ecran-entete"><div class="ecran-entete-ligne">${retour}<div class="entete-etape"><h1 class="entete-etape-titre">Snood sauge</h1><span class="entete-etape-sous-titre">Étape ${n} sur 6 · ${t}</span></div></div><div class="barre-etapes">${[1,2,3,4,5,6].map(i=>`<span class="${i<=n?"fait":""}"></span>`).join("")}</div></header>`;
const page = (corps, extra = "") => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/css/pelote.css"><style>.ecran-pied{position:static} ${extra}</style></head><body><div id="app">${corps}</div></body></html>`;
const reglage = (nom, val) => `<div class="reglage"><span>${nom}</span><div class="compteur"><button type="button">−</button><output>${val}</output><button type="button">+</button></div></div>`;
const choix = (nom, detail, val, on) => `<button type="button" class="choix-taille" aria-pressed="${on}"><span class="ligne-element-texte"><span class="ligne-element-nom">${nom}</span><span class="ligne-element-detail">${detail}</span></span><span style="${on ? "font-weight:700" : "color:var(--texte-2)"}">${val}</span></button>`;

// ---- A. Taille
const taille = page(`<main class="ecran">${entete(3, "La taille")}<div class="ecran-contenu">
<div class="onglets"><button type="button" aria-pressed="false">Enfant</button><button type="button" aria-pressed="true">Adulte</button></div>
${choix("1 tour", "Ajusté autour du cou", "62 × 24 cm", true)}
${choix("2 tours", "Long, on l'enroule deux fois", "152 × 25 cm", false)}
<section class="carte-bloc"><h2 style="font-size:18px">Ajuster</h2>
${reglage("Tour", "62 cm")}${reglage("Hauteur", "24 cm")}
<div style="display:flex;flex-direction:column;gap:8px">
<div class="encart encart-sauge">${info}<span>Avec ton échantillon : <strong>106 mailles</strong> à monter en rond, environ <strong>68 tours</strong>.</span></div>
<p class="note">Dimensions réelles : 62,4 × 24 cm.</p>
<p class="note">106 mailles au lieu de 105 pour que le point de riz tombe juste en rond.</p>
<div class="encart encart-brique">${warn}<span>Ton aiguille a un câble de 80 cm, plus long que le tour du snood (62 cm) : les mailles ne pourront pas se rejoindre. Prends un câble de 40 cm.</span></div>
</div></section>
<p class="note">Les bordures (3 cm en bas et en haut, en côtes 1/1) sont comprises ; tu pourras les changer à l'étape suivante.</p>
<p class="note" style="color:var(--texte-2)">En enfant : « 1 tour », 56 × 20 cm. Sous 56 cm de tour : « il risque de ne pas passer la tête ».</p>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Construire ma pièce</button></div></main>`);

// ---- B. Builder
const zone = (id, h, sel = false) => `<div style="${tex(id, 0.5)};height:${h}px;${sel ? "outline:3px solid var(--accent);outline-offset:-3px;border-radius:4px;" : ""}"></div>`;
const dessin = `<div style="position:relative;width:300px;margin:4px auto 0">
<div style="border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px #566A5A55">${zone("cotes-1-1", 14)}${zone("riz", 88, true)}${zone("cotes-1-1", 14)}</div>
<div style="position:absolute;right:-1px;top:-6px;bottom:-6px;border-right:2px dashed var(--accent)"></div>
<span style="position:absolute;right:6px;bottom:-24px;font-size:12px;color:var(--accent);font-weight:700">début du tour ↑</span>
<span style="position:absolute;left:0;bottom:-24px;font-size:12px;color:var(--texte-2)">← le tour continue</span>
</div>`;
const bloc = (nom, id, on, extra = "") => `<button type="button" class="bloc${extra}" aria-pressed="${on}"><div style="${tex(id, 0.6)};height:20px;border-radius:5px;width:100%"></div><span>${nom}</span></button>`;
const builder = page(`<main class="ecran">${entete(4, "Construire")}<div class="ecran-contenu">
<p class="note" style="margin-top:-6px">Adulte · 1 tour · 62 × 24 cm · aiguilles 5 mm, câble 40 cm</p>
<section class="atelier">${dessin}
<p class="atelier-legende" style="margin-top:30px">Le snood ouvert et posé à plat · corps : 18 cm</p>
<div class="rang-mailles"><div class="rang-mailles-titre"><span>Un tour du corps</span><strong>106 mailles</strong></div>
<div class="rang-mailles-ligne"><span class="rang-morceau rang-morceau-milieu rang-morceau-choisi" style="flex-grow:1"><strong>106</strong><span>corps, tout le tour</span></span></div></div>
<div class="atelier-boutons"><button type="button">Zoom texture</button><button type="button">Voir en grand</button></div></section>
<h2 style="font-size:17px">Blocs de la pièce</h2>
<div class="blocs">${bloc("Bordure du bas", "cotes-1-1", false)}${bloc("Corps", "riz", true, " bloc-corps")}${bloc("Bordure du haut", "cotes-1-1", false)}<button type="button" class="bloc bloc-ajout">+</button></div>
<p class="note">Pas de bandes latérales ni de lisières : en rond, il n'y a pas de bord.</p>
<section class="carte-bloc reglages-bloc"><div class="titre-section" style="margin:0"><h2>Corps · point de riz</h2></div>
<span class="proprietes">Réversible · Ne roule pas · Élastique · Débutant</span>
<div class="rangee-boutons"><button type="button" class="bouton-secondaire">Changer de point</button><button type="button" class="bouton-secondaire">Hauteur</button></div>
${reglage("Diviser en colonnes", "1")}
<p class="note">Les colonnes font tout le tour ; la première part du marqueur. Un point qui déplace le début du tour (point d'étoile, jours obliques…) prend tout le tour.</p>
<p class="note">La hauteur du corps s'ajuste toute seule : il complète la hauteur du snood. C'est aussi le point de ton échantillon (tricoté à plat : en rond, le tricot peut être un peu plus serré).</p></section>
<div class="jauge"><div class="jauge-une"><div class="jauge-ligne"><strong class="jauge-nom">Laine : environ 175 m</strong><span>sur 400 m disponibles</span></div><div class="jauge-barre"><div class="jauge-plein" style="width:44%"></div></div></div><p class="note">Estimation sans pesée de l'échantillon, marge de 10 % comprise.</p></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Voir le snood fini</button></div></main>`);

// ---- C. Suivi (exemple : corps en point d'étoile)
const suivi = page(`<main class="ecran ecran-suivi"><header class="ecran-entete"><div class="suivi-entete">${retour}<h1 class="suivi-titre">Snood étoilé</h1><button type="button" class="bouton-rond">≡</button></div>
<div class="suivi-progression"><div class="jauge-ligne"><strong>Tour 14 sur 70</strong><span>19 %</span></div><div class="jauge-barre"><div class="jauge-plein suivi-plein" style="width:19%"></div></div></div></header>
<div class="ecran-contenu">
<div class="rang-fait"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><path d="M5 12l5 5L20 7"></path></svg><span>Tour 13 · fait</span></div>
<section class="carte-rang"><div class="carte-rang-titre"><h2>Tour 14</h2><span class="carte-rang-cote">sur l'endroit</span></div>
<div class="encart encart-brique" style="margin:4px 0 8px">${info}<span><strong>Avant ce tour :</strong> déplace le marqueur de 2 mailles vers la gauche. Glisse 2 mailles sur l'aiguille droite sans les tricoter, puis replace le marqueur.</span></div>
<ul class="lignes-rang grand"><li class="ligne-corps"><span>*1 étoile à l'endroit, 1 maille endroit*, 30 fois (tout le tour).</span></li></ul>
<div class="puces carte-rang-reperes"><span class="etiquette">Tour 4 du motif sur 4</span><span class="etiquette">120 mailles</span><span class="etiquette">≈ 5 cm tricotés</span></div>
<div class="astuce">${info}<span><strong>Déplacer le début du tour :</strong> dans ce point, les étoiles se décalent d'un tour à l'autre. En avançant le marqueur, chaque tour recommence pile au début d'un motif, sans étoile coupée en deux. On le déplace toujours vers la gauche, jamais en arrière.</span></div>
<button type="button" class="bouton-lien">Un doute sur un geste de ce tour ?</button></section>
<div class="rang-suivant"><span class="rang-suivant-titre">Ensuite · tour 15</span><span>Tout le tour à l'endroit (120 mailles).</span></div>
<div class="carte-etape-suivi" style="margin-top:12px"><strong>Rappel du montage (avant le tour 1)</strong><p>Monte 120 mailles. Vérifie qu'elles ne sont pas vrillées sur le câble, place un marqueur et joins en rond en tricotant la première maille.</p></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal" style="height:64px">Tour terminé</button></div></main>`);

writeFileSync("/home/claude/poketricot/maquettes-tmp/taille.html", taille);
writeFileSync("/home/claude/poketricot/maquettes-tmp/builder.html", builder);
writeFileSync("/home/claude/poketricot/maquettes-tmp/suivi.html", suivi);
