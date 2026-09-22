// Scene 3D de l'abri retenu : construite sous Node avec le vrai three.js (sans WebGL), puis mesuree.
// Un mur mal oriente, un toit a l'envers ou un NaN se voient dans les boites englobantes, pas dans un test de rendu.
//   node tests/abri3d.mjs
import * as esbuild from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
mkdirSync(join(ROOT, "build"), { recursive: true });
const out = join(ROOT, "build/abri3d.mjs");
// three vient ici de node_modules, comme site/three.js ; le bundle abri.js le lit sur window.ABRI_THREE
await esbuild.build({ stdin: { contents: 'export * as THREE from "three"; export { peuple_abri, VUES } from "./site/src/viewer_abri"; export { calcule_abri } from "./site/src/abri_page";', resolveDir: ROOT, loader: "ts" }, bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "warning" });
const { THREE, peuple_abri, VUES, calcule_abri } = await import(pathToFileURL(out).href);

let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const base = JSON.parse(readFileSync(join(ROOT, "params.json"), "utf8"));
{
  // site/three.js est ce que la page charge : meme three que celui qui mesure la scene ici
  const fenetre = {}; vm.runInNewContext(readFileSync(join(ROOT, "site/three.js"), "utf8"), { window: fenetre, self: fenetre });
  ok(fenetre.ABRI_THREE?.three?.REVISION === THREE.REVISION, "meme version de three dans le test et sur le site (r" + fenetre.ABRI_THREE?.three?.REVISION + ")");
}

// l'abri actuel, puis les etudes figees (angles aigus, toit vers la droite) : la scene tient pour toute forme
const fixture = (n) => JSON.parse(readFileSync(join(ROOT, `tests/fixtures/etude-v${n}.json`), "utf8"));
for (const [nom, p] of [["abri actuel", base], ["etude v1", fixture(1)], ["etude v2", fixture(2)], ["etude v3", fixture(3)]]) {
console.log(`\n— ${nom} —`);
const a = calcule_abri(p), d = a.core.modele3d, m = a.m, v = a.v;
ok(!!d && d.murs.length === m.faces.length, "modele3d : un mur par face (" + d.murs.length + ")");

const racine = new THREE.Group();
const groupes = peuple_abri(racine, d, { toit: true, mobilier: true, etiquettes: true });
// points de vue : la vue principale depuis le jardin (+z), la vignette de la porte a droite (+x), l'arriere derriere (-z), le dessus tres haut
ok(Object.keys(VUES).join() === "jardin,droite,arriere,porte,interieur,lit,lit2" && VUES.jardin.position[2] > 3 && VUES.porte.etats.murs === 2 && VUES.porte.etats.toit === 0 && VUES.arriere.position[2] < -3 && VUES.droite.position[0] < -2 && Object.values(VUES).every((v) => v.titre.length > 5 && v.etats && Object.keys(v.etats).length === 7), "six points de vue fixes, chacun avec ses sept états d'options");
ok(["porte", "interieur", "lit", "lit2"].every((k) => JSON.stringify([VUES[k].position, VUES[k].cible, VUES[k].fov]) === JSON.stringify([VUES.interieur.position, VUES.interieur.cible, VUES.interieur.fov])) && VUES.interieur.position[1] > 4, "les quatre vues de l'intérieur partagent la même caméra, vue de haut");
ok(VUES.jardin.etats.toit === 1 && VUES.jardin.etats.murs === 1 && VUES.jardin.etats.mobilier === 1 && VUES.jardin.etats.cloture === 0 && VUES.interieur.etats.toit === 0 && VUES.interieur.etats.murs === 2 && VUES.interieur.etats.personne === 2 && VUES.interieur.etats.mobilier === 1 && VUES.lit.etats.mobilier === 2 && VUES.lit.etats.personne === 2 && VUES.lit.etats.murs === 2 && VUES.arriere.etats.porte === 2, "états : jardin = départ, au bureau = assise, lit déplié = couchée, passage = porte fermée");
ok(groupes.murs && groupes.murs.visible && groupes.coupe && groupes.coupe.value === 100 && groupes.murs.children.filter((o) => o.isMesh && o.geometry.type === "ExtrudeGeometry").every((o) => o.material.onBeforeCompile && !o.material.transparent), "murs : leur groupe, la coupe inactive au départ (100 m), chaque paroi porte la coupe nette (sans transparence)");
ok(groupes.cloture.visible === true && groupes.cloture.children.some((o) => o.isMesh && o.material.transparent && o.material.opacity < 0.5), "clôture : visible et translucide au départ");
ok(groupes.porte.children[0].children.filter((o) => o.isMesh && o.geometry.type === "CylinderGeometry").length >= 4 && groupes.porte.children[0].children.filter((o) => o.isMesh && o.geometry.type === "BoxGeometry").length >= 3, "porte : béquille, tige et cylindre de serrure sur chaque face du battant");
racine.updateMatrixWorld(true);
let meshes = 0, nan = 0;
racine.traverse((o) => { if (o.isMesh) { meshes++; const p = o.geometry.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) nan++; } });
ok(meshes > 40 && nan === 0, meshes + " maillages, aucune coordonnee NaN ou infinie");
ok(["toit", "mobilier", "lit", "lit2", "sieges", "sieges_ranges", "sieges_ranges2", "etiquettes", "personne", "personne_dedans", "personne_assise", "personne_couchee", "personne_couchee2", "porte", "porte_fermee"].every((k) => groupes[k]) && groupes.lit2.visible === false && groupes.personne_couchee2.visible === false && groupes.lit.visible === false && groupes.sieges_ranges.visible === false && groupes.personne.visible === false && groupes.personne_dedans.visible === false && groupes.personne_assise.visible === false && groupes.personne_couchee.visible === false && groupes.porte_fermee.visible === false && groupes.toit.visible === true && groupes.sieges.visible === true && groupes.porte.visible === true && groupes.porte.children.length === 1, "groupes masquables : lit, sieges ranges, personne (dehors, dedans, assise, couchee) et porte fermee caches au depart ; toit, sieges, porte ouverte visibles");

// centre du repere : milieu de la dalle en x, et le meme decalage en y que le viewer
const xs = d.dalle.map((z) => z[0]), ys = d.dalle.map((z) => z[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2 - 60;
const monde = (x, y, h) => [(x - cx) / 100, h / 100, -(y - cy) / 100];
// boite PRECISE (sommets reels) : la boite rapide de three enveloppe la boite locale d'un mur tourne, pas sa vraie forme
const boite = (o) => new THREE.Box3().setFromObject(o, true);

// chaque mur : sa boite englobante doit etre celle du segment [de, a] epaissi vers l'INTERIEUR, de 0 a la hauteur des murs
const paroi = groupes.murs.children;
{
  // sieges ranges : memes sieges pousses sous leur bureau ; personne assise a la place du fauteuil ; couchee sur le lit
  const fauteuil = v.sieges.find((s) => /fauteuil/.test(s.type)), lit3 = d.mobilier.lit;
  const b_ass = boite(groupes.personne_assise), b_cou = boite(groupes.personne_couchee), b_rang = boite(groupes.sieges_ranges), b_sieges = boite(groupes.sieges);
  ok(groupes.sieges_ranges.children.length === groupes.sieges.children.length && b_rang.min.x < b_sieges.min.x - 0.3, "sieges ranges : autant de pieces, poussees vers le bureau gauche");
  // le dossier range (piece la plus haute du fauteuil) ne traverse pas le plateau du bureau gauche
  const bureau_g = groupes.mobilier.children.find((o) => o.isMesh && boite(o).max.y > 0.7 && boite(o).max.y < 0.9 && (boite(o).max.z - boite(o).min.z) > 2);
  const dossier = groupes.sieges_ranges.children.filter((o) => o.isMesh).sort((p, q) => boite(q).max.y - boite(p).max.y)[0];
  ok(!bureau_g || !dossier || !boite(dossier).intersectsBox(boite(bureau_g)), "sieges ranges : le dossier du fauteuil ne traverse pas le plateau du bureau");
  ok(!fauteuil || (b_ass.max.y > 1.1 && b_ass.max.y < 1.5 && near(b_ass.min.y, d.sol.epaisseur_cm / 100, 0.02)), "personne assise : tete entre 1,10 et 1,50 m, pieds sur le plancher");
  ok(!lit3 || (b_cou.max.y < 1.0 && b_cou.min.y > 0.4 && Math.max(b_cou.max.z - b_cou.min.z, b_cou.max.x - b_cou.min.x) > 1.5), "personne couchee : allongee sur le lit, sous 1 m de haut, longue de plus de 1,5 m");
  // lit 2 : en biais (ni parallele a x ni a z), la personne couchee dessus, le fauteuil pousse vers la facade (+z monde)
  if (d.mobilier.lit2) {
    const b2 = boite(groupes.lit2), bc2 = boite(groupes.personne_couchee2), r2 = boite(groupes.sieges_ranges2), r1 = boite(groupes.sieges_ranges);
    const q2 = d.mobilier.lit2.polygone, dx = Math.abs(q2[1][0] - q2[0][0]), dy = Math.abs(q2[1][1] - q2[0][1]);
    ok(dx > 20 && dy > 20 && bc2.max.y < 1.0 && bc2.min.y > 0.4 && b2.intersectsBox(bc2), "lit 2 : en biais, personne couchee dessus");
    // le fauteuil range (sa piece la plus haute = le dossier, et son assise) reste hors du polygone du lit 2, en coordonnees du plan
    const fauteuil2 = groupes.sieges_ranges2.children.filter((o) => o.isMesh).sort((p, q) => boite(q).max.y - boite(p).max.y)[0], bf2 = boite(fauteuil2);
    const plan = (X, Z) => [X * 100 + cx, -Z * 100 + cy];
    const dedans_lit = (pt) => q2.every((a, i) => { const b = q2[(i + 1) % q2.length]; return (b[0] - a[0]) * (pt[1] - a[1]) - (b[1] - a[1]) * (pt[0] - a[0]) >= -0.5; });
    const coins = [[bf2.min.x, bf2.min.z], [bf2.max.x, bf2.min.z], [bf2.max.x, bf2.max.z], [bf2.min.x, bf2.max.z]].map(([X, Z]) => plan(X, Z));
    const bureau_av3 = groupes.mobilier.children.find((o) => o.isMesh && boite(o).max.z > 0.5 && (boite(o).max.x - boite(o).min.x) > 1.5);
    // toutes les pieces du fauteuil range (celles hors du coin du tabouret), de l'assise au dossier
    const bm = boite(groupes.murs), fauteuil_pieces = groupes.sieges_ranges2.children.filter((o) => o.isMesh && boite(o).max.x < bm.max.x - 0.45), uf = new THREE.Box3(); fauteuil_pieces.forEach((o) => uf.union(boite(o)));
    const bav = boite(bureau_av3);
    ok(bureau_av3 && uf.max.z > bav.max.z - 0.1 && uf.min.z < bav.min.z && !coins.some(dedans_lit), "lit 2 : le fauteuil est cale sous le bureau de facade (du mur jusque dans la piece) et ne chevauche pas le lit");
    // le dossier du fauteuil range est tourne vers la piece (etroit en z, large en x) ; le tabouret est dans le coin avant droit
    ok((bf2.max.x - bf2.min.x) > (bf2.max.z - bf2.min.z) * 3, "lit 2 : le fauteuil est tourne, dossier face a la piece");
    const tab2 = groupes.sieges_ranges2.children.filter((o) => o.isMesh && o.geometry.type === "BufferGeometry").sort((p, q) => boite(q).max.x - boite(p).max.x)[0], bt2 = boite(tab2);
    ok(bt2.max.x > bm.max.x - 0.16 && bt2.max.z > bm.max.z - 0.16, "lit 2 : le tabouret est dans le coin avant droit");
    // la tete du lit 2 (l'oreiller, piece la plus haute) est du cote de la porte (x max), pas sous le bureau gauche
    const oreiller2 = groupes.lit2.children.filter((o) => o.isMesh && o.geometry.type === "BufferGeometry").sort((p, q) => boite(q).max.y - boite(p).max.y)[0];
    ok(boite(oreiller2).min.x > (b2.min.x + b2.max.x) / 2, "lit 2 : l'oreiller est du cote de la porte");
    const mi = boite(groupes.sieges_mi);
    ok(mi.min.x < boite(groupes.sieges).min.x - 0.15 && mi.min.x > r1.min.x + 0.15, "rien d'utilise : le fauteuil est a moitie rentre sous le bureau");
  }
}
ok(groupes.lit.children.filter((o) => o.isMesh && o.geometry.type === "BufferGeometry").length === 4 && groupes.lit.children.some((o) => o.material.color && o.material.color.getHex() === 0xe3dff0 && boite(o).max.y > boite(groupes.lit.children[0]).max.y), "lit : sommier, matelas, drap et oreiller lavande au-dessus");
const murs = paroi.filter((o) => o.isMesh && o.geometry.type === "ExtrudeGeometry" && Math.abs(boite(o).min.y) < 1e-6 && boite(o).max.y > 2);
ok(murs.length === d.murs.length, "un volume de mur par face (" + murs.length + ")");
const centre_abri = v.polygone.reduce((s, z) => [s[0] + z[0] / v.polygone.length, s[1] + z[1] / v.polygone.length], [0, 0]);
d.murs.forEach((f, i) => {
  const b = boite(murs[i]), A = monde(f.de[0], f.de[1], 0), B = monde(f.a[0], f.a[1], 0), ep = d.epaisseur_cm / 100;
  const dans = (P) => P[0] >= b.min.x - 1e-6 && P[0] <= b.max.x + 1e-6 && P[2] >= b.min.z - 1e-6 && P[2] <= b.max.z + 1e-6;
  // l'epaisseur part vers le centre de l'abri : le milieu du mur recule de ep / 2 vers l'interieur reste dans la boite
  const mx = (f.de[0] + f.a[0]) / 2, my = (f.de[1] + f.a[1]) / 2, l = Math.hypot(centre_abri[0] - mx, centre_abri[1] - my);
  const dedans = monde(mx + (centre_abri[0] - mx) / l * (d.epaisseur_cm / 2), my + (centre_abri[1] - my) / l * (d.epaisseur_cm / 2), 0);
  const dehors = monde(mx - (centre_abri[0] - mx) / l * (d.epaisseur_cm * 2), my - (centre_abri[1] - my) / l * (d.epaisseur_cm * 2), 0);
  const droit = Math.abs(f.de[0] - f.a[0]) < 1e-6 || Math.abs(f.de[1] - f.a[1]) < 1e-6;
  ok(dans(A) && dans(B) && near(b.max.y, f.hauteur_mur_cm / 100, 1e-6) && dans(dedans) && (!droit || !dans(dehors)), `mur ${f.cle} : posé sur son tracé, haut de ${f.hauteur_mur_cm} cm, épaisseur vers l'intérieur`);
  void ep;
});

// enveloppe des murs = emprise de l'abri, a l'epaisseur pres
const tout = new THREE.Box3(); murs.forEach((o) => tout.union(boite(o)));
const px = v.polygone.map((z) => z[0]), py = v.polygone.map((z) => z[1]);
// coupes d'onglet : aucun mur ne depasse du trace de l'abri, meme a un angle aigu (etudes v1 et v2)
ok(murs.every((o) => { const b = boite(o); return b.min.x >= (Math.min(...px) - cx) / 100 - 1e-4 && b.max.x <= (Math.max(...px) - cx) / 100 + 1e-4 && -b.max.z >= (Math.min(...py) - cy) / 100 - 1e-4 && -b.min.z <= (Math.max(...py) - cy) / 100 + 1e-4; }), "aucun mur ne traverse son voisin (angles " + m.angles_deg.join(" · ") + ")");
ok(near(tout.max.x - tout.min.x, (Math.max(...px) - Math.min(...px)) / 100, 0.001) && near(tout.max.z - tout.min.z, (Math.max(...py) - Math.min(...py)) / 100, 0.001), `emprise 3D des murs = ${((tout.max.x - tout.min.x)).toFixed(2)} × ${((tout.max.z - tout.min.z)).toFixed(2)} m, celle du plan`);

// toit : pose sur le plan du toit, haut du cote haut, bas du cote de l'egout, au-dessus de tous les murs
const toit = groupes.toit.children.find((o) => o.isMesh && o.geometry.type === "BufferGeometry");
const bt = boite(toit), pl = d.toit.plan, ept = d.toit.epaisseur_cm;
// le plan du toit se prolonge sur les debords : le point haut est au bord du debord cote haut, pas a l'aplomb du mur
const h_plan = (z) => pl.haut_cm - (pl.haut_cm - pl.bas_cm) * ((pl.sens === "droite" ? z[0] : z[1]) - pl.origine_cm) / pl.course_cm;
const haut_attendu = Math.max(...d.toit.contour.map(h_plan)) + ept;
ok(near(bt.max.y, haut_attendu / 100, 0.002) && haut_attendu >= pl.haut_cm + ept - 1e-6 && haut_attendu < pl.haut_cm + ept + 3, "toit : point haut a " + haut_attendu.toFixed(1) + " cm = plan du toit au bord du debord haut + epaisseur (a l'aplomb du mur : " + (pl.haut_cm + ept) + ")");
ok(bt.min.y >= (pl.bas_cm - 5) / 100 && bt.min.y <= pl.bas_cm / 100 + 1e-6, "toit : point bas au niveau de la tete des murs cote egout, debord compris (" + (bt.min.y * 100).toFixed(1) + " cm)");
{
  // le cote haut est bien celui que dit le plan : a droite le toit doit etre PLUS BAS qu'a gauche (sens droite), au fond plus bas que devant (sens arriere)
  const pos = toit.geometry.attributes.position.array; let hautG = -1, hautD = -1, hautAv = -1, hautFd = -1;
  for (let i = 0; i < pos.length; i += 3) { const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]]; if (x < bt.min.x + 0.01) hautG = Math.max(hautG, y); if (x > bt.max.x - 0.01) hautD = Math.max(hautD, y); if (z > bt.max.z - 0.01) hautAv = Math.max(hautAv, y); if (z < bt.min.z + 0.01) hautFd = Math.max(hautFd, y); }
  ok(pl.sens === "droite" ? hautG > hautD + 0.15 : hautAv > hautFd + 0.15, `toit : penche vers ${pl.sens === "droite" ? "la droite (gauche " + (hautG * 100).toFixed(0) + " cm, droite " + (hautD * 100).toFixed(0) + " cm)" : "le fond"}`);
}
// rehausse : autant de pieces que le debit, chacune entre la tete du mur et le dessous du toit
const rehausses = paroi.filter((o) => o.isMesh && o.geometry.type === "ExtrudeGeometry" && boite(o).min.y > 2);
ok(rehausses.length === m.rehausse.pieces.length && rehausses.every((o) => near(boite(o).min.y, m.hauteur_mur_cm / 100, 1e-6) && boite(o).max.y <= pl.haut_cm / 100 + 1e-6), rehausses.length + " pièces de rehausse, de la tête des murs au dessous du toit");
ok(d.rehausse_pieces.length === m.rehausse.pieces.length && d.rehausse_pieces.every((r) => /^R\d$/.test(r.id) && d.murs.some((w) => w.cle === r.face)), "modele3d : une étiquette R1..R" + d.rehausse_pieces.length + " par pièce de rehausse, chacune sur sa face");
// gouttiere : un troncon par bord d'egout, sous le bord du toit ; descente jusqu'au sol
const gouttieres = groupes.toit.children.filter((o) => o.isMesh && o.geometry.type === "BoxGeometry" && o.geometry.parameters.depth === 0.11);
ok(gouttieres.length === d.gouttiere.troncons.length, gouttieres.length + " tronçon(s) de gouttière, comme le modèle");
const tuyau = groupes.toit.children.find((o) => o.isMesh && o.geometry.type === "CylinderGeometry");
ok(tuyau && near(boite(tuyau).min.y, 0, 0.001) && boite(tuyau).max.y > 1.9, "descente du toit jusqu'au sol");
// porte : un battant, sorti vers l'exterieur (au-dela du mur de la porte), pas vers l'interieur
{
  const fp = d.murs[v.porte.cote], battant = groupes.porte.children.find((o) => o.isGroup && o.children.length >= 1 && o.children[0].geometry.type === "BoxGeometry");
  const bb = boite(battant), xmur = monde(fp.de[0], fp.de[1], 0)[0];
  ok(!!battant && bb.max.x > xmur + 0.3 && bb.min.x > xmur - 0.1, "porte : battant entrouvert vers l'extérieur du mur " + fp.cle);
  const bf = boite(groupes.porte_fermee);
  ok(bf.max.x < xmur + 0.08 && bf.min.x > xmur - d.epaisseur_cm / 100 - 0.08 && near(bf.max.y, v.porte.hauteur_cm / 100, 1e-6), "porte fermée : le battant reste dans l'épaisseur du mur " + fp.cle + " (poignées comprises)");
  // silhouette : 1,80 m de haut, pieds au sol, hors des murs, devant la porte
  const bp = boite(groupes.personne), sp = monde(fp.de[0] + (fp.a[0] - fp.de[0]) * (v.porte.debut_cm + v.porte.largeur_cm / 2) / fp.longueur_cm, fp.de[1] + (fp.a[1] - fp.de[1]) * (v.porte.debut_cm + v.porte.largeur_cm / 2) / fp.longueur_cm, 0);
  ok(near(bp.max.y, 1.8, 1e-6) && near(bp.min.y, 0, 1e-6) && bp.min.x > tout.max.x - 1e-6 && Math.abs((bp.min.z + bp.max.z) / 2 - sp[2] - 0.3) < 0.05 && !boite(battant).intersectsBox(bp), "personne : 1,80 m, pieds au sol, dehors, 30 cm devant la porte du mur " + fp.cle + ", hors du battant");
  const bd = boite(groupes.personne_dedans), sol_h = d.sol.epaisseur_cm / 100;
  ok(near(bd.max.y, 1.8 + sol_h, 1e-6) && near(bd.min.y, sol_h, 1e-6) && bd.max.x < tout.max.x && bd.min.x > tout.min.x && -bd.max.z > -tout.max.z && -bd.min.z < -tout.min.z, "personne dedans : sur le plancher, à l'intérieur des murs, à 60 cm du seuil");
}
// mobilier : bureaux a hauteur de table, dans l'emprise interieure
const bureaux = groupes.mobilier.children.filter((o) => o.isMesh);
ok(bureaux.length === v.bureaux.length && bureaux.every((o) => near(boite(o).max.y, (d.sol.epaisseur_cm + 75) / 100, 1e-6) && boite(o).min.x >= tout.min.x && boite(o).max.x <= tout.max.x), bureaux.length + " bureaux, plateau a 75 cm du plancher, dans les murs");
// dalle et murs de propriete
{
  const palissades = d.murs_propriete.filter((w) => w.type === "palissade"), grillages = d.murs_propriete.filter((w) => w.type === "grillage");
  const h = palissades[0].hauteur_cm / 100, hg = grillages[0].hauteur_cm / 100;
  const treillis = racine.children.filter((o) => o.isMesh && o.geometry.type === "PlaneGeometry" && o.material.transparent && near(boite(o).max.y, hg, 1e-6) && near(boite(o).min.y, 0, 1e-6));
  const poteaux = racine.children.filter((o) => o.isMesh && o.geometry.type === "CylinderGeometry" && near(boite(o).max.y, hg, 1e-3) && near(boite(o).min.y, -0.14, 1e-3));
  ok(hg === 1 && h === 1.8, "grillage à 1 m (mesuré), palissade à 180 cm (hypothèse)");
  ok(d.murs_propriete.length === 3 && palissades.length === 1 && palissades[0].cote === "arriere_droite" && grillages.map((w) => w.cote).sort().join() === "arriere_gauche,gauche" && !d.murs_propriete.some((w) => w.type === "mur"), "limites : une palissade bois (grand pan de 258) et deux grillages (gauche, petit pan de 104)");
  ok(treillis.length === grillages.length && poteaux.length >= 2 * grillages.length + 1, `3D : ${treillis.length} treillis translucides de ${grillages[0].hauteur_cm} cm, ${poteaux.length} poteaux de grillage`);
  // palissade : groupe cloture, poteaux carres et panneaux bombes de 4 cm, jamais plus haut que h + 15 cm au milieu, pas de volume plein
  const cl = groupes.cloture, bc = boite(cl), po = cl.children.filter((o) => o.isMesh && o.geometry.type === "BoxGeometry"), pan = cl.children.filter((o) => o.isGroup);
  ok(!!cl && po.length >= 2 && pan.length === po.length - 1 && bc.max.y <= h + 0.16 && bc.max.y > h + 0.05 && pan.every((g) => { const m = g.children.find((o) => o.isMesh); m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; return b.max.z - b.min.z < 0.05 && b.max.y > h - 0.01; }), `palissade : ${po.length} poteaux, ${pan.length} panneaux bombés, ${palissades[0].epaisseur_cm} cm d'épaisseur, haut à ${(bc.max.y * 100).toFixed(0)} cm`);
  ok(!racine.children.some((o) => o.isMesh && o.geometry.type === "BufferGeometry" && near(boite(o).max.y, h, 1e-6) && near(boite(o).min.y, -0.14, 1e-6) && (boite(o).max.x - boite(o).min.x) * (boite(o).max.z - boite(o).min.z) > 0.5), "plus aucun mur plein de 15 cm autour de la dalle");
}

}

console.log(fails ? `\n${fails} echec(s) 3D.` : "\nScene 3D de l'abri OK ✓");
process.exit(fails ? 1 : 0);
