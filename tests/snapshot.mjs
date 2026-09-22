// Tests "golden snapshot" : buildCore(params.json) doit produire exactement la sortie figee dans
// tests/snapshots/abri.json (formes de la dalle, modele, scene 3D, planches, plans SVG).
// Regenerer apres un changement VOULU :  npm run snapshot:update, puis relire le diff.
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
await esbuild.build({
  entryPoints: ["site/src/cli.ts"],
  bundle: true, format: "esm", platform: "node",
  outfile: "scripts/build.mjs", logLevel: "warning",
});

const SNAP = join(ROOT, "tests/snapshots");
mkdirSync(SNAP, { recursive: true });
const UPDATE = process.env.UPDATE === "1";

let fails = 0;
const core = JSON.parse(execFileSync("node", ["scripts/build.mjs", "--json", join(ROOT, "params.json")], { maxBuffer: 64 << 20 }).toString());
const got = JSON.stringify(core, null, 1);
const snapFile = join(SNAP, "abri.json"), n = Object.keys(core.svg).length;

if (UPDATE) { writeFileSync(snapFile, got + "\n"); console.log("↻ snapshot écrit : abri"); process.exit(0); }
if (!existsSync(snapFile)) { console.log("✗ snapshot manquant : abri (npm run snapshot:update)"); process.exit(1); }

const want = readFileSync(snapFile, "utf8").replace(/\n$/, "");
if (want === got) console.log(`✓ abri : conforme (données + ${n} SVG)`);
else {
  fails++;
  let i = 0; while (i < want.length && i < got.length && want[i] === got[i]) i++;
  console.log(`✗ abri : 1re diff @${i}`);
  console.log(`   GOLD …${JSON.stringify(want.slice(Math.max(0, i - 40), i + 40))}`);
  console.log(`   GOT  …${JSON.stringify(got.slice(Math.max(0, i - 40), i + 40))}`);
}

console.log(fails ? `\n${fails} écart(s). (npm run snapshot:update si le changement est voulu.)` : "\nSnapshot conforme ✓");
process.exit(fails ? 1 : 0);
