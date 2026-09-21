// Smoke-test DOM (jsdom) : execute render.ts + controls.ts sur le vrai index.html,
// sans Three.js. Verifie que la page se remplit et qu'un slider recalcule tout.
//   node tests/dom.mjs
import { JSDOM } from "jsdom";
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
const html = readFileSync(join(ROOT, "site/index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;

mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/dom_entry.mjs");
await esbuild.build({ entryPoints: ["tests/dom_entry.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { run } = await import(pathToFileURL(out).href);

const params = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const app = run(params);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const $ = (s) => document.querySelector(s);

ok($("#kpis").querySelectorAll(".kpi").length === 4, "4 KPIs rendus");
ok($("#faces tbody").querySelectorAll("tr").length === 5, "tableau faces : 4 murs + toiture");
ok($("#debit tbody").querySelectorAll("tr").length === 6, "tableau debit : 4 murs + rehausse + toit");
ok($("#achats tbody").querySelectorAll("tr").length >= 10, "liste d'achats remplie");
ok($("#budget tbody").querySelectorAll("tr").length >= 14, "budget : coque + amenagement (" + $("#budget tbody").querySelectorAll("tr").length + " lignes)");
ok($("#amenagement-list").querySelectorAll("li").length === 5, "5 postes d'amenagement affiches");
ok(/€/.test($("#budget-total").textContent), "budget total affiche");
ok($("#plan-plan-sol").querySelector("svg") !== null, "plan de sol SVG injecte");
ok($("#plan-facade-A").querySelector("svg") !== null, "facade A SVG injectee");
ok($("#plan-plan-rehausse").querySelector("svg") !== null, "plan de rehausse SVG injecte");
ok($("#v-dalle").hidden === true, "vigilance dalle masquee (rien hors dalle)");
ok($("#cover").textContent.includes("cm"), "largeur utile affichee");
ok($("#v-pente").textContent.includes("%"), "pente vigilance affichee");
ok(/formalité|déclaration|permis/.test($("#v-seuil").textContent), "formalite annoncee dans la carte du seuil");
// R*420-1 : la carte affiche l'emprise des MURS, pas la projection debords compris
ok($("#v-emprise").textContent === String(params.emprise_cm.avant_A * params.emprise_cm.gauche_G / 1e4) && $("#v-emprise").textContent !== $("#v-emprise-deb").textContent, "emprise au sol affichee = celle des murs (" + $("#v-emprise").textContent + "), distincte de la projection debords compris (" + $("#v-emprise-deb").textContent + ")");

// controles presents
const ranges = $("#controls").querySelectorAll('input[type=range]');
ok(ranges.length >= 6, "sliders presents (" + ranges.length + ")");
ok($("#controls").querySelectorAll(".opening-card").length === params.fenetres.length, "cartes fenetres = params");

// interaction : bouger le slider "pente_chute_cm" doit changer la pente affichee
const penteBefore = $("#v-pente").textContent;
const slider = [...ranges].find((r) => +r.min === 5 && +r.max === 60); // pente
slider.value = "40";
slider.dispatchEvent(new dom.window.Event("input"));
ok(app.changes() > 0, "onChange declenche par le slider");
ok($("#v-pente").textContent !== penteBefore, "pente recalculee apres slider (" + penteBefore + " -> " + $("#v-pente").textContent + ")");
ok(/svg/i.test($("#plan-plan-toit").innerHTML), "plan toiture toujours rendu apres recompute");

// dalle reglable : 6 curseurs, et caler l'abri a droite fait sortir un coin de la dalle
const dalle = [...$("#controls").querySelectorAll("details")].find((g) => /Dalle/.test(g.querySelector("summary").textContent));
ok(!!dalle, "groupe Dalle present");
const dalleRanges = dalle ? dalle.querySelectorAll('input[type=range]') : [];
ok(dalleRanges.length === 8, "8 curseurs de dalle : 5 longueurs + passage vise + position (" + dalleRanges.length + ")");
ok($("#v-passage").hidden === false && /27 cm/.test($("#v-passage-cm").textContent), "carte passage arriere : " + $("#v-passage-cm").textContent);
ok(dalle && +dalleRanges[0].value === params.dalle_cm.avant, "curseur largeur = params.dalle_cm.avant");
const solBefore = $("#plan-plan-sol").innerHTML;
if (dalle) { dalleRanges[6].value = "62"; dalleRanges[6].dispatchEvent(new dom.window.Event("input")); }
ok($("#v-dalle").hidden === false, "abri cale a droite : vigilance hors dalle affichee");
ok($("#v-dalle-mur").hidden === false, "et le debord est signale contre un mur");
ok($("#plan-plan-sol").innerHTML !== solBefore, "plan de sol redessine apres reglage de la dalle");

console.log(fails ? `\n${fails} echec(s) DOM.` : "\nSmoke-test DOM OK ✓");
process.exit(fails ? 1 : 0);
