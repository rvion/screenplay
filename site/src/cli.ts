// CLI Node : oracle de parite + (futur) generation des artefacts statiques.
//   node scripts/build.mjs --json [params.json]   -> imprime buildCore en JSON
//   node scripts/build.mjs --emit [params.json]   -> ecrit site/assets/*.svg, params.js, derived.json
// Bundle via : npm run build:cli  (esbuild -> scripts/build.mjs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCore, variantes_md, abri_md, params_v2 } from "./compute";

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
  // variante proposee (bloc abri_v2) : memes plans, prefixes modele-v2-, et une page comparee
  const p2 = params_v2(p);
  if (p2) {
    const core2 = buildCore(p2);
    for (const [name, content] of Object.entries(core2.svg)) {
      if (name.startsWith("modele-")) writeFileSync(join(SITE, "assets", name.replace("modele-", "modele-v2-") + ".svg"), content as string);
    }
    writeFileSync(join(ROOT, "abri-v2.md"), abri_md(p2, core2, { prefixe: "modele-v2-", titre: p.abri_v2.titre, pertes: p.abri_v2.pertes, notes: p.abri_v2.notes, hors_modele: p.abri_v2.hors_modele, base: core }));
  }
  stamp();
  return core;
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
