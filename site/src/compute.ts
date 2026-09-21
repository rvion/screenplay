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
const fz = (x: number) => (Number.isInteger(x) ? f0(x) : f1(x));   // 22.5 -> "22.5", 25 -> "25"

/* ----------------------------------------------------------------- */
/* Polygones (dalle)                                                  */
/* ----------------------------------------------------------------- */
type Pt = number[];

// pointe arriere de la dalle : a `ag` de L et `ad` de R, du cote arriere de L->R.
// longueurs qui ne ferment pas le triangle -> null (la dalle devient un quadrilatere)
export function slab_apex(L: Pt, R: Pt, ag: number, ad: number): Pt | null {
  const dx = R[0] - L[0], dy = R[1] - L[1], dist = Math.hypot(dx, dy);
  if (!(dist > 0) || !(ag > 0) || !(ad > 0)) return null;
  const a = (ag * ag - ad * ad + dist * dist) / (2 * dist);
  const h2 = ag * ag - a * a;
  if (a < 0 || a > dist || h2 <= 1e-9) return null;
  const h = Math.sqrt(h2), ux = dx / dist, uy = dy / dist;
  let nx = -uy, ny = ux;                       // normale, orientee vers l'arriere (y croissant)
  if (ny < 0) { nx = -nx; ny = -ny; }
  return [L[0] + a * ux + h * nx, L[1] + a * uy + h * ny];
}

// angle interieur a chaque sommet d'un polygone antihoraire (degres, reflexe > 180 possible)
export function interior_angles(q: Pt[]): number[] {
  return q.map((b, i) => {
    const a = q[(i + q.length - 1) % q.length], c = q[(i + 1) % q.length];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    let t = Math.atan2(v2[0] * v1[1] - v2[1] * v1[0], v2[0] * v1[0] + v2[1] * v1[1]);
    if (t < 0) t += 2 * Math.PI;
    return t * 180 / Math.PI;
  });
}

export function poly_area(q: Pt[]): number {
  let s = 0;
  for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}

// garde la partie de `subject` du cote gauche de a->b (keepLeft) ou du cote droit
function clip_half(subject: Pt[], a: Pt, b: Pt, keepLeft: boolean): Pt[] {
  const side = (q: Pt) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) * (keepLeft ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < subject.length; i++) {
    const cur = subject[i], nxt = subject[(i + 1) % subject.length];
    const sc = side(cur), sn = side(nxt);
    if (sc >= 0) out.push(cur);
    if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
      const t = sc / (sc - sn);
      out.push([cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])]);
    }
  }
  return out;
}

// Sutherland-Hodgman : `subject` quelconque, `clipper` convexe antihoraire
export function clip_convex(subject: Pt[], clipper: Pt[]): Pt[] {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) out = clip_half(out, clipper[i], clipper[(i + 1) % clipper.length], true);
  return out;
}

// polygone antihoraire convexe dont chaque cote recule vers l'interieur de largeurs[i]
export function inset(q: Pt[], largeurs: number[]): Pt[] {
  let z: Pt[] = q;
  q.forEach((a, i) => {
    const b = q[(i + 1) % q.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l * largeurs[i], ny = (b[0] - a[0]) / l * largeurs[i];
    if (z.length) z = clip_half(z, [a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], true);
  });
  return z;
}

// meme recul, mais sommet par sommet (intersection des cotes decales voisins) : garde l'ordre des cotes
// e par cote possible ; negatif = vers l'exterieur (debords de toit)
export function inset_ordre(q: Pt[], e: number | number[]): Pt[] {
  const n = q.length;
  const dec = q.map((a, i) => {
    const ei = Array.isArray(e) ? e[i] : e;
    const b = q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * ei, ny = (b[0] - a[0]) / l * ei;
    return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]];
  });
  return q.map((_, i) => {
    const [p1, p2] = dec[(i + n - 1) % n], [p3, p4] = dec[i];
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    const u = (p1[0] * p2[1] - p1[1] * p2[0]), v = (p3[0] * p4[1] - p3[1] * p4[0]);
    return [(u * (p3[0] - p4[0]) - (p1[0] - p2[0]) * v) / d, (u * (p3[1] - p4[1]) - (p1[1] - p2[1]) * v) / d];
  });
}

// nom d'un cote de forme d'apres sa direction (repere : x a droite, y vers l'arriere)
function nom_cote(a: Pt, b: Pt): string {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
  if (ux > 0.9999) return "avant";
  if (uy > 0.9999) return "droite";
  if (ux < -0.9999) return "fond";
  if (uy < -0.9999) return "gauche";
  return uy < -0.9 ? "gauche en biais" : uy > 0.9 ? "droite en biais" : "fond en biais";
}

// parties de `rect` au-dela de chaque cote de la dalle (pour le hachurage), avec l'indice du cote
function outside_pieces(rect: Pt[], slab: Pt[]): { cote: number; pts: Pt[] }[] {
  const pieces: { cote: number; pts: Pt[] }[] = [];
  for (let i = 0; i < slab.length; i++) {
    const pts = clip_half(rect, slab[i], slab[(i + 1) % slab.length], false);
    if (pts.length >= 3 && poly_area(pts) > 1) pieces.push({ cote: i, pts });
  }
  return pieces;
}

// degagement d'un rectangle par rapport a la droite a->b d'un cote de dalle antihoraire :
// distance du coin le plus proche, positive a l'interieur, negative si le coin traverse
function clearance(rect: Pt[], a: Pt, b: Pt): number {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return Math.min(...rect.map((q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / len));
}

// bord arriere de la dalle (y max) a l'abscisse x ; hors de la dalle en largeur -> -Infinity
function rear_edge_y(slab: Pt[], x: number): number {
  let best = -Infinity;
  for (let i = 0; i < slab.length; i++) {
    const a = slab[i], b = slab[(i + 1) % slab.length];
    if (x < Math.min(a[0], b[0]) - 1e-9 || x > Math.max(a[0], b[0]) + 1e-9) continue;
    const y = Math.abs(b[0] - a[0]) < 1e-9 ? Math.max(a[1], b[1]) : a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
    best = Math.max(best, y);
  }
  return best;
}

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

  // Dalle reelle : pentagone a pointe arriere, decrit par 5 longueurs relevees au metre.
  // decalage = position du coin avant-gauche de l'abri dans le repere de la dalle.
  let dalle: any = null;
  const d = p.dalle_cm;
  if (d) {
    const dA = +d.avant, dD = +d.droite, dG = +d.gauche, ag = +d.arriere_gauche, ad = +d.arriere_droite;
    const ox = d.decalage_cm ? +d.decalage_cm.x : 0, oy = d.decalage_cm ? +d.decalage_cm.y : 0;
    const apex = slab_apex([0, dG], [dA, dD], ag, ad);
    const local = [[0, 0], [dA, 0], [dA, dD], ...(apex ? [apex] : []), [0, dG]];
    const poly = local.map(([x, y]) => [x - ox, y - oy]);   // repere de l'abri
    const noms = apex ? ["avant", "droite", "arriere_droite", "arriere_gauche", "gauche"] : ["avant", "droite", "arriere", "gauche"];
    const rect = [[0, 0], [A, 0], [A, G], [0, G]];
    // murs de propriete : ni l'abri ni le toit (debords + gouttiere arriere) ne peuvent les franchir
    const mitoyens: string[] = d.murs_mitoyens || [];
    const est_mur = (nom: string) => mitoyens.includes(nom) || (nom === "arriere" && mitoyens.some((k) => k.startsWith("arriere")));
    const deb = p.toit.debord_cm, gout = +p.toit.gouttiere_largeur_cm || 0;
    const toit = [[-deb.gauche, -deb.avant], [A + +deb.droite, -deb.avant], [A + +deb.droite, G + +deb.arriere + gout], [-deb.gauche, G + +deb.arriere + gout]];
    const murs = noms.map((nom, i) => ({ nom, i })).filter(({ nom }) => est_mur(nom)).map(({ nom, i }) => {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      return { cote: nom, de: [rnd(a[0], 1), rnd(a[1], 1)], a: [rnd(b[0], 1), rnd(b[1], 1)], abri_cm: rnd(clearance(rect, a, b), 1), toit_cm: rnd(clearance(toit, a, b), 1) };
    });
    const hors_cm2 = Math.max(0, A * G - poly_area(clip_convex(poly, rect)));
    const pieces = hors_cm2 > 1 ? outside_pieces(rect, poly) : [];
    const rear = (x: number) => { const y = rear_edge_y(poly, x); return Number.isFinite(y) ? rnd(y - G, 1) : null; };
    // passage arriere : bande entre l'abri et les murs du fond (le mur gauche, lui, est longe expres).
    // pince = le plus petit degagement ; profondeur_max = plus grand G qui garde la bande souhaitee
    const fond = murs.filter((w) => w.cote !== "gauche");
    let passage: any = null;
    if (fond.length) {
      const pince = fond.reduce((m, w) => (w.abri_cm < m.abri_cm ? w : m));
      const souhaite = +d.passage_souhaite_cm || 0;
      const libre = (depth: number) => Math.min(...fond.map((w) => clearance([[0, 0], [A, 0], [A, depth], [0, depth]], w.de, w.a)));
      let lo = 0, hi = 2000;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (libre(mid) >= souhaite) lo = mid; else hi = mid; }
      // coin de l'abri le plus proche du mur pince, et son pied sur le mur (pour la cote du plan)
      const [wa, wb] = [pince.de, pince.a], wl = Math.hypot(wb[0] - wa[0], wb[1] - wa[1]) || 1;
      const sd = (q: Pt) => ((wb[0] - wa[0]) * (q[1] - wa[1]) - (wb[1] - wa[1]) * (q[0] - wa[0])) / wl;
      const coin = rect.reduce((m, q) => (sd(q) < sd(m) ? q : m));
      const nx = (wb[1] - wa[1]) / wl, ny = -(wb[0] - wa[0]) / wl, s = sd(coin);
      passage = {
        cm: pince.abri_cm, cote: pince.cote, souhaite_cm: souhaite,
        etat: pince.abri_cm < 35 ? "impraticable" : pince.abri_cm < 50 ? "de profil" : "praticable",
        profondeur_max_cm: rnd(lo, 0),
        segment: [[rnd(coin[0], 1), rnd(coin[1], 1)], [rnd(coin[0] + nx * s, 1), rnd(coin[1] + ny * s, 1)]],
      };
    }
    // zone utile : la dalle moins une bande libre le long de chaque cote (demi-plans decales vers l'interieur)
    let zone_utile: any = null;
    const bandes = d.bandes_libres_cm;
    if (bandes) {
      const largeurs = noms.map((nom) => +bandes[nom] || 0);
      const z = inset(local, largeurs);
      zone_utile = {
        bandes_cm: largeurs,
        polygone: z.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]),
        cotes_cm: z.map((a, i) => { const b = z[(i + 1) % z.length]; return rnd(Math.hypot(b[0] - a[0], b[1] - a[1]), 1); }),
        angles_deg: interior_angles(z).map((a) => rnd(a, 1)),
        aire_m2: rnd(poly_area(z) / 1e4, 2),
        bandes_m2: rnd((poly_area(local) - poly_area(z)) / 1e4, 2),
      };
    }
    dalle = {
      zone_utile,
      avant: dA, droite: dD, gauche: dG, arriere_gauche: ag, arriere_droite: ad,
      decalage_cm: [ox, oy],
      pointe_cm: apex ? [rnd(apex[0], 1), rnd(apex[1], 1)] : null,
      // polygone de la dalle dans le repere de l'abri (origine = coin avant-gauche de l'abri)
      polygone: poly.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]),
      // angles interieurs, dans l'ordre du polygone (coin avant-gauche d'abord)
      angles_deg: interior_angles(local).map((a) => rnd(a, 1)),
      aire_m2: rnd(poly_area(local) / 1e4, 2),
      cotes_cm: [dA, dD, ...(apex ? [ad, ag] : [rnd(Math.hypot(dA, dD - dG), 1)]), dG],
      cotes_noms: noms,
      murs,
      mur_hauteur_cm: +d.mur_hauteur_cm || 0,
      mur_epaisseur_cm: +d.mur_epaisseur_cm || 15,
      passage,
      toit_touche_mur: murs.some((w) => w.toit_cm < 0),
      degagement_toit_min_cm: murs.length ? Math.min(...murs.map((w) => w.toit_cm)) : null,
      marges_cm: { gauche: ox, avant: oy, droite: rnd(dA - ox - A, 1), arriere_droite: rear(A), arriere_gauche: rear(0) },
      hors_dalle: hors_cm2 > 1,
      hors_dalle_m2: rnd(hors_cm2 / 1e4, 2),
      hors_dalle_polygones: pieces.map((q) => q.pts.map(([x, y]) => [rnd(x, 1), rnd(y, 1)])),
      hors_dalle_contre_mur: pieces.some((q) => est_mur(noms[q.cote])),
    };
  }

  return {
    verts, vert_names: names,
    vert_heights_cm: verts.map((v) => rnd(h_at(v[1]), 1)),
    cotes: { A, G },
    aire_m2: rnd(A * G / 1e4, 2),
    aire_interieure_m2: rnd((A - 2 * (+p.panneau.epaisseur_mm) / 10) * (G - 2 * (+p.panneau.epaisseur_mm) / 10) / 1e4, 2),
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
  (p.fenetres || []).forEach((f: any, i: number) => list.push({ id: `fenetre-${i + 1}`, type: "fenetre", ouvrant: false, ...f }));
  return list.map((o: any) => ({
    id: o.id, type: o.type, face: o.face, face_index: FACE_INDEX[o.face],
    largeur_cm: +o.largeur_cm, hauteur_cm: +o.hauteur_cm,
    allege_cm: +o.allege_cm || 0,
    start_cm: rnd(opening_start_cm(o, facelen[o.face]), 1),
    position: o.position == null ? "centre" : o.position,
    ouvrant: o.type === "porte" ? true : !!o.ouvrant,
    ouverture: o.ouverture || "", description: o.description || "",
  }));
}

// Un panneau [s0,s1] est "remplace" quand une ouverture pleine hauteur (allege 0, haut >= H)
// couvre toute sa largeur : c'est un bloc-porte qui prend le module, pas un panneau decoupe.
export function panel_replaced_by(openings: any[], face: string, s0: number, s1: number, H: number): any | null {
  for (const o of openings) {
    if (o.face !== face || o.allege_cm > 0.5) continue;
    if (o.start_cm <= s0 + 0.5 && o.start_cm + o.largeur_cm >= s1 - 0.5 && o.allege_cm + o.hauteur_cm >= H - 0.5) return o;
  }
  return null;
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
    const nb = Math.ceil(L / cover);
    const pieces: any[] = [];
    let nn = 0;
    for (let i = 0; i < nb; i++) {
      const s0 = i * cover, s1 = Math.min((i + 1) * cover, L);
      const rep = panel_replaced_by(openings, f.cle, s0, s1, H);
      pieces.push({ label: `${f.cle}${i + 1}`, largeur_cm: rnd(s1 - s0, 1), remplace_par: rep ? rep.id : null });
      if (!rep) nn++;
    }
    const g_area = nn * (cover / 100) * (H / 100);
    let n_area = (L / 100) * (H / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area; net += n_area;
    rows.push({
      face: f.cle, libelle: f.libelle, longueur_cm: L, hauteur_cm: H,
      nb_panneaux: nn, aire_brute_m2: rnd(g_area, 2), rehausse: f.rehausse, pieces,
    });
  }

  // Rehausse : bois (madrier, defaut) ou bande de panneau mur coupee en diagonale.
  const rh = p.rehausse || { materiau: "panneau" };
  const strip_len = Math.max(A, G);
  const n_reh = Math.ceil((2 * drop) / cover);
  const reh_gross = n_reh * (cover / 100) * (strip_len / 100);
  const bois = rh.materiau === "bois";
  const stock = bois ? (+rh.longueur_stock_cm || 480) : 0;
  const rehausse: any = {
    materiau: bois ? "bois" : "panneau",
    pieces: [
      { label: "R1", piece: "Bandeau avant (face A)", longueur_cm: A, hauteur_cm: drop, nb: 1, note: bois ? "madrier droit, pose sur le mur A" : "rectangle, pose sur le mur A" },
      { label: "R2+R3", piece: "Coins lateraux (R2 face G, R3 face D)", longueur_cm: G, hauteur_cm: drop, nb: 2, note: bois ? "1 madrier de G coupe en diagonale = 2 coins (tourner R3 de 180 deg)" : "1 bande G x chute coupee en diagonale = 2 triangles (tourner R3 de 180 deg)" },
    ],
    nb_panneaux: bois ? 0 : n_reh, longueur_panneau_cm: bois ? 0 : strip_len,
    aire_brute_m2: bois ? 0 : rnd(reh_gross, 2), aire_nette_m2: bois ? 0 : rnd((A * drop + G * drop) / 1e4, 2),
  };
  if (bois) {
    rehausse.section_mm = rh.section_mm || [75, 225];
    rehausse.longueur_stock_cm = stock;
    rehausse.ml = rnd((A + G) / 100, 2);
    rehausse.nb_madriers = Math.ceil((A + G) / stock);
  }

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
    commande_mur_m2: rnd((gross + (bois ? 0 : reh_gross)) * waste, 1),
    commande_toit_m2: rnd(roof_gross * waste, 1),
    commande_panneaux_m2: rnd((gross + (bois ? 0 : reh_gross) + roof_gross) * waste, 1),
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
  const fen_q = fenetres.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} all.${itr(o.allege_cm)} (face ${o.face}, ${o.ouvrant ? "oscillo-battante" : "fixe"})`).join(", ");
  const r = t.rehausse;
  const rehItem = r.materiau === "bois"
    ? { poste: `Rehausse bois : madrier ${r.section_mm[0]}x${r.section_mm[1]} mm traite classe 4`, qte: `${r.nb_madriers} x ${f2(r.longueur_stock_cm / 100)} m (${r.ml} ml : R1 = ${itr(A)} cm droit, R2+R3 = ${itr(G)} cm coupe en diagonale)`, note: "Pose sur le chant des panneaux (bande butyle), visse dans les panneaux ; sert de lisse haute qui lie murs et toit. Larmier par-dessus cote exterieur." }
    : { poste: "Rehausse : bande de panneau mur", qte: `${r.nb_panneaux} panneau de ${f2(r.longueur_panneau_cm / 100)} m`, note: "2 bandes (A x chute, G x chute), la 2e coupee en diagonale." };
  const open_perim = openings.reduce((a, o) => a + 2 * (o.largeur_cm + o.hauteur_cm), 0) / 100;
  const ep = p.panneau.epaisseur_mm;
  const items: any[] = [
    { poste: `Panneaux sandwich ${ep} mm - finition MUR`, qte: `${t.murs.total_panneaux} panneaux de ${f2(g.hauteur_mur_cm / 100)} m${t.rehausse.nb_panneaux ? ` + ${t.rehausse.nb_panneaux} de ${f2(t.rehausse.longueur_panneau_cm / 100)} m` : ""} (~${t.commande_mur_m2} m2 avec chute)`, note: "Ame PIR, autoportants (pas d'ossature). FIXATION CACHEE dans le joint (pas de tete de vis visible), parement lisse/micro-nervure, couleur au choix (mur fonce + toit clair). Coupes droites uniquement." },
    rehItem,
    { poste: `Panneaux sandwich ${ep} mm - finition TOIT (face T)`, qte: `${t.toit.nb_panneaux} panneaux de ~${f2(t.toit.longueur_panneau_cm / 100)} m (~${t.commande_toit_m2} m2 avec chute)`, note: `Profil TOITURE (nervures hautes), sens de la pente, COULEUR CLAIRE (chaleur d'ete). Portee libre ~${f2(t.toit.portee_cm / 100)} m : verifier le tableau de portees du fabricant.` },
    { poste: "Rail / lambourde de pied", qte: `~${ceil(perim) + 1} m`, note: "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle." },
    { poste: "Profils d'angle exterieurs + interieurs", qte: `4 angles x ${f2(corner_h)} m, ext + int = ~${ceil(8 * corner_h)} m`, note: "4 angles droits standard (profil L / couvre-joint)." },
    { poste: "Bavette d'egout haut (avant)", qte: `~${ceil(A / 100) + 1} m`, note: "Larmier en haut de la face avant." },
    { poste: "Bavettes de rive (gauche/droite)", qte: `~${ceil(2 * G / 100) + 1} m`, note: "Rives laterales du toit (affleurantes si debord lateral = 0 : la bavette ferme le chant du panneau)." },
    { poste: "Gouttiere + 1 descente", qte: `~${ceil(A / 100) + 1} m + 1 descente`, note: "En bas de pente (face B), descente a un angle arriere." },
    { poste: "Vis autoperceuses tete EPDM", qte: `~${screws} (boite de ${ceil(screws / 100) * 100})`, note: "Longueur = epaisseur panneau + rail. Rondelle d'etancheite obligatoire." },
    { poste: "Chevilles / scellement dalle", qte: `~${anchors}`, note: "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)." },
    { poste: "Bloc-porte vitre alu double vitrage", qte: `${portes.length} (${porte_q})`, note: "Dormant compris, aux cotes d'un module entier (largeur utile x hauteur de mur) : remplace un panneau, rien a decouper. Poignee + serrure, ouverture vers l'exterieur, seuil + joints. La piece touchee tous les jours : ne pas economiser ici." },
    { poste: "Ventilation (VMC ou aerateurs hygro)", qte: "1 kit", note: "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)." },
    { poste: "Bande comprimee / mousse precomprimee", qte: `~${ceil(perim + open_perim)} m`, note: "Etancheite a l'air au pied et au pourtour des ouvertures." },
    { poste: "Bande butyle (joints de panneaux)", qte: `~${ceil(perim * 2)} m`, note: "Joints longitudinaux, joint mur/rehausse et perimetriques." },
    { poste: "Mastic PU + primaire anticorrosion", qte: "~5 cartouches + 1 primaire", note: "Cachetage et protection des chants coupes (anticorrosion)." },
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." },
  ];
  if (fenetres.length) {
    items.splice(11, 0, { poste: "Fenetre(s) double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). L'ouvrante assure la ventilation traversante avec la porte. Chaque fenetre dans un seul panneau (pas a cheval sur un joint). Cadre + appui + joints." });
  }
  const am = p.amenagement || {};
  const on = (k: string) => am[k] && am[k].actif;
  if (on("plancher")) items.push({ poste: "Plancher isole", qte: `~${g.aire_interieure_m2} m2, ${am.plancher.epaisseur_cm} cm`, note: `${am.plancher.description}. Hauteur sous plafond arriere ~${f2((g.hauteur_arriere_cm - am.plancher.epaisseur_cm) / 100)} m.` });
  if (on("electricite")) items.push({ poste: "Electricite (cable existant par le sol)", qte: "1 lot", note: am.electricite.description });
  if (on("chauffage")) items.push({ poste: "Chauffage", qte: "1", note: am.chauffage.description });
  if (on("store")) items.push({ poste: "Store / occultation", qte: "1", note: am.store.description });
  if (on("finition_interieure")) items.push({ poste: "Finition interieure", qte: "1 lot", note: am.finition_interieure.description });
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
  const fen_fixes = openings.filter((o) => o.type === "fenetre" && !o.ouvrant).length;
  const fen_ouv = openings.filter((o) => o.type === "fenetre" && o.ouvrant).length;
  const bois = t.rehausse.materiau === "bois";
  const mur_m2 = rnd(t.murs.aire_brute_m2 + (bois ? 0 : t.rehausse.aire_brute_m2), 2);
  const src: [string, number, string, number][] = [
    [bois ? "Panneaux sandwich - mur (brut)" : "Panneaux sandwich - mur + rehausse (brut)", mur_m2, "m²", get("panneau_mur_m2")],
    ["Surcout fixation cachee (mur)", mur_m2, "m²", get("fixation_cachee_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m²", get("panneau_toit_m2")],
  ];
  if (bois) src.push(["Rehausse bois (madrier)", t.rehausse.ml, "ml", p.rehausse && p.rehausse.prix_ml_eur != null ? +p.rehausse.prix_ml_eur : 10]);
  src.push(
    ["Bloc-porte vitre", portes, "u", get("porte_vitree")],
    ["Fenetre(s) fixe(s)", fen_fixes, "u", get("fenetre_fixe")],
    ["Fenetre(s) ouvrante(s)", fen_ouv, "u", get("fenetre_ouvrante")],
    ["Profils (angles, rives, rail)", rnd(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")],
    ["Livraison des panneaux", 1, "forfait", get("livraison_forfait")],
  );
  const am = p.amenagement || {};
  const amen: [string, number, string, number][] = [];
  if (am.plancher && am.plancher.actif) amen.push(["Amenagement - plancher isole", g.aire_interieure_m2, "m²", +am.plancher.prix_m2_eur || 0]);
  for (const [k, label] of [["electricite", "Amenagement - electricite (multiprise, eclairage)"], ["chauffage", "Amenagement - chauffage"], ["store", "Amenagement - store"], ["finition_interieure", "Amenagement - finition interieure"]] as [string, string][]) {
    if (am[k] && am[k].actif) amen.push([label, 1, "forfait", +am[k].forfait_eur || 0]);
  }
  const rows: any[] = [];
  let sous = 0, coque = 0;
  for (const [label, qte, unit, pu] of src) {
    const montant = qte * pu;
    sous += montant; coque += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd(montant), groupe: "coque" });
  }
  for (const [label, qte, unit, pu] of amen) {
    const montant = qte * pu;
    sous += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd(montant), groupe: "amenagement" });
  }
  const inc = pr.incertitude_pct == null ? 15 : +pr.incertitude_pct;
  return {
    lignes: rows, coque_eur: rnd(coque), amenagement_eur: rnd(sous - coque), sous_total_eur: rnd(sous), incertitude_pct: inc,
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
    for (let i = 0; i < n; i++) {
      const s0 = i * cover, s1 = Math.min((i + 1) * cover, f.longueur_cm);
      if (panel_replaced_by(openings, f.cle, s0, s1, g.hauteur_mur_cm)) continue;
      panels.push({ label: `${f.cle}${i + 1}`, face_index: FACE_INDEX[f.cle], s0_m: m(s0), s1_m: m(s1) });
    }
  });
  const rehMat = (p.rehausse && p.rehausse.materiau) || "panneau";
  const rehausse_pieces = drop > 0 ? [
    { label: "R1", face_index: FACE_INDEX.A, kind: "bandeau", materiau: rehMat },
    { label: "R2", face_index: FACE_INDEX.G, kind: "triangle", materiau: rehMat },
    { label: "R3", face_index: FACE_INDEX.D, kind: "triangle", materiau: rehMat },
  ] : [];
  const am = p.amenagement || {};
  const floor_m = am.plancher && am.plancher.actif ? m(+am.plancher.epaisseur_cm || 6) : 0;
  const roof_w = A + (+deb.gauche) + (+deb.droite);
  const roof_panels: any[] = [];
  for (let i = 0, n = Math.ceil(roof_w / cover); i < n; i++) roof_panels.push({
    label: `T${i + 1}`, x0_m: m(-deb.gauche + i * cover), x1_m: m(-deb.gauche + Math.min((i + 1) * cover, roof_w)),
  });
  const slab = g.dalle ? g.dalle.polygone : g.verts;
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
    walls: g.dalle && g.dalle.mur_hauteur_cm > 0 ? g.dalle.murs.map((w: any) => ({ a: [m(w.de[0]), m(w.de[1])], b: [m(w.a[0]), m(w.a[1])], h_m: m(g.dalle.mur_hauteur_cm), ep_m: m(g.dalle.mur_epaisseur_cm) })) : [],
    gutter_face_index: FACE_INDEX.B,
    panels, rehausse_pieces, roof_panels,
    rehausse_materiau: rehMat,
    floor_m,
    openings: openings.map((o) => ({
      type: o.type, face_index: o.face_index, ouvrant: !!o.ouvrant,
      offset_m: m(o.start_cm), width_m: m(o.largeur_cm), height_m: m(o.hauteur_cm), sill_m: m(o.allege_cm),
    })),
  };
}

// plus grand k-gone dans un polygone convexe : ses sommets sont des sommets du polygone (l'aire est
// lineaire en chaque sommet le long d'un cote), donc on enumere les sous-ensembles. garde = indices imposes
export function plus_grand_k_gone(Z: Pt[], k: number, garde: number[] = []): Pt[] | null {
  let best: Pt[] | null = null, ba = -1;
  const rec = (i: number, pris: number[]) => {
    if (pris.length === k) { const q = pris.map((j) => Z[j]), a = poly_area(q); if (a > ba) { ba = a; best = q; } return; }
    if (i >= Z.length || Z.length - i < k - pris.length) return;
    rec(i + 1, [...pris, i]);
    if (!garde.includes(i)) rec(i + 1, pris);
  };
  rec(0, []);
  return best;
}

// plus grand rectangle inscrit dans un polygone convexe, toutes orientations.
// a angle fixe, sur une bande [ya, yb] du polygone tourne, la largeur libre vaut
// min(droite(ya), droite(yb)) - max(gauche(ya), gauche(yb)) (bords convexes)
export function plus_grand_rectangle(Z: Pt[]): { w: number; h: number; deg: number; pts: Pt[] } | null {
  const essai = (deg: number) => {
    const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    const R = Z.map(([x, y]) => [x * c + y * s, -x * s + y * c]);
    const ymin = Math.min(...R.map((v) => v[1])), ymax = Math.max(...R.map((v) => v[1]));
    const N = 240, dy = (ymax - ymin) / N, L: number[] = [], D: number[] = [];
    for (let k = 0; k <= N; k++) {
      const y = ymin + k * dy, xs: number[] = [];
      R.forEach((a, i) => {
        const b = R[(i + 1) % R.length];
        if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      });
      L.push(xs.length ? Math.min(...xs) : Infinity); D.push(xs.length ? Math.max(...xs) : -Infinity);
    }
    let best = { aire: 0, w: 0, h: 0, x: 0, y: 0 };
    for (let i = 0; i <= N; i++) for (let j = i + 1; j <= N; j++) {
      const w = Math.min(D[i], D[j]) - Math.max(L[i], L[j]), h = (j - i) * dy;
      if (w > 0 && w * h > best.aire) best = { aire: w * h, w, h, x: Math.max(L[i], L[j]), y: ymin + i * dy };
    }
    const back = ([x, y]: Pt) => [x * c - y * s, x * s + y * c];
    return { ...best, deg, pts: [[best.x, best.y], [best.x + best.w, best.y], [best.x + best.w, best.y + best.h], [best.x, best.y + best.h]].map(back) };
  };
  let top = essai(0);
  for (let d = 2; d < 180; d += 2) { const e = essai(d); if (e.aire > top.aire) top = e; }
  for (let d = top.deg - 2; d <= top.deg + 2; d += 0.25) { const e = essai(d); if (e.aire > top.aire) top = e; }
  if (!(top.aire > 0)) return null;
  const deg = top.deg > 90 ? top.deg - 180 : top.deg;
  return { w: top.w, h: top.h, deg, pts: top.pts };
}

/* ----------------------------------------------------------------- */
/* Variantes de forme dans la zone utile (repere de la dalle)         */
/* ----------------------------------------------------------------- */
// porte sur le cote avant ; chaque forme part du coin avant-gauche de la zone utile
export function variantes(p: Params, g: any) {
  const zu = g.dalle && g.dalle.zone_utile;
  if (!zu || zu.polygone.length < 3) return [];
  const Z0: Pt[] = zu.polygone;
  const k0 = Z0.reduce((m: number, v: Pt, i: number) => (v[1] < Z0[m][1] - 1e-6 || (Math.abs(v[1] - Z0[m][1]) <= 1e-6 && v[0] < Z0[m][0]) ? i : m), 0);
  const Z: Pt[] = [...Z0.slice(k0), ...Z0.slice(0, k0)];       // Z[0] avant-gauche, Z[1] avant-droit
  const x0 = Math.min(...Z.map((v) => v[0])), y0 = Math.min(...Z.map((v) => v[1]));
  const x1 = Math.max(...Z.map((v) => v[0]));
  const dedans = (q: Pt) => Z.every((a, i) => { const b = Z[(i + 1) % Z.length]; return (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= -1e-6 * Math.hypot(b[0] - a[0], b[1] - a[1]); });
  const rect = (w: number, h: number): Pt[] => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
  const tient = (w: number, h: number) => rect(w, h).every(dedans);
  const prof_max = (w: number) => { if (!tient(w, 0)) return 0; let lo = 0, hi = 2000; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (tient(w, m)) lo = m; else hi = m; } return lo; };
  const sous = (yb: number) => {
    const c = clip_half(Z, [1e4, yb], [-1e4, yb], true);
    return c.filter((v, i) => Math.hypot(v[0] - c[(i + 1) % c.length][0], v[1] - c[(i + 1) % c.length][1]) > 0.05);
  };
  const ep = (+p.panneau.epaisseur_mm) / 10, seuil = +(p.reglementaire && p.reglementaire.seuil_sans_formalite_m2) || 5;
  // passages arriere : pour chaque mur du fond, plus petit degagement a la forme, avec le segment a coter
  const [ox, oy] = g.dalle.decalage_cm;
  const fond = g.dalle.murs.filter((w: any) => w.cote.startsWith("arriere")).map((w: any) => ({ cote: w.cote, a: [w.de[0] + ox, w.de[1] + oy], b: [w.a[0] + ox, w.a[1] + oy] }));
  // point de [a, b] le plus proche de q (projection bornee : un mur s'arrete a ses extremites)
  const pied = (q: Pt, a: Pt, b: Pt): Pt => {
    const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / l2));
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  // distance entre deux segments disjoints = min des 4 distances extremite / autre segment
  const passages = (r: Pt[]) => fond.map(({ cote, a, b }: any) => {
    let best: any = null;
    const garde = (forme_pt: Pt, mur_pt: Pt) => {
      const cm = Math.hypot(forme_pt[0] - mur_pt[0], forme_pt[1] - mur_pt[1]);
      if (!best || cm < best.cm) best = { cote, cm, segment: [forme_pt, mur_pt] };
    };
    r.forEach((p, i) => {
      const q = r[(i + 1) % r.length];
      garde(p, pied(p, a, b));
      garde(pied(a, p, q), a);
      garde(pied(b, p, q), b);
    });
    return { cote, cm: rnd(best.cm, 1), segment: best.segment.map((v: Pt) => [rnd(v[0], 1), rnd(v[1], 1)]) };
  });
  const forme = (id: number, titre: string, note: string, q: Pt[]) => {
    const k = q.reduce((m, v, i) => (v[1] < q[m][1] - 1e-6 || (Math.abs(v[1] - q[m][1]) <= 1e-6 && v[0] < q[m][0]) ? i : m), 0);
    const r = [...q.slice(k), ...q.slice(0, k)];                // cote 0 = avant (porte)
    return {
      id, titre, note,
      polygone: r.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]),
      cotes_cm: r.map((a, i) => { const b = r[(i + 1) % r.length]; return rnd(Math.hypot(b[0] - a[0], b[1] - a[1]), 1); }),
      angles_deg: interior_angles(r).map((a) => rnd(a, 1)),
      aire_m2: rnd(poly_area(r) / 1e4, 2),
      aire_interieure_m2: rnd(poly_area(inset(r, r.map(() => ep))) / 1e4, 2),
      noms_cotes: r.map((a, i) => nom_cote(a, r[(i + 1) % r.length])),
      cotes_interieures_cm: (() => { const s = inset_ordre(r, ep); return s.map((a, i) => { const b = s[(i + 1) % s.length]; return rnd(Math.hypot(b[0] - a[0], b[1] - a[1]), 1); }); })(),
      passages: passages(r),
    };
  };
  const out: any[] = [];
  // 1. plus grand rectangle en modules entiers
  const mod = +p.panneau.largeur_utile_cm;
  let best = [0, 0];
  for (let i = 1; i * mod <= x1 - x0 + 1e-6; i++) for (let j = 1; j < 20 && tient(i * mod, j * mod); j++) if (i * j > best[0] * best[1]) best = [i, j];
  if (best[0]) out.push(forme(1, "rectangle en panneaux entiers", `${best[0]} × ${best[1]} modules de ${fz(mod)} : aucune recoupe, angles droits`, rect(best[0] * mod, best[1] * mod)));
  // 2. rectangle d'aire maximale (au cm)
  let bw = 0, bh = 0;
  for (let w = 1; w <= Math.floor(x1 - x0); w++) { const h = Math.floor(prof_max(w)); if (w * h > bw * bh) { bw = w; bh = h; } }
  out.push(forme(2, "plus grand rectangle", "le plus grand rectangle qui tient dans la zone", rect(bw, bh)));
  // 3. rectangle pleine largeur
  const wf = Math.floor(x1 - x0);
  out.push(forme(3, "rectangle pleine largeur", "toute la largeur de la zone, profondeur limitée par le grand pan", rect(wf, Math.floor(prof_max(wf)))));
  // 5. coin coupe : mur arriere au haut du cote gauche de la zone, pan coupe parallele au grand pan
  const yb = Math.max(...Z.filter((v) => Math.abs(v[0] - x0) < 0.5).map((v) => v[1]));
  const cinq = sous(yb);
  // 4. meme forme, mur arriere recule jusqu'au seuil sans formalite
  let lo = y0, hi = yb;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (poly_area(sous(m)) <= seuil * 1e4) lo = m; else hi = m; }
  out.push(forme(4, `coin coupé, plafonné à ${fz(seuil)} m²`, `mur arrière reculé pour ne pas dépasser ${fz(seuil)} m² de murs`, sous(lo)));
  out.push(forme(5, "coin coupé, pleine profondeur", "un pan coupé parallèle au mur du fond, le reste à angle droit", cinq));
  // 6. toute la zone utile
  out.push(forme(6, "toute la zone utile", "suit toute la zone : 3 angles non droits, pointe à l'arrière", Z));
  // 7. plus grand rectangle a n'importe quelle orientation (porte sur le cote qu'on veut)
  const r7 = plus_grand_rectangle(Z);
  if (r7) out.push(forme(7, "plus grand rectangle, orientation libre", Math.abs(r7.deg) < 0.01 ? `${f1(r7.w)} × ${f1(r7.h)} : aucune rotation ne fait mieux que le rectangle droit` : `${f1(r7.w)} × ${f1(r7.h)}, tourné de ${f1(r7.deg)}° : porte sur le côté de son choix`, r7.pts));
  // 8. plus grand quadrilatere qui garde le mur avant (porte) ; 9. trapeze : garde les deux cotes
  // perpendiculaires a l'avant, le mur arriere joint leurs hauts en biais
  if (Z.length > 4) {
    const q8 = plus_grand_k_gone(Z, 4, [0, 1]);
    const drop = Z.find((v) => !q8!.includes(v))!;
    const angle_perdu = interior_angles(Z)[Z.indexOf(drop)];
    if (q8) out.push(forme(8, "plus grand quadrilatère", `4 murs, le coin de ${f1(angle_perdu)}° de la zone est sacrifié : l'aire maximale à 4 murs`, q8));
    const HG = Z[Z.length - 1], HD = Z[2];
    out.push(forme(9, "trapèze, mur arrière en biais", "côtés gauche et droit d'équerre sur l'avant, un seul mur en biais au fond", [Z[0], Z[1], HD, HG]));
    // 10. meme trapeze, mur droit glisse vers la gauche le long du mur arriere jusqu'au seuil
    const trap = (w: number): Pt[] => { const x = Z[0][0] + w, t = (x - HG[0]) / (HD[0] - HG[0]); return [Z[0], [x, Z[0][1]], [x, HG[1] + t * (HD[1] - HG[1])], HG]; };
    let lo = 0, hi = Z[1][0] - Z[0][0];
    for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (poly_area(trap(m)) <= seuil * 1e4) lo = m; else hi = m; }
    const w10 = Math.floor(lo);
    out.push(forme(10, `trapèze plafonné à ${fz(seuil)} m²`, `le trapèze 9, mur droit reculé à ${w10} de large : sous ${fz(seuil)} m²`, trap(w10)));
    // 11. meme trapeze, mur arriere pivote vers le bas autour de son coin gauche jusqu'au seuil
    const pivot = (h: number): Pt[] => [Z[0], Z[1], [Z[1][0], Z[1][1] + h], HG];
    lo = 0; hi = HD[1] - Z[1][1];
    for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (poly_area(pivot(m)) <= seuil * 1e4) lo = m; else hi = m; }
    const h11 = Math.floor(lo);
    // 13. trapeze pleine largeur, coin arriere gauche au haut du cote gauche, mur arriere pivote
    // vers le bas jusqu'a garder le passage vise derriere l'abri (vraie distance au grand pan)
    const vise = +p.dalle_cm.passage_souhaite_cm || 0;
    // cotes imposees (disposition_trapeze.cotes_cm) : les trois murs d'equerre au module, le fond en decoule
    const fixe = p.disposition_trapeze && p.disposition_trapeze.cotes_cm;
    if (fixe) {
      const [fa, fd, fg] = [+fixe.avant, +fixe.droite, +fixe.gauche];
      out.push(forme(13, `trapèze aux cotes ${fz(fa)} / ${fz(fd)} / ${fz(fg)}`, `façade ${fz(fa)}, mur droit ${fz(fd)}, mur gauche ${fz(fg)} : trois murs d'équerre calés sur le module de ${fz(mod)}, le fond en biais en découle`, [Z[0], [Z[0][0] + fa, Z[0][1]], [Z[0][0] + fa, Z[0][1] + fd], [Z[0][0], Z[0][1] + fg]]));
    } else if (vise > 0) {
      const derriere = (q: Pt[]) => { const w = passages(q).find((x: any) => x.cote === "arriere_droite"); return w ? w.cm : Infinity; };
      lo = 0; hi = HG[1] - Z[1][1];
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (derriere(pivot(m)) >= vise) lo = m; else hi = m; }
      const h13 = Math.floor(lo), plein = pivot(h13);
      // puis le mur droit glisse vers la gauche le long de ce mur arriere jusqu'a l'interieur vise
      // (le passage ne peut que s'elargir) ; sans cible, pleine largeur
      const cible = +(p.disposition_trapeze && p.disposition_trapeze.interieur_vise_m2) || 0;
      const HR = plein[2];
      const glisse = (w: number): Pt[] => { const x = Z[0][0] + w, t = (x - HG[0]) / (HR[0] - HG[0]); return [Z[0], [x, Z[0][1]], [x, HG[1] + t * (HR[1] - HG[1])], HG]; };
      const interieur = (q: Pt[]) => poly_area(inset(q, q.map(() => ep))) / 1e4;
      let w13 = Z[1][0] - Z[0][0];
      if (cible > 0 && interieur(plein) > cible) {
        lo = 0; hi = w13;
        for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (interieur(glisse(m)) <= cible) lo = m; else hi = m; }
        w13 = Math.round(lo);
      }
      out.push(forme(13, `trapèze, ${fz(vise)} cm derrière${cible > 0 ? `, ~${fz(cible)} m² intérieur` : ""}`, `mur arrière du haut du côté gauche, pivoté pour ${fz(vise)} cm de passage derrière, façade ${w13}${cible > 0 ? ` pour ~${fz(cible)} m² intérieur` : ""}`, glisse(w13)));
    }
    out.push(forme(11, `trapèze pivoté, plafonné à ${fz(seuil)} m²`, `le trapèze 9, coin arrière droit abaissé à ${h11} : sous ${fz(seuil)} m², passage arrière élargi`, pivot(h11)));
    // 12. coin coupe au module : mur du fond = i modules, mur gauche = j modules (les deux murs
    // contre la propriete, sans recoupe), facade pleine largeur, pan coupe parallele au grand pan
    const pente_pan = (Z[3][1] - HD[1]) / (HD[0] - Z[3][0]);      // montee du grand pan vers la gauche
    const au_module = (i: number, j: number): Pt[] | null => {
      const C: Pt = [x0 + i * mod, y0 + j * mod];
      if (C[0] >= x1 - 1e-6 || !dedans(C)) return null;
      const yd = C[1] - (x1 - C[0]) * pente_pan;                  // ou le pan coupe rejoint le mur droit
      return yd > y0 + 1 ? [[x0, y0], [x1, y0], [x1, yd], C, [x0, C[1]]] : null;
    };
    let m12: { q: Pt[]; i: number; j: number } | null = null;
    for (let i = 1; i * mod < x1 - x0; i++) for (let j = 1; j < 20; j++) {
      const q = au_module(i, j);
      if (q && poly_area(q) <= seuil * 1e4 && (!m12 || poly_area(q) > poly_area(m12.q))) m12 = { q, i, j };
    }
    if (m12) out.push(forme(12, "coin coupé au module", `l'option 1 élargie à toute la façade : mur du fond ${m12.i} et mur gauche ${m12.j} modules de ${fz(mod)} sans recoupe, pan coupé parallèle au grand pan`, m12.q));
  }
  // porte : sur l'avant par defaut, sauf l'option 7 (aucune) ; disposition_trapeze pour l'option 13
  const place = (v: any, cote: string, position: any, largeur: number) => {
    const k = v.noms_cotes.indexOf(cote);
    if (k < 0) return null;
    const L = v.cotes_cm[k], w = Math.min(largeur, L);
    const s0 = typeof position === "number" ? position : position === "gauche" ? 0 : position === "centre" ? (L - w) / 2 : L - w;
    return { cote: k, nom: cote, debut_cm: rnd(s0, 1), largeur_cm: w };
  };
  const disp = p.disposition_trapeze;
  for (const v of out) {
    if (!p.porte || v.id === 7) { v.porte = null; continue; }
    const perso = v.id === 13 && disp;
    v.porte = perso ? place(v, disp.porte_cote, disp.porte_position, +(disp.porte_largeur_cm || p.porte.largeur_cm)) : place(v, "avant", p.porte.position, +p.porte.largeur_cm);
    if (!perso) continue;
    // porte avec chambranle : l'ouverture et son cadre restent a porte_marge_cm des faces interieures
    // des murs voisins (le mur d'angle a son epaisseur, et l'angle n'est pas droit) et sous le haut du mur
    if (v.porte) {
      const ch = +(disp.porte_chambranle_cm || 0), mg = +(disp.porte_marge_cm || 0), k = v.porte.cote, w = v.porte.largeur_cm;
      const r: Pt[] = v.polygone, I = inset_ordre(r, ep), a = r[k], b = r[(k + 1) % r.length], L = v.cotes_cm[k];
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, le_long = (z: Pt) => (z[0] - a[0]) * ux + (z[1] - a[1]) * uy;
      const min = le_long(I[k]) + mg + ch, max = le_long(I[(k + 1) % r.length]) - mg - ch - w;
      const pos = disp.porte_position;
      const s0 = typeof pos === "number" ? Math.min(Math.max(pos, min), max) : pos === "gauche" ? min : pos === "centre" ? (min + max) / 2 : max;
      const Hm = +p.murs.hauteur_cm;
      v.porte = { ...v.porte, debut_cm: rnd(s0, 1), chambranle_cm: ch, marge_cm: mg, hauteur_cm: rnd(Math.min(+(disp.porte_hauteur_cm || Hm), Hm - mg - ch), 1), tient: max >= min - 1e-6 };
    }
    // fenetres : position = distance depuis le debut du cote (coin avant-gauche pour la facade)
    v.fenetres = (disp.fenetres || []).map((f: any) => {
      const k = v.noms_cotes.indexOf(f.cote);
      if (k < 0) return null;
      const L = v.cotes_cm[k], w = +f.largeur_cm;
      const s0 = typeof f.position === "number" ? +f.position : f.position === "gauche" ? 0 : f.position === "centre" ? (L - w) / 2 : L - w;
      return { cote: k, nom: f.cote, debut_cm: rnd(s0, 1), largeur_cm: w, hauteur_cm: +f.hauteur_cm, allege_cm: +f.allege_cm, ouvrant: !!f.ouvrant, tient: s0 >= 0 && s0 + w <= L + 1e-6 };
    }).filter(Boolean);
    // bureaux : bande de profondeur donnee le long de chaque mur, dans l'interieur ; sol libre = le reste
    const r: Pt[] = v.polygone, inter = inset(r, r.map(() => ep));
    v.bureaux = (disp.bureaux || []).map((b: any) => {
      const i = v.noms_cotes.indexOf(b.cote);
      if (i < 0) return null;
      const a = r[i], c = r[(i + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, e = ep + +b.profondeur_cm;
      const nx = -(c[1] - a[1]) / l * e, ny = (c[0] - a[0]) / l * e;
      const q = clip_half(inter, [a[0] + nx, a[1] + ny], [c[0] + nx, c[1] + ny], false);
      return { cote: b.cote, profondeur_cm: +b.profondeur_cm, longueur_cm: v.cotes_interieures_cm[i], aire_m2: rnd(poly_area(q) / 1e4, 2), polygone: q.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]), brut: q };
    }).filter(Boolean);
    let occ = v.bureaux.reduce((s: number, b: any) => s + poly_area(b.brut), 0);
    for (let i = 0; i < v.bureaux.length; i++) for (let j = i + 1; j < v.bureaux.length; j++) occ -= poly_area(clip_convex(v.bureaux[i].brut, v.bureaux[j].brut));
    // sieges : un carre contre le bord interieur de son bureau, pose sur la plus longue partie libre
    // de ce bord (dans l'interieur, hors des autres bureaux et des sieges deja poses)
    const dedans_int = (z: Pt) => inter.every((a, i) => { const b = inter[(i + 1) % inter.length]; return (b[0] - a[0]) * (z[1] - a[1]) - (b[1] - a[1]) * (z[0] - a[0]) >= -1e-6; });
    const poses: Pt[][] = [];
    v.sieges = (disp.sieges || []).map((st: any) => {
      const bu = v.bureaux.find((b: any) => b.cote === st.contre);
      if (!bu) return null;
      const i = v.noms_cotes.indexOf(bu.cote), a = r[i], c = r[(i + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux, e = ep + bu.profondeur_cm, W = +st.largeur_cm, Dp = +st.profondeur_cm;
      const carre = (s: number): Pt[] => [[a[0] + ux * s + nx * e, a[1] + uy * s + ny * e], [a[0] + ux * (s + W) + nx * e, a[1] + uy * (s + W) + ny * e], [a[0] + ux * (s + W) + nx * (e + Dp), a[1] + uy * (s + W) + ny * (e + Dp)], [a[0] + ux * s + nx * (e + Dp), a[1] + uy * s + ny * (e + Dp)]];
      const libre = (s: number) => { const q = carre(s); return q.every(dedans_int) && [...v.bureaux.filter((b: any) => b !== bu).map((b: any) => b.brut), ...poses].every((o: Pt[]) => poly_area(clip_convex(q, o)) < 1); };
      let run: number[] | null = null, cur: number[] | null = null;
      for (let s = 0; s <= l; s += 1) {
        if (libre(s)) { cur = cur ? [cur[0], s] : [s, s]; if (!run || cur[1] - cur[0] > run[1] - run[0]) run = [...cur]; } else cur = null;
      }
      if (!run) return { type: st.type, largeur_cm: W, profondeur_cm: Dp, contre: st.contre, tient: false, polygone: [] };
      const s0 = typeof st.position === "number" ? Math.min(run[0] + +st.position, run[1]) : st.position === "debut" ? run[0] : st.position === "fin" ? run[1] : (run[0] + run[1]) / 2;
      const q = carre(Math.round(s0));
      poses.push(q);
      return { type: st.type, largeur_cm: W, profondeur_cm: Dp, contre: st.contre, tient: true, debut_cm: Math.round(s0), polygone: q.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]) };
    }).filter(Boolean);
    // lit pliant (pointille) : meilleure place a l'interieur, hors de l'acces a la porte, en genant le
    // moins possible les sieges (qu'on deplace pour le deplier). S'il ne tient pas sur le sol libre et que
    // sous_bureau le permet (lit plus bas que le plateau), son pied peut passer sous un bureau
    if (disp.lit_pliant) {
      const LW = +disp.lit_pliant.largeur_cm, LL = +disp.lit_pliant.longueur_cm;
      const acces: Pt[][] = [];
      if (v.porte) {
        const k = v.porte.cote, a = r[k], c = r[(k + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        const s0 = v.porte.debut_cm, s1 = s0 + v.porte.largeur_cm, pr = ep + +(disp.lit_pliant.acces_porte_cm ?? 60);
        acces.push([[a[0] + ux * s0, a[1] + uy * s0], [a[0] + ux * s1, a[1] + uy * s1], [a[0] + ux * s1 + nx * pr, a[1] + uy * s1 + ny * pr], [a[0] + ux * s0 + nx * pr, a[1] + uy * s0 + ny * pr]]);
      }
      const sous = !!disp.lit_pliant.sous_bureau;
      const fixes = sous ? acces : [...v.bureaux.map((b: any) => b.brut), ...acces];
      // candidats : plaque contre la face interieure du mur `contre` (lit rabattable), sinon partout
      const candidats: { q: Pt[]; s?: number }[] = [];
      const kc = disp.lit_pliant.contre ? v.noms_cotes.findIndex((nm: string) => nm.startsWith(disp.lit_pliant.contre)) : -1;
      let mur: any = null;
      if (kc >= 0) {
        const a = r[kc], c = r[(kc + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        mur = { a, ux, uy, nx, ny };
        for (let s = 0; s + LL <= l; s += 1) candidats.push({ s, q: [[a[0] + ux * s + nx * ep, a[1] + uy * s + ny * ep], [a[0] + ux * (s + LL) + nx * ep, a[1] + uy * (s + LL) + ny * ep], [a[0] + ux * (s + LL) + nx * (ep + LW), a[1] + uy * (s + LL) + ny * (ep + LW)], [a[0] + ux * s + nx * (ep + LW), a[1] + uy * s + ny * (ep + LW)]] });
      } else {
        const xs = inter.map((z) => z[0]), ys = inter.map((z) => z[1]);
        const angles = [0, 90, ...r.map((a, i) => { const c = r[(i + 1) % r.length]; return Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI; })];
        for (const deg of angles) {
          const t = deg * Math.PI / 180, ca = Math.cos(t), sa = Math.sin(t);
          for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2)
            candidats.push({ q: [[x, y], [x + ca * LL, y + sa * LL], [x + ca * LL - sa * LW, y + sa * LL + ca * LW], [x - sa * LW, y + ca * LW]] });
        }
      }
      let best: any = null;
      {
        for (const { q, s } of candidats) {
          if (!q.every(dedans_int)) continue;
          if (!fixes.every((o: Pt[]) => poly_area(clip_convex(q, o)) < 1)) continue;
          const dessous = sous ? v.bureaux.reduce((s: number, b: any) => s + poly_area(clip_convex(q, b.brut)), 0) : 0;
          const gene = poses.reduce((s, o) => s + poly_area(clip_convex(q, o)), 0);
          const cout = dessous * 1000 + gene;
          if (!best || cout < best.cout - 1) best = { gene, dessous, cout, q, s };
        }
      }
      v.lit_pliant = best
        ? {
          largeur_cm: LW, longueur_cm: LL, tient: true, gene_sieges_m2: rnd(best.gene / 1e4, 2), sous_bureau_cm2: rnd(best.dessous, 0), polygone: best.q.map(([x, y]: Pt) => [rnd(x, 1), rnd(y, 1)]),
          // rabattable : replie a plat contre le mur, deux fixations (charnieres) sur la face interieure
          ...(mur ? (() => {
            const e = +(disp.lit_pliant.epaisseur_replie_cm ?? 10), s0 = best.s, { a, ux, uy, nx, ny } = mur, at = (s: number, d: number): Pt => [a[0] + ux * s + nx * d, a[1] + uy * s + ny * d];
            const rep = [at(s0, ep), at(s0 + LL, ep), at(s0 + LL, ep + e), at(s0, ep + e)], fx = [at(s0 + 15, ep), at(s0 + LL - 15, ep)];
            return { contre: v.noms_cotes[kc], debut_cm: s0, replie: rep.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]), epaisseur_replie_cm: e, fixations: fx.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]) };
          })() : {}),
        }
        : { largeur_cm: LW, longueur_cm: LL, tient: false, polygone: [] };
    }
    for (const b of v.bureaux) delete b.brut;
    v.bureaux_m2 = rnd(occ / 1e4, 2);
    v.sol_libre_m2 = rnd((poly_area(inter) - occ) / 1e4, 2);
  }
  return out.sort((a, b) => a.id - b.id);
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
  const allx = [0, A, ...(d ? d.polygone.map((q: number[]) => q[0]) : [])];
  const ally = [0, G, ...(d ? d.polygone.map((q: number[]) => q[1]) : [])];
  const minx = Math.min(...allx), maxx = Math.max(...allx), miny = Math.min(...ally), maxy = Math.max(...ally);
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de sol · ${A} × ${G} cm · ${g.aire_m2} m²`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v: number[]) => [pad + xoff + (v[0] - minx) * scale, H - pad - (v[1] - miny) * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  if (d) svg += poly(d.polygone.map(P), "#eeeae0", "#a89f8a", 1.5, "6 4");
  svg += poly(g.verts.map(P), "#dce8f5", "#2b5d8a", 2);
  if (d) for (const w of d.murs) {
    const a = P(w.de), b = P(w.a), wl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ex = -(b[1] - a[1]) / wl * 2.5, ey = (b[0] - a[0]) / wl * 2.5;   // vers l'exterieur de la dalle (y SVG inverse)
    svg += line(a[0] + ex, a[1] + ey, b[0] + ex, b[1] + ey, "#5b4a3a", 5);
  }
  if (d && d.murs.length) svg += text(W / 2, 60, "trait brun épais = mur de propriété (infranchissable)", "middle", "#5b4a3a", 10);
  if (d && d.passage && d.passage.cm > 0 && d.passage.cm < 200) {
    const col = d.passage.etat === "praticable" ? "#2a8a4a" : d.passage.etat === "de profil" ? "#c77d0a" : "#c0392b";
    const [a, b] = d.passage.segment.map(P);
    svg += line(a[0], a[1], b[0], b[1], col, 2.5);
    svg += text(b[0] + 8, b[1] - 6, `passage ${f0(d.passage.cm)} cm`, "start", col, 11, "bold");
  }
  if (d && d.hors_dalle) {
    svg += `<defs><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c0392b" stroke-width="2"/></pattern></defs>\n`;
    for (const piece of d.hors_dalle_polygones) svg += poly(piece.map(P), "url(#hach)", "#c0392b", 1.5);
    const c = P([A / 2, G / 2]);
    svg += text(c[0], c[1] + 4, `hors dalle ${d.hors_dalle_m2} m²`, "middle", "#c0392b", 11, "bold");
  }
  if (d) {
    // cotes de la dalle, en gris, a l'exterieur de chaque cote. along/off : l'avant et la
    // gauche se decalent pour eviter les etiquettes de faces et le debattement de la porte
    const n = d.polygone.length;
    d.polygone.forEach((a: number[], i: number) => {
      const b = d.polygone[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;      // normale exterieure (antihoraire)
      const along = i === 0 ? 0.12 : i === 1 ? 0.25 : i === n - 1 ? 0.08 : 0.5;
      const off = i === 0 ? 34 : 12;
      const q = P([a[0] + (b[0] - a[0]) * along, a[1] + (b[1] - a[1]) * along]);
      const anchor = nx > 0.3 ? "start" : nx < -0.3 ? "end" : "middle";
      svg += text(q[0] + nx * off, q[1] - ny * off + 4, `dalle ${f0(d.cotes_cm[i])}`, anchor, "#8a8170", 10);
    });
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

// forme d'abri dessinee sur la dalle : cotes a l'interieur, angle a chaque coin, porte sur le cote avant
// sobre : sans mobilier (plan d'implantation ; le mobilier est sur le plan de sol)
function variante_svg(v: any, P: (q: Pt) => number[], scale: number, sobre = false): string {
  const q: Pt[] = v.polygone, n = q.length, BLEU = "#2b5d8a", ANGLE = "#b0452a";
  let svg = poly(q.map(P), "#cfe0f1", BLEU, 2.5);
  for (const bu of sobre ? [] : v.bureaux || []) {
    svg += poly(bu.polygone.map(P), "#e6c79c", "#9a7040", 1.2);
    const c = bu.polygone.reduce((s: number[], w: Pt) => [s[0] + w[0] / bu.polygone.length, s[1] + w[1] / bu.polygone.length], [0, 0]), pc = P(c);
    const vertical = bu.cote.startsWith("gauche") || bu.cote.startsWith("droite");
    svg += `<text x="${f1(pc[0])}" y="${f1(pc[1])}" text-anchor="middle" dominant-baseline="middle" fill="#7a5530" font-size="11" font-weight="bold"${vertical ? ` transform="rotate(-90 ${f1(pc[0])} ${f1(pc[1])})"` : ""}>bureau ${fz(bu.profondeur_cm)} × ${fz(bu.longueur_cm)}</text>\n`;
  }
  for (const st of sobre ? [] : v.sieges || []) {
    if (!st.tient) continue;
    svg += poly(st.polygone.map(P), "#dcdce6", "#55556a", 1.2);
    const c = P([st.polygone.reduce((s: number, z: Pt) => s + z[0], 0) / 4, st.polygone.reduce((s: number, z: Pt) => s + z[1], 0) / 4]);
    svg += text(c[0], c[1] - (st.largeur_cm >= 50 ? 4 : -3), st.largeur_cm >= 50 ? st.type : "tab.", "middle", "#44445a", st.largeur_cm >= 50 ? 10 : 8, "bold");
    if (st.largeur_cm >= 50) svg += text(c[0], c[1] + 10, `${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)}`, "middle", "#44445a", 9);
  }
  if (!sobre && v.lit_pliant && v.lit_pliant.tient) {
    const lp = v.lit_pliant;
    if (lp.replie) {
      svg += poly(lp.replie.map(P), "#d9c8ec", "#6a3d9a", 1.5);
      for (const z of lp.fixations) { const c = P(z); svg += `<rect x="${f1(c[0] - 3)}" y="${f1(c[1] - 3)}" width="6" height="6" fill="#6a3d9a"/>\n`; }
    }
    svg += poly(lp.polygone.map(P), "none", "#6a3d9a", 1.8, "7 4");
    // etiquette a la tete du lit (bout le plus loin des bureaux), hors du fauteuil
    const [q0, q1, q2, q3] = lp.polygone as Pt[];
    const tete = P([q0[0] + (q3[0] - q0[0]) / 2 + (q1[0] - q0[0]) * 0.12, q0[1] + (q3[1] - q0[1]) / 2 + (q1[1] - q0[1]) * 0.12]);
    void q2;
    svg += text(tete[0], tete[1] - 2, `lit ${lp.replie ? "rabattable" : "pliant"} ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)}`, "middle", "#6a3d9a", 10, "bold");
    if (lp.sous_bureau_cm2 > 0) svg += text(tete[0], tete[1] + 11, "pied sous le bureau", "middle", "#6a3d9a", 9);
  }
  q.forEach((a, i) => {
    const b = q[(i + 1) % n], pa = P(a), pb = P(b);
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const ux = (pb[0] - pa[0]) / len, uy = (pb[1] - pa[1]) / len, nx = uy, ny = -ux;   // vers l'interieur
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
    const m = [(pa[0] + pb[0]) / 2 + nx * 14, (pa[1] + pb[1]) / 2 + ny * 14];
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${BLEU}" font-size="13" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${fz(v.cotes_cm[i])}</text>\n`;
  });
  q.forEach((b, i) => {
    const c = q[(i + 1) % n], u2 = Math.atan2(c[1] - b[1], c[0] - b[0]), ang = v.angles_deg[i] * Math.PI / 180;
    const r = 16 / scale, pts: Pt[] = [];
    for (let k = 0; k <= 12; k++) { const t = u2 + ang * k / 12; pts.push(P([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)])); }
    svg += `<polyline points="${pts.map((w) => `${f1(w[0])},${f1(w[1])}`).join(" ")}" fill="none" stroke="${ANGLE}" stroke-width="1.2"/>\n`;
    if (Math.abs(v.angles_deg[i] - 90) > 0.05) {
      const bis = u2 + ang / 2, tp = P([b[0] + 40 / scale * Math.cos(bis), b[1] + 40 / scale * Math.sin(bis)]);
      svg += text(tp[0], tp[1] + 4, `${f1(v.angles_deg[i])}°`, "middle", ANGLE, 11, "bold");
    }
  });
  for (const f of v.fenetres || []) {
    const a = q[f.cote], b = q[(f.cote + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const col = f.tient ? "#1b9aa8" : "#c0392b";
    const h0 = P([a[0] + ux * f.debut_cm, a[1] + uy * f.debut_cm]), h1 = P([a[0] + ux * (f.debut_cm + f.largeur_cm), a[1] + uy * (f.debut_cm + f.largeur_cm)]);
    svg += line(h0[0], h0[1], h1[0], h1[1], col, 6);
    const m = P([a[0] + ux * (f.debut_cm + f.largeur_cm / 2) + uy * 12 / scale, a[1] + uy * (f.debut_cm + f.largeur_cm / 2) - ux * 12 / scale]);
    svg += text(m[0], m[1] + 4, `fen. ${fz(f.largeur_cm)}×${fz(f.hauteur_cm)}${f.ouvrant ? " ouvr." : " fixe"}`, "middle", col, 10, "bold");
  }
  if (v.porte) {
    // porte sur le cote v.porte.cote, charniere au bout, vantail ouvert vers l'exterieur
    const k = v.porte.cote, a = q[k], b = q[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), w = v.porte.largeur_cm, s0 = v.porte.debut_cm;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, ox = uy, oy = -ux;       // exterieur (polygone antihoraire)
    const f0w = [a[0] + ux * s0, a[1] + uy * s0], hw = [a[0] + ux * (s0 + w), a[1] + uy * (s0 + w)];
    const h0 = P(f0w), h1 = P(hw), ext = P([hw[0] + ox * w, hw[1] + oy * w]);
    if (v.porte.chambranle_cm) {
      const e = v.porte.chambranle_cm, c0 = P([a[0] + ux * (s0 - e), a[1] + uy * (s0 - e)]), c1 = P([a[0] + ux * (s0 + w + e), a[1] + uy * (s0 + w + e)]);
      svg += line(c0[0], c0[1], h0[0], h0[1], "#7a5530", 7);
      svg += line(h1[0], h1[1], c1[0], c1[1], "#7a5530", 7);
    }
    svg += line(h0[0], h0[1], h1[0], h1[1], "#c0392b", 5);
    svg += line(h1[0], h1[1], ext[0], ext[1], "#c0392b", 2);
    const arc: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const t = Math.PI / 2 * i / 16; arc.push(P([hw[0] + w * (-ux * Math.cos(t) + ox * Math.sin(t)), hw[1] + w * (-uy * Math.cos(t) + oy * Math.sin(t))])); }
    svg += `<polyline points="${arc.map((z) => `${f1(z[0])},${f1(z[1])}`).join(" ")}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>\n`;
    const m = P([(f0w[0] + hw[0]) / 2 + ox * 18 / scale, (f0w[1] + hw[1]) / 2 + oy * 18 / scale]);   // dehors, dans le debattement
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="#c0392b" font-size="11" font-weight="bold"${k === 0 ? "" : ` transform="rotate(${f1(Math.atan2(-uy, ux) * 180 / Math.PI + (uy > 0 ? 180 : 0))} ${f1(m[0])} ${f1(m[1])})"`}>porte ${fz(w)}</text>\n`;
  }
  for (const ps of v.passages || []) {
    const pc = ps.cm, col = pc < 35 ? "#c0392b" : pc < 50 ? "#c77d0a" : "#2a8a4a";
    if (!(pc > 0) || pc > 150) continue;
    const [a, b] = ps.segment.map(P);
    svg += line(a[0], a[1], b[0], b[1], col, 2.5);
    svg += `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="3" fill="${col}"/>\n`;
    // largeur ecrite le long du segment, du cote avant (vers le bas du plan)
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let nx = -uy, ny = ux;
    if (ny < 0) { nx = -nx; ny = -ny; }
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
    const m = [(a[0] + b[0]) / 2 + nx * 9, (a[1] + b[1]) / 2 + ny * 9];
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="11" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${fz(pc)}</text>\n`;
  }
  const cx = q.reduce((s, w) => s + w[0], 0) / n, cy = q.reduce((s, w) => s + w[1], 0) / n, c = P([cx, cy]);
  svg += text(c[0], c[1], `${v.aire_m2} m²`, "middle", BLEU, 22, "bold");
  svg += text(c[0], c[1] + 18, `intérieur ${v.aire_interieure_m2} m²`, "middle", BLEU, 12);
  return svg;
}

// dalle seule, vue de dessus, dans son propre repere : cote de chaque cote, angle a chaque
// sommet, position de la pointe. Les murs de propriete en brun, l'abri en fantome.
// m (modele de l'abri retenu) : plan d'implantation, sans bandes ni zone, avec toit, gouttiere et
// distances de l'abri aux bords de la dalle
export function plan_dalle_svg(g: any, avecBandes = false, v: any = null, m: any = null): string {
  const d = g.dalle;
  const zu = !m && (avecBandes || v) ? d.zone_utile : null;
  const [ox, oy] = d.decalage_cm;
  const q: Pt[] = d.polygone.map(([x, y]: Pt) => [x + ox, y + oy]);
  const n = q.length, scale = 1.25, pad = 110, top = 90;
  const xs = q.map((v) => v[0]), ys = q.map((v) => v[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const pw = v && v.porte ? v.porte.largeur_cm * scale - 60 : 0;
  const W = (maxx - minx) * scale + 2 * pad + (v && v.porte && v.porte.cote !== 0 ? Math.max(0, pw) : 0);
  const H = (maxy - miny) * scale + pad + top + 40 + (v && v.porte && v.porte.cote === 0 ? Math.max(0, pw) : 0);
  const P = (v: Pt) => [pad + (v[0] - minx) * scale, top + 40 + (maxy - v[1]) * scale];
  const mur = new Set(d.murs.map((w: any) => w.cote));
  const BRUN = "#5b4a3a", GRIS = "#6f675a", COTE = "#2b5d8a", ANGLE = "#b0452a";
  let svg = svgHeader(rnd(W), rnd(H));
  if (zu) svg += `<defs><pattern id="bande" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f3e3cf"/><line x1="0" y1="0" x2="0" y2="7" stroke="#e0b98a" stroke-width="2"/></pattern></defs>\n`;
  svg += poly(q.map(P), zu ? "url(#bande)" : "#e9e5da", GRIS, 2);
  if (zu) svg += poly(zu.polygone.map(P), "#e3efe0", "#2a8a4a", 1.8, v ? "5 4" : "");
  const { A, G } = g.cotes;
  if (!v) {
    svg += poly([[ox, oy], [ox + A, oy], [ox + A, oy + G], [ox, oy + G]].map(P), "none", "#9bb5cf", 1, "5 4");
    const c = P([ox + A / 2, oy + G / 2]);
    svg += text(c[0], c[1] + (zu ? 60 : 0), `abri ${A} × ${G}`, "middle", "#9bb5cf", 11);
  }
  // cotes : ligne parallele a l'exterieur, rappels, texte dans l'axe du cote (toujours lisible)
  q.forEach((a, i) => {
    const b = q[(i + 1) % n], pa = P(a), pb = P(b);
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const ux = (pb[0] - pa[0]) / len, uy = (pb[1] - pa[1]) / len;
    const nx = -uy, ny = ux;                     // exterieur (antihoraire en monde = horaire en SVG)
    const est_mur = mur.has(d.cotes_noms[i]);
    if (est_mur) svg += line(pa[0] + nx * 4, pa[1] + ny * 4, pb[0] + nx * 4, pb[1] + ny * 4, BRUN, 6);
    const off = 30;
    const a2 = [pa[0] + nx * off, pa[1] + ny * off], b2 = [pb[0] + nx * off, pb[1] + ny * off];
    svg += line(pa[0] + nx * 8, pa[1] + ny * 8, pa[0] + nx * (off + 5), pa[1] + ny * (off + 5), "#999", 0.8);
    svg += line(pb[0] + nx * 8, pb[1] + ny * 8, pb[0] + nx * (off + 5), pb[1] + ny * (off + 5), "#999", 0.8);
    svg += line(a2[0], a2[1], b2[0], b2[1], COTE, 1.2);
    for (const e of [a2, b2]) svg += line(e[0] - (ux - nx) * 4, e[1] - (uy - ny) * 4, e[0] + (ux - nx) * 4, e[1] + (uy - ny) * 4, COTE, 1.2);
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
    const m = [(a2[0] + b2[0]) / 2 + nx * 8, (a2[1] + b2[1]) / 2 + ny * 8];
    const lbl = `${fz(d.cotes_cm[i])} cm${est_mur ? " · mur" : ""}`;
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${COTE}" font-size="13" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${lbl}</text>\n`;
  });
  // angles : arc interieur + valeur sur la bissectrice
  q.forEach((b, i) => {
    if (v && i < 2) return;                     // la forme couvre les coins avant
    const cc = q[(i + 1) % n];
    const u2 = Math.atan2(cc[1] - b[1], cc[0] - b[0]), ang = d.angles_deg[i] * Math.PI / 180;
    const r = 22 / scale, pts: Pt[] = [];
    for (let k = 0; k <= 16; k++) { const t = u2 + ang * k / 16; pts.push(P([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)])); }
    svg += `<polyline points="${pts.map((v) => `${f1(v[0])},${f1(v[1])}`).join(" ")}" fill="none" stroke="${ANGLE}" stroke-width="1.5"/>\n`;
    const bis = u2 + ang / 2, rl = 44 / scale;
    const tp = P([b[0] + rl * Math.cos(bis), b[1] + rl * Math.sin(bis)]);
    const suppose = i < 2 ? "*" : "";
    svg += text(tp[0], tp[1] + 4, `${f1(d.angles_deg[i])}°${suppose}`, "middle", ANGLE, 12, "bold");
  });
  if (m) {
    // toit (debords) en pointille, gouttiere et descente
    svg += poly(m.toit.contour.map(P), "none", "#7a6f5a", 1.2, "6 4");
    const g0 = P(m.toit.gouttiere.de), g1 = P(m.toit.gouttiere.a), dsc = P(m.toit.gouttiere.descente);
    svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 4);
    svg += `<circle cx="${f1(dsc[0])}" cy="${f1(dsc[1])}" r="5" fill="#1b6fa8"/>\n`;
  }
  if (v) svg += variante_svg(v, P, scale, !!m);
  if (m && v) {
    // murs interieurs, et distance de l'abri a chaque bord de dalle qui n'est pas un mur du fond
    svg += poly(m.interieur.map(P), "none", "#2b5d8a", 1, "3 2");
    q.forEach((a, i) => {
      if ((d.cotes_noms[i] || "").startsWith("arriere")) return;
      const b = q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let best: any = null;
      for (const z of v.polygone as Pt[]) {
        const t = Math.max(0, Math.min(1, ((z[0] - a[0]) * (b[0] - a[0]) + (z[1] - a[1]) * (b[1] - a[1])) / (l * l)));
        const f = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], dd = Math.hypot(z[0] - f[0], z[1] - f[1]);
        if (!best || dd < best.dd - 0.01) best = { dd, z, f };
      }
      if (!best || best.dd < 0.5) return;
      const za = P(best.z), fa = P(best.f);
      svg += line(za[0], za[1], fa[0], fa[1], "#b86e1f", 2);
      const horiz = Math.abs(fa[1] - za[1]) < Math.abs(fa[0] - za[0]);
      svg += text((za[0] + fa[0]) / 2 + (horiz ? 0 : 8), (za[1] + fa[1]) / 2 + (horiz ? -6 : 4), `${fz(rnd(best.dd, 1))}`, horiz ? "middle" : "start", "#b86e1f", 11, "bold");
    });
  }
  // pointe : position depuis le coin avant-gauche
  if (d.pointe_cm && !v) {
    const pt: Pt = d.pointe_cm, pp = P(pt), p0 = P([pt[0], 0]), pl = P([0, pt[1]]);
    svg += line(pp[0], pp[1], p0[0], p0[1], "#aaa", 0.8, "4 4");
    svg += line(pp[0], pp[1], pl[0], pl[1], "#aaa", 0.8, "4 4");
    svg += `<circle cx="${f1(pp[0])}" cy="${f1(pp[1])}" r="3" fill="${GRIS}"/>\n`;
    svg += text(W / 2, 62, `pointe : ${f1(pt[0])} depuis la gauche, ${f1(pt[1])} depuis l'avant`, "middle", GRIS, 11);
    svg += text(p0[0] + 4, p0[1] - 8, `${f1(pt[0])}`, "start", "#999", 10);
    svg += text(pl[0] + 4, pl[1] - 6, `${f1(pt[1])}`, "start", "#999", 10);
  }
  if (zu && !v) {
    // largeur de chaque bande, dans la bande ; cote interieure de la zone utile, en vert
    const m = zu.polygone.length;
    q.forEach((a, i) => {
      const b = q[(i + 1) % n], w = zu.bandes_cm[i];
      if (!(w > 0)) return;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const t = i === 0 ? 0.5 : d.cotes_noms[i] === "arriere_gauche" ? 0.7 : 0.35, off = w >= 20 ? w / 2 : w + 9 / scale;
      const s = P([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
      svg += text(s[0], s[1] + 4, `libre ${fz(w)}`, "middle", "#b86e1f", 11, "bold");
    });
    zu.polygone.forEach((a: Pt, i: number) => {
      const b: Pt = zu.polygone[(i + 1) % m];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const s = P([a[0] + (b[0] - a[0]) * 0.65 + nx * 12 / scale, a[1] + (b[1] - a[1]) * 0.65 + ny * 12 / scale]);
      svg += text(s[0], s[1] + 4, `${f1(zu.cotes_cm[i])}`, "middle", "#2a8a4a", 10);
    });
    const cx = zu.polygone.reduce((s: number, v: Pt) => s + v[0], 0) / m, cy = zu.polygone.reduce((s: number, v: Pt) => s + v[1], 0) / m;
    const cz = P([cx, cy]);
    svg += text(cz[0], cz[1], "zone utile", "middle", "#2a8a4a", 13, "bold");
    svg += text(cz[0], cz[1] + 22, `${zu.aire_m2} m²`, "middle", "#2a8a4a", 20, "bold");
    svg += text(cz[0], cz[1] + 38, `bandes libres ${zu.bandes_m2} m²`, "middle", "#b86e1f", 11);
  }
  const somme = d.angles_deg.reduce((s: number, x: number) => s + x, 0);
  if (m && v) {
    svg += text(W / 2, 26, `Implantation sur la dalle · abri ${v.aire_m2} m² sur ${d.aire_m2} m² de dalle`, "middle", "#222", 15, "bold");
    svg += text(W / 2, 46, `murs pleins, intérieur en pointillé fin, toit (débords) en pointillé brun, gouttière et descente en bleu`, "middle", "#2b5d8a", 12);
    svg += text(W / 2, 64, `orange = distance aux bords de la dalle · vert/orange = passage derrière, jusqu'aux murs de propriété (cm)`, "middle", "#666", 11);
  } else if (v) {
    svg += text(W / 2, 26, `Option ${v.id} · ${v.titre}`, "middle", "#222", 15, "bold");
    svg += text(W / 2, 46, `murs ${v.aire_m2} m² · intérieur ${v.aire_interieure_m2} m² · ${v.polygone.length} côtés`, "middle", "#2b5d8a", 13, "bold");
    svg += text(W / 2, 64, v.note, "middle", "#666", 11);
  } else svg += text(W / 2, 26, zu ? `Dalle réelle ${d.aire_m2} m² · zone utile ${zu.aire_m2} m²` : `Dalle réelle · ${n} côtés · ${d.aire_m2} m²`, "middle", "#222", 15, "bold");
  if (!v) svg += text(W / 2, 44, `vue de dessus · cotes relevées au mètre · somme des angles ${f0(somme)}°`, "middle", "#888", 11);
  if (!v) svg += text(W / 2, H - 30, "* angles avant supposés droits", "middle", "#888", 10);
  svg += text(W / 2, H - 12, m ? "AVANT (jardin) · brun = mur de propriété" : v ? "AVANT (jardin) · brun = mur de propriété · vert pointillé = zone utile · trait coloré = passage (cm)" : "AVANT (jardin) · trait brun = mur de propriété", "middle", "#666", 11);
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
  if (t.rehausse.materiau === "bois") return plan_rehausse_bois_svg(p, g, t);
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

function plan_rehausse_bois_svg(p: Params, g: any, t: any): string {
  const pad = 50, scale = 1.0;
  const { A, G } = g.cotes;
  const drop = g.pente.chute_cm;
  const r = t.rehausse;
  const stock = r.longueur_stock_cm;
  const title = `Rehausse bois · ${r.nb_madriers} madrier ${r.section_mm[0]}×${r.section_mm[1]} de ${f2(stock / 100)} m → R1 + R2 + R3`;
  const lab1 = `R2+R3 : ${f0(G)} cm coupé en diagonale = 2 coins (R3 tourné de 180°)`;
  const lab2 = `R1 : bandeau avant ${f0(A)} cm, coupe droite`;
  const base_W = Math.max(stock, A + G + 4) * scale + 2 * pad;
  const H = drop * scale + 2 * pad + 60;
  const W = Math.max(base_W, tw(title, 15) + 24, tw(lab1, 11) + 2 * pad);
  const xoff = (W - base_W) / 2;
  const P = (x: number, y: number) => [pad + xoff + x * scale, pad + 20 + y * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  const wood = "#d9b98a", woodLine = "#8a5a2b";
  svg += poly([P(0, 0), P(stock, 0), P(stock, drop), P(0, drop)], "#f3f5f1", "#999", 1.5, "5 4");
  svg += poly([P(0, 0), P(G, 0), P(G, drop), P(0, drop)], wood, woodLine, 2);
  const d0 = P(0, drop), d1 = P(G, 0);
  svg += line(d0[0], d0[1], d1[0], d1[1], woodLine, 2, "6 3");
  svg += text(P(G * 0.12, 0)[0], P(0, drop)[1] - 4, "R2 (G)", "middle", woodLine, 11, "bold");
  svg += text(P(G * 0.88, 0)[0], P(0, 0)[1] + 12, "R3 (D)", "middle", woodLine, 11, "bold");
  const x2 = G + 4;
  svg += poly([P(x2, 0), P(x2 + A, 0), P(x2 + A, drop), P(x2, drop)], wood, woodLine, 2);
  svg += text(P(x2 + A / 2, 0)[0], P(0, drop / 2)[1] + 4, "R1 (A)", "middle", woodLine, 11, "bold");
  const ly = P(0, drop)[1] + 22;
  svg += text(P(0, 0)[0], ly, lab1, "start", woodLine, 11);
  svg += text(P(0, 0)[0], ly + 16, lab2, "start", woodLine, 11);
  svg += text(P(0, 0)[0], ly + 32, `chute de madrier : ${f0(Math.max(0, stock - A - G))} cm · section ${r.section_mm[0]} × ${r.section_mm[1]} mm = rehausse de ${fz(drop)} cm`, "start", "#888", 11);
  svg += text(P(G / 2, 0)[0], P(0, 0)[1] - 8, `${f0(G)} cm`, "middle", "#666", 11);
  svg += text(P(x2 + A / 2, 0)[0], P(0, 0)[1] - 8, `${f0(A)} cm`, "middle", "#666", 11);
  svg += text(P(0, 0)[0] - 6, P(0, drop / 2)[1] + 4, `${fz(drop)}`, "end", woodLine, 11);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, H - 12, "posé sur le chant des panneaux, vissé, sert de lisse haute · larmier par-dessus à l'extérieur", "middle", "#888", 11);
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
  const boisF = p.rehausse && p.rehausse.materiau === "bois";
  const rf = boisF ? "#d9b98a" : "#fdf6e3", rs = boisF ? "#8a5a2b" : "#a07400";
  if (face.rehausse !== "aucune") {
    svg += poly([P(0, Hm), P(L, Hm), P(L, h2), P(0, h1)], rf, rs, 2);
    if (face.rehausse === "bandeau") {
      const mid = P(L / 2, (h1 + Hm) / 2);
      svg += text(mid[0], mid[1] + 4, `R1 · ${boisF ? "madrier" : "bandeau"} ${f0(L)} × ${fz(h1 - Hm)}`, "middle", rs, 10, "bold");
    } else {
      const mid = P(L / 2, (h1 + h2) / 2);
      svg += text(mid[0], mid[1] - 8, `${face.cle === "G" ? "R2" : "R3"} · ${boisF ? "coin bois" : "triangle"} ${f0(L)} × ${fz(Math.abs(h1 - h2))}`, "middle", rs, 10, "bold");
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
      svg += text(sx + ow / 2, by - oh / 2 - 6, o.largeur_cm >= cover - 0.5 ? "bloc-porte" : "porte", "middle", "#178", 11);
      svg += text(sx + ow / 2, by - oh / 2 + 8, `${itr(o.largeur_cm)}×${itr(o.hauteur_cm)}`, "middle", "#178", 10);
    } else {
      svg += text(sx + ow / 2, by - oh / 2 - 2, o.ouvrant ? "fenêtre ouvrante" : "fenêtre fixe", "middle", "#178", 10);
      svg += text(sx + ow / 2, by - oh / 2 + 10, `${itr(o.largeur_cm)}×${itr(o.hauteur_cm)}`, "middle", "#178", 9);
      svg += text(sx + ow / 2, by + 12, `allège ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  // etiquettes des panneaux (apres les ouvertures : au-dessus si le panneau en porte une)
  const mine = openings.filter((o) => o.face === face.cle);
  for (let i = 0, n = Math.ceil(L / cover); i < n; i++) {
    const x0 = i * cover, x1 = Math.min((i + 1) * cover, L);
    const rep = panel_replaced_by(mine, face.cle, x0, x1, Hm);
    if (rep) {
      const c = P((x0 + x1) / 2, Hm * 0.9);
      svg += text(c[0], c[1] + 4, `${face.cle}${i + 1} = bloc-porte`, "middle", "#178", 10, "bold");
      continue;
    }
    const over = mine.filter((o) => o.start_cm < x1 && o.start_cm + o.largeur_cm > x0);
    const topOpen = over.length ? Math.max(...over.map((o) => o.allege_cm + o.hauteur_cm)) : 0;
    const hy = over.length ? Math.min(Hm - 6, topOpen + (Hm - topOpen) / 2) : Hm * 0.86;
    const c = P((x0 + x1) / 2, hy);
    svg += text(c[0], c[1] + 6, `${face.cle}${i + 1}`, "middle", "#9fb0c2", over.length && Hm - topOpen < 30 ? 11 : 18, "bold");
  }
  const nPan = Array.from({ length: Math.ceil(L / cover) }, (_, i) => panel_replaced_by(mine, face.cle, i * cover, Math.min((i + 1) * cover, L), Hm) ? 0 : 1).reduce((a: number, b: number) => a + b, 0);
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm · ${nPan} panneau${nPan > 1 ? "x" : ""} de ${f0(Hm)}`, "middle", "#222", 13, "bold");
  svg += text(pad - 8, P(0, h1)[1], `${fz(h1)}`, "end", "#2b5d8a", 12);
  svg += text(pad + L * scale + 8, P(L, h2)[1], `${fz(h2)}`, "start", "#2b5d8a", 12);
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
  if (g.dalle) svg["plan-dalle"] = plan_dalle_svg(g);
  if (g.dalle && g.dalle.zone_utile) svg["plan-dalle-bandes"] = plan_dalle_svg(g, true);
  const vars = variantes(p, g);
  for (const v of vars) svg[`variante-${v.id}`] = plan_dalle_svg(g, true, v);
  // modele 2D de la forme retenue (option 13 amenagee)
  const v13 = vars.find((v: any) => v.id === 13 && v.bureaux);
  const modele: any = v13 ? modele_trapeze(p, v13) : null;
  if (modele) modele.budget = budget_modele(p, v13, modele);
  if (modele) {
    svg["modele-implantation"] = plan_dalle_svg(g, false, v13, modele);
    svg["modele-sol"] = modele_sol_svg(p, v13, modele);
    svg["modele-toit"] = modele_toit_svg(v13, modele);
    svg["modele-rehausse"] = modele_rehausse_svg(modele);
    for (const f of modele.faces) svg[`modele-facade-${f.cle}`] = modele_facade_svg(modele, f);
  }
  for (const f of g.faces) svg[`facade-${f.cle}`] = facade_svg(p, g, f, openings);
  return { geometrie: g, debit: t, achats: sh, budget: bud, ouvertures: openings, model3d: m, variantes: vars, modele, svg };
}

/* ----------------------------------------------------------------- */
/* Resume des variantes (markdown, genere par le CLI)                 */
/* ----------------------------------------------------------------- */
const AVIS: Record<number, [string[], string[]]> = {
  1: [["panneaux entiers sur les 4 faces : aucune recoupe", "le plus simple et le moins cher à monter", "sous le seuil même si la mairie compte les débords"], ["le plus petit bureau de la liste", "laisse inutilisée toute la bande de dalle à droite"]],
  2: [["un peu plus grand que l'option 1, toujours à angles droits"], ["gain minime pour des panneaux à recouper sur les 4 faces"]],
  3: [["façade la plus large : porte et fenêtre côte à côte", "passage arrière confortable"], ["peu profond : le plus petit intérieur", "panneaux à recouper en largeur"]],
  4: [["sous le seuil de surface", "pleine largeur et un seul pan coupé, court"], ["5 murs et 2 angles obtus : profils d'angle sur mesure", "le pan coupé rogne un coin pour un petit gain"]],
  5: [["le plus grand intérieur sans angle aigu : que des angles obtus, faciles à meubler", "le pan coupé suit le mur du fond : passage régulier"], ["au-dessus du seuil : déclaration préalable probable", "5 murs, 2 profils d'angle sur mesure, toit recoupé en biais, gouttière avec un angle"]],
  6: [["la surface maximale de la zone"], ["la pointe du fond est un coin perdu", "3 angles non droits, toit et gouttière les plus compliqués", "au-dessus du seuil"]],
  7: [["prouve qu'aucune rotation ne fait mieux qu'un rectangle droit"], ["identique à l'option 2 avec la zone actuelle"]],
  8: [["la plus grande surface possible avec 4 murs"], ["mur gauche en biais : un coin perdu en long contre le mur de propriété", "deux angles aigus, difficiles à meubler"]],
  9: [["4 murs, un seul en biais, deux angles droits côté porte", "toit simple : un seul bord en biais"], ["au-dessus du seuil", "angle aigu au fond à gauche"]],
  10: [["sous le seuil, même forme que l'option 9", "passage arrière un peu élargi"], ["façade plus étroite"]],
  13: [["pleine largeur et la plus grande surface des trapèzes, avec le passage voulu derrière", "porte sur le côté droit : bureau en L sur tout le mur gauche et toute la façade", "façade libre pour des fenêtres, lumière sur le bureau"], ["au-dessus du seuil : déclaration préalable probable", "angle aigu au fond à gauche, occupé par le bout du bureau", "mur gauche très haut contre la propriété : panneau long, inaccessible après montage"]],
  12: [["mur gauche et mur du fond en panneaux entiers : aucune recoupe sur les deux murs contre la propriété, inaccessibles après montage", "sous le seuil, même intérieur que le 200 × 240 d'origine", "façade pleine largeur : porte et fenêtre côté jardin", "que des angles droits ou obtus, pan coupé court", "le pan coupé tombe sous la bande de toit déjà recoupée : une seule coupe de toit en biais"], ["5 murs et 2 angles obtus : profils d'angle pliés sur mesure", "3 bandes de panneau à recouper (façade, mur droit, pan coupé), tirées de 2 panneaux", "gouttière arrière arrêtée avant le pan coupé"]],
  11: [["sous le seuil sans perdre de largeur de façade", "le passage arrière le plus large des trapèzes"], ["mur droit court : peu de place pour une porte ou une fenêtre à droite", "angle aigu au fond à gauche, plus fermé que l'option 9"]],
};

export function variantes_md(p: Params, core: any): string {
  const vs = core.variantes, g = core.geometrie, d = g.dalle;
  const ep = +p.panneau.epaisseur_mm / 10, pl = p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? +p.amenagement.plancher.epaisseur_cm : 0;
  const seuil = +(p.reglementaire && p.reglementaire.seuil_sans_formalite_m2) || 5;
  const hAv = g.hauteur_avant_cm - pl, hFd = g.hauteur_arriere_cm - pl;
  const b = d.zone_utile.bandes_cm, noms = d.cotes_noms;
  const fr = (x: number) => String(x).replace(".", ",");
  const NOM: Record<string, string> = { avant: "avant", droite: "droite", arriere_droite: "grand pan du fond", arriere_gauche: "petit pan du fond", gauche: "gauche" };
  const pas = (v: any, c: string) => { const q = v.passages.find((x: any) => x.cote === c); return q ? `${fr(q.cm)} cm` : "–"; };
  let md = `# Formes d'abri possibles sur la dalle\n\n`;
  if (core.modele) md += `> **Abri retenu : option 13.** Ses plans complets (sol, toit, rehausse, 4 façades) sont dans [abri.md](abri.md).\n\n`;
  md += `> Généré par \`npm run emit\` depuis \`params.json\` et \`site/src/compute.ts\` : ne pas éditer à la main.\n\n`;
  md += `## Hypothèses\n\n`;
  md += `- **Dalle réelle** : ${fr(d.aire_m2)} m², côtés ${noms.map((n: string, i: number) => `${NOM[n] || n} ${fz(d.cotes_cm[i])}`).join(", ")} cm.\n`;
  md += `- **Bandes libres** laissées le long de chaque côté : ${noms.map((n: string, i: number) => `${NOM[n] || n} ${fz(b[i])}`).join(", ")} cm. Reste la **zone utile** : ${fr(d.zone_utile.aire_m2)} m².\n`;
  md += `- **Porte** de ${fz(+p.porte.largeur_cm)} cm sur le côté avant (jardin), ouvrant vers l'extérieur : elle ne prend aucune place dedans.\n`;
  md += `- **Intérieur** = murs en panneaux sandwich de ${fz(ep)} cm retirés sur tout le tour. Les couvre-joints d'angle intérieurs (quelques mm) sont négligés.\n`;
  md += `- **Hauteur sous plafond** (toutes les options) : ${fr(rnd(hAv / 100, 2))} m à l'avant, ${fr(rnd(hFd / 100, 2))} m au fond = murs ${fz(g.hauteur_arriere_cm)} + rehausse ${fr(g.pente.chute_cm)} à l'avant, moins le plancher isolé de ${fz(pl)} cm.\n`;
  md += `- **Seuil** : jusqu'à ${fz(seuil)} m² de murs, aucune formalité (à confirmer en mairie, et le PLU s'applique quand même).\n`;
  md += `- **Passage** : écart réel entre l'abri et chaque mur de propriété du fond (vert ≥ 50, orange 35 à 50, rouge < 35).\n\n`;
  md += `![dalle et zone utile](site/assets/plan-dalle-bandes.svg)\n\n`;
  md += `## En bref\n\n`;
  md += `- **Le plus simple** : option 1, panneaux entiers, angles droits.\n`;
  if (vs.some((v: any) => v.id === 12)) md += `- **Le meilleur compromis sous le seuil** : option 12, l'option 1 élargie à toute la façade avec un seul coin coupé.\n`;
  md += `- **Sous le seuil avec 4 murs** : option 11, pleine largeur et le passage le plus large des trapèzes.\n`;
  if (vs.some((v: any) => v.id === 13 && v.bureaux)) md += `- **Bureau en L, passage visé derrière** : option 13, porte à droite, bureau sur tout le mur gauche et toute la façade.\n`;
  md += `- **Le plus grand intérieur facile à meubler** : option 5, que des angles obtus, mais au-dessus du seuil.\n\n`;
  md += `## Comparatif\n\n`;
  md += `| # | forme | murs (ext.) | **intérieur** | côtés | passage grand pan | passage petit pan | ≤ ${fz(seuil)} m² |\n|---|---|---|---|---|---|---|---|\n`;
  for (const v of vs) md += `| [${v.id}](#option-${v.id}) | ${v.titre} | ${fr(v.aire_m2)} m² | **${fr(v.aire_interieure_m2)} m²** | ${v.polygone.length} | ${pas(v, "arriere_droite")} | ${pas(v, "arriere_gauche")} | ${v.aire_m2 <= seuil ? "oui" : "non"} |\n`;
  md += `\n`;
  for (const v of vs) {
    const [pour, contre] = AVIS[v.id] || [[], []];
    md += `## Option ${v.id}\n\n**${v.titre}** · ${v.note}${v.id === 13 && core.modele ? " · **retenue : plans complets dans [abri.md](abri.md)**" : ""}\n\n`;
    md += `![option ${v.id}](site/assets/variante-${v.id}.svg)\n\n`;
    md += `| | murs (extérieur) | intérieur |\n|---|---|---|\n`;
    md += `| surface | ${fr(v.aire_m2)} m² | **${fr(v.aire_interieure_m2)} m²** |\n`;
    v.noms_cotes.forEach((n: string, i: number) => { md += `| côté ${n} | ${fr(v.cotes_cm[i])} cm | ${fr(v.cotes_interieures_cm[i])} cm |\n`; });
    md += `| angles | ${v.angles_deg.map((a: number) => fr(a) + "°").join(" · ")} | |\n`;
    md += `| passage arrière | grand pan ${pas(v, "arriere_droite")} · petit pan ${pas(v, "arriere_gauche")} | |\n`;
    if (v.porte) md += `| porte | ${fz(v.porte.largeur_cm)} cm sur le côté ${v.porte.nom}, de ${fr(v.porte.debut_cm)} à ${fr(rnd(v.porte.debut_cm + v.porte.largeur_cm, 1))} cm | |\n`;
    for (const f of v.fenetres || []) md += `| fenêtre ${f.ouvrant ? "ouvrante" : "fixe"} | ${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} cm sur le côté ${f.nom}, de ${fr(f.debut_cm)} à ${fr(rnd(f.debut_cm + f.largeur_cm, 1))} cm, allège ${fz(f.allege_cm)} cm${f.tient ? "" : " · **NE TIENT PAS**"} | |\n`;
    for (const b of v.bureaux || []) md += `| bureau ${b.cote} | | ${fz(b.profondeur_cm)} cm de profondeur sur ${fr(b.longueur_cm)} cm |\n`;
    if (v.bureaux) md += `| sol libre | | **${fr(v.sol_libre_m2)} m²** (bureaux ${fr(v.bureaux_m2)} m²) |\n`;
    for (const st of v.sieges || []) md += `| ${st.type} | | ${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)} cm devant le bureau ${st.contre}${st.tient ? "" : " · **NE TIENT PAS**"} |\n`;
    md += `\n`;
    for (const x of pour) md += `- ✅ ${x}\n`;
    for (const x of contre) md += `- ⚠️ ${x}\n`;
    md += `\n`;
  }
  return md;
}

/* ----------------------------------------------------------------- */
/* Modele 2D d'une forme a 4 cotes (option 13) : faces, rehausse,     */
/* toit, plans. Toit plan, pente de l'avant vers le point le plus au   */
/* fond ; murs = panneaux rectangulaires de murs.hauteur_cm            */
/* ----------------------------------------------------------------- */
const LETTRE: Record<string, string> = { avant: "A", droite: "D", fond: "B", gauche: "G" };
const lettre = (nom: string) => LETTRE[nom.split(" ")[0]] || "?";

// pieces de rehausse (profil lineaire h0 -> h1 sur L) rangees dans des madriers : deux pieces
// partagent un troncon si, l'une posee sur le chant bas et l'autre retournee sur le chant haut,
// leurs hauteurs cumulees tiennent dans la section (coupe en biais commune) ; puis first-fit
export function ranger_rehausse(pieces: any[], section: number, stock: number) {
  const hauteur = (q: any, s: number, inverse: boolean) => { const t = inverse ? 1 - s / q.L : s / q.L; return q.h0 + (q.h1 - q.h0) * t; };
  const tient = (a: any, b: any, inverse: boolean) => { const m = Math.min(a.L, b.L); return [0, m].every((s) => hauteur(a, s, false) + hauteur(b, s, inverse) <= section + 1e-6); };
  const troncons: any[] = [];
  for (const q of [...pieces].sort((x, y) => y.L - x.L)) {
    const t = troncons.find((x) => x.pieces.length === 1 && (tient(x.pieces[0], q, false) || tient(x.pieces[0], q, true)));
    if (t) { t.inverse = !tient(t.pieces[0], q, false); t.pieces.push(q); t.L = Math.max(t.L, q.L); }
    else troncons.push({ pieces: [q], L: q.L, inverse: false });
  }
  const barres: any[] = [];
  for (const t of troncons) {
    const b = barres.find((x) => x.L + t.L <= stock + 1e-6);
    if (b) { t.x = b.L; b.troncons.push(t); b.L += t.L; } else { t.x = 0; barres.push({ troncons: [t], L: t.L }); }
  }
  return barres.map((b) => ({ ...b, L: rnd(b.L, 1), chute_cm: rnd(stock - b.L, 1) }));
}

export function modele_trapeze(p: Params, v: any) {
  const d = p.disposition_trapeze, t = (d && d.toit) || {};
  const q: Pt[] = v.polygone, n = q.length;
  const H = +p.murs.hauteur_cm, c = +(t.chute_cm ?? p.toit.pente_chute_cm), mod = +p.panneau.largeur_utile_cm;
  const y0 = Math.min(...q.map((z) => z[1])), D = Math.max(...q.map((z) => z[1])) - y0;
  const x0 = Math.min(...q.map((z) => z[0])), Wd = Math.max(...q.map((z) => z[0])) - x0;
  // sens = arriere : haut devant, bas au fond ; sens = droite : haut contre le mur gauche, bas cote jardin
  const droite = t.sens === "droite", course = droite ? Wd : D;
  const h = (z: Pt) => H + c * (1 - (droite ? (z[0] - x0) / Wd : (z[1] - y0) / D));
  const porte_h = v.porte && v.porte.hauteur_cm ? +v.porte.hauteur_cm : +(d.porte_hauteur_cm || p.porte.hauteur_cm);
  const faces = q.map((a, i) => {
    const b = q[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), F = lettre(v.noms_cotes[i]);
    const panneaux: any[] = [];
    for (let s = 0, k = 1; s < L - 0.05; s += mod, k++) panneaux.push({ id: `${F}${k}`, debut_cm: rnd(s, 1), largeur_cm: rnd(Math.min(mod, L - s), 1) });
    const ouvertures: any[] = [];
    if (v.porte && v.porte.cote === i) ouvertures.push({ type: "porte", debut_cm: v.porte.debut_cm, largeur_cm: v.porte.largeur_cm, allege_cm: 0, hauteur_cm: porte_h, chambranle_cm: v.porte.chambranle_cm || 0 });
    for (const f of v.fenetres || []) if (f.cote === i) ouvertures.push({ type: "fenetre", debut_cm: f.debut_cm, largeur_cm: f.largeur_cm, allege_cm: f.allege_cm, hauteur_cm: f.hauteur_cm, ouvrant: f.ouvrant });
    return { cle: F, nom: v.noms_cotes[i], de: a, a: b, longueur_cm: rnd(L, 1), hauteur_debut_cm: rnd(h(a), 1), hauteur_fin_cm: rnd(h(b), 1), hauteur_mur_cm: H, panneaux, ouvertures };
  });
  const sec = d.rehausse_section_mm || p.rehausse.section_mm, section = +sec[1] / 10, stock = +p.rehausse.longueur_stock_cm;
  const pieces = faces.filter((f) => Math.max(f.hauteur_debut_cm, f.hauteur_fin_cm) > H + 0.05)
    .map((f, k) => ({ id: `R${k + 1}`, face: f.cle, L: f.longueur_cm, h0: rnd(f.hauteur_debut_cm - H, 1), h1: rnd(f.hauteur_fin_cm - H, 1) }));
  const barres = ranger_rehausse(pieces, section, stock);
  // toit : contour = murs + debords (avant, fond ; cotes affleurants), panneaux dans le sens de la pente
  const deb = t.debord_cm || { avant: 10, arriere: 10, cotes: 0 };
  const cotes = +deb.cotes || 0;
  const decal = faces.map((f) => -(f.cle === "A" ? +deb.avant : f.cle === "B" ? +deb.arriere : f.cle === "D" ? +(deb.droite ?? cotes) : +(deb.gauche ?? cotes)));
  const contour = inset_ordre(q, decal);
  const rampant = Math.sqrt(1 + (c / course) ** 2);
  const xmin = Math.min(...contour.map((z) => z[0])), xmax = Math.max(...contour.map((z) => z[0]));
  const ymin = Math.min(...contour.map((z) => z[1])), ymax = Math.max(...contour.map((z) => z[1]));
  const panneaux_toit: any[] = [];
  // bandes d'un module, dans le sens de la pente : le long de y (sens arriere) ou de x (sens droite)
  for (let s = droite ? ymin : xmin, k = 1, fin = droite ? ymax : xmax; s < fin - 0.05; s += mod, k++) {
    const s1 = Math.min(s + mod, fin);
    let pc = droite ? clip_half(contour, [-1e4, s], [1e4, s], true) : clip_half(contour, [s, 1e4], [s, -1e4], true);
    pc = droite ? clip_half(pc, [1e4, s1], [-1e4, s1], true) : clip_half(pc, [s1, -1e4], [s1, 1e4], true);
    const le_long = pc.map((z) => z[droite ? 0 : 1]);
    const biais = pc.some((a, i) => { const b = pc[(i + 1) % pc.length]; return Math.abs(b[0] - a[0]) > 0.5 && Math.abs(b[1] - a[1]) > 0.5; });
    panneaux_toit.push({ id: `T${k}`, largeur_cm: rnd(s1 - s, 1), longueur_cm: rnd((Math.max(...le_long) - Math.min(...le_long)) * rampant, 1), biais, polygone: pc.map(([a, b]) => [rnd(a, 1), rnd(b, 1)]) });
  }
  // debit murs : bandes etroites tirees des chutes des panneaux deja recoupes (first-fit), sinon d'un panneau neuf
  const bandes = faces.flatMap((f) => f.panneaux.map((pn: any) => ({ face: f.cle, ...pn }))).sort((x, y) => y.largeur_cm - x.largeur_cm);
  const chutes: number[] = [];
  let panneaux_mur = 0;
  for (const b of bandes) {
    const k = b.largeur_cm < mod - 0.05 ? chutes.findIndex((c) => c >= b.largeur_cm - 1e-6) : -1;
    if (k >= 0) { b.source = "chute"; chutes[k] -= b.largeur_cm; }
    else { panneaux_mur++; b.source = "neuf"; if (mod - b.largeur_cm > 5) chutes.push(mod - b.largeur_cm); }
  }
  for (const f of faces) for (const pn of f.panneaux) {
    const b = bandes.find((x) => x.id === pn.id);
    pn.source = b ? b.source : "neuf";
    pn.decoupes = f.ouvertures.filter((o: any) => o.debut_cm - (o.chambranle_cm || 0) < pn.debut_cm + pn.largeur_cm && o.debut_cm + o.largeur_cm + (o.chambranle_cm || 0) > pn.debut_cm)
      .map((o: any) => `${o.type === "porte" ? "porte" : "fenêtre"} ${fz(o.largeur_cm + 2 * (o.chambranle_cm || 0))} × ${fz(o.hauteur_cm + (o.chambranle_cm || 0))}`);
  }
  // gouttiere sur la face basse ; descente au point bas (sens arriere) ou devant, cote jardin (sens droite)
  const fB = faces.findIndex((f) => f.cle === (droite ? "D" : "B"));
  const g0 = contour[fB], g1 = contour[(fB + 1) % n];
  const bas = droite ? (g0[1] < g1[1] ? g0 : g1) : (g0[1] > g1[1] ? g0 : g1);
  return {
    hauteur_mur_cm: H, chute_cm: c, profondeur_cm: rnd(D, 1), sens: droite ? "droite" : "arriere",
    // portee = plus longue bande de toit entre deux murs porteurs
    portee_cm: rnd(droite ? Wd : D, 1),
    pente: { pourcent: rnd(100 * c / course, 1), degres: rnd(Math.atan2(c, course) * 180 / Math.PI, 2) },
    hauteurs_coins_cm: q.map((z) => rnd(h(z), 1)),
    faces,
    rehausse: { section_mm: sec, longueur_stock_cm: stock, pieces, barres, nb_madriers: barres.length },
    toit: {
      contour: contour.map(([a, b]) => [rnd(a, 1), rnd(b, 1)]), aire_m2: rnd(poly_area(contour) / 1e4, 2),
      panneaux: panneaux_toit, debord_cm: { avant: +deb.avant, arriere: +deb.arriere, droite: +(deb.droite ?? cotes), gauche: +(deb.gauche ?? cotes) }, gouttiere: { face: droite ? "D" : "B", de: g0.map((z) => rnd(z, 1)), a: g1.map((z) => rnd(z, 1)), longueur_cm: rnd(Math.hypot(g1[0] - g0[0], g1[1] - g0[1]), 1), descente: bas.map((z) => rnd(z, 1)) },
    },
    interieur: inset_ordre(q, +p.panneau.epaisseur_mm / 10).map(([a, b]) => [rnd(a, 1), rnd(b, 1)]),
    panneaux_mur_a_commander: panneaux_mur,
    angles_deg: v.angles_deg,
  };
}

// budget indicatif de l'abri retenu, memes prix que le rectangle (prix_indicatifs_eur)
export function budget_modele(p: Params, v: any, m: any) {
  const pr = p.prix_indicatifs_eur || {}, get = (k: string) => (pr[k] == null ? 0 : +pr[k]);
  const d = p.disposition_trapeze || {}, mod = +p.panneau.largeur_utile_cm / 100, H = m.hauteur_mur_cm / 100;
  const mur_m2 = rnd(m.panneaux_mur_a_commander * mod * H, 2);
  const toit_m2 = rnd(m.toit.panneaux.reduce((s: number, t: any) => s + mod * t.longueur_cm / 100, 0), 2);
  const perim = m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100;
  const angles_h = m.hauteurs_coins_cm.reduce((s: number, h: number) => s + h, 0) / 100;
  const cles_rives = m.sens === "droite" ? ["A", "B"] : ["D", "G"];
  const rives = m.faces.filter((f: any) => cles_rives.includes(f.cle)).reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100;
  const profils = rnd(2 * angles_h + perim + rives, 1);
  const fen = v.fenetres || [];
  const coque: [string, number, string, number][] = [
    ["Panneaux sandwich mur 60 mm (à commander)", mur_m2, "m²", get("panneau_mur_m2")],
    ["Surcoût fixation cachée (mur)", mur_m2, "m²", get("fixation_cachee_m2")],
    ["Panneaux sandwich toit 60 mm (à longueur)", toit_m2, "m²", get("panneau_toit_m2")],
    [`Rehausse bois (madriers ${m.rehausse.section_mm.join(" × ")})`, rnd(m.rehausse.nb_madriers * m.rehausse.longueur_stock_cm / 100, 1), "ml", +(d.rehausse_prix_ml_eur ?? (p.rehausse && p.rehausse.prix_ml_eur) ?? 10)],
    ["Porte vitrée + cadre", v.porte ? 1 : 0, "u", get("porte_vitree")],
    ["Fenêtre fixe", fen.filter((f: any) => !f.ouvrant).length, "u", get("fenetre_fixe")],
    ["Fenêtre ouvrante", fen.filter((f: any) => f.ouvrant).length, "u", get("fenetre_ouvrante")],
    ["Profils (angles int. + ext., rail de pied, rives)", profils, "ml", get("profils_ml")],
    ["Visserie + étanchéité", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttière + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation", 1, "forfait", get("ventilation_forfait")],
    ["Livraison des panneaux", 1, "forfait", get("livraison_forfait")],
  ];
  const am = p.amenagement || {}, amen: [string, number, string, number][] = [];
  if (am.plancher && am.plancher.actif) amen.push(["Plancher isolé", v.aire_interieure_m2, "m²", +am.plancher.prix_m2_eur || 0]);
  for (const [k, label] of [["electricite", "Électricité (multiprise, éclairage)"], ["chauffage", "Chauffage"], ["store", "Store"], ["finition_interieure", "Finition intérieure"]] as [string, string][])
    if (am[k] && am[k].actif) amen.push([label, 1, "forfait", +am[k].forfait_eur || 0]);
  const lignes = [...coque.map((x) => [...x, "coque"]), ...amen.map((x) => [...x, "amenagement"])].map(([poste, qte, unite, pu, groupe]: any) => ({ poste, qte, unite, pu_eur: pu, montant_eur: rnd(qte * pu), groupe }));
  const c = lignes.filter((l) => l.groupe === "coque").reduce((s, l) => s + l.montant_eur, 0), a = lignes.filter((l) => l.groupe !== "coque").reduce((s, l) => s + l.montant_eur, 0);
  const inc = pr.incertitude_pct == null ? 15 : +pr.incertitude_pct;
  return { lignes, coque_eur: rnd(c), amenagement_eur: rnd(a), total_eur: rnd(c + a), incertitude_pct: inc, total_bas_eur: rnd((c + a) * (1 - inc / 100)), total_haut_eur: rnd((c + a) * (1 + inc / 100)) };
}

// cote : ligne parallele a [a, b] (points ecran) decalee de `off` vers l'exterieur, texte dans l'axe
function cote_svg(pa: number[], pb: number[], label: string, off: number, col = "#2b5d8a", size = 12, recul = 8): string {
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1, ux = (pb[0] - pa[0]) / L, uy = (pb[1] - pa[1]) / L, nx = -uy, ny = ux;
  const a2 = [pa[0] + nx * off, pa[1] + ny * off], b2 = [pb[0] + nx * off, pb[1] + ny * off];
  let s = line(pa[0] + nx * 4, pa[1] + ny * 4, a2[0] + nx * 4, a2[1] + ny * 4, "#aaa", 0.7) + line(pb[0] + nx * 4, pb[1] + ny * 4, b2[0] + nx * 4, b2[1] + ny * 4, "#aaa", 0.7);
  s += line(a2[0], a2[1], b2[0], b2[1], col, 1);
  for (const e of [a2, b2]) s += line(e[0] - (ux - nx) * 3, e[1] - (uy - ny) * 3, e[0] + (ux - nx) * 3, e[1] + (uy - ny) * 3, col, 1);
  let rot = Math.atan2(uy, ux) * 180 / Math.PI;
  if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
  const m = [(a2[0] + b2[0]) / 2 + nx * recul, (a2[1] + b2[1]) / 2 + ny * recul];
  return s + `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="${size}" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${label}</text>\n`;
}

// repere plan commun (y vers l'arriere = vers le haut de l'image)
function cadre_plan(pts: Pt[], scale: number, pad: number, top: number) {
  const xs = pts.map((z) => z[0]), ys = pts.map((z) => z[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const W = (maxx - minx) * scale + 2 * pad, H = (maxy - miny) * scale + 2 * pad + top;
  return { W, H, P: (z: Pt) => [pad + (z[0] - minx) * scale, top + pad + (maxy - z[1]) * scale] };
}

export function modele_sol_svg(p: Params, v: any, m: any): string {
  const q: Pt[] = v.polygone, n = q.length, scale = 1.6;
  const { W, H, P } = cadre_plan(q, scale, 120, 50);
  let svg = svgHeader(rnd(W), rnd(H));
  svg += poly(q.map(P), "#8fa3b8", "#2b5d8a", 1.5);
  svg += poly(m.interieur.map(P), "#fbfbf8", "#2b5d8a", 1.2);
  for (const b of v.bureaux || []) {
    svg += poly(b.polygone.map(P), "#e6c79c", "#9a7040", 1);
    const c = b.polygone.reduce((s: number[], z: Pt) => [s[0] + z[0] / b.polygone.length, s[1] + z[1] / b.polygone.length], [0, 0]), pc = P(c);
    const vert = b.cote.startsWith("gauche");
    svg += `<text x="${f1(pc[0])}" y="${f1(pc[1])}" text-anchor="middle" dominant-baseline="middle" fill="#7a5530" font-size="12" font-weight="bold"${vert ? ` transform="rotate(-90 ${f1(pc[0])} ${f1(pc[1])})"` : ""}>bureau ${fz(b.profondeur_cm)} × ${fz(b.longueur_cm)}</text>\n`;
  }
  for (const st of v.sieges || []) {
    if (!st.tient) continue;
    svg += poly(st.polygone.map(P), "#dcdce6", "#55556a", 1.2);
    const c = P([st.polygone.reduce((s: number, z: Pt) => s + z[0], 0) / 4, st.polygone.reduce((s: number, z: Pt) => s + z[1], 0) / 4]);
    svg += text(c[0], c[1] - (st.largeur_cm >= 50 ? 4 : -3), st.largeur_cm >= 50 ? st.type : "tab.", "middle", "#44445a", st.largeur_cm >= 50 ? 10 : 8, "bold");
    if (st.largeur_cm >= 50) svg += text(c[0], c[1] + 10, `${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)}`, "middle", "#44445a", 9);
  }
  if (v.lit_pliant && v.lit_pliant.tient) {
    const lp = v.lit_pliant;
    if (lp.replie) {
      svg += poly(lp.replie.map(P), "#d9c8ec", "#6a3d9a", 1.5);
      for (const z of lp.fixations) { const c = P(z); svg += `<rect x="${f1(c[0] - 3)}" y="${f1(c[1] - 3)}" width="6" height="6" fill="#6a3d9a"/>\n`; }
    }
    svg += poly(lp.polygone.map(P), "none", "#6a3d9a", 1.8, "7 4");
    // etiquette a la tete du lit (bout le plus loin des bureaux), hors du fauteuil
    const [q0, q1, q2, q3] = lp.polygone as Pt[];
    const tete = P([q0[0] + (q3[0] - q0[0]) / 2 + (q1[0] - q0[0]) * 0.12, q0[1] + (q3[1] - q0[1]) / 2 + (q1[1] - q0[1]) * 0.12]);
    void q2;
    svg += text(tete[0], tete[1] - 2, `lit ${lp.replie ? "rabattable" : "pliant"} ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)}`, "middle", "#6a3d9a", 10, "bold");
    if (lp.sous_bureau_cm2 > 0) svg += text(tete[0], tete[1] + 11, "pied sous le bureau", "middle", "#6a3d9a", 9);
  }
  m.faces.forEach((f: any, i: number) => {
    const a = q[i], b = q[(i + 1) % n], L = f.longueur_cm, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const at = (s: number) => P([a[0] + ux * s, a[1] + uy * s]);
    // ouvertures dans l'epaisseur du mur
    for (const o of f.ouvertures) {
      const e = +p.panneau.epaisseur_mm / 10, nx = -uy * e, ny = ux * e;
      const c0 = [a[0] + ux * o.debut_cm, a[1] + uy * o.debut_cm], c1 = [a[0] + ux * (o.debut_cm + o.largeur_cm), a[1] + uy * (o.debut_cm + o.largeur_cm)];
      const col = o.type === "porte" ? "#c0392b" : "#1b9aa8";
      if (o.chambranle_cm) {
        const e2 = o.chambranle_cm, f0 = [c0[0] - ux * e2, c0[1] - uy * e2], f1p = [c1[0] + ux * e2, c1[1] + uy * e2];
        for (const [s, t] of [[f0, c0], [c1, f1p]]) svg += poly([s, t, [t[0] + nx, t[1] + ny], [s[0] + nx, s[1] + ny]].map(P), "#b98a55", "#7a5530", 1);
      }
      svg += poly([c0, c1, [c1[0] + nx, c1[1] + ny], [c0[0] + nx, c0[1] + ny]].map(P), o.type === "porte" ? "#fbfbf8" : "#bfe3ef", col, 1.5);
      if (o.type === "porte") {
        const ox = uy, oy = -ux, w = o.largeur_cm, arc: Pt[] = [];
        for (let k = 0; k <= 16; k++) { const tt = Math.PI / 2 * k / 16; arc.push(P([c1[0] + w * (-ux * Math.cos(tt) + ox * Math.sin(tt)), c1[1] + w * (-uy * Math.cos(tt) + oy * Math.sin(tt))])); }
        const ex = P([c1[0] + ox * w, c1[1] + oy * w]), h1 = P(c1);
        svg += line(h1[0], h1[1], ex[0], ex[1], col, 2);
        svg += `<polyline points="${arc.map((z) => `${f1(z[0])},${f1(z[1])}`).join(" ")}" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="4 3"/>\n`;
      }
    }
    // chaine de cotes : coins + bords des ouvertures, puis le total plus loin
    const pts = [0, ...f.ouvertures.flatMap((o: any) => [o.debut_cm - (o.chambranle_cm || 0), o.debut_cm, o.debut_cm + o.largeur_cm, o.debut_cm + o.largeur_cm + (o.chambranle_cm || 0)]), L].sort((x: number, y: number) => x - y);
    const uniq = pts.filter((s: number, k: number) => k === 0 || s - pts[k - 1] > 0.5);
    // cotes courtes : texte repousse dehors, en alternance, pour ne pas se chevaucher
    let court = 0;
    if (uniq.length > 2) for (let k = 0; k + 1 < uniq.length; k++) {
      const dl = uniq[k + 1] - uniq[k], petit = dl * scale < 26;
      svg += cote_svg(at(uniq[k]), at(uniq[k + 1]), fz(rnd(dl, 1)), 28, "#666", 10, petit ? (court++ % 2 ? 8 : 20) : 8);
    }
    svg += cote_svg(at(0), at(L), `${f.cle} · ${fz(L)}`, uniq.length > 2 ? 58 : 30);
  });
  // cotes interieures
  const I: Pt[] = m.interieur;
  I.forEach((a, i) => {
    const b = I[(i + 1) % n], pa = P(a), pb = P(b);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const nx = (pb[1] - pa[1]) / l, ny = -(pb[0] - pa[0]) / l, t = i === 3 ? 0.85 : 0.3;
    const mpt = [pa[0] + (pb[0] - pa[0]) * t + nx * 12, pa[1] + (pb[1] - pa[1]) * t + ny * 12];
    let rot = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180 / Math.PI;
    if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
    svg += `<text x="${f1(mpt[0])}" y="${f1(mpt[1])}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="10" transform="rotate(${f1(rot)} ${f1(mpt[0])} ${f1(mpt[1])})">int. ${fz(rnd(L, 1))}</text>\n`;
  });
  svg += text(W / 2, 26, `Plan de sol · murs ${v.aire_m2} m² · intérieur ${v.aire_interieure_m2} m²`, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `murs ${fz(+p.panneau.epaisseur_mm / 10)} cm · porte ${fz(v.porte.largeur_cm)} ouvrant dehors · fenêtres en façade (bleu)${v.sol_libre_m2 != null ? ` · sol libre hors bureaux ${v.sol_libre_m2} m²` : ""}`, "middle", "#888", 11);
  if (v.lit_pliant && v.lit_pliant.tient) svg += text(W / 2, 60, `violet pointillé = lit déplié${v.lit_pliant.replie ? " · violet plein = replié contre le mur · carrés = fixations" : ""}${v.lit_pliant.gene_sieges_m2 > 0.05 ? " · on range les sièges pour le déplier" : ""}`, "middle", "#6a3d9a", 11);
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}

export function modele_toit_svg(v: any, m: any): string {
  const T = m.toit, scale = 1.6;
  const { W, H, P } = cadre_plan(T.contour, scale, 110, 50);
  let svg = svgHeader(rnd(W), rnd(H));
  for (const pn of T.panneaux) {
    svg += poly(pn.polygone.map(P), "#f3f0e8", "#7a6f5a", 1.5);
    const ys = pn.polygone.map((z: Pt) => z[1]), xs = pn.polygone.map((z: Pt) => z[0]);
    const c = P([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
    svg += text(c[0], c[1] - 6, pn.id, "middle", "#5a4f3a", 16, "bold");
    svg += text(c[0], c[1] + 12, `${fz(pn.largeur_cm)} × ${fz(pn.longueur_cm)}`, "middle", "#5a4f3a", 11);
    // nervures, dans le sens de la pente
    if (m.sens === "droite") for (let y = Math.min(...ys) + 25; y < Math.max(...ys) - 5; y += 25) {
      const row = clip_half(clip_half(pn.polygone, [-1e4, y - 0.5], [1e4, y - 0.5], true), [1e4, y + 0.5], [-1e4, y + 0.5], true);
      if (row.length < 3) continue;
      const cx = row.map((z: Pt) => z[0]), a = P([Math.min(...cx), y]), b = P([Math.max(...cx), y]);
      svg += line(a[0], a[1], b[0], b[1], "#cfc6b3", 1);
    }
    else for (let x = Math.min(...xs) + 25; x < Math.max(...xs) - 5; x += 25) {
      const col = clip_half(clip_half(pn.polygone, [x - 0.5, 1e4], [x - 0.5, -1e4], true), [x + 0.5, -1e4], [x + 0.5, 1e4], true);
      if (col.length < 3) continue;
      const cy = col.map((z: Pt) => z[1]), a = P([x, Math.min(...cy)]), b = P([x, Math.max(...cy)]);
      svg += line(a[0], a[1], b[0], b[1], "#cfc6b3", 1);
    }
  }
  svg += poly(v.polygone.map(P), "none", "#2b5d8a", 1.2, "5 4");
  const g0 = P(T.gouttiere.de), g1 = P(T.gouttiere.a), dsc = P(T.gouttiere.descente);
  svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 6);
  svg += `<circle cx="${f1(dsc[0])}" cy="${f1(dsc[1])}" r="7" fill="#1b6fa8"/>\n`;
  svg += text(dsc[0] + 12, dsc[1] - 10, "descente", "start", "#1b6fa8", 11, "bold");
  const mid = P([(T.gouttiere.de[0] + T.gouttiere.a[0]) / 2, (T.gouttiere.de[1] + T.gouttiere.a[1]) / 2]);
  svg += text(mid[0] + 10, mid[1] - 12, `gouttière ${fz(T.gouttiere.longueur_cm)}`, "start", "#1b6fa8", 11, "bold");
  // fleche de pente
  const xs = T.contour.map((z: Pt) => z[0]), ys = T.contour.map((z: Pt) => z[1]);
  if (m.sens === "droite") {
    const ay = Math.min(...ys) + 80, a = P([Math.min(...xs) + 40, ay]), b = P([Math.min(...xs) + 130, ay]);
    svg += line(a[0], a[1], b[0], b[1], "#c0392b", 2.5);
    svg += `<polygon points="${f1(b[0] + 2)},${f1(b[1])} ${f1(b[0] - 12)},${f1(b[1] - 7)} ${f1(b[0] - 12)},${f1(b[1] + 7)}" fill="#c0392b"/>\n`;
    svg += text((a[0] + b[0]) / 2, a[1] - 9, `pente ${fr1(m.pente.pourcent)} % (${fr1(m.pente.degres)}°)`, "middle", "#c0392b", 12, "bold");
  } else {
    const ax = Math.min(...xs) + 100, a = P([ax, Math.min(...ys) + 40]), b = P([ax, Math.min(...ys) + 130]);
    svg += line(a[0], a[1], b[0], b[1], "#c0392b", 2.5);
    svg += `<polygon points="${f1(b[0])},${f1(b[1] - 2)} ${f1(b[0] - 7)},${f1(b[1] + 12)} ${f1(b[0] + 7)},${f1(b[1] + 12)}" fill="#c0392b"/>\n`;
    svg += text(a[0] - 10, (a[1] + b[1]) / 2, `pente ${fr1(m.pente.pourcent)} % (${fr1(m.pente.degres)}°)`, "end", "#c0392b", 12, "bold");
  }
  const q = T.contour, n = q.length;
  q.forEach((z: Pt, i: number) => { svg += cote_svg(P(z), P(q[(i + 1) % n]), fz(rnd(Math.hypot(q[(i + 1) % n][0] - z[0], q[(i + 1) % n][1] - z[1]), 1)), 26, "#7a6f5a", 11); });
  svg += text(W / 2, 26, `Toiture · ${T.panneaux.length} panneaux · ${T.aire_m2} m² couverts`, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `panneaux dans le sens de la pente (longueur = rampant) · murs en pointillé · ${m.sens === "droite" ? "égout côté jardin (droite), haut contre le mur gauche" : "débords avant et fond"}`, "middle", "#888", 11);
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}
const fr1 = (x: number) => String(x).replace(".", ",");

export function modele_rehausse_svg(m: any): string {
  const R = m.rehausse, section = +R.section_mm[1] / 10, stock = R.longueur_stock_cm, sx = 1.9, sy = 3.2, pad = 50, gap = 60;
  const W = stock * sx + 2 * pad, H = 70 + R.barres.length * (section * sy + gap) + 30;
  let svg = svgHeader(rnd(W), rnd(H));
  R.barres.forEach((b: any, k: number) => {
    const top = 70 + k * (section * sy + gap), X = (x: number) => pad + x * sx, Y = (h: number) => top + (section - h) * sy;
    svg += text(pad, top - 10, `madrier ${k + 1} · ${R.section_mm[0]} × ${R.section_mm[1]} · ${fz(stock)} cm · chute ${fz(b.chute_cm)} cm`, "start", "#5a4f3a", 12, "bold");
    svg += poly([[X(0), Y(0)], [X(stock), Y(0)], [X(stock), Y(section)], [X(0), Y(section)]], "#f3ece0", "#b8a888", 1, "4 3");
    for (const t of b.troncons) t.pieces.forEach((pc: any, j: number) => {
      // piece 0 sur le chant bas ; piece 1 retournee sur le chant haut (et inversee si besoin)
      const x0 = t.x, pts: Pt[] = j === 0
        ? [[x0, 0], [x0 + pc.L, 0], [x0 + pc.L, pc.h1], [x0, pc.h0]]
        : t.inverse ? [[x0, section], [x0 + pc.L, section], [x0 + pc.L, section - pc.h0], [x0, section - pc.h1]]
        : [[x0, section], [x0 + pc.L, section], [x0 + pc.L, section - pc.h1], [x0, section - pc.h0]];
      svg += poly(pts.map(([x, h]) => [X(x), Y(h)]), "#d9b98a", "#8a5a2b", 1.5);
      const cx = X(x0 + pc.L * 0.5), cy = Y(j === 0 ? Math.max(pc.h0, pc.h1) / 3 : section - Math.max(pc.h0, pc.h1) / 3);
      svg += text(cx, cy + 4, `${pc.id} · face ${pc.face} · ${fz(pc.L)} · ${fz(pc.h0)} → ${fz(pc.h1)}`, "middle", "#5a3a1a", 11, "bold");
    });
  });
  svg += text(W / 2, 26, `Rehausse bois · ${R.pieces.length} pièces dans ${R.nb_madriers} madrier${R.nb_madriers > 1 ? "s" : ""}`, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, "hauteur de chaque pièce : de son début à sa fin, dans le sens de la face (vue de l'extérieur, de gauche à droite)", "middle", "#888", 11);
  return svg + "</svg>\n";
}

export function modele_facade_svg(m: any, f: any): string {
  const scale = 1.25, pad = 60, top = 50, L = f.longueur_cm, Hm = f.hauteur_mur_cm, h0 = f.hauteur_debut_cm, h1 = f.hauteur_fin_cm;
  const W = L * scale + 2 * pad + 60, H = Math.max(h0, h1) * scale + 2 * pad + top + 30;
  const P = (x: number, h: number) => [pad + 30 + x * scale, H - pad - 30 - h * scale];
  let svg = svgHeader(rnd(W), rnd(H));
  for (const pn of f.panneaux) {
    svg += poly([P(pn.debut_cm, 0), P(pn.debut_cm + pn.largeur_cm, 0), P(pn.debut_cm + pn.largeur_cm, Hm), P(pn.debut_cm, Hm)], "#eef2f6", "#2b5d8a", 1.5);
    const c = P(pn.debut_cm + pn.largeur_cm / 2, Hm - 18);
    svg += text(c[0], c[1], pn.id, "middle", "#2b5d8a", 12, "bold");
    if (pn.largeur_cm < +m.faces[0].panneaux[0].largeur_cm - 0.05 || pn.largeur_cm < 99.95) svg += text(c[0], c[1] + 14, `${fz(pn.largeur_cm)}`, "middle", "#2b5d8a", 10);
  }
  if (Math.max(h0, h1) > Hm + 0.05) {
    const pc = m.rehausse.pieces.find((x: any) => x.face === f.cle);
    svg += poly([P(0, Hm), P(L, Hm), P(L, h1), P(0, h0)], "#d9b98a", "#8a5a2b", 1.5);
    const c = P(L / 2, Hm + Math.max(h0, h1) - Hm > 16 ? Hm + 6 : Hm + 2);
    svg += text(c[0], c[1] - 2, `${pc ? pc.id + " · " : ""}rehausse ${fz(rnd(h0 - Hm, 1))} → ${fz(rnd(h1 - Hm, 1))}`, "middle", "#5a3a1a", 10, "bold");
  }
  for (const o of f.ouvertures) {
    if (o.chambranle_cm) {
      const e = o.chambranle_cm, fa = P(o.debut_cm - e, 0), fb = P(o.debut_cm + o.largeur_cm + e, o.hauteur_cm + e);
      svg += `<rect x="${f1(fa[0])}" y="${f1(fb[1])}" width="${f1(fb[0] - fa[0])}" height="${f1(fa[1] - fb[1])}" fill="#b98a55" stroke="#7a5530" stroke-width="1.2"/>\n`;
      svg += cote_svg(P(o.debut_cm + o.largeur_cm + e, o.hauteur_cm + e), P(o.debut_cm + o.largeur_cm + e, f.hauteur_mur_cm), fz(rnd(f.hauteur_mur_cm - o.hauteur_cm - e, 1)), -14, "#7a5530", 9);
    }
    const a = P(o.debut_cm, o.allege_cm), b = P(o.debut_cm + o.largeur_cm, o.allege_cm + o.hauteur_cm);
    const col = o.type === "porte" ? "#c0392b" : "#1b9aa8";
    svg += `<rect x="${f1(a[0])}" y="${f1(b[1])}" width="${f1(b[0] - a[0])}" height="${f1(a[1] - b[1])}" fill="#bfe3ef" stroke="${col}" stroke-width="2"/>\n`;
    const c = P(o.debut_cm + o.largeur_cm / 2, o.allege_cm + o.hauteur_cm / 2);
    svg += text(c[0], c[1] - 4, o.type === "porte" ? "porte" : o.ouvrant ? "fenêtre ouvrante" : "fenêtre fixe", "middle", col, 11, "bold");
    svg += text(c[0], c[1] + 12, `${fz(o.largeur_cm)} × ${fz(o.hauteur_cm)}${o.allege_cm ? ` · allège ${fz(o.allege_cm)}` : ""}`, "middle", col, 10);
    svg += cote_svg(P(o.debut_cm, 0), P(o.debut_cm + o.largeur_cm, 0), fz(o.largeur_cm), 20, col, 10);
    if (o.chambranle_cm) {
      const t = P(o.debut_cm + o.largeur_cm / 2, o.hauteur_cm - 14);
      svg += text(t[0], t[1], `cadre ${fz(o.largeur_cm + 2 * o.chambranle_cm)} × ${fz(o.hauteur_cm + o.chambranle_cm)}`, "middle", "#7a5530", 10, "bold");
    }
  }
  svg += cote_svg(P(0, 0), P(L, 0), `${fz(L)} cm`, f.ouvertures.length ? 44 : 20);
  svg += text(P(0, h0)[0] - 8, P(0, h0)[1] + 4, `${fz(h0)}`, "end", "#2b5d8a", 12, "bold");
  svg += text(P(L, h1)[0] + 8, P(L, h1)[1] + 4, `${fz(h1)}`, "start", "#2b5d8a", 12, "bold");
  svg += text(P(0, Hm)[0] - 8, P(0, Hm)[1] + 16, `${fz(Hm)}`, "end", "#888", 10);
  svg += text(W / 2, 26, `Face ${f.cle} · ${f.nom} · vue de l'extérieur`, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${f.panneaux.length} panneau${f.panneaux.length > 1 ? "x" : ""} de ${fz(Hm)} · hauteurs finies aux deux bouts`, "middle", "#888", 11);
  return svg + "</svg>\n";
}

/* ----------------------------------------------------------------- */
/* Page de l'abri retenu (markdown, genere par le CLI)                */
/* ----------------------------------------------------------------- */
// jeu de parametres de la variante proposee : params + surcouche abri_v2.params (listes remplacees)
// blocs abri_v2, abri_v3... de params.json, dans l'ordre des numeros
export function versions_abri(p: Params): { n: number; cle: string }[] {
  return Object.keys(p).map((cle) => ({ cle, m: /^abri_v(\d+)$/.exec(cle) })).filter((x) => x.m && p[x.cle] && p[x.cle].params)
    .map((x) => ({ n: +x.m![1], cle: x.cle })).sort((a, b) => a.n - b.n);
}

export function params_v2(p: Params, cle = "abri_v2"): Params | null {
  if (!p[cle] || !p[cle].params) return null;
  const fusion = (a: any, b: any): any => {
    if (Array.isArray(b) || b === null || typeof b !== "object") return JSON.parse(JSON.stringify(b));
    const out: any = a && typeof a === "object" && !Array.isArray(a) ? { ...a } : {};
    for (const k of Object.keys(b)) out[k] = fusion(out[k], b[k]);
    return out;
  };
  return fusion(JSON.parse(JSON.stringify(p)), p[cle].params);
}

// tableau compare de deux abris (memes fonctions, deux jeux de parametres)
function compare_md(a: { m: any; v: any }, b: { m: any; v: any }, seuil: number, ep: number, n = 2): string {
  const fr = (x: number) => String(x).replace(".", ",");
  const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} €`;
  const etroites = (m: any) => m.faces.flatMap((f: any) => f.panneaux).filter((pn: any) => pn.largeur_cm < 30).length;
  const entiers = (m: any) => m.faces.filter((f: any) => f.panneaux.every((pn: any) => pn.largeur_cm > 99.95)).map((f: any) => f.cle).join(", ") || "aucune";
  const passage = (v: any) => v.passages.find((q: any) => q.cote === "arriere_droite").cm;
  const toit_etroit = (m: any) => m.toit.panneaux.filter((t: any) => t.largeur_cm < 30).length;
  const lignes: [string, (x: { m: any; v: any }) => string][] = [
    ["murs (extérieur)", (x) => `${fr(x.v.aire_m2)} m²`],
    ["intérieur", (x) => `**${fr(x.v.aire_interieure_m2)} m²**`],
    [`formalités (seuil ${fz(seuil)} m² de murs)`, (x) => (x.v.aire_m2 <= seuil ? "aucune a priori" : "déclaration préalable probable")],
    ["côtés A · D · B · G", (x) => x.m.faces.map((f: any) => fr(f.longueur_cm)).join(" · ") + " cm"],
    ["faces en panneaux entiers", (x) => entiers(x.m)],
    ["bandes de mur de moins de 30 cm", (x) => String(etroites(x.m))],
    ["panneaux de mur à commander", (x) => String(x.m.panneaux_mur_a_commander)],
    ["passage derrière l'abri", (x) => `${fr(passage(x.v))} cm`],
    ["sens du toit", (x) => (x.m.sens === "droite" ? "vers la droite (jardin)" : "vers le fond (mur de propriété)")],
    ["pente", (x) => `${fr(x.m.pente.pourcent)} % (${fr(x.m.pente.degres)}°), chute ${fr(x.m.chute_cm)} cm`],
    ["portée du toit sans panne", (x) => `${fr(rnd(x.m.portee_cm / 100, 2))} m`],
    ["panneaux de toit", (x) => `${x.m.toit.panneaux.length}, dont ${x.m.toit.panneaux.filter((t: any) => t.biais).length} coupé(s) en biais et ${toit_etroit(x.m)} de moins de 30 cm de large`],
    ["gouttière et descente", (x) => (x.m.sens === "droite" ? "mur droit, descente devant côté jardin" : "mur du fond, descente au coin arrière gauche")],
    ["rehausse", (x) => `${x.m.rehausse.pieces.length} pièces, ${x.m.rehausse.nb_madriers} madrier(s) ${x.m.rehausse.section_mm.join(" × ")}`],
    ["hauteurs finies des coins", (x) => x.m.hauteurs_coins_cm.map(fr).join(" · ") + " cm"],
    ["porte", (x) => `${fz(x.v.porte.largeur_cm)} × ${fz(x.v.porte.hauteur_cm)}, débord de toit au-dessus : ${fz(x.m.toit.debord_cm.droite)} cm`],
    ["fenêtres en façade", (x) => x.v.fenetres.map((f: any) => `${fz(f.largeur_cm)} ${f.ouvrant ? "ouvrante" : "fixe"}`).join(" + ")],
    ["sol libre hors bureaux", (x) => `${fr(x.v.sol_libre_m2)} m²`],
    ["lit", (x) => { const lp = x.v.lit_pliant; return !lp ? "–" : !lp.tient ? `${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} : ne tient pas` : `${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)}, ${lp.replie ? "rabattable contre le fond" : "pliant, posé au sol libre"}`; }],
    ["budget indicatif HT", (x) => `${eur(x.m.budget.total_eur)} (coque ${eur(x.m.budget.coque_eur)})`],
  ];
  void ep;
  let md = `| | version 1 ([abri.md](abri.md)) | **version ${n}** |\n|---|---|---|\n`;
  for (const [nom, f] of lignes) md += `| ${nom} | ${f(a)} | ${f(b)} |\n`;
  return md + "\n";
}

export function abri_md(p: Params, core: any, opts: any = {}): string {
  const m = core.modele, v = core.variantes.find((x: any) => x.id === 13);
  if (!m || !v) return "";
  const droite = m.sens === "droite", img = (f: string) => (opts.prefixe ? f.replace("modele-", opts.prefixe) : f);
  const fr = (x: number) => String(x).replace(".", ",");
  const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
  const d = p.disposition_trapeze, po = v.porte, lp = v.lit_pliant, B = m.budget;
  const ep = +p.panneau.epaisseur_mm / 10, seuil = +(p.reglementaire && p.reglementaire.seuil_sans_formalite_m2) || 5;
  const derriere = v.passages.find((q: any) => q.cote === "arriere_droite");
  let md = `# ${opts.titre || "Abri de jardin : le bureau trapèze"}\n\n`;
  md += `> Généré par \`npm run emit\` depuis \`params.json\`${opts.base ? ` (bloc \`abri_v${opts.version || 2}\`)` : ""} et \`site/src/compute.ts\` : ne pas éditer à la main. ${opts.base ? "Version de départ : [abri.md](abri.md). " : ""}Autres formes étudiées : [variantes.md](variantes.md).\n\n`;
  md += `![implantation sur la dalle](site/assets/${img("modele-implantation")}.svg)\n\n`;
  if (opts.base) {
    md += `## Ce qui change par rapport à la version 1\n\n`;
    md += compare_md({ m: opts.base.modele, v: opts.base.variantes.find((x: any) => x.id === 13) }, { m, v }, seuil, ep, opts.version || 2);
    if ((opts.pertes || []).length) md += `### Ce que la version ${opts.version || 2} perd\n\n` + opts.pertes.map((s: string) => `- ${s}\n`).join("") + `\n`;
    if ((opts.notes || []).length) md += `### Pourquoi\n\n` + opts.notes.map((s: string, i: number) => `${i + 1}. ${s}\n`).join("") + `\n`;
    if ((opts.hors_modele || []).length) md += `### Conseils que les plans ne montrent pas\n\n` + opts.hors_modele.map((s: string) => `- ${s}\n`).join("") + `\n`;
  }
  md += `## En bref\n\n`;
  md += `- **Dalle existante** : ${fr(core.geometrie.dalle.aire_m2)} m², côtés ${core.geometrie.dalle.cotes_cm.map(fz).join(" / ")} cm, murs de propriété à gauche et au fond.\n`;
  md += `- **${fr(v.aire_interieure_m2)} m² intérieur** (${fr(v.aire_m2)} m² de murs), ${fr(derriere.cm)} cm de passage derrière.\n`;
  md += `- **4 murs** en panneaux sandwich ${fz(ep)} cm autoportants : façade ${fr(m.faces[0].longueur_cm)}, droite ${fr(m.faces[1].longueur_cm)}, fond en biais ${fr(m.faces[2].longueur_cm)}, gauche ${fr(m.faces[3].longueur_cm)} cm.\n`;
  md += droite ? `- **Toit** mono-pente vers la droite (jardin), ${fr(m.pente.degres)}° : ${fr(Math.max(...m.hauteurs_coins_cm))} cm contre le mur gauche, ${fr(Math.min(...m.hauteurs_coins_cm))} cm côté porte.\n`
    : `- **Toit** mono-pente vers le fond, ${fr(m.pente.degres)}° : ${fr(m.hauteurs_coins_cm[0])} cm devant, ${fr(Math.min(...m.hauteurs_coins_cm))} cm au plus bas.\n`;
  md += `- **Porte** ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} sur le mur droit, **${v.fenetres.length === 1 ? `une fenêtre de ${fz(v.fenetres[0].largeur_cm)}` : `${v.fenetres.length} fenêtres`}** en façade, **bureau en L** sur la façade et le mur gauche${lp && lp.replie ? `, **lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} rabattable** contre le fond` : ""}.\n`;
  md += `- **Budget indicatif** : ${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)} HT (coque ${eur(B.coque_eur)}, aménagement ${eur(B.amenagement_eur)}).\n\n`;
  md += `## À trancher\n\n`;
  const stock_courant = +m.rehausse.section_mm[1] <= 225;
  md += `- **Toit** : ${droite ? "vers la droite (jardin)" : "vers l'arrière"}, chute ${fr(m.chute_cm)} cm (${fr(m.pente.degres)}°)${droite ? "" : " = choix par défaut"}. Madrier ${m.rehausse.section_mm.join(" × ")} classe 4 ${stock_courant ? ": section courante, à vérifier en classe 4" : "à trouver (sinon deux pièces superposées)"}.\n`;
  md += v.aire_m2 <= seuil ? `- **Formalités** : ${fr(v.aire_m2)} m² de murs, au seuil de ${fz(seuil)} m² : aucune formalité a priori, à confirmer en mairie ; distance aux limites du PLU à vérifier quand même.\n`
    : `- **Formalités** : ${fr(v.aire_m2)} m² de murs, au-dessus du seuil de ${fz(seuil)} m² : déclaration préalable probable ; distance aux limites du PLU à vérifier en mairie.\n`;
  if (lp && lp.replie) md += `- **Lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} rabattable** contre le mur du fond : déplié, ${lp.sous_bureau_cm2 > 0 ? "son pied passe sous le bureau gauche (lit plus bas que le plateau, pas de tiroir ni de traverse à cet endroit) et " : ""}il va jusque devant la porte (elle ouvre dehors) ; fixations à dimensionner (2 charnières sur le mur du fond, reprise dans la rehausse ou une lisse).\n`;
  else if (lp) md += `- **Lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)}** : déplié au milieu${lp.sous_bureau_cm2 > 0 ? ", le pied sous un bureau" : ""}${lp.gene_sieges_m2 > 0.05 ? ", fauteuil et tabouret rangés" : ""}.\n`;
  const pleine = (v.fenetres || []).filter((f: any) => f.largeur_cm >= +p.panneau.largeur_utile_cm - 0.05);
  if (pleine.length) md += `- **Fenêtre de ${fz(pleine[0].largeur_cm)}** : aussi large qu'un module, elle prend tout le panneau A2, qui ne garde qu'une allège de ${fz(pleine[0].allege_cm)} cm et un linteau de ${fz(rnd(m.hauteur_mur_cm - pleine[0].allege_cm - pleine[0].hauteur_cm, 1))} cm.${(v.fenetres || []).every((f: any) => !f.ouvrant) ? " Elle est **fixe** : la seule aération est la porte (plus la ventilation prévue) ; une ouvrante coûte ~120 € de plus." : ""}\n`;
  md += `- **Portée du toit** (~${fr(rnd(m.portee_cm / 100, 1))} m au plus long) en ${fz(ep)} cm sans panne : à confirmer dans le tableau du fabricant.\n`;
  md += `- **Angles non droits** (${m.angles_deg.filter((a: number) => Math.abs(a - 90) > 0.5).map((a: number) => fr(a) + "°").join(", ")}) : profils d'angle pliés sur mesure.\n\n`;
  md += `## Plans\n\n`;
  const plans: [string, string][] = [["modele-implantation", "Implantation sur la dalle"], ["modele-sol", "Plan de sol"], ["modele-toit", "Toiture"], ["modele-facade-A", "Face A · façade (jardin)"], ["modele-facade-D", "Face D · droite (porte)"], ["modele-facade-B", "Face B · fond en biais"], ["modele-facade-G", "Face G · gauche"], ["modele-rehausse", "Rehausse bois : débit des madriers"]];
  for (const [f, t] of plans) md += `### ${t}\n\n![${t}](site/assets/${img(f)}.svg)\n\n`;
  md += `## Dimensions\n\n| face | longueur ext. | longueur int. | hauteur finie (début → fin) | angle au début |\n|---|---|---|---|---|\n`;
  m.faces.forEach((f: any, i: number) => { md += `| ${f.cle} · ${f.nom} | ${fr(f.longueur_cm)} cm | ${fr(v.cotes_interieures_cm[i])} cm | ${fr(f.hauteur_debut_cm)} → ${fr(f.hauteur_fin_cm)} cm | ${fr(m.angles_deg[i])}° |\n`; });
  md += `\nMurs ${fr(v.aire_m2)} m² · intérieur ${fr(v.aire_interieure_m2)} m² (murs de ${fz(ep)} cm retirés) · sol libre hors bureaux ${fr(v.sol_libre_m2)} m² · hauteur sous plafond ${fr(rnd((m.hauteurs_coins_cm[0] - (p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? +p.amenagement.plancher.epaisseur_cm : 0)) / 100, 2))} m devant, ${fr(rnd((Math.min(...m.hauteurs_coins_cm) - (p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? +p.amenagement.plancher.epaisseur_cm : 0)) / 100, 2))} m au plus bas (plancher isolé déduit).\n\n`;
  md += `## Débit\n\n### Panneaux de mur (hauteur ${fz(m.hauteur_mur_cm)} cm, pose verticale)\n\n| pièce | largeur | provenance | découpe |\n|---|---|---|---|\n`;
  for (const f of m.faces) for (const pn of f.panneaux) md += `| ${pn.id} | ${fr(pn.largeur_cm)} cm | ${pn.source === "chute" ? "chute d'un autre panneau" : pn.largeur_cm < 99.95 ? "panneau recoupé" : "panneau entier"} | ${pn.decoupes.length ? pn.decoupes.join(", ") : "–"} |\n`;
  md += `\n**${m.panneaux_mur_a_commander} panneaux de mur** de ${fz(+p.panneau.largeur_utile_cm)} × ${fz(m.hauteur_mur_cm)} à commander (les bandes étroites sortent des chutes).\n\n`;
  md += `### Panneaux de toit (dans le sens de la pente, longueur = rampant)\n\n| pièce | largeur | longueur à commander | coupe |\n|---|---|---|---|\n`;
  for (const t of m.toit.panneaux) md += `| ${t.id} | ${fr(t.largeur_cm)} cm | ${fr(t.longueur_cm)} cm | ${t.largeur_cm < 99.95 ? "refendu en largeur, " : ""}${t.biais ? (droite ? "un bord en biais le long du mur du fond" : "bout arrière en biais") : "entier, coupes droites"} |\n`;
  const db = m.toit.debord_cm;
  md += droite ? `\nDébords : ${fz(db.droite)} cm à droite (égout, au-dessus de la porte), ${fz(db.gauche)} cm contre le mur de propriété, rives avant et fond ${db.avant || db.arriere ? `à ${fz(db.avant)} et ${fz(db.arriere)} cm` : "affleurantes (bavette de rive)"}. Surface couverte ${fr(m.toit.aire_m2)} m².\n\n`
    : `\nDébords : ${fz(db.avant)} cm devant, ${fz(db.arriere)} cm au fond, rives affleurantes sur les côtés. Surface couverte ${fr(m.toit.aire_m2)} m².\n\n`;
  md += `### Rehausse bois (madrier ${m.rehausse.section_mm.join(" × ")}, stock ${fz(m.rehausse.longueur_stock_cm)} cm)\n\n| pièce | face | longueur | hauteur début → fin |\n|---|---|---|---|\n`;
  for (const r of m.rehausse.pieces) md += `| ${r.id} | ${r.face} | ${fr(r.L)} cm | ${fr(r.h0)} → ${fr(r.h1)} cm |\n`;
  md += `\n**${m.rehausse.nb_madriers} madriers** : ${m.rehausse.barres.map((b: any, k: number) => `n°${k + 1} = ${b.troncons.map((t: any) => t.pieces.map((q: any) => q.id).join(" + ")).join(" puis ")} (chute ${fr(b.chute_cm)} cm)`).join(" ; ")}. Deux pièces sur un même tronçon = une seule coupe en biais.\n\n`;
  md += droite ? `### Gouttière et profils\n\n- Gouttière ${fr(m.toit.gouttiere.longueur_cm)} cm le long du mur droit, au-dessus de la porte ; descente au coin avant droit, côté jardin (récupérateur d'eau possible). Aucune eau dans le passage arrière ni au pied du mur de propriété.\n`
    : `### Gouttière et profils\n\n- Gouttière ${fr(m.toit.gouttiere.longueur_cm)} cm le long du fond, descente au coin arrière gauche (point bas), atteignable par le passage.\n`;
  md += `- 4 angles : ${m.faces.map((f: any, i: number) => `${m.faces[(i + 3) % 4].cle}/${f.cle} ${fr(m.angles_deg[i])}°`).join(", ")} ; hauteur de chaque angle = hauteur finie du coin.\n`;
  md += `- Rail de pied sur tout le périmètre (${fr(rnd(m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100, 2))} m), bavettes de rive sur les côtés ${droite ? "A et B" : "D et G"}.\n\n`;
  md += `## Ouvertures\n\n| ouverture | taille | où | détail |\n|---|---|---|---|\n`;
  md += `| porte vitrée | ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} (cadre ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)}) | face D, de ${fr(po.debut_cm)} à ${fr(rnd(po.debut_cm + po.largeur_cm, 1))} cm depuis la façade | ouvre vers l'extérieur ; cadre à ${fz(po.marge_cm)} cm du mur du fond (face intérieure) et sous le haut du mur |\n`;
  for (const f of v.fenetres) md += `| fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"} | ${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} | face A, de ${fr(f.debut_cm)} à ${fr(rnd(f.debut_cm + f.largeur_cm, 1))} cm depuis le coin gauche | allège ${fz(f.allege_cm)} cm, au-dessus du bureau, dans un seul panneau |\n`;
  md += `\n## Aménagement\n\n| élément | taille | place |\n|---|---|---|\n`;
  for (const b of v.bureaux) md += `| bureau ${b.cote === "avant" ? "de façade" : b.cote} | ${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)} cm | tout le mur ${b.cote === "avant" ? "de façade" : b.cote} |\n`;
  for (const st of v.sieges || []) md += `| ${st.type} | ${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)} cm | devant le bureau ${st.contre === "avant" ? "de façade" : st.contre} |\n`;
  if (lp) md += `| lit ${lp.replie ? "rabattable" : "pliant"} (déplié) | ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} cm | ${!lp.tient ? "**NE TIENT PAS**" : lp.replie ? `contre le mur du fond (replié : ${fz(lp.epaisseur_replie_cm)} cm), ${lp.sous_bureau_cm2 > 0 ? "pied sous le bureau gauche" : ""}${lp.gene_sieges_m2 > 0.05 ? ", sièges rangés" : ""}` : `au milieu${lp.sous_bureau_cm2 > 0 ? ", pied sous un bureau" : ""}${lp.gene_sieges_m2 > 0.05 ? ", sièges rangés" : ""}`} |\n`;
  md += `\n## Budget indicatif (HT, fourniture seule)\n\n| poste | quantité | prix unitaire | montant |\n|---|---|---|---|\n`;
  for (const l of B.lignes) md += `| ${l.poste} | ${fr(l.qte)} ${l.unite} | ${eur(l.pu_eur)} | ${eur(l.montant_eur)} |\n`;
  md += `| **coque** | | | **${eur(B.coque_eur)}** |\n| **aménagement** | | | **${eur(B.amenagement_eur)}** |\n| **total** | | | **${eur(B.total_eur)}** (${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}, ±${B.incertitude_pct} %) |\n\n`;
  md += `Prix médians du marché, à confirmer par devis (\`prix_indicatifs_eur\`). Porte et fenêtres au prix des blocs standard.\n`;
  return md;
}
