// Déduit la version en rond d'un point depuis sa version à plat, vue de l'endroit.
import { POINTS } from "/home/claude/poketricot/js/catalogue/points.js";
import { geste } from "/home/claude/poketricot/js/catalogue/gestes.js";
import { deplier, maillesLesPlusProches, simuler, consomme } from "/home/claude/poketricot/js/moteur/simulateur.js";

const EQUIV_BORD = { "3ensT": "3ensT", endEnv_f: "endEnv_f" }; // gestes de bord seulement

function vueEndroit(rang, n) {
  const g = deplier(rang, n);
  if (rang.cote === "E") return g;
  return [...g].reverse().map((c) => geste(c).vuDeLAutreCote || EQUIV_BORD[c] || "?" + c);
}
function positions(liste) { // [{code, c0, p0}]
  let c = 0, p = 0; const out = [];
  for (const code of liste) { const g = geste(code.replace(/^\?/, "")); out.push({ code, c0: c, p0: p }); c += g.consomme; p += g.produit; }
  return out;
}
export function deduire(point, cible = 80) {
  const n = maillesLesPlusProches(point, cible, "plat");
  const rangs = point.rangs.map((r) => positions(vueEndroit(r, n)));
  const P = consomme(point.rangs[0].motif);
  for (let o0 = Math.floor(n / 3); o0 < Math.floor(n / 3) + P * 2; o0++) {
    let o = o0; const res = []; let ok = true;
    for (const r of rangs) {
      const i = r.findIndex((x) => x.c0 === o && !x.code.startsWith("?") || false);
      if (i < 0) { ok = false; break; }
      const win = []; let c = 0, j = i;
      while (c < P && j < r.length) { win.push(r[j].code); c += geste(r[j].code.replace(/^\?/, "")).consomme; j++; }
      if (c !== P || win.some((w) => w.startsWith("?"))) { ok = false; break; }
      res.push(win); o = r[i].p0;
    }
    if (ok && o === o0) return { ok: true, o0, rangs: res, n };
    if (ok) { // décalage global : accepté s'il revient au même motif modulo P
      if ((o - o0) % P === 0) return { ok: true, o0, rangs: res, n, derive: o - o0 };
    }
  }
  return { ok: false };
}
// Vérification : la grille en rond doit égaler la grille à plat (milieu) à un décalage près.
export function verifier(point, rangsRond) {
  const pr = { ...point, rond: { mode: "manuel", rangs: rangsRond.map((m) => ({ cote: "E", debut: [], motif: m, fin: [] })) } };
  const nPlat = maillesLesPlusProches(point, 80, "plat");
  const P = consomme(rangsRond[0]);
  const H = point.rangs.length * 2;
  const plat = simuler(point, { mailles: nPlat, rangs: H, mode: "plat" });
  const rond = simuler(pr, { mailles: P * 6, rangs: H, mode: "rond" });
  if (!plat.ok || !rond.ok) return { ok: false, erreur: JSON.stringify([plat.erreurs, rond.erreurs]) };
  for (let d = 0; d < P; d++) {
    let bon = true;
    for (let r = 0; r < H && bon; r++) {
      for (let x = P; x < P * 5; x++) {
        // milieu de la pièce à plat : on cherche un décalage commun
        const a = rond.grille[r][x], b = plat.grille[r][x + d + Math.floor(nPlat / 3) - P];
        if (a !== b) { bon = false; break; }
      }
    }
    if (bon) return { ok: true, decalage: d };
  }
  return { ok: false, erreur: "grilles différentes" };
}
if (process.argv[2]) {
  for (const id of process.argv.slice(2)) {
    const p = { ...POINTS.find((x) => x.id === id) }; delete p.rond;
    const d = deduire(p);
    console.log("==", id, d.ok ? `o0=${d.o0} derive=${d.derive||0}` : "ÉCHEC");
    if (d.ok) { d.rangs.forEach((m, i) => console.log("  ", i + 1, JSON.stringify(m))); console.log("   vérif", JSON.stringify(verifier(p, d.rangs))); }
  }
}
