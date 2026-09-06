// Scene Three.js. Reconstruit le batiment a chaque changement de parametres via
// rebuild(model3d). THREE est externe (importmap CDN). Rendu volontairement
// simple : dalle reelle (coin coupe), rail, murs rectangulaires + rehausse
// (joints visibles), porte + fenetres vitrees, toit debordant nervure, gouttiere arriere.
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
  const step = 0.18, ribW = 0.045, eps = 0.016, inset = 0.05;
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

type Rect = { s0: number; s1: number; y0: number; y1: number };
function rectMinus(r: Rect, h: Rect): Rect[] {
  if (h.s1 <= r.s0 || h.s0 >= r.s1 || h.y1 <= r.y0 || h.y0 >= r.y1) return [r];
  const out: Rect[] = [];
  if (h.s0 > r.s0) out.push({ s0: r.s0, s1: Math.min(h.s0, r.s1), y0: r.y0, y1: r.y1 });
  if (h.s1 < r.s1) out.push({ s0: Math.max(h.s1, r.s0), s1: r.s1, y0: r.y0, y1: r.y1 });
  const ms0 = Math.max(r.s0, h.s0), ms1 = Math.min(r.s1, h.s1);
  if (h.y0 > r.y0) out.push({ s0: ms0, s1: ms1, y0: r.y0, y1: Math.min(h.y0, r.y1) });
  if (h.y1 < r.y1) out.push({ s0: ms0, s1: ms1, y0: Math.max(h.y1, r.y0), y1: r.y1 });
  return out.filter((q) => q.s1 - q.s0 > 1e-4 && q.y1 - q.y0 > 1e-4);
}

// Etiquette "A1" imprimee au centre d'une piece (texture canvas, plan oriente).
const labelCache: Record<string, Vec> = {};
function labelTexture(txt: string): Vec {
  if (labelCache[txt]) return labelCache[txt];
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1f2933";
  ctx.font = `bold ${txt.length > 2 ? 110 : 140}px system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, 128, 136);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return (labelCache[txt] = tex);
}
function addLabel(scene: Vec, pos: Vec, size: number, txt: string, rotY: number, rotX = 0) {
  const mat = new THREE.MeshBasicMaterial({ map: labelTexture(txt), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.position.copy(pos);
  mesh.rotation.set(rotX, rotY, 0, "YXZ");
  scene.add(mesh);
}

// Panneaux d'un mur : quads insets (bords sombres visibles) + etiquettes. Le mur de fond
// (addWall, materiau sombre) reste visible dans les joints.
function addPanels(scene: Vec, V: any, a: number[], b: number[], ha: number, hb: number, wallH: number,
                   panels: any[], pieces: any[], holes: Rect[], mat: Vec, rehMat: Vec) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = uy, ny = -ux;                       // normale exterieure (polygone antihoraire)
  const off = 0.004, ins = 0.009;
  const P = (s: number, h: number) => V(a[0] + ux * s + nx * off, a[1] + uy * s + ny * off, h);
  const topAt = (s: number) => ha + (hb - ha) * (s / len);
  const rotY = Math.atan2(nx, -ny);
  const bigHoles = holes.map((h) => ({ s0: h.s0 - ins, s1: h.s1 + ins, y0: h.y0 - ins, y1: h.y1 + ins }));
  const quads = (rects: Rect[], m: Vec) => {
    const pts: Vec[] = [];
    for (const r of rects) pts.push(P(r.s0, r.y0), P(r.s1, r.y0), P(r.s1, r.y1), P(r.s0, r.y0), P(r.s1, r.y1), P(r.s0, r.y1));
    if (!pts.length) return;
    const g = new THREE.BufferGeometry(); g.setFromPoints(pts); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, m));
  };
  for (const pn of panels) {
    let rects: Rect[] = [{ s0: pn.s0_m + ins, s1: pn.s1_m - ins, y0: ins, y1: wallH - ins }];
    for (const h of bigHoles) rects = rects.flatMap((r) => rectMinus(r, h));
    quads(rects, mat);
    const w = pn.s1_m - pn.s0_m, cs = (pn.s0_m + pn.s1_m) / 2;
    const free = holes.filter((h) => h.s0 < pn.s1_m && h.s1 > pn.s0_m);
    let ch = wallH * 0.72;                        // etiquette haute si une ouverture occupe le panneau
    if (free.length) ch = Math.min(wallH - 0.3, Math.max(...free.map((h) => h.y1)) + 0.3);
    addLabel(scene, P(cs, ch).add(new THREE.Vector3(nx * 0.004, 0, -ny * 0.004)), Math.min(0.5, w * 0.7), pn.label, rotY);
  }
  for (const pc of pieces) {
    if (pc.kind === "bandeau") {
      const top = Math.max(ha, hb);
      quads([{ s0: ins, s1: len - ins, y0: wallH + ins, y1: top - ins }], rehMat);
      addLabel(scene, P(len / 2, (wallH + top) / 2).add(new THREE.Vector3(nx * 0.004, 0, -ny * 0.004)), Math.min(0.2, (top - wallH) * 0.85), pc.label, rotY);
    } else {
      const tallAtEnd = hb > ha;
      const sT = tallAtEnd ? len - ins : ins, sS = tallAtEnd ? ins : len - ins;
      const top = topAt(tallAtEnd ? len : 0) - ins;
      const pts = tallAtEnd
        ? [P(sS, wallH + ins), P(sT, wallH + ins), P(sT, top)]
        : [P(sT, wallH + ins), P(sS, wallH + ins), P(sT, top)];
      const g = new THREE.BufferGeometry(); g.setFromPoints(pts); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, rehMat));
      const sl = tallAtEnd ? len * 0.8 : len * 0.2;
      addLabel(scene, P(sl, (wallH + topAt(sl)) / 2).add(new THREE.Vector3(nx * 0.004, 0, -ny * 0.004)), Math.min(0.17, (topAt(sl) - wallH) * 0.85), pc.label, rotY);
    }
  }
}

function addRoofPanels(scene: Vec, V: any, outline: number[][], roofZ: (y: number) => number, thk: number, slope: number, panels: any[], mat: Vec) {
  const ys = outline.map((p) => p[1]);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  const ins = 0.012, z = (yy: number) => roofZ(yy) + thk + 0.003;
  for (const pn of panels) {
    const x0 = pn.x0_m + ins, x1 = pn.x1_m - ins, y0 = miny + ins, y1 = maxy - ins;
    const g = new THREE.BufferGeometry();
    g.setFromPoints([V(x0, y0, z(y0)), V(x1, y0, z(y0)), V(x1, y1, z(y1)), V(x0, y0, z(y0)), V(x1, y1, z(y1)), V(x0, y1, z(y1))]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, mat));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    addLabel(scene, V(cx, cy, roofZ(cy) + thk + 0.03), Math.min(0.5, (x1 - x0) * 0.7), pn.label, 0, -Math.PI / 2 - Math.atan(slope));
  }
}

function addGlass(scene: Vec, V: any, a: number[], b: number[], o: any) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s: number, h: number) => V(a[0] + ux * s, a[1] + uy * s, h);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe3ef, transparent: true, opacity: 0.34, roughness: 0.05, transmission: 0.6, side: THREE.DoubleSide,
  });
  if (o.type !== "porte") {
    const s0 = o.offset_m, s1 = o.offset_m + o.width_m, y0 = o.sill_m, y1 = o.sill_m + o.height_m;
    const g = new THREE.BufferGeometry();
    g.setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y0), P(s1, y1), P(s0, y1)]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, glass));
    scene.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1)]),
      new THREE.LineBasicMaterial({ color: 0x55626b })));
    if (o.ouvrant) { // trait diagonal = sens d'ouverture (symbole menuiserie)
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([P(s0, y0), P((s0 + s1) / 2, y1), P(s1, y0)]), new THREE.LineBasicMaterial({ color: 0x55626b })));
    }
    return;
  }
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
  const rehMat = new THREE.MeshStandardMaterial({ color: m.rehausse_materiau === "bois" ? 0xb8895a : 0xf1e6c8, roughness: m.rehausse_materiau === "bois" ? 0.85 : 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.7, side: THREE.DoubleSide });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.8, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const roofBaseMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.8, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x7e8a96, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeae7df, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7177, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });

  // Dalle reelle (pentagone si coin coupe), dessus a z=0 ; rail de pied sous les panneaux
  // (0,5 cm hors du nu exterieur : jamais coplanaire avec le bord de dalle).
  group.add(new THREE.Mesh(prismGeo(V, m.slab || fp, 0.0, -0.14), concreteMat));
  group.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, 0.005), 0.06, 0.001), railMat));
  if (m.floor_m > 0) group.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, -(m.thickness_m || 0.06)), m.floor_m + 0.005, 0.002), floorMat));

  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o: any) => o.face_index === i).map((o: any) => ({
      s0: o.offset_m, s1: o.offset_m + o.width_m, y0: o.sill_m, y1: o.sill_m + o.height_m,
    }));
    addWall(group, V, a, b, ha, hb, holes, baseMat);
    addPanels(group, V, a, b, ha, hb, m.wall_height_m,
      (m.panels || []).filter((q: any) => q.face_index === i),
      (m.rehausse_pieces || []).filter((q: any) => q.face_index === i), holes, panelMat, rehMat);
  }
  for (const o of openings) addGlass(group, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);

  const outline = m.roof_outline || offsetRect(fp, 0.15);
  addRoofSlab(group, V, outline, roofZ, m.thickness_m, roofBaseMat);
  addRoofPanels(group, V, outline, roofZ, m.thickness_m, m.roof_slope || 0, m.roof_panels || [], roofMat);
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
  sun.shadow.bias = -0.0008;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6b6b50, 0.4));

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x83a957, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.07;
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
