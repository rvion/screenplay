// Coeur de calcul de l'abri — PORT EXACT de scripts/generate.py.
// Pur : aucune dependance DOM / Three. Utilisable navigateur ET Node.
// La parite avec Python est verifiee par tests (npm run test:parity).

export type Params = any;

const FACE_INDEX: Record<string, number> = { A: 0, D: 1, C: 2, B: 3, G: 4 };

/* ----------------------------------------------------------------- */
/* Arrondi / formatage compatibles Python (round half-to-even)        */
/* ----------------------------------------------------------------- */
export function rnd(x: number, nd = 0): number {
  if (!isFinite(x)) return x;
  const neg = x < 0;
  const v = Math.abs(x);
  const m = Math.pow(10, nd);
  const scaled = v * m;
  const fl = Math.floor(scaled);
  const diff = scaled - fl;
  let r: number;
  if (diff === 0.5) r = (fl % 2 === 0) ? fl : fl + 1;
  else r = Math.round(scaled);
  const out = r / m;
  return neg ? -out : out;
}

function incDigits(s: string): string {
  const a = s.split("");
  let i = a.length - 1;
  for (; i >= 0; i--) {
    if (a[i] === "9") a[i] = "0";
    else { a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1); break; }
  }
  if (i < 0) a.unshift("1");
  return a.join("");
}

// equivalent de f"{x:.{nd}f}" en Python (round half-to-even). On arrondit sur la
// representation decimale longue du double (toFixed(18)) sans multiplier : pas de
// fausse egalite, et les vrais ties (ex. 124.5) sont arrondis au pair comme Python.
function pyfix(x: number, nd: number): string {
  if (!isFinite(x)) return String(x);
  const neg = x < 0;
  const ax = Math.abs(x);
  const [intp, fracRaw] = ax.toFixed(18).split(".");
  const frac = fracRaw || "";
  let digits = intp + frac.slice(0, nd).padEnd(nd, "0"); // valeur * 10^nd, tronquee
  const rest = frac.slice(nd);
  if (rest) {
    const head = rest[0];
    let up: boolean;
    if (head > "5") up = true;
    else if (head < "5") up = false;
    else up = /[1-9]/.test(rest.slice(1)) ? true : ((digits.charCodeAt(digits.length - 1) - 48) % 2 === 1);
    if (up) digits = incDigits(digits);
  }
  digits = digits.padStart(nd + 1, "0");
  const cut = digits.length - nd;
  let out = digits.slice(0, cut).replace(/^0+(?=\d)/, "");
  if (nd) out += "." + digits.slice(cut);
  return neg && /[1-9]/.test(digits) ? "-" + out : out;
}
const f0 = (x: number) => pyfix(x, 0);
const f1 = (x: number) => pyfix(x, 1);
const f2 = (x: number) => pyfix(x, 2);
const itr = (x: number) => Math.trunc(x);                  // Python int()
const pyNum = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x)); // Python str(float)

/* ----------------------------------------------------------------- */
/* Geometrie                                                          */
/* ----------------------------------------------------------------- */
export function geometry(p: Params) {
  const e = p.emprise_cm;
  const G = +e.gauche_G, A = +e.avant_A, D = +e.droite_D_jusqu_coupe, B = +e.arriere_B_jusqu_coupe;
  const FL = [0, 0], FR = [A, 0], Dend = [A, D], Bend = [B, G], BL = [0, G];
  const verts = [FL, FR, Dend, Bend, BL];
  const names = ["avant-gauche", "avant-droite", "fin-droite (coupe)", "fin-arriere (coupe)", "arriere-gauche"];
  const dist = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const C = dist(Dend, Bend);
  let s = 0; const n = verts.length;
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  const area_cm2 = Math.abs(s) / 2;
  const drop = +p.toit.pente_chute_cm, run = G, Hf = +p.murs.hauteur_avant_cm;
  const h_at = (y: number) => Hf - drop * (y / run);
  const slope_pct = 100 * drop / run;
  const slope_deg = Math.atan2(drop, run) * 180 / Math.PI;
  const vert_heights = verts.map((v) => rnd(h_at(v[1]), 1));
  const facesDef: [string, string, number[], number[]][] = [
    ["A", "Avant", FL, FR], ["D", "Droite", FR, Dend], ["C", "Coupe", Dend, Bend],
    ["B", "Arriere", Bend, BL], ["G", "Gauche", BL, FL],
  ];
  const face_data = facesDef.map(([key, label, p1, p2]) => {
    const length = dist(p1, p2), h1 = h_at(p1[1]), h2 = h_at(p2[1]);
    return {
      cle: key, libelle: label, longueur_cm: rnd(length, 1),
      hauteur_debut_cm: rnd(h1, 1), hauteur_fin_cm: rnd(h2, 1),
      hauteur_max_cm: rnd(Math.max(h1, h2), 1), rake: Math.abs(h1 - h2) > 0.1,
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
    faces: face_data,
  };
}

/* ----------------------------------------------------------------- */
/* Ouvertures                                                         */
/* ----------------------------------------------------------------- */
export function opening_start_cm(o: any, face_len: number): number {
  const w = +o.largeur_cm;
  const margin = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm;
  const pos = o.position || "centre";
  if (pos === "droite") return Math.max(0, face_len - w - margin);
  if (pos === "gauche") return margin;
  return Math.max(0, (face_len - w) / 2);
}

export function resolve_openings(p: Params, g: any) {
  const facelen: Record<string, number> = {};
  for (const f of g.faces) facelen[f.cle] = f.longueur_cm;
  return (p.ouvertures || []).map((o: any) => {
    const L = facelen[o.face];
    return {
      id: o.id != null ? o.id : o.type,
      type: o.type, face: o.face, face_index: FACE_INDEX[o.face],
      largeur_cm: +o.largeur_cm, hauteur_cm: +o.hauteur_cm,
      allege_cm: o.allege_cm == null ? 0 : +o.allege_cm,
      start_cm: rnd(opening_start_cm(o, L), 1),
      position: o.position || "centre",
      ouverture: o.ouverture || "", description: o.description || "",
    };
  });
}

/* ----------------------------------------------------------------- */
/* Debit + quantites                                                  */
/* ----------------------------------------------------------------- */
export function takeoff(p: Params, g: any, openings: any[]) {
  const cover = +p.panneau.largeur_utile_cm;
  const waste = 1 + (+p.divers.facteur_chute_pct) / 100;
  const ded: Record<string, number> = {};
  for (const o of openings) ded[o.face] = (ded[o.face] || 0) + o.largeur_cm * o.hauteur_cm / 1e4;
  const rows: any[] = [];
  let gross = 0, net = 0;
  for (const f of g.faces) {
    const L = f.longueur_cm;
    const nn = Math.ceil(L / cover);
    const hmax = f.hauteur_max_cm;
    const g_area = nn * (cover / 100) * (hmax / 100);
    const avg_h = (f.hauteur_debut_cm + f.hauteur_fin_cm) / 2;
    let n_area = (L / 100) * (avg_h / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area; net += n_area;
    rows.push({
      face: f.cle, libelle: f.libelle, finition: "mur",
      longueur_cm: L, hauteur_cm: hmax, nb_panneaux: nn,
      aire_brute_m2: rnd(g_area, 2), rake: f.rake,
    });
  }
  const deb = p.toit.debord_cm;
  const run_len = g.pente.run_cm + deb.avant + deb.arriere;
  const width_x = g.cotes.A + deb.gauche + deb.droite;
  const n_roof = Math.ceil(width_x / cover);
  const roof_gross = n_roof * (cover / 100) * (run_len / 100);
  const debVals = Object.values(deb).map(Number);
  const avg_overhang = (debVals.reduce((a, b) => a + b, 0) / debVals.length) / 100;
  const roof_real = g.aire_m2 + (g.perimetre_cm / 100) * avg_overhang;
  return {
    murs: {
      lignes: rows, aire_brute_m2: rnd(gross, 2), aire_nette_m2: rnd(net, 2),
      ouvertures_deduites_m2: rnd(Object.values(ded).reduce((a, b) => a + b, 0), 2),
      total_panneaux: rows.reduce((a, r) => a + r.nb_panneaux, 0),
    },
    toit: {
      face: "T", libelle: "Toiture", finition: "toit", nb_panneaux: n_roof,
      longueur_panneau_cm: rnd(run_len, 1), aire_brute_m2: rnd(roof_gross, 2),
      aire_couverte_m2: rnd(roof_real, 2),
    },
    commande_panneaux_m2: rnd((gross + roof_gross) * waste, 1),
    facteur_chute_pct: p.divers.facteur_chute_pct,
  };
}

/* ----------------------------------------------------------------- */
/* Liste d'achats                                                     */
/* ----------------------------------------------------------------- */
export function shopping(p: Params, g: any, t: any, openings: any[]) {
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
  const items: any[] = [
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
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." },
  ];
  if (fenetres.length) {
    items.splice(11, 0, { poste: "Fenetres double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). Fixe ou oscillo-battant selon besoin. Cadre + appui + joints." });
  }
  return items;
}

/* ----------------------------------------------------------------- */
/* Budget                                                             */
/* ----------------------------------------------------------------- */
export function budget(p: Params, g: any, t: any, openings: any[]) {
  const pr = p.prix_indicatifs_eur || {};
  const get = (k: string) => (pr[k] == null ? 0 : pr[k]);
  const perim = g.perimetre_cm / 100;
  const n_corners = g.faces.length;
  const corner_h = Math.max(g.hauteur_avant_cm / 100, 2.4);
  const profils_ml = n_corners * corner_h * 2 + perim;
  const portes = openings.filter((o) => o.type === "porte").length;
  const fenetres = openings.filter((o) => o.type === "fenetre").length;
  const src: [string, number, string, number][] = [
    ["Panneaux sandwich - mur (brut)", t.murs.aire_brute_m2, "m²", get("panneau_mur_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m²", get("panneau_toit_m2")],
    ["Porte(s) vitree(s)", portes, "u", get("porte_vitree")],
    ["Fenetre(s)", fenetres, "u", get("fenetre")],
    ["Profils (angles, rives, rail)", rnd(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")],
  ];
  const rows: any[] = [];
  let sous = 0;
  for (const [label, qte, unit, pu] of src) {
    const montant = qte * pu;
    sous += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd(montant) });
  }
  const inc = pr.incertitude_pct == null ? 15 : +pr.incertitude_pct;
  return {
    lignes: rows, sous_total_eur: rnd(sous), incertitude_pct: inc,
    total_bas_eur: rnd(sous * (1 - inc / 100)), total_haut_eur: rnd(sous * (1 + inc / 100)),
  };
}

/* ----------------------------------------------------------------- */
/* Modele 3D                                                          */
/* ----------------------------------------------------------------- */
export function model3d(p: Params, g: any, openings: any[]) {
  const verts_m = g.verts.map((v: number[]) => [v[0] / 100, v[1] / 100]);
  const heights_m = g.vert_heights_cm.map((h: number) => h / 100);
  const deb = p.toit.debord_cm;
  const debVals = Object.values(deb).map(Number);
  const overhang_m = (debVals.reduce((a, b) => a + b, 0) / debVals.length) / 100;
  const drop = +p.toit.pente_chute_cm, run = g.pente.run_cm;
  return {
    footprint: verts_m,
    heights: heights_m,
    thickness_m: (+p.panneau.epaisseur_mm) / 1000,
    roof_overhang_m: rnd(overhang_m, 3),
    roof_front_m: rnd(g.hauteur_avant_cm / 100, 3),
    roof_slope: rnd(drop / run, 5),
    openings: openings.map((o) => ({
      type: o.type, face_index: o.face_index,
      offset_m: rnd(o.start_cm / 100, 3), width_m: rnd(o.largeur_cm / 100, 3),
      height_m: rnd(o.hauteur_cm / 100, 3), sill_m: rnd(o.allege_cm / 100, 3),
    })),
  };
}

/* ----------------------------------------------------------------- */
/* SVG (plans + elevations) — formatage identique a Python            */
/* ----------------------------------------------------------------- */
function svgHeader(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="system-ui,sans-serif" font-size="13">\n<rect width="${w}" height="${h}" fill="#fbfbf8"/>\n`;
}
function line(x1: number, y1: number, x2: number, y2: number, stroke = "#333", w = 1, dash = ""): string {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}"${d}/>\n`;
}
function text(x: number, y: number, s: string, anchor = "middle", fill = "#222", size = 13, weight = "normal"): string {
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}">${s}</text>\n`;
}
function tw(s: string, size: number): number {
  return s.length * size * 0.58;
}

export function plan_sol_svg(p: Params, g: any, openings: any[]): string {
  const pad = 70, scale = 0.42;
  const xs = g.verts.map((v: number[]) => v[0]), ys = g.verts.map((v: number[]) => v[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys);
  const base_W = (Math.max(...xs) - minx) * scale + 2 * pad;
  const H = (Math.max(...ys) - miny) * scale + 2 * pad;
  const title = `Plan de sol · ${pyNum(g.aire_m2)} m²`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v: number[]) => [pad + xoff + (v[0] - minx) * scale, H - pad - (v[1] - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const pts = g.verts.map((v: number[]) => { const q = P(v); return `${f1(q[0])},${f1(q[1])}`; }).join(" ");
  svg += `<polygon points="${pts}" fill="#dce8f5" stroke="#2b5d8a" stroke-width="2"/>\n`;
  const labels = ["A", "D", "C", "B", "G"];
  const cot = g.cotes;
  const valmap: Record<string, number> = { A: cot.A, D: cot.D, C: cot.C, B: cot.B, G: cot.G };
  const n = g.verts.length;
  for (let i = 0; i < n; i++) {
    const A0 = P(g.verts[i]), B0 = P(g.verts[(i + 1) % n]);
    const mx = (A0[0] + B0[0]) / 2, my = (A0[1] + B0[1]) / 2;
    const lab = labels[i];
    svg += text(mx, my - 6, `${lab} = ${f0(valmap[lab])} cm`, "middle", "#2b5d8a", 14, "bold");
  }
  const edge: Record<string, [number, number]> = { A: [0, 1], D: [1, 2], C: [2, 3], B: [3, 4], G: [4, 0] };
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
      svg += `<path d="M ${f1(q1[0])} ${f1(q1[1])} A ${f1(dwpx)} ${f1(dwpx)} 0 0 1 ${f1(oe[0])} ${f1(oe[1])}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>\n`;
      svg += text((q0[0] + q1[0]) / 2 + owx * 18, (q0[1] + q1[1]) / 2 + owy * 18, `Porte ${itr(o.largeur_cm)} (dehors)`, "middle", "#c0392b", 11);
    } else {
      svg += line(q0[0], q0[1], q1[0], q1[1], "#1b9aa8", 5);
      svg += text((q0[0] + q1[0]) / 2 + owx * 14, (q0[1] + q1[1]) / 2 + owy * 14, `fen. ${itr(o.largeur_cm)}`, "middle", "#137", 10);
    }
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, "pente vers l'arrière (face B)", "middle", "#888", 11);
  svg += text(W / 2, H - 16, "AVANT (face A)", "middle", "#666", 12);
  svg += "</svg>\n";
  return svg;
}

export function plan_toit_svg(p: Params, g: any): string {
  const pad = 70, scale = 0.42;
  const deb = p.toit.debord_cm;
  const xs = g.verts.map((v: number[]) => v[0]), ys = g.verts.map((v: number[]) => v[1]);
  const minx = Math.min(...xs) - deb.gauche, maxx = Math.max(...xs) + deb.droite;
  const miny = Math.min(...ys) - deb.avant, maxy = Math.max(...ys) + deb.arriere;
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de toiture · pente ${pyNum(g.pente.pourcent)} %`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (x: number, y: number) => [pad + xoff + (x - minx) * scale, H - pad - (y - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const outline = [[minx, miny], [maxx, miny], [maxx, g.verts[2][1] + deb.droite], [g.verts[3][0] + deb.coupe, maxy], [minx, maxy]];
  const pts = outline.map(([x, y]) => { const q = P(x, y); return `${f1(q[0])},${f1(q[1])}`; }).join(" ");
  svg += `<polygon points="${pts}" fill="#e8eee2" stroke="#6b8e23" stroke-width="2"/>\n`;
  const wpts = g.verts.map((v: number[]) => { const q = P(v[0], v[1]); return `${f1(q[0])},${f1(q[1])}`; }).join(" ");
  svg += `<polygon points="${wpts}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="6 4"/>\n`;
  for (const fx of [0.3, 0.6]) {
    const x = minx + (maxx - minx) * fx;
    const y0 = P(x, miny + 20), y1 = P(x, maxy - 20);
    svg += line(y0[0], y0[1], y1[0], y1[1], "#2b7", 2);
    svg += `<polygon points="${f0(y1[0])},${f0(y1[1])} ${f0(y1[0] - 5)},${f0(y1[1] + 9)} ${f0(y1[0] + 5)},${f0(y1[1] + 9)}" fill="#2b7"/>\n`;
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${pyNum(g.pente.degres)}° · écoulement vers l'arrière`, "middle", "#888", 11);
  svg += text(W / 2, H - 16, "écoulement de l'eau →", "middle", "#2b7", 12);
  svg += "</svg>\n";
  return svg;
}

export function facade_svg(p: Params, g: any, face: any, openings: any[]): string {
  const pad = 60, scale = 0.6;
  const L = face.longueur_cm, h1 = face.hauteur_debut_cm, h2 = face.hauteur_fin_cm;
  const base_W = L * scale + 2 * pad;
  const H = Math.max(h1, h2) * scale + 2 * pad;
  const title = `Face ${face.cle} — ${face.libelle}`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x: number, h: number) => [pad + x * scale, H - pad - h * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const poly = [P(0, 0), P(L, 0), P(L, h2), P(0, h1)];
  const pts = poly.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");
  svg += `<polygon points="${pts}" fill="#eef2f6" stroke="#2b5d8a" stroke-width="2"/>\n`;
  for (const o of openings) {
    if (o.face !== face.cle) continue;
    const ow = o.largeur_cm * scale, oh = o.hauteur_cm * scale;
    const sx = pad + o.start_cm * scale;
    const by = H - pad - o.allege_cm * scale;
    svg += `<rect x="${f1(sx)}" y="${f1(by - oh)}" width="${f1(ow)}" height="${f1(oh)}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>\n`;
    if (o.type === "porte") {
      svg += line(sx, by - oh / 2, sx - 16, by - oh / 2, "#1b6", 1, "3 3");
      svg += text(sx + ow / 2, by - oh / 2, "porte", "middle", "#178", 11);
    } else {
      svg += text(sx + ow / 2, by - oh / 2, "fenêtre", "middle", "#178", 10);
      svg += text(sx + ow / 2, by + 12, `allège ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm`, "middle", "#222", 13, "bold");
  svg += text(pad - 8, P(0, h1)[1], `${f0(h1)}`, "end", "#2b5d8a", 12);
  svg += text(pad + L * scale + 8, P(L, h2)[1], `${f0(h2)}`, "start", "#2b5d8a", 12);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += "</svg>\n";
  return svg;
}

/* ----------------------------------------------------------------- */
export function buildCore(p: Params) {
  const g = geometry(p);
  const openings = resolve_openings(p, g);
  const t = takeoff(p, g, openings);
  const sh = shopping(p, g, t, openings);
  const bud = budget(p, g, t, openings);
  const m = model3d(p, g, openings);
  const svg: Record<string, string> = {
    "plan-sol": plan_sol_svg(p, g, openings),
    "plan-toit": plan_toit_svg(p, g),
  };
  for (const f of g.faces) svg[`facade-${f.cle}`] = facade_svg(p, g, f, openings);
  return { geometrie: g, debit: t, achats: sh, budget: bud, ouvertures: openings, model3d: m, svg };
}
