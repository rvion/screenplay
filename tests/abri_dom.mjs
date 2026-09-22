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
ok(m.faces.length === 5 && /cinq murs/.test($("#titre").textContent) && /^version 4 · panneaux sandwich 6 cm · toit vers le fond$/.test($("#sous-titre").textContent), "en-tete court : titre, puis « " + $("#sous-titre").textContent + " »");
ok(!/class="hero"|class="badge/.test(html) && !/[\u{1F300}-\u{1FAFF}]/u.test(html) && /href="abri\.css/.test(html) && !/href="style\.css/.test(html), "page sobre : ni bandeau colore, ni badges, ni emoji ; feuille abri.css seule");
// menu de gauche : une seule version montree (abri_menu), donc pas de bloc « versions » ni de lien vers une autre
{
  const pretes = versions_pretes(params).filter((n) => params.abri_menu.includes("abri_v" + n));
  ok(versions_pretes(params).join() === "1,2,3,4" && pretes.join() === "4" && $$("#versions li").length === 1 && $("#bloc-versions").hidden === true, "menu : abri_menu ne garde que la version 4, le bloc des versions est caché (" + versions_pretes(params).length + " versions restent calculables par ?v=N)");
  ok($$("a[href^='?v=']").every((x) => x.closest("[hidden]")), "aucun lien visible vers une autre version");
  ok($("#bandeau").hidden === true && $("#lien-document").getAttribute("href") === "docs/abri.html", "version retenue : pas de bandeau, lien vers docs/abri.html");
  const ancres = $$("aside.menu nav.sections a").map((x) => x.getAttribute("href")).filter((h) => h.startsWith("#"));
  ok(ancres.length === 8 && ancres.every((h) => $(h)), "menu : les 8 sections de la page, toutes existantes");
  ok($$("aside.menu nav.ailleurs a").length === 2 && !html.includes('href="configurateur.html"') && $("aside.menu").lastElementChild.className === "ailleurs", "menu : « ailleurs » en bas, deux liens, plus d'étude initiale");
  ok($$("aside.menu nav.sections a").every((x) => x.textContent.length <= 22), "menu : libellés courts (" + Math.max(...$$("aside.menu nav.sections a").map((x) => x.textContent.length)) + " caractères au plus)");
}
ok($$("#fiche tr").length === 6 && $("#fiche").textContent.length < 330 && /TTC/.test($("#fiche").textContent), "fiche chantier courte : 6 lignes, " + $("#fiche").textContent.length + " caractères");
ok($$("#implantation #murs tbody tr").length === m.faces.length && $("#implantation .plans-haut").nextElementSibling.contains($("#murs")), "tableau des murs : une ligne par face, sous les deux plans de tête");
ok($$("#implantation .plans-haut figure").length === 2 && $("#implantation #plan-implantation svg") && $("#implantation #plan-sol svg") && $("#plans").previousElementSibling === $("#implantation"), "implantation et plan de sol côte à côte, dans leur section, au-dessus des élévations");
// les titres des plans sont du texte de la page, pas du dessin : le SVG de la page n'a plus d'entete, le fichier SVG la garde
ok(!/Face G · gauche/.test($("#plan-facade-G svg").innerHTML) && /Face G · gauche/.test(a.core.svg["modele-facade-G"]) && $("#plans-details article[data-cle='facade-G'] h3").textContent.replace(/\s+/g, " ").trim() === "Face G · gauche" && /vue de l'extérieur · 3 panneaux de 215/.test($("#plans-details article[data-cle='facade-G'] p.note").textContent), "planches : titre et légende en texte au-dessus du dessin, absents du dessin de la page, présents dans le fichier SVG");
ok(["implantation", "sol", "toit", "rehausse"].every((k) => $("#plan-" + k + " svg") && $("#plan-" + k).previousElementSibling.tagName === "P" && /Plan de sol|Implantation|Toiture|Rehausse/.test($("#plan-" + k).parentElement.querySelector("h3").textContent)), "planches : implantation, sol, toiture, rehausse ont leur titre en h3 et leur légende en p.note");
ok(+(a.core.planches["facade-G"].svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)[1]) < +(a.core.svg["modele-facade-G"].match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)[1]) - 40, "planches : le dessin sans entête est plus court que le fichier SVG");
ok(!$("#implantation-points") && $$("#implantation .plans-haut p.note").every((x) => x.textContent.length < 130), "implantation : plus de liste sous le plan, une légende courte par planche");
ok($$("a.zoom[data-zoom]").length === Object.keys(a.core.planches).length && $("#plan-implantation a.zoom") && $("#plan-sol a.zoom"), "chaque planche a son lien « agrandir » (nouvel onglet)");
ok(["implantation", "sol", "toit", "rehausse"].every((k) => $("#plan-" + k + " svg")), "4 plans SVG injectés");
ok($$("#plans-details article[data-cle^='facade-'] svg").length === m.faces.length && /Face C/.test($("#plans-details").textContent), "une élévation par mur, pan C compris");
// plans : liste a gauche (implantation en tete, puis les plans et chaque face), un plan a la fois a droite
{
  const visibles = () => $$("#plans-details article.detail").filter((x) => !x.hidden);
  ok($$("#plans-liste li").length === m.faces.length + 2 && $$("#plans-liste .t")[0].textContent === "Face A · façade" && $$("#plans-liste .t").slice(-2).map((x) => x.textContent).join() === "Toiture,Rehausse bois" && $$("#plans-liste .num-etape").map((x) => x.textContent).join("") === m.faces.map((f) => f.cle).join("") + "TR" && visibles().length === 1 && visibles()[0].dataset.cle === "facade-A", "plans : une lettre par mur puis T (toiture) et R (rehausse), la face A ouverte en premier, seule");
  $$("#plans-liste button")[m.faces.length].click();
  ok(visibles().length === 1 && visibles()[0].dataset.cle === "toit" && visibles()[0].querySelector("svg"), "plans : un clic ouvre la toiture");
  ok($("#plans h2 #plans-mode input") && $("#materiaux-section h2 #materiaux-mode input") && $("#montage h2 #etapes-mode input"), "la bascule « tout afficher » est dans le titre de chaque section à liste");
}
// cotes et reperes : un style unique
ok($$("#fiche .cote").length >= 10 && $$("#fiche .face").length >= 6 && $$("#murs .face").length === m.faces.length + m.faces.reduce((n, f) => n + f.panneaux.length, 0) && $$("#debit-murs .face, #debit-toit .face, #debit-rehausse .face").length >= 12, "cotes (.cote) et repères (.face) balisés dans la fiche, les murs et le débit");
ok($$("main .cote").every((x) => /^[\d,]+( ?×? ?[\d,]+)*(°| (cm|m|mm|m²|%))?$/.test(x.textContent.trim())), "chaque .cote est un nombre (ou a × b) suivi de son unité, le degré collé");
ok($$("#debit-murs tbody tr").length === m.faces.reduce((s, f) => s + f.panneaux.length, 0) && $$("#debit-toit tbody tr").length === m.toit.panneaux.length && $$("#debit-rehausse tbody tr").length === m.rehausse.pieces.length, "débit : murs, toit, rehausse");
// materiaux : que des achats, quantite x prix = montant, total = somme hors options, rien de forfaitaire
{
  const B = m.budget, L = B.lignes;
  ok($$("#materiaux article.detail table.bom").length === B.groupes.length && $$("#materiaux tbody tr").length === L.length, "matériaux : " + B.groupes.length + " groupes, " + L.length + " lignes");
  // liste a gauche, un groupe a la fois a droite ; la bascule montre tout
  const visibles = () => $$("#materiaux article.detail").filter((x) => !x.hidden);
  ok($$("#materiaux-liste li").length === B.groupes.length && visibles().length === 1 && $("#materiaux-liste li.ici .t").textContent === visibles()[0].dataset.cle, "matériaux : liste des groupes à gauche (sous-total sur chaque ligne), un seul groupe ouvert à droite, le même");
  ok($$("#materiaux-liste .badge").every((x) => /€/.test(x.textContent)) && $$("#materiaux-liste li.a-confirmer").length >= 1, "matériaux : chaque groupe porte son sous-total, ceux qui ont un prix à confirmer sont marqués");
  $$("#materiaux-liste button")[2].click();
  ok(visibles().length === 1 && visibles()[0].dataset.cle === B.groupes[2].nom && JSON.parse(dom.window.localStorage.getItem("abri-v4-materiaux")).cle === B.groupes[2].nom, "matériaux : un clic ouvre ce groupe et le garde en mémoire");
  const bascule = $("#materiaux-mode input"); bascule.checked = true; bascule.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(visibles().length === B.groupes.length && $("#materiaux").classList.contains("tout") && JSON.parse(dom.window.localStorage.getItem("abri-v4-materiaux")).tout === true, "matériaux : « tout afficher » ouvre tous les groupes (et reste en mémoire)");
  bascule.checked = false; bascule.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(visibles().length === 1, "matériaux : la bascule relâchée revient à un seul groupe");
  ok(L.every((l) => Math.abs(l.montant_eur - Math.round(l.qte * l.pu_eur)) <= 1 && l.qte > 0 && l.regle.length > 5), "matériaux : montant = quantité × prix, chaque quantité a sa règle de calcul");
  ok(Math.abs(B.materiaux_eur - L.filter((l) => !l.optionnel).reduce((t, l) => t + l.montant_eur, 0)) <= 1 && B.total_eur === B.materiaux_eur, "matériaux : total = somme des lignes hors équipement optionnel");
  ok(!L.some((l) => /forfait|livraison|main|pose /i.test(l.poste + l.unite)) && B.hors_materiaux.every((h) => !L.some((l) => l.poste === h.poste)), "matériaux : aucun forfait, aucune main-d'œuvre, la livraison est hors total");
  ok(/^Total : [\d  ]+ € TTC/.test($("#materiaux-total").textContent) && /optionnel/.test($("#materiaux-total").textContent), "matériaux : total TTC, équipement optionnel à part");
  ok(["Panneaux", "Bois", "Profils et bavettes", "Fixations", "Étanchéité", "Ouvertures", "Eaux pluviales"].every((g) => B.groupes.some((x) => x.nom === g)), "matériaux : panneaux, bois, profils, fixations, étanchéité, ouvertures, eaux pluviales");
}
// guide de montage : meme composant, liste des etapes a gauche, l'etape choisie a droite
{
  const Gd = m.guide, etapes = () => $$("#etapes article.etape"), visibles = () => $$("#etapes article.detail").filter((x) => !x.hidden);
  ok($$("#guide-avant li").length === Gd.avant.length && $$("#guide-outillage li").length === Gd.outillage.length && /Pas de meuleuse/.test($("#guide-outillage").textContent), "guide : avant de commander, outillage");
  ok(etapes().length === Gd.etapes.length && Gd.etapes.length >= 13 && $$("#etapes-liste li").length === Gd.etapes.length + 2, "guide : " + Gd.etapes.length + " étapes, la liste les nomme toutes après « avant de commander » et « outillage »");
  ok(etapes().every((li) => li.querySelector("p.but") && li.querySelector("p.outils") && li.querySelectorAll("ol li").length >= 2 && li.querySelectorAll(".controle input[type=checkbox]").length >= 1), "guide : chaque étape a son but, ses outils, ses gestes et ses contrôles à cocher");
  ok(/à plat/.test($("#etapes").textContent) && /panne/i.test($("#etapes").textContent) && !/undefined|NaN/.test($("#etapes").textContent), "guide : mur gauche monté à plat, panne intermédiaire, aucune valeur manquante");
  ok(visibles().length === 1 && visibles()[0].id === "guide-avant-etape" && $("#etapes-liste li.ici .t").textContent === "Avant de commander", "guide : au premier passage, « avant de commander » est ouvert, seul");
  $$("#etapes-liste button")[3].click();
  ok(visibles().length === 1 && visibles()[0].dataset.etape === "1" && $$("#etapes-liste li")[3].className.includes("ici"), "guide : un clic dans la liste ouvre l'étape 2, seule");
  ok($$("#etapes article.etape p.suivante button").length === Gd.etapes.length * 2 - 1 && /←/.test($$("#etapes article.etape p.suivante")[0].textContent), "guide : chaque étape a ses boutons précédente / suivante");
  visibles()[0].querySelector("p.suivante button:last-child").click();
  ok(visibles()[0].dataset.etape === "2", "guide : « suivante » ouvre l'étape 3");
  // une case cochee est gardee dans le navigateur et compte dans la liste
  const c = $("#etapes article[data-etape='2'] input[type=checkbox]"); c.checked = true; c.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(JSON.parse(dom.window.localStorage.getItem("abri-v4-cases"))["2.0"] === true && /^1\/\d+$/.test($$("#etapes-liste li")[4].querySelector(".badge").textContent) && $$("#etapes-liste li")[4].className.includes("en-cours"), "guide : une case cochée est gardée (localStorage, par version) et la liste montre 1/n en cours");
  const bascule = $("#etapes-mode input"); bascule.checked = true; bascule.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(visibles().length === Gd.etapes.length + 2, "guide : « tout afficher » déroule toutes les étapes");
  bascule.checked = false; bascule.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  ok(visibles().length === 1 && visibles()[0].dataset.etape === "2", "guide : la bascule relâchée revient à l'étape choisie");
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
ok(["docs/abri.html", "docs/index.html"].every((h) => html.includes(`href="${h}"`) && existsSync(join(ROOT, "site", h))), "liens : document complet, index des documents");
ok(["voir-toit", "voir-mobilier", "voir-lit", "voir-etiquettes", "voir-personne"].every((id) => $("#" + id)) && !$("#voir-personne").checked, "cases à cocher de la 3D présentes, personne de 1,80 m décochée au départ");

// chaque autre version prete se rend sans valeur manquante, avec son bandeau et son document
for (const n of versions_pretes(params).filter((k) => k !== a.principale)) {
  const b = run(params, n);
  ok(b.version === n && $("#bandeau").hidden === false && new RegExp("version " + n).test($("#bandeau").textContent) && $("#bandeau a").getAttribute("href") === "?v=" + a.principale, `?v=${n} : bandeau « version ${n}, une étude », retour à la version retenue`);
  ok($("#lien-document").getAttribute("href") === `docs/abri-v${n}.html` && existsSync(join(ROOT, "site/docs", `abri-v${n}.html`)), `?v=${n} : lien vers docs/abri-v${n}.html, qui existe`);
  ok($$("#murs tbody tr").length === b.m.faces.length && $$("#plans-details article[data-cle^='facade-'] svg").length === b.m.faces.length && new RegExp(b.m.faces.length === 5 ? "cinq" : "quatre").test($("#titre").textContent), `?v=${n} : ${b.m.faces.length} murs, autant d'élévations, titre accordé`);
  ok(!/undefined|NaN|\[object/.test($("main").textContent) && $$("#etapes article.etape").length >= 12 && $("#pourquoi").hidden === (n === 1), `?v=${n} : aucune valeur manquante, montage complet${n === 1 ? ", pas de section « pourquoi » (forme de base)" : ""}`);
}
ok(run(params, 99).version === a.principale, "?v=99 (version inconnue) : retombe sur la version retenue");

console.log(fails ? `\n${fails} echec(s) page d'accueil.` : "\nPage d'accueil OK ✓");
process.exit(fails ? 1 : 0);
