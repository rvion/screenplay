// Formalites (Code de l'urbanisme R*420-1, R421-2, R421-9) : les debords de toiture n'entrent PAS
// dans l'emprise au sol tant qu'aucun poteau ne les porte. Garde : on lui donne la forme interdite
// (compter les debords) et elle doit basculer, puis les cas legitimes et elle doit tenir.
//   node tests/formalites.mjs
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/compute-formalites.mjs");
await esbuild.build({ entryPoints: ["site/src/compute.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { formalites, buildCore } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const P = (over = {}) => ({ ...base, reglementaire: { ...base.reglementaire, ...over } });

// le cas qui piege : murs sous le seuil, debords au-dessus. Un toit sans poteau ne change rien.
const limite = formalites(P(), 4.9, 5.8, 4.3);
ok(limite.emprise_au_sol_m2 === 4.9 && limite.formalite === "aucune", "murs 4,9 m² et debords 5,8 : emprise = 4,9, aucune formalite");
// la forme interdite : compter les debords ferait basculer en declaration prealable
const faux = formalites(P({ debords_sur_poteaux: true }), 4.9, 5.8, 4.3);
ok(faux.emprise_au_sol_m2 === 5.8 && faux.formalite === "declaration prealable", "debords PORTES PAR DES POTEAUX : ils comptent, et la DP tombe");
// les lookalikes legitimes : les seuils eux-memes, et la surface de plancher qui peut trancher seule
ok(formalites(P(), 5, 5.6, 4.4).formalite === "aucune", "5 m² pile : encore dispense (seuil inclusif)");
ok(formalites(P(), 5.01, 5.6, 4.4).formalite === "declaration prealable", "5,01 m² : declaration prealable");
ok(formalites(P(), 21, 25, 19).formalite === "permis de construire", "21 m² d'emprise : permis de construire");
// why we think it is actually a bug, and not just meaning spec should change: R*420-1 has no rounding, so a wall footprint of 5,0001 m² is over 5 m², and the page must not tell the owner "aucune formalité"
{
  const juste = { ...base, disposition_trapeze: { ...base.disposition_trapeze, cotes_cm: { avant: 210, droite: 180, gauche: 250, fond: 138.6 } } };
  const f = buildCore(juste).modele.formalites;
  ok(f.formalite === "declaration prealable", `murs 210 × 250, pan de 100 : 5,0001 m², au-dessus du seuil, declaration prealable (${f.emprise_au_sol_m2} m², ${f.formalite})`);
  // controle : 1 cm de moins sur la gauche et la droite, 4,99 m², reste dispense
  const sous = { ...base, disposition_trapeze: { ...base.disposition_trapeze, cotes_cm: { avant: 210, droite: 179, gauche: 249, fond: 138.6 } } };
  ok(buildCore(sous).modele.formalites.formalite === "aucune", "murs 210 × 249 : sous le seuil, aucune formalite");
}
ok(formalites(P(), 4.5, 5, 5.4).formalite === "declaration prealable", "murs sous le seuil mais 5,4 m² de plancher : DP (les deux comptent)");
ok(formalites(P(), 4, 5, 3).libelle === "aucune formalité" && formalites(P(), 6, 7, 5).libelle === "déclaration préalable", "libelle accentue pour l'affichage, cle simple pour le code");
ok(/R\*420-1/.test(formalites(P(), 4, 5, 3).reference), "la reference legale voyage avec le calcul");

// l'abri reel : emprise = murs, et le toit ne l'aggrave pas
const core = buildCore(base), F = core.modele.formalites, v = core.variantes.find((x) => x.id === 13);
ok(F.emprise_au_sol_m2 === v.aire_m2, "abri : emprise au sol = emprise des murs");
ok(F.emprise_debords_inclus_m2 > F.emprise_au_sol_m2, "le chiffre debords inclus reste calcule, mais ne sert pas au seuil");

if (fails) { console.log(`\n${fails} echec(s)`); process.exit(1); }
console.log("\nFormalites OK ✓");
