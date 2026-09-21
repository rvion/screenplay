// Scene Three.js de l'abri retenu : N murs sur un contour quelconque (convexe), toit plan dans un
// sens ou l'autre. Tout vient de core.modele3d (cm, repere de la dalle) ; rien n'est cote ici.
// THREE est externe (importmap CDN), comme pour viewer.ts.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type Vec = any;
type Pt = number[];

export interface AbriViewer { rebuild(data: any): void; montrer(nom: "toit" | "mobilier" | "lit" | "etiquettes", oui: boolean): void; }

const COUL = { mur: 0xe9ecee, joint: 0x5b656e, bois: 0xc89b62, toit: 0xdfe4e8, nervure: 0xc3cad1, dalle: 0xd9d6cd, propriete: 0xb9ab97, sol: 0xb98d5c, bureau: 0xd9b98a, siege: 0x4b5a6a, lit: 0x8e6bb8, porte: 0x8d979f, cadre: 0xa9743f, verre: 0x9fd3e6, metal: 0xaab2b9 };

function etiquette(txt: string): Vec | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const x = c.getContext("2d");
  if (!x) return null;
  x.font = "bold 84px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 10; x.strokeStyle = "rgba(255,255,255,.9)"; x.strokeText(txt, 128, 68);
  x.fillStyle = "#2b3a47"; x.fillText(txt, 128, 68);
  const t = new THREE.CanvasTexture(c);
  if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// construit la scene de l'abri dans `abri` (sans renderer ni DOM : testable sous Node) ; rend les groupes masquables
export function peuple_abri(abri: Vec, data: any, visible: Record<string, boolean> = {}): Record<string, Vec> {
  const groupes: Record<string, Vec> = {};
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
    const l = Math.hypot(w.a[0] - w.de[0], w.a[1] - w.de[1]) || 1, nx = (w.a[1] - w.de[1]) / l * w.epaisseur_cm, ny = -(w.a[0] - w.de[0]) / l * w.epaisseur_cm;
    abri.add(ombre(new THREE.Mesh(prisme([w.de, w.a, [w.a[0] + nx, w.a[1] + ny], [w.de[0] + nx, w.de[1] + ny]], plat(-14), plat(w.hauteur_cm)), mat(COUL.propriete, { roughness: 0.95 }))));
  }
  // plancher
  if (data.sol.epaisseur_cm > 0) abri.add(ombre(new THREE.Mesh(prisme(data.sol.polygone, plat(0.3), plat(data.sol.epaisseur_cm)), mat(COUL.sol))));

  const ep = data.epaisseur_cm, matMur = mat(COUL.mur, { metalness: 0.1, roughness: 0.6 }), matJoint = mat(COUL.joint), matBois = mat(COUL.bois);
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
    // panneau de mur : rectangle de la hauteur des murs, perce des ouvertures (cadre de porte compris)
    const forme = new THREE.Shape();
    forme.moveTo(0, 0); forme.lineTo(L / 100, 0); forme.lineTo(L / 100, f.hauteur_mur_cm / 100); forme.lineTo(0, f.hauteur_mur_cm / 100); forme.closePath();
    for (const o of f.ouvertures) {
      const ch = o.chambranle_cm || 0, s0 = (o.debut_cm - ch) / 100, s1 = (o.debut_cm + o.largeur_cm + ch) / 100, h0 = o.allege_cm / 100, h1 = (o.allege_cm + o.hauteur_cm + (o.type === "porte" ? ch : 0)) / 100;
      const trou = new THREE.Path();
      trou.moveTo(s0, h0); trou.lineTo(s0, h1); trou.lineTo(s1, h1); trou.lineTo(s1, h0); trou.closePath();
      forme.holes.push(trou);
    }
    const geoMur = new THREE.ExtrudeGeometry(forme, { depth: ep / 100, bevelEnabled: false });
    geoMur.translate(0, 0, -ep / 100);
    pose(ombre(new THREE.Mesh(geoMur, matMur)));
    // joints de panneaux et etiquettes
    for (const pn of f.panneaux) {
      if (pn.debut_cm > 0.5) pose(boite(pn.debut_cm - 0.5, pn.debut_cm + 0.5, 0, f.hauteur_mur_cm, -0.2, 0.4, matJoint));
      const tx = etiquette(pn.id);
      if (tx) {
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
        plaque.position.set((pn.debut_cm + pn.largeur_cm / 2) / 100, Math.min(1.55, f.hauteur_mur_cm / 100 - 0.2), 0.012);
        pose(plaque, etiq);
      }
    }
    // rehausse bois : de la tete des panneaux au dessous du toit
    if (Math.max(f.hauteur_debut_cm, f.hauteur_fin_cm) > f.hauteur_mur_cm + 0.05) {
      const r = new THREE.Shape(), Hm = f.hauteur_mur_cm / 100;
      r.moveTo(0, Hm); r.lineTo(L / 100, Hm); r.lineTo(L / 100, f.hauteur_fin_cm / 100); r.lineTo(0, f.hauteur_debut_cm / 100); r.closePath();
      const geoR = new THREE.ExtrudeGeometry(r, { depth: data.rehausse_epaisseur_cm / 100, bevelEnabled: false });
      geoR.translate(0, 0, -data.rehausse_epaisseur_cm / 100);
      pose(ombre(new THREE.Mesh(geoR, matBois)));
    }
    for (const o of f.ouvertures) {
      if (o.type === "porte") {
        const ch = o.chambranle_cm || 0, s0 = o.debut_cm, s1 = o.debut_cm + o.largeur_cm, matCadre = mat(COUL.cadre);
        if (ch > 0) {
          pose(boite(s0 - ch, s0, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s1, s1 + ch, 0, o.hauteur_cm + ch, -ep, 0, matCadre));
          pose(boite(s0, s1, o.hauteur_cm, o.hauteur_cm + ch, -ep, 0, matCadre));
        }
        // battant entrouvert vers l'exterieur, ferre du cote de la fin du mur
        const battant = new THREE.Group(), angle = 1.15;
        const geoB = new THREE.BoxGeometry(o.largeur_cm / 100, o.hauteur_cm / 100, 0.04);
        geoB.translate(-o.largeur_cm / 200, o.hauteur_cm / 200, 0);
        battant.add(ombre(new THREE.Mesh(geoB, o.vitree === false ? mat(COUL.porte, { metalness: 0.2, roughness: 0.5 }) : mat(COUL.verre, { transparent: true, opacity: 0.45 }))));
        battant.position.set(s1 / 100, 0, -0.01);
        battant.rotation.y = angle;
        pose(battant);
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
  toit.add(ombre(new THREE.Mesh(prisme(T.contour, hz, (z) => hz(z) + T.epaisseur_cm), mat(COUL.toit, { metalness: 0.2, roughness: 0.5 }))));
  const matNerv = mat(COUL.nervure, { metalness: 0.3 });
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
  for (const st of data.mobilier.sieges) {
    const haut = /tabouret/.test(st.type) ? 45 : 47;
    sieges.add(ombre(new THREE.Mesh(prisme(st.polygone, plat(sol + haut - 6), plat(sol + haut)), mat(COUL.siege))));
    const mxs = st.polygone.reduce((s: number, z: Pt) => s + z[0], 0) / st.polygone.length, mys = st.polygone.reduce((s: number, z: Pt) => s + z[1], 0) / st.polygone.length;
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, (haut - 6) / 100, 12), mat(COUL.siege));
    pied.position.copy(W(mxs, mys, sol + (haut - 6) / 2)); sieges.add(pied);
  }
  const lit = groupe("lit");
  if (data.mobilier.lit) lit.add(ombre(new THREE.Mesh(prisme(data.mobilier.lit.polygone, plat(sol + 25), plat(sol + 40)), mat(COUL.lit, { transparent: true, opacity: 0.85 }))));
  sieges.visible = !visible.lit;
  return groupes;
}

export function createAbriViewer(container: HTMLElement, data0: any): AbriViewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfeaf3);
  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3.3, 2.7, 4.3);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.0, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.0);
  soleil.position.set(5, 8, 6); soleil.castShadow = true; soleil.shadow.bias = -0.0008; soleil.shadow.mapSize.set(2048, 2048);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6b6b50, 0.4));
  const herbe = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x83a957, roughness: 1 }));
  herbe.rotation.x = -Math.PI / 2; herbe.position.y = -0.15; herbe.receiveShadow = true;
  scene.add(herbe);

  const abri = new THREE.Group();
  scene.add(abri);
  let groupes: Record<string, Vec> = {};
  const visible: Record<string, boolean> = { toit: true, mobilier: true, lit: false, etiquettes: true };
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

  function montrer(nom: "toit" | "mobilier" | "lit" | "etiquettes", oui: boolean) {
    visible[nom] = oui;
    if (groupes[nom]) groupes[nom].visible = oui;
    if (nom === "lit" && groupes.sieges) groupes.sieges.visible = !oui;
  }

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  (function boucle() { requestAnimationFrame(boucle); controls.update(); renderer.render(scene, camera); })();
  return { rebuild, montrer };
}
