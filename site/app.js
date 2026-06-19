import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

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
}

function fillDebit() {
  const tb = document.querySelector("#debit tbody");
  S.debit.murs.lignes.forEach((r) => {
    const tr = el("tr");
    tr.innerHTML =
      `<td><b>${r.face}</b> · ${r.libelle}</td>` +
      `<td>${r.longueur_cm} cm</td>` +
      `<td>${r.hauteur_cm} cm</td>` +
      `<td>${r.nb_panneaux}</td>` +
      `<td>${r.aire_brute_m2} m²</td>`;
    tb.appendChild(tr);
  });
  const t = S.debit;
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
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, y - cy); // world: X=x, Y=haut, Z=y

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

  // --- Dalle beton ---
  const slabShape = new THREE.Shape();
  fp.forEach((p, i) => (i ? slabShape.lineTo(p[0] - cx, p[1] - cy) : slabShape.moveTo(p[0] - cx, p[1] - cy)));
  const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.12, bevelEnabled: false });
  slabGeo.rotateX(Math.PI / 2);
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.95 }));
  slab.position.y = 0;
  slab.receiveShadow = true;
  scene.add(slab);

  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });

  // --- Murs (un quad par arete) ---
  const doorFace = m.door.face_index;
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n];
    const ha = hs[i], hb = hs[(i + 1) % n];
    if (i === doorFace) {
      addWallWithDoor(scene, V, a, b, ha, hb, m.door, panelMat);
    } else {
      const g = new THREE.BufferGeometry();
      const p0 = V(a[0], a[1], 0), p1 = V(b[0], b[1], 0), p2 = V(b[0], b[1], hb), p3 = V(a[0], a[1], ha);
      g.setFromPoints([p0, p1, p2, p0, p2, p3]);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, panelMat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }

  // --- Toiture (eventail) ---
  const roofGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 1; i < n - 1; i++) {
    pts.push(V(fp[0][0], fp[0][1], hs[0]));
    pts.push(V(fp[i][0], fp[i][1], hs[i]));
    pts.push(V(fp[i + 1][0], fp[i + 1][1], hs[i + 1]));
  }
  roofGeo.setFromPoints(pts);
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.castShadow = true;
  scene.add(roof);

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

function addWallWithDoor(scene, V, a, b, ha, hb, door, mat) {
  // mur avec ouverture centree + vantail vitre entrouvert vers l'exterieur
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;   // direction du mur
  const dw = door.width_m, dh = door.height_m;
  const s0 = (len - dw) / 2, s1 = (len + dw) / 2;             // bornes ouverture
  const pt = (s, h) => {
    const x = a[0] + ux * s, y = a[1] + uy * s;
    return V(x, y, h);
  };
  // mur troue : 4 quads (gauche, droite, linteau)
  const quads = [
    [pt(0, 0), pt(s0, 0), pt(s0, ha), pt(0, ha)],
    [pt(s1, 0), pt(len, 0), pt(len, hb), pt(s1, hb)],
    [pt(s0, dh), pt(s1, dh), pt(s1, (ha + hb) / 2), pt(s0, (ha + hb) / 2)],
  ];
  quads.forEach((q) => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints([q[0], q[1], q[2], q[0], q[2], q[3]]);
    g.computeVertexNormals();
    const mh = new THREE.Mesh(g, mat);
    mh.castShadow = true;
    scene.add(mh);
  });
  // vantail vitre, charniere a gauche (s0), pivote vers l'exterieur (normale sortante)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe3ef, transparent: true, opacity: 0.32, roughness: 0.05,
    transmission: 0.6, side: THREE.DoubleSide,
  });
  const hinge = new THREE.Group();
  const h0 = pt(s0, 0);
  hinge.position.copy(h0);
  // repere local : axe du mur
  const leafGeo = new THREE.PlaneGeometry(dw, dh);
  leafGeo.translate(dw / 2, dh / 2, 0);
  const leaf = new THREE.Mesh(leafGeo, glass);
  // oriente le plan le long du mur puis ouvre de ~35 deg
  const dir = new THREE.Vector3(V(b[0], b[1], 0).x - V(a[0], a[1], 0).x, 0,
                                V(b[0], b[1], 0).z - V(a[0], a[1], 0).z).normalize();
  const ang = Math.atan2(dir.z, dir.x);
  hinge.rotation.y = -ang;
  leaf.rotation.y = -0.6; // entrebaillement vers l'exterieur
  hinge.add(leaf);
  scene.add(hinge);
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
