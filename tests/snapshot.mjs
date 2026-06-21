// Tests "golden snapshot" : le coeur TS (buildCore) doit produire exactement la
// sortie figee dans tests/snapshots/*.json (donnees + 7 SVG). Remplace l'ancien
// oracle Python. Regenerer apres un changement VOULU :  UPDATE=1 node tests/snapshot.mjs
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeCases } from "./cases.mjs";

const ROOT = process.cwd();
await esbuild.build({
  entryPoints: ["site/src/cli.ts"],
  bundle: true, format: "esm", platform: "node",
  outfile: "scripts/build.mjs", logLevel: "warning",
});

const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const cases = makeCases(base);
const SNAP = join(ROOT, "tests/snapshots");
mkdirSync(SNAP, { recursive: true });
const TMP = join(tmpdir(), "shed-snap");
mkdirSync(TMP, { recursive: true });
const UPDATE = process.env.UPDATE === "1";

let fails = 0;
for (const c of cases) {
  const pf = join(TMP, `p_${c.name}.json`);
  writeFileSync(pf, JSON.stringify(c.params));
  const core = JSON.parse(execFileSync("node", ["scripts/build.mjs", "--json", pf]).toString());
  const got = JSON.stringify(core, null, 1);
  const snapFile = join(SNAP, c.name + ".json");

  if (UPDATE) { writeFileSync(snapFile, got + "\n"); console.log("↻ snapshot écrit :", c.name); continue; }
  if (!existsSync(snapFile)) { console.log("✗ snapshot manquant :", c.name, "(lancer UPDATE=1)"); fails++; continue; }

  const want = readFileSync(snapFile, "utf8").replace(/\n$/, "");
  if (want === got) { console.log(`✓ ${c.name} : conforme (data + 7 SVG)`); continue; }
  fails++;
  let i = 0; while (i < want.length && i < got.length && want[i] === got[i]) i++;
  console.log(`✗ ${c.name} : 1re diff @${i}`);
  console.log(`   GOLD …${JSON.stringify(want.slice(Math.max(0, i - 40), i + 40))}`);
  console.log(`   GOT  …${JSON.stringify(got.slice(Math.max(0, i - 40), i + 40))}`);
}

console.log(fails ? `\n${fails} écart(s). (UPDATE=1 pour régénérer si le changement est voulu.)` : "\nSnapshots conformes ✓");
process.exit(fails ? 1 : 0);
