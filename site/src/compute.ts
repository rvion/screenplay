// Coeur de calcul de l'abri : SOURCE UNIQUE de la logique (dalle, formes possibles, modele de
// l'abri, plans SVG, scene 3D). Pur : aucune dependance DOM / Three, donc utilisable navigateur
// ET Node (CLI + tests). Fige par le snapshot golden tests/snapshots/abri.json.

import { nomenclature_abri, guide_montage } from "site/src/chantier.ts";

export type Params = any;

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

/* ----------------------------------------------------------------- */
/* Formalites (Code de l'urbanisme)                                    */
/* ----------------------------------------------------------------- */
// R*420-1 : l'emprise au sol exclut les debords de toiture tant qu'ils ne sont pas soutenus par des
// poteaux, piliers ou encorbellements. R421-2 / R421-9 : dispense jusqu'a 5 m2 d'emprise ET de
// surface de plancher, declaration prealable jusqu'a 20, permis au-dela.
export function formalites(p: Params, emprise_murs_m2: number, emprise_debords_m2: number, surface_plancher_m2: number) {
  const rg = p.reglementaire || {};
  const sur_poteaux = !!rg.debords_sur_poteaux;
  const s1 = +(rg.seuil_sans_formalite_m2 ?? 5), s2 = +(rg.seuil_declaration_m2 ?? 20);
  const emprise = sur_poteaux ? emprise_debords_m2 : emprise_murs_m2;
  const retenue = Math.max(emprise, surface_plancher_m2);
  return {
    emprise_au_sol_m2: rnd(emprise, 2),
    emprise_debords_inclus_m2: rnd(emprise_debords_m2, 2),
    surface_plancher_m2: rnd(surface_plancher_m2, 2),
    debords_comptes: sur_poteaux,
    seuil_sans_formalite_m2: s1, seuil_declaration_m2: s2,
    formalite: retenue <= s1 ? "aucune" : retenue <= s2 ? "declaration prealable" : "permis de construire",
    libelle: retenue <= s1 ? "aucune formalité" : retenue <= s2 ? "déclaration préalable" : "permis de construire",
    reserve: "secteur protégé ou abords d'un monument historique : déclaration préalable même sous le seuil ; le PLU (implantation, hauteur, distance aux limites) s'applique dans tous les cas",
    reference: rg.reference || "Code de l'urbanisme R*420-1, R421-2, R421-9",
  };
}

/* ----------------------------------------------------------------- */
/* Geometrie                                                          */
/* ----------------------------------------------------------------- */
export function geometry(p: Params) {
  // Dalle reelle : pentagone a pointe arriere, decrite par 5 longueurs relevees au metre, dans son propre repere
  // (origine = coin avant-gauche de la dalle). Les formes d'abri et le modele sont poses dans ce repere.
  const d = p.dalle_cm;
  if (!d) return { dalle: null };
  const dA = +d.avant, dD = +d.droite, dG = +d.gauche, ag = +d.arriere_gauche, ad = +d.arriere_droite;
  const apex = slab_apex([0, dG], [dA, dD], ag, ad);
  const local: Pt[] = [[0, 0], [dA, 0], [dA, dD], ...(apex ? [apex] : []), [0, dG]];
  const noms = apex ? ["avant", "droite", "arriere_droite", "arriere_gauche", "gauche"] : ["avant", "droite", "arriere", "gauche"];
  // murs de propriete : ni l'abri ni le toit ne peuvent les franchir
  const mitoyens: string[] = d.murs_mitoyens || [];
  const est_mur = (nom: string) => mitoyens.includes(nom) || (nom === "arriere" && mitoyens.some((k) => k.startsWith("arriere")));
  const grillages: string[] = d.grillages || [], palissades: string[] = d.palissades || [];
  const murs = noms.map((nom, i) => ({ nom, i })).filter(({ nom }) => est_mur(nom)).map(({ nom, i }) => {
    const a = local[i], b = local[(i + 1) % local.length];
    return { cote: nom, type: grillages.includes(nom) ? "grillage" : palissades.includes(nom) ? "palissade" : "mur", de: [rnd(a[0], 1), rnd(a[1], 1)], a: [rnd(b[0], 1), rnd(b[1], 1)] };
  });
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
  return {
    dalle: {
      zone_utile,
      avant: dA, droite: dD, gauche: dG, arriere_gauche: ag, arriere_droite: ad,
      pointe_cm: apex ? [rnd(apex[0], 1), rnd(apex[1], 1)] : null,
      polygone: local.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]),
      // angles interieurs, dans l'ordre du polygone (coin avant-gauche d'abord)
      angles_deg: interior_angles(local).map((a) => rnd(a, 1)),
      aire_m2: rnd(poly_area(local) / 1e4, 2),
      cotes_cm: [dA, dD, ...(apex ? [ad, ag] : [rnd(Math.hypot(dA, dD - dG), 1)]), dG],
      cotes_noms: noms,
      murs,
      mur_hauteur_cm: +d.mur_hauteur_cm || 0,
      grillage_hauteur_cm: +d.grillage_hauteur_cm || +d.mur_hauteur_cm || 0,
      palissade_epaisseur_cm: +d.palissade_epaisseur_cm || 4,
      palissade_travee_cm: +d.palissade_travee_cm || 180,
      mur_epaisseur_cm: +d.mur_epaisseur_cm || 15,
    },
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
  const fond = g.dalle.murs.filter((w: any) => w.cote.startsWith("arriere")).map((w: any) => ({ cote: w.cote, a: w.de, b: w.a }));
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
  // dalle situee derriere le mur du fond et dans la largeur de l'abri : invisible depuis la facade.
  // une seule face de fond (trapeze, rectangle) ; sinon null
  const dalle_abs: Pt[] = g.dalle.polygone;
  const derriere_abri = (r: Pt[]) => {
    const fonds = r.map((a, i) => i).filter((i) => nom_cote(r[i], r[(i + 1) % r.length]).startsWith("fond"));
    if (fonds.length < 1 || fonds.length > 2) return null;
    const xmax = Math.max(...r.map((z) => z[0]));
    // une zone par mur de fond : au-dela de ce mur, pas plus a droite que l'abri ; aire = union
    const zones = fonds.map((i) => clip_half(clip_half(dalle_abs, r[i], r[(i + 1) % r.length], false), [xmax, -1e4], [xmax, 1e4], true)).filter((z) => z.length >= 3);
    if (!zones.length) return null;
    const commun = zones.length === 2 ? poly_area(clip_convex(zones[0], zones[1])) : 0;
    const aire = zones.reduce((s, z) => s + poly_area(z), 0) - commun;
    const a_l_abri = (z: Pt) => Math.min(...r.map((a, i) => { const f = pied(z, a, r[(i + 1) % r.length]); return Math.hypot(z[0] - f[0], z[1] - f[1]); }));
    return { aire_m2: rnd(aire / 1e4, 2), profondeur_max_cm: rnd(Math.max(...zones.flat().map(a_l_abri)), 0), polygones: zones.map((z) => z.map(([x, y]) => [rnd(x, 1), rnd(y, 1)])) };
  };
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
      arriere: derriere_abri(r),
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
      const [fa, fd, fg] = [+fixe.avant, +fixe.droite, +fixe.gauche], ff = +fixe.fond || 0;
      // fond > 0 : un mur du fond d'equerre sur le mur gauche, puis un pan qui rejoint le haut du mur droit
      if (ff > 0 && ff < fa) out.push(forme(13, `cinq murs aux cotes ${fz(fa)} / ${fz(fd)} / ${fz(ff)} / ${fz(fg)}`, `façade ${fz(fa)}, mur droit ${fz(fd)}, mur du fond ${fz(ff)} d'équerre sur le mur gauche de ${fz(fg)}, et un pan à ${f1(Math.atan2(fg - fd, fa - ff) * 180 / Math.PI)}° entre les deux`, [Z[0], [Z[0][0] + fa, Z[0][1]], [Z[0][0] + fa, Z[0][1] + fd], [Z[0][0] + ff, Z[0][1] + fg], [Z[0][0], Z[0][1] + fg]]));
      else out.push(forme(13, `trapèze aux cotes ${fz(fa)} / ${fz(fd)} / ${fz(fg)}`, `façade ${fz(fa)}, mur droit ${fz(fd)}, mur gauche ${fz(fg)} : trois murs d'équerre calés sur le module de ${fz(mod)}, le fond en biais en découle`, [Z[0], [Z[0][0] + fa, Z[0][1]], [Z[0][0] + fa, Z[0][1] + fd], [Z[0][0], Z[0][1] + fg]]));
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
      v.porte = { ...v.porte, vitree: disp.porte_vitree !== false, debut_cm: rnd(s0, 1), chambranle_cm: ch, marge_cm: mg, hauteur_cm: rnd(Math.min(+(disp.porte_hauteur_cm || Hm), Hm - mg - ch), 1), tient: max >= min - 1e-6 };
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
    // place un lit selon sa spec (lit_pliant, ou lit_pliant_2 fusionne dessus) : contre un mur, ou libre avec ses preferences
    const place_lit = (spec: any) => {
      const LW = +spec.largeur_cm, LL = +spec.longueur_cm;
      const acces: Pt[][] = [];
      if (v.porte) {
        const k = v.porte.cote, a = r[k], c = r[(k + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        const s0 = v.porte.debut_cm, s1 = s0 + v.porte.largeur_cm, pr = ep + +(spec.acces_porte_cm ?? 60);
        acces.push([[a[0] + ux * s0, a[1] + uy * s0], [a[0] + ux * s1, a[1] + uy * s1], [a[0] + ux * s1 + nx * pr, a[1] + uy * s1 + ny * pr], [a[0] + ux * s0 + nx * pr, a[1] + uy * s0 + ny * pr]]);
      }
      const sous = !!spec.sous_bureau;
      const fixes = sous ? acces : [...v.bureaux.map((b: any) => b.brut), ...acces];
      // candidats : plaque contre la face interieure du mur `contre` (lit rabattable), sinon partout
      const candidats: { q: Pt[]; s?: number }[] = [];
      const kc = spec.contre ? v.noms_cotes.findIndex((nm: string) => nm.startsWith(spec.contre)) : -1;
      let mur: any = null;
      if (kc >= 0) {
        const a = r[kc], c = r[(kc + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        mur = { a, ux, uy, nx, ny };
        for (let s = 0; s + LL <= l; s += 1) candidats.push({ s, q: [[a[0] + ux * s + nx * ep, a[1] + uy * s + ny * ep], [a[0] + ux * (s + LL) + nx * ep, a[1] + uy * (s + LL) + ny * ep], [a[0] + ux * (s + LL) + nx * (ep + LW), a[1] + uy * (s + LL) + ny * (ep + LW)], [a[0] + ux * s + nx * (ep + LW), a[1] + uy * s + ny * (ep + LW)]] });
      } else {
        const xs = inter.map((z) => z[0]), ys = inter.map((z) => z[1]);
        // parallele_a : seules les orientations paralleles a ce mur (les deux sens) ; sinon toutes
        const kpa = spec.parallele_a ? v.noms_cotes.findIndex((nm: string) => nm.startsWith(spec.parallele_a)) : -1;
        const angle_mur = (i: number) => { const a = r[i], c = r[(i + 1) % r.length]; return Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI; };
        const angles = kpa >= 0 ? [angle_mur(kpa), angle_mur(kpa) + 180] : [0, 90, ...r.map((_a, i) => angle_mur(i))];
        for (const deg of angles) {
          const t = deg * Math.PI / 180, ca = Math.cos(t), sa = Math.sin(t);
          for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2)
            candidats.push({ q: [[x, y], [x + ca * LL, y + sa * LL], [x + ca * LL - sa * LW, y + sa * LL + ca * LW], [x - sa * LW, y + ca * LW]] });
        }
      }
      let best: any = null;
      {
        // pied_sous : le pied du lit va sous ce bureau (jusqu'a sa profondeur, rien sous les autres) ;
        // pres_de : le lit longe ce mur (distance au mur penalisee) ; sinon on evite les bureaux et on gene le moins les sieges
        const b_pied = spec.pied_sous ? v.bureaux.find((b: any) => b.cote === spec.pied_sous) : null;
        const kp = spec.pres_de ? v.noms_cotes.findIndex((nm: string) => nm.startsWith(spec.pres_de)) : -1;
        const dist_mur = (q: Pt[]) => {
          if (kp < 0) return 0;
          const a = r[kp], c = r[(kp + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), nx = -(c[1] - a[1]) / l, ny = (c[0] - a[0]) / l;
          return Math.min(...q.map((z) => Math.abs((z[0] - a[0]) * nx + (z[1] - a[1]) * ny)));
        };
        for (const { q, s } of candidats) {
          if (!q.every(dedans_int)) continue;
          if (!fixes.every((o: Pt[]) => poly_area(clip_convex(q, o)) < 1)) continue;
          const dessous = sous ? v.bureaux.reduce((s: number, b: any) => s + poly_area(clip_convex(q, b.brut)), 0) : 0;
          // sieges_ranges : les sieges seront pousses sous les bureaux, leur gene ne compte pas
          const gene = spec.sieges_ranges ? 0 : poses.reduce((s, o) => s + poly_area(clip_convex(q, o)), 0);
          let cout = dessous * 1000 + gene;
          if (b_pied) {
            const sous_pied = poly_area(clip_convex(q, b_pied.brut)), autres = dessous - sous_pied;
            if (sous_pied < LW * 20 || autres > 1) continue;
            cout = autres * 1000 + gene + dist_mur(q) * 50 + Math.abs(sous_pied - LW * b_pied.profondeur_cm * 0.9);
          } else if (kp >= 0) cout += dist_mur(q) * 50;
          if (!best || cout < best.cout - 1) best = { gene, dessous, cout, q, s };
        }
      }
      return best
        ? {
          largeur_cm: LW, longueur_cm: LL, tient: true, gene_sieges_m2: rnd(best.gene / 1e4, 2), sous_bureau_cm2: rnd(best.dessous, 0), polygone: best.q.map(([x, y]: Pt) => [rnd(x, 1), rnd(y, 1)]),
          // rabattable : replie a plat contre le mur, deux fixations (charnieres) sur la face interieure
          ...(mur ? (() => {
            const e = +(spec.epaisseur_replie_cm ?? 10), s0 = best.s, { a, ux, uy, nx, ny } = mur, at = (s: number, d: number): Pt => [a[0] + ux * s + nx * d, a[1] + uy * s + ny * d];
            const rep = [at(s0, ep), at(s0 + LL, ep), at(s0 + LL, ep + e), at(s0, ep + e)], fx = [at(s0 + 15, ep), at(s0 + LL - 15, ep)];
            return { contre: v.noms_cotes[kc], debut_cm: s0, replie: rep.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]), epaisseur_replie_cm: e, fixations: fx.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]) };
          })() : {}),
        }
        : { largeur_cm: LW, longueur_cm: LL, tient: false, polygone: [] };
    };
    if (disp.lit_pliant) {
      v.lit_pliant = place_lit(disp.lit_pliant);
      // second lit : la meme spec, surchargee (autre mur a longer, autre bureau sous le pied)
      v.lit_pliant_2 = disp.lit_pliant_2 ? place_lit({ ...disp.lit_pliant, ...disp.lit_pliant_2 }) : null;
    }
    // lits a demeure : chacun contre son mur, cale au debut du mur ; seuls les bureaux listes restent, reduits au
    // plus grand morceau hors du lit ; les sieges se rangent dessous (pousses au mur), sans toucher le lit ni l'autre siege
    v.lits_muraux = (disp.lits_muraux || []).map((lm: any) => {
      const k = v.noms_cotes.indexOf(lm.contre);
      if (k < 0) return null;
      const LW = +lm.largeur_cm, LL = +lm.longueur_cm, a = r[k], c = r[(k + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
      const at = (s: number, d: number): Pt => [a[0] + ux * s + nx * d, a[1] + uy * s + ny * d];
      const q = [at(ep, ep), at(ep + LL, ep), at(ep + LL, ep + LW), at(ep, ep + LW)];
      const touche = (z: Pt[]) => poly_area(clip_convex(z, q)) >= 1;
      const bureaux = (lm.bureaux || []).map((cote: string) => {
        const bu = v.bureaux.find((b: any) => b.cote === cote);
        if (!bu) return null;
        const morceaux = q.flatMap((p0, i) => [true, false].map((g) => clip_half(bu.brut, p0, q[(i + 1) % 4], g))).filter((z) => z.length >= 3 && !touche(z));
        const bq = morceaux.sort((x, y) => poly_area(y) - poly_area(x))[0];
        return bq ? { cote, brut: bq } : null;
      }).filter(Boolean);
      const ranges: Pt[][] = [];
      const sieges = (v.sieges || []).filter((st: any) => st.tient !== false).map((st: any) => {
        for (const bu of bureaux) {
          const i = v.noms_cotes.indexOf(bu.cote), a2 = r[i], c2 = r[(i + 1) % r.length], l2 = Math.hypot(c2[0] - a2[0], c2[1] - a2[1]), u2x = (c2[0] - a2[0]) / l2, u2y = (c2[1] - a2[1]) / l2, n2x = -u2y, n2y = u2x;
          const W = +st.largeur_cm, Dp = +st.profondeur_cm, d0 = ep + 4, at2 = (s: number, d: number): Pt => [a2[0] + u2x * s + n2x * d, a2[1] + u2y * s + n2y * d];
          for (let s0 = ep + 4; s0 + W <= l2 - ep - 4; s0 += 2) {
            const z = [at2(s0, d0), at2(s0 + W, d0), at2(s0 + W, d0 + Dp), at2(s0, d0 + Dp)];
            // sous le bureau : l'assise (sauf 14 cm de dossier) tient dans le morceau garde
            const dessous = poly_area(clip_convex(z, bu.brut)) >= W * Math.min(Dp, 60 - 4) * 0.75;
            if (z.every(dedans_int) && dessous && !touche(z) && ranges.every((o) => poly_area(clip_convex(z, o)) < 1)) { ranges.push(z); return { type: st.type, contre: bu.cote, polygone: z.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]) }; }
          }
        }
        return null;
      }).filter(Boolean);
      const pts = (z: Pt[]) => z.map(([x, y]) => [rnd(x, 1), rnd(y, 1)]);
      return { nom: lm.nom, largeur_cm: LW, longueur_cm: LL, contre: lm.contre, tete: lm.tete || "fond", tient: q.every(dedans_int), polygone: pts(q), bureaux: bureaux.map((b: any) => ({ cote: b.cote, polygone: pts(b.brut) })), sieges };
    }).filter(Boolean);
    for (const b of v.bureaux) delete b.brut;
    v.bureaux_m2 = rnd(occ / 1e4, 2);
    v.sol_libre_m2 = rnd((poly_area(inter) - occ) / 1e4, 2);
  }
  return out.sort((a, b) => a.id - b.id);
}

/* ----------------------------------------------------------------- */
/* SVG (plans + elevations)                                           */
/* ----------------------------------------------------------------- */
// nu = planche de la page : pas de fond (la carte est blanche), largeur et hauteur reelles pour que la boite epouse le dessin
function svgHeader(w: number, h: number, nu = false): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${nu ? ` width="${w}" height="${h}"` : ""} font-family="system-ui,sans-serif" font-size="13">\n${nu ? "" : `<rect width="${w}" height="${h}" fill="#fbfbf8"/>\n`}`;
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
// legende des limites de propriete : mur (trait brun) et grillage (pointille vert)
export const legende_clotures = (d: any) => {
  const types = new Set((d.murs || []).map((w: any) => w.type));
  const parts = [types.has("palissade") ? "brun = palissade bois" : "", types.has("mur") ? "brun = mur" : "", types.has("grillage") ? "vert pointillé = grillage" : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "brun = mur de propriété";
};
export function entete_implantation(v: any, d: any): EntetePlan {
  return { nom: "Implantation sur la dalle", detail: `abri ${v.aire_m2} m² sur ${d.aire_m2} m² de dalle`, lignes: [`${legende_clotures(d)} · orange = distance aux bords · vert = passage derrière · hachures = rangement caché`] };
}
export function plan_dalle_svg(g: any, avecBandes = false, v: any = null, m: any = null, sans_entete = false): string {
  const d = g.dalle;
  const zu = !m && (avecBandes || v) ? d.zone_utile : null;
  const q: Pt[] = d.polygone;
  const n = q.length, scale = 1.25, pad = sans_entete ? 85 : 110, top = sans_entete ? 0 : 90;
  const xs = q.map((v) => v[0]), ys = q.map((v) => v[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const pw = v && v.porte ? v.porte.largeur_cm * scale - 60 : 0;
  const W = (maxx - minx) * scale + 2 * pad + (v && v.porte && v.porte.cote !== 0 ? Math.max(0, pw) : 0);
  const H = (maxy - miny) * scale + pad + top + 40 + (v && v.porte && v.porte.cote === 0 ? Math.max(0, pw) : 0);
  const P = (v: Pt) => [pad + (v[0] - minx) * scale, top + 40 + (maxy - v[1]) * scale];
  const mur = new Set(d.murs.map((w: any) => w.cote));
  const BRUN = "#5b4a3a", GRIS = "#6f675a", COTE = "#2b5d8a", ANGLE = "#b0452a", GRILLAGE = "#5f8a4a";
  const leg_cloture = legende_clotures(d);
  let svg = svgHeader(rnd(W), rnd(H), sans_entete);
  if (zu) svg += `<defs><pattern id="bande" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f3e3cf"/><line x1="0" y1="0" x2="0" y2="7" stroke="#e0b98a" stroke-width="2"/></pattern></defs>\n`;
  svg += poly(q.map(P), zu ? "url(#bande)" : "#e9e5da", GRIS, 2);
  if (zu) svg += poly(zu.polygone.map(P), "#e3efe0", "#2a8a4a", 1.8, v ? "5 4" : "");
  // cotes : ligne parallele a l'exterieur, rappels, texte dans l'axe du cote (toujours lisible)
  q.forEach((a, i) => {
    const b = q[(i + 1) % n], pa = P(a), pb = P(b);
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const ux = (pb[0] - pa[0]) / len, uy = (pb[1] - pa[1]) / len;
    const nx = -uy, ny = ux;                     // exterieur (antihoraire en monde = horaire en SVG)
    const est_mur = mur.has(d.cotes_noms[i]), cloture = d.murs.find((w: any) => w.cote === d.cotes_noms[i]);
    if (est_mur && cloture && cloture.type === "grillage") svg += line(pa[0] + nx * 3, pa[1] + ny * 3, pb[0] + nx * 3, pb[1] + ny * 3, GRILLAGE, 3, "7 4");
    else if (est_mur) svg += line(pa[0] + nx * 4, pa[1] + ny * 4, pb[0] + nx * 4, pb[1] + ny * 4, BRUN, 6);
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
    const dsc = P(m.toit.gouttiere.descente);
    for (const tr of m.toit.gouttiere.troncons) { const g0 = P(tr.de), g1 = P(tr.a); svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 4); }
    svg += `<circle cx="${f1(dsc[0])}" cy="${f1(dsc[1])}" r="5" fill="#1b6fa8"/>\n`;
  }
  if (m && v && v.arriere) {
    svg += `<defs><pattern id="cache" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#6b8e23" stroke-width="1.6"/></pattern></defs>\n`;
    for (const zone of v.arriere.polygones) svg += poly(zone.map(P), "url(#cache)", "#6b8e23", 1);
    const derniere = v.arriere.polygones[v.arriere.polygones.length - 1];      // etiquette dans la zone du dernier mur de fond, loin de la cote du passage
    const zx = derniere.map((z: Pt) => z[0]), zy = derniere.map((z: Pt) => z[1]);
    const c = P([(Math.min(...zx) + Math.max(...zx)) / 2 - 20, (Math.min(...zy) + Math.max(...zy)) / 2 + 12]);
    svg += text(c[0], c[1], `rangement caché`, "middle", "#4f6b18", 11, "bold") + text(c[0], c[1] + 13, `${v.arriere.aire_m2} m²`, "middle", "#4f6b18", 11, "bold");
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
    if (!sans_entete) svg += dessine_entete(W, entete_implantation(v, d));
  } else if (v) {
    if (!sans_entete) {
      svg += text(W / 2, 26, `Option ${v.id} · ${v.titre}`, "middle", "#222", 15, "bold");
      svg += text(W / 2, 46, `murs ${v.aire_m2} m² · intérieur ${v.aire_interieure_m2} m² · ${v.polygone.length} côtés`, "middle", "#2b5d8a", 13, "bold");
      svg += text(W / 2, 64, v.note, "middle", "#666", 11);
    }
  } else svg += text(W / 2, 26, zu ? `Dalle réelle ${d.aire_m2} m² · zone utile ${zu.aire_m2} m²` : `Dalle réelle · ${n} côtés · ${d.aire_m2} m²`, "middle", "#222", 15, "bold");
  if (!v) svg += text(W / 2, 44, `vue de dessus · cotes relevées au mètre · somme des angles ${f0(somme)}°`, "middle", "#888", 11);
  if (!v) svg += text(W / 2, H - 30, "* angles avant supposés droits", "middle", "#888", 10);
  // une forme dans la zone utile : la legende tient sur deux lignes, une seule depasse du dessin
  if (v && !m) svg += text(W / 2, H - 26, `AVANT (jardin) · ${leg_cloture}`, "middle", "#666", 11) + text(W / 2, H - 12, "vert pointillé = zone utile · trait coloré = passage (cm)", "middle", "#666", 11);
  else svg += text(W / 2, H - 12, `AVANT (jardin) · ${leg_cloture}`, "middle", "#666", 11);
  svg += "</svg>\n";
  return svg;
}

/* ----------------------------------------------------------------- */
export function buildCore(p: Params) {
  const g = geometry(p);
  const svg: Record<string, string> = {};
  if (g.dalle) svg["plan-dalle"] = plan_dalle_svg(g);
  const vars = variantes(p, g);
  // modele 2D de la forme retenue (option 13 amenagee)
  const v13 = vars.find((v: any) => v.id === 13 && v.bureaux);
  const modele: any = v13 ? modele_trapeze(p, v13) : null;
  if (modele) modele.budget = budget_modele(p, v13, modele);
  if (modele) modele.guide = guide_montage(p, v13, modele);
  const modele3d = modele && g.dalle ? modele3d_abri(p, g, v13, modele) : null;
  if (modele) {
    svg["modele-implantation"] = plan_dalle_svg(g, false, v13, modele);
    svg["modele-sol"] = modele_sol_svg(p, v13, modele);
    svg["modele-toit"] = modele_toit_svg(v13, modele);
    svg["modele-rehausse"] = modele_rehausse_svg(modele);
    for (const f of modele.faces) svg[`modele-facade-${f.cle}`] = modele_facade_svg(modele, f);
  }
  // planches de la page : le meme corps que les fichiers SVG, l'entete a part (la page la rend en texte)
  const planches: Record<string, Planche> = {};
  if (modele && g.dalle) {
    planches.implantation = { ...entete_implantation(v13, g.dalle), svg: plan_dalle_svg(g, false, v13, modele, true) };
    planches.resume = { nom: "Résumé", lignes: [], svg: resume_svg(g, v13, modele) };
    planches.sol = { ...entete_sol(p, v13), svg: modele_sol_svg(p, v13, modele, true) };
    planches.toit = { ...entete_toit(modele), svg: modele_toit_svg(v13, modele, true) };
    planches.rehausse = { ...entete_rehausse(modele), svg: modele_rehausse_svg(modele, true) };
    const plus_long = Math.max(...modele.faces.map((f: any) => f.longueur_cm));
    for (const f of modele.faces) planches[`facade-${f.cle}`] = { ...entete_facade(f), svg: modele_facade_svg(modele, f, true, plus_long) };
  }
  return { geometrie: g, variantes: vars, modele, modele3d, svg, planches };
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
  const H = +p.murs.hauteur_cm, c = +t.chute_cm, mod = +p.panneau.largeur_utile_cm;
  const y0 = Math.min(...q.map((z) => z[1])), D = Math.max(...q.map((z) => z[1])) - y0;
  const x0 = Math.min(...q.map((z) => z[0])), Wd = Math.max(...q.map((z) => z[0])) - x0;
  // sens = arriere : haut devant, bas au fond ; sens = droite : haut contre le mur gauche, bas cote jardin
  const droite = t.sens === "droite", course = droite ? Wd : D;
  const h = (z: Pt) => H + c * (1 - (droite ? (z[0] - x0) / Wd : (z[1] - y0) / D));
  const porte_h = v.porte && v.porte.hauteur_cm ? +v.porte.hauteur_cm : +(d.porte_hauteur_cm || p.porte.hauteur_cm);
  const faces = q.map((a, i) => {
    const b = q[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const deux_fonds = v.noms_cotes.filter((nm: string) => lettre(nm) === "B").length > 1;
    const F = deux_fonds && v.noms_cotes[i] === "fond en biais" ? "C" : lettre(v.noms_cotes[i]);
    const panneaux: any[] = [];
    // panneaux_depuis_la_fin : les modules entiers partent du bout du mur, la bande recoupee vient en tete
    // (mur de la porte : le module entier du fond recoit le cadre, la bande reste pleine cote facade)
    const reste = L - Math.floor((L + 0.05) / mod) * mod;
    const tete = (d.panneaux_depuis_la_fin || []).includes(v.noms_cotes[i]) && reste > 0.05 ? reste : 0;
    if (tete) panneaux.push({ id: `${F}1`, debut_cm: 0, largeur_cm: rnd(tete, 1) });
    for (let s = tete, k = tete ? 2 : 1; s < L - 0.05; s += mod, k++) panneaux.push({ id: `${F}${k}`, debut_cm: rnd(s, 1), largeur_cm: rnd(Math.min(mod, L - s), 1) });
    const ouvertures: any[] = [];
    if (v.porte && v.porte.cote === i) ouvertures.push({ type: "porte", vitree: v.porte.vitree !== false, debut_cm: v.porte.debut_cm, largeur_cm: v.porte.largeur_cm, allege_cm: 0, hauteur_cm: porte_h, chambranle_cm: v.porte.chambranle_cm || 0 });
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
  const decal = faces.map((f) => -(f.cle === "A" ? +deb.avant : f.cle === "B" || f.cle === "C" ? +deb.arriere : f.cle === "D" ? +(deb.droite ?? cotes) : +(deb.gauche ?? cotes)));
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
  const egouts = contour.map((a, i) => ({ a, b: contour[(i + 1) % n], cle: faces[i].cle })).filter(({ a, b }) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l;     // normale exterieure (antihoraire)
    return (droite ? nx : ny) > 0.2;
  });
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
      // plan du toit : hauteur du dessous du toit = haut_cm au depart de la pente, bas_cm au bout de la course
      plan: { sens: droite ? "droite" : "arriere", origine_cm: rnd(droite ? x0 : y0, 1), course_cm: rnd(course, 1), haut_cm: H + c, bas_cm: H },
      panneaux: panneaux_toit, debord_cm: { avant: +deb.avant, arriere: +deb.arriere, droite: +(deb.droite ?? cotes), gauche: +(deb.gauche ?? cotes) }, gouttiere: { face: droite ? "D" : "B", de: g0.map((z) => rnd(z, 1)), a: g1.map((z) => rnd(z, 1)),
        troncons: egouts.map(({ a, b, cle }) => ({ face: cle, de: a.map((z) => rnd(z, 1)), a: b.map((z) => rnd(z, 1)), longueur_cm: rnd(Math.hypot(b[0] - a[0], b[1] - a[1]), 1) })),
        longueur_cm: rnd(egouts.reduce((s, { a, b }) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0), 1), descente: ((): Pt => {
          if (t.descente !== "droite" && t.descente !== "gauche") return bas;
          const bouts = egouts.flatMap(({ a, b }) => [a, b]);
          return bouts.reduce((m, z) => ((t.descente === "droite" ? z[0] > m[0] + 1e-6 : z[0] < m[0] - 1e-6) ? z : m), bouts[0] || bas);
        })().map((z) => rnd(z, 1)) },
    },
    interieur: inset_ordre(q, +p.panneau.epaisseur_mm / 10).map(([a, b]) => [rnd(a, 1), rnd(b, 1)]),
    panneaux_mur_a_commander: panneaux_mur,
    formalites: formalites(p, v.aire_m2, rnd(poly_area(contour) / 1e4, 2), v.aire_interieure_m2),
    angles_deg: v.angles_deg,
  };
}

// scene 3D de l'abri retenu : dalle, murs de propriete, murs (panneaux, ouvertures, rehausse), toit, gouttiere, mobilier.
// cm, repere de la dalle ; pur (la scene Three.js vit dans viewer_abri.ts)
export function modele3d_abri(p: Params, g: any, v: any, m: any) {
  const d = g.dalle, abs = (z: Pt): Pt => z;
  const pl = p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? +p.amenagement.plancher.epaisseur_cm : 0;
  const sec = m.rehausse.section_mm;
  return {
    dalle: d.polygone.map(abs),
    murs_propriete: d.mur_hauteur_cm > 0 ? d.murs.map((w: any) => ({ cote: w.cote, type: w.type, de: abs(w.de), a: abs(w.a), hauteur_cm: w.type === "grillage" ? d.grillage_hauteur_cm : d.mur_hauteur_cm, epaisseur_cm: w.type === "grillage" ? 1 : w.type === "palissade" ? d.palissade_epaisseur_cm : d.mur_epaisseur_cm, travee_cm: d.palissade_travee_cm })) : [],
    epaisseur_cm: +p.panneau.epaisseur_mm / 10,
    sol: { polygone: m.interieur, epaisseur_cm: pl },
    murs: m.faces.map((f: any, i: number) => ({
      cle: f.cle, nom: f.nom, de: f.de, a: f.a, longueur_cm: f.longueur_cm, hauteur_mur_cm: f.hauteur_mur_cm,
      angle_debut_deg: m.angles_deg[i], angle_fin_deg: m.angles_deg[(i + 1) % m.faces.length],
      hauteur_debut_cm: f.hauteur_debut_cm, hauteur_fin_cm: f.hauteur_fin_cm,
      panneaux: f.panneaux.map((pn: any) => ({ id: pn.id, debut_cm: pn.debut_cm, largeur_cm: pn.largeur_cm })),
      ouvertures: f.ouvertures,
    })),
    rehausse_epaisseur_cm: +sec[0] / 10,
    rehausse_pieces: m.rehausse.pieces.map((r: any) => ({ id: r.id, face: r.face })),
    toit: { contour: m.toit.contour, plan: m.toit.plan, epaisseur_cm: +p.panneau.epaisseur_mm / 10, panneaux: m.toit.panneaux.map((t: any) => ({ id: t.id, polygone: t.polygone })) },
    gouttiere: { troncons: m.toit.gouttiere.troncons, descente: m.toit.gouttiere.descente },
    mobilier: {
      bureaux: (v.bureaux || []).map((b: any) => ({ cote: b.cote, polygone: b.polygone })),
      sieges: (v.sieges || []).filter((st: any) => st.tient !== false).map((st: any) => ({ type: st.type, contre: st.contre, polygone: st.polygone })),
      lit: v.lit_pliant && v.lit_pliant.tient ? { polygone: v.lit_pliant.polygone, replie: v.lit_pliant.replie || null } : null,
      lit2: v.lit_pliant_2 && v.lit_pliant_2.tient ? { polygone: v.lit_pliant_2.polygone } : null,
      lits_muraux: (v.lits_muraux || []).filter((lm: any) => lm.tient).map((lm: any) => ({ nom: lm.nom, polygone: lm.polygone, tete: lm.tete, bureaux: lm.bureaux.map((b: any) => b.polygone), sieges: lm.sieges })),
    },
  };
}

export function budget_modele(p: Params, v: any, m: any) {
  // materiaux seulement, quantites calculees, prix TTC de prix_materiaux_eur_ttc : voir chantier.ts
  return nomenclature_abri(p, v, m);
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
// resume de la page d'accueil : un seul dessin nu, sans fond ni entete. L'abri sur la dalle : longueur et lettre de
// chaque mur et angle de chaque coin a l'interieur du contour, marges (gauche, devant, droite, passage) hors de la dalle
export function resume_svg(g: any, v: any, m: any): string {
  const d = g.dalle, dalle: Pt[] = d.polygone, q: Pt[] = v.polygone;
  const xs = dalle.map((z) => z[0]), ys = dalle.map((z) => z[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  // petite echelle et marges serrees : affiche en pleine largeur, le texte en ressort plus gros
  const scale = 0.5, padx = 24, pady = 14, W = (maxx - minx) * scale + 2 * padx, H = (maxy - miny) * scale + 2 * pady;
  const P = (z: Pt) => [padx + (z[0] - minx) * scale, pady + (maxy - z[1]) * scale];
  const qx = q.map((z) => z[0]), qy = q.map((z) => z[1]), gx = Math.min(...qx), dx = Math.max(...qx), av = Math.min(...qy), ymid = (av + Math.max(...qy)) / 2;
  const mur = new Set(d.murs.map((w: any) => w.cote)), grillage = new Set(d.murs.filter((w: any) => w.type === "grillage").map((w: any) => w.cote));
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rnd(W)} ${rnd(H)}" width="${rnd(W)}" height="${rnd(H)}" font-family="system-ui,sans-serif" font-size="11">\n`;
  svg += poly(dalle.map(P), "#f3f1ec", "#b5b0a5", 1.2);
  dalle.forEach((a, i) => {
    const nom = d.cotes_noms[i]; if (!mur.has(nom)) return;
    const b = dalle[(i + 1) % dalle.length], pa = P(a), pb = P(b);
    svg += grillage.has(nom) ? line(pa[0], pa[1], pb[0], pb[1], "#5f8a4a", 2.5, "5 3") : line(pa[0], pa[1], pb[0], pb[1], "#5b4a3a", 4);
  });
  svg += poly(q.map(P), "#dbe6f0", "#2b5d8a", 2);
  // murs : la lettre dans un carre pose sur le trait, la longueur ecrite le long du mur juste dedans ;
  // a chaque coin un petit arc et la valeur de l'angle sur la bissectrice interieure
  m.faces.forEach((f: any, i: number) => {
    const a = P(f.de), b = P(f.a), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = uy, ny = -ux;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    // angle du texte le long du mur, toujours lisible (jamais a l'envers)
    let deg = Math.atan2(uy, ux) * 180 / Math.PI; if (deg > 90 || deg < -90) deg += 180;
    const tx = mx + nx * 11, ty = my + ny * 11;
    svg += `<text x="${f1(tx)}" y="${f1(ty)}" transform="rotate(${f1(deg)} ${f1(tx)} ${f1(ty)})" text-anchor="middle" dominant-baseline="middle" fill="#1f5a8c" font-size="10.5" font-weight="bold">${fr1(f.longueur_cm)}</text>\n`;
    svg += `<rect x="${f1(mx - 7)}" y="${f1(my - 7)}" width="14" height="14" rx="3" fill="#1c2530" stroke="#fff" stroke-width="1.2"/>\n`;
    svg += `<text x="${f1(mx)}" y="${f1(my + 0.5)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="9" font-weight="bold" font-family="ui-monospace,Menlo,monospace">${f.cle}</text>\n`;
    const p0 = P(q[i]), prev = P(q[(i - 1 + q.length) % q.length]), next = P(q[(i + 1) % q.length]);
    const v1 = [prev[0] - p0[0], prev[1] - p0[1]], v2 = [next[0] - p0[0], next[1] - p0[1]], l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const r = 13, e1 = [p0[0] + v1[0] / l1 * r, p0[1] + v1[1] / l1 * r], e2 = [p0[0] + v2[0] / l2 * r, p0[1] + v2[1] / l2 * r];
    // l'arc est centre sur le coin : il bombe vers l'interieur
    const sweep = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 1 : 0;
    svg += `<path d="M ${f1(e1[0])} ${f1(e1[1])} A ${r} ${r} 0 0 ${sweep} ${f1(e2[0])} ${f1(e2[1])}" fill="none" stroke="#b0452a" stroke-width="1.2"/>\n`;
    const bx = v1[0] / l1 + v2[0] / l2, by = v1[1] / l1 + v2[1] / l2, bl = Math.hypot(bx, by) || 1;
    svg += text(p0[0] + bx / bl * 27, p0[1] + by / bl * 27 + 3, `${fr1(m.angles_deg[i])}°`, "middle", "#b0452a", 8.5);
  });
  // marges : trait entre l'abri et le bord, libelle hors de la dalle
  const marge = (a: Pt, b: Pt, label: string, ou: "gauche" | "bas" | "droite", col = "#b86e1f") => {
    const pa = P(a), pb = P(b);
    svg += line(pa[0], pa[1], pb[0], pb[1], col, 1.4);
    if (ou === "gauche") svg += text(pa[0] - 4, pa[1] + 4, label, "end", col, 10.5, "bold");
    else if (ou === "bas") svg += text(pa[0], pa[1] + 12, label, "middle", col, 10.5, "bold");
    else svg += text(pb[0] + 4, pb[1] + 4, label, "start", col, 10.5, "bold");
  };
  // les traits de marge passent pres de la facade, loin des libelles des murs G et D (au milieu de leur mur)
  const yb = av + 40;
  marge([0, yb], [gx, yb], `${fr1(gx)}`, "gauche");
  marge([(gx + dx) / 2, 0], [(gx + dx) / 2, av], `${fr1(av)}`, "bas");
  marge([dx, yb], [d.avant, yb], `${fr1(rnd(d.avant - dx, 1))}`, "droite");
  const pas = v.passages.find((x: any) => x.cote === "arriere_droite");
  if (pas && pas.segment) {
    const [s0, s1] = pas.segment, pa = P(s0), pb = P(s1), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    svg += line(pa[0], pa[1], pb[0], pb[1], "#b86e1f", 1.4);
    // le libelle du passage est au-dela du mur, hors de la dalle, dans le prolongement du trait
    svg += text(pb[0] + (pb[0] - pa[0]) / L * 18 + 3, pb[1] + (pb[1] - pa[1]) / L * 18 + 2, `${fr1(pas.cm)}`, "middle", "#b86e1f", 10.5, "bold");
  }
  return svg + "</svg>\n";
}

// entete d'un plan : la lettre de face (A, D, T, R), le nom, un detail chiffre, des lignes de legende.
// dessinee dans le fichier SVG (image autonome) ; la page la rend en texte et prend le corps seul (sans_entete)
export interface EntetePlan { lettre?: string; nom: string; detail?: string; lignes: string[] }
export interface Planche extends EntetePlan { svg: string }
export const titre_plan = (e: EntetePlan) => `${e.lettre ? `Face ${e.lettre} · ` : ""}${e.nom}${e.detail ? ` · ${e.detail}` : ""}`;
const hauteur_entete = (e: EntetePlan) => 34 + 18 * e.lignes.length;
function dessine_entete(W: number, e: EntetePlan): string {
  let svg = text(W / 2, 26, titre_plan(e), "middle", "#222", 15, "bold");
  e.lignes.forEach((l, i) => { svg += text(W / 2, 46 + 18 * i, l, "middle", i === 0 ? "#888" : "#666", 11); });
  return svg;
}

function cadre_plan(pts: Pt[], scale: number, pad: number, top: number) {
  const xs = pts.map((z) => z[0]), ys = pts.map((z) => z[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const W = (maxx - minx) * scale + 2 * pad, H = (maxy - miny) * scale + 2 * pad + top;
  return { W, H, P: (z: Pt) => [pad + (z[0] - minx) * scale, top + pad + (maxy - z[1]) * scale] };
}

export function entete_sol(p: Params, v: any): EntetePlan {
  const lignes = [`murs ${fz(+p.panneau.epaisseur_mm / 10)} cm · porte ${fz(v.porte.largeur_cm)} ouvrant dehors · fenêtres en bleu${v.sol_libre_m2 != null ? ` · sol libre ${v.sol_libre_m2} m²` : ""}${v.lit_pliant && v.lit_pliant.tient ? " · violet pointillé = lit déplié" : ""}`];
  return { nom: "Plan de sol", detail: `murs ${v.aire_m2} m² · intérieur ${v.aire_interieure_m2} m²`, lignes };
}
export function modele_sol_svg(p: Params, v: any, m: any, sans_entete = false): string {
  const q: Pt[] = v.polygone, n = q.length, scale = 1.6;
  const { W, H, P } = cadre_plan(q, scale, sans_entete ? 108 : 120, sans_entete ? 0 : 50);
  let svg = svgHeader(rnd(W), rnd(H), sans_entete);
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
  if (!sans_entete) svg += dessine_entete(W, entete_sol(p, v));
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}

export function entete_toit(m: any): EntetePlan {
  const T = m.toit;
  return { lettre: "T", nom: "Toiture", detail: `${T.panneaux.length} panneaux · ${T.aire_m2} m² couverts`, lignes: [`panneaux dans le sens de la pente (longueur = rampant) · murs en pointillé · ${m.sens === "droite" ? "égout côté jardin (droite), haut contre le mur gauche" : "débords avant et fond"}`] };
}
export function modele_toit_svg(v: any, m: any, sans_entete = false): string {
  const T = m.toit, scale = 1.6;
  const { W, H, P } = cadre_plan(T.contour, scale, sans_entete ? 85 : 110, sans_entete ? 0 : 50);
  let svg = svgHeader(rnd(W), rnd(H), sans_entete);
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
  const dsc = P(T.gouttiere.descente);
  for (const tr of T.gouttiere.troncons) { const g0 = P(tr.de), g1 = P(tr.a); svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 6); }
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
  if (!sans_entete) svg += dessine_entete(W, entete_toit(m));
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}
const fr1 = (x: number) => String(x).replace(".", ",");

export function entete_rehausse(m: any): EntetePlan {
  const R = m.rehausse;
  return { lettre: "R", nom: "Rehausse bois", detail: `${R.pieces.length} pièces dans ${R.nb_madriers} madrier${R.nb_madriers > 1 ? "s" : ""}`, lignes: ["hauteur de chaque pièce : de son début à sa fin, dans le sens de la face (vue de l'extérieur, de gauche à droite)"] };
}
export function modele_rehausse_svg(m: any, sans_entete = false): string {
  const R = m.rehausse, section = +R.section_mm[1] / 10, stock = R.longueur_stock_cm, sx = 1.9, sy = 3.2, pad = sans_entete ? 20 : 50, gap = 60, ent = sans_entete ? 20 : 70;
  const W = stock * sx + 2 * pad, H = ent + R.barres.length * (section * sy + gap) + (sans_entete ? 10 : 30);
  let svg = svgHeader(rnd(W), rnd(H), sans_entete);
  R.barres.forEach((b: any, k: number) => {
    const top = ent + k * (section * sy + gap), X = (x: number) => pad + x * sx, Y = (h: number) => top + (section - h) * sy;
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
  if (!sans_entete) svg += dessine_entete(W, entete_rehausse(m));
  return svg + "</svg>\n";
}

export function entete_facade(f: any): EntetePlan {
  return { lettre: f.cle, nom: f.nom, lignes: [`vue de l'extérieur · ${f.panneaux.length} panneau${f.panneaux.length > 1 ? "x" : ""} de ${fz(f.hauteur_mur_cm)} · hauteurs finies aux deux bouts`] };
}
// largeur_commune : toutes les elevations de la page ont la meme boite (celle du mur le plus long), dessin cale a gauche
export function modele_facade_svg(m: any, f: any, sans_entete = false, largeur_commune = 0): string {
  const scale = 1.25, pad = sans_entete ? 30 : 60, top = sans_entete ? 0 : 50, L = f.longueur_cm, Hm = f.hauteur_mur_cm, h0 = f.hauteur_debut_cm, h1 = f.hauteur_fin_cm;
  const W = Math.max(L, largeur_commune) * scale + 2 * pad + 60, H = Math.max(...m.hauteurs_coins_cm, h0, h1) * scale + 2 * pad + top + 30;
  const P = (x: number, h: number) => [pad + 30 + x * scale, H - pad - 30 - h * scale];
  let svg = svgHeader(rnd(W), rnd(H), sans_entete);
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
    svg += `<rect x="${f1(a[0])}" y="${f1(b[1])}" width="${f1(b[0] - a[0])}" height="${f1(a[1] - b[1])}" fill="${o.type === "porte" && o.vitree === false ? "#c9cfd4" : "#bfe3ef"}" stroke="${col}" stroke-width="2"/>\n`;
    const c = P(o.debut_cm + o.largeur_cm / 2, o.allege_cm + o.hauteur_cm / 2);
    svg += text(c[0], c[1] - 4, o.type === "porte" ? (o.vitree === false ? "porte pleine" : "porte") : o.ouvrant ? "fenêtre ouvrante" : "fenêtre fixe", "middle", col, 11, "bold");
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
  if (!sans_entete) svg += dessine_entete(W, entete_facade(f));
  return svg + "</svg>\n";
}

/* ----------------------------------------------------------------- */
/* Page de l'abri retenu (markdown, genere par le CLI)                */
/* ----------------------------------------------------------------- */
// les etudes archivees et la page des formes vivent sous etudes/ ; les liens sont ecrits depuis la racine du depot
export const DOSSIER_ETUDES = "etudes";

// position de la descente en mots, d'apres ses coordonnees dans l'emprise de l'abri
export function ou_descente(m: any): string {
  const xs = m.faces.flatMap((f: any) => [f.de[0], f.a[0]]), ys = m.faces.flatMap((f: any) => [f.de[1], f.a[1]]);
  const [x, y] = m.toit.gouttiere.descente, mx = (Math.min(...xs) + Math.max(...xs)) / 2, y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cote = x > mx ? "droit" : "gauche";
  if (y < y0 + (y1 - y0) * 0.2) return `devant à ${cote === "droit" ? "droite" : "gauche"}, côté jardin`;
  return y > y0 + (y1 - y0) * 0.85 ? `au coin arrière ${cote}` : `à l'arrière du mur ${cote}, à l'entrée du passage`;
}

// valeurs calculees que les textes de l'abri citent par {champ}
export function injecteur(v: any, m: any): (s: string) => string {
  const fr = (x: number) => String(x).replace(".", ",");
  const po = v.porte, derriere = v.passages.find((q: any) => q.cote === "arriere_droite");
  const valeurs: Record<string, string> = {
    arriere_m2: v.arriere ? fr(v.arriere.aire_m2) : "?", arriere_profondeur_cm: v.arriere ? fz(v.arriere.profondeur_max_cm) : "?",
    passage_cm: fz(Math.floor(derriere.cm)), porte_cm: fz(po.largeur_cm),
    murs_m2: fr(v.aire_m2), interieur_m2: fr(v.aire_interieure_m2), sol_libre_m2: fr(v.sol_libre_m2),
    gauche_cm: fz(Math.min(...v.polygone.map((z: Pt) => z[0]))),
    debord_droite_cm: fz(m.toit.debord_cm.droite), debord_avant_cm: fz(m.toit.debord_cm.avant), debord_arriere_cm: fz(m.toit.debord_cm.arriere),
    gouttiere_cm: fz(m.toit.gouttiere.longueur_cm), pente_pourcent: fr(m.pente.pourcent), portee_m: fr(rnd(m.portee_cm / 100, 1)), descente: ou_descente(m),
    panneaux_toit: String(m.toit.panneaux.length), hauteur_facade_cm: fr(m.hauteurs_coins_cm[0]), madriers: String(m.rehausse.nb_madriers),
    pan_cm: fr((m.faces.find((f: any) => f.cle === "C") || m.faces[2]).longueur_cm),
  };
  return (s: string) => s.replace(/\{(\w+)\}/g, (tout, k) => (k in valeurs ? valeurs[k] : tout));
}

// textes de l'abri (params.abri.dossier), champs remplaces : points forts, points faibles, questions, idees a explorer
export function textes_abri(p: Params, core: any) {
  const v = core.variantes.find((x: any) => x.id === 13), dossier = p.abri && p.abri.dossier;
  if (!v || !core.modele || !dossier) return null;
  const injecte = injecteur(v, core.modele), liste = (k: string): string[] => (dossier[k] || []).map(injecte);
  return { atouts: liste("atouts"), limites: liste("limites"), questions: liste("questions"), idees: liste("idees") };
}

export function abri_md(p: Params, core: any): string {
  const m = core.modele, v = core.variantes.find((x: any) => x.id === 13);
  if (!m || !v) return "";
  const droite = m.sens === "droite";
  const fr = (x: number) => String(x).replace(".", ",");
  const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
  const d = p.disposition_trapeze, po = v.porte, lp = v.lit_pliant, B = m.budget;
  const ep = +p.panneau.epaisseur_mm / 10, seuil = +(p.reglementaire && p.reglementaire.seuil_sans_formalite_m2) || 5;
  const derriere = v.passages.find((q: any) => q.cote === "arriere_droite");
  let md = `# ${(p.abri && p.abri.titre) || "Abri de jardin"}\n\n`;
  md += `> Généré par \`npm run emit\` depuis \`params.json\` et \`site/src/compute.ts\` : ne pas éditer à la main. Études archivées et autres formes étudiées : [${DOSSIER_ETUDES}/variantes.md](${DOSSIER_ETUDES}/variantes.md).\n\n`;
  md += `![implantation sur la dalle](site/assets/modele-implantation.svg)\n\n`;
  md += `## En bref\n\n`;
  md += `- **Dalle existante** : ${fr(core.geometrie.dalle.aire_m2)} m², côtés ${core.geometrie.dalle.cotes_cm.map(fz).join(" / ")} cm, murs de propriété à gauche et au fond.\n`;
  md += `- **${fr(v.aire_interieure_m2)} m² intérieur** (${fr(v.aire_m2)} m² de murs), ${fr(derriere.cm)} cm de passage derrière.\n`;
  md += `- **${m.faces.length} murs** en panneaux sandwich ${fz(ep)} cm autoportants : ${m.faces.map((f: any) => `${f.cle === "A" ? "façade" : f.nom} ${fr(f.longueur_cm)}`).join(", ")} cm.\n`;
  md += droite ? `- **Toit** mono-pente vers la droite (jardin), ${fr(m.pente.degres)}° : ${fr(Math.max(...m.hauteurs_coins_cm))} cm contre le mur gauche, ${fr(Math.min(...m.hauteurs_coins_cm))} cm côté porte.\n`
    : `- **Toit** mono-pente vers le fond, ${fr(m.pente.degres)}° : ${fr(m.hauteurs_coins_cm[0])} cm devant, ${fr(Math.min(...m.hauteurs_coins_cm))} cm au plus bas.\n`;
  md += `- **Porte${po.vitree === false ? " pleine" : ""}** ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} sur le mur droit, **${v.fenetres.length === 1 ? `une fenêtre de ${fz(v.fenetres[0].largeur_cm)}` : `${v.fenetres.length} fenêtres`}** en façade, **bureau en L** sur la façade et le mur gauche${lp && lp.replie ? `, **lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} rabattable** contre le fond` : ""}.\n`;
  md += `- **Matériaux** : ${eur(B.materiaux_eur)} TTC (${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}), sans main-d'œuvre ni livraison ; équipement optionnel ${eur(B.options_eur)}.\n\n`;
  md += `- **Formalités** : emprise au sol ${fr(m.formalites.emprise_au_sol_m2)} m², surface de plancher ${fr(m.formalites.surface_plancher_m2)} m² ⇒ ${m.formalites.libelle}.\n\n`;
  md += `## À trancher\n\n`;
  const stock_courant = +m.rehausse.section_mm[1] <= 225;
  md += `- **Toit** : ${droite ? "vers la droite (jardin)" : "vers l'arrière"}, chute ${fr(m.chute_cm)} cm (${fr(m.pente.degres)}°)${droite ? "" : " = choix par défaut"}. Madrier ${m.rehausse.section_mm.join(" × ")} classe 4 ${stock_courant ? ": section courante, à vérifier en classe 4" : "à trouver (sinon deux pièces superposées)"}.\n`;
  const F = m.formalites;
  md += `- **Formalités** : emprise au sol **${fr(F.emprise_au_sol_m2)} m²**${F.debords_comptes ? " (débords inclus : ils sont portés par des poteaux)" : ` (les débords de toit, simples et en l'air, n'entrent pas dans l'emprise au sol : ${F.reference.split(" :")[0]})`}, surface de plancher ${fr(F.surface_plancher_m2)} m² ⇒ **${F.libelle}** (seuils ${fz(F.seuil_sans_formalite_m2)} puis ${fz(F.seuil_declaration_m2)} m²). ${F.reserve}.\n`;
  if (lp && lp.replie) md += `- **Lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} rabattable** contre le mur du fond : déplié, ${lp.sous_bureau_cm2 > 0 ? "son pied passe sous le bureau gauche (lit plus bas que le plateau, pas de tiroir ni de traverse à cet endroit) et " : ""}il va jusque devant la porte (elle ouvre dehors) ; fixations à dimensionner (2 charnières sur le mur du fond, reprise dans la rehausse ou une lisse).\n`;
  else if (lp) md += `- **Lit ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)}** : déplié au milieu${lp.sous_bureau_cm2 > 0 ? ", le pied sous un bureau" : ""}${lp.gene_sieges_m2 > 0.05 ? ", fauteuil et tabouret rangés" : ""}.\n`;
  const pleine = (v.fenetres || []).filter((f: any) => f.largeur_cm >= +p.panneau.largeur_utile_cm - 0.05);
  if (pleine.length) md += `- **Fenêtre de ${fz(pleine[0].largeur_cm)}** : aussi large qu'un module, elle prend tout le panneau A2, qui ne garde qu'une allège de ${fz(pleine[0].allege_cm)} cm et un linteau de ${fz(rnd(m.hauteur_mur_cm - pleine[0].allege_cm - pleine[0].hauteur_cm, 1))} cm.${(v.fenetres || []).every((f: any) => !f.ouvrant) ? " Elle est **fixe** : la seule aération est la porte (plus la ventilation prévue) ; une ouvrante coûte ~120 € de plus." : ""}\n`;
  md += `- **Portée du toit** (~${fr(rnd(m.portee_cm / 100, 1))} m au plus long) en ${fz(ep)} cm sans panne : à confirmer dans le tableau du fabricant.\n`;
  md += `- **Angles non droits** (${m.angles_deg.filter((a: number) => Math.abs(a - 90) > 0.5).map((a: number) => fr(a) + "°").join(", ")}) : profils d'angle pliés sur mesure.\n\n`;
  md += `## Plans\n\n`;
  const plans: [string, string][] = [["modele-implantation", "Implantation sur la dalle"], ["modele-sol", "Plan de sol"], ["modele-toit", "Toiture"], ...m.faces.map((f: any, i: number): [string, string] => [`modele-facade-${f.cle}`, `Face ${f.cle} · ${f.cle === "A" ? "façade (jardin)" : f.nom}${po && po.cote === i ? " (porte)" : ""}`]), ["modele-rehausse", "Rehausse bois : débit des madriers"]];
  for (const [f, t] of plans) md += `### ${t}\n\n![${t}](site/assets/${f}.svg)\n\n`;
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
  md += droite ? `### Gouttière et profils\n\n- Gouttière ${fr(m.toit.gouttiere.longueur_cm)} cm ${m.toit.gouttiere.troncons.length > 1 ? `en ${m.toit.gouttiere.troncons.length} tronçons (${m.toit.gouttiere.troncons.map((t: any) => `${t.face} ${fr(t.longueur_cm)}`).join(" + ")}) : le long du pan en biais puis du mur droit, avec un angle,` : "le long du mur droit,"} au-dessus de la porte ; descente au coin avant droit, côté jardin (récupérateur d'eau possible). Aucune eau dans le passage arrière ni au pied du mur de propriété.\n`
    : m.toit.gouttiere.troncons.length > 1 || d.toit.descente
      ? `### Gouttière et profils\n\n- Gouttière ${fr(m.toit.gouttiere.longueur_cm)} cm derrière l'abri, en ${m.toit.gouttiere.troncons.length} tronçon(s) (${m.toit.gouttiere.troncons.map((t: any) => `${t.face} ${fr(t.longueur_cm)}`).join(" + ")}) : les nervures du toit mènent toute l'eau aux bouts arrière des panneaux. Descente ${ou_descente(m)}.\n`
      : `### Gouttière et profils\n\n- Gouttière ${fr(m.toit.gouttiere.longueur_cm)} cm le long du fond, descente au coin arrière gauche (point bas), atteignable par le passage.\n`;
  md += `- ${m.faces.length} angles : ${m.faces.map((f: any, i: number) => `${m.faces[(i + m.faces.length - 1) % m.faces.length].cle}/${f.cle} ${fr(m.angles_deg[i])}°`).join(", ")} ; hauteur de chaque angle = hauteur finie du coin.\n`;
  md += `- Rail de pied sur tout le périmètre (${fr(rnd(m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100, 2))} m), bavettes de rive sur les côtés ${droite ? "A et B" : "D et G"}.\n\n`;
  md += `## Ouvertures\n\n| ouverture | taille | où | détail |\n|---|---|---|---|\n`;
  md += `| porte ${po.vitree === false ? "pleine" : "vitrée"} | ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} (cadre ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)}) | face D, de ${fr(po.debut_cm)} à ${fr(rnd(po.debut_cm + po.largeur_cm, 1))} cm depuis la façade | ouvre vers l'extérieur ; cadre à ${fz(po.marge_cm)} cm du mur du fond (face intérieure) et sous le haut du mur |\n`;
  for (const f of v.fenetres) md += `| fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"} | ${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} | face A, de ${fr(f.debut_cm)} à ${fr(rnd(f.debut_cm + f.largeur_cm, 1))} cm depuis le coin gauche | allège ${fz(f.allege_cm)} cm, au-dessus du bureau, dans un seul panneau |\n`;
  md += `\n## Aménagement\n\n| élément | taille | place |\n|---|---|---|\n`;
  for (const b of v.bureaux) md += `| bureau ${b.cote === "avant" ? "de façade" : b.cote} | ${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)} cm | tout le mur ${b.cote === "avant" ? "de façade" : b.cote} |\n`;
  for (const st of v.sieges || []) md += `| ${st.type} | ${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)} cm | devant le bureau ${st.contre === "avant" ? "de façade" : st.contre} |\n`;
  if (lp) md += `| lit ${lp.replie ? "rabattable" : "pliant"} (déplié) | ${fz(lp.largeur_cm)} × ${fz(lp.longueur_cm)} cm | ${!lp.tient ? "**NE TIENT PAS**" : lp.replie ? `contre le mur du fond (replié : ${fz(lp.epaisseur_replie_cm)} cm), ${lp.sous_bureau_cm2 > 0 ? "pied sous le bureau gauche" : ""}${lp.gene_sieges_m2 > 0.05 ? ", sièges rangés" : ""}` : `au milieu${lp.sous_bureau_cm2 > 0 ? ", pied sous un bureau" : ""}${lp.gene_sieges_m2 > 0.05 ? ", sièges rangés" : ""}`} |\n`;
  md += `\n## Matériaux à acheter (prix TTC, sans main-d'œuvre, sans livraison)\n\n`;
  for (const gr of B.groupes) {
    md += `### ${gr.nom} · ${eur(gr.total_eur)}\n\n| matériau | quantité | prix unitaire | montant | comment c'est compté, d'où vient le prix |\n|---|---|---|---|---|\n`;
    for (const l of B.lignes.filter((x: any) => x.groupe === gr.nom)) md += `| ${l.poste}${l.a_confirmer ? " *(prix à confirmer)*" : ""} | ${fr(l.qte)} ${l.unite} | ${eur(l.pu_eur)} | ${eur(l.montant_eur)} | ${l.regle}${l.note ? `. ${l.note}` : ""}${l.source ? ` ([source](${l.source}))` : ""} |\n`;
    md += `\n`;
  }
  md += `**Total des matériaux : ${eur(B.materiaux_eur)} TTC** (fourchette ${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}, ±${B.incertitude_pct} %). Équipement optionnel en plus : ${eur(B.options_eur)}.${B.hors_materiaux.length ? ` Hors total : ${B.hors_materiaux.map((h: any) => `${h.poste} ≈ ${eur(h.montant_eur)}`).join(", ")}.` : ""}\n\n`;
  md += `Prix relevés chez des marchands français (\`prix_materiaux_eur_ttc\` dans \`params.json\`, source notée pour chacun) ; les quantités se recalculent avec l'abri.\n`;
  const Gd = m.guide;
  if (Gd) {
    md += `\n## Guide de montage\n\n### Avant de commander\n\n` + Gd.avant.map((x: string) => `- ${x}\n`).join("") + `\n### Outillage\n\n` + Gd.outillage.map((x: string) => `- ${x}\n`).join("") + `\n`;
    Gd.etapes.forEach((e: any, i: number) => {
      md += `### Étape ${i + 1} · ${e.titre}\n\n${e.but}\n\n**Outils :** ${e.outils.join(", ")}\n\n` + e.faire.map((x: string, k: number) => `${k + 1}. ${x}\n`).join("") + `\n**À contrôler avant de continuer :**\n\n` + e.controler.map((x: string) => `- [ ] ${x}\n`).join("") + `\n`;
    });
  }
  const T = textes_abri(p, core);
  if (T) {
    md += `\n## Pourquoi cette forme\n\n`;
    if (T.atouts.length) md += `### Points forts\n\n` + T.atouts.map((x) => `- ${x}\n`).join("") + `\n`;
    if (T.limites.length) md += `### Points faibles\n\n` + T.limites.map((x) => `- ${x}\n`).join("") + `\n`;
    if (T.questions.length) md += `### Questions\n\n` + T.questions.map((x, i) => `- **Q${i + 1}** ${x}\n`).join("") + `\n`;
    if (T.idees.length) md += `### Idées à explorer\n\n` + T.idees.map((x, i) => `- **I${i + 1}** ${x}\n`).join("") + `\n`;
  }
  return md;
}
