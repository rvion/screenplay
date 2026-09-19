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

// sieges : chacun touche son bureau, reste dans l'interieur, ne chevauche ni bureau ni autre siege
{
  const { clip_convex, inset_ordre } = await import(pathToFileURL(out).href);
  const ep = base.panneau.epaisseur_mm / 10, I = inset_ordre(v.polygone, ep);
  const dedans = (z) => I.every((a, i) => { const b = I[(i + 1) % I.length]; return (b[0] - a[0]) * (z[1] - a[1]) - (b[1] - a[1]) * (z[0] - a[0]) >= -0.2 * Math.hypot(b[0] - a[0], b[1] - a[1]); });
  ok(v.sieges.length === base.disposition_trapeze.sieges.length && v.sieges.every((s) => s.tient), "tous les sieges trouvent leur place");
  ok(v.sieges.every((s) => s.polygone.every(dedans)), "sieges dans l'interieur");
  ok(v.sieges.every((s) => v.bureaux.every((b) => poly_area(clip_convex(s.polygone, b.polygone)) < 2)), "aucun siege sur un bureau");
  ok(poly_area(clip_convex(v.sieges[0].polygone, v.sieges[1].polygone)) < 1, "les sieges ne se chevauchent pas");
  ok(v.sieges.every((s) => { const b = v.bureaux.find((x) => x.cote === s.contre); return s.polygone.slice(0, 2).every((z) => b.polygone.some((w, i) => { const u = b.polygone[(i + 1) % b.polygone.length], L = Math.hypot(u[0] - w[0], u[1] - w[1]); return Math.abs((u[0] - w[0]) * (z[1] - w[1]) - (u[1] - w[1]) * (z[0] - w[0])) / L < 0.3; })); }), "chaque siege touche le bord de son bureau");
  ok(core.svg["modele-sol"].includes("fauteuil de bureau") && core.svg["modele-sol"].includes("tab."), "plan de sol : fauteuil et tabouret dessines");
}

// lit pliant : dans l'interieur, hors des bureaux et de l'acces a la porte
{
  const { clip_convex, inset_ordre } = await import(pathToFileURL(out).href);
  const lp = v.lit_pliant, I = inset_ordre(v.polygone, base.panneau.epaisseur_mm / 10);
  const dedans = (z) => I.every((a, i) => { const b = I[(i + 1) % I.length]; return (b[0] - a[0]) * (z[1] - a[1]) - (b[1] - a[1]) * (z[0] - a[0]) >= -0.2 * Math.hypot(b[0] - a[0], b[1] - a[1]); });
  ok(lp && lp.tient && lp.polygone.every(dedans), "lit pliant dans l'interieur");
  ok(lp.largeur_cm >= 75 && lp.longueur_cm >= 190, "lit d'au moins 75 x 190");
  ok(base.disposition_trapeze.lit_pliant.sous_bureau || v.bureaux.every((b) => poly_area(clip_convex(lp.polygone, b.polygone)) < 2), "lit pliant hors des bureaux, sauf sous_bureau");
  // controle : un lit court tient sur le sol libre, sans passer sous un bureau
  const court = JSON.parse(JSON.stringify(base)); court.disposition_trapeze.lit_pliant = { largeur_cm: 65, longueur_cm: 150, acces_porte_cm: 60, sous_bureau: true };
  const lc = buildCore(court).variantes.find((x) => x.id === 13).lit_pliant;
  ok(lc.tient && lc.sous_bureau_cm2 === 0, "lit de 150 : sur le sol libre, rien sous les bureaux");
  const sans = JSON.parse(JSON.stringify(base)); sans.disposition_trapeze.lit_pliant = { largeur_cm: 65, longueur_cm: 180, acces_porte_cm: 60, sous_bureau: false };
  ok(!buildCore(sans).variantes.find((x) => x.id === 13).lit_pliant.tient, "lit de 65 x 180 sans passer sous un bureau : ne tient pas (signale)");
  // rabattable contre le fond (55 x 170, 50 cm devant la porte) : long bord sur la face interieure du mur,
  // replie a plat, 2 fixations ; un 75 x 190 n'y tient pas sans supprimer l'acces a la porte
  const cf = JSON.parse(JSON.stringify(base));
  cf.disposition_trapeze.lit_pliant = { largeur_cm: 55, longueur_cm: 170, contre: "fond", epaisseur_replie_cm: 10, acces_porte_cm: 50, sous_bureau: true };
  const lpf = buildCore(cf).variantes.find((x) => x.id === 13).lit_pliant;
  cf.disposition_trapeze.lit_pliant = { ...cf.disposition_trapeze.lit_pliant, largeur_cm: 75, longueur_cm: 190, acces_porte_cm: 20 };
  ok(!buildCore(cf).variantes.find((x) => x.id === 13).lit_pliant.tient, "75 x 190 en couchette contre le fond : ne tient pas avec 20 cm devant la porte");
  const ep = base.panneau.epaisseur_mm / 10, f = m.faces.find((x) => x.cle === "B"), LB = f.longueur_cm;
  const dmur = (z) => Math.abs((f.a[0] - f.de[0]) * (z[1] - f.de[1]) - (f.a[1] - f.de[1]) * (z[0] - f.de[0])) / LB;
  ok(lpf.contre.startsWith("fond") && near(dmur(lpf.polygone[0]), ep, 0.2) && near(dmur(lpf.polygone[1]), ep, 0.2), "lit rabattable plaque contre la face interieure du mur du fond");
  ok(near(dmur(lpf.replie[2]), ep + lpf.epaisseur_replie_cm, 0.2) && lpf.fixations.length === 2 && lpf.fixations.every((z) => near(dmur(z), ep, 0.2)), "replie a plat sur son epaisseur, 2 fixations sur le mur du fond");
  ok(!m.faces.find((x) => x.cle === "A").ouvertures.some((o) => o.type === "lit"), "rien du lit sur la facade");
  const L = [0, 1, 2].map((i) => Math.hypot(lp.polygone[i + 1][0] - lp.polygone[i][0], lp.polygone[i + 1][1] - lp.polygone[i][1]));
  ok(near(L[0], lp.longueur_cm, 0.2) && near(L[1], lp.largeur_cm, 0.2), "lit pliant aux bonnes dimensions");
  ok(core.svg["modele-sol"].includes("lit pliant"), "plan de sol : lit pliant dessine");
}

// why we think it is actually a bug, and not just meaning spec should change: acces_porte_cm is a
// depth in cm, 0 means no access zone; it was read with `|| 60`, so 0 silently became 60 cm
{
  const z = JSON.parse(JSON.stringify(base));
  z.disposition_trapeze.lit_pliant = { largeur_cm: 60, longueur_cm: 180, acces_porte_cm: 0, sous_bureau: true, contre: "fond" };
  ok(buildCore(z).variantes.find((x) => x.id === 13).lit_pliant.tient, "acces_porte_cm = 0 : aucune zone devant la porte, le lit 60 x 180 tient");
  z.disposition_trapeze.lit_pliant.acces_porte_cm = 20;
  ok(buildCore(z).variantes.find((x) => x.id === 13).lit_pliant.tient, "controle : avec 20 cm devant la porte, il tient deja");
}

const { abri_md } = await import(pathToFileURL(out).href);
const page = abri_md(base, core);
ok(["modele-sol", "modele-toit", "modele-rehausse", "modele-facade-A", "modele-facade-D", "modele-facade-B", "modele-facade-G"].every((k) => page.includes(`site/assets/${k}.svg`)), "abri.md inclut les 7 plans");
ok(page.indexOf("modele-implantation.svg") < page.indexOf("## En bref") && core.svg["modele-implantation"].includes("262"), "abri.md s'ouvre sur la dalle (implantation, cotes de la dalle)");
ok(["## Débit", "## Ouvertures", "## Aménagement", "## Budget indicatif", "## À trancher"].every((h) => page.includes(h)) && !page.includes("NE TIENT PAS"), "abri.md complet, et tout y tient");
// debit murs : chaque bande prise dans une chute tient dans ce qu'il reste des panneaux recoupes
{
  const toutes = m.faces.flatMap((f) => f.panneaux), neufs = toutes.filter((x) => x.source === "neuf");
  ok(neufs.length === m.panneaux_mur_a_commander, "panneaux a commander = bandes tirees d'un panneau neuf");
  const reste = neufs.reduce((s, x) => s + base.panneau.largeur_utile_cm - x.largeur_cm, 0), pris = toutes.filter((x) => x.source === "chute").reduce((s, x) => s + x.largeur_cm, 0);
  ok(pris <= reste + 1e-6, "les bandes tirees des chutes ne depassent pas les chutes disponibles");
  ok(m.budget.total_eur > 0 && near(m.budget.total_eur, m.budget.lignes.reduce((s, l) => s + l.montant_eur, 0), 1), "budget : total = somme des lignes");
}

if (fails) { console.log(`\n${fails} echec(s)`); process.exit(1); }
console.log("\nModele 2D OK ✓");
