// CLI Node : oracle de parite + (futur) generation des artefacts statiques.
//   node scripts/build.mjs --json [params.json]   -> imprime buildCore en JSON
//   node scripts/build.mjs --emit [params.json]   -> ecrit site/assets/*.svg, params.js, derived.json
// Bundle via : npm run build:cli  (esbuild -> scripts/build.mjs)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCore, variantes_md, abri_md, params_v2, versions_abri } from "./compute";
import { construit_docs, est_publie } from "./docs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");

function loadParams(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function emit(p: any) {
  const core = buildCore(p);
  mkdirSync(join(SITE, "assets"), { recursive: true });
  mkdirSync(join(SITE, "data"), { recursive: true });
  for (const [name, content] of Object.entries(core.svg)) {
    writeFileSync(join(SITE, "assets", name + ".svg"), content as string);
  }
  const derived = {
    projet: p.projet,
    geometrie: core.geometrie, debit: core.debit, achats: core.achats, budget: core.budget,
    ouvertures: core.ouvertures, panneau: p.panneau, model3d: core.model3d,
    svg: Object.keys(core.svg).map((n) => n + ".svg"),
  };
  writeFileSync(join(SITE, "data", "derived.json"), JSON.stringify(derived, null, 2));
  writeFileSync(join(SITE, "params.js"),
    "// Genere par scripts/build.mjs - parametres par defaut pour l'app.\nwindow.SHED_PARAMS = " +
    JSON.stringify(p, null, 2) + ";\n");
  writeFileSync(join(ROOT, "variantes.md"), variantes_md(p, core));
  writeFileSync(join(ROOT, "abri.md"), abri_md(p, core));
  // variantes proposees (blocs abri_v2, abri_v3...) : memes plans sous modele-vN-, et une page comparee chacune
  const generes = ["variantes.md", "abri.md"];
  for (const { n, cle } of versions_abri(p)) {
    const pn = params_v2(p, cle)!, coren = buildCore(pn), bloc = p[cle], prefixe = `modele-v${n}-`;
    for (const [name, content] of Object.entries(coren.svg)) {
      if (name.startsWith("modele-")) writeFileSync(join(SITE, "assets", name.replace("modele-", prefixe) + ".svg"), content as string);
    }
    writeFileSync(join(ROOT, `abri-v${n}.md`), abri_md(pn, coren, { prefixe, version: n, titre: bloc.titre, atouts: bloc.atouts, pertes: bloc.pertes, notes: bloc.notes, hors_modele: bloc.hors_modele, base: core }));
    generes.push(`abri-v${n}.md`);
  }
  emitDocs(p, generes);
  stamp();
  return core;
}

// site/docs/ : une page HTML par markdown SUIVI PAR GIT (plus ceux que ce run vient d'ecrire) + un index.
// git fait foi : un fichier ignore (CLAUDE.local.md, STATUS.md) ne peut pas etre publie par accident.
function emitDocs(p: any, generes: string[]) {
  const suivis = execFileSync("git", ["ls-files", "--", "*.md"], { cwd: ROOT }).toString().split("\n").filter(Boolean);
  const chemins = [...new Set([...suivis, ...generes])].filter(est_publie).filter((c) => existsSync(join(ROOT, c)));
  const pages = construit_docs(chemins.map((chemin) => ({ chemin, md: readFileSync(join(ROOT, chemin), "utf8") })), p.projet.depot_url);
  const dir = join(SITE, "docs");
  rmSync(dir, { recursive: true, force: true });                   // une page dont le .md a disparu ne survit pas
  for (const [nom, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(dir, nom)), { recursive: true });
    writeFileSync(join(dir, nom), html);
  }
}

// Cache-bust : reecrit ?v=<hash> sur style.css / app.js / params.js dans index.html.
function stamp() {
  const idx = join(SITE, "index.html");
  const assets = ["style.css", "app.js", "params.js"];
  const hash = createHash("sha256");
  for (const a of assets) {
    try { hash.update(readFileSync(join(SITE, a))); } catch { /* app.js absent avant build */ }
  }
  const v = hash.digest("hex").slice(0, 8);
  let html = readFileSync(idx, "utf8");
  html = html.replace(/(href|src)="(style\.css|app\.js|params\.js)(?:\?v=[^"]*)?"/g, `$1="$2?v=${v}"`);
  writeFileSync(idx, html);
}

const args = process.argv.slice(2);
const idxJson = args.indexOf("--json");
const idxEmit = args.indexOf("--emit");
if (idxJson >= 0) {
  const path = args[idxJson + 1] || join(ROOT, "params.json");
  process.stdout.write(JSON.stringify(buildCore(loadParams(path))));
} else if (idxEmit >= 0) {
  const path = args[idxEmit + 1] || join(ROOT, "params.json");
  emit(loadParams(path));
  process.stderr.write("emit OK\n");
} else {
  process.stderr.write("usage: --json [params] | --emit [params]\n");
  process.exit(1);
}
