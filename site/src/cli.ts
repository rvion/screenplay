// CLI Node : oracle de parite + (futur) generation des artefacts statiques.
//   node scripts/build.mjs --json [params.json]   -> imprime buildCore en JSON
//   node scripts/build.mjs --emit [params.json]   -> ecrit site/assets/*.svg, params.js, derived.json
// Bundle via : npm run build:cli  (esbuild -> scripts/build.mjs)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCore, variantes_md, abri_md, params_v2, versions_abri, nom_page, version_principale } from "./compute";
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
  // abri_principal : cette version-la devient abri.md ; la premiere forme retenue passe dans abri-v1.md
  const principale = version_principale(p);
  const autres = principale ? `Autres versions : ${[1, ...versions_abri(p).map((x) => x.n)].filter((n) => n !== principale).map((n) => `[version ${n}](${nom_page(n, principale)})`).join(", ")}. ` : "";
  writeFileSync(join(ROOT, nom_page(1, principale)), abri_md(p, core, principale ? { titre: "Abri de jardin : le bureau trapèze, version 1 (première forme retenue)", autres: `L'abri retenu aujourd'hui est dans [abri.md](abri.md). ` } : {}));
  // variantes proposees (blocs abri_v2, abri_v3...) : memes plans sous modele-vN-, et une page comparee chacune
  const generes = ["variantes.md", "abri.md", nom_page(1, principale)];
  const cores: Record<number, any> = { 1: core };
  for (const { n, cle } of versions_abri(p)) {
    const pn = params_v2(p, cle)!, coren = buildCore(pn), bloc = p[cle], prefixe = `modele-v${n}-`;
    cores[n] = coren;
    // compare_a : version a laquelle la page se compare (1 par defaut), deja calculee car les numeros montent
    const depuis = cores[+bloc.compare_a] ? +bloc.compare_a : 1;
    for (const [name, content] of Object.entries(coren.svg)) {
      if (name.startsWith("modele-")) writeFileSync(join(SITE, "assets", name.replace("modele-", prefixe) + ".svg"), content as string);
    }
    const est_principale = n === principale;
    writeFileSync(join(ROOT, nom_page(n, principale)), abri_md(pn, coren, { prefixe, version: n, titre: est_principale ? bloc.titre_principal || bloc.titre : bloc.titre, atouts: bloc.atouts, pertes: bloc.pertes, notes: bloc.notes, hors_modele: bloc.hors_modele, base: cores[depuis], depuis, principale, en_fin: est_principale, autres: est_principale ? autres : "" }));
    generes.push(nom_page(n, principale));
    // l'ancienne adresse de la version devenue principale reste valide : une page relais
    if (est_principale) { writeFileSync(join(ROOT, `abri-v${n}.md`), `# La version ${n} est devenue l'abri retenu\n\nSes plans, son débit, son budget et ses raisons sont dans **[abri.md](abri.md)**. La page d'accueil du site montre le même abri en 3D.\n`); generes.push(`abri-v${n}.md`); }
  }
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
  for (const [page, script] of [["index.html", "abri.js"], ["configurateur.html", "app.js"]]) {
    const hash = createHash("sha256");
    for (const a of ["style.css", script, "params.js"]) {
      try { hash.update(readFileSync(join(SITE, a))); } catch { /* bundle absent avant build */ }
    }
    const v = hash.digest("hex").slice(0, 8);
    const chemin = join(SITE, page);
    const html = readFileSync(chemin, "utf8").replace(/(href|src)="(style\.css|app\.js|abri\.js|params\.js)(?:\?v=[^"]*)?"/g, `$1="$2?v=${v}"`);
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
