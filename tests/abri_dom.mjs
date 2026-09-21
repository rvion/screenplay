// Smoke-test DOM (jsdom) de la page d'accueil : site/index.html rempli par abri_page.ts, sans Three.js.
//   node tests/abri_dom.mjs
import { JSDOM } from "jsdom";
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
const html = readFileSync(join(ROOT, "site/index.html"), "utf8");
// une adresse : sans elle jsdom refuse localStorage (origine opaque)
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost:5885/" });
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
ok(m.faces.length === 5 && /cinq murs/.test($("#titre").textContent) && /Dossier de construction · version 4 \(retenue\)/.test($("#sous-titre").textContent), "en-tete sobre : titre, version, systeme (" + $("#sous-titre").textContent.slice(0, 70) + "…)");
ok(!/class="hero"|class="badge/.test(html) && !/[\u{1F300}-\u{1FAFF}]/u.test(html) && /href="abri\.css/.test(html) && !/href="style\.css/.test(html), "page sobre : ni bandeau colore, ni badges, ni emoji ; feuille abri.css seule");
// menu de gauche : toutes les versions pretes, la retenue marquee, chacune a un clic
{
  const items = $$("#versions li"), pretes = versions_pretes(params).filter((n) => params.abri_menu.includes("abri_v" + n));
  ok(versions_pretes(params).join() === "1,2,3,4" && pretes.join() === "3,4" && items.length === 2, "menu : seulement les versions de abri_menu (" + pretes.join(", ") + "), sur " + versions_pretes(params).length + " calculables");
  const ordre = items.map((li) => li.querySelector("a").getAttribute("href"));
  ok(ordre.join() === "?v=4,?v=3", "menu : la version retenue en premier, puis les autres (" + ordre.join(", ") + ")");
  ok(items.filter((li) => li.querySelector(".v-retenue")).length === 1 && items[0].querySelector(".v-retenue") && items[0].className === "ici", "menu : une seule version « retenue », en tête et surlignée");
  ok(items.every((li) => /m² int\./.test(li.textContent) && /passage \d+ cm/.test(li.textContent) && /€/.test(li.textContent) && li.querySelector(".v-desc").textContent.length > 8), "menu : nom court et chiffres clés de chaque version");
  ok($("#bandeau").hidden === true && $("#lien-document").getAttribute("href") === "docs/abri.html", "version retenue : pas de bandeau, lien vers docs/abri.html");
  const ancres = $$("aside.menu nav.sections a").map((x) => x.getAttribute("href")).filter((h) => h.startsWith("#"));
  ok(ancres.length === 8 && ancres.every((h) => $(h)), "menu : les 8 sections de la page, toutes existantes");
}
ok($$("#fiche tr").length === 12 && /Hauteurs finies des coins/.test($("#fiche").textContent) && /sans main-d'œuvre/.test($("#fiche").textContent), "fiche chantier : 12 lignes, des murs aux matériaux");
ok($$("#murs tbody tr").length === m.faces.length, "tableau des murs : une ligne par face");
ok($$("#implantation-points li").length === 3 && /10 cm/.test($("#implantation-points").textContent), "implantation : 10 cm à gauche et devant, passage, rangement");
ok(["implantation", "sol", "toit", "rehausse"].every((k) => $("#plan-" + k + " svg")), "4 plans SVG injectés");
ok($$("#facades figure svg").length === m.faces.length && /Face C/.test($("#facades").textContent), "une élévation par mur, pan C compris");
ok($$("#debit-murs tbody tr").length === m.faces.reduce((s, f) => s + f.panneaux.length, 0) && $$("#debit-toit tbody tr").length === m.toit.panneaux.length && $$("#debit-rehausse tbody tr").length === m.rehausse.pieces.length, "débit : murs, toit, rehausse");
// materiaux : que des achats, quantite x prix = montant, total = somme hors options, rien de forfaitaire
{
  const B = m.budget, L = B.lignes;
  ok($$("#materiaux table.bom").length === B.groupes.length && $$("#materiaux tbody tr").length === L.length, "matériaux : " + B.groupes.length + " groupes, " + L.length + " lignes");
  ok(L.every((l) => Math.abs(l.montant_eur - Math.round(l.qte * l.pu_eur)) <= 1 && l.qte > 0 && l.regle.length > 5), "matériaux : montant = quantité × prix, chaque quantité a sa règle de calcul");
  ok(Math.abs(B.materiaux_eur - L.filter((l) => !l.optionnel).reduce((t, l) => t + l.montant_eur, 0)) <= 1 && B.total_eur === B.materiaux_eur, "matériaux : total = somme des lignes hors équipement optionnel");
  ok(!L.some((l) => /forfait|livraison|main|pose /i.test(l.poste + l.unite)) && B.hors_materiaux.every((h) => !L.some((l) => l.poste === h.poste)), "matériaux : aucun forfait, aucune main-d'œuvre, la livraison est hors total");
  ok(/TTC/.test($("#materiaux-total").textContent) && /Ni main-d'œuvre ni forfait/.test($("#materiaux-total").textContent), "matériaux : total TTC annoncé comme tel");
  ok(["Panneaux", "Bois", "Profils et bavettes", "Fixations", "Étanchéité", "Ouvertures", "Eaux pluviales"].every((g) => B.groupes.some((x) => x.nom === g)), "matériaux : panneaux, bois, profils, fixations, étanchéité, ouvertures, eaux pluviales");
}
// guide de montage
{
  const Gd = m.guide;
  ok($$("#guide-avant li").length === Gd.avant.length && $$("#guide-outillage li").length === Gd.outillage.length && /Pas de meuleuse/.test($("#guide-outillage").textContent), "guide : avant de commander, outillage");
  ok($$("#etapes li.etape").length === Gd.etapes.length && Gd.etapes.length >= 13, "guide : " + Gd.etapes.length + " étapes");
  ok($$("#etapes li.etape").every((li) => li.querySelector("p.but") && li.querySelector("p.outils") && li.querySelectorAll("ol li").length >= 2 && li.querySelectorAll(".controle input[type=checkbox]").length >= 1), "guide : chaque étape a son but, ses outils, ses gestes et ses contrôles à cocher");
  ok(/à plat/.test($("#etapes").textContent) && /panne/i.test($("#etapes").textContent) && !/undefined|NaN/.test($("#etapes").textContent), "guide : mur gauche monté à plat, panne intermédiaire, aucune valeur manquante");
  // une case cochee est gardee dans le navigateur
  const c = $("#etapes input[type=checkbox]"); c.checked = true; c.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(JSON.parse(dom.window.localStorage.getItem("abri-v4-cases"))["0.0"] === true, "guide : une case cochée est gardée (localStorage, par version)");
}
ok($$("#ouvertures-table tbody tr").length === 1 + v.fenetres.length && /porte pleine/.test($("#ouvertures-table").textContent) && $$("#amenagement tbody tr").length >= 4, "ouvertures et aménagement");
ok($$("#pourquoi-corps li").length >= 8 && !/\{\w+\}/.test($("#pourquoi-corps").textContent), "pourquoi : textes de la version, tous les {champs} remplacés");
ok(!/undefined|NaN|\[object/.test($("main").textContent), "aucune valeur manquante dans la page");
// liens des textes : un .md publie pointe vers sa page de docs/, qui existe
const liens = $$("#pourquoi-corps a").map((x) => x.getAttribute("href"));
ok(liens.every((h) => /^[a-z]+:/.test(h) || existsSync(join(ROOT, "site", h.split("#")[0]))), "liens des textes (" + liens.length + ") vers des pages qui existent");
ok(md_en_ligne("**a** `b` [c](abri-v2.md) <x>") === '<b>a</b> <code>b</code> <a href="docs/abri-v2.html">c</a> &lt;x&gt;', "markdown en ligne : gras, code, lien vers docs/, HTML échappé");
// la page charge ses scripts et garde un repli sans WebGL ; les liens du pied existent
ok(/src="params\.js/.test(html) && /src="abri\.js/.test(html) && /id="viewer"/.test(html) && /window\.print\(\)/.test(html), "index.html charge params.js et abri.js, a son conteneur 3D et un bouton Imprimer");
ok(["docs/abri.html", "docs/index.html", "configurateur.html"].every((h) => html.includes(`href="${h}"`) && existsSync(join(ROOT, "site", h))), "liens : document complet, index des documents, étude initiale");
ok(["voir-toit", "voir-mobilier", "voir-lit", "voir-etiquettes"].every((id) => $("#" + id)), "cases à cocher de la 3D présentes");

// chaque autre version prete se rend sans valeur manquante, avec son bandeau et son document
for (const n of versions_pretes(params).filter((k) => k !== a.principale)) {
  const b = run(params, n);
  ok(b.version === n && $("#bandeau").hidden === false && new RegExp("version " + n).test($("#bandeau").textContent) && $("#bandeau a").getAttribute("href") === "?v=" + a.principale, `?v=${n} : bandeau « version ${n}, une étude », retour à la version retenue`);
  ok($("#lien-document").getAttribute("href") === `docs/abri-v${n}.html` && existsSync(join(ROOT, "site/docs", `abri-v${n}.html`)), `?v=${n} : lien vers docs/abri-v${n}.html, qui existe`);
  ok($$("#murs tbody tr").length === b.m.faces.length && $$("#facades figure svg").length === b.m.faces.length && new RegExp(b.m.faces.length === 5 ? "cinq" : "quatre").test($("#titre").textContent), `?v=${n} : ${b.m.faces.length} murs, autant d'élévations, titre accordé`);
  ok(!/undefined|NaN|\[object/.test($("main").textContent) && $$("#etapes li.etape").length >= 12 && $("#pourquoi").hidden === (n === 1), `?v=${n} : aucune valeur manquante, montage complet${n === 1 ? ", pas de section « pourquoi » (forme de base)" : ""}`);
}
ok(run(params, 99).version === a.principale, "?v=99 (version inconnue) : retombe sur la version retenue");

console.log(fails ? `\n${fails} echec(s) page d'accueil.` : "\nPage d'accueil OK ✓");
process.exit(fails ? 1 : 0);
