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
// etudes figees (tests/fixtures) : les cas a 4 murs et a toit vers la droite ; params.json = l'abri actuel
const fixture = (n) => JSON.parse(readFileSync(join(ROOT, `tests/fixtures/etude-v${n}.json`), "utf8"));
const base = fixture(1), actuel = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
const core = buildCore(base), m = core.modele, v = core.variantes.find((x) => x.id === 13);
const H = base.murs.hauteur_cm, c = base.disposition_trapeze.toit.chute_cm;

ok(m && m.faces.map((f) => f.cle).join("") === "ADBG", "4 faces A D B G dans l'ordre du contour");
ok(Math.max(...m.hauteurs_coins_cm) === H + c && Math.min(...m.hauteurs_coins_cm) === H, "toit : avant a H + chute, point le plus au fond a H");
ok(m.faces.every((f, i) => near(f.hauteur_fin_cm, m.faces[(i + 1) % 4].hauteur_debut_cm)), "hauteurs continues d'une face a l'autre (toit plan)");
ok(m.pente.degres >= 5, "pente >= 5 degres (" + m.pente.degres + ")");
ok(m.faces.every((f) => near(f.panneaux.reduce((s, p) => s + p.largeur_cm, 0), f.longueur_cm, 0.2)), "les panneaux couvrent chaque face");
ok(m.faces.every((f) => f.panneaux.every((p) => p.largeur_cm <= base.panneau.largeur_utile_cm + 1e-9)), "aucun panneau plus large que la largeur utile");
ok(m.faces.find((f) => f.cle === "D").ouvertures.some((o) => o.type === "porte") && m.faces.find((f) => f.cle === "A").ouvertures.filter((o) => o.type === "fenetre").length === base.disposition_trapeze.fenetres.length, "porte face D, fenetres face A");
ok(v.lit_pliant.contre && v.lit_pliant.contre.startsWith("fond") && v.lit_pliant.largeur_cm >= 70 && v.lit_pliant.longueur_cm >= 190, "lit 70 x 190 (taille standard une place) rabattable contre le mur du fond");
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
  ok(lp.largeur_cm >= 70 && lp.longueur_cm >= 190, "lit d'au moins 70 x 190");
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
  ok(core.svg["modele-sol"].includes(`lit ${lp.replie ? "rabattable" : "pliant"} ${lp.largeur_cm} × ${lp.longueur_cm}`), "plan de sol : lit dessine avec sa nature et sa taille");
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
ok(["## Débit", "## Ouvertures", "## Aménagement", "## Matériaux à acheter", "## Guide de montage", "## À trancher"].every((h) => page.includes(h)) && !page.includes("NE TIENT PAS"), "abri.md complet, et tout y tient");
// debit murs : chaque bande prise dans une chute tient dans ce qu'il reste des panneaux recoupes
{
  const toutes = m.faces.flatMap((f) => f.panneaux), neufs = toutes.filter((x) => x.source === "neuf");
  ok(neufs.length === m.panneaux_mur_a_commander, "panneaux a commander = bandes tirees d'un panneau neuf");
  const reste = neufs.reduce((s, x) => s + base.panneau.largeur_utile_cm - x.largeur_cm, 0), pris = toutes.filter((x) => x.source === "chute").reduce((s, x) => s + x.largeur_cm, 0);
  ok(pris <= reste + 1e-6, "les bandes tirees des chutes ne depassent pas les chutes disponibles");
  ok(m.budget.total_eur > 0 && near(m.budget.total_eur, m.budget.lignes.filter((l) => !l.optionnel).reduce((s, l) => s + l.montant_eur, 0), 1), "materiaux : total = somme des lignes hors equipement optionnel");
  ok(m.budget.ttc === true && m.budget.lignes.every((l) => !/forfait/i.test(l.unite)) && near(m.budget.options_eur, m.budget.lignes.filter((l) => l.optionnel).reduce((s, l) => s + l.montant_eur, 0), 1), "materiaux : TTC, aucun forfait, l'equipement optionnel compte a part");
}

// etude v2 : murs au module, sous le seuil, toit vers la droite
{
  const p2 = fixture(2);
  const c2 = buildCore(p2), m2 = c2.modele, v2 = c2.variantes.find((x) => x.id === 13), mod = base.panneau.largeur_utile_cm;
  const L = Object.fromEntries(m2.faces.map((f) => [f.cle, f]));
  ok(near(L.A.longueur_cm, 200) && near(L.D.longueur_cm, 200) && near(L.G.longueur_cm, 300), "v2 : facade 200, droite 200, gauche 300");
  ok(["A", "D", "G"].every((k) => L[k].panneaux.every((pn) => near(pn.largeur_cm, mod))), "v2 : faces A, D et G en panneaux entiers");
  // a la main : trapeze 200 x (200 + 300) / 2 = 5,00 m2 ; fond = racine(200² + 100²) = 223,6
  ok(near(v2.aire_m2, 5, 0.001) && v2.aire_m2 <= base.reglementaire.seuil_sans_formalite_m2, "v2 : 5,00 m² de murs, au seuil (" + v2.aire_m2 + ")");
  ok(near(L.B.longueur_cm, 223.6, 0.05), "v2 : fond en biais 223,6 (" + L.B.longueur_cm + ")");
  const derriere = v2.passages.find((q) => q.cote === "arriere_droite").cm;
  ok(derriere >= 49.5, "v2 : passage derriere >= 50 cm a l'arrondi (" + derriere + ")");
  ok(v2.polygone.every(([x, y]) => c2.geometrie.dalle.zone_utile.polygone.length && y >= 0.9), "v2 : abri avance a 1 cm du bord avant de la dalle");
  ok(near(Math.min(...v2.polygone.map((z) => z[0])), 10, 0.05) && m2.toit.debord_cm.droite === 15, "v2 : 10 cm au bord gauche de la dalle, debord de 15 au-dessus de la porte");
  // toit vers la droite : mur gauche haut, mur droit sans rehausse, egout et descente cote jardin
  ok(m2.sens === "droite" && near(L.G.hauteur_debut_cm, H + 22.5) && near(L.G.hauteur_fin_cm, H + 22.5), "v2 : mur gauche haut d'un bout a l'autre (" + L.G.hauteur_debut_cm + ")");
  ok(near(L.D.hauteur_debut_cm, H) && near(L.D.hauteur_fin_cm, H) && !m2.rehausse.pieces.some((r) => r.face === "D"), "v2 : mur droit a " + H + ", sans rehausse");
  ok(near(m2.pente.pourcent, 11.25, 0.06) && near(m2.portee_cm, 200), "v2 : pente 22,5 / 200 = 11,3 %, portee 2,0 m (" + m2.pente.pourcent + " %, " + m2.portee_cm + ")");
  ok(m2.toit.gouttiere.face === "D" && m2.toit.gouttiere.descente[1] < m2.toit.gouttiere.de[1] + 1e-6 || m2.toit.gouttiere.descente[1] <= Math.min(m2.toit.gouttiere.de[1], m2.toit.gouttiere.a[1]) + 1e-6, "v2 : gouttiere sur le mur droit, descente devant");
  // toit vers la droite : l'eau du fond du toit sort par le fond en biais, il lui faut sa gouttiere aussi
  ok(m2.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "BD" && m.toit.gouttiere.troncons.map((t) => t.face).join("") === "B", "v2 : gouttiere sur le mur droit ET le fond en biais ; v1 : sur le fond seul");
  ok(m2.toit.panneaux.length === 3 && m2.toit.panneaux.every((t) => near(t.largeur_cm, mod)), "v2 : 3 panneaux de toit, tous de 100 de large (aucune bande etroite)");
  ok(m2.toit.panneaux.filter((t) => t.biais && poly_area(t.polygone) < 0.9 * mod * (200 + 25)).length === 1, "v2 : un seul panneau de toit vraiment entame par le biais");
  ok(m2.rehausse.section_mm[1] === 225 && m2.rehausse.nb_madriers <= 2, "v2 : madrier courant 75 x 225, " + m2.rehausse.nb_madriers + " madrier(s)");
  ok(v2.porte.largeur_cm === 80 && v2.porte.tient !== false && v2.porte.debut_cm - v2.porte.chambranle_cm >= mod - 0.05, "v2 : porte de 80 entierement dans le 2e module, D1 entier (cadre a partir de " + (v2.porte.debut_cm - v2.porte.chambranle_cm) + ")");
  ok(v2.fenetres.length === 2 && v2.fenetres.every((f) => f.tient !== false), "v2 : deux fenetres qui tiennent en facade");
  // porte pleine : ni vitrage dans le dos des ecrans, ni vue depuis l'etage des voisins
  ok(v2.porte.vitree === false && v.porte.vitree === true, "v2 : porte pleine (la v1 garde sa porte vitree)");
  ok(m2.budget.lignes.some((l) => /^Bloc-porte plein/.test(l.poste) && l.pu_eur === base.prix_materiaux_eur_ttc.porte_pleine_u.pu) && !m2.budget.lignes.some((l) => /vitrée/.test(l.poste)), "v2 : budget = porte pleine, plus de porte vitree");
  ok(c2.svg["modele-facade-D"].includes("porte pleine") && !core.svg["modele-facade-D"].includes("porte pleine"), "v2 : facade D dessine une porte pleine");
  // espace cache derriere l'abri. A la main, dalle au-dela de la droite (10,301)-(210,201), x <= 210 :
  // sommets (0,306) (210,201) (210,271.2) (72.7,398.3) (0,324) -> 1,90 m2 ; pointe a 115 cm du mur du fond
  ok(near(v2.arriere.aire_m2, 1.9, 0.015) && near(v2.arriere.profondeur_max_cm, 115, 1.5), "v2 : " + v2.arriere.aire_m2 + " m² caches derriere l'abri, " + v2.arriere.profondeur_max_cm + " cm au plus profond");
  ok(v2.arriere.aire_m2 >= v.arriere.aire_m2 - 0.05, "v2 : autant de place derriere que la v1 (" + v.arriere.aire_m2 + " m²), ce n'est pas un avantage de la v2");
  ok(c2.svg["modele-implantation"].includes("rangement caché"), "v2 : la zone cachee est dessinee sur le plan d'implantation");
  // le fond de la v2 (223,6) est trop court pour un lit de 190 rabattable : il est pose au sol libre
  ok(v2.lit_pliant.tient === true && !v2.lit_pliant.replie, "v2 : lit 70 x 190 pose au sol libre (pas rabattable)");
  {
    const p3 = fixture(2); p3.disposition_trapeze.lit_pliant.contre = "fond";
    ok(buildCore(p3).variantes.find((x) => x.id === 13).lit_pliant.tient === false, "v2 : le meme lit rabattable contre le fond ne tient pas (perte affichee dans abri-v2.md)");
  }
}

// etude v3 : cinq murs (fond d'un module + pan a 45 deg), toit vers la droite
{
  const p2 = fixture(2), p3 = fixture(3);
  const c2 = buildCore(p2), c3 = buildCore(p3), m3 = c3.modele, v3 = c3.variantes.find((x) => x.id === 13), v2 = c2.variantes.find((x) => x.id === 13);
  ok(m3.faces.map((f) => f.cle).join("") === "ADCBG", "v3 : cinq murs A, D, C (pan), B (fond), G");
  const L = Object.fromEntries(m3.faces.map((f) => [f.cle, f]));
  // a la main : 200 x 275 moins le coin 100 x 100 / 2 = 5,00 m2 ; pan = 100 x racine(2) = 141,4 ; angles 90 90 135 135 90
  ok(near(L.G.longueur_cm, 275) && near(L.D.longueur_cm, 175) && near(L.A.longueur_cm, 200), "v3 : facade 200, mur droit 175, mur gauche 275");
  ok(near(v3.aire_m2, 5, 0.001) && v3.aire_m2 <= base.reglementaire.seuil_sans_formalite_m2 && near(L.C.longueur_cm, 141.4, 0.05) && near(L.B.longueur_cm, 100), "v3 : 5,00 m² de murs, au seuil ; pan de 141,4, fond de 100 (" + v3.aire_m2 + ", " + L.C.longueur_cm + ")");
  {
    // le meme abri raccourci de 20 au lieu de 25 depasse le seuil : c'est la raison du 25
    const p20 = fixture(3); Object.assign(p20.disposition_trapeze.cotes_cm, { droite: 180, gauche: 280 });
    ok(near(buildCore(p20).variantes.find((x) => x.id === 13).aire_m2, 5.1, 0.001), "v3 : a 280 / 180 l'abri ferait 5,10 m², au-dessus du seuil");
  }
  ok(near(Math.min(...v3.polygone.map((z) => z[1])), 10, 0.05), "v3 : facade a 10 cm du bord avant de la dalle");
  ok(v3.angles_deg.join() === "90,90,135,135,90", "v3 : angles 90 · 90 · 135 · 135 · 90, aucun angle aigu (" + v3.angles_deg.join(" ") + ")");
  ok(near(Math.min(...v3.polygone.map((z) => z[0])), 10, 0.05), "v3 : mur gauche a 10 cm du bord de la dalle");
  const mod = base.panneau.largeur_utile_cm;
  ok(["A", "B"].every((k) => L[k].panneaux.every((pn) => near(pn.largeur_cm, mod))), "v3 : facade et mur du fond en panneaux entiers");
  ok(["D", "C", "G"].every((k) => L[k].panneaux.filter((pn) => pn.largeur_cm < mod - 0.05).length === 1), "v3 : une bande recoupee sur D, sur C et sur G");
  // mur de la porte : la bande de 75 est en tete (cote facade), le module entier du fond recoit tout le cadre
  ok(near(L.D.panneaux[0].largeur_cm, 75) && near(L.D.panneaux[1].largeur_cm, mod) && near(L.D.panneaux[1].debut_cm, 75), "v3 : mur droit = bande de 75 cote facade, puis le module de la porte");
  ok(v3.porte.debut_cm - v3.porte.chambranle_cm >= 75 - 0.05 && L.D.panneaux[0].decoupes.length === 0, "v3 : le cadre de la porte tient dans le module du fond, la bande de tete reste pleine (cadre a partir de " + (v3.porte.debut_cm - v3.porte.chambranle_cm) + ")");
  ok(near(L.G.panneaux[L.G.panneaux.length - 1].largeur_cm, 75) && near(L.G.panneaux[0].largeur_cm, mod), "v3 : mur gauche, bande de 75 en bout cote facade");
  const pas = (v) => v.passages.find((q) => q.cote === "arriere_droite").cm;
  // a la main : coin (110, 285), mur a y = 223 + 152 x 0,926 = 363,8 ; ecart 78,8 x 0,734 = 57,8
  ok(near(pas(v3), 57.8, 0.6) && pas(v3) > pas(v2), "v3 : passage derriere 57,8 cm au coin du fond, plus large que la v2 (" + pas(v3) + " contre " + pas(v2) + ")");
  ok(near(v3.aire_interieure_m2, v2.aire_interieure_m2, 0.1) && v3.sol_libre_m2 > v2.sol_libre_m2, "v3 : meme interieur que la v2 (" + v3.aire_interieure_m2 + " contre " + v2.aire_interieure_m2 + "), plus de sol libre");
  ok(v3.arriere && v3.arriere.polygones.length === 2 && v3.arriere.aire_m2 < v2.arriere.aire_m2, "v3 : rangement cache plus petit que la v2 (" + v3.arriere.aire_m2 + " contre " + v2.arriere.aire_m2 + " m²), sur deux murs de fond");
  // le toit penche a droite : l'eau sort par D et par le pan C, pas par le fond B
  ok(m3.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "CD", "v3 : gouttiere sur le pan C et le mur droit D");
  ok(near(L.B.hauteur_debut_cm, (L.C.hauteur_fin_cm), 0.05) && L.C.hauteur_debut_cm === H && L.B.hauteur_fin_cm === H + 22.5, "v3 : hauteurs continues du mur droit (215) au mur gauche (237,5) en passant par C puis B");
  ok(m3.rehausse.pieces.map((r) => r.face).sort().join("") === "ABCG", "v3 : rehausse sur A, C, B, G (rien sur le mur droit)");
  ok(["modele-facade-C", "modele-facade-B"].every((k) => c3.svg[k] && c3.svg[k].startsWith("<svg")), "v3 : une elevation par mur, pan C compris");
  ok(v3.porte.tient !== false && v3.fenetres.every((f) => f.tient !== false) && v3.lit_pliant.tient === true, "v3 : porte, fenetres et lit pliant tiennent");
  ok(abri_md(base, core).includes("**4 murs**") && abri_md(base, core).includes("- 4 angles :"), "abri.md : toujours 4 murs et 4 angles");
}

// fenetres 80 x 80, allege 110, dans les etudes v2 et v3
{
  for (const [cle, p] of [["etude v2", fixture(2)], ["etude v3", fixture(3)]]) {
    const f = buildCore(p).variantes.find((x) => x.id === 13).fenetres;
    ok(f.length === 2 && f.every((w) => w.largeur_cm === 80 && w.hauteur_cm === 80 && w.allege_cm === 110 && w.tient !== false) && f[0].ouvrant && !f[1].ouvrant, cle + " : deux fenetres 80 x 80, allege 110 (haut a 190), l'ouvrante a gauche");
  }
}
// l'abri : deux fenetres de stock identiques, 80 x 75 oscillo-battantes, allege 110
{
  const f = buildCore(actuel).variantes.find((x) => x.id === 13).fenetres;
  ok(f.length === 2 && f.every((w) => w.largeur_cm === 80 && w.hauteur_cm === 75 && w.allege_cm === 115 && w.ouvrant && w.tient !== false), "abri actuel : deux fenetres de stock 80 x 75 oscillo-battantes, allege 115 (haut a 190)");
}

// abri actuel : l'etude v3 avec le toit vers le fond, gouttiere derriere (nervures dans le sens de la pente)
{
  const p3 = fixture(3), p4 = actuel, c3 = buildCore(p3), c4 = buildCore(p4);
  const m4 = c4.modele, v4 = c4.variantes.find((x) => x.id === 13), v3 = c3.variantes.find((x) => x.id === 13);
  // facade elargie de 15 pour qu'un lit de 190 tienne le long du mur avant (203 dedans) : le reste est celui de l'etude v3
  ok(v4.cotes_interieures_cm[0] === 198 && JSON.stringify(m4.faces.map((f) => f.longueur_cm)) === JSON.stringify([210, 178, 99, 140, 248]) && v4.aire_interieure_m2 === 4.45 && JSON.stringify(m4.angles_deg) === JSON.stringify([90, 90, 135, 135, 90]) && m4.formalites.formalite === "aucune" && near(m4.formalites.emprise_au_sol_m2, 4.96, 0.005) && m4.faces[2].panneaux.length === 1, "abri : facade 210 (198 dedans, un lit de 190 tient), fond 140 pour que le pan a 45 deg fasse 99 cm, soit UN panneau sans bande, emprise 4,96 m2 donc aucune formalite");
  const L = Object.fromEntries(m4.faces.map((f) => [f.cle, f]));
  // a la main, chute 22,5 sur 248 de profondeur : facade 237,5 ; au haut du mur droit (178) 215 + 22,5 x 70 / 248 = 221,4 ; fond 215
  ok(m4.sens === "arriere" && L.A.hauteur_debut_cm === H + 22.5 && L.A.hauteur_fin_cm === H + 22.5, "v4 : facade de niveau a " + (H + 22.5));
  ok(near(L.D.hauteur_fin_cm, 221.4, 0.06) && near(L.C.hauteur_debut_cm, 221.4, 0.06) && L.C.hauteur_fin_cm === H && L.B.hauteur_debut_cm === H && L.B.hauteur_fin_cm === H, "v4 : mur droit 237,5 -> 221,4, pan 221,4 -> 215, fond a 215");
  ok(near(m4.pente.pourcent, 9.1, 0.06) && near(m4.portee_cm, 248), "v4 : pente 22,5 / 248 = 9,1 %, portee 2,48 m (" + m4.pente.pourcent + " %, " + m4.portee_cm + ")");
  // l'eau suit les nervures : elle ne sort que par les bouts arriere des panneaux, donc par B et par C
  ok(m4.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "BC", "v4 : gouttiere derriere, sur le fond B et le pan C");
  const bouts = m4.toit.gouttiere.troncons.flatMap((t) => [t.de, t.a]);
  ok(m4.toit.gouttiere.descente[0] === Math.min(...bouts.map((z) => z[0])), "v4 : descente au bout gauche de la gouttiere, coin G/B (" + m4.toit.gouttiere.descente + ")");
  ok(m4.toit.panneaux.length === 3 && m4.toit.panneaux.filter((t) => near(t.largeur_cm, 100)).length === 2 && near(m4.toit.panneaux[2].largeur_cm, 10) && m4.toit.panneaux.filter((t) => t.biais).length === 2, "v4 : 3 panneaux de toit (100, 100, bande de 10), deux coupes en biais");
  ok(!m4.rehausse.pieces.some((r) => r.face === "B") && m4.rehausse.pieces.map((r) => r.face).sort().join("") === "ACDG", "v4 : rehausse sur A, D, C, G (rien sur le fond)");
  const page4 = abri_md(p4, c4);
  ok(!/\{\w+\}/.test(page4) && page4.includes("## Pourquoi cette forme") && page4.includes("**Q1**"), "abri.md : tous les {champs} remplaces, points forts, questions et idees en fin de page");
  ok(page4.includes("derrière l'abri, en 2 tronçon(s)") && page4.includes("au coin arrière gauche"), "abri.md : gouttiere derriere en 2 troncons, descente au coin arriere gauche");
  ok(!/version \d|abri_v\d/i.test(page4), "abri.md : aucun numero de version, l'abri actuel n'en a pas");
  ok(abri_md(base, core).includes("descente au coin arrière gauche (point bas), atteignable par le passage"), "abri.md : phrase de gouttiere de la v1 inchangee");
}

if (fails) { console.log(`\n${fails} echec(s)`); process.exit(1); }
console.log("\nModele 2D OK ✓");
