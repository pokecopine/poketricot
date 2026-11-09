// Maquettes du bonnet (E4-10 à E4-18), faites avec le vrai style et les vraies textures de l'appli.
// Exemple : bonnet adulte femme (56 cm), laine « Sauge », 17 mailles et 24 rangs pour 10 cm en riz.
// 51 cm tricotés → 88 mailles (8 parts de 11). Bord 10 cm avec revers (24 tours), corps 26 tours, sommet 15 tours.
import { writeFileSync } from "fs";
import { styleTexture } from "/home/claude/poketricot/js/rendu/texture.js";
import { pointParId } from "/home/claude/poketricot/js/catalogue/points.js";
const C = "#7E9C84";
const tex = (id, e = 0.6) => styleTexture(pointParId(id), C, { echelle: e });
const info = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
const retour = `<button type="button" class="bouton-rond"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button>`;
const entete = (n, t) => `<header class="ecran-entete"><div class="ecran-entete-ligne">${retour}<div class="entete-etape"><h1 class="entete-etape-titre">Bonnet sauge</h1><span class="entete-etape-sous-titre">Étape ${n} sur 6 · ${t}</span></div></div><div class="barre-etapes">${[1,2,3,4,5,6].map(i=>`<span class="${i<=n?"fait":""}"></span>`).join("")}</div></header>`;
const page = (corps, extra = "") => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/css/pelote.css"><style>.ecran-pied{position:static} ${extra}</style></head><body><div id="app">${corps}</div></body></html>`;
const reglage = (nom, val) => `<div class="reglage"><span>${nom}</span><div class="compteur"><button type="button">−</button><output>${val}</output><button type="button">+</button></div></div>`;
const choix = (nom, detail, val, on) => `<button type="button" class="choix-taille" aria-pressed="${on}"><span class="ligne-element-texte"><span class="ligne-element-nom">${nom}</span><span class="ligne-element-detail">${detail}</span></span><span style="${on ? "font-weight:700" : "color:var(--texte-2)"}">${val}</span></button>`;
const caseOpt = (titre, detail, on) => `<label class="case carte-option"><input type="checkbox" ${on ? "checked" : ""}/><span><strong>${titre}</strong>${detail ? ` ${detail}` : ""}</span></label>`;

// ---- A. Taille
const taille = page(`<main class="ecran">${entete(3, "La taille")}<div class="ecran-contenu">
<div class="onglets"><button type="button" aria-pressed="false">Enfant</button><button type="button" aria-pressed="true">Adulte</button></div>
${choix("Femme", "Tour de tête moyen", "56 cm", true)}
${choix("Homme", "Tour de tête moyen", "60 cm", false)}
${choix("Tour de tête mesuré", "Mesure au-dessus des oreilles et des sourcils", "— cm", false)}
<section class="carte-bloc"><h2 style="font-size:18px">Ajuster</h2>
${reglage("Tour de tête", "56 cm")}${reglage("Hauteur", "22 cm")}
<div style="display:flex;flex-direction:column;gap:8px">
<div class="encart encart-sauge">${info}<span>Ton bonnet fera <strong>51 cm de tour</strong> : 5 cm de moins que la tête, il serre un peu pour bien tenir. Avec ton échantillon : <strong>88 mailles</strong> en rond, environ <strong>65 tours</strong>.</span></div>
<p class="note">Hauteur sans le revers, du bord jusqu'en haut du sommet.</p>
</div></section>
${caseOpt("Revers replié", "Le bord fera 10 cm et se repliera en deux.", true)}
${caseOpt("Pompon", "6 cm, dans ta laine principale.", true)}
<div class="encart encart-sauge">${info}<span>Tout le bonnet se tricote en <strong>magic loop</strong>, sur ton aiguille de 5 mm à câble de 80 cm.</span></div>
<p class="note">Le bord (côtes 1/1) et le sommet sont compris ; tu pourras les changer à l'étape suivante.</p>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Construire ma pièce</button></div></main>`);

// ---- B. Builder (bord choisi)
const zone = (id, h, sel = false, plus = "") => `<div style="${tex(id, 0.5)};height:${h}px;${plus}${sel ? "outline:3px solid var(--accent);outline-offset:-3px;border-radius:4px;" : ""}"></div>`;
// Sommet : 8 pointes qui se resserrent (le bonnet ouvert à plat).
const dents = Array.from({ length: 8 }, (_, i) => { const a = (i * 100) / 8, b = ((i + 1) * 100) / 8, m = (a + b) / 2; return `${a}% 100%, ${m - 1.2}% 6%, ${m + 1.2}% 6%`; }).join(", ") + ", 100% 100%";
const dessin = `<div style="position:relative;width:300px;margin:34px auto 0">
<div aria-hidden="true" style="position:absolute;left:50%;top:-34px;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#A9C2AE,#7E9C84 55%,#566A5A);box-shadow:0 0 0 3px #7E9C8455"></div>
<div style="${tex("riz", 0.5)};height:44px;clip-path:polygon(${dents})"></div>
<div style="border-radius:0 0 6px 6px;overflow:hidden;box-shadow:0 0 0 1px #566A5A55">${zone("riz", 64)}${zone("cotes-1-1", 60, true)}</div>
<div style="position:absolute;left:-6px;right:-6px;bottom:30px;border-top:2px dashed var(--accent)"></div>
<span style="position:absolute;right:-2px;bottom:34px;font-size:12px;color:var(--accent);font-weight:700;background:var(--fond);padding:0 4px">repli du revers</span>
<div style="position:absolute;right:-1px;top:40px;bottom:-6px;border-right:2px dashed var(--texte-2)"></div>
<span style="position:absolute;right:0;bottom:-22px;font-size:12px;color:var(--texte-2)">début du tour ↑</span>
</div>
<p class="atelier-legende" style="margin-top:28px">Le bonnet ouvert et posé à plat · sommet en 8 parts</p>`;
const bloc = (nom, id, on, extra = "") => `<button type="button" class="bloc${extra}" aria-pressed="${on}"><div style="${tex(id, 0.6)};height:20px;border-radius:5px;width:100%"></div><span>${nom}</span></button>`;
const builder = page(`<main class="ecran">${entete(4, "Construire")}<div class="ecran-contenu">
<p class="note" style="margin-top:-6px">Adulte femme · 56 cm · 22 cm de haut · 5 mm, câble 80 cm (magic loop)</p>
<section class="atelier">${dessin}
<div class="rang-mailles"><div class="rang-mailles-titre"><span>Un tour du corps</span><strong>88 mailles</strong></div>
<div class="rang-mailles-ligne">${Array.from({ length: 8 }, (_, i) => `<span class="rang-morceau rang-morceau-milieu" style="flex-grow:1"><strong>11</strong>${i === 0 ? "<span>part</span>" : ""}</span>`).join("")}</div>
<p class="note" style="margin-top:6px">88 = 8 parts de 11 : le riz, les côtes et le sommet tombent juste.</p></div>
<div class="atelier-boutons"><button type="button">Zoom texture</button><button type="button">Voir en grand</button></div></section>
<h2 style="font-size:17px">Blocs de la pièce</h2>
<div class="blocs">${bloc("Bord et revers", "cotes-1-1", true)}${bloc("Corps", "riz", false, " bloc-corps")}${bloc("Sommet", "riz", false)}<button type="button" class="bloc" aria-pressed="false"><div style="height:20px;width:100%;display:flex;justify-content:center"><span style="width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#A9C2AE,#7E9C84 55%,#566A5A)"></span></div><span>Pompon</span></button></div>
<section class="carte-bloc reglages-bloc"><div class="titre-section" style="margin:0"><h2>Bord · côtes 1/1</h2></div>
<span class="proprietes">Réversible · Ne roule pas · Très élastique · Débutant</span>
<div class="rangee-boutons"><button type="button" class="bouton-secondaire">Changer de point</button><button type="button" class="bouton-secondaire">Hauteur : 10 cm</button></div>
${caseOpt("Revers replié", "Les 10 cm se replient en deux : il reste 5 cm visibles.", true)}
<p class="note">Avec un revers, l'intérieur du bord se voit une fois replié : seuls les <strong>points réversibles</strong> sont proposés (côtes, mousse, riz, blé…). Les autres sont grisés.</p></section>
<section class="carte-bloc"><div class="titre-section" style="margin:0"><h2 style="font-size:16px">Sommet · point de riz</h2></div>
<p class="note">Le riz est un point simple : il continue jusqu'en haut. 15 tours, 8 diminutions par tour de diminutions, jusqu'à 8 mailles.</p></section>
<div class="jauge"><div class="jauge-une"><div class="jauge-ligne"><strong class="jauge-nom">Laine : environ 125 m</strong><span>sur 400 m disponibles</span></div><div class="jauge-barre"><div class="jauge-plein" style="width:31%"></div></div></div><p class="note">Pompon compris (environ 15 m). Estimation sans pesée de l'échantillon, marge de 10 % comprise.</p></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal">Voir le bonnet fini</button></div></main>`);

// ---- B2. Sommet d'un grand motif (encart seul, sous le builder)
const sommetJersey = page(`<main class="ecran"><div class="ecran-contenu" style="padding-top:16px">
<h2 style="font-size:17px">Si le corps est un grand motif</h2>
<section class="carte-bloc"><div class="titre-section" style="margin:0"><h2 style="font-size:16px">Sommet · jersey</h2></div>
<div style="${tex("jersey", 0.6)};height:22px;border-radius:5px"></div>
<div class="encart encart-sauge">${info}<span>Au sommet, le <strong>point d'étoile passe en jersey</strong> : avec les diminutions, ses étoiles se casseraient.</span></div>
<p class="note">Les points simples (4 mailles de large au plus, seulement des mailles endroit et envers) continuent jusqu'en haut.</p></section>
</div></main>`);

// ---- C. Suivi : un tour de diminutions du sommet
const suivi = page(`<main class="ecran ecran-suivi"><header class="ecran-entete"><div class="suivi-entete">${retour}<h1 class="suivi-titre">Bonnet sauge</h1><button type="button" class="bouton-rond">≡</button></div>
<div class="suivi-progression"><div class="jauge-ligne"><strong>Tour 55 sur 65</strong><span>85 %</span></div><div class="jauge-barre"><div class="jauge-plein suivi-plein" style="width:85%"></div></div></div></header>
<div class="ecran-contenu">
<div class="rang-fait"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><path d="M5 12l5 5L20 7"></path></svg><span>Tour 54 · fait</span></div>
<section class="carte-rang"><div class="carte-rang-titre"><h2>Tour 55</h2><span class="carte-rang-cote">sommet · diminutions</span></div>
<ul class="lignes-rang grand"><li class="ligne-corps"><span>*7 mailles en riz, 2 mailles ensemble à l'endroit*, 8 fois.</span></li></ul>
<div class="puces carte-rang-reperes"><span class="etiquette">72 → 64 mailles</span><span class="etiquette">Diminution 3 sur 10</span><span class="etiquette">8 parts de 8 ensuite</span></div>
<div class="astuce">${info}<span><strong>En riz :</strong> tricote à l'envers les mailles qui montrent un V, à l'endroit celles qui montrent un petit grain. La diminution est toujours à la fin d'une part : 8 lignes de diminutions montent vers le haut, comme les parts d'un gâteau.</span></div>
<button type="button" class="bouton-lien">Un doute sur un geste de ce tour ?</button></section>
<div class="rang-suivant"><span class="rang-suivant-titre">Ensuite · tour 56</span><span>Tout le tour en riz, sans diminuer (64 mailles).</span></div>
<div class="carte-etape-suivi" style="margin-top:12px"><strong>Après le tour 65</strong><p>Il reste 8 mailles. Coupe le fil en laissant 20 cm, passe-le dans les 8 mailles avec l'aiguille à laine, serre bien, et rentre le fil à l'intérieur. Puis : le pompon.</p></div>
</div><div class="ecran-pied"><button type="button" class="bouton-principal" style="height:64px">Tour terminé</button></div></main>`);

const d = "/home/claude/poketricot/maquettes-tmp/";
writeFileSync(d + "b-taille.html", taille);
writeFileSync(d + "b-builder.html", builder);
writeFileSync(d + "b-sommet-jersey.html", sommetJersey);
writeFileSync(d + "b-suivi.html", suivi);
