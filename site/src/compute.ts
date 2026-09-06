// Coeur de calcul de l'abri — SOURCE UNIQUE de la logique (geometrie, debit,
// plans SVG, budget, modele 3D). Pur : aucune dependance DOM / Three, donc
// utilisable navigateur ET Node (CLI + tests). Couvert par des snapshots golden
// (npm run test:snapshot).
//
// Principe constructif (cf. agent/04-geometrie.md) :
//   - emprise RECTANGULAIRE A (avant) x G (profondeur), 4 faces A, D, B, G ;
//   - tous les panneaux muraux sont des RECTANGLES de hauteur H (coupes droites) ;
//   - la pente est obtenue par une REHAUSSE posee sur les murs : une bande
//     G x chute coupee en diagonale = 2 triangles (faces G et D), + une bande
//     A x chute (face A). Le mur arriere B reste a H ;
//   - toit mono-pente en panneaux toiture, ecoulement vers l'arriere (B).

export type Params = any;

export const FACE_INDEX: Record<string, number> = { A: 0, D: 1, B: 2, G: 3 };

/* ----------------------------------------------------------------- */
/* Arrondi / formatage (round half-to-even, comme Python)             */
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

// equivalent de f"{x:.{nd}f}" (round half-to-even sur la representation decimale du double).
function pyfix(x: number, nd: number): string {
  if (!isFinite(x)) return String(x);
  const neg = x < 0;
  const ax = Math.abs(x);
  const [intp, fracRaw] = ax.toFixed(18).split(".");
  const frac = fracRaw || "";
  let digits = intp + frac.slice(0, nd).padEnd(nd, "0");
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
const itr = (x: number) => Math.trunc(x);

/* ----------------------------------------------------------------- */
/* Geometrie                                                          */
/* ----------------------------------------------------------------- */
export function geometry(p: Params) {
  const A = +p.emprise_cm.avant_A, G = +p.emprise_cm.gauche_G;
  const FL = [0, 0], FR = [A, 0], BR = [A, G], BL = [0, G];
  const verts = [FL, FR, BR, BL];
  const names = ["avant-gauche", "avant-droite", "arriere-droite", "arriere-gauche"];
  const H = +p.murs.hauteur_cm;             // hauteur des panneaux muraux (rectangles) = arriere
  const drop = +p.toit.pente_chute_cm;      // hauteur de la rehausse a l'avant
  const run = G;
  const h_at = (y: number) => H + drop * (1 - y / run);
  const slope_pct = 100 * drop / run;
  const slope_deg = Math.atan2(drop, run) * 180 / Math.PI;
  const rampant = Math.hypot(run, drop);
  const facesDef: [string, string, number[], number[], string][] = [
    ["A", "Avant", FL, FR, "bandeau"],
    ["D", "Droite", FR, BR, "triangle"],
    ["B", "Arriere", BR, BL, "aucune"],
    ["G", "Gauche", BL, FL, "triangle"],
  ];
  const faces = facesDef.map(([key, label, p1, p2, reh]) => {
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const h1 = h_at(p1[1]), h2 = h_at(p2[1]);
    return {
      cle: key, libelle: label, longueur_cm: rnd(length, 1),
      hauteur_mur_cm: H,
      hauteur_debut_cm: rnd(h1, 1), hauteur_fin_cm: rnd(h2, 1),
      hauteur_max_cm: rnd(Math.max(h1, h2), 1),
      rehausse: reh,
    };
  });

  // Dalle reelle (coin arriere-droit coupe) : partie de l'emprise hors dalle.
  let dalle: any = null;
  const d = p.dalle_cm;
  if (d) {
    const dA = +d.avant, dG = +d.gauche, dD = +d.droite_jusqu_coupe, dB = +d.arriere_jusqu_coupe;
    const cw = dA - dB, ch = dG - dD;           // triangle coupe : largeur x profondeur
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const uA = cw > 0 ? clamp((A - dB) / cw) : 0;
    const vG = ch > 0 ? clamp((G - dD) / ch) : 0;
    const t = Math.max(0, uA + vG - 1);       // fraction du triangle occupee par le batiment
    const dx = t * cw, dy = t * ch;
    dalle = {
      avant: dA, gauche: dG, droite_jusqu_coupe: dD, arriere_jusqu_coupe: dB,
      coupe_cm: rnd(Math.hypot(cw, ch), 1),
      hors_dalle_m2: rnd(dx * dy / 2 / 1e4, 2),
      hors_dalle_triangle_cm: [rnd(dx, 1), rnd(dy, 1)],
      depasse_bbox: A > dA + 1e-9 || G > dG + 1e-9,
    };
  }

  return {
    verts, vert_names: names,
    vert_heights_cm: verts.map((v) => rnd(h_at(v[1]), 1)),
    cotes: { A, G },
    aire_m2: rnd(A * G / 1e4, 2),
    emprise_debords_m2: rnd((A + (+p.toit.debord_cm.gauche) + (+p.toit.debord_cm.droite)) * (G + (+p.toit.debord_cm.avant) + (+p.toit.debord_cm.arriere)) / 1e4, 2),
    perimetre_cm: rnd(2 * (A + G), 1),
    pente: { chute_cm: drop, run_cm: run, pourcent: rnd(slope_pct, 1), degres: rnd(slope_deg, 2), rampant_cm: rnd(rampant, 1) },
    hauteur_mur_cm: H,
    hauteur_avant_cm: rnd(H + drop, 1),
    hauteur_arriere_cm: H,
    faces,
    dalle,
  };
}

/* ----------------------------------------------------------------- */
/* Ouvertures : porte (source principale de lumiere) + fenetres[]      */
/* ----------------------------------------------------------------- */
export function opening_start_cm(o: any, face_len: number): number {
  const w = +o.largeur_cm;
  const margin = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm;
  const pos = o.position == null ? "centre" : o.position;
  if (typeof pos === "number" || /^\d+(\.\d+)?$/.test(String(pos))) return Math.max(0, Math.min(+pos, face_len - w));
  if (pos === "droite") return Math.max(0, face_len - w - margin);
  if (pos === "gauche") return margin;
  return Math.max(0, (face_len - w) / 2);
}

export function resolve_openings(p: Params, g: any) {
  const facelen: Record<string, number> = {};
  for (const f of g.faces) facelen[f.cle] = f.longueur_cm;
  const list: any[] = p.porte ? [{ id: "porte", type: "porte", allege_cm: 0, ...p.porte }] : [];
  (p.fenetres || []).forEach((f: any, i: number) => list.push({ id: `fenetre-${i + 1}`, type: "fenetre", ...f }));
  return list.map((o: any) => ({
    id: o.id, type: o.type, face: o.face, face_index: FACE_INDEX[o.face],
    largeur_cm: +o.largeur_cm, hauteur_cm: +o.hauteur_cm,
    allege_cm: +o.allege_cm || 0,
    start_cm: rnd(opening_start_cm(o, facelen[o.face]), 1),
    position: o.position == null ? "centre" : o.position,
    ouverture: o.ouverture || "", description: o.description || "",
  }));
}

/* ----------------------------------------------------------------- */
/* Debit + quantites                                                  */
/* ----------------------------------------------------------------- */
export function takeoff(p: Params, g: any, openings: any[]) {
  const cover = +p.panneau.largeur_utile_cm;
  const waste = 1 + (+p.divers.facteur_chute_pct) / 100;
  const H = g.hauteur_mur_cm, drop = g.pente.chute_cm;
  const { A, G } = g.cotes;
  const ded: Record<string, number> = {};
  for (const o of openings) ded[o.face] = (ded[o.face] || 0) + o.largeur_cm * o.hauteur_cm / 1e4;

  // Murs : rectangles H x cover, coupes droites uniquement.
  const rows: any[] = [];
  let gross = 0, net = 0;
  for (const f of g.faces) {
    const L = f.longueur_cm;
    const nn = Math.ceil(L / cover);
    const g_area = nn * (cover / 100) * (H / 100);
    let n_area = (L / 100) * (H / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area; net += n_area;
    const pieces = [];
    for (let i = 0; i < nn; i++) pieces.push({ label: `${f.cle}${i + 1}`, largeur_cm: rnd(Math.min(cover, L - i * cover), 1) });
    rows.push({
      face: f.cle, libelle: f.libelle, longueur_cm: L, hauteur_cm: H,
      nb_panneaux: nn, aire_brute_m2: rnd(g_area, 2), rehausse: f.rehausse, pieces,
    });
  }

  // Rehausse : 2 bandes (A x chute, G x chute) tirees d'un panneau mur de largeur
  // `cover` et de longueur max(A, G). La bande G est coupee en diagonale -> 2 triangles.
  const strip_len = Math.max(A, G);
  const n_reh = Math.ceil((2 * drop) / cover);
  const reh_gross = n_reh * (cover / 100) * (strip_len / 100);
  const rehausse = {
    pieces: [
      { label: "R1", piece: "Bandeau avant (face A)", longueur_cm: A, hauteur_cm: drop, nb: 1, note: "rectangle, pose sur le mur A" },
      { label: "R2+R3", piece: "Triangles lateraux (R2 face G, R3 face D)", longueur_cm: G, hauteur_cm: drop, nb: 2, note: "1 bande G x chute coupee en diagonale = 2 triangles (tourner R3 de 180 deg)" },
    ],
    nb_panneaux: n_reh, longueur_panneau_cm: strip_len, aire_brute_m2: rnd(reh_gross, 2),
    aire_nette_m2: rnd((A * drop + G * drop) / 1e4, 2),
  };

  // Toiture : rectangle debordant, panneaux dans le sens de la pente.
  const deb = p.toit.debord_cm;
  const width_x = A + (+deb.gauche) + (+deb.droite);
  const len_h = G + (+deb.avant) + (+deb.arriere);
  const run_len = len_h * Math.hypot(1, drop / G);
  const n_roof = Math.ceil(width_x / cover);
  const roof_gross = n_roof * (cover / 100) * (run_len / 100);
  const roof_real = (width_x / 100) * (len_h / 100);
  const roof_pieces = [];
  for (let i = 0; i < n_roof; i++) roof_pieces.push({ label: `T${i + 1}`, largeur_cm: rnd(Math.min(cover, width_x - i * cover), 1) });

  return {
    murs: {
      lignes: rows, aire_brute_m2: rnd(gross, 2), aire_nette_m2: rnd(net, 2),
      ouvertures_deduites_m2: rnd(Object.values(ded).reduce((a, b) => a + b, 0), 2),
      total_panneaux: rows.reduce((a, r) => a + r.nb_panneaux, 0),
    },
    rehausse,
    toit: {
      face: "T", libelle: "Toiture", nb_panneaux: n_roof,
      largeur_cm: rnd(width_x, 1), longueur_panneau_cm: rnd(run_len, 1),
      aire_brute_m2: rnd(roof_gross, 2), aire_couverte_m2: rnd(roof_real, 2),
      portee_cm: rnd(len_h, 1), pieces: roof_pieces,
    },
    commande_mur_m2: rnd((gross + reh_gross) * waste, 1),
    commande_toit_m2: rnd(roof_gross * waste, 1),
    commande_panneaux_m2: rnd((gross + reh_gross + roof_gross) * waste, 1),
    facteur_chute_pct: p.divers.facteur_chute_pct,
  };
}

/* ----------------------------------------------------------------- */
/* Liste d'achats                                                     */
/* ----------------------------------------------------------------- */
export function shopping(p: Params, g: any, t: any, openings: any[]) {
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
  const items: any[] = [
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
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." },
  ];
  if (fenetres.length) {
    items.splice(10, 0, { poste: "Fenetre(s) double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). Fixe ou oscillo-battant. La garder dans un seul panneau (pas a cheval sur un joint). Cadre + appui + joints." });
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
  const corner_h = g.hauteur_avant_cm / 100;
  const profils_ml = 4 * corner_h * 2 + perim;
  const portes = openings.filter((o) => o.type === "porte").length;
  const fenetres = openings.filter((o) => o.type === "fenetre").length;
  const src: [string, number, string, number][] = [
    ["Panneaux sandwich - mur + rehausse (brut)", rnd(t.murs.aire_brute_m2 + t.rehausse.aire_brute_m2, 2), "m²", get("panneau_mur_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m²", get("panneau_toit_m2")],
    ["Porte vitree", portes, "u", get("porte_vitree")],
    ["Fenetre(s)", fenetres, "u", get("fenetre")],
    ["Profils (angles, rives, rail)", rnd(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")],
    ["Livraison des panneaux", 1, "forfait", get("livraison_forfait")],
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
  const { A, G } = g.cotes;
  const deb = p.toit.debord_cm;
  const m = (v: number) => rnd(v / 100, 3);
  const drop = g.pente.chute_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const panels: any[] = [];
  g.faces.forEach((f: any) => {
    const n = Math.ceil(f.longueur_cm / cover);
    for (let i = 0; i < n; i++) panels.push({
      label: `${f.cle}${i + 1}`, face_index: FACE_INDEX[f.cle],
      s0_m: m(i * cover), s1_m: m(Math.min((i + 1) * cover, f.longueur_cm)),
    });
  });
  const rehausse_pieces = drop > 0 ? [
    { label: "R1", face_index: FACE_INDEX.A, kind: "bandeau" },
    { label: "R2", face_index: FACE_INDEX.G, kind: "triangle" },
    { label: "R3", face_index: FACE_INDEX.D, kind: "triangle" },
  ] : [];
  const roof_w = A + (+deb.gauche) + (+deb.droite);
  const roof_panels: any[] = [];
  for (let i = 0, n = Math.ceil(roof_w / cover); i < n; i++) roof_panels.push({
    label: `T${i + 1}`, x0_m: m(-deb.gauche + i * cover), x1_m: m(-deb.gauche + Math.min((i + 1) * cover, roof_w)),
  });
  const slab = g.dalle
    ? [[0, 0], [g.dalle.avant, 0], [g.dalle.avant, g.dalle.droite_jusqu_coupe], [g.dalle.arriere_jusqu_coupe, g.dalle.gauche], [0, g.dalle.gauche]]
    : g.verts;
  return {
    footprint: g.verts.map((v: number[]) => [m(v[0]), m(v[1])]),
    heights: g.vert_heights_cm.map((h: number) => rnd(h / 100, 3)),
    wall_height_m: m(g.hauteur_mur_cm),
    panel_cover_m: m(+p.panneau.largeur_utile_cm),
    thickness_m: (+p.panneau.epaisseur_mm) / 1000,
    roof_outline: [
      [m(-deb.gauche), m(-deb.avant)], [m(A + +deb.droite), m(-deb.avant)],
      [m(A + +deb.droite), m(G + +deb.arriere)], [m(-deb.gauche), m(G + +deb.arriere)],
    ],
    roof_front_m: m(g.hauteur_avant_cm),
    roof_slope: rnd(drop / G, 5),
    slab: slab.map((v: number[]) => [m(v[0]), m(v[1])]),
    gutter_face_index: FACE_INDEX.B,
    panels, rehausse_pieces, roof_panels,
    openings: openings.map((o) => ({
      type: o.type, face_index: o.face_index,
      offset_m: m(o.start_cm), width_m: m(o.largeur_cm), height_m: m(o.hauteur_cm), sill_m: m(o.allege_cm),
    })),
  };
}

/* ----------------------------------------------------------------- */
/* SVG (plans + elevations)                                           */
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
function poly(pts: number[][], fill: string, stroke: string, w = 2, dash = ""): string {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<polygon points="${pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"${d}/>\n`;
}
function tw(s: string, size: number): number {
  return s.length * size * 0.58;
}

export function plan_sol_svg(p: Params, g: any, openings: any[]): string {
  const pad = 90, scale = 0.42;
  const { A, G } = g.cotes;
  const d = g.dalle;
  const bw = d ? Math.max(A, d.avant) : A, bh = d ? Math.max(G, d.gauche) : G;
  const base_W = bw * scale + 2 * pad;
  const H = bh * scale + 2 * pad;
  const title = `Plan de sol · ${A} × ${G} cm · ${g.aire_m2} m²`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v: number[]) => [pad + xoff + v[0] * scale, H - pad - v[1] * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  if (d) {
    const slab = [[0, 0], [d.avant, 0], [d.avant, d.droite_jusqu_coupe], [d.arriere_jusqu_coupe, d.gauche], [0, d.gauche]];
    svg += poly(slab.map(P), "#eeeae0", "#a89f8a", 1.5, "6 4");
  }
  svg += poly(g.verts.map(P), "#dce8f5", "#2b5d8a", 2);
  if (d && d.hors_dalle_m2 > 0) {
    const [dx, dy] = d.hors_dalle_triangle_cm;
    const tri = [[A, G], [A - dx, G], [A, G - dy]].map(P);
    svg += `<defs><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c0392b" stroke-width="2"/></pattern></defs>\n`;
    svg += poly(tri, "url(#hach)", "#c0392b", 1.5);
    const c = P([A - dx / 3, G - dy / 3]);
    svg += text(c[0] - 10, c[1] + 16, `hors dalle ${f0(dx)}×${f0(dy)}`, "end", "#c0392b", 10, "bold");
  }
  const labels: Record<string, [number, number, string, number, number]> = {
    A: [A / 2, 0, "middle", 0, 18], D: [A, G / 2, "start", 8, 4], B: [A / 2, G, "middle", 0, -8], G: [0, G / 2, "end", -8, 4],
  };
  const vals: Record<string, number> = { A, D: G, B: A, G };
  for (const k of Object.keys(labels)) {
    const [x, y, anchor, dx, dy] = labels[k];
    const q = P([x, y]);
    svg += text(q[0] + dx, q[1] + dy, `${k} = ${f0(vals[k])} cm`, anchor, "#2b5d8a", 14, "bold");
  }
  const edge: Record<string, [number, number]> = { A: [0, 1], D: [1, 2], B: [2, 3], G: [3, 0] };
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
    svg += `<path d="M ${f1(q1[0])} ${f1(q1[1])} A ${f1(dwpx)} ${f1(dwpx)} 0 0 1 ${f1(oe[0])} ${f1(oe[1])}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>\n`;
    svg += text((q0[0] + q1[0]) / 2 + owx * (dwpx + 14), (q0[1] + q1[1]) / 2 + owy * (dwpx + 14), `porte ${itr(o.largeur_cm)} (ouvre dehors)`, "middle", "#c0392b", 11);
  }
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, "pente vers l'arrière (face B) · dalle réelle en pointillé", "middle", "#888", 11);
  svg += text(W / 2, H - 14, "AVANT (face A)", "middle", "#666", 12);
  svg += "</svg>\n";
  return svg;
}

export function plan_toit_svg(p: Params, g: any, t: any): string {
  const pad = 70, scale = 0.42;
  const deb = p.toit.debord_cm;
  const { A, G } = g.cotes;
  const minx = -deb.gauche, maxx = A + +deb.droite, miny = -deb.avant, maxy = G + +deb.arriere;
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de toiture · ${t.toit.nb_panneaux} panneaux · pente ${g.pente.pourcent} %`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (x: number, y: number) => [pad + xoff + (x - minx) * scale, H - pad - (y - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly([P(minx, miny), P(maxx, miny), P(maxx, maxy), P(minx, maxy)], "#e8eee2", "#6b8e23", 2);
  svg += poly(g.verts.map((v: number[]) => P(v[0], v[1])), "none", "#999", 1, "6 4");
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
    svg += `<polygon points="${f0(y1[0])},${f0(y1[1])} ${f0(y1[0] - 5)},${f0(y1[1] + 9)} ${f0(y1[0] + 5)},${f0(y1[1] + 9)}" fill="#2b7"/>\n`;
  }
  const top = P((minx + maxx) / 2, maxy), bot = P((minx + maxx) / 2, miny);
  svg += text(top[0], top[1] - 8, `${f0(maxx - minx)} cm`, "middle", "#50701d", 12, "bold");
  const side = P(maxx, (miny + maxy) / 2);
  svg += text(side[0] + 8, side[1] + 4, `${f0(t.toit.longueur_panneau_cm)} cm (rampant)`, "start", "#50701d", 11);
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${g.pente.degres}° · écoulement vers l'arrière`, "middle", "#888", 11);
  svg += text(bot[0], H - 16, "écoulement de l'eau →", "middle", "#2b7", 12);
  svg += "</svg>\n";
  return svg;
}

// Plan de coupe de la rehausse : 1 bande G x chute coupee en diagonale (2 triangles)
// + 1 bande A x chute (bandeau avant), tirees d'un panneau mur de largeur `cover`.
export function plan_rehausse_svg(p: Params, g: any, t: any): string {
  const pad = 50, scale = 1.0;
  const cover = +p.panneau.largeur_utile_cm;
  const { A, G } = g.cotes;
  const drop = g.pente.chute_cm;
  const Lp = t.rehausse.longueur_panneau_cm;
  const title = `Rehausse · 1 panneau ${f0(Lp)} × ${f0(cover)} cm → 2 triangles + 1 bandeau`;
  const lab1 = `bande 1 : ${f0(G)} × ${f0(drop)}, coupée en diagonale = triangle G + triangle D`;
  const lab2 = `bande 2 : bandeau avant ${f0(A)} × ${f0(drop)}`;
  const labW = Math.max(tw(lab1, 11), tw(lab2, 11));
  const base_W = pad + Lp * scale + 16 + labW + 20;
  const H = cover * scale + 2 * pad + 20;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x: number, y: number) => [pad + x * scale, pad + 20 + y * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly([P(0, 0), P(Lp, 0), P(Lp, cover), P(0, cover)], "#f3f5f1", "#999", 1.5, "5 4");
  // bande 1 : triangles (G x chute), diagonale
  svg += poly([P(0, 0), P(G, 0), P(G, drop), P(0, drop)], "#fdf6e3", "#a07400", 2);
  const d0 = P(0, drop), d1 = P(G, 0);
  svg += line(d0[0], d0[1], d1[0], d1[1], "#a07400", 2, "6 3");
  svg += text(P(G * 0.12, 0)[0], P(0, drop)[1] - 4, "R2 (G)", "middle", "#a07400", 11, "bold");
  svg += text(P(G * 0.88, 0)[0], P(0, 0)[1] + 12, "R3 (D)", "middle", "#a07400", 11, "bold");
  // bande 2 : bandeau avant (A x chute)
  const y2 = drop + 8;
  svg += poly([P(0, y2), P(A, y2), P(A, y2 + drop), P(0, y2 + drop)], "#e3ecf7", "#2b5d8a", 2);
  svg += text(P(A / 2, 0)[0], P(0, y2 + drop / 2)[1] + 4, "R1 · bandeau A", "middle", "#2b5d8a", 11, "bold");
  // legendes a droite + cotes
  const lx = P(Lp, 0)[0] + 16;
  svg += text(lx, P(0, drop / 2)[1] + 4, lab1, "start", "#a07400", 11);
  svg += text(lx, P(0, y2 + drop / 2)[1] + 4, lab2, "start", "#2b5d8a", 11);
  svg += text(lx, P(0, cover)[1], `panneau ${f0(Lp)} × ${f0(cover)} cm (reste = chute)`, "start", "#999", 11);
  svg += text(P(Lp / 2, 0)[0], P(0, 0)[1] - 8, `${f0(Lp)} cm`, "middle", "#666", 11);
  svg += text(P(0, 0)[0] - 6, P(0, drop / 2)[1] + 4, `${f0(drop)}`, "end", "#a07400", 11);
  svg += text(P(0, 0)[0] - 6, P(0, y2 + drop / 2)[1] + 4, `${f0(drop)}`, "end", "#2b5d8a", 11);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, H - 12, "toutes coupes droites + une seule diagonale · le triangle D est le même que G, tourné de 180°", "middle", "#888", 11);
  svg += "</svg>\n";
  return svg;
}

export function facade_svg(p: Params, g: any, face: any, openings: any[]): string {
  const pad = 60, scale = 0.6;
  const L = face.longueur_cm, h1 = face.hauteur_debut_cm, h2 = face.hauteur_fin_cm, Hm = face.hauteur_mur_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const base_W = L * scale + 2 * pad;
  const H = Math.max(h1, h2) * scale + 2 * pad;
  const title = `Face ${face.cle} — ${face.libelle}`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x: number, h: number) => [pad + x * scale, H - pad - h * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  // panneaux muraux (rectangles)
  svg += poly([P(0, 0), P(L, 0), P(L, Hm), P(0, Hm)], "#eef2f6", "#2b5d8a", 2);
  for (let x = cover; x < L - 1e-6; x += cover) {
    const a = P(x, 0), b = P(x, Hm);
    svg += line(a[0], a[1], b[0], b[1], "#8fa3b8", 1, "4 3");
  }
  // rehausse
  if (face.rehausse !== "aucune") {
    svg += poly([P(0, Hm), P(L, Hm), P(L, h2), P(0, h1)], "#fdf6e3", "#a07400", 2);
    if (face.rehausse === "bandeau") {
      const mid = P(L / 2, (h1 + Hm) / 2);
      svg += text(mid[0], mid[1] + 4, `R1 · bandeau ${f0(L)} × ${f0(h1 - Hm)}`, "middle", "#a07400", 10, "bold");
    } else {
      const mid = P(L / 2, (h1 + h2) / 2);
      svg += text(mid[0], mid[1] - 8, `${face.cle === "G" ? "R2" : "R3"} · triangle ${f0(L)} × ${f0(Math.abs(h1 - h2))}`, "middle", "#a07400", 10, "bold");
    }
  }
  for (const o of openings) {
    if (o.face !== face.cle) continue;
    const ow = o.largeur_cm * scale, oh = o.hauteur_cm * scale;
    const sx = pad + o.start_cm * scale;
    const by = H - pad - o.allege_cm * scale;
    svg += `<rect x="${f1(sx)}" y="${f1(by - oh)}" width="${f1(ow)}" height="${f1(oh)}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>\n`;
    if (o.type === "porte") {
      svg += line(sx, by - oh / 2, sx - 16, by - oh / 2, "#1b6", 1, "3 3");
      svg += text(sx + ow / 2, by - oh / 2 - 6, "porte", "middle", "#178", 11);
      svg += text(sx + ow / 2, by - oh / 2 + 8, `${itr(o.largeur_cm)}×${itr(o.hauteur_cm)}`, "middle", "#178", 10);
    } else {
      svg += text(sx + ow / 2, by - oh / 2 - 2, "fenêtre", "middle", "#178", 10);
      svg += text(sx + ow / 2, by - oh / 2 + 10, `${itr(o.largeur_cm)}×${itr(o.hauteur_cm)}`, "middle", "#178", 9);
      svg += text(sx + ow / 2, by + 12, `allège ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  // etiquettes des panneaux (apres les ouvertures : au-dessus si le panneau en porte une)
  const mine = openings.filter((o) => o.face === face.cle);
  for (let i = 0, n = Math.ceil(L / cover); i < n; i++) {
    const x0 = i * cover, x1 = Math.min((i + 1) * cover, L);
    const over = mine.filter((o) => o.start_cm < x1 && o.start_cm + o.largeur_cm > x0);
    const topOpen = over.length ? Math.max(...over.map((o) => o.allege_cm + o.hauteur_cm)) : 0;
    const hy = over.length ? Math.min(Hm - 6, topOpen + (Hm - topOpen) / 2) : Hm * 0.86;
    const c = P((x0 + x1) / 2, hy);
    svg += text(c[0], c[1] + 6, `${face.cle}${i + 1}`, "middle", "#9fb0c2", over.length && Hm - topOpen < 30 ? 11 : 18, "bold");
  }
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm · ${Math.ceil(L / cover)} panneaux de ${f0(Hm)}`, "middle", "#222", 13, "bold");
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
    "plan-toit": plan_toit_svg(p, g, t),
    "plan-rehausse": plan_rehausse_svg(p, g, t),
  };
  for (const f of g.faces) svg[`facade-${f.cle}`] = facade_svg(p, g, f, openings);
  return { geometrie: g, debit: t, achats: sh, budget: bud, ouvertures: openings, model3d: m, svg };
}
