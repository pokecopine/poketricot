// Maquettes des jambières (E4-20 à E4-24), faites avec le vrai style et les vraies textures de l'appli.
// Exemple : mollet 36 cm → jambière de 34 cm de tour, 35 cm de long (sous le genou), laine « Sauge » (aran),
// 17 mailles et 24 rangs pour 10 cm en riz, côtes 1/1 à 22 mailles. Chiffres du vrai moteur :
// en rond 58 mailles, 84 tours (12 + 60 + 12) ; à plat 57 + 2 mailles de couture = 59 mailles, 84 rangs.
import { writeFileSync } from "fs";
import { styleTexture } from "/home/claude/poketricot/js/rendu/texture.js";
import { pointParId } from "/home/claude/poketricot/js/catalogue/points.js";
const C = "#7E9C84";
const tex = (id, e = 0.6) => styleTexture(pointParId(id), C, { echelle: e });
const info = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
const retour = `<button type="button" class="bouton-rond"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button>`;
const entete = (n, t) => `<header class="ecran-entete"><div class="ecran-entete-ligne">${retour}<div class="entete-etape"><h1 class="entete-etape-titre">Jambières sauge</h1><span class="entete-etape-sous-titre">Étape ${n} sur 6 · ${t}</span></div></div><div class="barre-etapes">${[1,2,3,4,5,6].map(i=>`<span class="${i<=n?"fait":""}"></span>`).join("")}</div></header>`;
const page = (corps, extra = "") => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/css/pelote.css"><style>.ecran-pied{position:static} ${extra}</style></head><body><div id="app">${corps}</div></body></html>`;
const reglage = (nom, val) => `<div class="reglage"><span>${nom}</span><div class="compteur"><button type="button">−</button><output>${val}</output><button type="button">+</button></div></div>`;
const choix = (nom, detail, val, on) => `<button type="button" class="choix-taille" aria-pressed="${on}"><span class="ligne-element-texte"><span class="ligne-element-nom">${nom}</span><span class="ligne-element-detail">${detail}</span></span><span style="${on ? "font-weight:700" : "color:var(--texte-2)"}">${val}</span></button>`;
const onglets = (a, b, premier) => `<div class="onglets"><button type="button" aria-pressed="${premier}">${a}</button><button type="button" aria-pressed="${!premier}">${b}</button></div>`;

// ---- A. Taille (deux états : magic loop, à plat)
const taille = (rond) => page(`<main class="ecran">${entete(3, "La taille")}<div class="ecran-contenu">
<section class="carte-bloc"><h2 style="font-size:18px">Tes mesures</h2>
${reglage("Tour du mollet", "36 cm")}
<p class="note" style="margin-top:-4px">À l'endroit le plus large du mollet.</p>
${reglage("Longueur", "35 cm")}
<p class="note" style="margin-top:-4px">Depuis la cheville.</p>
</section>
<h2 style="font-size:17px">Jusqu'où ?</h2>
${choix("Mi-mollet", "Depuis la cheville", "25 cm", false)}
${choix("Sous le genou", "Depuis la cheville", "35 cm", true)}
${choix("Au-dessus du genou", "Depuis la cheville", "45 cm", false)}
<div class="encart encart-sauge">${info}<span>Tes jambières feront <strong>34 cm de tour</strong> : 2 cm de moins que le mollet, pour qu'elles tiennent. Avec ton échantillon : <strong>${rond ? "58 mailles</strong> en rond, environ <strong>84 tours</strong>" : "59 mailles</strong> à monter, environ <strong>84 rangs</strong>"}, <strong>× 2 jambières</strong>.</span></div>
<p class="note">Dimensions réelles : ${rond ? "34,1" : "33,5"} cm de tour × 35 cm de long.</p>
<h2 style="font-size:17px">Comment les tricoter ?</h2>
${onglets("En magic loop", "À plat, avec une couture", rond)}
${rond
  ? `<div class="encart encart-sauge">${info}<span>En rond, sans couture : tout se tricote en <strong>magic loop</strong>, sur ton aiguille de 4,5 mm à câble de 80 cm.</span></div>`
  : `<div class="encart encart-sauge">${info}<span>Un rectangle tricoté en allers-retours, puis fermé par une <strong>couture invisible</strong> (point de matelas). Une <strong>maille de couture</strong> de chaque côté disparaît dans la couture. N'importe quelle aiguille circulaire convient.</span></div>
<p class="note">À plat, tu peux aussi faire des colonnes de couleurs (intarsia).</p>`}
<p class="note">Bords de 5 cm en côtes 1/1 en bas et en haut ; tu pourras les changer à l'étape suivante. Tu peux changer de façon de tricoter jusqu'au patron.</p>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Construire ma pièce</button></div></main>`);

// ---- B. Builder
const zone = (id, h, sel = false) => `<div style="${tex(id, 0.5)};height:${h}px;${sel ? "outline:3px solid var(--accent);outline-offset:-3px;border-radius:4px;" : ""}"></div>`;
const dessin = (rond, selBas) => `<div style="position:relative;width:${rond ? 230 : 236}px;margin:12px auto 0">
<div style="border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px #566A5A55">${zone("cotes-1-1", 34)}${zone("riz", 168, !selBas)}${zone("cotes-1-1", 34, selBas)}</div>
${rond
  ? `<div style="position:absolute;right:-1px;top:-6px;bottom:-6px;border-right:2px dashed var(--accent)"></div>
<span style="position:absolute;right:0;bottom:-24px;font-size:12px;color:var(--accent);font-weight:700">début du tour ↑</span>
<span style="position:absolute;left:0;bottom:-24px;font-size:12px;color:var(--texte-2)">← le tour continue</span>`
  : `<div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:repeating-linear-gradient(to bottom,#FFFDF8 0 5px,transparent 5px 9px);opacity:.9;border-right:1px dashed #566A5A"></div>
<div style="position:absolute;right:0;top:0;bottom:0;width:5px;background:repeating-linear-gradient(to bottom,#FFFDF8 0 5px,transparent 5px 9px);opacity:.9;border-left:1px dashed #566A5A"></div>
<span style="position:absolute;left:-2px;bottom:-24px;font-size:12px;color:var(--texte-2)">↑ couture</span>
<span style="position:absolute;right:-2px;bottom:-24px;font-size:12px;color:var(--texte-2)">couture ↑</span>`}
<span style="position:absolute;left:50%;transform:translateX(-50%);bottom:-24px;font-size:12px;color:var(--texte-2)">cheville</span>
<span style="position:absolute;left:50%;transform:translateX(-50%);top:-20px;font-size:12px;color:var(--texte-2)">genou</span>
</div>
<p class="atelier-legende" style="margin-top:32px">${rond ? "Une jambière ouverte et posée à plat · tricotée en rond" : "Une jambière à plat, avant la couture"}</p>`;
const bloc = (nom, id, on, extra = "") => `<button type="button" class="bloc${extra}" aria-pressed="${on}"><div style="${tex(id, 0.6)};height:20px;border-radius:5px;width:100%"></div><span>${nom}</span></button>`;
const morceaux = (rond) => rond
  ? `<span class="rang-morceau rang-morceau-milieu" style="flex-grow:1"><strong>58</strong><span>corps</span></span>`
  : `<span class="rang-morceau" style="flex-grow:0;min-width:34px"><strong>1</strong></span><span class="rang-morceau rang-morceau-milieu" style="flex-grow:1"><strong>57</strong><span>corps</span></span><span class="rang-morceau" style="flex-grow:0;min-width:34px"><strong>1</strong></span>`;
const builder = (rond) => page(`<main class="ecran">${entete(4, "Construire")}<div class="ecran-contenu">
<p class="note" style="margin-top:-6px">Mollet 36 cm · 35 cm de long · ${rond ? "en magic loop · 4,5 mm, câble 80 cm" : "à plat, avec une couture · 4,5 mm"}</p>
<section class="atelier">${dessin(rond, rond)}
<div class="rang-mailles"><div class="rang-mailles-titre"><span>${rond ? "Un tour du corps" : "Un rang du corps"}</span><strong>${rond ? "58" : "59"} mailles</strong></div>
<div class="rang-mailles-ligne">${morceaux(rond)}</div>
<p class="note" style="margin-top:6px">${rond ? "Le riz et les côtes tombent juste sur 58 mailles. Les côtes gardent les mailles du corps : le bord serre un peu, c'est voulu." : "1 maille de couture de chaque côté, en jersey : elle disparaît dans la couture. Les côtes gardent les mailles du corps : le bord serre un peu, c'est voulu."}</p></div>
<div class="atelier-boutons"><button type="button">Zoom texture</button><button type="button">Voir en grand</button></div></section>
<h2 style="font-size:17px">Blocs de la pièce</h2>
<div class="blocs">${bloc("Bord du bas", "cotes-1-1", rond)}${bloc("Corps", "riz", !rond, " bloc-corps")}${bloc("Bord du haut", "cotes-1-1", false)}</div>
${rond
  ? `<section class="carte-bloc reglages-bloc"><div class="titre-section" style="margin:0"><h2>Bord du bas · côtes 1/1</h2></div>
<span class="proprietes">Réversible · Ne roule pas · Très élastique · Débutant</span>
<div class="rangee-boutons"><button type="button" class="bouton-secondaire">Changer de point</button><button type="button" class="bouton-secondaire">Hauteur : 5 cm</button></div>
<p class="note">Le bord du bas est à la cheville. Comme pour le snood, le corps peut être découpé en sections (point, hauteur et laine par section) ou en rayures ; pas de colonnes de couleurs en rond.</p></section>`
  : `<section class="carte-bloc reglages-bloc"><div class="titre-section" style="margin:0"><h2>Corps · point de riz</h2></div>
<span class="proprietes">Réversible · Ne roule pas · Texturé · Débutant</span>
<div class="rangee-boutons"><button type="button" class="bouton-secondaire">Changer de point</button><button type="button" class="bouton-secondaire">Diviser</button></div>
<p class="note">À plat, comme l'écharpe : sections empilées, colonnes, damier, et une laine par colonne (intarsia). Pas de bandes sur les côtés : la couture les remplace.</p></section>`}
<div class="jauge"><div class="jauge-une"><div class="jauge-ligne"><strong class="jauge-nom">Laine : environ ${rond ? "270" : "285"} m</strong><span>sur 400 m disponibles</span></div><div class="jauge-barre"><div class="jauge-plein" style="width:${rond ? 68 : 71}%"></div></div></div><p class="note">Pour la paire (2 × ${rond ? "135" : "142"} m)${rond ? "" : ", fil de couture compris"}. Estimation sans pesée de l'échantillon, marge de 10 % comprise.</p></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Voir les jambières finies</button></div></main>`);

// ---- C. Suivi à plat : fin de la 1re jambière, l'assemblage, puis la 2e
const suivi = page(`<main class="ecran ecran-suivi"><header class="ecran-entete"><div class="suivi-entete">${retour}<h1 class="suivi-titre">Jambières sauge</h1><button type="button" class="bouton-rond">≡</button></div>
<div class="suivi-progression"><div class="jauge-ligne"><strong>1re jambière · terminée</strong><span>50 %</span></div><div class="jauge-barre"><div class="jauge-plein suivi-plein" style="width:50%"></div></div></div></header>
<div class="ecran-contenu">
<div class="rang-fait"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><path d="M5 12l5 5L20 7"></path></svg><span>Rang 84 · fait · mailles rabattues</span></div>
<section class="carte-rang"><div class="carte-rang-titre"><h2>Assemblage</h2><span class="carte-rang-cote">1re jambière</span></div>
<ul class="lignes-rang grand"><li class="ligne-corps"><span>Ferme la jambière par une couture au point de matelas, du bas vers le haut, avec le fil gardé au montage (environ 1 m).</span></li></ul>
<div class="puces carte-rang-reperes"><span class="etiquette">Point de matelas</span><span class="etiquette">Endroit vers toi</span><span class="etiquette">84 rangs à coudre</span></div>
<div class="astuce">${info}<span><strong>Comment faire :</strong> plie la jambière, endroit vers toi, les deux bords côte à côte. Avec l'aiguille à laine, prends sur un bord le petit brin entre la maille de couture et la maille d'à côté, puis le même brin sur l'autre bord, un rang plus haut à chaque fois. Tous les 2 cm, tire doucement le fil : les bords se rejoignent et les mailles de couture passent à l'intérieur.</span></div>
<button type="button" class="bouton-lien">Un doute sur la couture ?</button></section>
<div class="rang-suivant"><span class="rang-suivant-titre">Ensuite · 2e jambière</span><span>On repart au rang 1 : monte 59 mailles, en gardant un fil d'environ 1 m pour la couture.</span></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal" style="height:64px">Couture terminée</button></div></main>`);

const d = "/home/claude/poketricot/maquettes-tmp/";
writeFileSync(d + "j-taille-rond.html", taille(true));
writeFileSync(d + "j-taille-plat.html", taille(false));
writeFileSync(d + "j-builder-rond.html", builder(true));
writeFileSync(d + "j-builder-plat.html", builder(false));
writeFileSync(d + "j-suivi-couture.html", suivi);
