import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
const B = "http://localhost:8123";
const nav = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
const page = await ctx.newPage();
await page.goto(B + "/#/"); await page.waitForTimeout(800);
await page.evaluate(async () => {
  const db = await (await import("/js/donnees/db.js")).ouvrirBase();
  await db.ecrire("laines", { id: "l1", nom: "Grosse sauge", epaisseur: "bulky", couleur: "#7E9C86", quantite: { mode: "etiquette", metresParPelote: "100", pelotes: "3" } });
});
await page.goto(B + "/#/points"); await page.waitForTimeout(600);
const n = await page.evaluate(() => document.querySelectorAll(".famille").length);
await page.locator("summary", { hasText: "Ajourés" }).click();
await page.waitForTimeout(400);
await page.locator("summary", { hasText: "Ajourés" }).evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); });
await page.waitForTimeout(12000);
console.log(await page.evaluate(() => document.querySelectorAll(".famille[open] .case-point-alerte").length));
await page.screenshot({ path: "/home/claude/maquette/1b-grille-alertes.png" });
await nav.close();
