// Test de parite : pour plusieurs jeux de parametres, verifie que le coeur TS
// produit EXACTEMENT la meme sortie que l'oracle Python (scripts/generate.py --json).
//   node tests/parity.mjs
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const TMP = join(tmpdir(), "shed-parity");
mkdirSync(TMP, { recursive: true });

// 1) bundle du CLI TS -> scripts/build.mjs
await esbuild.build({
  entryPoints: ["site/src/cli.ts"],
  bundle: true, format: "esm", platform: "node",
  outfile: "scripts/build.mjs", logLevel: "warning",
});

const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));

// 2) jeux de tests (variations qui stressent geometrie, ouvertures, SVG, budget)
const cases = [];
cases.push({ name: "defaut", params: clone(base) });

{
  const p = clone(base);
  p.emprise_cm = { gauche_G: 300, avant_A: 260, droite_D_jusqu_coupe: 180, arriere_B_jusqu_coupe: 150 };
  p.murs.hauteur_avant_cm = 250;
  p.toit.pente_chute_cm = 32;
  p.panneau.epaisseur_mm = 80;
  p.toit.debord_cm = { avant: 20, arriere: 25, gauche: 10, droite: 30, coupe: 12 };
  p.ouvertures[0].position = "gauche";
  p.ouvertures[1].position = "droite";
  p.ouvertures[1].allege_cm = 95;
  p.ouvertures.push({ id: "fen-C", type: "fenetre", face: "C", largeur_cm: 60, hauteur_cm: 60, allege_cm: 100, position: "centre" });
  p.prix_indicatifs_eur.panneau_mur_m2 = 49;
  p.prix_indicatifs_eur.incertitude_pct = 20;
  cases.push({ name: "grand+ouvertures", params: p });
}
{
  const p = clone(base);
  p.ouvertures = [];
  cases.push({ name: "sans-ouverture", params: p });
}
{
  const p = clone(base);
  p.ouvertures[0].position = "centre";
  p.panneau.largeur_utile_cm = 115;
  p.toit.pente_chute_cm = 18;
  cases.push({ name: "porte-centree+cover115", params: p });
}

// 3) comparaison
const NUM_KEYS = ["geometrie", "debit", "budget", "ouvertures", "model3d"];
function diffs(a, b, path, out) {
  if (a === b) return;
  if (typeof a === "number" && typeof b === "number") {
    if (a !== b) out.push(`${path}: PY=${a} TS=${b}`);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { out.push(`${path}: longueur PY=${a.length} TS=${b.length}`); return; }
    for (let i = 0; i < a.length; i++) diffs(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diffs(a[k], b[k], `${path}.${k}`, out);
    return;
  }
  if (a !== b) out.push(`${path}: PY=${JSON.stringify(a)} TS=${JSON.stringify(b)}`);
}

let failed = 0;
for (const c of cases) {
  const pf = join(TMP, `params_${c.name}.json`);
  writeFileSync(pf, JSON.stringify(c.params));
  const py = JSON.parse(execFileSync("python3", ["scripts/generate.py", "--json", pf]).toString());
  const ts = JSON.parse(execFileSync("node", ["scripts/build.mjs", "--json", pf]).toString());

  const out = [];
  for (const k of NUM_KEYS) diffs(py[k], ts[k], k, out);
  // SVG : egalite exacte des chaines
  for (const name of Object.keys(py.svg)) {
    if (py.svg[name] !== ts.svg[name]) {
      // localiser la 1re difference
      const A = py.svg[name], B = ts.svg[name];
      let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
      out.push(`svg.${name}: 1re diff @${i}\n   PY …${JSON.stringify(A.slice(Math.max(0, i - 30), i + 30))}\n   TS …${JSON.stringify(B.slice(Math.max(0, i - 30), i + 30))}`);
    }
  }

  if (out.length) {
    failed++;
    console.log(`\n✗ ${c.name} : ${out.length} difference(s)`);
    out.slice(0, 12).forEach((d) => console.log("   " + d));
  } else {
    console.log(`✓ ${c.name} : parite exacte (data + ${Object.keys(py.svg).length} SVG)`);
  }
}

console.log(failed ? `\n${failed} cas en echec.` : `\nTous les cas: parite TS == Python ✓`);
process.exit(failed ? 1 : 0);
