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
const { run, md_en_ligne, versions_pretes } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const params = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const a = run(params), m = a.m, v = a.v;

ok(a.version > 1 && params.abri_principal === "abri_v" + a.version && a.pp.disposition_trapeze.toit.sens === m.sens, "la page montre la version principale (" + params.abri_principal + ", toit vers " + (m.sens === "droite" ? "la droite" : "le fond") + ")");
ok(params.abri_principal === "abri_v4" && m.sens === "arriere" && m.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "BC", "abri retenu : toit vers le fond, gouttière derrière (mur du fond et pan à 45°)");
ok(m.faces.length === 5 && $("#sous-titre").textContent.startsWith("5 murs") && /cinq murs/.test($("#titre").textContent), "en-tete : cinq murs (" + $("#sous-titre").textContent.slice(0, 60) + "…)");
// menu de gauche : toutes les versions pretes, la retenue marquee, chacune a un clic
{
  const items = $$("#versions li"), pretes = versions_pretes(params).filter((n) => params.abri_menu.includes("abri_v" + n));
  ok(versions_pretes(params).join() === "1,2,3,4" && pretes.join() === "3,4" && items.length === 2, "menu : seulement les versions de abri_menu (" + pretes.join(", ") + "), sur " + versions_pretes(params).length + " calculables");
  ok(items.every((li, i) => li.querySelector("a").getAttribute("href") === "?v=" + pretes[i]), "menu : chaque version est un lien ?v=N");
  ok(items.filter((li) => li.querySelector(".v-retenue")).length === 1 && items[pretes.indexOf(a.principale)].querySelector(".v-retenue") && items[pretes.indexOf(a.version)].className === "ici", "menu : une seule version « retenue », et la version affichée est surlignée");
  ok(items.every((li) => /m² int\./.test(li.textContent) && /passage \d+ cm/.test(li.textContent) && /€/.test(li.textContent) && li.querySelector(".v-desc").textContent.length > 8), "menu : nom court et chiffres clés de chaque version");
  ok($("#bandeau").hidden === true && $("#lien-document").getAttribute("href") === "docs/abri.html", "version retenue : pas de bandeau, lien vers docs/abri.html");
  ok($$("aside.menu nav.sections a").length === 9 && $$("aside.menu nav.sections a").every((x) => $(x.getAttribute("href"))), "menu : les 9 sections de la page, toutes existantes");
}
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
ok(liens.every((h) => /^[a-z]+:/.test(h) || existsSync(join(ROOT, "site", h.split("#")[0]))), "liens des textes (" + liens.length + ") vers des pages qui existent");
ok(md_en_ligne("**a** `b` [c](abri-v2.md) <x>") === '<b>a</b> <code>b</code> <a href="docs/abri-v2.html">c</a> &lt;x&gt;', "markdown en ligne : gras, code, lien vers docs/, HTML échappé");
// la page charge ses scripts et garde un repli sans WebGL ; les liens du pied existent
ok(/src="params\.js/.test(html) && /src="abri\.js/.test(html) && /id="viewer"/.test(html), "index.html charge params.js et abri.js, et a son conteneur 3D");
ok(["docs/abri.html", "docs/index.html", "configurateur.html"].every((h) => html.includes(`href="${h}"`) && existsSync(join(ROOT, "site", h))), "pied de page : document complet, index des documents, étude initiale");
ok(["voir-toit", "voir-mobilier", "voir-lit", "voir-etiquettes"].every((id) => $("#" + id)), "cases à cocher de la 3D présentes");

// chaque autre version prete se rend sans valeur manquante, avec son bandeau et son document
for (const n of versions_pretes(params).filter((k) => k !== a.principale)) {
  const b = run(params, n);
  ok(b.version === n && $("#bandeau").hidden === false && new RegExp("version " + n).test($("#bandeau").textContent) && $("#bandeau a").getAttribute("href") === "?v=" + a.principale, `?v=${n} : bandeau « version ${n}, une étude », retour à la version retenue`);
  ok($("#lien-document").getAttribute("href") === `docs/abri-v${n}.html` && existsSync(join(ROOT, "site/docs", `abri-v${n}.html`)), `?v=${n} : lien vers docs/abri-v${n}.html, qui existe`);
  ok($$("#murs tbody tr").length === b.m.faces.length && $$("#facades figure svg").length === b.m.faces.length && new RegExp(b.m.faces.length === 5 ? "cinq" : "quatre").test($("#titre").textContent), `?v=${n} : ${b.m.faces.length} murs, autant d'élévations, titre accordé`);
  ok(!/undefined|NaN|\[object/.test($("main").textContent) && $$("#etapes li").length >= 9 && $("#pourquoi").hidden === (n === 1), `?v=${n} : aucune valeur manquante, montage complet${n === 1 ? ", pas de section « pourquoi » (forme de base)" : ""}`);
}
ok(run(params, 99).version === a.principale, "?v=99 (version inconnue) : retombe sur la version retenue");

console.log(fails ? `\n${fails} echec(s) page d'accueil.` : "\nPage d'accueil OK ✓");
process.exit(fails ? 1 : 0);
