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

// zone utile : chaque cote de la zone est a sa bande du cote de dalle correspondant
{
  const gd = geometry(base).dalle, z = gd.zone_utile;
  const L = gd.polygone.map(([x, y]) => [x + gd.decalage_cm[0], y + gd.decalage_cm[1]]);
  const dline = (p, a, b) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / dist(a, b);
  ok(z.polygone.length === 5, "zone utile : 5 cotes");
  ok(z.bandes_cm.every((w, i) => near(dline(z.polygone[i], L[i], L[(i + 1) % 5]), w, 0.1) && near(dline(z.polygone[(i + 1) % 5], L[i], L[(i + 1) % 5]), w, 0.1)), "zone utile : chaque cote a sa bande du bord de dalle");
  ok(near(z.aire_m2 + z.bandes_m2, gd.aire_m2, 0.011), "zone utile + bandes = aire de la dalle");
  const zero = clone(base); zero.dalle_cm.bandes_libres_cm = {};
  ok(near(geometry(zero).dalle.zone_utile.aire_m2, gd.aire_m2, 1e-9), "bandes nulles : zone utile = dalle");
}

const pas12 = (v) => v.passages.find((q) => q.cote === "arriere_droite").cm;
// variantes de forme : toutes dans la zone utile, porte sur le cote avant, aires ordonnees
{
  const { variantes, plus_grand_rectangle, plus_grand_k_gone } = await import(pathToFileURL(out).href);
  const g = geometry(base), vs = variantes(base, g), Z = g.dalle.zone_utile.polygone;
  const dedans = (q) => Z.every((a, i) => { const b = Z[(i + 1) % Z.length]; return (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= -0.2 * dist(a, b); });
  ok(vs.length === 13, "13 variantes");
  const v13 = vs.find((v) => v.id === 13), ep = base.panneau.epaisseur_mm / 10;
  ok(near(v13.passages.find((q) => q.cote === "arriere_droite").cm, base.dalle_cm.passage_souhaite_cm, 1), "option 13 : passage derriere l'abri = passage vise");
  ok(near(v13.polygone[3][1], g.dalle.zone_utile.polygone.reduce((m, q) => (Math.abs(q[0] - v13.polygone[0][0]) < 0.5 ? Math.max(m, q[1]) : m), -1), 0.2), "option 13 : coin arriere gauche au haut du cote gauche de la zone");
  const pch = v13.porte.chambranle_cm, pmg = v13.porte.marge_cm;
  ok(v13.porte.nom === "droite" && v13.porte.debut_cm - pch >= ep + 50, "option 13 : cadre de porte sur le mur droit, apres le bureau de facade");
  // face interieure du mur du fond, ramenee le long du mur droit : le cadre s'arrete a la marge avant
  {
    const { inset_ordre } = await import(pathToFileURL(out).href);
    const r = v13.polygone, I = inset_ordre(r, ep), a = r[1], b = r[2], L = dist(a, b), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const fin_int = (I[2][0] - a[0]) * u[0] + (I[2][1] - a[1]) * u[1];
    ok(v13.porte.debut_cm + v13.porte.largeur_cm + pch <= fin_int - pmg + 0.1 && v13.porte.debut_cm + v13.porte.largeur_cm + pch >= fin_int - pmg - 0.2, "option 13 : cadre a " + pmg + " cm de la face interieure du mur du fond, pas contre le coin");
    ok(near(v13.porte.hauteur_cm + pch, base.murs.hauteur_cm - pmg, 0.11), "option 13 : haut du cadre a " + pmg + " cm sous le haut du mur");
  }
  const dt = base.disposition_trapeze;
  ok(near(v13.aire_interieure_m2, dt.interieur_vise_m2, 0.03), "option 13 : interieur ~ cible (" + v13.aire_interieure_m2 + ")");
  ok(v13.porte.largeur_cm === dt.porte_largeur_cm, "option 13 : porte de la largeur demandee");
  ok(v13.fenetres.length === 2 && v13.fenetres.every((f) => f.tient && f.nom === "avant"), "option 13 : fenetres de facade dans le mur");
  ok(v13.fenetres.every((f) => Math.floor(f.debut_cm / base.panneau.largeur_utile_cm) === Math.floor((f.debut_cm + f.largeur_cm - 1e-6) / base.panneau.largeur_utile_cm)), "option 13 : aucune fenetre a cheval sur un joint de panneau");
  ok(v13.fenetres.every((f) => f.allege_cm >= 75), "option 13 : allege au-dessus d'un plan de bureau (75)");
  ok(v13.bureaux.length === 2 && near(v13.sol_libre_m2 + v13.bureaux_m2, v13.aire_interieure_m2, 0.011), "option 13 : bureaux + sol libre = interieur");
  const bg = v13.bureaux.find((b) => b.cote === "gauche"), ba = v13.bureaux.find((b) => b.cote === "avant");
  ok(bg.aire_m2 < 0.6 * bg.longueur_cm / 100 + 1e-6 && bg.aire_m2 > 0.6 * (bg.longueur_cm - 60) / 100, "option 13 : bureau gauche 60 cm sur la longueur du mur interieur");
  ok(near(v13.bureaux_m2, bg.aire_m2 + ba.aire_m2 - 0.6 * 0.5, 0.011), "option 13 : le coin du L n'est compte qu'une fois");
  ok(vs.filter((v) => v.id !== 7 && v.id !== 13).every((v) => v.porte && v.porte.cote === 0), "autres options : porte sur l'avant");
  {
    // option 12 : murs gauche et fond en modules entiers, facade pleine largeur, pan coupe parallele au grand pan
    const v = vs[11], mod = base.panneau.largeur_utile_cm, q = v.polygone;
    ok(v.id === 12 && q.length === 5, "option 12 : 5 cotes");
    ok(near(v.cotes_cm[3] % mod, 0, 0.05) && near(v.cotes_cm[4] % mod, 0, 0.05), "option 12 : mur du fond (" + v.cotes_cm[3] + ") et mur gauche (" + v.cotes_cm[4] + ") en modules entiers");
    ok(near(v.cotes_cm[0], vs[2].cotes_cm[0], 0.05), "option 12 : facade = toute la largeur de la zone (" + v.cotes_cm[0] + ")");
    ok(near(v.angles_deg[2], vs[3].angles_deg[2], 0.1) && near(v.angles_deg[3], vs[3].angles_deg[3], 0.1), "option 12 : pan coupe parallele au grand pan (memes angles que l'option 4)");
    ok(v.aire_m2 <= base.reglementaire.seuil_sans_formalite_m2, "option 12 sous le seuil (" + v.aire_m2 + " m²)");
    // a la main : 245 x 200 moins le triangle 45 x 41.7 = 4.81 m² ; coin arriere a 47.2 cm du grand pan
    ok(near(v.aire_m2, 4.81, 0.011), "option 12 : 4.81 m² calcules a la main");
    ok(near(pas12(v), 47.2, 0.2), "option 12 : passage 47.2 cm le long du grand pan (" + pas12(v) + ")");
    ok(v.aire_interieure_m2 > vs[0].aire_interieure_m2 + 0.7, "option 12 : +" + (v.aire_interieure_m2 - vs[0].aire_interieure_m2).toFixed(2) + " m² d'interieur sur l'option 1");
  }
  // interieur cote par cote : l'aire du polygone interieur retrouve aire_interieure_m2
  const { inset_ordre } = await import(pathToFileURL(out).href);
  ok(vs.every((v) => near(poly_area(inset_ordre(v.polygone, base.panneau.epaisseur_mm / 10)) / 1e4, v.aire_interieure_m2, 0.011)), "interieur : cotes decalees et aire concordent");
  ok(near(vs[0].cotes_interieures_cm[0], 200 - 2 * base.panneau.epaisseur_mm / 10, 0.05), "interieur option 1 : 200 moins deux parois");
  ok(vs[10].aire_m2 <= base.reglementaire.seuil_sans_formalite_m2 && vs[10].aire_m2 > base.reglementaire.seuil_sans_formalite_m2 - 0.03, "option 11 juste sous le seuil");
  const [v9, v10] = [vs[8], vs[9]];
  ok(v10.aire_m2 <= base.reglementaire.seuil_sans_formalite_m2 && v10.aire_m2 > base.reglementaire.seuil_sans_formalite_m2 - 0.03, "option 10 juste sous le seuil");
  const pas = (v, cote) => v.passages.find((q) => q.cote === cote).cm;
  // why we think it is actually a bug, and not just meaning spec should change: the passage is the
  // narrowest gap a person squeezes through, i.e. the true distance between the shed outline and the
  // wall segment. Measuring from shed corners only misses the wall END facing the middle of a shed wall
  const brut = (v, cote) => {
    const w = g.dalle.murs.find((m) => m.cote === cote), [ox, oy] = g.dalle.decalage_cm;
    const a = [w.de[0] + ox, w.de[1] + oy], b = [w.a[0] + ox, w.a[1] + oy], P = v.polygone, N = 400;
    let m = Infinity;
    for (let i = 0; i < P.length; i++) for (let k = 0; k <= N; k++) {
      const p = P[i], q = P[(i + 1) % P.length], s = [p[0] + (q[0] - p[0]) * k / N, p[1] + (q[1] - p[1]) * k / N];
      for (let j = 0; j <= N; j++) m = Math.min(m, dist(s, [a[0] + (b[0] - a[0]) * j / N, a[1] + (b[1] - a[1]) * j / N]));
    }
    return m;
  };
  ok(vs.every((v) => ["arriere_droite", "arriere_gauche"].every((c) => near(pas(v, c), brut(v, c), 0.8))), "chaque passage = vraie distance forme / mur (force brute)");
  ok(near(pas(vs[3], "arriere_droite"), brut(vs[3], "arriere_droite"), 0.8), "controle : option 4, coin face au milieu du mur, deja juste");
  ok(pas(v10, "arriere_droite") >= pas(v9, "arriere_droite") - 0.1, "option 10 : reculer le mur droit le long du meme mur arriere ne retrecit jamais le passage");
  // why we think it is actually a bug, and not just meaning spec should change: a passage is where a
  // person walks between the shed and the wall, so its far end must sit on the wall, never on the
  // wall's line extended past its end (option 1 drew a 91.8 segment leaving the slab)
  const surMur = (v) => v.passages.every((q) => {
    const w = g.dalle.murs.find((m) => m.cote === q.cote), [ox, oy] = g.dalle.decalage_cm;
    const a = [w.de[0] + ox, w.de[1] + oy], b = [w.a[0] + ox, w.a[1] + oy], f = q.segment[1];
    return near(dist(a, f) + dist(f, b), dist(a, b), 0.3);
  });
  ok(vs.every(surMur), "chaque passage aboutit sur le mur, pas sur son prolongement");
  const pan5 = { ...vs[4], passages: vs[4].passages.filter((q) => q.cote === "arriere_droite") };
  ok(surMur(pan5), "controle : le pan coupe de l'option 5, parallele au grand pan, a son pied sur le mur");
  ok(near(pas(v10, "arriere_gauche"), pas(v9, "arriere_gauche"), 0.1), "option 10 : coin arriere gauche inchange");
  ok(pas(vs[10], "arriere_droite") > pas(v10, "arriere_droite") + 10, "option 11 : pivoter le mur arriere elargit la pince, glisser le mur droit non");
  ok(near(v10.angles_deg[2], v9.angles_deg[2]) && near(v10.polygone[3][0], v9.polygone[3][0]), "option 10 : meme mur arriere que 9, seul le mur droit bouge");
  const quads = vs.filter((v) => v.polygone.length === 4);
  ok(quads.every((v) => v.aire_m2 <= vs[7].aire_m2), "option 8 = la plus grande a 4 murs");
  ok(vs[8].angles_deg[0] === 90 && vs[8].angles_deg[1] === 90 && vs[8].polygone.length === 4, "option 9 : trapeze d'equerre sur l'avant");
  // maison a pointe haute : sacrifier le haut droit (5) bat sacrifier la pointe (4)
  const maison = [[0, 0], [2, 0], [2, 2], [1, 4], [0, 2]];
  ok(near(poly_area(plus_grand_k_gone(maison, 4, [0, 1])), 5, 1e-9), "plus grand quadrilatere d'une maison a pointe haute = 5");
  // l'option 13 est bornee par le vrai passage au grand pan, pas par sa bande (droite infinie) : pres
  // du bout du mur, son coin arriere droit peut depasser la bande en gardant le passage vise
  ok(vs.filter((v) => v.id !== 13).every((v) => v.polygone.every(dedans)), "chaque variante (sauf 13) tient dans la zone utile");
  ok(vs.filter((v) => v.id !== 7).every((v) => near(v.polygone[0][1], v.polygone[1][1]) && v.polygone[1][0] > v.polygone[0][0]), "options avec porte : cote 0 = avant");
  ok(vs[6].angles_deg.every((a) => near(a, 90, 0.2)) && vs[6].aire_m2 >= vs[1].aire_m2 - 0.01, "option 7 : rectangle, au moins aussi grand que le meilleur rectangle droit");
  // un triangle rectangle 100 x 100 : le plus grand rectangle inscrit vaut la moitie de son aire, a plat
  const tri = plus_grand_rectangle([[0, 0], [100, 0], [0, 100]]);
  ok(tri && near(tri.w * tri.h, 2500, 30), "triangle rectangle : plus grand rectangle = moitie de l'aire");
  // un losange (carre tourne de 45) : le plus grand rectangle est le carre lui meme, tourne
  const los = plus_grand_rectangle([[0, -50], [50, 0], [0, 50], [-50, 0]]);
  ok(los && near(los.w * los.h, 5000, 60) && near(Math.abs(los.deg), 45, 1), "losange : le rectangle trouve est tourne de 45 degres");
  ok(vs[0].cotes_cm.every((c) => c % base.panneau.largeur_utile_cm === 0), "option 1 en modules entiers");
  ok(vs[1].aire_m2 >= vs[0].aire_m2 && vs[1].aire_m2 >= vs[2].aire_m2, "option 2 = le plus grand rectangle");
  ok(near(vs[3].aire_m2, base.reglementaire.seuil_sans_formalite_m2, 0.011), "option 4 plafonnee au seuil");
  ok(vs[3].aire_m2 <= vs[4].aire_m2 && vs[4].aire_m2 <= vs[5].aire_m2 && near(vs[5].aire_m2, g.dalle.zone_utile.aire_m2, 1e-9), "4 <= 5 <= 6 = zone utile");
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
