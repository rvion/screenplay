// Scene Three.js — port de l'ancien app.js. Reconstruit le batiment a chaque
// changement de parametres via rebuild(model3d). THREE est externe (importmap CDN).
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

function yRangeAtX(poly: number[][], x: number): [number, number] | null {
  const ys: number[] = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
    if ((x1 <= x && x < x2) || (x2 <= x && x < x1)) {
      const t = (x - x1) / (x2 - x1);
      ys.push(y1 + t * (y2 - y1));
    }
  }
  return ys.length < 2 ? null : [Math.min(...ys), Math.max(...ys)];
}

function dilate(fp: number[][], over: number): number[][] {
  const n = fp.length;
  const gx = fp.reduce((s, p) => s + p[0], 0) / n;
  const gy = fp.reduce((s, p) => s + p[1], 0) / n;
  return fp.map((p) => {
    const dx = p[0] - gx, dy = p[1] - gy, d = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / d) * over, p[1] + (dy / d) * over];
  });
}

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

function addRoofSlab(scene: Vec, V: any, fp: number[][], hs: number[], thk: number, overhang: number, mat: Vec) {
  const n = fp.length;
  const outer = dilate(fp, overhang);
  const top = outer.map((p, i) => V(p[0], p[1], hs[i] + thk));
  const bot = outer.map((p, i) => V(p[0], p[1], hs[i]));
  const pts: Vec[] = [];
  for (let i = 1; i < n - 1; i++) pts.push(top[0], top[i], top[i + 1]);
  for (let i = 1; i < n - 1; i++) pts.push(bot[0], bot[i + 1], bot[i]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pts.push(top[i], bot[i], bot[j]);
    pts.push(top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  scene.add(mesh);
}

function addRoofRibs(parent: Vec, V: any, fp: number[][], roofZ: (y: number) => number, thk: number, over: number, mat: Vec) {
  const outline = dilate(fp, over);
  const xs = outline.map((p) => p[0]);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const step = 0.18, ribW = 0.045, eps = 0.012, inset = 0.05;
  const zt = (yy: number) => roofZ(yy) + thk + eps;
  const pts: Vec[] = [];
  for (let x = minx + 0.06; x < maxx - ribW; x += step) {
    const yr = yRangeAtX(outline, x + ribW / 2);
    if (!yr) continue;
    const y0 = yr[0] + inset, y1 = yr[1] - inset;
    if (y1 - y0 < 0.08) continue;
    pts.push(V(x, y0, zt(y0)), V(x + ribW, y0, zt(y0)), V(x + ribW, y1, zt(y1)),
             V(x, y0, zt(y0)), V(x + ribW, y1, zt(y1)), V(x, y1, zt(y1)));
  }
  if (!pts.length) return;
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, mat));
}

function addBackGutter(scene: Vec, V: any, fp: number[][], roofZ: (y: number) => number, over: number, mat: Vec) {
  const Bend = fp[3], BL = fp[4];
  const yb = Math.max(Bend[1], BL[1]) + over * 0.8;
  const x0 = Math.min(Bend[0], BL[0]), x1 = Math.max(Bend[0], BL[0]);
  const zc = roofZ(Math.max(Bend[1], BL[1])) - 0.03;
  const len = (x1 - x0) + 0.12;
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.08), mat);
  gutter.position.copy(V((x0 + x1) / 2, yb, zc));
  gutter.castShadow = true;
  scene.add(gutter);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.max(zc, 0.1), 14), mat);
  pipe.position.copy(V(Bend[0], yb, zc / 2));
  scene.add(pipe);
}

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

function addGlass(scene: Vec, V: any, a: number[], b: number[], o: any) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s: number, h: number) => V(a[0] + ux * s, a[1] + uy * s, h);
  const s0 = o.offset_m, s1 = o.offset_m + o.width_m, y0 = o.sill_m, y1 = o.sill_m + o.height_m;
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe3ef, transparent: true, opacity: 0.34, roughness: 0.05, transmission: 0.6, side: THREE.DoubleSide,
  });
  if (o.type === "porte") {
    const hinge = new THREE.Group();
    hinge.position.copy(P(s0, 0));
    const dir = new THREE.Vector3().subVectors(P(s1, 0), P(s0, 0));
    dir.y = 0; dir.normalize();
    hinge.rotation.y = -Math.atan2(dir.z, dir.x);
    const lg = new THREE.PlaneGeometry(o.width_m, o.height_m);
    lg.translate(o.width_m / 2, o.height_m / 2, 0);
    const leaf = new THREE.Mesh(lg, glass);
    leaf.rotation.y = -0.6;
    hinge.add(leaf);
    scene.add(hinge);
  } else {
    const g = new THREE.BufferGeometry();
    g.setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y0), P(s1, y1), P(s0, y1)]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, glass));
    const frame = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1)]),
      new THREE.LineBasicMaterial({ color: 0x55626b })
    );
    scene.add(frame);
  }
}

function populate(group: Vec, m: Model) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s: number, p: number[]) => s + p[0], 0) / n;
  const cy = fp.reduce((s: number, p: number[]) => s + p[1], 0) / n;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym: number) => (m.roof_front_m != null ? m.roof_front_m - (m.roof_slope || 0) * ym : hs[0]);

  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x7e8a96, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeae7df, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7177, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });

  group.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.22), 0.05, -0.12), concreteMat));
  group.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.03), 0.10, 0.0), railMat));

  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o: any) => o.face_index === i).map((o: any) => ({
      s0: o.offset_m, s1: o.offset_m + o.width_m, y0: o.sill_m, y1: o.sill_m + o.height_m,
    }));
    addWall(group, V, a, b, ha, hb, holes, panelMat);
  }
  for (const o of openings) addGlass(group, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);

  const over = m.roof_overhang_m || 0.15;
  addRoofSlab(group, V, fp, hs, m.thickness_m, over, roofMat);
  addRoofRibs(group, V, fp, roofZ, m.thickness_m, over, ribMat);
  addBackGutter(group, V, fp, roofZ, over, metalMat);
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
