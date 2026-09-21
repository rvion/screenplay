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
ok(m.faces.find((f) => f.cle === "D").ouvertures.some((o) => o.type === "porte") && m.faces.find((f) => f.cle === "A").ouvertures.filter((o) => o.type === "fenetre").length === base.disposition_trapeze.fenetres.length, "porte face D, fenetres face A");
ok(v.lit_pliant.contre && v.lit_pliant.contre.startsWith("fond") && v.lit_pliant.largeur_cm >= 75 && v.lit_pliant.longueur_cm >= 190, "lit 75 x 190 rabattable contre le mur du fond");
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
ok(["## Débit", "## Ouvertures", "## Aménagement", "## Budget indicatif", "## À trancher"].every((h) => page.includes(h)) && !page.includes("NE TIENT PAS"), "abri.md complet, et tout y tient");
// debit murs : chaque bande prise dans une chute tient dans ce qu'il reste des panneaux recoupes
{
  const toutes = m.faces.flatMap((f) => f.panneaux), neufs = toutes.filter((x) => x.source === "neuf");
  ok(neufs.length === m.panneaux_mur_a_commander, "panneaux a commander = bandes tirees d'un panneau neuf");
  const reste = neufs.reduce((s, x) => s + base.panneau.largeur_utile_cm - x.largeur_cm, 0), pris = toutes.filter((x) => x.source === "chute").reduce((s, x) => s + x.largeur_cm, 0);
  ok(pris <= reste + 1e-6, "les bandes tirees des chutes ne depassent pas les chutes disponibles");
  ok(m.budget.total_eur > 0 && near(m.budget.total_eur, m.budget.lignes.reduce((s, l) => s + l.montant_eur, 0), 1), "budget : total = somme des lignes");
}

// variante proposee (abri_v2) : murs au module, sous le seuil, toit vers la droite
{
  const { params_v2, versions_abri } = await import(pathToFileURL(out).href);
  const p2 = params_v2(base);
  {
    // un bloc abri_v3 de plus est pris sans rien declarer, dans l'ordre des numeros
    const p = JSON.parse(JSON.stringify(base)); p.abri_v10 = { params: {} }; p.abri_v3 = { params: { disposition_trapeze: { porte_largeur_cm: 90 } } }; p.abri_vide = {};
    ok(versions_abri(p).map((x) => x.cle).join() === "abri_v2,abri_v3,abri_v4,abri_v10", "variantes : abri_v2, abri_v3, abri_v4, abri_v10 dans l'ordre des numeros, blocs sans params ignores");
    ok(params_v2(p, "abri_v3").disposition_trapeze.porte_largeur_cm === 90 && params_v2(p, "abri_v3").disposition_trapeze.toit.sens === "arriere", "abri_v3 : sa surcouche seule, pas celle de la v2");
  }
  ok(!!p2 && base.disposition_trapeze.toit.sens !== "droite", "abri_v2 : surcouche fusionnee sans toucher aux parametres de base");
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
  ok(m2.budget.lignes.some((l) => l.poste.startsWith("Porte pleine") && l.pu_eur === base.prix_indicatifs_eur.porte_pleine) && !m2.budget.lignes.some((l) => l.poste.startsWith("Porte vitrée")), "v2 : budget = porte pleine, plus de porte vitree");
  ok(c2.svg["modele-facade-D"].includes("porte pleine") && !core.svg["modele-facade-D"].includes("porte pleine"), "v2 : facade D dessine une porte pleine");
  // espace cache derriere l'abri. A la main, dalle au-dela de la droite (10,301)-(210,201), x <= 210 :
  // sommets (0,306) (210,201) (210,271.2) (72.7,398.3) (0,324) -> 1,90 m2 ; pointe a 115 cm du mur du fond
  ok(near(v2.arriere.aire_m2, 1.9, 0.015) && near(v2.arriere.profondeur_max_cm, 115, 1.5), "v2 : " + v2.arriere.aire_m2 + " m² caches derriere l'abri, " + v2.arriere.profondeur_max_cm + " cm au plus profond");
  ok(v2.arriere.aire_m2 >= v.arriere.aire_m2 - 0.05, "v2 : autant de place derriere que la v1 (" + v.arriere.aire_m2 + " m²), ce n'est pas un avantage de la v2");
  ok(c2.svg["modele-implantation"].includes("rangement caché"), "v2 : la zone cachee est dessinee sur le plan d'implantation");
  // le fond de la v2 (223,6) est trop court pour un lit de 190 rabattable : il est pose au sol libre
  ok(v2.lit_pliant.tient === true && !v2.lit_pliant.replie, "v2 : lit 75 x 190 pose au sol libre (pas rabattable)");
  {
    const p3 = params_v2(base); p3.disposition_trapeze.lit_pliant.contre = "fond";
    ok(buildCore(p3).variantes.find((x) => x.id === 13).lit_pliant.tient === false, "v2 : le meme lit rabattable contre le fond ne tient pas (perte affichee dans abri-v2.md)");
  }
  const { abri_md } = await import(pathToFileURL(out).href);
  const page2 = abri_md(p2, c2, { prefixe: "modele-v2-", titre: base.abri_v2.titre, atouts: base.abri_v2.atouts, pertes: base.abri_v2.pertes, notes: base.abri_v2.notes, hors_modele: base.abri_v2.hors_modele, base: core });
  ok(["regards", "lumière de côté", "outils de jardin"].every((mot) => page2.includes(mot)) && page2.indexOf("### Ce que cette disposition apporte") < page2.indexOf("### Ce que la version 2 perd"), "abri-v2.md : vie privee, lumiere, rangement, avant les pertes");
  ok(!/\{\w+\}/.test(page2) && page2.includes(`${String(v2.arriere.aire_m2).replace(".", ",")} m² de dalle`), "abri-v2.md : chiffres du rangement injectes depuis le calcul, aucun {champ} oublie");
  ok(page2.includes("### Ce que la version 2 perd") && page2.includes("pliant, posé au sol libre"), "abri-v2.md dit ce que la v2 perd");
  ok(page2.includes("site/assets/modele-v2-toit.svg") && !page2.includes("site/assets/modele-toit.svg"), "abri-v2.md pointe vers ses propres plans");
  ok(page2.includes("## Ce qui change par rapport à la version 1") && page2.includes("vers la droite (jardin)"), "abri-v2.md s'ouvre sur le tableau compare");
  ok(!abri_md(base, core).includes("version 1"), "abri.md inchange par les options de la v2");
}

// version 3 : cinq murs (fond d'un module + pan a 45 deg), 5 cm a gauche, heritee de la version 2
{
  const { params_v2, abri_md } = await import(pathToFileURL(out).href);
  const p2 = params_v2(base), p3 = params_v2(base, "abri_v3");
  ok(p3.disposition_trapeze.toit.sens === "droite" && p3.disposition_trapeze.porte_vitree === false && p3.dalle_cm.bandes_libres_cm.avant === 1, "v3 : herite des reglages de la v2 (toit a droite, porte pleine, abri avance)");
  ok(p3.dalle_cm.bandes_libres_cm.gauche === 10 && p2.dalle_cm.bandes_libres_cm.gauche === 10 && base.dalle_cm.bandes_libres_cm.gauche === 12, "v2 et v3 : 10 cm a gauche (la v1 garde 12)");
  const c2 = buildCore(p2), c3 = buildCore(p3), m3 = c3.modele, v3 = c3.variantes.find((x) => x.id === 13), v2 = c2.variantes.find((x) => x.id === 13);
  ok(m3.faces.map((f) => f.cle).join("") === "ADCBG", "v3 : cinq murs A, D, C (pan), B (fond), G");
  const L = Object.fromEntries(m3.faces.map((f) => [f.cle, f]));
  // a la main : 200 x 300 moins le coin 100 x 100 / 2 = 5,50 m2 ; pan = 100 x racine(2) = 141,4 ; angles 90 90 135 135 90
  ok(near(v3.aire_m2, 5.5, 0.001) && near(L.C.longueur_cm, 141.4, 0.05) && near(L.B.longueur_cm, 100), "v3 : 5,50 m² de murs, pan de 141,4, fond de 100 (" + v3.aire_m2 + ", " + L.C.longueur_cm + ")");
  ok(v3.angles_deg.join() === "90,90,135,135,90", "v3 : angles 90 · 90 · 135 · 135 · 90, aucun angle aigu (" + v3.angles_deg.join(" ") + ")");
  ok(near(Math.min(...v3.polygone.map((z) => z[0])), 10, 0.05), "v3 : mur gauche a 10 cm du bord de la dalle");
  const mod = base.panneau.largeur_utile_cm;
  ok(["A", "D", "B", "G"].every((k) => L[k].panneaux.every((pn) => near(pn.largeur_cm, mod))) && L.C.panneaux.filter((pn) => pn.largeur_cm < mod - 0.05).length === 1, "v3 : A, D, B, G en panneaux entiers, une seule bande recoupee (sur le pan)");
  const pas = (v) => v.passages.find((q) => q.cote === "arriere_droite").cm;
  // a la main : coin (110, 301), mur a y = 223 + 152 x 0,926 = 363,8 ; ecart 62,8 x 0,734 = 46,0
  ok(near(pas(v3), 46.0, 0.6), "v3 : passage derriere 46 cm, au coin du fond (" + pas(v3) + ")");
  ok(v3.aire_interieure_m2 > v2.aire_interieure_m2 + 0.4, "v3 : +" + (v3.aire_interieure_m2 - v2.aire_interieure_m2).toFixed(2) + " m² d'interieur sur la v2");
  ok(v3.arriere && v3.arriere.polygones.length === 2 && v3.arriere.aire_m2 < v2.arriere.aire_m2, "v3 : rangement cache plus petit que la v2 (" + v3.arriere.aire_m2 + " contre " + v2.arriere.aire_m2 + " m²), sur deux murs de fond");
  // le toit penche a droite : l'eau sort par D et par le pan C, pas par le fond B
  ok(m3.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "CD", "v3 : gouttiere sur le pan C et le mur droit D");
  ok(near(L.B.hauteur_debut_cm, (L.C.hauteur_fin_cm), 0.05) && L.C.hauteur_debut_cm === H && L.B.hauteur_fin_cm === H + 22.5, "v3 : hauteurs continues du mur droit (215) au mur gauche (237,5) en passant par C puis B");
  ok(m3.rehausse.pieces.map((r) => r.face).sort().join("") === "ABCG", "v3 : rehausse sur A, C, B, G (rien sur le mur droit)");
  ok(["modele-facade-C", "modele-facade-B"].every((k) => c3.svg[k] && c3.svg[k].startsWith("<svg")), "v3 : une elevation par mur, pan C compris");
  ok(v3.porte.tient !== false && v3.fenetres.every((f) => f.tient !== false) && v3.lit_pliant.tient === true, "v3 : porte, fenetres et lit pliant tiennent");
  const b3 = base.abri_v3, page3 = abri_md(p3, c3, { prefixe: "modele-v3-", version: 3, depuis: 2, titre: b3.titre, atouts: b3.atouts, pertes: b3.pertes, notes: b3.notes, hors_modele: b3.hors_modele, base: c2 });
  ok(page3.includes("## Ce qui change par rapport à la version 2") && page3.includes("| | version 2 ([abri-v2.md](abri-v2.md)) | **version 3** |"), "abri-v3.md se compare a la version 2");
  ok(page3.includes("**5 murs**") && page3.includes("site/assets/modele-v3-facade-C.svg") && page3.includes("5 angles"), "abri-v3.md : 5 murs, 5 angles, l'elevation du pan");
  ok(!/\{\w+\}/.test(page3) && page3.includes("déclaration préalable"), "abri-v3.md : tous les {champs} remplaces, et la declaration prealable annoncee");
  ok(abri_md(base, core).includes("**4 murs**") && abri_md(base, core).includes("- 4 angles :"), "abri.md : toujours 4 murs et 4 angles");
}

// fenetres 80 x 80, allege 110, sur la v2 et tout ce qui en herite
{
  const { params_v2 } = await import(pathToFileURL(out).href);
  for (const cle of ["abri_v2", "abri_v3", "abri_v4"]) {
    const f = buildCore(params_v2(base, cle)).variantes.find((x) => x.id === 13).fenetres;
    ok(f.length === 2 && f.every((w) => w.largeur_cm === 80 && w.hauteur_cm === 80 && w.allege_cm === 110 && w.tient !== false) && f[0].ouvrant && !f[1].ouvrant, cle + " : deux fenetres 80 x 80, allege 110 (haut a 190), l'ouvrante a gauche");
  }
}

// version 4 : la version 3 avec le toit vers le fond, gouttiere derriere (nervures dans le sens de la pente)
{
  const { params_v2, abri_md } = await import(pathToFileURL(out).href);
  const p3 = params_v2(base, "abri_v3"), p4 = params_v2(base, "abri_v4"), c3 = buildCore(p3), c4 = buildCore(p4);
  const m4 = c4.modele, v4 = c4.variantes.find((x) => x.id === 13), v3 = c3.variantes.find((x) => x.id === 13);
  ok(JSON.stringify(v4.polygone) === JSON.stringify(v3.polygone) && v4.aire_interieure_m2 === v3.aire_interieure_m2, "v4 : meme forme et meme interieur que la v3");
  const L = Object.fromEntries(m4.faces.map((f) => [f.cle, f]));
  // a la main, chute 22,5 sur 300 de profondeur : facade 237,5 ; a y = 200, 215 + 22,5 / 3 = 222,5 ; fond 215
  ok(m4.sens === "arriere" && L.A.hauteur_debut_cm === H + 22.5 && L.A.hauteur_fin_cm === H + 22.5, "v4 : facade de niveau a " + (H + 22.5));
  ok(near(L.D.hauteur_fin_cm, 222.5, 0.05) && near(L.C.hauteur_debut_cm, 222.5, 0.05) && L.C.hauteur_fin_cm === H && L.B.hauteur_debut_cm === H && L.B.hauteur_fin_cm === H, "v4 : mur droit 237,5 -> 222,5, pan 222,5 -> 215, fond a 215");
  ok(near(m4.pente.pourcent, 7.5, 0.06) && near(m4.portee_cm, 300), "v4 : pente 22,5 / 300 = 7,5 %, portee 3 m (" + m4.pente.pourcent + " %, " + m4.portee_cm + ")");
  // l'eau suit les nervures : elle ne sort que par les bouts arriere des panneaux, donc par B et par C
  ok(m4.toit.gouttiere.troncons.map((t) => t.face).sort().join("") === "BC", "v4 : gouttiere derriere, sur le fond B et le pan C");
  const bouts = m4.toit.gouttiere.troncons.flatMap((t) => [t.de, t.a]);
  ok(m4.toit.gouttiere.descente[0] === Math.max(...bouts.map((z) => z[0])), "v4 : descente au bout droit de la gouttiere (" + m4.toit.gouttiere.descente + ")");
  ok(m4.toit.panneaux.length === 2 && m4.toit.panneaux.every((t) => near(t.largeur_cm, 100)) && m4.toit.panneaux.filter((t) => t.biais).length === 1, "v4 : 2 panneaux de toit de 100, un seul coupe en biais");
  ok(!m4.rehausse.pieces.some((r) => r.face === "B") && m4.rehausse.pieces.map((r) => r.face).sort().join("") === "ACDG", "v4 : rehausse sur A, D, C, G (rien sur le fond)");
  const b4 = base.abri_v4, page4 = abri_md(p4, c4, { prefixe: "modele-v4-", version: 4, depuis: 3, titre: b4.titre, atouts: b4.atouts, pertes: b4.pertes, notes: b4.notes, hors_modele: b4.hors_modele, base: c3 });
  ok(page4.includes("| | version 3 ([abri-v3.md](abri-v3.md)) | **version 4** |") && !/\{\w+\}/.test(page4), "abri-v4.md se compare a la version 3, tous les {champs} remplaces");
  ok(page4.includes("derrière l'abri, en 2 tronçon(s)") && page4.includes("à l'entrée du passage"), "abri-v4.md : gouttiere derriere en 2 troncons, descente a l'entree du passage");
  ok(abri_md(base, core).includes("descente au coin arrière gauche (point bas), atteignable par le passage"), "abri.md : phrase de gouttiere de la v1 inchangee");
}

if (fails) { console.log(`\n${fails} echec(s)`); process.exit(1); }
console.log("\nModele 2D OK ✓");
