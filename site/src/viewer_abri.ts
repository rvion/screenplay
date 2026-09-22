// Scene Three.js de l'abri retenu : N murs sur un contour quelconque (convexe), toit plan dans un
// sens ou l'autre. Tout vient de core.modele3d (cm, repere de la dalle) ; rien n'est cote ici.
// THREE vient de site/three.js (window.ABRI_THREE, scripts/bundle-site.mjs).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type Vec = any;
type Pt = number[];

export interface AbriViewer {
  rebuild(data: any): void; montrer(nom: Masquable, oui: boolean): void; voir(vue: NomVue): void; vignette(canvas: HTMLCanvasElement, vue: NomVue): void;
  etat(): EtatCamera; regler(o: { fov?: number; distance?: number }): void; placer(e: Partial<EtatCamera>): void; surChangement(cb: (e: EtatCamera) => void): void;
}
export interface EtatCamera { position: number[]; cible: number[]; fov: number; distance: number }
// etats des options de la scene (0 = eteint ; porte 1 ouverte 2 fermee ; personne 1 dehors 2 dedans ; cloture 0 translucide 1 pleine 2 absente)
export type Etats = { toit: number; murs: number; porte: number; mobilier: number; etiquettes: number; personne: number; cloture: number };
// toit : 0 sans, 1 plein, 2 voile ; murs : 0 sans, 1 pleins, 2 coupes a 1 m, 3 voiles, 4 sans les faces D et C ; porte : 0 sans, 1 ouverte, 2 fermee, 3 fermee voilee ;
// mobilier : 0 rien d'utilise (siege range), 1 au bureau (siege tire), 2 couche (siege range) ;
// le lit est pose a demeure : il est toujours la, comme le bureau ;
// personne : 0 sans, 1 dehors, 2 dedans (debout, assise au bureau ou couchee selon le mobilier)
export const ETATS_DEFAUT: Etats = { toit: 1, murs: 1, porte: 1, mobilier: 1, etiquettes: 1, personne: 0, cloture: 0 };
// la palissade : translucide pour voir l'abri derriere, pleine, ou absente (cachee a part)
export function cloture_pleine(gr: Vec, oui: boolean) {
  gr.traverse((o: any) => { if (o.isMesh) { o.material.transparent = !oui; o.material.opacity = oui ? 1 : 0.3; o.material.depthWrite = oui; o.castShadow = oui; } });
}
// voile : la meme paroi, vue au travers ; devoiler rend a chaque materiau son etat d'origine
// (le verre reste du verre)
export function voile(gr: Vec, oui: boolean, opacite = 0.28) {
  if (!gr) return;
  gr.traverse((o: any) => {
    if (!o.isMesh || o.material.map) return;
    // l'etat d'origine vit sur le materiau (partage entre maillages) et l'ombre sur le maillage
    const m = o.material, base = m.userData.avant_voile || (m.userData.avant_voile = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
    if (o.userData.ombre_avant_voile === undefined) o.userData.ombre_avant_voile = o.castShadow;
    m.transparent = oui || base.transparent; m.opacity = oui ? Math.min(opacite, base.opacity) : base.opacity;
    m.depthWrite = oui ? false : base.depthWrite; o.castShadow = oui ? false : o.userData.ombre_avant_voile;
  });
}
// vues fixes (metres, cible et angle) avec les etats d'options qui vont avec : la premiere est la vue de depart
const DEDANS = { position: [1.6, 4.6, 2.6], cible: [0, 0.6, 0], fov: 42 } as const;
// par le cote de la porte ouvert : faces D et C retirees, sans toit ni palissade
const OUVERT = { position: [3.7, 3.73, -1.67], cible: [-0.2, 1.09, 0.1], fov: 42 } as const;
const PAROIS_OUVERTES = { toit: 0, murs: 4, porte: 0, etiquettes: 0, personne: 2, cloture: 2 } as const;
export const VUES = {
  jardin: { titre: "Depuis le jardin", position: [3.3, 2.7, 4.3], cible: [0, 1, 0], fov: 42, etats: { ...ETATS_DEFAUT } },
  droite: { titre: "Vue de droite", position: [-2.52, 3.38, 4.61], cible: [-0.1, 0.9, 0.15], fov: 42, etats: { ...ETATS_DEFAUT } },
  arriere: { titre: "Derrière, le passage", position: [2.2, 3.4, -3.8], cible: [0, 0.8, -0.5], fov: 42, etats: { ...ETATS_DEFAUT, porte: 2 } },
  // les vues de l'interieur partagent une camera par groupe : seuls les etats changent d'une vignette a l'autre
  porte: { titre: "Côté porte", ...DEDANS, etats: { ...ETATS_DEFAUT, toit: 0, murs: 3, porte: 1, mobilier: 1, etiquettes: 0, personne: 1, cloture: 1 } },
  interieur: { titre: "Au bureau", ...DEDANS, etats: { ...ETATS_DEFAUT, toit: 0, murs: 2, porte: 2, mobilier: 1, personne: 2 } },
  debout: { titre: "Debout dedans, abri voilé", ...DEDANS, etats: { ...ETATS_DEFAUT, toit: 2, murs: 3, porte: 3, mobilier: 0, personne: 2, etiquettes: 0 } },
  dedans: { titre: "Dedans, côté porte ouvert", ...OUVERT, etats: { ...PAROIS_OUVERTES, mobilier: 1 } },
  couche: { titre: "Couché, les pieds vers les écrans", ...OUVERT, etats: { ...PAROIS_OUVERTES, mobilier: 2 } },
} as const;
export type NomVue = keyof typeof VUES;
// applique un jeu d'etats a la scene (sans toucher aux boutons de la page)
export function applique_etats(vue: AbriViewer, e: Etats) {
  vue.montrer("toit", e.toit > 0); vue.montrer("toit_voile", e.toit === 2); vue.montrer("etiquettes", e.etiquettes > 0);
  // sieges : a moitie rentres quand rien n'est utilise, tires quand on est au bureau, ranges quand un lit est deplie
  // le lit et son bureau sont poses a demeure : toujours visibles. Le mobilier ne dit que l'usage :
  // 0 rien (siege range), 1 au bureau (siege tire), 2 couche (siege range)
  vue.montrer("lit3", true); vue.montrer("bureaux3", true); vue.montrer("mobilier", false);
  vue.montrer("lit", false); vue.montrer("lit2", false);
  vue.montrer("sieges", e.mobilier === 1); vue.montrer("sieges_ranges3", e.mobilier !== 1);
  vue.montrer("sieges_mi", false); vue.montrer("sieges_ranges", false); vue.montrer("sieges_ranges2", false);
  vue.montrer("personne_couchee3", e.personne === 2 && e.mobilier === 2);
  // le lit se lit comme un canape, sauf quand on est couche dessus
  vue.montrer("couchage3", e.mobilier === 2); vue.montrer("canape3", e.mobilier !== 2);
  vue.montrer("porte", e.porte === 1); vue.montrer("porte_fermee", e.porte >= 2); vue.montrer("porte_voile", e.porte === 3);
  vue.montrer("personne", e.personne === 1);
  vue.montrer("personne_dedans", e.personne === 2 && e.mobilier === 0); vue.montrer("personne_assise", e.personne === 2 && e.mobilier === 1); vue.montrer("personne_couchee", false); vue.montrer("personne_couchee2", false);
  vue.montrer("cloture", e.cloture === 1); vue.montrer("cloture_absente", e.cloture === 2);
  vue.montrer("murs", e.murs > 0); vue.montrer("murs_coupes", e.murs === 2); vue.montrer("murs_voile", e.murs === 3);
  vue.montrer("murs_sans_DC", e.murs === 4);
}
export const LITS_MURAUX_MAX = 6;
// taille de la silhouette d'echelle, en metres
export const TAILLE_PERSONNE = 1.85;
export type Masquable = "toit" | "toit_voile" | "murs_voile" | "murs_sans_DC" | "porte_voile" | `couchage${number}` | `canape${number}` | "mobilier" | "lit" | `lit${number}` | `bureaux${number}` | "sieges" | "sieges_mi" | "sieges_ranges" | `sieges_ranges${number}` | "etiquettes" | "personne" | "personne_dedans" | "personne_assise" | "personne_couchee" | `personne_couchee${number}` | "porte" | "porte_fermee" | "cloture" | "cloture_absente" | "murs" | "murs_coupes";

// panneaux gris clair (RAL 9002), toit gris moyen, dalle beton, mur de propriete beige : chaque plan a sa teinte
const COUL = { mur: 0xdfe1dc, joint: 0x4a545e, bois: 0xc2955a, toit: 0x9aa3ab, nervure: 0x7f8992, dalle: 0xc9c5bb, propriete: 0xa89a86, sol: 0xb98d5c, bureau: 0xd9b98a, siege: 0x4b5a6a, lit: 0x8e6bb8, porte: 0x8d979f, cadre: 0xa9743f, verre: 0x9fd3e6, metal: 0xaab2b9, personne: 0x3a6ea5, grillage: 0x4f6b3f, palissade: 0x9a7248, poteau: 0x6f4f2e };

// plaque blanche a bord sombre, texte gras : lisible de loin sur un panneau clair comme sur le toit
function etiquette(txt: string): Vec | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const x = c.getContext("2d");
  if (!x) return null;
  x.fillStyle = "#1c2530"; x.beginPath(); x.roundRect(4, 4, 248, 120, 22); x.fill();
  x.fillStyle = "#ffffff"; x.beginPath(); x.roundRect(12, 12, 232, 104, 16); x.fill();
  // la police se reduit jusqu'a ce que le texte tienne dans la plaque (un repere court est gros, une taille de lit plus fine)
  let taille = 88;
  x.font = `bold ${taille}px system-ui, sans-serif`;
  while (x.measureText(txt).width > 212 && taille > 28) { taille -= 4; x.font = `bold ${taille}px system-ui, sans-serif`; }
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#1c2530"; x.fillText(txt, 128, 66);
  const t = new THREE.CanvasTexture(c);
  if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// grillage a mailles losange (chain-link) : une tuile de 5 cm, fils verts, vide entre les fils ; null sans canvas (tests Node)
let tuile_grillage: HTMLCanvasElement | null | undefined;
function texture_grillage(): Vec | null {
  if (tuile_grillage === undefined) tuile_grillage = dessine_tuile_grillage();
  if (!tuile_grillage) return null;
  const t = new THREE.CanvasTexture(tuile_grillage);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dessine_tuile_grillage(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const x = c.getContext("2d");
  if (!x) return null;
  x.clearRect(0, 0, 64, 64);
  x.strokeStyle = "#2f6b3a"; x.lineWidth = 5; x.lineCap = "round";
  // deux diagonales par tuile, prolongees pour que le motif se raccorde en se repetant
  for (const [a, b] of [[[-32, 32], [32, -32]], [[0, 64], [64, 0]], [[32, 96], [96, 32]], [[-32, 32], [32, 96]], [[0, 0], [64, 64]], [[32, -32], [96, 32]]]) {
    x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
  }
  return c;
}

// construit la scene de l'abri dans `abri` (sans renderer ni DOM : testable sous Node) ; rend les groupes masquables
export function peuple_abri(abri: Vec, data: any, visible_demande: Record<string, boolean> = {}): Record<string, Vec> {
  const groupes: Record<string, Vec> = {}, visible: Record<string, boolean> = { lit: false, lit2: false, couchage3: false, personne_couchee3: false, sieges_mi: false, sieges_ranges: false, sieges_ranges2: false, personne: false, personne_dedans: false, personne_assise: false, personne_couchee: false, personne_couchee2: false, porte_fermee: false, cloture: false, ...visible_demande };
  const mat = (couleur: number, extra: any = {}) => new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.8, side: THREE.DoubleSide, ...extra });
  const xs = data.dalle.map((z: Pt) => z[0]), ys = data.dalle.map((z: Pt) => z[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2 - 60;
  // plan (x vers la droite, y vers le fond, h vers le haut, en cm) -> monde (m) : la facade regarde +Z
  const W = (x: number, y: number, h: number) => new THREE.Vector3((x - cx) / 100, h / 100, -(y - cy) / 100);
  const groupe = (nom: string) => { const gr = new THREE.Group(); groupes[nom] = gr; gr.visible = visible[nom] !== false; abri.add(gr); return gr; };
  // coupe des parois : au-dessus de uCoupe (m) la matiere n'est pas dessinee, coupe nette ; 100 = pas de coupe
  const coupe = { value: visible.murs_coupes ? 1.0 : 100 };
  (groupes as any).coupe = coupe;
  const coupable = (m: Vec) => {
    m.onBeforeCompile = (sh: any) => {
      sh.uniforms.uCoupe = coupe;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vHaut;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvHaut = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vHaut; uniform float uCoupe;").replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vHaut > uCoupe) discard;");
    };
    return m;
  };
  const ombre = (mesh: Vec) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

  // prisme vertical sur un contour convexe, entre deux hauteurs donnees par sommet
  const prisme = (contour: Pt[], bas: (z: Pt) => number, haut: (z: Pt) => number) => {
    const n = contour.length, T = contour.map((z) => W(z[0], z[1], haut(z))), B = contour.map((z) => W(z[0], z[1], bas(z))), pts: Vec[] = [];
    for (let i = 1; i < n - 1; i++) { pts.push(T[0], T[i], T[i + 1]); pts.push(B[0], B[i + 1], B[i]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; pts.push(T[i], B[i], B[j], T[i], B[j], T[j]); }
    const geo = new THREE.BufferGeometry(); geo.setFromPoints(pts); geo.computeVertexNormals();
    return geo;
  };
  const plat = (h: number) => () => h;

  // dalle et murs de propriete
  abri.add(ombre(new THREE.Mesh(prisme(data.dalle, plat(-14), plat(0)), mat(COUL.dalle, { roughness: 0.95 }))));
  for (const w of data.murs_propriete) {
    const l = Math.hypot(w.a[0] - w.de[0], w.a[1] - w.de[1]) || 1, ux = (w.a[0] - w.de[0]) / l, uy = (w.a[1] - w.de[1]) / l;
    if (w.type === "grillage") {
      // grillage : mailles losange sur un plan (texture repetee, maille de 5 cm), poteaux tous les 2 m, lisse haute
      const tx = texture_grillage(), matP = mat(COUL.grillage, { metalness: 0.5, roughness: 0.5 });
      let matG: Vec;
      if (tx) { tx.repeat.set(l / 5, w.hauteur_cm / 5); matG = new THREE.MeshStandardMaterial({ map: tx, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 }); }
      else matG = mat(COUL.grillage, { transparent: true, opacity: 0.35, roughness: 0.6, metalness: 0.4 });
      const plan = new THREE.Mesh(new THREE.PlaneGeometry(l / 100, w.hauteur_cm / 100), matG);
      plan.rotation.y = Math.atan2(uy, ux);
      plan.position.copy(W(w.de[0] + ux * l / 2, w.de[1] + uy * l / 2, w.hauteur_cm / 2));
      abri.add(plan);
      const nb = Math.max(1, Math.round(l / 200));
      for (let k = 0; k <= nb; k++) {
        const t = k / nb, poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, (w.hauteur_cm + 14) / 100, 8), matP);
        poteau.position.copy(W(w.de[0] + ux * l * t, w.de[1] + uy * l * t, (w.hauteur_cm - 14) / 2)); abri.add(ombre(poteau));
      }
      const lisse = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, l / 100, 6), matP);
      lisse.rotation.z = Math.PI / 2; lisse.rotation.y = Math.atan2(uy, ux);
      lisse.position.copy(W(w.de[0] + ux * l / 2, w.de[1] + uy * l / 2, w.hauteur_cm)); abri.add(lisse);
      continue;
    }
    if (w.type === "palissade") {
      // palissade bois : poteaux carres a chaque travee, entre deux poteaux un panneau de planches a sommet bombe
      if (!groupes.cloture) { groupes.cloture = new THREE.Group(); abri.add(groupes.cloture); }
      const cl = groupes.cloture, e = w.epaisseur_cm / 100, h = w.hauteur_cm / 100;
      const matPl = new THREE.MeshStandardMaterial({ color: COUL.palissade, roughness: 0.85, side: THREE.DoubleSide }), matPo = new THREE.MeshStandardMaterial({ color: COUL.poteau, roughness: 0.9 });
      const nb = Math.max(1, Math.round(l / (w.travee_cm || 180))), travee = l / nb, ang = Math.atan2(uy, ux);
      for (let k = 0; k <= nb; k++) {
        const t = k / nb, hp = h + 0.2, poteau = new THREE.Mesh(new THREE.BoxGeometry(0.09, hp, 0.09), matPo);
        poteau.position.copy(W(w.de[0] + ux * l * t, w.de[1] + uy * l * t, (hp / 2 - 0.14) * 100)); poteau.rotation.y = ang; cl.add(ombre(poteau));
      }
      for (let k = 0; k < nb; k++) {
        // panneau : rectangle dont le bord haut est un arc bombe (15 cm plus bas aux poteaux qu'au milieu)
        const L = travee / 100 - 0.09, forme = new THREE.Shape(), bas = 0.08, creux = Math.min(0.15, h * 0.15);
        forme.moveTo(0, bas); forme.lineTo(L, bas); forme.lineTo(L, h - creux); forme.quadraticCurveTo(L / 2, h + creux, 0, h - creux); forme.closePath();
        const geo = new THREE.ExtrudeGeometry(forme, { depth: e, bevelEnabled: false });
        // planches : un joint tous les 12 cm, grave en lignes sombres
        const joints: number[] = [];
        for (let x = 0.12; x < L; x += 0.12) joints.push(x, bas, e + 0.001, x, h - creux, e + 0.001);
        const gj = new THREE.BufferGeometry(); gj.setAttribute("position", new THREE.Float32BufferAttribute(joints, 3));
        const panneau = new THREE.Group(); panneau.add(ombre(new THREE.Mesh(geo, matPl))); panneau.add(new THREE.LineSegments(gj, new THREE.LineBasicMaterial({ color: 0x5a3d22, transparent: true, opacity: 0.5 })));
        const t0 = (k * travee + 0.045) / l;
        panneau.position.copy(W(w.de[0] + ux * l * t0, w.de[1] + uy * l * t0, 0)); panneau.rotation.y = ang; cl.add(panneau);
      }
      continue;
    }
    const nx = uy * w.epaisseur_cm, ny = -ux * w.epaisseur_cm;
    abri.add(ombre(new THREE.Mesh(prisme([w.de, w.a, [w.a[0] + nx, w.a[1] + ny], [w.de[0] + nx, w.de[1] + ny]], plat(-14), plat(w.hauteur_cm)), mat(COUL.propriete, { roughness: 0.95 }))));
  }
  // plancher
  if (data.sol.epaisseur_cm > 0) abri.add(ombre(new THREE.Mesh(prisme(data.sol.polygone, plat(0.3), plat(data.sol.epaisseur_cm)), mat(COUL.sol))));

  const ep = data.epaisseur_cm, matMur = coupable(mat(COUL.mur, { metalness: 0.55, roughness: 0.38 })), matJoint = coupable(mat(COUL.joint)), matBois = coupable(mat(COUL.bois, { roughness: 0.85 }));
  const parois = groupe("murs");
  // aretes sombres sur les volumes : les angles se lisent meme sous une lumiere plate
  const matArete = coupable(new THREE.LineBasicMaterial({ color: 0x2c3640, transparent: true, opacity: 0.55 }));
  // les aretes sont relevees de 5 mm : celle du seuil, a y = 0, se battrait en profondeur avec le dessus de la dalle
  const aretes = (geo: Vec, deg = 25) => { const e = new THREE.EdgesGeometry(geo, deg); e.translate(0, 0.005, 0); return new THREE.LineSegments(e, matArete); };
  const etiq = groupe("etiquettes");
  for (const f of data.murs) {
    // tout ce que cette face ajoute portera sa lettre, pour les etats qui n'enlevent qu'une partie des murs
    const avant_paroi = parois.children.length, avant_etiq = etiq.children.length;
    const L = f.longueur_cm, ux = (f.a[0] - f.de[0]) / L, uy = (f.a[1] - f.de[1]) / L;
    // repere du mur : X le long du mur, Y vers le haut, Z vers l'exterieur (contour antihoraire, interieur a gauche)
    const base = new THREE.Matrix4().makeBasis(new THREE.Vector3(ux, 0, -uy), new THREE.Vector3(0, 1, 0), new THREE.Vector3(uy, 0, ux));
    base.setPosition(W(f.de[0], f.de[1], 0));
    const pose = (mesh: Vec, parent: Vec = parois) => { mesh.applyMatrix4(base); parent.add(mesh); return mesh; };
    // boite dans le repere du mur : s0..s1 le long, h0..h1 en hauteur, z0..z1 vers l'exterieur (cm)
    const boite = (s0: number, s1: number, h0: number, h1: number, z0: number, z1: number, m: Vec) => {
      const geo = new THREE.BoxGeometry((s1 - s0) / 100, (h1 - h0) / 100, (z1 - z0) / 100);
      geo.translate((s0 + s1) / 200, (h0 + h1) / 200, (z0 + z1) / 200);
      return ombre(new THREE.Mesh(geo, m));
    };
    // coupe d'onglet : la face interieure d'un mur est plus courte que sa face exterieure, de e / tan(angle / 2)
    // a chaque bout. Sans elle un mur a bouts droits traverse son voisin des que l'angle est aigu.
    // Seuls les sommets des deux bouts bougent : les ouvertures ne sont pas deformees.
    const onglet = (geo: Vec, e: number) => {
      const pos = geo.attributes.position, cot = (deg: number) => 1 / Math.tan((deg * Math.PI) / 360);
      const ka = cot(f.angle_debut_deg) * e / 100, kb = cot(f.angle_fin_deg) * e / 100;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getZ(i) > 1e-6) continue;                                // z = e : future face exterieure, inchangee ; z = 0 : face interieure
        const x = pos.getX(i);
        if (x < 1e-6) pos.setX(i, ka); else if (x > L / 100 - 1e-6) pos.setX(i, L / 100 - kb);
      }
      geo.translate(0, 0, -e / 100);
      geo.computeVertexNormals();
      return geo;
    };
    // panneau de mur : rectangle de la hauteur des murs, perce des ouvertures (cadre de porte compris)
    const forme = new THREE.Shape();
    forme.moveTo(0, 0); forme.lineTo(L / 100, 0); forme.lineTo(L / 100, f.hauteur_mur_cm / 100); forme.lineTo(0, f.hauteur_mur_cm / 100); forme.closePath();
    for (const o of f.ouvertures) {
      const ch = o.chambranle_cm || 0, s0 = (o.debut_cm - ch) / 100, s1 = (o.debut_cm + o.largeur_cm + ch) / 100, h0 = o.allege_cm / 100, h1 = (o.allege_cm + o.hauteur_cm + (o.type === "porte" ? ch : 0)) / 100;
      const trou = new THREE.Path();
      trou.moveTo(s0, h0); trou.lineTo(s0, h1); trou.lineTo(s1, h1); trou.lineTo(s1, h0); trou.closePath();
      forme.holes.push(trou);
    }
    const geoMur = onglet(new THREE.ExtrudeGeometry(forme, { depth: ep / 100, bevelEnabled: false }), ep);
    pose(ombre(new THREE.Mesh(geoMur, matMur)));
    pose(aretes(geoMur));
    // joints de panneaux et etiquettes
    for (const pn of f.panneaux) {
      if (pn.debut_cm > 0.5) pose(boite(pn.debut_cm - 0.5, pn.debut_cm + 0.5, 0, f.hauteur_mur_cm, -0.2, 0.4, matJoint));
      const tx = etiquette(pn.id);
      if (tx) {
        // au-dessus des fenetres (haut a 190), sous la tete du mur
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), coupable(new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false })));
        plaque.position.set((pn.debut_cm + pn.largeur_cm / 2) / 100, f.hauteur_mur_cm / 100 - 0.16, 0.012);
        pose(plaque, etiq);
      }
    }
    // rehausse bois : de la tete des panneaux au dessous du toit
    if (Math.max(f.hauteur_debut_cm, f.hauteur_fin_cm) > f.hauteur_mur_cm + 0.05) {
      const r = new THREE.Shape(), Hm = f.hauteur_mur_cm / 100;
      r.moveTo(0, Hm); r.lineTo(L / 100, Hm); r.lineTo(L / 100, f.hauteur_fin_cm / 100); r.lineTo(0, f.hauteur_debut_cm / 100); r.closePath();
      const geoR = onglet(new THREE.ExtrudeGeometry(r, { depth: data.rehausse_epaisseur_cm / 100, bevelEnabled: false }), data.rehausse_epaisseur_cm);
      pose(ombre(new THREE.Mesh(geoR, matBois)));
      pose(aretes(geoR));
      // etiquette R1..R4 la ou la bande est la plus haute (a 20 % du bout haut), plaque a la hauteur de la bande
      const pc = data.rehausse_pieces ? data.rehausse_pieces.find((x: any) => x.face === f.cle) : null;
      const tr = pc ? etiquette(pc.id) : null;
      if (tr) {
        const xr = f.hauteur_debut_cm >= f.hauteur_fin_cm ? 0.2 : 0.8, hr = (f.hauteur_debut_cm + (f.hauteur_fin_cm - f.hauteur_debut_cm) * xr) - Hm * 100;
        const haut = Math.min(0.13, Math.max(0.08, hr / 100 - 0.03));
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(haut * 2, haut), coupable(new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false })));
        plaque.position.set(xr * L / 100, Hm + hr / 200, 0.012);
        pose(plaque, etiq);
      }
    }
    for (const o of f.ouvertures) {
      if (o.type === "porte") {
        const ch = o.chambranle_cm || 0, s0 = o.debut_cm, s1 = o.debut_cm + o.largeur_cm, matCadre = coupable(mat(COUL.cadre));
        if (ch > 0) {
          pose(boite(s0 - ch, s0, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s1, s1 + ch, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s0, s1, o.hauteur_cm, o.hauteur_cm + ch, -ep, 0, matCadre));
        }
        // battant ferre du cote de la fin du mur : un groupe ouvert vers l'exterieur, un groupe ferme dans le cadre
        const matB = coupable(o.vitree === false ? mat(COUL.porte, { metalness: 0.2, roughness: 0.5 }) : mat(COUL.verre, { transparent: true, opacity: 0.45 }));
        const battant = (angle: number) => {
          const g = new THREE.Group(), geoB = new THREE.BoxGeometry(o.largeur_cm / 100, o.hauteur_cm / 100, 0.04);
          geoB.translate(-o.largeur_cm / 200, o.hauteur_cm / 200, 0);
          g.add(ombre(new THREE.Mesh(geoB, matB)));
          // poignee (bequille) et cylindre de serrure, cote oppose aux charnieres, a 1,05 m, sur les deux faces
          const matM = coupable(mat(COUL.metal, { metalness: 0.8, roughness: 0.3 })), xg = -o.largeur_cm / 100 + 0.09;
          for (const face of [1, -1]) {
            const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.006), matM); plaque.position.set(xg, 1.03, face * 0.023); g.add(plaque);
            const bequille = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 8), matM); bequille.rotation.z = Math.PI / 2; bequille.position.set(xg + 0.05, 1.06, face * 0.045); g.add(ombre(bequille));
            const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), matM); tige.rotation.x = Math.PI / 2; tige.position.set(xg, 1.06, face * 0.035); g.add(tige);
            const serrure = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10), mat(0x2b3138)); serrure.rotation.x = Math.PI / 2; serrure.position.set(xg, 0.98, face * 0.028); g.add(serrure);
          }
          g.position.set(s1 / 100, 0, -0.01); g.rotation.y = angle;
          return g;
        };
        pose(battant(1.15), groupes.porte || groupe("porte"));
        pose(battant(0), groupes.porte_fermee || groupe("porte_fermee"));
        // silhouette de 1,85 m pour l'echelle (cachee au depart) : devant la porte, ou dedans a 60 cm du seuil
        const matP = mat(COUL.personne, { roughness: 0.9 });
        const silhouette = (z: number, y: number, decale = 0) => {
          const corps = new THREE.Group();
          const jambe_h = 0.84 * (TAILLE_PERSONNE / 1.8), tronc_h = 0.66 * (TAILLE_PERSONNE / 1.8);
          for (const dx of [-0.09, 0.09]) { const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, jambe_h, 10), matP); jambe.position.set(dx, jambe_h / 2, 0); corps.add(ombre(jambe)); }
          const tronc = new THREE.Mesh(new THREE.BoxGeometry(0.42, tronc_h, 0.22), matP); tronc.position.y = jambe_h + tronc_h / 2; corps.add(ombre(tronc));
          const tete = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matP); tete.position.y = TAILLE_PERSONNE - 0.115; corps.add(ombre(tete));
          // sa taille, ecrite sur le torse : une etiquette qui fait toujours face a la camera
          const tx = etiquette(`${Math.round(TAILLE_PERSONNE * 100)} cm`);
          if (tx) {
            const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
            plaque.scale.set(0.34, 0.17, 1); plaque.position.set(0, 1.17, 0.13); corps.add(plaque);
          }
          corps.position.set((s0 + s1) / 200 + decale, y, z);
          return corps;
        };
        // dehors : 30 cm vers le debut du mur (la facade), hors de l'arc du battant
        pose(silhouette(0.45, 0, -0.3), groupe("personne"));
        pose(silhouette(-(ep + 60) / 100, data.sol.epaisseur_cm / 100), groupe("personne_dedans"));
      } else {
        const s0 = o.debut_cm, s1 = o.debut_cm + o.largeur_cm, h0 = o.allege_cm, h1 = o.allege_cm + o.hauteur_cm, matCadre = coupable(mat(0xf4f5f6)), c = 4;
        pose(boite(s0, s1, h0, h1, -ep / 2 - 0.6, -ep / 2 + 0.6, coupable(mat(COUL.verre, { transparent: true, opacity: 0.4, roughness: 0.1 }))));
        pose(boite(s0, s1, h0, h0 + c, -ep, 0.5, matCadre)); pose(boite(s0, s1, h1 - c, h1, -ep, 0.5, matCadre));
        pose(boite(s0, s0 + c, h0, h1, -ep, 0.5, matCadre)); pose(boite(s1 - c, s1, h0, h1, -ep, 0.5, matCadre));
        if (o.ouvrant) pose(boite((s0 + s1) / 2 - 1, (s0 + s1) / 2 + 1, h0, h1, -ep, 0.5, matCadre));
      }
    }
    for (const o of parois.children.slice(avant_paroi)) o.userData.face = f.cle;
    for (const o of etiq.children.slice(avant_etiq)) o.userData.face = f.cle;
  }

  // toit : plaque d'epaisseur constante posee sur le plan du toit, panneaux et nervures dans le sens de la pente
  const T = data.toit, pl = T.plan, droite = pl.sens === "droite";
  const hz = (z: Pt) => pl.haut_cm - (pl.haut_cm - pl.bas_cm) * ((droite ? z[0] : z[1]) - pl.origine_cm) / pl.course_cm;
  const toit = groupe("toit");
  const geoToit = prisme(T.contour, hz, (z) => hz(z) + T.epaisseur_cm);
  toit.add(ombre(new THREE.Mesh(geoToit, mat(COUL.toit, { metalness: 0.6, roughness: 0.42 }))));
  toit.add(aretes(geoToit));
  const matNerv = mat(COUL.nervure, { metalness: 0.6, roughness: 0.4 });
  const trait = (a: Pt, b: Pt, dessus: number, larg: number, m: Vec) => {
    const A = W(a[0], a[1], hz(a) + T.epaisseur_cm + dessus), B = W(b[0], b[1], hz(b) + T.epaisseur_cm + dessus), dir = new THREE.Vector3().subVectors(B, A), len = dir.length();
    if (len < 0.02) return;
    const barre = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, larg), m);
    barre.position.copy(A).addScaledVector(dir, 0.5);
    barre.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    toit.add(barre);
  };
  // coupe d'un polygone convexe par une droite parallele a la pente (k = abscisse transversale)
  const corde = (poly: Pt[], k: number): [Pt, Pt] | null => {
    const t = droite ? 1 : 0, hits: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[t] - k) * (b[t] - k) > 0 || a[t] === b[t]) continue;
      const u = (k - a[t]) / (b[t] - a[t]);
      hits.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]);
    }
    return hits.length >= 2 ? [hits[0], hits[hits.length - 1]] : null;
  };
  for (const pn of T.panneaux) {
    const t = droite ? 1 : 0, ks = pn.polygone.map((z: Pt) => z[t]), k0 = Math.min(...ks), k1 = Math.max(...ks);
    for (let k = k0 + 12.5; k < k1 - 1; k += 25) { const c = corde(pn.polygone, k); if (c) trait(c[0], c[1], 1.5, 0.03, matNerv); }
    const joint = corde(T.contour, k1 - 0.01);
    if (joint && k1 < Math.max(...T.contour.map((z: Pt) => z[t])) - 1) trait(joint[0], joint[1], 0.5, 0.012, matJoint);
    const mx = pn.polygone.reduce((s: number, z: Pt) => s + z[0], 0) / pn.polygone.length, my = pn.polygone.reduce((s: number, z: Pt) => s + z[1], 0) / pn.polygone.length;
    const tx = etiquette(pn.id);
    if (tx) {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
      plaque.position.copy(W(mx, my, hz([mx, my]) + T.epaisseur_cm + 6)); plaque.rotation.x = -Math.PI / 2;
      toit.add(plaque);
    }
  }
  // gouttiere sur chaque bord d'egout, descente
  const matMetal = mat(COUL.metal, { metalness: 0.6, roughness: 0.4 });
  for (const tr of data.gouttiere.troncons) {
    const l = Math.hypot(tr.a[0] - tr.de[0], tr.a[1] - tr.de[1]) || 1, nx = (tr.a[1] - tr.de[1]) / l * 6, ny = -(tr.a[0] - tr.de[0]) / l * 6;
    const A = W(tr.de[0] + nx, tr.de[1] + ny, hz(tr.de) - 5), B = W(tr.a[0] + nx, tr.a[1] + ny, hz(tr.a) - 5), dir = new THREE.Vector3().subVectors(B, A), len = dir.length();
    const g = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.11), matMetal);
    g.position.copy(A).addScaledVector(dir, 0.5); g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    toit.add(ombre(g));
  }
  const dsc = data.gouttiere.descente, hd = hz(dsc) - 8;
  const tuyau = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, hd / 100, 16), matMetal);
  tuyau.position.copy(W(dsc[0], dsc[1], hd / 2));
  toit.add(ombre(tuyau));

  // mobilier : bureaux toujours la ; sieges en place, ou ranges sous les bureaux quand le lit est deplie
  const mob = groupe("mobilier"), sol = data.sol.epaisseur_cm;
  for (const b of data.mobilier.bureaux) mob.add(ombre(new THREE.Mesh(prisme(b.polygone, plat(sol + 72), plat(sol + 75)), mat(COUL.bureau))));
  const sieges = groupe("sieges"), sieges_mi = groupe("sieges_mi"), sieges_ranges = groupe("sieges_ranges"), sieges_ranges2 = groupe("sieges_ranges2");
  const matPers = mat(COUL.personne, { roughness: 0.9 });
  // silhouette assise (cuisses vers +x, le bureau) ; le groupe est ensuite tourne vers le bureau
  const assise = (h_assise: number) => {
    const g = new THREE.Group();
    for (const dz of [-0.09, 0.09]) {
      const bas = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, h_assise, 10), matPers); bas.position.set(0.22, h_assise / 2, dz); g.add(ombre(bas));
      const cuisse = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.13), matPers); cuisse.position.set(0.1, h_assise + 0.06, dz); g.add(ombre(cuisse));
    }
    const tronc = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.42), matPers); tronc.position.set(-0.08, h_assise + 0.12 + 0.28, 0); g.add(ombre(tronc));
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matPers); tete.position.set(-0.06, h_assise + 0.12 + 0.56 + 0.115, 0); g.add(ombre(tete));
    return g;
  };
  // silhouette couchee le long de +x, la tete au bout +x, posee a la hauteur donnee
  const couchee = (h: number) => {
    const g = new THREE.Group();
    for (const dz of [-0.09, 0.09]) { const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.84, 10), matPers); jambe.rotation.z = Math.PI / 2; jambe.position.set(-0.48, h + 0.07, dz); g.add(ombre(jambe)); }
    const tronc = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.42), matPers); tronc.position.set(0.27, h + 0.1, 0); g.add(ombre(tronc));
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matPers); tete.position.set(0.72, h + 0.16, 0); g.add(ombre(tete));
    return g;
  };
  const p_assise = groupe("personne_assise"), p_couchee = groupe("personne_couchee"), p_couchee2 = groupe("personne_couchee2");
  // siege : assise, quatre pieds, et un dossier du cote oppose au bureau (fauteuil) ; le tabouret n'a pas de dossier
  const siege = (st: any, dans: Vec, dx = 0, dy = 0) => {
    const tabouret = /tabouret/.test(st.type), haut = tabouret ? 45 : 47, matS = mat(COUL.siege), q: Pt[] = st.polygone.map((z: Pt) => [z[0] + dx, z[1] + dy] as Pt), sieges = dans;
    const xs = q.map((z) => z[0]), ys = q.map((z) => z[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const marge = tabouret ? 2 : 4, a0 = x0 + marge, a1 = x1 - marge, b0 = y0 + marge, b1 = y1 - marge;
    sieges.add(ombre(new THREE.Mesh(prisme([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], plat(sol + haut - 5), plat(sol + haut)), matS)));
    for (const [px, py] of [[a0 + 3, b0 + 3], [a1 - 3, b0 + 3], [a1 - 3, b1 - 3], [a0 + 3, b1 - 3]]) {
      const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, (haut - 5) / 100, 8), matS);
      pied.position.copy(W(px, py, sol + (haut - 5) / 2)); sieges.add(ombre(pied));
    }
    if (!tabouret) {
      // dossier : contre = cote du bureau, le dossier est en face (bureau a gauche -> dossier a droite ; bureau devant -> dossier au fond)
      const d = st.contre === "gauche" ? [[a1 - 4, b0], [a1, b0], [a1, b1], [a1 - 4, b1]] : st.contre === "droite" ? [[a0, b0], [a0 + 4, b0], [a0 + 4, b1], [a0, b1]] : [[a0, b1 - 4], [a1, b1 - 4], [a1, b1], [a0, b1]];
      sieges.add(ombre(new THREE.Mesh(prisme(d as Pt[], plat(sol + haut), plat(sol + haut + 42)), matS)));
    }
    return { tabouret, haut, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, largeur: x1 - x0, profondeur: y1 - y0 };
  };
  for (const st of data.mobilier.sieges) {
    const s = siege(st, sieges);
    // range : pousse sous son bureau (a gauche pour le bureau gauche, vers la facade pour celui de facade)
    // pousse jusqu'a ce que le dossier arrive a 4 cm du bord du bureau (l'assise passe dessous, le dossier reste dehors, sans toucher)
    const pousse = st.contre === "gauche" ? [-(s.largeur - 12), 0] : st.contre === "droite" ? [s.largeur - 12, 0] : [0, -(s.profondeur - 12)];
    siege(st, sieges_ranges, pousse[0], pousse[1]);
    // rien d'utilise : a moitie rentre sous le bureau
    siege(st, sieges_mi, pousse[0] / 2, pousse[1] / 2);
    // lit 2 : les deux sieges sous le bureau de facade. Le fauteuil est tourne (dossier vers la piece) et cale
    // au mur a 4 cm ; le tabouret va dans le coin avant droit (contre le mur de la porte)
    const bureau_av = data.mobilier.bureaux.find((b: any) => b.cote === "avant");
    const avant_int = bureau_av ? Math.min(...bureau_av.polygone.map((z: Pt) => z[1])) : null;
    const droite_int = Math.max(...data.sol.polygone.map((z: Pt) => z[0]));
    if (avant_int === null) siege(st, sieges_ranges2, pousse[0], pousse[1]);
    else if (s.tabouret) siege(st, sieges_ranges2, (droite_int - 4 - s.largeur / 2) - s.cx, (avant_int + 4 + s.profondeur / 2) - s.cy);
    else {
      let dy = (avant_int + 4 + s.profondeur / 2) - s.cy, dx = 0;
      // s'il chevauche le lit 2, glisse vers la gauche
      if (data.mobilier.lit2) {
        const bed: Pt[] = data.mobilier.lit2.polygone;
        const dedans = (pt: Pt) => bed.every((a, i) => { const b = bed[(i + 1) % bed.length]; return (b[0] - a[0]) * (pt[1] - a[1]) - (b[1] - a[1]) * (pt[0] - a[0]) >= -0.01; }) || bed.every((a, i) => { const b = bed[(i + 1) % bed.length]; return (b[0] - a[0]) * (pt[1] - a[1]) - (b[1] - a[1]) * (pt[0] - a[0]) <= 0.01; });
        const chevauche = (ddx: number) => {
          const x0 = s.cx - s.largeur / 2 + ddx, x1 = s.cx + s.largeur / 2 + ddx, y0 = s.cy - s.profondeur / 2 + dy, y1 = s.cy + s.profondeur / 2 + dy;
          const coins: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
          return coins.some(dedans) || bed.some((z) => z[0] >= x0 && z[0] <= x1 && z[1] >= y0 && z[1] <= y1);
        };
        while (dx >= pousse[0] && chevauche(dx)) dx -= 5;
      }
      siege({ ...st, contre: "avant" }, sieges_ranges2, dx, dy);
    }
    // la personne assise sur le fauteuil, tournee vers son bureau
    if (!s.tabouret) {
      const g = assise(s.haut / 100);
      g.rotation.y = st.contre === "gauche" ? Math.PI : st.contre === "droite" ? 0 : -Math.PI / 2;
      g.position.copy(W(s.cx, s.cy, sol)); p_assise.add(g);
    }
  }
  // lit deplie (quelle que soit son orientation) : sommier, matelas, drap sur les deux tiers du pied, oreiller a la tete ;
  // la tete est au bout le plus au fond ; la personne couchee le long du lit, la tete sur l'oreiller
  // tete : "fond" = le petit cote le plus au fond, "droite" = le plus a droite (vers la porte), "gauche" = le plus a gauche
  const fait_lit = (q: Pt[], dans: Vec, qui: Vec, tete_vers: "fond" | "droite" | "gauche" = "fond", couchage: Vec = dans, canape: Vec | null = null) => {
    const cotes = q.map((a, i) => ({ a, b: q[(i + 1) % 4], l: Math.hypot(q[(i + 1) % 4][0] - a[0], q[(i + 1) % 4][1] - a[1]) }));
    const k = tete_vers === "fond" ? 1 : 0, sens = tete_vers === "gauche" ? -1 : 1;
    const courts = cotes.filter((c) => c.l < (cotes[0].l + cotes[1].l) / 2).sort((c1, c2) => sens * ((c1.a[k] + c1.b[k]) - (c2.a[k] + c2.b[k])));
    const pied = courts[0], tete = courts[courts.length - 1];
    const mp: Pt = [(pied.a[0] + pied.b[0]) / 2, (pied.a[1] + pied.b[1]) / 2], mt: Pt = [(tete.a[0] + tete.b[0]) / 2, (tete.a[1] + tete.b[1]) / 2];
    const L = Math.hypot(mt[0] - mp[0], mt[1] - mp[1]) || 1, ux = (mt[0] - mp[0]) / L, uy = (mt[1] - mp[1]) / L, nx = -uy, ny = ux, lw = pied.l;
    const rect = (s0: number, s1: number, marge: number): Pt[] => [[mp[0] + ux * s0 + nx * (-lw / 2 + marge), mp[1] + uy * s0 + ny * (-lw / 2 + marge)], [mp[0] + ux * s1 + nx * (-lw / 2 + marge), mp[1] + uy * s1 + ny * (-lw / 2 + marge)], [mp[0] + ux * s1 + nx * (lw / 2 - marge), mp[1] + uy * s1 + ny * (lw / 2 - marge)], [mp[0] + ux * s0 + nx * (lw / 2 - marge), mp[1] + uy * s0 + ny * (lw / 2 - marge)]];
    dans.add(ombre(new THREE.Mesh(prisme(q, plat(sol + 25), plat(sol + 33)), mat(0x5a4a3c, { roughness: 0.9 }))));
    // quatre pieds sous le sommier, a 6 cm des coins
    for (const [px, py] of rect(6, L - 6, 6)) {
      const pied_lit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), mat(0x4a3b2f, { roughness: 0.9 }));
      pied_lit.position.copy(W(px, py, sol + 12.5)); dans.add(ombre(pied_lit));
    }
    dans.add(ombre(new THREE.Mesh(prisme(q, plat(sol + 33), plat(sol + 45)), mat(0xf1ede4, { roughness: 0.95 }))));
    // couchage : le drap et l'oreiller, seulement quand on est couche
    couchage.add(ombre(new THREE.Mesh(prisme(rect(-1, L * 0.66, -1), plat(sol + 45), plat(sol + 48)), mat(0x6f8fbf, { roughness: 0.95 }))));
    couchage.add(ombre(new THREE.Mesh(prisme(rect(L - 40, L - 6, 4), plat(sol + 45), plat(sol + 55)), mat(0xe3dff0, { roughness: 1 }))));
    // canape : de gros coussins de dossier le long du mur, le reste du temps
    if (canape) {
      // deux coussins de dossier CONTRE LE MUR (le cote du lit le plus loin du centre de la piece),
      // et seulement du cote de la tete : au pied, le plateau du bureau passe au-dessus du lit
      const pts: Pt[] = data.sol.polygone;
      const ctr: Pt = [pts.reduce((s: number, z: Pt) => s + z[0], 0) / pts.length, pts.reduce((s: number, z: Pt) => s + z[1], 0) / pts.length];
      const loin = (sgn: number) => Math.hypot(mp[0] + nx * sgn * lw / 2 - ctr[0], mp[1] + ny * sgn * lw / 2 - ctr[1]);
      const cote = loin(1) > loin(-1) ? 1 : -1;
      const d0 = cote * (lw / 2 - 2), d1 = cote * (lw / 2 - 16), depart = L * 0.38;
      for (let i = 0; i < 2; i++) {
        const pas = (L - depart - 8) / 2, s0c = depart + i * pas, s1c = s0c + pas - 8;
        const dossier: Pt[] = [
          [mp[0] + ux * s0c + nx * d1, mp[1] + uy * s0c + ny * d1],
          [mp[0] + ux * s1c + nx * d1, mp[1] + uy * s1c + ny * d1],
          [mp[0] + ux * s1c + nx * d0, mp[1] + uy * s1c + ny * d0],
          [mp[0] + ux * s0c + nx * d0, mp[1] + uy * s0c + ny * d0],
        ];
        canape.add(ombre(new THREE.Mesh(prisme(dossier, plat(sol + 45), plat(sol + 90)), mat(i ? 0xc8b9a0 : 0xb9a88d, { roughness: 1 }))));
      }
    }
    // la taille du lit sur une petite plaque posee a plat au coin de l'oreiller
    const tx = etiquette(`${Math.round(lw)} × ${Math.round(L)}`);
    if (tx) {
      // petite plaque dans le coin de l'oreiller, hors de la tete de la personne (a 24 cm de l'axe)
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
      const c: Pt = [mt[0] - ux * 13 + nx * (lw / 2 - 13), mt[1] - uy * 13 + ny * (lw / 2 - 13)];
      plaque.position.copy(W(c[0], c[1], sol + 55.6));
      plaque.rotation.set(-Math.PI / 2, 0, Math.atan2(uy, ux) - Math.PI / 2);
      couchage.add(plaque);
    }
    const g = couchee(0.45);
    // l'axe +x local va vers la tete : une rotation de atan2(uy, ux) autour de y envoie +x sur la direction (ux, -uy) du monde
    g.rotation.y = Math.atan2(uy, ux);
    g.position.copy(W((mp[0] + mt[0]) / 2, (mp[1] + mt[1]) / 2, sol)); qui.add(g);
  };
  const lit = groupe("lit"), lit2 = groupe("lit2");
  if (data.mobilier.lit) fait_lit(data.mobilier.lit.polygone, lit, p_couchee);
  if (data.mobilier.lit2) fait_lit(data.mobilier.lit2.polygone, lit2, p_couchee2, "droite");
  // lits a demeure : le lit, ses bureaux, les sieges ranges dessous ; caches tant que le mobilier ne les montre pas
  (data.mobilier.lits_muraux || []).slice(0, LITS_MURAUX_MAX).forEach((lm: any, i: number) => {
    const n = 3 + i, cache = (nom: string) => { const g = groupe(nom); g.visible = visible[nom] !== false; return g; };
    const gb = cache(`bureaux${n}`), gs = cache(`sieges_ranges${n}`);
    gs.visible = visible[`sieges_ranges${n}`] === true;
    for (const b of lm.bureaux) gb.add(ombre(new THREE.Mesh(prisme(b, plat(sol + 72), plat(sol + 75)), mat(COUL.bureau))));
    // le poste de travail sur le plateau : deux 27 pouces (62 x 37 de dalle) et un MacBook Pro 16 ouvert.
    // Cotes reelles, pour voir ce que le bureau porte vraiment. Seulement sur un bureau d'axe y (mur gauche)
    for (const b of lm.bureaux.slice(0, 1)) {
      const xs = b.map((z: Pt) => z[0]), ys = b.map((z: Pt) => z[1]);
      const axe_y = Math.max(...xs) - Math.min(...xs) < Math.max(...ys) - Math.min(...ys);
      if (!axe_y) continue;
      const x0 = Math.min(...xs), x1 = Math.max(...xs), haut = sol + 75;
      // centre sur la partie du bureau qui n'est pas au-dessus du lit
      const y_lit = Math.max(...lm.polygone.map((z: Pt) => z[1])), y_libre0 = Math.max(Math.min(...ys), y_lit), y_libre1 = Math.max(...ys);
      const cy2 = (y_libre0 + y_libre1) / 2;
      const boite_cm = (xa: number, xb: number, ya: number, yb: number, h0: number, h1: number, couleur: number, rough = 0.6) =>
        ombre(new THREE.Mesh(prisme([[xa, ya], [xb, ya], [xb, yb], [xa, yb]] as Pt[], plat(h0), plat(h1)), mat(couleur, { roughness: rough })));
      const ecran = (yc: number) => {
        const x_pied = x0 + 14;
        gb.add(boite_cm(x_pied - 9, x_pied + 9, yc - 12, yc + 12, haut, haut + 1.5, 0x30343a));     // socle
        gb.add(boite_cm(x_pied - 2.5, x_pied + 2.5, yc - 3, yc + 3, haut + 1.5, haut + 13, 0x30343a)); // pied
        gb.add(boite_cm(x_pied - 1.5, x_pied + 1.5, yc - 31, yc + 31, haut + 13, haut + 50, 0x14171a)); // dalle 62 x 37
      };
      ecran(cy2 - 32); ecran(cy2 + 32);
      // MacBook Pro 16 ouvert, devant les ecrans, cote piece
      const xm = x0 + 30;
      gb.add(boite_cm(xm, xm + 25, cy2 - 17.5, cy2 + 17.5, haut, haut + 1.6, 0x9aa0a6));            // base 35 x 25
      gb.add(boite_cm(xm - 1, xm + 1.2, cy2 - 17.5, cy2 + 17.5, haut + 1.6, haut + 24, 0x14171a));  // ecran releve
      // clavier nomade devant le portable, a portee de main sur le bord du plateau
      gb.add(boite_cm(x1 - 16, x1 - 4, cy2 - 22, cy2 + 22, haut, haut + 1.8, 0xd8d5cf));
      // imprimante au coin A/G : le bout du plateau cote facade, celui qui passe au-dessus du pied du lit
      const y_coin = Math.min(...ys) + 2;
      gb.add(boite_cm(x0 + 2, x0 + 37, y_coin, y_coin + 45, haut, haut + 20, 0x4a4f55, 0.8));
    }
    // quatre pieds sous le plateau : deux au ras du lit, deux au fond
    for (const [px, py] of lm.pieds_bureau || []) {
      const pied = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), mat(COUL.bureau));
      pied.position.copy(W(px, py, sol + 36));
      gb.add(ombre(pied));
    }
    for (const st of lm.sieges) siege(st, gs);
    const g_lit = cache(`lit${n}`);
    fait_lit(lm.polygone, g_lit, cache(`personne_couchee${n}`), lm.tete, cache(`couchage${n}`), cache(`canape${n}`));
  });
  if (groupes.cloture) { cloture_pleine(groupes.cloture, visible.cloture !== false); groupes.cloture.visible = !visible.cloture_absente; }
  return groupes;
}

export function createAbriViewer(container: HTMLElement, data0: any): AbriViewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd6e4f0);
  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(...VUES.jardin.position);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  // lumiere : un soleil franc avec ombres douces, un ciel + sol en hemisphere, un contre-jour faible ;
  // l'environnement de piece donne leurs reflets aux panneaux metalliques
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const soleil = new THREE.DirectionalLight(0xfff4e0, 2.6);
  soleil.position.set(6, 9, 4); soleil.castShadow = true; soleil.shadow.bias = -0.0003; soleil.shadow.normalBias = 0.035; soleil.shadow.mapSize.set(1536, 1536);
  soleil.shadow.camera.left = soleil.shadow.camera.bottom = -7; soleil.shadow.camera.right = soleil.shadow.camera.top = 7; soleil.shadow.camera.near = 1; soleil.shadow.camera.far = 30;
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0xbcd4ea, 0x55603a, 0.55));
  const contre = new THREE.DirectionalLight(0xdbe6f2, 0.5); contre.position.set(-6, 4, -5); scene.add(contre);
  const herbe = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x5e8340, roughness: 1 }));
  herbe.rotation.x = -Math.PI / 2; herbe.position.y = -0.15; herbe.receiveShadow = true;
  scene.add(herbe);

  const abri = new THREE.Group();
  scene.add(abri);
  let groupes: Record<string, Vec> = {};
  const visible: Record<string, boolean> = { toit: true, murs: true, murs_coupes: false, mobilier: true, sieges: true, sieges_mi: false, sieges_ranges: false, sieges_ranges2: false, lit2: false, couchage3: false, personne_couchee2: false, personne_couchee3: false, lit: false, etiquettes: true, personne: false, personne_dedans: false, personne_assise: false, personne_couchee: false, porte: true, porte_fermee: false, cloture: false, cloture_absente: false };
  const construit = (data: any) => { groupes = peuple_abri(abri, data, visible); };

  function rebuild(data: any) {
    for (let i = abri.children.length - 1; i >= 0; i--) {
      const ch = abri.children[i];
      abri.remove(ch);
      ch.traverse((o: any) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
    }
    construit(data);
  }
  rebuild(data0);

  function montrer(nom: Masquable, oui: boolean) {
    visible[nom] = oui;
    // cloture : pleine (oui) ou translucide (non) ; cloture_absente la cache toute
    if (nom === "cloture") { if (groupes.cloture) cloture_pleine(groupes.cloture, oui); return; }
    if (nom === "cloture_absente") { if (groupes.cloture) groupes.cloture.visible = !oui; return; }
    if (nom === "murs_coupes") { const c = (groupes as any).coupe; if (c) c.value = oui ? 1.0 : 100; return; }
    // les etats voiles ne cachent rien : ils rendent la paroi translucide
    if (nom === "toit_voile") { voile(groupes.toit, oui); return; }
    if (nom === "murs_voile") { voile(groupes.murs, oui); return; }
    // ouvrir le cote de la porte : seules les faces D et C disparaissent, le reste est intact
    if (nom === "murs_sans_DC") {
      for (const gr of [groupes.murs, groupes.etiquettes]) if (gr) for (const o of gr.children) if (o.userData && o.userData.face) o.visible = !(oui && (o.userData.face === "D" || o.userData.face === "C"));
      return;
    }
    if (nom === "porte_voile") { voile(groupes.porte_fermee, oui); return; }
    if (groupes[nom]) groupes[nom].visible = oui;
  }
  function voir(vue: NomVue) {
    const v = VUES[vue];
    camera.position.set(...v.position); controls.target.set(...v.cible); regler({ fov: v.fov }); controls.update();
    applique_etats(viewer, v.etats);
    controls.dispatchEvent({ type: "change" });
  }
  const r2 = (x: number) => Math.round(x * 100) / 100;
  function etat(): EtatCamera {
    return { position: camera.position.toArray().map(r2), cible: controls.target.toArray().map(r2), fov: r2(camera.fov), distance: r2(camera.position.distanceTo(controls.target)) };
  }
  function regler(o: { fov?: number; distance?: number }) {
    if (o.fov) { camera.fov = o.fov; camera.updateProjectionMatrix(); }
    if (o.distance) { const dir = camera.position.clone().sub(controls.target).normalize(); camera.position.copy(controls.target).addScaledVector(dir, o.distance); }
    controls.update();
  }
  // place la camera d'apres un etat copie (position, cible, fov) : ce que « copier la vue » produit
  function placer(e: Partial<EtatCamera>) {
    if (e.position) camera.position.set(e.position[0], e.position[1], e.position[2]);
    if (e.cible) controls.target.set(e.cible[0], e.cible[1], e.cible[2]);
    regler({ fov: e.fov, distance: e.position ? undefined : e.distance });
    controls.dispatchEvent({ type: "change" });
  }
  function surChangement(cb: (e: EtatCamera) => void) { controls.addEventListener("change", () => cb(etat())); }
  // rendu fixe d'un point de vue dans un petit canvas 2D : un seul contexte WebGL, copie du tampon juste apres le rendu.
  // la scene prend les etats du point de vue le temps du rendu, puis retrouve les siens
  function vignette(canvas: HTMLCanvasElement, vue: NomVue) {
    const v = VUES[vue], cam = new THREE.PerspectiveCamera(v.fov || 42, camera.aspect, 0.1, 100);
    cam.position.set(...v.position); cam.lookAt(...v.cible);
    const avant = { ...visible };
    applique_etats(viewer, v.etats);
    renderer.render(scene, cam);
    for (const k of Object.keys(avant)) montrer(k as Masquable, avant[k]);
    const ctx = canvas.getContext("2d");
    if (ctx) { canvas.width = 320; canvas.height = Math.round(320 / camera.aspect); ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height); }
  }

  // la boite suit la colonne de gauche : on retaille a chaque changement de sa taille, pas seulement de la fenetre
  const retaille = () => {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", retaille);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(retaille).observe(container);
  (function boucle() { requestAnimationFrame(boucle); controls.update(); renderer.render(scene, camera); })();
  const viewer: AbriViewer = { rebuild, montrer, voir, vignette, etat, regler, placer, surChangement };
  return viewer;
}
