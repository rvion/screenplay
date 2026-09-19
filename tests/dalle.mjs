// Geometrie de la dalle : la pointe arriere trouvee par triangulation doit redonner
// les longueurs relevees au metre, et la partie hors dalle doit suivre la position de l'abri.
//   node tests/dalle.mjs
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = process.cwd();
mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/compute.mjs");
await esbuild.build({ entryPoints: ["site/src/compute.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { geometry, slab_apex, clip_convex, poly_area } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;
const clone = (o) => JSON.parse(JSON.stringify(o));
const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// triangle 3-4-5 : L=(0,0), R=(5,0), pointe a 3 de L et 4 de R -> (1.8, 2.4)
const t = slab_apex([0, 0], [5, 0], 3, 4);
ok(t && near(t[0], 1.8, 1e-9) && near(t[1], 2.4, 1e-9), "triangulation 3-4-5 -> (1.8, 2.4)");
ok(slab_apex([0, 0], [5, 0], 1, 2) === null, "pans trop courts pour fermer -> pas de pointe");
ok(slab_apex([0, 0], [5, 0], 1, 9) === null, "pans incompatibles (|ag - ad| > d) -> pas de pointe");

// angles de la dalle relevee : avant droits, somme d'un pentagone, plan dessine
{
  const gd = geometry(base).dalle;
  ok(gd.angles_deg.length === 5 && near(gd.angles_deg[0], 90) && near(gd.angles_deg[1], 90), "angles avant droits");
  ok(near(gd.angles_deg.reduce((s, x) => s + x, 0), 540, 0.3), "somme des angles du pentagone = 540");
}

// decoupage : carre 10x10 coupe par un rectangle qui en couvre la moitie
ok(near(poly_area(clip_convex([[0, 0], [10, 0], [10, 10], [0, 10]], [[5, -1], [20, -1], [20, 20], [5, 20]])), 50, 1e-9), "decoupage : moitie du carre = 50");

// releve reel
const g = geometry(base).dalle;
const d = base.dalle_cm, [ox, oy] = g.decalage_cm;
const P = g.polygone.map(([x, y]) => [x + ox, y + oy]);   // retour au repere de la dalle
ok(P.length === 5, "dalle = pentagone");
ok(near(dist(P[3], P[4]), d.arriere_gauche, 0.15), "pan arriere gauche = " + d.arriere_gauche + " (" + dist(P[3], P[4]).toFixed(1) + ")");
ok(near(dist(P[2], P[3]), d.arriere_droite, 0.15), "pan arriere droit = " + d.arriere_droite + " (" + dist(P[2], P[3]).toFixed(1) + ")");
ok(near(g.pointe_cm[0], 72.7, 0.2) && near(g.pointe_cm[1], 398.3, 0.2), "pointe ~ (72.7 ; 398.3) : " + g.pointe_cm);
ok(g.pointe_cm[1] > d.gauche, "la pointe est derriere le haut du cote gauche");
ok(g.hors_dalle === false && g.hors_dalle_m2 === 0, "abri par defaut entierement sur la dalle");
ok(g.decalage_cm[0] === 2, "l'abri longe le mur gauche (2 cm)");

// murs de propriete et passage arriere
ok(g.murs.map((w) => w.cote).join() === "arriere_droite,arriere_gauche,gauche", "3 murs : gauche + les deux pans arriere");
ok(g.passage.cote === "arriere_droite", "la pince est sur le grand pan (258)");
// a la main : mur a x=202 -> y = 223 + 60 * 175.3/189.3 = 278.6 ; ecart vertical 36.6 ; x cos = 189.3/258 -> 26.8
ok(near(g.passage.cm, 26.8, 0.3), "passage = 26.8 cm pour 200 x 240 (" + g.passage.cm + ")");
ok(g.passage.etat === "impraticable", "26.8 cm : impraticable");
{
  const p = clone(base); p.emprise_cm.gauche_G = g.passage.profondeur_max_cm;
  const h = geometry(p).dalle;
  ok(h.passage.cm >= base.dalle_cm.passage_souhaite_cm - 0.01 && h.passage.cm < base.dalle_cm.passage_souhaite_cm + 1, "a la profondeur max (" + g.passage.profondeur_max_cm + "), le passage vaut le souhait (" + h.passage.cm + ")");
}
{
  const p = clone(base); p.emprise_cm.gauche_G = 200;
  ok(geometry(p).dalle.passage.etat === "praticable", "200 x 200 : passage praticable (" + geometry(p).dalle.passage.cm + " cm)");
}
ok(g.toit_touche_mur === false && g.degagement_toit_min_cm > 0, "toit + gouttiere ne touchent aucun mur (" + g.degagement_toit_min_cm + " cm)");

// abri cale a droite : le coin arriere-droit sort sous le grand pan
{
  const p = clone(base); p.dalle_cm.decalage_cm.x = d.avant - p.emprise_cm.avant_A;
  const h = geometry(p).dalle;
  ok(h.hors_dalle && h.hors_dalle_m2 > 0 && h.hors_dalle_polygones.length === 1, "cale a droite : 1 zone hors dalle (" + h.hors_dalle_m2 + " m²)");
  ok(near(h.marges_cm.arriere_droite, -19, 0.1), "coin arriere-droit 19 cm au-dela du bord (" + h.marges_cm.arriere_droite + ")");
  ok(h.hors_dalle_contre_mur === true && h.passage.cm < 0, "ce debord traverse un mur : completer la dalle est impossible");
}
// abri pousse hors de la dalle par l'avant : compte aussi (pas seulement l'arriere)
{
  const p = clone(base); p.dalle_cm.decalage_cm.y = -10;
  const h = geometry(p).dalle;
  ok(near(h.hors_dalle_m2, 0.2, 1e-9), "10 cm devant la dalle sur 200 de large = 0.2 m² (" + h.hors_dalle_m2 + ")");
}
// longueurs qui ne ferment pas : quadrilatere, jamais une erreur
{
  const p = clone(base); p.dalle_cm.arriere_gauche = 10; p.dalle_cm.arriere_droite = 10;
  const h = geometry(p).dalle;
  ok(h.polygone.length === 4 && h.pointe_cm === null, "pans trop courts : dalle en quadrilatere");
}

console.log(fails ? `\n${fails} echec(s) dalle.` : "\nGeometrie de la dalle OK ✓");
process.exit(fails ? 1 : 0);
