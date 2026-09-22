// CLI Node : oracle de parite + (futur) generation des artefacts statiques.
//   node scripts/build.mjs --json [params.json]   -> imprime buildCore en JSON
//   node scripts/build.mjs --emit [params.json]   -> ecrit site/assets/*.svg, params.js, derived.json
// Bundle via : npm run build:cli  (esbuild -> scripts/build.mjs)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCore, variantes_md, abri_md, DOSSIER_ETUDES } from "site/src/compute.ts";
import { construit_docs, est_publie, relativise } from "site/src/docs.ts";

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
  // un plan que le calcul ne produit plus ne survit pas (les sous-dossiers, eux, sont des archives)
  for (const f of readdirSync(join(SITE, "assets"))) if (f.endsWith(".svg") && !(f.slice(0, -4) in core.svg)) rmSync(join(SITE, "assets", f));
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
  // pages markdown generees : liens ecrits depuis la racine, rendus relatifs a leur dossier.
  // etudes/ garde aussi les etudes archivees (figees, suivies par git) : on n'y reecrit que variantes.md
  const ecrit_md = (chemin: string, md: string) => { mkdirSync(dirname(join(ROOT, chemin)), { recursive: true }); writeFileSync(join(ROOT, chemin), relativise(md, chemin)); };
  const VARIANTES = `${DOSSIER_ETUDES}/variantes.md`;
  ecrit_md(VARIANTES, variantes_md(p, core));
  ecrit_md("abri.md", abri_md(p, core));
  const generes = [VARIANTES, "abri.md"];
  emitDocs(p, generes);
  stamp();
  return core;
}

// site/docs/ : une page HTML par markdown SUIVI PAR GIT (plus ceux que ce run vient d'ecrire) + un index.
// git fait foi : un fichier ignore (CLAUDE.local.md, STATUS.md) ne peut pas etre publie par accident.
function emitDocs(p: any, generes: string[]) {
  // suivis + nouveaux non ignores : une page fraichement generee est publiee avant meme son premier commit
  const suivis = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"], { cwd: ROOT }).toString().split("\n").filter(Boolean);
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
  // index.html = l'abri retenu (abri.js) ; configurateur.html = l'etude initiale du rectangle (app.js)
  for (const [page, script, feuille] of [["index.html", "abri.js", "abri.css"], ["configurateur.html", "app.js", "style.css"]]) {
    const hash = createHash("sha256");
    for (const a of [feuille, script, "params.js"]) {
      try { hash.update(readFileSync(join(SITE, a))); } catch { /* bundle absent avant build */ }
    }
    const v = hash.digest("hex").slice(0, 8);
    const chemin = join(SITE, page);
    const html = readFileSync(chemin, "utf8").replace(/(href|src)="(style\.css|abri\.css|app\.js|abri\.js|params\.js)(?:\?v=[^"]*)?"/g, `$1="$2?v=${v}"`);
    writeFileSync(chemin, html);
  }
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
