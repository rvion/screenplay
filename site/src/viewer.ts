// Scene Three.js. Reconstruit le batiment a chaque changement de parametres via
// rebuild(model3d). THREE est externe (importmap CDN). Rendu volontairement
// simple : dalle reelle (coin coupe), rail, murs rectangulaires + rehausse
// (joints visibles), porte vitree, toit debordant nervure, gouttiere arriere.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type Vec = any;
type Model = any;

function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#5b9bd9");
  g.addColorStop(0.5, "#9cc4ec");
  g.addColorStop(1, "#e6eef5");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Prisme vertical (dalle, rail) sur un contour quelconque (convexe ou simple).
function prismGeo(V: (x: number, y: number, z: number) => Vec, outline: number[][], zTop: number, zBot: number) {
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], zTop));
  const bot = outline.map((p) => V(p[0], p[1], zBot));
  const pts: Vec[] = [];
  for (let i = 1; i < n - 1; i++) pts.push(top[0], top[i], top[i + 1]);
  for (let i = 1; i < n - 1; i++) pts.push(bot[0], bot[i + 1], bot[i]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pts.push(top[i], bot[i], bot[j], top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  return g;
}

function offsetRect(r: number[][], d: number): number[][] {
  const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
  const x0 = Math.min(...xs) - d, x1 = Math.max(...xs) + d, y0 = Math.min(...ys) - d, y1 = Math.max(...ys) + d;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

function addRoofSlab(scene: Vec, V: any, outline: number[][], roofZ: (y: number) => number, thk: number, mat: Vec) {
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], roofZ(p[1]) + thk));
  const bot = outline.map((p) => V(p[0], p[1], roofZ(p[1])));
  const pts: Vec[] = [];
  for (let i = 1; i < n - 1; i++) pts.push(top[0], top[i], top[i + 1]);
  for (let i = 1; i < n - 1; i++) pts.push(bot[0], bot[i + 1], bot[i]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pts.push(top[i], bot[i], bot[j], top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  scene.add(mesh);
}

function addRoofRibs(parent: Vec, V: any, outline: number[][], roofZ: (y: number) => number, thk: number, mat: Vec) {
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const step = 0.18, ribW = 0.045, eps = 0.012, inset = 0.05;
  const zt = (yy: number) => roofZ(yy) + thk + eps;
  const y0 = miny + inset, y1 = maxy - inset;
  const pts: Vec[] = [];
  for (let x = minx + 0.06; x < maxx - ribW; x += step) {
    pts.push(V(x, y0, zt(y0)), V(x + ribW, y0, zt(y0)), V(x + ribW, y1, zt(y1)),
             V(x, y0, zt(y0)), V(x + ribW, y1, zt(y1)), V(x, y1, zt(y1)));
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, mat));
}

function addGutter(scene: Vec, V: any, a: number[], b: number[], roofZ: (y: number) => number, over: number, mat: Vec) {
  const yb = Math.max(a[1], b[1]) + over * 0.8;
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const zc = roofZ(Math.max(a[1], b[1])) - 0.03;
  const gutter = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) + 0.12, 0.06, 0.08), mat);
  gutter.position.copy(V((x0 + x1) / 2, yb, zc));
  gutter.castShadow = true;
  scene.add(gutter);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.max(zc, 0.1), 14), mat);
  pipe.position.copy(V(a[0], yb, zc / 2));
  scene.add(pipe);
}

// Mur = bande de quads entre 0 et topAt(s) (lineaire), perce des trous `holes`.
function addWall(scene: Vec, V: any, a: number[], b: number[], ha: number, hb: number, holes: any[], mat: Vec) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s: number, h: number) => V(a[0] + ux * s, a[1] + uy * s, h);
  const topAt = (s: number) => ha + (hb - ha) * (s / len);
  const pts: Vec[] = [];
  const quad = (p0: Vec, p1: Vec, p2: Vec, p3: Vec) => pts.push(p0, p1, p2, p0, p2, p3);
  const sorted = holes.slice().sort((A, B) => A.s0 - B.s0);
  let cur = 0;
  for (const h of sorted) {
    if (h.s0 > cur + 1e-4) quad(P(cur, 0), P(h.s0, 0), P(h.s0, topAt(h.s0)), P(cur, topAt(cur)));
    if (h.y0 > 1e-4) quad(P(h.s0, 0), P(h.s1, 0), P(h.s1, h.y0), P(h.s0, h.y0));
    quad(P(h.s0, h.y1), P(h.s1, h.y1), P(h.s1, topAt(h.s1)), P(h.s0, topAt(h.s0)));
    cur = h.s1;
  }
  if (len > cur + 1e-4) quad(P(cur, 0), P(len, 0), P(len, topAt(len)), P(cur, topAt(cur)));
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
}

// Joints de panneaux : verticaux tous les `cover`, + joint mur/rehausse a `wallH`.
function addJoints(scene: Vec, V: any, a: number[], b: number[], ha: number, hb: number, wallH: number, cover: number, mat: Vec) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = uy * 0.004, ny = -ux * 0.004; // legerement devant le mur (exterieur)
  const P = (s: number, h: number) => V(a[0] + ux * s + nx, a[1] + uy * s + ny, h);
  const pts: Vec[] = [];
  for (let s = cover; s < len - 1e-4; s += cover) pts.push(P(s, 0), P(s, wallH));
  if (Math.max(ha, hb) > wallH + 1e-4) pts.push(P(0, wallH), P(len, wallH));
  if (!pts.length) return;
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat));
}

function addDoor(scene: Vec, V: any, a: number[], b: number[], o: any) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s: number, h: number) => V(a[0] + ux * s, a[1] + uy * s, h);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe3ef, transparent: true, opacity: 0.34, roughness: 0.05, transmission: 0.6, side: THREE.DoubleSide,
  });
  const hinge = new THREE.Group();
  hinge.position.copy(P(o.offset_m, 0));
  const dir = new THREE.Vector3().subVectors(P(o.offset_m + o.width_m, 0), P(o.offset_m, 0));
  dir.y = 0; dir.normalize();
  hinge.rotation.y = -Math.atan2(dir.z, dir.x);
  const lg = new THREE.PlaneGeometry(o.width_m, o.height_m);
  lg.translate(o.width_m / 2, o.height_m / 2, 0);
  const leaf = new THREE.Mesh(lg, glass);
  leaf.rotation.y = -0.6;
  hinge.add(leaf);
  scene.add(hinge);
}

function populate(group: Vec, m: Model) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s: number, p: number[]) => s + p[0], 0) / n;
  const cy = fp.reduce((s: number, p: number[]) => s + p[1], 0) / n;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym: number) => m.roof_front_m - (m.roof_slope || 0) * ym;

  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x7e8a96, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeae7df, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7177, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
  const jointMat = new THREE.LineBasicMaterial({ color: 0x8a9096 });

  // Dalle reelle (pentagone si coin coupe) : montre ce qui deborde.
  group.add(new THREE.Mesh(prismGeo(V, m.slab || fp, 0.05, -0.12), concreteMat));
  group.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, 0.02), 0.10, 0.0), railMat));

  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o: any) => o.face_index === i).map((o: any) => ({
      s0: o.offset_m, s1: o.offset_m + o.width_m, y0: o.sill_m, y1: o.sill_m + o.height_m,
    }));
    addWall(group, V, a, b, ha, hb, holes, panelMat);
    addJoints(group, V, a, b, ha, hb, m.wall_height_m, m.panel_cover_m || 1, jointMat);
  }
  for (const o of openings) addDoor(group, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);

  const outline = m.roof_outline || offsetRect(fp, 0.15);
  addRoofSlab(group, V, outline, roofZ, m.thickness_m, roofMat);
  addRoofRibs(group, V, outline, roofZ, m.thickness_m, ribMat);
  const gi = m.gutter_face_index == null ? 2 : m.gutter_face_index;
  addGutter(group, V, fp[gi], fp[(gi + 1) % n], roofZ, 0.2, metalMat);
}

export interface Viewer { rebuild(model: Model): void; }

export function createViewer(container: HTMLElement, model0: Model): Viewer {
  const scene = new THREE.Scene();
  scene.background = makeSky();

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(4.6, 3.2, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.1, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(5, 8, 3);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6b6b50, 0.4));

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x83a957, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.005;
  grass.receiveShadow = true;
  scene.add(grass);

  const building = new THREE.Group();
  scene.add(building);

  function rebuild(model: Model) {
    for (let i = building.children.length - 1; i >= 0; i--) {
      const ch = building.children[i];
      building.remove(ch);
      ch.traverse((o: any) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
    }
    populate(building, model);
  }
  rebuild(model0);

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", onResize);

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  return { rebuild };
}
