import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const S = window.SHED;

/* ------------------------------------------------------------------ */
/* Tableaux dynamiques (lus depuis params -> data.js)                  */
/* ------------------------------------------------------------------ */
function el(tag, attrs = {}, html = "") {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html) e.innerHTML = html;
  return e;
}

function fillKpis() {
  const g = S.geometrie;
  const data = [
    [g.aire_m2 + " m²", "Surface au sol"],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "°)"],
    [S.panneau.epaisseur_mm + " mm", "Panneaux sandwich"],
    [S.debit.commande_panneaux_m2 + " m²", "Panneaux à commander"],
  ];
  const wrap = document.getElementById("kpis");
  data.forEach(([v, l]) => {
    const c = el("div", { class: "card kpi" });
    c.appendChild(el("div", { class: "v" }, v));
    c.appendChild(el("div", { class: "l" }, l));
    wrap.appendChild(c);
  });
}

function fillFaces() {
  const tb = document.querySelector("#faces tbody");
  S.geometrie.faces.forEach((f) => {
    const tr = el("tr");
    tr.innerHTML =
      `<td><b>${f.cle}</b> · ${f.libelle}</td>` +
      `<td>${f.longueur_cm} cm</td>` +
      `<td>${f.hauteur_debut_cm} → ${f.hauteur_fin_cm} cm` +
      (f.rake ? ' <span class="tag rake">biais</span>' : "") +
      `</td>`;
    tb.appendChild(tr);
  });
  // Face T : la toiture, listee comme les murs
  const g = S.geometrie, t = S.debit.toit;
  const tr = el("tr");
  tr.style.background = "#eef2e8";
  tr.innerHTML =
    `<td><b>${t.face}</b> · ${t.libelle} <span class="tag toit">toit</span></td>` +
    `<td>${(t.longueur_panneau_cm / 100).toFixed(2)} m <span class="note">(rampant)</span></td>` +
    `<td>${g.hauteur_avant_cm} → ${g.hauteur_arriere_cm} cm · pente ${g.pente.pourcent}%</td>`;
  tb.appendChild(tr);
}

function fillDebit() {
  const tb = document.querySelector("#debit tbody");
  S.debit.murs.lignes.forEach((r) => {
    const tr = el("tr");
    tr.innerHTML =
      `<td><b>${r.face}</b> · ${r.libelle}</td>` +
      `<td><span class="tag">mur</span></td>` +
      `<td>${r.longueur_cm} × ${r.hauteur_cm} cm` +
      (r.rake ? ' <span class="tag rake">tête en biais</span>' : "") +
      `</td>` +
      `<td>${r.nb_panneaux}</td>` +
      `<td>${r.aire_brute_m2} m²</td>`;
    tb.appendChild(tr);
  });
  const t = S.debit;
  // Face T : la toiture, en panneau finition toit
  const tr = el("tr");
  tr.style.background = "#eef2e8";
  tr.innerHTML =
    `<td><b>${t.toit.face}</b> · ${t.toit.libelle}</td>` +
    `<td><span class="tag toit">toit</span></td>` +
    `<td>${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m (sens de la pente) · couvre ${t.toit.aire_couverte_m2} m²</td>` +
    `<td>${t.toit.nb_panneaux}</td>` +
    `<td>${t.toit.aire_brute_m2} m²</td>`;
  tb.appendChild(tr);
  document.getElementById("debit-resume").innerHTML =
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> (~${t.murs.aire_brute_m2} m² brut, ${t.murs.aire_nette_m2} m² net). ` +
    `Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. ` +
    `Commande totale avec chute ${t.facteur_chute_pct}% : <b>${t.commande_panneaux_m2} m²</b>.`;
}

function fillAchats() {
  const tb = document.querySelector("#achats tbody");
  S.achats.forEach((a) => {
    const tr = el("tr");
    tr.innerHTML = `<td>${a.poste}</td><td>${a.qte}</td><td class="note">${a.note}</td>`;
    tb.appendChild(tr);
  });
}

/* ------------------------------------------------------------------ */
/* Modele 3D                                                           */
/* ------------------------------------------------------------------ */
function build3D() {
  const m = S.model3d;
  const fp = m.footprint;          // [[x,y], ...] metres
  const hs = m.heights;            // hauteur par sommet
  const n = fp.length;

  // centre pour recentrer la scene
  const cx = fp.reduce((s, p) => s + p[0], 0) / n;
  const cy = fp.reduce((s, p) => s + p[1], 0) / n;
  // world: X=x (est), Y=z (haut), Z=-(y) (profondeur negee) -> repere droitier, pas d'effet miroir.
  // L'avant (y=0) se retrouve du cote Z+ (face a la camera par defaut).
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, cy - y);

  const container = document.getElementById("viewer");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe7ee);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(4.5, 3.2, 5.5);

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

  // --- Matieres ---
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x7e8a96, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeae7df, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7177, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
  const roofZ = (ym) => (m.roof_front_m != null ? m.roof_front_m - (m.roof_slope || 0) * ym : hs[0]);

  // --- Sol enherbe ---
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x83a957, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.005;
  grass.receiveShadow = true;
  scene.add(grass);

  // --- Dalle beton blanche (avec debord), posee sur l'herbe ---
  const slab = new THREE.Mesh(prismGeo(V, dilate(fp, 0.22), 0.05, -0.12), concreteMat);
  slab.receiveShadow = true;
  scene.add(slab);

  // --- Rail / lambourde de pied (legerement saillant) ---
  const rail = new THREE.Mesh(prismGeo(V, dilate(fp, 0.03), 0.10, 0.0), railMat);
  rail.castShadow = true; rail.receiveShadow = true;
  scene.add(rail);

  // --- Murs (avec ouvertures : porte + fenetres) ---
  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o) => o.face_index === i).map((o) => ({
      s0: o.offset_m, s1: o.offset_m + o.width_m, y0: o.sill_m, y1: o.sill_m + o.height_m,
    }));
    addWall(scene, V, a, b, ha, hb, holes, panelMat);
  }
  for (const o of openings) {
    addGlass(scene, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);
  }

  // --- Toiture : panneau (epaisseur + debord) + nervures ---
  const over = m.roof_overhang_m || 0.15;
  addRoofSlab(scene, V, fp, hs, m.thickness_m, over, roofMat);
  addRoofRibs(scene, V, fp, roofZ, m.thickness_m, ribMat);

  // --- Gouttiere arriere + descente au point bas ---
  addBackGutter(scene, V, fp, roofZ, over, metalMat);

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
}

function addRoofSlab(scene, V, fp, hs, thk, overhang, mat) {
  // Dalle de toit : polygone dilate (debord radial) + epaisseur, posee sur la tete des murs.
  const n = fp.length;
  const gx = fp.reduce((s, p) => s + p[0], 0) / n;
  const gy = fp.reduce((s, p) => s + p[1], 0) / n;
  const outer = fp.map((p) => {
    const dx = p[0] - gx, dy = p[1] - gy, d = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / d) * overhang, p[1] + (dy / d) * overhang];
  });
  const top = outer.map((p, i) => V(p[0], p[1], hs[i] + thk));
  const bot = outer.map((p, i) => V(p[0], p[1], hs[i]));
  const pts = [];
  for (let i = 1; i < n - 1; i++) {            // dessus
    pts.push(top[0], top[i], top[i + 1]);
  }
  for (let i = 1; i < n - 1; i++) {            // dessous
    pts.push(bot[0], bot[i + 1], bot[i]);
  }
  for (let i = 0; i < n; i++) {                // chants
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

function dilate(fp, over) {
  // dilate le polygone radialement (debord), depuis son centroide
  const n = fp.length;
  const gx = fp.reduce((s, p) => s + p[0], 0) / n;
  const gy = fp.reduce((s, p) => s + p[1], 0) / n;
  return fp.map((p) => {
    const dx = p[0] - gx, dy = p[1] - gy, d = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / d) * over, p[1] + (dy / d) * over];
  });
}

function prismGeo(V, outline, zTop, zBot) {
  // prisme plein (dessus + dessous + chants) a partir d'un contour 2D
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], zTop));
  const bot = outline.map((p) => V(p[0], p[1], zBot));
  const pts = [];
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

function addRoofRibs(scene, V, fp, roofZ, thk, mat) {
  // nervures de toiture : fines bandes saillantes dans le sens de la pente (y)
  const xs = fp.map((p) => p[0]), ys = fp.map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  const step = 0.18, ribW = 0.045, eps = 0.012;
  const pts = [];
  const zt = (yy) => roofZ(yy) + thk + eps;
  for (let x = minx + 0.12; x < maxx - 0.06; x += step) {
    const p0 = V(x, miny, zt(miny)), p1 = V(x + ribW, miny, zt(miny));
    const p2 = V(x + ribW, maxy, zt(maxy)), p3 = V(x, maxy, zt(maxy));
    pts.push(p0, p1, p2, p0, p2, p3);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, mat));
}

function addBackGutter(scene, V, fp, roofZ, over, mat) {
  // arete basse = arriere (face B) : Bend=fp[3] -> BL=fp[4], y constant (max)
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

function addWall(scene, V, a, b, ha, hb, holes, mat) {
  // mur (tete eventuellement en biais) perce de 0..N ouvertures rectangulaires
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h) => V(a[0] + ux * s, a[1] + uy * s, h);
  const topAt = (s) => ha + (hb - ha) * (s / len);
  const pts = [];
  const quad = (p0, p1, p2, p3) => pts.push(p0, p1, p2, p0, p2, p3);
  const sorted = holes.slice().sort((A, B) => A.s0 - B.s0);
  let cur = 0;
  for (const h of sorted) {
    if (h.s0 > cur + 1e-4) quad(P(cur, 0), P(h.s0, 0), P(h.s0, topAt(h.s0)), P(cur, topAt(cur)));
    if (h.y0 > 1e-4) quad(P(h.s0, 0), P(h.s1, 0), P(h.s1, h.y0), P(h.s0, h.y0));        // allege
    quad(P(h.s0, h.y1), P(h.s1, h.y1), P(h.s1, topAt(h.s1)), P(h.s0, topAt(h.s0)));     // linteau
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

function addGlass(scene, V, a, b, o) {
  // vitrage : porte = vantail entrouvert vers l'exterieur ; fenetre = vitre affleurante + cadre
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h) => V(a[0] + ux * s, a[1] + uy * s, h);
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
    leaf.rotation.y = -0.6; // entrebaillement vers l'exterieur
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

/* ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  if (!S) return;
  fillKpis(); fillFaces(); fillDebit(); fillAchats();
  try { build3D(); }
  catch (e) {
    document.getElementById("viewer").innerHTML =
      '<p style="padding:1rem;color:#888">Rendu 3D indisponible (WebGL requis). Voir les plans ci-dessous.</p>';
    console.error(e);
  }
});
