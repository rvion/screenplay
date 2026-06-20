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
let VIEWER = null; // controleur 3D : { rebuild(model) }

function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#5b9bd9");   // ciel bleu
  g.addColorStop(0.5, "#9cc4ec");
  g.addColorStop(1, "#e6eef5");   // horizon clair
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function build3D(model0) {
  const container = document.getElementById("viewer");
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

  // Sol enherbe (statique)
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x83a957, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.005;
  grass.receiveShadow = true;
  scene.add(grass);

  // Batiment dans un groupe reconstructible (edition interactive du JSON)
  const building = new THREE.Group();
  scene.add(building);

  function rebuild(model) {
    for (let i = building.children.length - 1; i >= 0; i--) {
      const ch = building.children[i];
      building.remove(ch);
      ch.traverse((o) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
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

  VIEWER = { rebuild };
  return VIEWER;
}

function populate(group, m) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s, p) => s + p[0], 0) / n;
  const cy = fp.reduce((s, p) => s + p[1], 0) / n;
  // repere droitier : X=est, Y=haut, Z=-(profondeur). Avant (y=0) cote Z+.
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym) => (m.roof_front_m != null ? m.roof_front_m - (m.roof_slope || 0) * ym : hs[0]);

  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x7e8a96, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xeae7df, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7177, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });

  // Dalle beton blanche (avec debord)
  group.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.22), 0.05, -0.12), concreteMat));
  // Rail / lambourde de pied (saillant)
  group.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.03), 0.10, 0.0), railMat));

  // Murs + ouvertures (porte + fenetres)
  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o) => o.face_index === i).map((o) => ({
      s0: o.offset_m, s1: o.offset_m + o.width_m, y0: o.sill_m, y1: o.sill_m + o.height_m,
    }));
    addWall(group, V, a, b, ha, hb, holes, panelMat);
  }
  for (const o of openings) {
    addGlass(group, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);
  }

  // Toiture + nervures + gouttiere arriere
  const over = m.roof_overhang_m || 0.15;
  addRoofSlab(group, V, fp, hs, m.thickness_m, over, roofMat);
  addRoofRibs(group, V, fp, roofZ, m.thickness_m, over, ribMat);
  addBackGutter(group, V, fp, roofZ, over, metalMat);
}

// Recalcule le modele 3D depuis des params edites (miroir JS de generate.py)
function computeModel(P) {
  const FI = { A: 0, D: 1, C: 2, B: 3, G: 4 };
  const e = P.emprise_cm;
  const G = +e.gauche_G, A = +e.avant_A, D = +e.droite_D_jusqu_coupe, B = +e.arriere_B_jusqu_coupe;
  const FL = [0, 0], FR = [A, 0], Dend = [A, D], Bend = [B, G], BL = [0, G];
  const verts = [FL, FR, Dend, Bend, BL];
  const drop = +P.toit.pente_chute_cm, run = G, Hf = +P.murs.hauteur_avant_cm;
  const hAt = (y) => Hf - drop * (y / run);
  const faceDef = [["A", FL, FR], ["D", FR, Dend], ["C", Dend, Bend], ["B", Bend, BL], ["G", BL, FL]];
  const faceLen = {};
  faceDef.forEach(([k, p1, p2]) => (faceLen[k] = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])));
  const startCm = (o, L) => {
    const w = +o.largeur_cm, mg = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm, pos = o.position || "centre";
    if (pos === "droite") return Math.max(0, L - w - mg);
    if (pos === "gauche") return mg;
    return Math.max(0, (L - w) / 2);
  };
  const openings = (P.ouvertures || []).map((o) => {
    const L = faceLen[o.face];
    return {
      type: o.type, face_index: FI[o.face],
      offset_m: startCm(o, L) / 100, width_m: +o.largeur_cm / 100,
      height_m: +o.hauteur_cm / 100, sill_m: (+o.allege_cm || 0) / 100,
    };
  });
  const deb = P.toit.debord_cm;
  const vals = Object.values(deb).map(Number);
  const over = (vals.reduce((a, b) => a + b, 0) / vals.length) / 100;
  return {
    footprint: verts.map((v) => [v[0] / 100, v[1] / 100]),
    heights: verts.map((v) => hAt(v[1]) / 100),
    thickness_m: (+P.panneau.epaisseur_mm) / 1000,
    roof_overhang_m: over, roof_front_m: Hf / 100, roof_slope: drop / run,
    openings,
  };
}

// Plage de y du polygone a une abscisse x donnee (pour clipper les nervures au toit)
function yRangeAtX(poly, x) {
  const ys = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
    if ((x1 <= x && x < x2) || (x2 <= x && x < x1)) {
      const t = (x - x1) / (x2 - x1);
      ys.push(y1 + t * (y2 - y1));
    }
  }
  return ys.length < 2 ? null : [Math.min(...ys), Math.max(...ys)];
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

function addRoofRibs(parent, V, fp, roofZ, thk, over, mat) {
  // nervures : fines bandes dans le sens de la pente (y), CLIPPEES au contour du toit (dilate)
  const outline = dilate(fp, over);
  const xs = outline.map((p) => p[0]);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const step = 0.18, ribW = 0.045, eps = 0.012, inset = 0.05;
  const zt = (yy) => roofZ(yy) + thk + eps;
  const pts = [];
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
function fillBudget() {
  const b = S.budget;
  const tb = document.querySelector("#budget tbody");
  if (!b || !tb) return;
  b.lignes.forEach((r) => {
    const tr = el("tr");
    tr.innerHTML = `<td>${r.poste}</td><td>${r.qte} ${r.unite}</td><td>${r.pu_eur} €</td><td><b>${r.montant_eur} €</b></td>`;
    tb.appendChild(tr);
  });
  const tot = document.getElementById("budget-total");
  if (tot) {
    tot.innerHTML = `Sous-total <b>${b.sous_total_eur} €</b> HT · fourchette indicative ` +
      `<b>${b.total_bas_eur} – ${b.total_haut_eur} €</b> (±${b.incertitude_pct} %)`;
  }
}

function initConfigEditor() {
  const ta = document.getElementById("cfg-text");
  if (!ta) return;
  const status = document.getElementById("cfg-status");
  ta.value = window.SHED_PARAMS_TEXT || "";
  const setStatus = (msg, color) => { if (status) { status.textContent = msg; status.style.color = color; } };
  const apply = document.getElementById("cfg-apply");
  const reset = document.getElementById("cfg-reset");
  if (apply) apply.addEventListener("click", () => {
    try {
      const model = computeModel(JSON.parse(ta.value));
      if (VIEWER) VIEWER.rebuild(model);
      setStatus("✓ Modèle 3D mis à jour. (Les plans cotés et les chiffres sont régénérés côté dépôt avec generate.py.)", "#2a8");
    } catch (err) {
      setStatus("✗ JSON invalide ou paramètre manquant : " + err.message, "#c0392b");
    }
  });
  if (reset) reset.addEventListener("click", () => {
    ta.value = window.SHED_PARAMS_TEXT || "";
    if (VIEWER && S.model3d) VIEWER.rebuild(S.model3d);
    setStatus("Réinitialisé aux valeurs publiées.", "#888");
  });
}

/* ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  if (!S) return;
  fillKpis(); fillFaces(); fillDebit(); fillAchats(); fillBudget();
  try { build3D(S.model3d); }
  catch (e) {
    document.getElementById("viewer").innerHTML =
      '<p style="padding:1rem;color:#888">Rendu 3D indisponible (WebGL requis). Voir les plans ci-dessous.</p>';
    console.error(e);
  }
  initConfigEditor();
});
