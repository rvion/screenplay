// Smoke-test DOM (jsdom) de la page d'accueil : site/index.html rempli par abri_page.ts, sans Three.js.
//   node tests/abri_dom.mjs
import { JSDOM } from "jsdom";
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
const html = readFileSync(join(ROOT, "site/index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;

mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/abri_dom_entry.mjs");
await esbuild.build({ entryPoints: ["tests/abri_dom_entry.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { run, md_en_ligne } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const params = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const a = run(params), m = a.m, v = a.v;

ok(a.version === 3 && params.abri_principal === "abri_v3", "la page montre la version principale (" + params.abri_principal + ")");
ok(m.faces.length === 5 && $("#sous-titre").textContent.startsWith("5 murs"), "en-tete : 5 murs (" + $("#sous-titre").textContent.slice(0, 60) + "…)");
ok($$("#badges .badge").length === 4 && /Sans formalité/.test($("#badges").textContent), "badges, dont « sans formalité »");
ok($$("#kpis .kpi").length === 4 && $("#kpis").textContent.includes(String(v.aire_interieure_m2).replace(".", ",")), "4 KPIs, l'intérieur calculé");
ok($$("#murs tbody tr").length === m.faces.length, "tableau des murs : une ligne par face");
ok($$("#implantation-points li").length >= 4 && /10 cm/.test($("#implantation-points").textContent), "implantation : 10 cm à gauche et devant, passage, rangement");
ok(["implantation", "sol", "toit", "rehausse"].every((k) => $("#plan-" + k + " svg")), "4 plans SVG injectés");
ok($$("#facades figure svg").length === m.faces.length && /Face C/.test($("#facades").textContent), "une élévation par mur, pan C compris");
ok($$("#debit-murs tbody tr").length === m.faces.reduce((s, f) => s + f.panneaux.length, 0), "débit des murs : une ligne par panneau");
ok($$("#debit-toit tbody tr").length === m.toit.panneaux.length && $$("#debit-rehausse tbody tr").length === m.rehausse.pieces.length, "débit du toit et de la rehausse");
ok($$("#debit-divers li").length === 3 && /Gouttière/.test($("#debit-divers").textContent), "gouttière, rail, profils");
ok($$("#ouvertures-table tbody tr").length === 1 + v.fenetres.length && /porte pleine/.test($("#ouvertures-table").textContent), "ouvertures : porte pleine + fenêtres");
ok($$("#amenagement tbody tr").length >= 4, "aménagement : bureaux, sièges, lit");
ok($$("#budget tbody tr").length === m.budget.lignes.length && /€/.test($("#budget tfoot").textContent), "budget : toutes les lignes et le total");
ok($$("#etapes li").length >= 10 && /assemblé à plat/.test($("#etapes").textContent) && !/undefined|NaN/.test($("#etapes").textContent), "montage : les étapes, sans valeur manquante");
ok($$("#pourquoi-corps li").length >= 8 && !/\{\w+\}/.test($("#pourquoi-corps").textContent), "pourquoi : textes de la version, tous les {champs} remplacés");
ok(!/undefined|NaN|\[object/.test($("main").textContent), "aucune valeur manquante dans la page");
// liens des textes : un .md publie pointe vers sa page de docs/, qui existe
const liens = $$("#pourquoi-corps a").map((x) => x.getAttribute("href"));
ok(liens.length > 0 && liens.every((h) => /^[a-z]+:/.test(h) || existsSync(join(ROOT, "site", h.split("#")[0]))), "liens des textes vers des pages qui existent (" + liens.join(", ") + ")");
ok(md_en_ligne("**a** `b` [c](abri-v2.md) <x>") === '<b>a</b> <code>b</code> <a href="docs/abri-v2.html">c</a> &lt;x&gt;', "markdown en ligne : gras, code, lien vers docs/, HTML échappé");
// la page charge ses scripts et garde un repli sans WebGL ; les liens du pied existent
ok(/src="params\.js/.test(html) && /src="abri\.js/.test(html) && /id="viewer"/.test(html), "index.html charge params.js et abri.js, et a son conteneur 3D");
ok(["docs/abri.html", "docs/index.html", "configurateur.html"].every((h) => html.includes(`href="${h}"`) && existsSync(join(ROOT, "site", h))), "pied de page : document complet, index des documents, étude initiale");
ok(["voir-toit", "voir-mobilier", "voir-lit", "voir-etiquettes"].every((id) => $("#" + id)), "cases à cocher de la 3D présentes");

console.log(fails ? `\n${fails} echec(s) page d'accueil.` : "\nPage d'accueil OK ✓");
process.exit(fails ? 1 : 0);
