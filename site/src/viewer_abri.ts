// Scene Three.js de l'abri retenu : N murs sur un contour quelconque (convexe), toit plan dans un
// sens ou l'autre. Tout vient de core.modele3d (cm, repere de la dalle) ; rien n'est cote ici.
// THREE est externe (importmap CDN), comme pour viewer.ts.
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
// etats des options de la scene (0 = eteint ; porte 1 ouverte 2 fermee ; personne 1 dehors 2 dedans ; cloture 1 pleine 0 translucide)
export type Etats = { toit: number; porte: number; mobilier: number; lit: number; etiquettes: number; personne: number; cloture: number };
export const ETATS_DEFAUT: Etats = { toit: 1, porte: 1, mobilier: 1, lit: 0, etiquettes: 1, personne: 0, cloture: 1 };
// vues fixes (metres, cible et angle) avec les etats d'options qui vont avec : la premiere est la vue de depart
export const VUES = {
  jardin: { titre: "Depuis le jardin", position: [3.3, 2.7, 4.3], cible: [0, 1, 0], fov: 42, etats: { ...ETATS_DEFAUT } },
  porte: { titre: "Côté porte", position: [5.2, 2.2, 1.2], cible: [0.4, 1, 0], fov: 42, etats: { ...ETATS_DEFAUT, personne: 1 } },
  arriere: { titre: "Derrière, le passage", position: [2.2, 3.4, -3.8], cible: [0, 0.8, -0.5], fov: 42, etats: { ...ETATS_DEFAUT, cloture: 0 } },
  droite: { titre: "Vue de droite", position: [-2.52, 3.38, 4.61], cible: [-0.1, 0.9, 0.15], fov: 42, etats: { ...ETATS_DEFAUT } },
  interieur: { titre: "Intérieur, sans toit", position: [1.6, 4.6, 2.6], cible: [0, 0.6, 0.1], fov: 42, etats: { ...ETATS_DEFAUT, toit: 0, porte: 2, personne: 2 } },
  lit: { titre: "Lit déplié", position: [-1.4, 4.4, 2.4], cible: [0, 0.5, 0], fov: 42, etats: { ...ETATS_DEFAUT, toit: 0, lit: 1, etiquettes: 0 } },
} as const;
export type NomVue = keyof typeof VUES;
// applique un jeu d'etats a la scene (sans toucher aux boutons de la page)
export function applique_etats(vue: AbriViewer, e: Etats) {
  vue.montrer("toit", e.toit > 0); vue.montrer("mobilier", e.mobilier > 0); vue.montrer("lit", e.lit > 0); vue.montrer("etiquettes", e.etiquettes > 0);
  vue.montrer("porte", e.porte === 1); vue.montrer("porte_fermee", e.porte === 2);
  vue.montrer("personne", e.personne === 1); vue.montrer("personne_dedans", e.personne === 2);
  vue.montrer("cloture", e.cloture > 0);
}
export type Masquable = "toit" | "mobilier" | "lit" | "etiquettes" | "personne" | "personne_dedans" | "porte" | "porte_fermee" | "cloture";

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
  x.font = "bold 88px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
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
  const groupes: Record<string, Vec> = {}, visible = { lit: false, personne: false, personne_dedans: false, porte_fermee: false, ...visible_demande };
  const mat = (couleur: number, extra: any = {}) => new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.8, side: THREE.DoubleSide, ...extra });
  const xs = data.dalle.map((z: Pt) => z[0]), ys = data.dalle.map((z: Pt) => z[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2 - 60;
  // plan (x vers la droite, y vers le fond, h vers le haut, en cm) -> monde (m) : la facade regarde +Z
  const W = (x: number, y: number, h: number) => new THREE.Vector3((x - cx) / 100, h / 100, -(y - cy) / 100);
  const groupe = (nom: string) => { const gr = new THREE.Group(); groupes[nom] = gr; gr.visible = visible[nom] !== false; abri.add(gr); return gr; };
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
      const cl = groupes.cloture || groupe("cloture"), e = w.epaisseur_cm / 100, h = w.hauteur_cm / 100;
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

  const ep = data.epaisseur_cm, matMur = mat(COUL.mur, { metalness: 0.55, roughness: 0.38 }), matJoint = mat(COUL.joint), matBois = mat(COUL.bois, { roughness: 0.85 });
  // aretes sombres sur les volumes : les angles se lisent meme sous une lumiere plate
  const matArete = new THREE.LineBasicMaterial({ color: 0x2c3640, transparent: true, opacity: 0.55 });
  // les aretes sont relevees de 5 mm : celle du seuil, a y = 0, se battrait en profondeur avec le dessus de la dalle
  const aretes = (geo: Vec, deg = 25) => { const e = new THREE.EdgesGeometry(geo, deg); e.translate(0, 0.005, 0); return new THREE.LineSegments(e, matArete); };
  const etiq = groupe("etiquettes");
  for (const f of data.murs) {
    const L = f.longueur_cm, ux = (f.a[0] - f.de[0]) / L, uy = (f.a[1] - f.de[1]) / L;
    // repere du mur : X le long du mur, Y vers le haut, Z vers l'exterieur (contour antihoraire, interieur a gauche)
    const base = new THREE.Matrix4().makeBasis(new THREE.Vector3(ux, 0, -uy), new THREE.Vector3(0, 1, 0), new THREE.Vector3(uy, 0, ux));
    base.setPosition(W(f.de[0], f.de[1], 0));
    const pose = (mesh: Vec, parent: Vec = abri) => { mesh.applyMatrix4(base); parent.add(mesh); return mesh; };
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
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
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
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(haut * 2, haut), new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false }));
        plaque.position.set(xr * L / 100, Hm + hr / 200, 0.012);
        pose(plaque, etiq);
      }
    }
    for (const o of f.ouvertures) {
      if (o.type === "porte") {
        const ch = o.chambranle_cm || 0, s0 = o.debut_cm, s1 = o.debut_cm + o.largeur_cm, matCadre = mat(COUL.cadre);
        if (ch > 0) {
          pose(boite(s0 - ch, s0, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s1, s1 + ch, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s0, s1, o.hauteur_cm, o.hauteur_cm + ch, -ep, 0, matCadre));
        }
        // battant ferre du cote de la fin du mur : un groupe ouvert vers l'exterieur, un groupe ferme dans le cadre
        const matB = o.vitree === false ? mat(COUL.porte, { metalness: 0.2, roughness: 0.5 }) : mat(COUL.verre, { transparent: true, opacity: 0.45 });
        const battant = (angle: number) => {
          const g = new THREE.Group(), geoB = new THREE.BoxGeometry(o.largeur_cm / 100, o.hauteur_cm / 100, 0.04);
          geoB.translate(-o.largeur_cm / 200, o.hauteur_cm / 200, 0);
          g.add(ombre(new THREE.Mesh(geoB, matB)));
          g.position.set(s1 / 100, 0, -0.01); g.rotation.y = angle;
          return g;
        };
        pose(battant(1.15), groupes.porte || groupe("porte"));
        pose(battant(0), groupes.porte_fermee || groupe("porte_fermee"));
        // silhouette de 1,80 m pour l'echelle (cachee au depart) : devant la porte, ou dedans a 60 cm du seuil
        const matP = mat(COUL.personne, { roughness: 0.9 });
        const silhouette = (z: number, y: number, decale = 0) => {
          const corps = new THREE.Group();
          for (const dx of [-0.09, 0.09]) { const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.84, 10), matP); jambe.position.set(dx, 0.42, 0); corps.add(ombre(jambe)); }
          const tronc = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.66, 0.22), matP); tronc.position.y = 0.84 + 0.33; corps.add(ombre(tronc));
          const tete = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matP); tete.position.y = 1.8 - 0.115; corps.add(ombre(tete));
          corps.position.set((s0 + s1) / 200 + decale, y, z);
          return corps;
        };
        // dehors : 30 cm vers le debut du mur (la facade), hors de l'arc du battant
        pose(silhouette(0.45, 0, -0.3), groupe("personne"));
        pose(silhouette(-(ep + 60) / 100, data.sol.epaisseur_cm / 100), groupe("personne_dedans"));
      } else {
        const s0 = o.debut_cm, s1 = o.debut_cm + o.largeur_cm, h0 = o.allege_cm, h1 = o.allege_cm + o.hauteur_cm, matCadre = mat(0xf4f5f6), c = 4;
        pose(boite(s0, s1, h0, h1, -ep / 2 - 0.6, -ep / 2 + 0.6, mat(COUL.verre, { transparent: true, opacity: 0.4, roughness: 0.1 })));
        pose(boite(s0, s1, h0, h0 + c, -ep, 0.5, matCadre)); pose(boite(s0, s1, h1 - c, h1, -ep, 0.5, matCadre));
        pose(boite(s0, s0 + c, h0, h1, -ep, 0.5, matCadre)); pose(boite(s1 - c, s1, h0, h1, -ep, 0.5, matCadre));
        if (o.ouvrant) pose(boite((s0 + s1) / 2 - 1, (s0 + s1) / 2 + 1, h0, h1, -ep, 0.5, matCadre));
      }
    }
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

  // mobilier : bureaux, sieges ; lit deplie sur demande (il prend la place des sieges)
  const mob = groupe("mobilier"), sol = data.sol.epaisseur_cm;
  for (const b of data.mobilier.bureaux) mob.add(ombre(new THREE.Mesh(prisme(b.polygone, plat(sol + 72), plat(sol + 75)), mat(COUL.bureau))));
  const sieges = new THREE.Group(); mob.add(sieges); groupes.sieges = sieges;
  // siege : assise, quatre pieds, et un dossier du cote oppose au bureau (fauteuil) ; le tabouret n'a pas de dossier
  for (const st of data.mobilier.sieges) {
    const tabouret = /tabouret/.test(st.type), haut = tabouret ? 45 : 47, matS = mat(COUL.siege), q: Pt[] = st.polygone;
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
  }
  const lit = groupe("lit");
  if (data.mobilier.lit) lit.add(ombre(new THREE.Mesh(prisme(data.mobilier.lit.polygone, plat(sol + 25), plat(sol + 40)), mat(COUL.lit, { transparent: true, opacity: 0.85 }))));
  sieges.visible = !visible.lit;
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
  const visible: Record<string, boolean> = { toit: true, mobilier: true, lit: false, etiquettes: true, personne: false, personne_dedans: false, porte: true, porte_fermee: false, cloture: true };
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
    // cloture : jamais cachee, mais pleine (oui) ou translucide (non), pour voir l'abri derriere
    if (nom === "cloture") { if (groupes.cloture) groupes.cloture.traverse((o: any) => { if (o.isMesh) { o.material.transparent = !oui; o.material.opacity = oui ? 1 : 0.3; o.material.depthWrite = oui; o.castShadow = oui; } }); return; }
    if (groupes[nom]) groupes[nom].visible = oui;
    if (nom === "lit" && groupes.sieges) groupes.sieges.visible = !oui;
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

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  (function boucle() { requestAnimationFrame(boucle); controls.update(); renderer.render(scene, camera); })();
  const viewer: AbriViewer = { rebuild, montrer, voir, vignette, etat, regler, placer, surChangement };
  return viewer;
}
