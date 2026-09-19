// Modele 2D de la forme retenue (option 13) : hauteurs, panneaux, rehausse, toit.
//   node tests/modele.mjs
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/compute-modele.mjs");
await esbuild.build({ entryPoints: ["site/src/compute.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { buildCore, poly_area, ranger_rehausse } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;
const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const core = buildCore(base), m = core.modele, v = core.variantes.find((x) => x.id === 13);
const H = base.murs.hauteur_cm, c = base.disposition_trapeze.toit.chute_cm;

ok(m && m.faces.map((f) => f.cle).join("") === "ADBG", "4 faces A D B G dans l'ordre du contour");
ok(Math.max(...m.hauteurs_coins_cm) === H + c && Math.min(...m.hauteurs_coins_cm) === H, "toit : avant a H + chute, point le plus au fond a H");
ok(m.faces.every((f, i) => near(f.hauteur_fin_cm, m.faces[(i + 1) % 4].hauteur_debut_cm)), "hauteurs continues d'une face a l'autre (toit plan)");
ok(m.pente.degres >= 5, "pente >= 5 degres (" + m.pente.degres + ")");
ok(m.faces.every((f) => near(f.panneaux.reduce((s, p) => s + p.largeur_cm, 0), f.longueur_cm, 0.2)), "les panneaux couvrent chaque face");
ok(m.faces.every((f) => f.panneaux.every((p) => p.largeur_cm <= base.panneau.largeur_utile_cm + 1e-9)), "aucun panneau plus large que la largeur utile");
ok(m.faces.find((f) => f.cle === "D").ouvertures.some((o) => o.type === "porte") && m.faces.find((f) => f.cle === "A").ouvertures.filter((o) => o.type === "fenetre").length === 2, "porte face D, 2 fenetres face A");
ok(m.rehausse.pieces.every((p) => near(p.h0, m.faces.find((f) => f.cle === p.face).hauteur_debut_cm - H, 0.11) && near(p.h1, m.faces.find((f) => f.cle === p.face).hauteur_fin_cm - H, 0.11)), "chaque piece de rehausse suit le toit a ses deux bouts");
ok(m.rehausse.barres.every((b) => b.L <= base.rehausse.longueur_stock_cm + 1e-9), "chaque madrier tient dans la longueur de stock");
ok(m.rehausse.barres.flatMap((b) => b.troncons.flatMap((t) => t.pieces)).length === m.rehausse.pieces.length, "toutes les pieces sont rangees une fois");
const sec = base.disposition_trapeze.rehausse_section_mm[1] / 10;
ok(m.rehausse.pieces.every((p) => Math.max(p.h0, p.h1) <= sec + 1e-9), "chaque piece tient dans la section du madrier");
// deux pieces qui ne tiennent pas ensemble restent separees ; deux coins complementaires partagent un troncon
ok(ranger_rehausse([{ id: "a", L: 100, h0: 20, h1: 20 }, { id: "b", L: 100, h0: 20, h1: 20 }], 30, 480)[0].troncons.length === 2, "rehausse : deux bandeaux trop hauts ne partagent pas un troncon");
ok(ranger_rehausse([{ id: "a", L: 300, h0: 0, h1: 30 }, { id: "b", L: 300, h0: 0, h1: 30 }], 30, 480)[0].troncons.length === 1, "rehausse : deux coins d'une coupe en biais partagent un troncon");
ok(near(m.toit.panneaux.reduce((s, p) => s + poly_area(p.polygone), 0) / 1e4, m.toit.aire_m2, 0.01), "les panneaux de toit couvrent tout le toit");
ok(m.toit.gouttiere.descente[1] === Math.max(m.toit.gouttiere.de[1], m.toit.gouttiere.a[1]), "descente au point bas de la gouttiere");
ok(["modele-sol", "modele-toit", "modele-rehausse", "modele-facade-A", "modele-facade-D", "modele-facade-B", "modele-facade-G"].every((k) => core.svg[k] && core.svg[k].startsWith("<svg")), "7 plans du modele generes");
ok(near(poly_area(m.interieur) / 1e4, v.aire_interieure_m2, 0.011), "plan de sol : interieur = aire interieure de l'option");

if (fails) { console.log(`\n${fails} echec(s)`); process.exit(1); }
console.log("\nModele 2D OK ✓");
