// site/src/compute.ts
var FACE_INDEX = { A: 0, D: 1, C: 2, B: 3, G: 4 };
function rnd(x, nd = 0) {
  if (!isFinite(x)) return x;
  const neg = x < 0;
  const v = Math.abs(x);
  const m = Math.pow(10, nd);
  const scaled = v * m;
  const fl = Math.floor(scaled);
  const diff = scaled - fl;
  let r;
  if (diff === 0.5) r = fl % 2 === 0 ? fl : fl + 1;
  else r = Math.round(scaled);
  const out = r / m;
  return neg ? -out : out;
}
function incDigits(s) {
  const a = s.split("");
  let i = a.length - 1;
  for (; i >= 0; i--) {
    if (a[i] === "9") a[i] = "0";
    else {
      a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1);
      break;
    }
  }
  if (i < 0) a.unshift("1");
  return a.join("");
}
function pyfix(x, nd) {
  if (!isFinite(x)) return String(x);
  const neg = x < 0;
  const ax = Math.abs(x);
  const [intp, fracRaw] = ax.toFixed(18).split(".");
  const frac = fracRaw || "";
  let digits = intp + frac.slice(0, nd).padEnd(nd, "0");
  const rest = frac.slice(nd);
  if (rest) {
    const head = rest[0];
    let up;
    if (head > "5") up = true;
    else if (head < "5") up = false;
    else up = /[1-9]/.test(rest.slice(1)) ? true : (digits.charCodeAt(digits.length - 1) - 48) % 2 === 1;
    if (up) digits = incDigits(digits);
  }
  digits = digits.padStart(nd + 1, "0");
  const cut = digits.length - nd;
  let out = digits.slice(0, cut).replace(/^0+(?=\d)/, "");
  if (nd) out += "." + digits.slice(cut);
  return neg && /[1-9]/.test(digits) ? "-" + out : out;
}
var f0 = (x) => pyfix(x, 0);
var f1 = (x) => pyfix(x, 1);
var f2 = (x) => pyfix(x, 2);
var itr = (x) => Math.trunc(x);
var pyNum = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
function geometry(p) {
  const e = p.emprise_cm;
  const G = +e.gauche_G, A = +e.avant_A, D = +e.droite_D_jusqu_coupe, B = +e.arriere_B_jusqu_coupe;
  const FL = [0, 0], FR = [A, 0], Dend = [A, D], Bend = [B, G], BL = [0, G];
  const verts = [FL, FR, Dend, Bend, BL];
  const names = ["avant-gauche", "avant-droite", "fin-droite (coupe)", "fin-arriere (coupe)", "arriere-gauche"];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const C = dist(Dend, Bend);
  let s = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  const area_cm2 = Math.abs(s) / 2;
  const drop = +p.toit.pente_chute_cm, run = G, Hf = +p.murs.hauteur_avant_cm;
  const h_at = (y) => Hf - drop * (y / run);
  const slope_pct = 100 * drop / run;
  const slope_deg = Math.atan2(drop, run) * 180 / Math.PI;
  const vert_heights = verts.map((v) => rnd(h_at(v[1]), 1));
  const facesDef = [
    ["A", "Avant", FL, FR],
    ["D", "Droite", FR, Dend],
    ["C", "Coupe", Dend, Bend],
    ["B", "Arriere", Bend, BL],
    ["G", "Gauche", BL, FL]
  ];
  const face_data = facesDef.map(([key, label, p1, p2]) => {
    const length = dist(p1, p2), h1 = h_at(p1[1]), h2 = h_at(p2[1]);
    return {
      cle: key,
      libelle: label,
      longueur_cm: rnd(length, 1),
      hauteur_debut_cm: rnd(h1, 1),
      hauteur_fin_cm: rnd(h2, 1),
      hauteur_max_cm: rnd(Math.max(h1, h2), 1),
      rake: Math.abs(h1 - h2) > 0.1
    };
  });
  return {
    verts: verts.map((v) => [rnd(v[0], 1), rnd(v[1], 1)]),
    vert_names: names,
    vert_heights_cm: vert_heights,
    cotes: { G, A, D, B, C: rnd(C, 1) },
    aire_m2: rnd(area_cm2 / 1e4, 2),
    perimetre_cm: rnd(face_data.reduce((a, f) => a + f.longueur_cm, 0), 1),
    pente: { chute_cm: drop, run_cm: run, pourcent: rnd(slope_pct, 1), degres: rnd(slope_deg, 2) },
    hauteur_avant_cm: Hf,
    hauteur_arriere_cm: rnd(Hf - drop, 1),
    faces: face_data
  };
}
function opening_start_cm(o, face_len) {
  const w = +o.largeur_cm;
  const margin = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm;
  const pos = o.position || "centre";
  if (pos === "droite") return Math.max(0, face_len - w - margin);
  if (pos === "gauche") return margin;
  return Math.max(0, (face_len - w) / 2);
}
function resolve_openings(p, g) {
  const facelen = {};
  for (const f of g.faces) facelen[f.cle] = f.longueur_cm;
  return (p.ouvertures || []).map((o) => {
    const L = facelen[o.face];
    return {
      id: o.id != null ? o.id : o.type,
      type: o.type,
      face: o.face,
      face_index: FACE_INDEX[o.face],
      largeur_cm: +o.largeur_cm,
      hauteur_cm: +o.hauteur_cm,
      allege_cm: o.allege_cm == null ? 0 : +o.allege_cm,
      start_cm: rnd(opening_start_cm(o, L), 1),
      position: o.position || "centre",
      ouverture: o.ouverture || "",
      description: o.description || ""
    };
  });
}
function takeoff(p, g, openings) {
  const cover = +p.panneau.largeur_utile_cm;
  const waste = 1 + +p.divers.facteur_chute_pct / 100;
  const ded = {};
  for (const o of openings) ded[o.face] = (ded[o.face] || 0) + o.largeur_cm * o.hauteur_cm / 1e4;
  const rows = [];
  let gross = 0, net = 0;
  for (const f of g.faces) {
    const L = f.longueur_cm;
    const nn = Math.ceil(L / cover);
    const hmax = f.hauteur_max_cm;
    const g_area = nn * (cover / 100) * (hmax / 100);
    const avg_h = (f.hauteur_debut_cm + f.hauteur_fin_cm) / 2;
    let n_area = L / 100 * (avg_h / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area;
    net += n_area;
    rows.push({
      face: f.cle,
      libelle: f.libelle,
      finition: "mur",
      longueur_cm: L,
      hauteur_cm: hmax,
      nb_panneaux: nn,
      aire_brute_m2: rnd(g_area, 2),
      rake: f.rake
    });
  }
  const deb = p.toit.debord_cm;
  const run_len = g.pente.run_cm + deb.avant + deb.arriere;
  const width_x = g.cotes.A + deb.gauche + deb.droite;
  const n_roof = Math.ceil(width_x / cover);
  const roof_gross = n_roof * (cover / 100) * (run_len / 100);
  const debVals = Object.values(deb).map(Number);
  const avg_overhang = debVals.reduce((a, b) => a + b, 0) / debVals.length / 100;
  const roof_real = g.aire_m2 + g.perimetre_cm / 100 * avg_overhang;
  return {
    murs: {
      lignes: rows,
      aire_brute_m2: rnd(gross, 2),
      aire_nette_m2: rnd(net, 2),
      ouvertures_deduites_m2: rnd(Object.values(ded).reduce((a, b) => a + b, 0), 2),
      total_panneaux: rows.reduce((a, r) => a + r.nb_panneaux, 0)
    },
    toit: {
      face: "T",
      libelle: "Toiture",
      finition: "toit",
      nb_panneaux: n_roof,
      longueur_panneau_cm: rnd(run_len, 1),
      aire_brute_m2: rnd(roof_gross, 2),
      aire_couverte_m2: rnd(roof_real, 2)
    },
    commande_panneaux_m2: rnd((gross + roof_gross) * waste, 1),
    facteur_chute_pct: p.divers.facteur_chute_pct
  };
}
function shopping(p, g, t, openings) {
  const ceil = Math.ceil;
  const perim = g.perimetre_cm / 100;
  const n_corners = g.faces.length;
  const corner_h = Math.max(g.hauteur_avant_cm / 100, 2.4);
  const gutter_len = (g.cotes.B + g.cotes.C) / 100;
  const anchors = ceil(perim / 0.5);
  const screws = ceil((t.murs.aire_brute_m2 + t.toit.aire_brute_m2) * 6);
  const portes = openings.filter((o) => o.type === "porte");
  const fenetres = openings.filter((o) => o.type === "fenetre");
  const porte_q = portes.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} cm`).join(", ") || "-";
  const fen_q = fenetres.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} all.${itr(o.allege_cm)} (face ${o.face})`).join(", ") || "-";
  const open_perim = openings.reduce((a, o) => a + 2 * (o.largeur_cm + o.hauteur_cm), 0) / 100;
  const items = [
    { poste: "Panneaux sandwich 60 mm - finition MUR (faces A,D,C,B,G)", qte: `${pyNum(t.murs.aire_brute_m2)} m2 brut (net ~${pyNum(t.murs.aire_nette_m2)} m2)`, note: "Ame PIR. Parement mural lisse/micro-nervure, laque 2 faces. Commander a longueur." },
    { poste: "Panneaux sandwich 60 mm - finition TOIT (face T)", qte: `${t.toit.nb_panneaux} panneaux de ~${f2(t.toit.longueur_panneau_cm / 100)} m (${pyNum(t.toit.aire_brute_m2)} m2 brut)`, note: "Profil de TOITURE (nervures hautes) pose dans le sens de la pente, recouvrements lateraux vers le bas. Different des panneaux de mur." },
    { poste: "Rail / lambourde de pied", qte: `~${ceil(perim) + 1} m`, note: "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle." },
    { poste: "Profils d'angle exterieurs", qte: `${n_corners} angles x ${f1(corner_h)} m = ~${ceil(n_corners * corner_h)} m`, note: "L'angle C n'est pas a 90 deg : prevoir profil pliable ou sur-mesure." },
    { poste: "Profils d'angle / finition interieurs", qte: `~${ceil(n_corners * corner_h)} m`, note: "Couvre-joints d'angle interieurs." },
    { poste: "Bavette d'egout haut (avant)", qte: `~${ceil(g.cotes.A / 100) + 1} m`, note: "Larmier en haut de la face avant." },
    { poste: "Bavettes de rive (gauche/droite/coupe)", qte: `~${ceil((g.cotes.G + g.cotes.D + g.cotes.C) / 100) + 1} m`, note: "Rives laterales du toit, avec debord." },
    { poste: "Gouttiere + 1 descente", qte: `~${ceil(gutter_len) + 1} m + 1 descente`, note: "En bas de pente (faces B + C), descente au point bas (coin Bend)." },
    { poste: "Vis autoperceuses tete EPDM", qte: `~${screws} (boite de ${Math.ceil(screws / 100) * 100})`, note: "Longueur = epaisseur panneau + structure. Rondelle d'etancheite obligatoire." },
    { poste: "Chevilles / scellement dalle", qte: `~${anchors}`, note: "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)." },
    { poste: "Porte vitree alu double vitrage", qte: `${portes.length} (${porte_q})`, note: "Ouverture vers l'exterieur. Dormant + seuil + joints." },
    { poste: "Ventilation (VMC ou aerateurs hygro)", qte: "1 kit", note: "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)." },
    { poste: "Bande comprimee / mousse precomprimee", qte: `~${ceil(perim + open_perim)} m`, note: "Etancheite a l'air au pied et au pourtour des ouvertures." },
    { poste: "Bande butyle (joints de panneaux)", qte: `~${ceil(perim * 2)} m`, note: "Joints longitudinaux et perimetriques." },
    { poste: "Mastic PU + primaire anticorrosion", qte: "~5 cartouches + 1 primaire", note: "Cachetage et protection des chants coupes (anticorrosion)." },
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." }
  ];
  if (fenetres.length) {
    items.splice(11, 0, { poste: "Fenetres double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). Fixe ou oscillo-battant selon besoin. Cadre + appui + joints." });
  }
  return items;
}
function budget(p, g, t, openings) {
  const pr = p.prix_indicatifs_eur || {};
  const get = (k) => pr[k] == null ? 0 : pr[k];
  const perim = g.perimetre_cm / 100;
  const n_corners = g.faces.length;
  const corner_h = Math.max(g.hauteur_avant_cm / 100, 2.4);
  const profils_ml = n_corners * corner_h * 2 + perim;
  const portes = openings.filter((o) => o.type === "porte").length;
  const fenetres = openings.filter((o) => o.type === "fenetre").length;
  const src = [
    ["Panneaux sandwich - mur (brut)", t.murs.aire_brute_m2, "m\xB2", get("panneau_mur_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m\xB2", get("panneau_toit_m2")],
    ["Porte(s) vitree(s)", portes, "u", get("porte_vitree")],
    ["Fenetre(s)", fenetres, "u", get("fenetre")],
    ["Profils (angles, rives, rail)", rnd(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")]
  ];
  const rows = [];
  let sous = 0;
  for (const [label, qte, unit, pu] of src) {
    const montant = qte * pu;
    sous += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd(montant) });
  }
  const inc = pr.incertitude_pct == null ? 15 : +pr.incertitude_pct;
  return {
    lignes: rows,
    sous_total_eur: rnd(sous),
    incertitude_pct: inc,
    total_bas_eur: rnd(sous * (1 - inc / 100)),
    total_haut_eur: rnd(sous * (1 + inc / 100))
  };
}
function model3d(p, g, openings) {
  const verts_m = g.verts.map((v) => [v[0] / 100, v[1] / 100]);
  const heights_m = g.vert_heights_cm.map((h2) => h2 / 100);
  const deb = p.toit.debord_cm;
  const debVals = Object.values(deb).map(Number);
  const overhang_m = debVals.reduce((a, b) => a + b, 0) / debVals.length / 100;
  const drop = +p.toit.pente_chute_cm, run = g.pente.run_cm;
  return {
    footprint: verts_m,
    heights: heights_m,
    thickness_m: +p.panneau.epaisseur_mm / 1e3,
    roof_overhang_m: rnd(overhang_m, 3),
    roof_front_m: rnd(g.hauteur_avant_cm / 100, 3),
    roof_slope: rnd(drop / run, 5),
    openings: openings.map((o) => ({
      type: o.type,
      face_index: o.face_index,
      offset_m: rnd(o.start_cm / 100, 3),
      width_m: rnd(o.largeur_cm / 100, 3),
      height_m: rnd(o.hauteur_cm / 100, 3),
      sill_m: rnd(o.allege_cm / 100, 3)
    }))
  };
}
function svgHeader(w, h2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h2}" font-family="system-ui,sans-serif" font-size="13">
<rect width="${w}" height="${h2}" fill="#fbfbf8"/>
`;
}
function line(x1, y1, x2, y2, stroke = "#333", w = 1, dash = "") {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}"${d}/>
`;
}
function text(x, y, s, anchor = "middle", fill = "#222", size = 13, weight = "normal") {
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}">${s}</text>
`;
}
function tw(s, size) {
  return s.length * size * 0.58;
}
function plan_sol_svg(p, g, openings) {
  const pad = 70, scale = 0.42;
  const xs = g.verts.map((v) => v[0]), ys = g.verts.map((v) => v[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys);
  const base_W = (Math.max(...xs) - minx) * scale + 2 * pad;
  const H = (Math.max(...ys) - miny) * scale + 2 * pad;
  const title = `Plan de sol \xB7 ${pyNum(g.aire_m2)} m\xB2`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v) => [pad + xoff + (v[0] - minx) * scale, H - pad - (v[1] - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const pts = g.verts.map((v) => {
    const q = P(v);
    return `${f1(q[0])},${f1(q[1])}`;
  }).join(" ");
  svg += `<polygon points="${pts}" fill="#dce8f5" stroke="#2b5d8a" stroke-width="2"/>
`;
  const labels = ["A", "D", "C", "B", "G"];
  const cot = g.cotes;
  const valmap = { A: cot.A, D: cot.D, C: cot.C, B: cot.B, G: cot.G };
  const n = g.verts.length;
  for (let i = 0; i < n; i++) {
    const A0 = P(g.verts[i]), B0 = P(g.verts[(i + 1) % n]);
    const mx = (A0[0] + B0[0]) / 2, my = (A0[1] + B0[1]) / 2;
    const lab = labels[i];
    svg += text(mx, my - 6, `${lab} = ${f0(valmap[lab])} cm`, "middle", "#2b5d8a", 14, "bold");
  }
  const edge = { A: [0, 1], D: [1, 2], C: [2, 3], B: [3, 4], G: [4, 0] };
  for (const o of openings) {
    const [i1, i2] = edge[o.face];
    const v1 = g.verts[i1], v2 = g.verts[i2];
    const Lf = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
    const ux = (v2[0] - v1[0]) / Lf, uy = (v2[1] - v1[1]) / Lf;
    const s0 = o.start_cm, s1 = o.start_cm + o.largeur_cm;
    const q0 = P([v1[0] + ux * s0, v1[1] + uy * s0]);
    const q1 = P([v1[0] + ux * s1, v1[1] + uy * s1]);
    const owx = uy, owy = ux;
    if (o.type === "porte") {
      const dwpx = o.largeur_cm * scale;
      const oe = [q0[0] + owx * dwpx, q0[1] + owy * dwpx];
      svg += line(q0[0], q0[1], q1[0], q1[1], "#c0392b", 5);
      svg += line(q0[0], q0[1], oe[0], oe[1], "#c0392b", 2);
      svg += `<path d="M ${f1(q1[0])} ${f1(q1[1])} A ${f1(dwpx)} ${f1(dwpx)} 0 0 1 ${f1(oe[0])} ${f1(oe[1])}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>
`;
      svg += text((q0[0] + q1[0]) / 2 + owx * 18, (q0[1] + q1[1]) / 2 + owy * 18, `Porte ${itr(o.largeur_cm)} (dehors)`, "middle", "#c0392b", 11);
    } else {
      svg += line(q0[0], q0[1], q1[0], q1[1], "#1b9aa8", 5);
      svg += text((q0[0] + q1[0]) / 2 + owx * 14, (q0[1] + q1[1]) / 2 + owy * 14, `fen. ${itr(o.largeur_cm)}`, "middle", "#137", 10);
    }
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, "pente vers l'arri\xE8re (face B)", "middle", "#888", 11);
  svg += text(W / 2, H - 16, "AVANT (face A)", "middle", "#666", 12);
  svg += "</svg>\n";
  return svg;
}
function plan_toit_svg(p, g) {
  const pad = 70, scale = 0.42;
  const deb = p.toit.debord_cm;
  const xs = g.verts.map((v) => v[0]), ys = g.verts.map((v) => v[1]);
  const minx = Math.min(...xs) - deb.gauche, maxx = Math.max(...xs) + deb.droite;
  const miny = Math.min(...ys) - deb.avant, maxy = Math.max(...ys) + deb.arriere;
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de toiture \xB7 pente ${pyNum(g.pente.pourcent)} %`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (x, y) => [pad + xoff + (x - minx) * scale, H - pad - (y - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const outline = [[minx, miny], [maxx, miny], [maxx, g.verts[2][1] + deb.droite], [g.verts[3][0] + deb.coupe, maxy], [minx, maxy]];
  const pts = outline.map(([x, y]) => {
    const q = P(x, y);
    return `${f1(q[0])},${f1(q[1])}`;
  }).join(" ");
  svg += `<polygon points="${pts}" fill="#e8eee2" stroke="#6b8e23" stroke-width="2"/>
`;
  const wpts = g.verts.map((v) => {
    const q = P(v[0], v[1]);
    return `${f1(q[0])},${f1(q[1])}`;
  }).join(" ");
  svg += `<polygon points="${wpts}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="6 4"/>
`;
  for (const fx of [0.3, 0.6]) {
    const x = minx + (maxx - minx) * fx;
    const y0 = P(x, miny + 20), y1 = P(x, maxy - 20);
    svg += line(y0[0], y0[1], y1[0], y1[1], "#2b7", 2);
    svg += `<polygon points="${f0(y1[0])},${f0(y1[1])} ${f0(y1[0] - 5)},${f0(y1[1] + 9)} ${f0(y1[0] + 5)},${f0(y1[1] + 9)}" fill="#2b7"/>
`;
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${pyNum(g.pente.degres)}\xB0 \xB7 \xE9coulement vers l'arri\xE8re`, "middle", "#888", 11);
  svg += text(W / 2, H - 16, "\xE9coulement de l'eau \u2192", "middle", "#2b7", 12);
  svg += "</svg>\n";
  return svg;
}
function facade_svg(p, g, face, openings) {
  const pad = 60, scale = 0.6;
  const L = face.longueur_cm, h1 = face.hauteur_debut_cm, h2 = face.hauteur_fin_cm;
  const base_W = L * scale + 2 * pad;
  const H = Math.max(h1, h2) * scale + 2 * pad;
  const title = `Face ${face.cle} \u2014 ${face.libelle}`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x, h3) => [pad + x * scale, H - pad - h3 * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const poly = [P(0, 0), P(L, 0), P(L, h2), P(0, h1)];
  const pts = poly.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");
  svg += `<polygon points="${pts}" fill="#eef2f6" stroke="#2b5d8a" stroke-width="2"/>
`;
  for (const o of openings) {
    if (o.face !== face.cle) continue;
    const ow = o.largeur_cm * scale, oh = o.hauteur_cm * scale;
    const sx = pad + o.start_cm * scale;
    const by = H - pad - o.allege_cm * scale;
    svg += `<rect x="${f1(sx)}" y="${f1(by - oh)}" width="${f1(ow)}" height="${f1(oh)}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>
`;
    if (o.type === "porte") {
      svg += line(sx, by - oh / 2, sx - 16, by - oh / 2, "#1b6", 1, "3 3");
      svg += text(sx + ow / 2, by - oh / 2, "porte", "middle", "#178", 11);
    } else {
      svg += text(sx + ow / 2, by - oh / 2, "fen\xEAtre", "middle", "#178", 10);
      svg += text(sx + ow / 2, by + 12, `all\xE8ge ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm`, "middle", "#222", 13, "bold");
  svg += text(pad - 8, P(0, h1)[1], `${f0(h1)}`, "end", "#2b5d8a", 12);
  svg += text(pad + L * scale + 8, P(L, h2)[1], `${f0(h2)}`, "start", "#2b5d8a", 12);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += "</svg>\n";
  return svg;
}
function buildCore(p) {
  const g = geometry(p);
  const openings = resolve_openings(p, g);
  const t = takeoff(p, g, openings);
  const sh = shopping(p, g, t, openings);
  const bud = budget(p, g, t, openings);
  const m = model3d(p, g, openings);
  const svg = {
    "plan-sol": plan_sol_svg(p, g, openings),
    "plan-toit": plan_toit_svg(p, g)
  };
  for (const f of g.faces) svg[`facade-${f.cle}`] = facade_svg(p, g, f, openings);
  return { geometrie: g, debit: t, achats: sh, budget: bud, ouvertures: openings, model3d: m, svg };
}

// site/src/viewer.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#5b9bd9");
  g.addColorStop(0.5, "#9cc4ec");
  g.addColorStop(1, "#e6eef5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function yRangeAtX(poly, x) {
  const ys = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
    if (x1 <= x && x < x2 || x2 <= x && x < x1) {
      const t = (x - x1) / (x2 - x1);
      ys.push(y1 + t * (y2 - y1));
    }
  }
  return ys.length < 2 ? null : [Math.min(...ys), Math.max(...ys)];
}
function dilate(fp, over) {
  const n = fp.length;
  const gx = fp.reduce((s, p) => s + p[0], 0) / n;
  const gy = fp.reduce((s, p) => s + p[1], 0) / n;
  return fp.map((p) => {
    const dx = p[0] - gx, dy = p[1] - gy, d = Math.hypot(dx, dy) || 1;
    return [p[0] + dx / d * over, p[1] + dy / d * over];
  });
}
function prismGeo(V, outline, zTop, zBot) {
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
function addRoofSlab(scene, V, fp, hs, thk, overhang, mat) {
  const n = fp.length;
  const outer = dilate(fp, overhang);
  const top = outer.map((p, i) => V(p[0], p[1], hs[i] + thk));
  const bot = outer.map((p, i) => V(p[0], p[1], hs[i]));
  const pts = [];
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
function addRoofRibs(parent, V, fp, roofZ, thk, over, mat) {
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
    pts.push(
      V(x, y0, zt(y0)),
      V(x + ribW, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y1, zt(y1))
    );
  }
  if (!pts.length) return;
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, mat));
}
function addBackGutter(scene, V, fp, roofZ, over, mat) {
  const Bend = fp[3], BL = fp[4];
  const yb = Math.max(Bend[1], BL[1]) + over * 0.8;
  const x0 = Math.min(Bend[0], BL[0]), x1 = Math.max(Bend[0], BL[0]);
  const zc = roofZ(Math.max(Bend[1], BL[1])) - 0.03;
  const len = x1 - x0 + 0.12;
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.08), mat);
  gutter.position.copy(V((x0 + x1) / 2, yb, zc));
  gutter.castShadow = true;
  scene.add(gutter);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.max(zc, 0.1), 14), mat);
  pipe.position.copy(V(Bend[0], yb, zc / 2));
  scene.add(pipe);
}
function addWall(scene, V, a, b, ha, hb, holes, mat) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h2) => V(a[0] + ux * s, a[1] + uy * s, h2);
  const topAt = (s) => ha + (hb - ha) * (s / len);
  const pts = [];
  const quad = (p0, p1, p2, p3) => pts.push(p0, p1, p2, p0, p2, p3);
  const sorted = holes.slice().sort((A, B) => A.s0 - B.s0);
  let cur = 0;
  for (const h2 of sorted) {
    if (h2.s0 > cur + 1e-4) quad(P(cur, 0), P(h2.s0, 0), P(h2.s0, topAt(h2.s0)), P(cur, topAt(cur)));
    if (h2.y0 > 1e-4) quad(P(h2.s0, 0), P(h2.s1, 0), P(h2.s1, h2.y0), P(h2.s0, h2.y0));
    quad(P(h2.s0, h2.y1), P(h2.s1, h2.y1), P(h2.s1, topAt(h2.s1)), P(h2.s0, topAt(h2.s0)));
    cur = h2.s1;
  }
  if (len > cur + 1e-4) quad(P(cur, 0), P(len, 0), P(len, topAt(len)), P(cur, topAt(cur)));
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
function addGlass(scene, V, a, b, o) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h2) => V(a[0] + ux * s, a[1] + uy * s, h2);
  const s0 = o.offset_m, s1 = o.offset_m + o.width_m, y0 = o.sill_m, y1 = o.sill_m + o.height_m;
  const glass = new THREE.MeshPhysicalMaterial({
    color: 12575727,
    transparent: true,
    opacity: 0.34,
    roughness: 0.05,
    transmission: 0.6,
    side: THREE.DoubleSide
  });
  if (o.type === "porte") {
    const hinge = new THREE.Group();
    hinge.position.copy(P(s0, 0));
    const dir = new THREE.Vector3().subVectors(P(s1, 0), P(s0, 0));
    dir.y = 0;
    dir.normalize();
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
      new THREE.LineBasicMaterial({ color: 5595755 })
    );
    scene.add(frame);
  }
}
function populate(group2, m) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s, p) => s + p[0], 0) / n;
  const cy = fp.reduce((s, p) => s + p[1], 0) / n;
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym) => m.roof_front_m != null ? m.roof_front_m - (m.roof_slope || 0) * ym : hs[0];
  const panelMat = new THREE.MeshStandardMaterial({ color: 15659250, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 10135476, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 8293014, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 15394783, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 7041399, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 11844288, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
  group2.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.22), 0.05, -0.12), concreteMat));
  group2.add(new THREE.Mesh(prismGeo(V, dilate(fp, 0.03), 0.1, 0), railMat));
  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o) => o.face_index === i).map((o) => ({
      s0: o.offset_m,
      s1: o.offset_m + o.width_m,
      y0: o.sill_m,
      y1: o.sill_m + o.height_m
    }));
    addWall(group2, V, a, b, ha, hb, holes, panelMat);
  }
  for (const o of openings) addGlass(group2, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);
  const over = m.roof_overhang_m || 0.15;
  addRoofSlab(group2, V, fp, hs, m.thickness_m, over, roofMat);
  addRoofRibs(group2, V, fp, roofZ, m.thickness_m, over, ribMat);
  addBackGutter(group2, V, fp, roofZ, over, metalMat);
}
function createViewer(container, model0) {
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
  scene.add(new THREE.AmbientLight(16777215, 0.7));
  const sun = new THREE.DirectionalLight(16777215, 1);
  sun.position.set(5, 8, 3);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(13624319, 7039824, 0.4));
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 8628567, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -5e-3;
  grass.receiveShadow = true;
  scene.add(grass);
  const building = new THREE.Group();
  scene.add(building);
  function rebuild(model) {
    for (let i = building.children.length - 1; i >= 0; i--) {
      const ch = building.children[i];
      building.remove(ch);
      ch.traverse((o) => {
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      });
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

// site/src/render.ts
function setHTML(sel, html) {
  const e = document.querySelector(sel);
  if (e) e.innerHTML = html;
}
function setText(id, txt) {
  const e = document.getElementById(id);
  if (e) e.textContent = txt;
}
function renderKpis(core, p) {
  const g = core.geometrie;
  const data = [
    [g.aire_m2 + " m\xB2", "Surface au sol"],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "\xB0)"],
    [p.panneau.epaisseur_mm + " mm", "Panneaux sandwich"],
    [core.debit.commande_panneaux_m2 + " m\xB2", "Panneaux \xE0 commander"]
  ];
  setHTML("#kpis", data.map(([v, l]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join(""));
}
function renderFaces(core) {
  const g = core.geometrie, t = core.debit.toit;
  let rows = g.faces.map((f) => `<tr><td><b>${f.cle}</b> \xB7 ${f.libelle}</td><td>${f.longueur_cm} cm</td><td>${f.hauteur_debut_cm} \u2192 ${f.hauteur_fin_cm} cm` + (f.rake ? ' <span class="tag rake">biais</span>' : "") + `</td></tr>`).join("");
  rows += `<tr style="background:#eef2e8"><td><b>${t.face}</b> \xB7 ${t.libelle} <span class="tag toit">toit</span></td><td>${(t.longueur_panneau_cm / 100).toFixed(2)} m <span class="note">(rampant)</span></td><td>${g.hauteur_avant_cm} \u2192 ${g.hauteur_arriere_cm} cm \xB7 pente ${g.pente.pourcent}%</td></tr>`;
  setHTML("#faces tbody", rows);
}
function renderPlans(core) {
  for (const [name, svg] of Object.entries(core.svg)) {
    const box = document.getElementById("plan-" + name);
    if (box) box.innerHTML = svg;
  }
}
function renderDebit(core) {
  const t = core.debit;
  let rows = t.murs.lignes.map((r) => `<tr><td><b>${r.face}</b> \xB7 ${r.libelle}</td><td><span class="tag">mur</span></td><td>${r.longueur_cm} \xD7 ${r.hauteur_cm} cm` + (r.rake ? ' <span class="tag rake">t\xEAte en biais</span>' : "") + `</td><td>${r.nb_panneaux}</td><td>${r.aire_brute_m2} m\xB2</td></tr>`).join("");
  rows += `<tr style="background:#eef2e8"><td><b>${t.toit.face}</b> \xB7 ${t.toit.libelle}</td><td><span class="tag toit">toit</span></td><td>${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m (sens de la pente) \xB7 couvre ${t.toit.aire_couverte_m2} m\xB2</td><td>${t.toit.nb_panneaux}</td><td>${t.toit.aire_brute_m2} m\xB2</td></tr>`;
  setHTML("#debit tbody", rows);
  setHTML(
    "#debit-resume",
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> (~${t.murs.aire_brute_m2} m\xB2 brut, ${t.murs.aire_nette_m2} m\xB2 net). Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. Commande totale avec chute ${t.facteur_chute_pct}% : <b>${t.commande_panneaux_m2} m\xB2</b>.`
  );
}
function renderAchats(core) {
  setHTML("#achats tbody", core.achats.map((a) => `<tr><td>${a.poste}</td><td>${a.qte}</td><td class="note">${a.note}</td></tr>`).join(""));
}
function renderBudget(core) {
  const b = core.budget;
  setHTML("#budget tbody", b.lignes.map((r) => `<tr><td>${r.poste}</td><td>${r.qte} ${r.unite}</td><td>${r.pu_eur} \u20AC</td><td><b>${r.montant_eur} \u20AC</b></td></tr>`).join(""));
  setHTML(
    "#budget-total",
    `Sous-total <b>${b.sous_total_eur} \u20AC</b> HT \xB7 fourchette indicative <b>${b.total_bas_eur} \u2013 ${b.total_haut_eur} \u20AC</b> (\xB1${b.incertitude_pct} %)`
  );
}
function renderVigilance(core, p) {
  const pente = core.geometrie.pente;
  setText("cover", p.panneau.largeur_utile_cm + " cm");
  setText("v-chute", String(pente.chute_cm));
  setText("v-pente", pente.pourcent + " %");
  setText("v-pente-deg", pente.degres + "\xB0");
}
function renderAll(core, p) {
  renderKpis(core, p);
  renderFaces(core);
  renderPlans(core);
  renderDebit(core);
  renderAchats(core);
  renderBudget(core);
  renderVigilance(core, p);
}

// site/src/controls.ts
var FACES = [["A", "A \xB7 avant"], ["D", "D \xB7 droite"], ["C", "C \xB7 coupe"], ["B", "B \xB7 arri\xE8re"], ["G", "G \xB7 gauche"]];
var POSITIONS = [["gauche", "gauche"], ["centre", "centre"], ["droite", "droite"]];
var TYPES = [["porte", "porte"], ["fenetre", "fen\xEAtre"]];
function h(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of children) e.append(c);
  return e;
}
function group(title, nodes, open = true) {
  return h("details", { class: "ctl-group", ...open ? { open: "" } : {} }, [
    h("summary", {}, [title]),
    ...nodes
  ]);
}
function buildControls(container, params, onChange) {
  function slider(label, obj, key, min, max, step = 1, unit = "cm") {
    const out = h("span", { class: "ctl-val" }, [`${obj[key]} ${unit}`]);
    const input = h("input", { type: "range", min, max, step, value: obj[key] });
    input.addEventListener("input", () => {
      obj[key] = Number(input.value);
      out.textContent = `${obj[key]} ${unit}`;
      onChange();
    });
    return h("label", { class: "ctl ctl-range" }, [h("span", { class: "ctl-lbl" }, [label, out]), input]);
  }
  function num(label, obj, key, step = 1, width = "5.5em") {
    const input = h("input", { type: "number", step, value: obj[key], style: `width:${width}` });
    input.addEventListener("input", () => {
      obj[key] = input.value === "" ? 0 : Number(input.value);
      onChange();
    });
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), input]);
  }
  function select(label, obj, key, options) {
    const sel = h("select", {
      onchange: () => {
        obj[key] = sel.value;
        onChange();
      }
    }, options.map(([v, l]) => {
      const o = h("option", { value: v }, [l]);
      if (String(obj[key]) === v) o.selected = true;
      return o;
    }));
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), sel]);
  }
  function selectStruct(obj, key, options) {
    const sel = h("select", {
      onchange: () => {
        obj[key] = sel.value;
        renderOpenings();
        onChange();
      }
    }, options.map(([v, l]) => {
      const o = h("option", { value: v }, [l]);
      if (String(obj[key]) === v) o.selected = true;
      return o;
    }));
    return sel;
  }
  function onum(o, key, label) {
    const input = h("input", { type: "number", step: 1, value: o[key] ?? 0, style: "width:4.5em" });
    input.addEventListener("input", () => {
      o[key] = input.value === "" ? 0 : Number(input.value);
      onChange();
    });
    return h("label", { class: "ctl-inline" }, [label, input]);
  }
  let openingsBody;
  function renderOpenings() {
    openingsBody.innerHTML = "";
    const list = params.ouvertures || (params.ouvertures = []);
    list.forEach((o, i) => {
      const row = h("div", { class: "opening-row" }, [
        selectStruct(o, "type", TYPES),
        selectStruct(o, "face", FACES),
        onum(o, "largeur_cm", "l"),
        onum(o, "hauteur_cm", "h"),
        onum(o, "allege_cm", "all."),
        selectStruct(o, "position", POSITIONS),
        h("button", { class: "btn-mini", title: "Supprimer", onclick: () => {
          list.splice(i, 1);
          renderOpenings();
          onChange();
        } }, ["\u2715"])
      ]);
      openingsBody.append(row);
    });
    const add = h("button", { class: "btn btn-ghost btn-add", onclick: () => {
      list.push({ type: "fenetre", face: "G", largeur_cm: 80, hauteur_cm: 80, allege_cm: 100, position: "centre" });
      renderOpenings();
      onChange();
    } }, ["+ Ajouter une ouverture"]);
    openingsBody.append(add);
  }
  function priceControls() {
    const pr = params.prix_indicatifs_eur || {};
    return Object.keys(pr).filter((k) => !k.startsWith("_") && typeof pr[k] === "number").map((k) => num(k.replace(/_/g, " "), pr, k, 1, "5.5em"));
  }
  function renderPanel() {
    container.innerHTML = "";
    const e = params.emprise_cm;
    openingsBody = h("div", { class: "openings" });
    renderOpenings();
    container.append(
      group("Dimensions au sol (cm)", [
        slider("Gauche (G)", e, "gauche_G", 100, 400),
        slider("Avant (A)", e, "avant_A", 100, 400),
        slider("Droite \u2192 coupe (D)", e, "droite_D_jusqu_coupe", 80, 360),
        slider("Arri\xE8re \u2192 coupe (B)", e, "arriere_B_jusqu_coupe", 80, 360)
      ]),
      group("Toit & murs", [
        slider("Hauteur avant (\xE9gout)", params.murs, "hauteur_avant_cm", 200, 320),
        slider("Pente \u2014 chute", params.toit, "pente_chute_cm", 5, 60),
        h("div", { class: "ctl-row" }, [
          h("span", { class: "ctl-lbl ctl-lbl-wide" }, ["D\xE9bords (cm)"]),
          onum(params.toit.debord_cm, "avant", "av."),
          onum(params.toit.debord_cm, "arriere", "arr."),
          onum(params.toit.debord_cm, "gauche", "g."),
          onum(params.toit.debord_cm, "droite", "d."),
          onum(params.toit.debord_cm, "coupe", "coupe")
        ])
      ]),
      group("Panneaux", [
        select("\xC9paisseur (mm)", params.panneau, "epaisseur_mm", [["40", "40"], ["60", "60"], ["80", "80"], ["100", "100"]]),
        slider("Largeur utile", params.panneau, "largeur_utile_cm", 80, 120),
        slider("Chute / pertes", params.divers, "facteur_chute_pct", 0, 30, 1, "%")
      ]),
      group("Ouvertures (porte + fen\xEAtres)", [openingsBody]),
      group("Prix indicatifs (\u20AC)", priceControls(), false)
    );
  }
  renderPanel();
  return { refresh: renderPanel };
}

// site/src/main.ts
var clone = (o) => JSON.parse(JSON.stringify(o));
document.addEventListener("DOMContentLoaded", () => {
  const DEFAULTS = window.SHED_PARAMS;
  if (!DEFAULTS) {
    console.error("params.js manquant (window.SHED_PARAMS).");
    return;
  }
  const params = clone(DEFAULTS);
  let core = buildCore(params);
  renderAll(core, params);
  let viewer = null;
  const viewerEl = document.getElementById("viewer");
  try {
    if (viewerEl) viewer = createViewer(viewerEl, core.model3d);
  } catch (e) {
    if (viewerEl) viewerEl.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible (WebGL requis). Voir les plans ci-dessous.</p>';
    console.error(e);
  }
  const onChange = () => {
    try {
      core = buildCore(params);
      renderAll(core, params);
      if (viewer) viewer.rebuild(core.model3d);
      setStatus("\u2713 Mod\xE8le, plans et chiffres mis \xE0 jour en direct.", "#2a8");
    } catch (e) {
      setStatus("\u2717 Param\xE8tre invalide : " + (e?.message || e), "#c0392b");
      console.error(e);
    }
  };
  const controls = buildControls(document.getElementById("controls"), params, onChange);
  const reset = document.getElementById("cfg-reset");
  if (reset) reset.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    for (const k of Object.keys(params)) delete params[k];
    Object.assign(params, fresh);
    controls.refresh();
    onChange();
    setStatus("R\xE9initialis\xE9 aux valeurs publi\xE9es.", "#888");
  });
  window.setTimeout(() => {
    const v = document.getElementById("viewer");
    if (v && !v.querySelector("canvas") && !v.textContent.trim()) {
      v.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloqu\xE9e). Les plans plus bas restent enti\xE8rement valables.</p>';
    }
  }, 4e3);
});
function setStatus(msg, color) {
  const s = document.getElementById("cfg-status");
  if (s) {
    s.textContent = msg;
    s.style.color = color;
  }
}
