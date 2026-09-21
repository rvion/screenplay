// Pages de documents (site/docs/) : rendu du markdown, reecriture des liens, index, et garde
// "site/docs/ est a jour et aucun lien n'y est mort".
//   node tests/docs.mjs
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();
mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/docs.mjs");
await esbuild.build({ entryPoints: ["site/src/docs.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { page_html, index_html, construit_docs, est_publie, sortie_de, ancre } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const DEPOT = "https://github.com/rvion/screenplay";

// ---- ce qui est publie
ok(["abri.md", "abri-v3.md", "README.md", "agent/04-geometrie.md"].every(est_publie), "publies : documents de la racine, versions futures, agent/");
ok(!["CLAUDE.md", "CLAUDE.local.md", "STATUS.md", "STATUS.full.md", ".rv-reflections/x.md", "site/x.md", "node_modules/a/README.md", "params.json"].some(est_publie), "jamais publies : CLAUDE*, STATUS*, dossiers caches, site/, node_modules");
ok(sortie_de("README.md") === "readme.html" && sortie_de("agent/04-geometrie.md") === "agent/04-geometrie.html", "adresses : readme.html, agent/04-geometrie.html");
ok(ancre("Option 1") === "option-1" && ancre("Ce qui change par rapport à la version 1") === "ce-qui-change-par-rapport-à-la-version-1", "ancres facon GitHub");

// ---- rendu d'une page de la racine
const publies = new Set(["abri.md", "abri-v2.md", "agent/04-geometrie.md"]);
const racine = page_html({ chemin: "abri-v2.md", md: "# Titre v2\n\n> note\n\n![plan](site/assets/modele-v2-sol.svg)\n\nVoir [la v1](abri.md), [la section](#option-1), [la géométrie](agent/04-geometrie.md#toiture), [les cotes](params.json) et [le site](https://example.org/a?x=1&y=2).\n\n<img src=\"site/assets/plan-sol.svg\" alt=\"brut\">\n\n## Option 1\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n## Option 1\n" }, publies, DEPOT);
ok(racine.titre === "Titre v2" && racine.sortie === "abri-v2.html", "titre = premier h1, sortie abri-v2.html");
ok(racine.html.includes('src="../assets/modele-v2-sol.svg"') && racine.html.includes('src="../assets/plan-sol.svg"'), "images du site, markdown et HTML brut : ../assets/");
ok(racine.html.includes('href="abri.html"') && !racine.html.includes("blob/main/abri.html"), "lien vers un .md publie -> sa page, une seule reecriture");
ok(racine.html.includes('href="agent/04-geometrie.html#toiture"'), "lien vers agent/ avec ancre conservee");
ok(racine.html.includes(`href="${DEPOT}/blob/main/params.json"`), "fichier non publie -> le depot");
ok(racine.html.includes('href="#option-1"') && racine.html.includes('href="https://example.org/a?x=1&amp;y=2"'), "ancres et liens externes intacts");
ok(racine.html.includes('<h2 id="option-1">') && racine.html.includes('<h2 id="option-1-1">'), "titres ancres, doublon numerote");
ok(racine.html.includes('<div class="doc-table"><table>'), "tableau rendu, defilable");
ok(racine.html.includes('name="robots" content="noindex"') && racine.html.includes('href="../style.css"') && racine.html.includes('href="index.html"'), "page cachee des moteurs, styles du site, retour a l'index");

// ---- page d'un sous-dossier
const sous = page_html({ chemin: "agent/04-geometrie.md", md: "# Géométrie\n\n[retour](../abri.md) ![x](../site/assets/plan-toit.svg) [voisin](05-pipeline.md)\n" }, publies, DEPOT);
ok(sous.html.includes('href="../abri.html"') && sous.html.includes('src="../../assets/plan-toit.svg"') && sous.html.includes('href="../../style.css"'), "sous-dossier : chemins remontes d'un cran de plus");
ok(sous.html.includes(`href="${DEPOT}/blob/main/agent/05-pipeline.md"`), "voisin non publie -> le depot");

// ---- index : toute nouvelle version y apparait, dans l'ordre naturel
{
  const noms = ["variantes.md", "abri-v10.md", "abri-v3.md", "README.md", "abri.md", "abri-v2.md", "CLAUDE.md", "agent/00-vision.md"];
  const idx = construit_docs(noms.map((chemin) => ({ chemin, md: `# ${chemin}\n\nTexte de présentation assez long pour le résumé.\n` })), DEPOT);
  const ordre = [...idx["index.html"].matchAll(/<li><a href="([^"]+)"/g)].map((m) => m[1]);
  ok(ordre.join() === "readme.html,abri.html,abri-v2.html,abri-v3.html,abri-v10.html,variantes.html,agent/00-vision.html", "index : README, abri, v2, v3, v10, variantes, puis agent/ (" + ordre.join() + ")");
  ok(!("claude.html" in idx) && "abri-v3.html" in idx, "abri-v3.md publie sans rien declarer, CLAUDE.md jamais");
}

// ---- garde : liens morts. D'abord sur un echantillon casse (doit echouer), puis sur le vrai dossier
const parcours = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? parcours(p) : [p]; });
function liens_morts(dir) {
  const morts = [];
  for (const f of parcours(dir)) {
    const html = readFileSync(f, "utf8"), ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const u = m[1].replace(/&amp;/g, "&");
      const depot = /github\.com\/rvion\/screenplay\/blob\/main\/([^#]+)/.exec(u);
      if (depot) { if (!existsSync(join(ROOT, depot[1]))) morts.push(`${relative(dir, f)} -> depot ${depot[1]}`); continue; }
      if (/^[a-z]+:/i.test(u)) continue;
      if (u.startsWith("#")) { if (!ids.has(decodeURIComponent(u.slice(1)))) morts.push(`${relative(dir, f)} -> ${u}`); continue; }
      if (!existsSync(resolve(dirname(f), u.split("#")[0]))) morts.push(`${relative(dir, f)} -> ${u}`);
    }
  }
  return morts;
}
{
  const tmp = mkdtempSync(join(tmpdir(), "docs-casse-"));
  writeFileSync(join(tmp, "ok.html"), '<h2 id="la">x</h2><a href="#la">a</a> <a href="ok.html">b</a> <a href="https://example.org">c</a>');
  writeFileSync(join(tmp, "casse.html"), `<a href="absent.html">a</a> <a href="#nulle-part">b</a> <img src="../assets/absent.svg"> <a href="${DEPOT}/blob/main/abri.html">c</a>`);
  const m = liens_morts(tmp);
  ok(m.length === 4 && m.every((x) => x.startsWith("casse.html")), "garde : l'echantillon casse donne 4 liens morts, la page saine aucun (" + m.length + ")");
}
const DOCS = join(ROOT, "site/docs");
ok(existsSync(join(DOCS, "index.html")), "site/docs/index.html existe");
const morts = liens_morts(DOCS);
ok(morts.length === 0, "aucun lien, image, ancre ou lien vers le depot mort dans site/docs/" + (morts.length ? " : " + morts.slice(0, 5).join(" ; ") : ""));

// ---- garde : site/docs/ = rendu frais des .md suivis par git (emit oublie, page orpheline)
{
  const params = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
  const suivis = execFileSync("git", ["ls-files", "--", "*.md"], { cwd: ROOT }).toString().split("\n").filter(Boolean).filter(est_publie).filter((c) => existsSync(join(ROOT, c)));
  const frais = construit_docs(suivis.map((chemin) => ({ chemin, md: readFileSync(join(ROOT, chemin), "utf8") })), params.projet.depot_url);
  const disque = parcours(DOCS).map((f) => relative(DOCS, f)).sort(), attendu = Object.keys(frais).sort();
  ok(disque.join() === attendu.join(), "site/docs/ contient exactement une page par .md suivi + l'index (" + disque.length + " fichiers)");
  const perimes = attendu.filter((n) => existsSync(join(DOCS, n)) && readFileSync(join(DOCS, n), "utf8") !== frais[n]);
  ok(perimes.length === 0, "chaque page est a jour avec son .md" + (perimes.length ? " : relancer npm run emit (" + perimes.join(", ") + ")" : ""));
  ok(["abri.html", "abri-v2.html", "variantes.html", "readme.html"].every((n) => attendu.includes(n)), "abri, abri-v2, variantes et README ont leur page");
}

console.log(fails ? `\n${fails} echec(s) docs.` : "\nPages de documents OK ✓");
process.exit(fails ? 1 : 0);
