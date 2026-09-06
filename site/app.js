// site/src/compute.ts
var FACE_INDEX = { A: 0, D: 1, B: 2, G: 3 };
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
function geometry(p) {
  const A = +p.emprise_cm.avant_A, G = +p.emprise_cm.gauche_G;
  const FL = [0, 0], FR = [A, 0], BR = [A, G], BL = [0, G];
  const verts = [FL, FR, BR, BL];
  const names = ["avant-gauche", "avant-droite", "arriere-droite", "arriere-gauche"];
  const H = +p.murs.hauteur_cm;
  const drop = +p.toit.pente_chute_cm;
  const run = G;
  const h_at = (y) => H + drop * (1 - y / run);
  const slope_pct = 100 * drop / run;
  const slope_deg = Math.atan2(drop, run) * 180 / Math.PI;
  const rampant = Math.hypot(run, drop);
  const facesDef = [
    ["A", "Avant", FL, FR, "bandeau"],
    ["D", "Droite", FR, BR, "triangle"],
    ["B", "Arriere", BR, BL, "aucune"],
    ["G", "Gauche", BL, FL, "triangle"]
  ];
  const faces = facesDef.map(([key, label, p1, p2, reh]) => {
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const h1 = h_at(p1[1]), h2 = h_at(p2[1]);
    return {
      cle: key,
      libelle: label,
      longueur_cm: rnd(length, 1),
      hauteur_mur_cm: H,
      hauteur_debut_cm: rnd(h1, 1),
      hauteur_fin_cm: rnd(h2, 1),
      hauteur_max_cm: rnd(Math.max(h1, h2), 1),
      rehausse: reh
    };
  });
  let dalle = null;
  const d = p.dalle_cm;
  if (d) {
    const dA = +d.avant, dG = +d.gauche, dD = +d.droite_jusqu_coupe, dB = +d.arriere_jusqu_coupe;
    const ox = d.decalage_cm ? +d.decalage_cm.x : 0, oy = d.decalage_cm ? +d.decalage_cm.y : 0;
    const cw = dA - dB, ch = dG - dD;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const uA = cw > 0 ? clamp((ox + A - dB) / cw) : 0;
    const vG = ch > 0 ? clamp((oy + G - dD) / ch) : 0;
    const t = Math.max(0, uA + vG - 1);
    const dx = t * cw, dy = t * ch;
    dalle = {
      avant: dA,
      gauche: dG,
      droite_jusqu_coupe: dD,
      arriere_jusqu_coupe: dB,
      decalage_cm: [ox, oy],
      // polygone de la dalle dans le repere de l'abri (origine = coin avant-gauche de l'abri)
      polygone: [[0, 0], [dA, 0], [dA, dD], [dB, dG], [0, dG]].map(([x, y]) => [rnd(x - ox, 1), rnd(y - oy, 1)]),
      coupe_cm: rnd(Math.hypot(cw, ch), 1),
      marges_cm: { gauche: ox, avant: oy, droite: rnd(dA - ox - A, 1), arriere_droite: rnd(dD - oy - G, 1), arriere_gauche: rnd(dG - oy - G, 1) },
      hors_dalle_m2: rnd(dx * dy / 2 / 1e4, 2),
      hors_dalle_triangle_cm: [rnd(dx, 1), rnd(dy, 1)],
      depasse_bbox: ox < 0 || oy < 0 || ox + A > dA + 1e-9 || oy + G > dG + 1e-9
    };
  }
  return {
    verts,
    vert_names: names,
    vert_heights_cm: verts.map((v) => rnd(h_at(v[1]), 1)),
    cotes: { A, G },
    aire_m2: rnd(A * G / 1e4, 2),
    emprise_debords_m2: rnd((A + +p.toit.debord_cm.gauche + +p.toit.debord_cm.droite) * (G + +p.toit.debord_cm.avant + +p.toit.debord_cm.arriere) / 1e4, 2),
    perimetre_cm: rnd(2 * (A + G), 1),
    pente: { chute_cm: drop, run_cm: run, pourcent: rnd(slope_pct, 1), degres: rnd(slope_deg, 2), rampant_cm: rnd(rampant, 1) },
    hauteur_mur_cm: H,
    hauteur_avant_cm: rnd(H + drop, 1),
    hauteur_arriere_cm: H,
    faces,
    dalle
  };
}
function opening_start_cm(o, face_len) {
  const w = +o.largeur_cm;
  const margin = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm;
  const pos = o.position == null ? "centre" : o.position;
  if (typeof pos === "number" || /^\d+(\.\d+)?$/.test(String(pos))) return Math.max(0, Math.min(+pos, face_len - w));
  if (pos === "droite") return Math.max(0, face_len - w - margin);
  if (pos === "gauche") return margin;
  return Math.max(0, (face_len - w) / 2);
}
function resolve_openings(p, g) {
  const facelen = {};
  for (const f of g.faces) facelen[f.cle] = f.longueur_cm;
  const list = p.porte ? [{ id: "porte", type: "porte", allege_cm: 0, ...p.porte }] : [];
  (p.fenetres || []).forEach((f, i) => list.push({ id: `fenetre-${i + 1}`, type: "fenetre", ...f }));
  return list.map((o) => ({
    id: o.id,
    type: o.type,
    face: o.face,
    face_index: FACE_INDEX[o.face],
    largeur_cm: +o.largeur_cm,
    hauteur_cm: +o.hauteur_cm,
    allege_cm: +o.allege_cm || 0,
    start_cm: rnd(opening_start_cm(o, facelen[o.face]), 1),
    position: o.position == null ? "centre" : o.position,
    ouverture: o.ouverture || "",
    description: o.description || ""
  }));
}
function takeoff(p, g, openings) {
  const cover = +p.panneau.largeur_utile_cm;
  const waste = 1 + +p.divers.facteur_chute_pct / 100;
  const H = g.hauteur_mur_cm, drop = g.pente.chute_cm;
  const { A, G } = g.cotes;
  const ded = {};
  for (const o of openings) ded[o.face] = (ded[o.face] || 0) + o.largeur_cm * o.hauteur_cm / 1e4;
  const rows = [];
  let gross = 0, net = 0;
  for (const f of g.faces) {
    const L = f.longueur_cm;
    const nn = Math.ceil(L / cover);
    const g_area = nn * (cover / 100) * (H / 100);
    let n_area = L / 100 * (H / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area;
    net += n_area;
    const pieces = [];
    for (let i = 0; i < nn; i++) pieces.push({ label: `${f.cle}${i + 1}`, largeur_cm: rnd(Math.min(cover, L - i * cover), 1) });
    rows.push({
      face: f.cle,
      libelle: f.libelle,
      longueur_cm: L,
      hauteur_cm: H,
      nb_panneaux: nn,
      aire_brute_m2: rnd(g_area, 2),
      rehausse: f.rehausse,
      pieces
    });
  }
  const strip_len = Math.max(A, G);
  const n_reh = Math.ceil(2 * drop / cover);
  const reh_gross = n_reh * (cover / 100) * (strip_len / 100);
  const rehausse = {
    pieces: [
      { label: "R1", piece: "Bandeau avant (face A)", longueur_cm: A, hauteur_cm: drop, nb: 1, note: "rectangle, pose sur le mur A" },
      { label: "R2+R3", piece: "Triangles lateraux (R2 face G, R3 face D)", longueur_cm: G, hauteur_cm: drop, nb: 2, note: "1 bande G x chute coupee en diagonale = 2 triangles (tourner R3 de 180 deg)" }
    ],
    nb_panneaux: n_reh,
    longueur_panneau_cm: strip_len,
    aire_brute_m2: rnd(reh_gross, 2),
    aire_nette_m2: rnd((A * drop + G * drop) / 1e4, 2)
  };
  const deb = p.toit.debord_cm;
  const width_x = A + +deb.gauche + +deb.droite;
  const len_h = G + +deb.avant + +deb.arriere;
  const run_len = len_h * Math.hypot(1, drop / G);
  const n_roof = Math.ceil(width_x / cover);
  const roof_gross = n_roof * (cover / 100) * (run_len / 100);
  const roof_real = width_x / 100 * (len_h / 100);
  const roof_pieces = [];
  for (let i = 0; i < n_roof; i++) roof_pieces.push({ label: `T${i + 1}`, largeur_cm: rnd(Math.min(cover, width_x - i * cover), 1) });
  return {
    murs: {
      lignes: rows,
      aire_brute_m2: rnd(gross, 2),
      aire_nette_m2: rnd(net, 2),
      ouvertures_deduites_m2: rnd(Object.values(ded).reduce((a, b) => a + b, 0), 2),
      total_panneaux: rows.reduce((a, r) => a + r.nb_panneaux, 0)
    },
    rehausse,
    toit: {
      face: "T",
      libelle: "Toiture",
      nb_panneaux: n_roof,
      largeur_cm: rnd(width_x, 1),
      longueur_panneau_cm: rnd(run_len, 1),
      aire_brute_m2: rnd(roof_gross, 2),
      aire_couverte_m2: rnd(roof_real, 2),
      portee_cm: rnd(len_h, 1),
      pieces: roof_pieces
    },
    commande_mur_m2: rnd((gross + reh_gross) * waste, 1),
    commande_toit_m2: rnd(roof_gross * waste, 1),
    commande_panneaux_m2: rnd((gross + reh_gross + roof_gross) * waste, 1),
    facteur_chute_pct: p.divers.facteur_chute_pct
  };
}
function shopping(p, g, t, openings) {
  const ceil = Math.ceil;
  const perim = g.perimetre_cm / 100;
  const corner_h = g.hauteur_avant_cm / 100;
  const { A, G } = g.cotes;
  const anchors = ceil(perim / 0.5);
  const screws = ceil((t.murs.aire_brute_m2 + t.rehausse.aire_brute_m2 + t.toit.aire_brute_m2) * 6);
  const portes = openings.filter((o) => o.type === "porte");
  const porte_q = portes.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} cm`).join(", ") || "-";
  const fenetres = openings.filter((o) => o.type === "fenetre");
  const fen_q = fenetres.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} all.${itr(o.allege_cm)} (face ${o.face})`).join(", ");
  const open_perim = openings.reduce((a, o) => a + 2 * (o.largeur_cm + o.hauteur_cm), 0) / 100;
  const ep = p.panneau.epaisseur_mm;
  const items = [
    { poste: `Panneaux sandwich ${ep} mm - finition MUR (murs + rehausse)`, qte: `${t.murs.total_panneaux} panneaux de ${f2(g.hauteur_mur_cm / 100)} m + ${t.rehausse.nb_panneaux} de ${f2(t.rehausse.longueur_panneau_cm / 100)} m (~${t.commande_mur_m2} m2 avec chute)`, note: "Ame PIR, autoportants (pas d'ossature). Parement mural lisse/micro-nervure, laque 2 faces. Coupes droites + 1 diagonale." },
    { poste: `Panneaux sandwich ${ep} mm - finition TOIT (face T)`, qte: `${t.toit.nb_panneaux} panneaux de ~${f2(t.toit.longueur_panneau_cm / 100)} m (~${t.commande_toit_m2} m2 avec chute)`, note: `Profil TOITURE (nervures hautes), sens de la pente. Portee libre ~${f2(t.toit.portee_cm / 100)} m : verifier le tableau de portees du fabricant.` },
    { poste: "Rail / lambourde de pied", qte: `~${ceil(perim) + 1} m`, note: "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle." },
    { poste: "Profils d'angle exterieurs + interieurs", qte: `4 angles x ${f2(corner_h)} m, ext + int = ~${ceil(8 * corner_h)} m`, note: "4 angles droits standard (profil L / couvre-joint)." },
    { poste: "Bavette d'egout haut (avant)", qte: `~${ceil(A / 100) + 1} m`, note: "Larmier en haut de la face avant." },
    { poste: "Bavettes de rive (gauche/droite)", qte: `~${ceil(2 * G / 100) + 1} m`, note: "Rives laterales du toit, avec debord." },
    { poste: "Gouttiere + 1 descente", qte: `~${ceil(A / 100) + 1} m + 1 descente`, note: "En bas de pente (face B), descente a un angle arriere." },
    { poste: "Vis autoperceuses tete EPDM", qte: `~${screws} (boite de ${ceil(screws / 100) * 100})`, note: "Longueur = epaisseur panneau + rail. Rondelle d'etancheite obligatoire." },
    { poste: "Chevilles / scellement dalle", qte: `~${anchors}`, note: "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)." },
    { poste: "Porte vitree alu double vitrage", qte: `${portes.length} (${porte_q})`, note: "Source principale de lumiere. Ouverture vers l'exterieur. Dormant + seuil + joints." },
    { poste: "Ventilation (VMC ou aerateurs hygro)", qte: "1 kit", note: "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)." },
    { poste: "Bande comprimee / mousse precomprimee", qte: `~${ceil(perim + open_perim)} m`, note: "Etancheite a l'air au pied et au pourtour des ouvertures." },
    { poste: "Bande butyle (joints de panneaux)", qte: `~${ceil(perim * 2)} m`, note: "Joints longitudinaux, joint mur/rehausse et perimetriques." },
    { poste: "Mastic PU + primaire anticorrosion", qte: "~5 cartouches + 1 primaire", note: "Cachetage et protection des chants coupes (anticorrosion)." },
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." }
  ];
  if (fenetres.length) {
    items.splice(10, 0, { poste: "Fenetre(s) double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). Fixe ou oscillo-battant. La garder dans un seul panneau (pas a cheval sur un joint). Cadre + appui + joints." });
  }
  return items;
}
function budget(p, g, t, openings) {
  const pr = p.prix_indicatifs_eur || {};
  const get = (k) => pr[k] == null ? 0 : pr[k];
  const perim = g.perimetre_cm / 100;
  const corner_h = g.hauteur_avant_cm / 100;
  const profils_ml = 4 * corner_h * 2 + perim;
  const portes = openings.filter((o) => o.type === "porte").length;
  const fenetres = openings.filter((o) => o.type === "fenetre").length;
  const src = [
    ["Panneaux sandwich - mur + rehausse (brut)", rnd(t.murs.aire_brute_m2 + t.rehausse.aire_brute_m2, 2), "m\xB2", get("panneau_mur_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m\xB2", get("panneau_toit_m2")],
    ["Porte vitree", portes, "u", get("porte_vitree")],
    ["Fenetre(s)", fenetres, "u", get("fenetre")],
    ["Profils (angles, rives, rail)", rnd(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")],
    ["Livraison des panneaux", 1, "forfait", get("livraison_forfait")]
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
  const { A, G } = g.cotes;
  const deb = p.toit.debord_cm;
  const m = (v) => rnd(v / 100, 3);
  const drop = g.pente.chute_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const panels = [];
  g.faces.forEach((f) => {
    const n = Math.ceil(f.longueur_cm / cover);
    for (let i = 0; i < n; i++) panels.push({
      label: `${f.cle}${i + 1}`,
      face_index: FACE_INDEX[f.cle],
      s0_m: m(i * cover),
      s1_m: m(Math.min((i + 1) * cover, f.longueur_cm))
    });
  });
  const rehausse_pieces = drop > 0 ? [
    { label: "R1", face_index: FACE_INDEX.A, kind: "bandeau" },
    { label: "R2", face_index: FACE_INDEX.G, kind: "triangle" },
    { label: "R3", face_index: FACE_INDEX.D, kind: "triangle" }
  ] : [];
  const roof_w = A + +deb.gauche + +deb.droite;
  const roof_panels = [];
  for (let i = 0, n = Math.ceil(roof_w / cover); i < n; i++) roof_panels.push({
    label: `T${i + 1}`,
    x0_m: m(-deb.gauche + i * cover),
    x1_m: m(-deb.gauche + Math.min((i + 1) * cover, roof_w))
  });
  const slab = g.dalle ? g.dalle.polygone : g.verts;
  return {
    footprint: g.verts.map((v) => [m(v[0]), m(v[1])]),
    heights: g.vert_heights_cm.map((h2) => rnd(h2 / 100, 3)),
    wall_height_m: m(g.hauteur_mur_cm),
    panel_cover_m: m(+p.panneau.largeur_utile_cm),
    thickness_m: +p.panneau.epaisseur_mm / 1e3,
    roof_outline: [
      [m(-deb.gauche), m(-deb.avant)],
      [m(A + +deb.droite), m(-deb.avant)],
      [m(A + +deb.droite), m(G + +deb.arriere)],
      [m(-deb.gauche), m(G + +deb.arriere)]
    ],
    roof_front_m: m(g.hauteur_avant_cm),
    roof_slope: rnd(drop / G, 5),
    slab: slab.map((v) => [m(v[0]), m(v[1])]),
    gutter_face_index: FACE_INDEX.B,
    panels,
    rehausse_pieces,
    roof_panels,
    openings: openings.map((o) => ({
      type: o.type,
      face_index: o.face_index,
      offset_m: m(o.start_cm),
      width_m: m(o.largeur_cm),
      height_m: m(o.hauteur_cm),
      sill_m: m(o.allege_cm)
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
function poly(pts, fill, stroke, w = 2, dash = "") {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<polygon points="${pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"${d}/>
`;
}
function tw(s, size) {
  return s.length * size * 0.58;
}
function plan_sol_svg(p, g, openings) {
  const pad = 90, scale = 0.42;
  const { A, G } = g.cotes;
  const d = g.dalle;
  const allx = [0, A, ...d ? d.polygone.map((q) => q[0]) : []];
  const ally = [0, G, ...d ? d.polygone.map((q) => q[1]) : []];
  const minx = Math.min(...allx), maxx = Math.max(...allx), miny = Math.min(...ally), maxy = Math.max(...ally);
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de sol \xB7 ${A} \xD7 ${G} cm \xB7 ${g.aire_m2} m\xB2`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v) => [pad + xoff + (v[0] - minx) * scale, H - pad - (v[1] - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  if (d) svg += poly(d.polygone.map(P), "#eeeae0", "#a89f8a", 1.5, "6 4");
  svg += poly(g.verts.map(P), "#dce8f5", "#2b5d8a", 2);
  if (d && d.hors_dalle_m2 > 0) {
    const [dx, dy] = d.hors_dalle_triangle_cm;
    const tri = [[A, G], [A - dx, G], [A, G - dy]].map(P);
    svg += `<defs><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c0392b" stroke-width="2"/></pattern></defs>
`;
    svg += poly(tri, "url(#hach)", "#c0392b", 1.5);
    const c = P([A - dx / 3, G - dy / 3]);
    svg += text(c[0] - 10, c[1] + 16, `hors dalle ${f0(dx)}\xD7${f0(dy)}`, "end", "#c0392b", 10, "bold");
  }
  const labels = {
    A: [A / 2, 0, "middle", 0, 18],
    D: [A, G / 2, "start", 8, 4],
    B: [A / 2, G, "middle", 0, -8],
    G: [0, G / 2, "end", -8, 4]
  };
  const vals = { A, D: G, B: A, G };
  for (const k of Object.keys(labels)) {
    const [x, y, anchor, dx, dy] = labels[k];
    const q = P([x, y]);
    svg += text(q[0] + dx, q[1] + dy, `${k} = ${f0(vals[k])} cm`, anchor, "#2b5d8a", 14, "bold");
  }
  const edge = { A: [0, 1], D: [1, 2], B: [2, 3], G: [3, 0] };
  for (const o of openings) {
    const [i1, i2] = edge[o.face];
    const v1 = g.verts[i1], v2 = g.verts[i2];
    const Lf = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
    const ux = (v2[0] - v1[0]) / Lf, uy = (v2[1] - v1[1]) / Lf;
    const s0 = o.start_cm, s1 = o.start_cm + o.largeur_cm;
    const q0 = P([v1[0] + ux * s0, v1[1] + uy * s0]);
    const q1 = P([v1[0] + ux * s1, v1[1] + uy * s1]);
    const owx = uy, owy = ux;
    if (o.type !== "porte") {
      svg += line(q0[0], q0[1], q1[0], q1[1], "#1b9aa8", 5);
      svg += text((q0[0] + q1[0]) / 2 + owx * 16, (q0[1] + q1[1]) / 2 + owy * 16 + 4, `fen. ${itr(o.largeur_cm)}`, "middle", "#137", 10);
      continue;
    }
    const dwpx = o.largeur_cm * scale;
    const oe = [q0[0] + owx * dwpx, q0[1] + owy * dwpx];
    svg += line(q0[0], q0[1], q1[0], q1[1], "#c0392b", 5);
    svg += line(q0[0], q0[1], oe[0], oe[1], "#c0392b", 2);
    svg += `<path d="M ${f1(q1[0])} ${f1(q1[1])} A ${f1(dwpx)} ${f1(dwpx)} 0 0 1 ${f1(oe[0])} ${f1(oe[1])}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>
`;
    svg += text((q0[0] + q1[0]) / 2 + owx * (dwpx + 14), (q0[1] + q1[1]) / 2 + owy * (dwpx + 14), `porte ${itr(o.largeur_cm)} (ouvre dehors)`, "middle", "#c0392b", 11);
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, "pente vers l'arri\xE8re (face B) \xB7 dalle r\xE9elle en pointill\xE9", "middle", "#888", 11);
  svg += text(W / 2, H - 14, "AVANT (face A)", "middle", "#666", 12);
  svg += "</svg>\n";
  return svg;
}
function plan_toit_svg(p, g, t) {
  const pad = 70, scale = 0.42;
  const deb = p.toit.debord_cm;
  const { A, G } = g.cotes;
  const minx = -deb.gauche, maxx = A + +deb.droite, miny = -deb.avant, maxy = G + +deb.arriere;
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de toiture \xB7 ${t.toit.nb_panneaux} panneaux \xB7 pente ${g.pente.pourcent} %`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (x, y) => [pad + xoff + (x - minx) * scale, H - pad - (y - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly([P(minx, miny), P(maxx, miny), P(maxx, maxy), P(minx, maxy)], "#e8eee2", "#6b8e23", 2);
  svg += poly(g.verts.map((v) => P(v[0], v[1])), "none", "#999", 1, "6 4");
  const cover = +p.panneau.largeur_utile_cm;
  for (let x = minx + cover; x < maxx - 1e-6; x += cover) {
    const a = P(x, miny), b = P(x, maxy);
    svg += line(a[0], a[1], b[0], b[1], "#9aab7a", 1, "3 3");
  }
  for (let i = 0; i < t.toit.nb_panneaux; i++) {
    const x0 = minx + i * cover, x1 = Math.min(minx + (i + 1) * cover, maxx);
    const c = P((x0 + x1) / 2, miny + (maxy - miny) * 0.5);
    svg += text(c[0], c[1] + 6, `T${i + 1}`, "middle", "#8aa06a", 18, "bold");
  }
  for (const fx of [0.3, 0.7]) {
    const x = minx + (maxx - minx) * fx;
    const y0 = P(x, miny + 20), y1 = P(x, maxy - 20);
    svg += line(y0[0], y0[1], y1[0], y1[1], "#2b7", 2);
    svg += `<polygon points="${f0(y1[0])},${f0(y1[1])} ${f0(y1[0] - 5)},${f0(y1[1] + 9)} ${f0(y1[0] + 5)},${f0(y1[1] + 9)}" fill="#2b7"/>
`;
  }
  const top = P((minx + maxx) / 2, maxy), bot = P((minx + maxx) / 2, miny);
  svg += text(top[0], top[1] - 8, `${f0(maxx - minx)} cm`, "middle", "#50701d", 12, "bold");
  const side = P(maxx, (miny + maxy) / 2);
  svg += text(side[0] + 8, side[1] + 4, `${f0(t.toit.longueur_panneau_cm)} cm (rampant)`, "start", "#50701d", 11);
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${g.pente.degres}\xB0 \xB7 \xE9coulement vers l'arri\xE8re`, "middle", "#888", 11);
  svg += text(bot[0], H - 16, "\xE9coulement de l'eau \u2192", "middle", "#2b7", 12);
  svg += "</svg>\n";
  return svg;
}
function plan_rehausse_svg(p, g, t) {
  const pad = 50, scale = 1;
  const cover = +p.panneau.largeur_utile_cm;
  const { A, G } = g.cotes;
  const drop = g.pente.chute_cm;
  const Lp = t.rehausse.longueur_panneau_cm;
  const title = `Rehausse \xB7 1 panneau ${f0(Lp)} \xD7 ${f0(cover)} cm \u2192 2 triangles + 1 bandeau`;
  const lab1 = `bande 1 : ${f0(G)} \xD7 ${f0(drop)}, coup\xE9e en diagonale = triangle G + triangle D`;
  const lab2 = `bande 2 : bandeau avant ${f0(A)} \xD7 ${f0(drop)}`;
  const labW = Math.max(tw(lab1, 11), tw(lab2, 11));
  const base_W = pad + Lp * scale + 16 + labW + 20;
  const H = cover * scale + 2 * pad + 20;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x, y) => [pad + x * scale, pad + 20 + y * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly([P(0, 0), P(Lp, 0), P(Lp, cover), P(0, cover)], "#f3f5f1", "#999", 1.5, "5 4");
  svg += poly([P(0, 0), P(G, 0), P(G, drop), P(0, drop)], "#fdf6e3", "#a07400", 2);
  const d0 = P(0, drop), d1 = P(G, 0);
  svg += line(d0[0], d0[1], d1[0], d1[1], "#a07400", 2, "6 3");
  svg += text(P(G * 0.12, 0)[0], P(0, drop)[1] - 4, "R2 (G)", "middle", "#a07400", 11, "bold");
  svg += text(P(G * 0.88, 0)[0], P(0, 0)[1] + 12, "R3 (D)", "middle", "#a07400", 11, "bold");
  const y2 = drop + 8;
  svg += poly([P(0, y2), P(A, y2), P(A, y2 + drop), P(0, y2 + drop)], "#e3ecf7", "#2b5d8a", 2);
  svg += text(P(A / 2, 0)[0], P(0, y2 + drop / 2)[1] + 4, "R1 \xB7 bandeau A", "middle", "#2b5d8a", 11, "bold");
  const lx = P(Lp, 0)[0] + 16;
  svg += text(lx, P(0, drop / 2)[1] + 4, lab1, "start", "#a07400", 11);
  svg += text(lx, P(0, y2 + drop / 2)[1] + 4, lab2, "start", "#2b5d8a", 11);
  svg += text(lx, P(0, cover)[1], `panneau ${f0(Lp)} \xD7 ${f0(cover)} cm (reste = chute)`, "start", "#999", 11);
  svg += text(P(Lp / 2, 0)[0], P(0, 0)[1] - 8, `${f0(Lp)} cm`, "middle", "#666", 11);
  svg += text(P(0, 0)[0] - 6, P(0, drop / 2)[1] + 4, `${f0(drop)}`, "end", "#a07400", 11);
  svg += text(P(0, 0)[0] - 6, P(0, y2 + drop / 2)[1] + 4, `${f0(drop)}`, "end", "#2b5d8a", 11);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, H - 12, "toutes coupes droites + une seule diagonale \xB7 le triangle D est le m\xEAme que G, tourn\xE9 de 180\xB0", "middle", "#888", 11);
  svg += "</svg>\n";
  return svg;
}
function facade_svg(p, g, face, openings) {
  const pad = 60, scale = 0.6;
  const L = face.longueur_cm, h1 = face.hauteur_debut_cm, h2 = face.hauteur_fin_cm, Hm = face.hauteur_mur_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const base_W = L * scale + 2 * pad;
  const H = Math.max(h1, h2) * scale + 2 * pad;
  const title = `Face ${face.cle} \u2014 ${face.libelle}`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x, h3) => [pad + x * scale, H - pad - h3 * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly([P(0, 0), P(L, 0), P(L, Hm), P(0, Hm)], "#eef2f6", "#2b5d8a", 2);
  for (let x = cover; x < L - 1e-6; x += cover) {
    const a = P(x, 0), b = P(x, Hm);
    svg += line(a[0], a[1], b[0], b[1], "#8fa3b8", 1, "4 3");
  }
  if (face.rehausse !== "aucune") {
    svg += poly([P(0, Hm), P(L, Hm), P(L, h2), P(0, h1)], "#fdf6e3", "#a07400", 2);
    if (face.rehausse === "bandeau") {
      const mid = P(L / 2, (h1 + Hm) / 2);
      svg += text(mid[0], mid[1] + 4, `R1 \xB7 bandeau ${f0(L)} \xD7 ${f0(h1 - Hm)}`, "middle", "#a07400", 10, "bold");
    } else {
      const mid = P(L / 2, (h1 + h2) / 2);
      svg += text(mid[0], mid[1] - 8, `${face.cle === "G" ? "R2" : "R3"} \xB7 triangle ${f0(L)} \xD7 ${f0(Math.abs(h1 - h2))}`, "middle", "#a07400", 10, "bold");
    }
  }
  for (const o of openings) {
    if (o.face !== face.cle) continue;
    const ow = o.largeur_cm * scale, oh = o.hauteur_cm * scale;
    const sx = pad + o.start_cm * scale;
    const by = H - pad - o.allege_cm * scale;
    svg += `<rect x="${f1(sx)}" y="${f1(by - oh)}" width="${f1(ow)}" height="${f1(oh)}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>
`;
    if (o.type === "porte") {
      svg += line(sx, by - oh / 2, sx - 16, by - oh / 2, "#1b6", 1, "3 3");
      svg += text(sx + ow / 2, by - oh / 2 - 6, "porte", "middle", "#178", 11);
      svg += text(sx + ow / 2, by - oh / 2 + 8, `${itr(o.largeur_cm)}\xD7${itr(o.hauteur_cm)}`, "middle", "#178", 10);
    } else {
      svg += text(sx + ow / 2, by - oh / 2 - 2, "fen\xEAtre", "middle", "#178", 10);
      svg += text(sx + ow / 2, by - oh / 2 + 10, `${itr(o.largeur_cm)}\xD7${itr(o.hauteur_cm)}`, "middle", "#178", 9);
      svg += text(sx + ow / 2, by + 12, `all\xE8ge ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  const mine = openings.filter((o) => o.face === face.cle);
  for (let i = 0, n = Math.ceil(L / cover); i < n; i++) {
    const x0 = i * cover, x1 = Math.min((i + 1) * cover, L);
    const over = mine.filter((o) => o.start_cm < x1 && o.start_cm + o.largeur_cm > x0);
    const topOpen = over.length ? Math.max(...over.map((o) => o.allege_cm + o.hauteur_cm)) : 0;
    const hy = over.length ? Math.min(Hm - 6, topOpen + (Hm - topOpen) / 2) : Hm * 0.86;
    const c = P((x0 + x1) / 2, hy);
    svg += text(c[0], c[1] + 6, `${face.cle}${i + 1}`, "middle", "#9fb0c2", over.length && Hm - topOpen < 30 ? 11 : 18, "bold");
  }
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm \xB7 ${Math.ceil(L / cover)} panneaux de ${f0(Hm)}`, "middle", "#222", 13, "bold");
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
    "plan-toit": plan_toit_svg(p, g, t),
    "plan-rehausse": plan_rehausse_svg(p, g, t)
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
function offsetRect(r, d) {
  const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
  const x0 = Math.min(...xs) - d, x1 = Math.max(...xs) + d, y0 = Math.min(...ys) - d, y1 = Math.max(...ys) + d;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}
function addRoofSlab(scene, V, outline, roofZ, thk, mat) {
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], roofZ(p[1]) + thk));
  const bot = outline.map((p) => V(p[0], p[1], roofZ(p[1])));
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
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  scene.add(mesh);
}
function addRoofRibs(parent, V, outline, roofZ, thk, mat) {
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const step = 0.18, ribW = 0.045, eps = 0.016, inset = 0.05;
  const zt = (yy) => roofZ(yy) + thk + eps;
  const y0 = miny + inset, y1 = maxy - inset;
  const pts = [];
  for (let x = minx + 0.06; x < maxx - ribW; x += step) {
    pts.push(
      V(x, y0, zt(y0)),
      V(x + ribW, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y1, zt(y1))
    );
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, mat));
}
function addGutter(scene, V, a, b, roofZ, over, mat) {
  const yb = Math.max(a[1], b[1]) + over * 0.8;
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const zc = roofZ(Math.max(a[1], b[1])) - 0.03;
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.12, 0.06, 0.08), mat);
  gutter.position.copy(V((x0 + x1) / 2, yb, zc));
  gutter.castShadow = true;
  scene.add(gutter);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.max(zc, 0.1), 14), mat);
  pipe.position.copy(V(a[0], yb, zc / 2));
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
function rectMinus(r, h2) {
  if (h2.s1 <= r.s0 || h2.s0 >= r.s1 || h2.y1 <= r.y0 || h2.y0 >= r.y1) return [r];
  const out = [];
  if (h2.s0 > r.s0) out.push({ s0: r.s0, s1: Math.min(h2.s0, r.s1), y0: r.y0, y1: r.y1 });
  if (h2.s1 < r.s1) out.push({ s0: Math.max(h2.s1, r.s0), s1: r.s1, y0: r.y0, y1: r.y1 });
  const ms0 = Math.max(r.s0, h2.s0), ms1 = Math.min(r.s1, h2.s1);
  if (h2.y0 > r.y0) out.push({ s0: ms0, s1: ms1, y0: r.y0, y1: Math.min(h2.y0, r.y1) });
  if (h2.y1 < r.y1) out.push({ s0: ms0, s1: ms1, y0: Math.max(h2.y1, r.y0), y1: r.y1 });
  return out.filter((q) => q.s1 - q.s0 > 1e-4 && q.y1 - q.y0 > 1e-4);
}
var labelCache = {};
function labelTexture(txt) {
  if (labelCache[txt]) return labelCache[txt];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2933";
  ctx.font = `bold ${txt.length > 2 ? 110 : 140}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(txt, 128, 136);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return labelCache[txt] = tex;
}
function addLabel(scene, pos, size, txt, rotY, rotX = 0) {
  const mat = new THREE.MeshBasicMaterial({ map: labelTexture(txt), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.position.copy(pos);
  mesh.rotation.set(rotX, rotY, 0, "YXZ");
  scene.add(mesh);
}
function addPanels(scene, V, a, b, ha, hb, wallH, panels, pieces, holes, mat, rehMat) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = uy, ny = -ux;
  const off = 4e-3, ins = 9e-3;
  const P = (s, h2) => V(a[0] + ux * s + nx * off, a[1] + uy * s + ny * off, h2);
  const topAt = (s) => ha + (hb - ha) * (s / len);
  const rotY = Math.atan2(nx, -ny);
  const bigHoles = holes.map((h2) => ({ s0: h2.s0 - ins, s1: h2.s1 + ins, y0: h2.y0 - ins, y1: h2.y1 + ins }));
  const quads = (rects, m) => {
    const pts = [];
    for (const r of rects) pts.push(P(r.s0, r.y0), P(r.s1, r.y0), P(r.s1, r.y1), P(r.s0, r.y0), P(r.s1, r.y1), P(r.s0, r.y1));
    if (!pts.length) return;
    const g = new THREE.BufferGeometry();
    g.setFromPoints(pts);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, m));
  };
  for (const pn of panels) {
    let rects = [{ s0: pn.s0_m + ins, s1: pn.s1_m - ins, y0: ins, y1: wallH - ins }];
    for (const h2 of bigHoles) rects = rects.flatMap((r) => rectMinus(r, h2));
    quads(rects, mat);
    const w = pn.s1_m - pn.s0_m, cs = (pn.s0_m + pn.s1_m) / 2;
    const free = holes.filter((h2) => h2.s0 < pn.s1_m && h2.s1 > pn.s0_m);
    let ch = wallH * 0.72;
    if (free.length) ch = Math.min(wallH - 0.3, Math.max(...free.map((h2) => h2.y1)) + 0.3);
    addLabel(scene, P(cs, ch).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.5, w * 0.7), pn.label, rotY);
  }
  for (const pc of pieces) {
    if (pc.kind === "bandeau") {
      const top = Math.max(ha, hb);
      quads([{ s0: ins, s1: len - ins, y0: wallH + ins, y1: top - ins }], rehMat);
      addLabel(scene, P(len / 2, (wallH + top) / 2).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.2, (top - wallH) * 0.85), pc.label, rotY);
    } else {
      const tallAtEnd = hb > ha;
      const sT = tallAtEnd ? len - ins : ins, sS = tallAtEnd ? ins : len - ins;
      const top = topAt(tallAtEnd ? len : 0) - ins;
      const pts = tallAtEnd ? [P(sS, wallH + ins), P(sT, wallH + ins), P(sT, top)] : [P(sT, wallH + ins), P(sS, wallH + ins), P(sT, top)];
      const g = new THREE.BufferGeometry();
      g.setFromPoints(pts);
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, rehMat));
      const sl = tallAtEnd ? len * 0.8 : len * 0.2;
      addLabel(scene, P(sl, (wallH + topAt(sl)) / 2).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.17, (topAt(sl) - wallH) * 0.85), pc.label, rotY);
    }
  }
}
function addRoofPanels(scene, V, outline, roofZ, thk, slope, panels, mat) {
  const ys = outline.map((p) => p[1]);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  const ins = 0.012, z = (yy) => roofZ(yy) + thk + 3e-3;
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
function addGlass(scene, V, a, b, o) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h2) => V(a[0] + ux * s, a[1] + uy * s, h2);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 12575727,
    transparent: true,
    opacity: 0.34,
    roughness: 0.05,
    transmission: 0.6,
    side: THREE.DoubleSide
  });
  if (o.type !== "porte") {
    const s0 = o.offset_m, s1 = o.offset_m + o.width_m, y0 = o.sill_m, y1 = o.sill_m + o.height_m;
    const g = new THREE.BufferGeometry();
    g.setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y0), P(s1, y1), P(s0, y1)]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, glass));
    scene.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1)]),
      new THREE.LineBasicMaterial({ color: 5595755 })
    ));
    return;
  }
  const hinge = new THREE.Group();
  hinge.position.copy(P(o.offset_m, 0));
  const dir = new THREE.Vector3().subVectors(P(o.offset_m + o.width_m, 0), P(o.offset_m, 0));
  dir.y = 0;
  dir.normalize();
  hinge.rotation.y = -Math.atan2(dir.z, dir.x);
  const lg = new THREE.PlaneGeometry(o.width_m, o.height_m);
  lg.translate(o.width_m / 2, o.height_m / 2, 0);
  const leaf = new THREE.Mesh(lg, glass);
  leaf.rotation.y = -0.6;
  hinge.add(leaf);
  scene.add(hinge);
}
function populate(group2, m) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s, p) => s + p[0], 0) / n;
  const cy = fp.reduce((s, p) => s + p[1], 0) / n;
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym) => m.roof_front_m - (m.roof_slope || 0) * ym;
  const panelMat = new THREE.MeshStandardMaterial({ color: 15659250, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const rehMat = new THREE.MeshStandardMaterial({ color: 15853256, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const baseMat = new THREE.MeshStandardMaterial({ color: 4870232, roughness: 0.8, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 10135476, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const roofBaseMat = new THREE.MeshStandardMaterial({ color: 4870232, roughness: 0.8, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 8293014, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 15394783, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 7041399, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 11844288, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
  group2.add(new THREE.Mesh(prismGeo(V, m.slab || fp, 0.05, -0.12), concreteMat));
  group2.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, 0.02), 0.1, 0), railMat));
  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o) => o.face_index === i).map((o) => ({
      s0: o.offset_m,
      s1: o.offset_m + o.width_m,
      y0: o.sill_m,
      y1: o.sill_m + o.height_m
    }));
    addWall(group2, V, a, b, ha, hb, holes, baseMat);
    addPanels(
      group2,
      V,
      a,
      b,
      ha,
      hb,
      m.wall_height_m,
      (m.panels || []).filter((q) => q.face_index === i),
      (m.rehausse_pieces || []).filter((q) => q.face_index === i),
      holes,
      panelMat,
      rehMat
    );
  }
  for (const o of openings) addGlass(group2, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);
  const outline = m.roof_outline || offsetRect(fp, 0.15);
  addRoofSlab(group2, V, outline, roofZ, m.thickness_m, roofBaseMat);
  addRoofPanels(group2, V, outline, roofZ, m.thickness_m, m.roof_slope || 0, m.roof_panels || [], roofMat);
  addRoofRibs(group2, V, outline, roofZ, m.thickness_m, ribMat);
  const gi = m.gutter_face_index == null ? 2 : m.gutter_face_index;
  addGutter(group2, V, fp[gi], fp[(gi + 1) % n], roofZ, 0.2, metalMat);
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
  sun.shadow.bias = -8e-4;
  sun.shadow.mapSize.set(2048, 2048);
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
  const g = core.geometrie, t = core.debit;
  const data = [
    [g.aire_m2 + " m\xB2", `Surface (${g.cotes.A} \xD7 ${g.cotes.G} cm)`],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "\xB0)"],
    [`${t.murs.total_panneaux + t.rehausse.nb_panneaux} + ${t.toit.nb_panneaux}`, "Panneaux mur + toit"],
    [t.commande_panneaux_m2 + " m\xB2", "\xC0 commander (avec chute)"]
  ];
  setHTML("#kpis", data.map(([v, l]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join(""));
}
var REH = { bandeau: "bandeau", triangle: "triangle", aucune: "\u2014" };
function renderFaces(core) {
  const g = core.geometrie, t = core.debit.toit;
  let rows = g.faces.map((f) => `<tr><td><b>${f.cle}</b> \xB7 ${f.libelle}</td><td>${f.longueur_cm} cm</td><td>${f.hauteur_mur_cm} cm</td><td>${f.rehausse === "aucune" ? "\u2014" : `<span class="tag rake">${REH[f.rehausse]}</span> \u2192 ${f.hauteur_debut_cm}\u2013${f.hauteur_fin_cm} cm`}</td></tr>`).join("");
  rows += `<tr class="row-toit"><td><b>${t.face}</b> \xB7 ${t.libelle} <span class="tag toit">toit</span></td><td>${t.largeur_cm} cm</td><td colspan="2">${(t.longueur_panneau_cm / 100).toFixed(2)} m de rampant \xB7 ${g.hauteur_avant_cm} \u2192 ${g.hauteur_arriere_cm} cm</td></tr>`;
  setHTML("#faces tbody", rows);
}
function renderPlans(core) {
  for (const [name, svg] of Object.entries(core.svg)) {
    const box = document.getElementById("plan-" + name);
    if (box) box.innerHTML = svg;
  }
}
function renderDebit(core, p) {
  const t = core.debit, r = t.rehausse, cover = p.panneau.largeur_utile_cm;
  let rows = t.murs.lignes.map((x) => `<tr><td><b>${x.face}</b> \xB7 ${x.libelle}</td><td><span class="tag">mur</span></td><td>${x.pieces.map((q) => `<b>${q.label}</b> ${q.largeur_cm}`).join(" \xB7 ")} \xD7 ${x.hauteur_cm} cm \u2014 coupes droites</td><td>${x.nb_panneaux}</td><td>${x.aire_brute_m2} m\xB2</td></tr>`).join("");
  rows += `<tr><td><b>R</b> \xB7 Rehausse</td><td><span class="tag rake">mur</span></td><td>${r.pieces.map((q) => `<b>${q.label}</b> ${q.longueur_cm} \xD7 ${q.hauteur_cm} cm (${q.piece.toLowerCase()})`).join(" + ")}, tir\xE9es de ${r.nb_panneaux} panneau de ${(r.longueur_panneau_cm / 100).toFixed(2)} m</td><td>${r.nb_panneaux}</td><td>${r.aire_brute_m2} m\xB2</td></tr>`;
  rows += `<tr class="row-toit"><td><b>${t.toit.face}</b> \xB7 ${t.toit.libelle}</td><td><span class="tag toit">toit</span></td><td>${t.toit.pieces.map((q) => `<b>${q.label}</b> ${q.largeur_cm}`).join(" \xB7 ")} \xD7 ${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m dans le sens de la pente \xB7 couvre ${t.toit.aire_couverte_m2} m\xB2</td><td>${t.toit.nb_panneaux}</td><td>${t.toit.aire_brute_m2} m\xB2</td></tr>`;
  setHTML("#debit tbody", rows);
  setHTML(
    "#debit-resume",
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> identiques (~${t.murs.aire_brute_m2} m\xB2 brut, ${t.murs.aire_nette_m2} m\xB2 net) + <b>${r.nb_panneaux} panneau</b> de rehausse. Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. Commande totale avec chute ${t.facteur_chute_pct} % : <b>${t.commande_panneaux_m2} m\xB2</b>.`
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
  const g = core.geometrie, pente = g.pente, d = g.dalle;
  setText("cover", p.panneau.largeur_utile_cm + " cm");
  setText("v-chute", String(pente.chute_cm));
  setText("v-pente", pente.pourcent + " %");
  setText("v-pente-deg", pente.degres + "\xB0");
  setText("v-portee", (core.debit.toit.portee_cm / 100).toFixed(2) + " m");
  setText("v-ep", String(p.panneau.epaisseur_mm));
  setText("v-emprise", String(g.aire_m2));
  setText("v-emprise-deb", String(g.emprise_debords_m2));
  const seuil = document.getElementById("v-seuil");
  if (seuil) seuil.textContent = g.emprise_debords_m2 <= 5 ? "sous le seuil des 5 m\xB2 d\xE9bords inclus : a priori aucune formalit\xE9." : g.aire_m2 <= 5 ? "murs sous 5 m\xB2 mais d\xE9bords inclus au-dessus : selon la lecture de la mairie, d\xE9claration pr\xE9alable possible." : "au-dessus de 5 m\xB2 : d\xE9claration pr\xE9alable \xE0 pr\xE9voir.";
  const card = document.getElementById("v-dalle");
  if (card && d) {
    const hors = d.hors_dalle_m2 > 0 || d.depasse_bbox;
    card.hidden = !hors;
    setText("v-dalle-tri", `${d.hors_dalle_triangle_cm[0]} \xD7 ${d.hors_dalle_triangle_cm[1]} cm (${d.hors_dalle_m2} m\xB2)`);
  } else if (card) card.hidden = true;
}
function renderAll(core, p) {
  renderKpis(core, p);
  renderFaces(core);
  renderPlans(core);
  renderDebit(core, p);
  renderAchats(core);
  renderBudget(core);
  renderVigilance(core, p);
}

// site/src/controls.ts
var POSITIONS = [["gauche", "\xE0 gauche"], ["centre", "centr\xE9e"], ["droite", "\xE0 droite"]];
var FACES = [["A", "A \xB7 avant"], ["D", "D \xB7 droite"], ["B", "B \xB7 arri\xE8re"], ["G", "G \xB7 gauche"]];
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
  function priceControls() {
    const pr = params.prix_indicatifs_eur || {};
    return Object.keys(pr).filter((k) => !k.startsWith("_") && typeof pr[k] === "number").map((k) => num(k.replace(/_/g, " "), pr, k, 1, "5.5em"));
  }
  function windowsGroup() {
    const list = params.fenetres || (params.fenetres = []);
    const body = h("div", { class: "openings" });
    const rerender = () => {
      renderPanel();
      onChange();
    };
    list.forEach((w, i) => {
      const faceSel = h(
        "select",
        { onchange: () => {
          w.face = faceSel.value;
          onChange();
        } },
        FACES.map(([v, l]) => {
          const o = h("option", { value: v }, [l]);
          if (w.face === v) o.selected = true;
          return o;
        })
      );
      if (typeof w.position !== "number") {
        const faceLen = w.face === "A" || w.face === "B" ? +params.emprise_cm.avant_A : +params.emprise_cm.gauche_G;
        w.position = Math.round(opening_start_cm(w, faceLen));
      }
      body.append(h("div", { class: "opening-card" }, [
        h("div", { class: "ctl-row" }, [
          h("b", {}, [`Fen\xEAtre ${i + 1}`]),
          faceSel,
          h("button", { class: "btn-mini", title: "Supprimer", onclick: () => {
            list.splice(i, 1);
            rerender();
          } }, ["\u2715"])
        ]),
        slider("Largeur", w, "largeur_cm", 40, 140),
        slider("Hauteur", w, "hauteur_cm", 40, 140),
        slider("All\xE8ge (bas / sol)", w, "allege_cm", 60, 160),
        slider("Position depuis le d\xE9but de la face", w, "position", 0, 400)
      ]));
    });
    body.append(h("button", { class: "btn btn-ghost btn-add", onclick: () => {
      list.push({ face: "D", largeur_cm: 80, hauteur_cm: 80, allege_cm: 110, position: 110 });
      rerender();
    } }, ["+ Ajouter une fen\xEAtre"]));
    return body;
  }
  function renderPanel() {
    container.innerHTML = "";
    const e = params.emprise_cm;
    const deb = params.toit.debord_cm;
    container.append(
      group("Emprise & murs (cm)", [
        slider("Largeur \u2014 face avant (A)", e, "avant_A", 100, 400),
        slider("Profondeur \u2014 face gauche (G)", e, "gauche_G", 100, 400),
        slider("Hauteur des murs (arri\xE8re)", params.murs, "hauteur_cm", 180, 300)
      ]),
      group("Toit", [
        slider("Rehausse avant = chute", params.toit, "pente_chute_cm", 5, 60),
        h("div", { class: "ctl-row" }, [
          h("span", { class: "ctl-lbl ctl-lbl-wide" }, ["D\xE9bords (cm)"]),
          ...["avant", "arriere", "gauche", "droite"].map((k) => {
            const input = h("input", { type: "number", step: 1, value: deb[k] ?? 0, style: "width:4.5em" });
            input.addEventListener("input", () => {
              deb[k] = input.value === "" ? 0 : Number(input.value);
              onChange();
            });
            return h("label", { class: "ctl-inline" }, [k.replace("arriere", "arr."), input]);
          })
        ])
      ]),
      group("Porte", [
        slider("Largeur", params.porte, "largeur_cm", 60, 140),
        slider("Hauteur", params.porte, "hauteur_cm", 180, 230),
        select("Position sur la face avant", params.porte, "position", POSITIONS)
      ]),
      group("Fen\xEAtres", [windowsGroup()], (params.fenetres || []).length > 0),
      group("Panneaux", [
        slider("Largeur utile", params.panneau, "largeur_utile_cm", 80, 120),
        slider("Chute / pertes", params.divers, "facteur_chute_pct", 0, 30, 1, "%")
      ]),
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
