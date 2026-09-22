// Page d'accueil : l'abri retenu (params.abri_principal), tout calcule depuis les parametres.
// DOM seulement, aucun import de Three : testable sous jsdom. La scene 3D est branchee par abri_main.ts.
import { buildCore, params_v2, version_principale, versions_abri, textes_variante, type Params } from "./compute";
import { maitre_detail, type Entree } from "./maitre_detail";

const fr = (x: number) => String(x).replace(".", ",");
const fz = (x: number) => fr(Math.round(x * 10) / 10);
const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// une cote (nombre + unite) et un repere de face ou de panneau (A, D1, T2, R3) : un style unique sur toute la page
// un nombre seul est coupe en partie entiere et decimales (dans un tableau, les entiers s'alignent, les decimales sont plus petites)
const cote = (x: number | string, u = "cm") => {
  const [n, d] = typeof x === "number" ? fr(x).split(",") : [x, undefined];
  return `<span class="cote"><span class="n">${n}</span>${d !== undefined ? `<span class="d">,${d}</span>` : ""}${u ? `<span class="u">${u}</span>` : ""}</span>`;
};
const face = (id: string) => `<span class="face">${id}</span>`;
// repere + cote qui ne se separent jamais (A 200cm)
const paire = (id: string, c: string) => `<span class="paire">${face(id)} ${c}</span>`;

// markdown en ligne des textes de params.json : gras, code, liens (un .md publie pointe vers sa page de docs/)
export function md_en_ligne(s: string): string {
  return echappe(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, href) => `<a href="${/^[a-z]+:/i.test(href) ? href : "docs/" + href.replace(/\.md(#.*)?$/i, ".html$1").toLowerCase()}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export interface Abri { p: Params; pp: Params; core: any; v: any; m: any; version: number; principale: number; bloc: any; textes: ReturnType<typeof textes_variante> | null }

// versions pretes a montrer : la 1 (disposition de base) et chaque bloc abri_vN, dans l'ordre
export const versions_pretes = (p: Params): number[] => [1, ...versions_abri(p).map((x) => x.n)];

// un calcul par version et par jeu de parametres (le menu et les comparaisons reutilisent les memes)
const coeurs = new WeakMap<object, Map<number, { pp: Params; core: any }>>();
function coeur(p: Params, n: number) {
  let cache = coeurs.get(p);
  if (!cache) { cache = new Map(); coeurs.set(p, cache); }
  if (!cache.has(n)) { const pp = n > 1 ? params_v2(p, `abri_v${n}`)! : p; cache.set(n, { pp, core: buildCore(pp) }); }
  return cache.get(n)!;
}

// une version de l'abri ; sans numero (ou numero inconnu) : la version retenue
export function calcule_abri(p: Params, demande = 0): Abri {
  const principale = version_principale(p) || 1;
  const version = versions_pretes(p).includes(demande) ? demande : principale;
  const bloc = version > 1 ? p[`abri_v${version}`] : null, { pp, core } = coeur(p, version);
  const v = core.variantes.find((x: any) => x.id === 13), m = core.modele;
  let textes = null;
  if (bloc && v && m) {
    const depuis = versions_pretes(p).includes(+bloc.compare_a) ? +bloc.compare_a : 1;
    textes = textes_variante(bloc, core, coeur(p, depuis).core);
  }
  return { p, pp, core, v, m, version, principale, bloc, textes };
}

// le menu : chaque version prete avec son nom court et ses chiffres cles
export function menu_versions(p: Params) {
  const principale = version_principale(p) || 1;
  // abri_menu : les versions montrees dans le menu (les autres restent atteignables par ?v=N)
  const montrees = Array.isArray(p.abri_menu) ? versions_pretes(p).filter((n) => p.abri_menu.includes(`abri_v${n}`)) : versions_pretes(p);
  // la version retenue d'abord, puis les autres de la plus recente a la plus ancienne
  montrees.sort((a, b) => (a === principale ? -1 : b === principale ? 1 : b - a));
  return montrees.map((n) => {
    const { core } = coeur(p, n), v = core.variantes.find((x: any) => x.id === 13), m = core.modele, passage = v.passages.find((q: any) => q.cote === "arriere_droite");
    const nom = (p[`abri_v${n}`] && p[`abri_v${n}`].nom_court) || `version ${n}`;
    return { n, nom, principale: n === principale, murs: m.faces.length, murs_m2: v.aire_m2, interieur_m2: v.aire_interieure_m2, passage_cm: passage.cm, budget_eur: m.budget.total_eur, sens: m.sens };
  });
}

// formes etudiees (params.formes_etudiees) : une carte par forme, avec son dessin sans entete, ses chiffres et son document
export function formes_etudiees(p: Params) {
  const base = coeur(p, 1).core;
  return ((p.formes_etudiees || []) as any[]).map((f) => {
    if (f.type === "commerce") {
      const [a, b] = f.cotes_cm, s = 1.1, W = a * s + 40, H = b * s + 40;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui,sans-serif"><rect x="20" y="20" width="${a * s}" height="${b * s}" fill="#eef2f6" stroke="#2b5d8a" stroke-width="3"/><text x="${W / 2}" y="${H / 2 + 6}" text-anchor="middle" fill="#2b5d8a" font-size="18" font-weight="bold">${fz(a / 100)} × ${fz(b / 100)} m</text></svg>`;
      return { nom: f.nom, svg, chiffres: `${fr(Math.round(a * b) / 1e4)} m² au sol · ${f.note || ""}`, href: f.url || "", commerce: true };
    }
    if (f.type === "variante") {
      const v = base.variantes.find((x: any) => x.id === f.id), q = base.planches[`variante-${f.id}`];
      return { nom: f.nom, svg: q ? q.svg : "", chiffres: `${v.polygone.length} murs · ${fr(v.aire_m2)} m² de murs · ${fr(v.aire_interieure_m2)} m² int.`, href: `docs/variantes.html#option-${f.id}` };
    }
    if (f.type === "rectangle") {
      const g = base.geometrie, q = base.planches.rectangle;
      return { nom: f.nom, svg: q ? q.svg : "", chiffres: `4 murs · ${fr(g.aire_m2)} m² de murs · ${fr(g.aire_interieure_m2)} m² int. · étude initiale, réglable`, href: "configurateur.html" };
    }
    const { core } = coeur(p, f.n), v = core.variantes.find((x: any) => x.id === 13), m = core.modele, passage = v.passages.find((q: any) => q.cote === "arriere_droite");
    return { nom: f.nom, svg: core.planches && core.planches.sol ? core.planches.sol.svg : "", chiffres: `${m.faces.length} murs · ${fr(v.aire_m2)} m² de murs · ${fr(v.aire_interieure_m2)} m² int. · passage ${fz(Math.round(passage.cm))} cm · ${eur(m.budget.total_eur)}`, href: `docs/abri-v${f.n}.html` };
  });
}

const el = (id: string) => document.getElementById(id);
const texte = (id: string, s: string) => { const e = el(id); if (e) e.textContent = s; };
const html = (id: string, s: string) => { const e = el(id); if (e) e.innerHTML = s; };
// pliables : colonnes ou une cellule peut passer a la ligne (entre deux cotes, entre deux panneaux, dans un texte) ; les autres ne se replient jamais
const table = (id: string, tetes: string[], lignes: string[][], pliables: number[] = [], pied: string[] | null = null) => {
  const td = (c: string, i: number) => `<td${pliables.includes(i) ? ' class="pliable"' : ""}>${c}</td>`;
  html(id, `<thead><tr>${tetes.map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${lignes.map((l) => `<tr>${l.map(td).join("")}</tr>`).join("")}</tbody>${pied ? `<tfoot><tr>${pied.map((c) => `<td>${c}</td>`).join("")}</tr></tfoot>` : ""}`);
};
const liste = (id: string, items: string[]) => html(id, items.map((s) => `<li>${s}</li>`).join(""));

export function rend_abri(a: Abri) {
  const { pp, core, v, m } = a;
  if (!v || !m) { html("fiche", "<tr><td>Aucun abri retenu dans params.json.</td></tr>"); return; }
  const seuil = +(pp.reglementaire && pp.reglementaire.seuil_sans_formalite_m2) || 5, ep = +pp.panneau.epaisseur_mm / 10, mod = +pp.panneau.largeur_utile_cm;
  const passage = v.passages.find((q: any) => q.cote === "arriere_droite"), B = m.budget, n = m.faces.length, G = m.toit.gouttiere, po = v.porte;
  const gauche = Math.min(...v.polygone.map((z: number[]) => z[0])), avant = Math.min(...v.polygone.map((z: number[]) => z[1]));
  const droite_libre = core.geometrie.dalle.avant - Math.max(...v.polygone.map((z: number[]) => z[0]));
  const sans_formalite = v.aire_m2 <= seuil, retenue = a.version === a.principale;
  const nom_face = (f: any) => (f.cle === "A" ? "façade" : f.nom);
  const NOMBRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"];

  // menu des versions (seulement s'il y a un choix), en-tete
  const menu = menu_versions(a.p);
  html("versions", menu.map((x) => `<li${x.n === a.version ? ' class="ici"' : ""}><a href="?v=${x.n}"><span class="v-nom">Version ${x.n}${x.principale ? ' <span class="v-retenue">retenue</span>' : ""}</span><span class="v-desc">${echappe(x.nom)}</span><span class="v-chiffres">${fr(x.interieur_m2)} m² int. · passage ${fz(Math.round(x.passage_cm))} cm · ${eur(x.budget_eur)}</span></a></li>`).join(""));
  const bloc_versions = el("bloc-versions"); if (bloc_versions) (bloc_versions as HTMLElement).hidden = menu.length < 2;
  texte("titre", `Bureau de jardin à ${NOMBRES[n] || n} murs`);
  texte("sous-titre", `Dossier de construction : plans cotés, matériaux à acheter, guide de montage${retenue ? "" : ` · étude, version ${a.version}`}`);
  surligne_section();
  html("bandeau", retenue ? "" : `Vous regardez la <b>version ${a.version}</b>, une étude. L'abri retenu est la <a href="?v=${a.principale}">version ${a.principale}</a>.`);
  const bandeau = el("bandeau"); if (bandeau) (bandeau as HTMLElement).hidden = retenue;
  const doc = el("lien-document") as HTMLAnchorElement | null;
  if (doc) doc.setAttribute("href", retenue ? "docs/abri.html" : `docs/abri-v${a.version}.html`);

  // fiche chantier : ce qu'on cherche sur place, sur un ecran
  // resume : deux phrases, puis six cartes ; le detail est dans les sections
  html("intro", `Bureau de jardin à ${NOMBRES[n] || n} murs en panneaux sandwich de ${cote(ep)} autoportants, sur la dalle existante, toit mono-pente vers ${m.sens === "droite" ? "le jardin" : "le fond"}. Porte ${po.vitree === false ? "pleine" : "vitrée"} sur le mur ${face(m.faces[po.cote].cle)}, ${NOMBRES[v.fenetres.length]} fenêtre${v.fenetres.length > 1 ? "s" : ""} en façade, bureau en L le long des murs ${v.bureaux.map((b: any) => face(b.cote === "avant" ? "A" : b.cote === "gauche" ? "G" : "D")).join(" et ")}.`);
  // deux dessins (murs et angles ; marges sur la dalle) puis les chiffres qui restent
  const RS = core.planches || {};
  const ICO: Record<string, string> = {
    hauteurs: '<svg viewBox="0 0 16 16"><path d="M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    toit: '<svg viewBox="0 0 16 16"><path d="M2 8.5 8 3l6 5.5M4 7.5V13h8V7.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    surfaces: '<svg viewBox="0 0 16 16"><path d="M3 3h10v10H3z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h10M8 3v10" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5"/></svg>',
    materiaux: '<svg viewBox="0 0 16 16"><path d="M2 4h2l1.6 7h7.2L14 6H5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6.5" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/></svg>',
  };
  // etiquettes sous le paragraphe : un chiffre cle par pilule
  const tags: [string, string][] = [
    ["hauteurs", `murs ${cote(m.hauteur_mur_cm)}, faîte ${cote(Math.max(...m.hauteurs_coins_cm))}`],
    ["toit", `pente ${cote(m.pente.pourcent, "%")}, portée ${cote(Math.round(m.portee_cm) / 100, "m")}`],
    ["surfaces", `${cote(v.aire_m2, "m²")} de murs${sans_formalite ? ", sans formalité" : ", déclaration préalable"}`],
    ["surfaces", `${cote(v.aire_interieure_m2, "m²")} intérieur`],
    ["materiaux", `${eur(B.materiaux_eur)} TTC`],
  ];
  const d3 = core.geometrie.dalle, types = new Set((d3.murs || []).map((w: any) => w.type));
  const legende = [
    ["trait", "#2b5d8a", "mur"], ["arc", "#b0452a", "angle"], ["trait", "#b86e1f", "distance bord"],
    ...(types.has("palissade") ? [["trait-epais", "#5b4a3a", "palissade"]] : []), ...(types.has("mur") ? [["trait-epais", "#5b4a3a", "mur voisin"]] : []), ...(types.has("grillage") ? [["pointille", "#5f8a4a", "grillage"]] : []),
    ["aplat", "#f3f1ec", "dalle"],
  ];
  html("fiche", `<div class="resume-figs"><figure>${RS.resume ? RS.resume.svg : ""}</figure><ul class="legende">${legende.map(([k, c, t]) => `<li><i class="${k}" style="--c:${c}"></i>${t}</li>`).join("")}</ul></div>`);
  html("tags", tags.map(([ico, val]) => `<li>${ICO[ico]}<span>${val}</span></li>`).join(""));
  table("murs", ["mur", "long. ext.", "long. int.", "hauteur finie", "panneaux", "angle au début"],
    m.faces.map((f: any, i: number) => [paire(f.cle, nom_face(f)), cote(f.longueur_cm), cote(v.cotes_interieures_cm[i]), `${cote(f.hauteur_debut_cm)} → ${cote(f.hauteur_fin_cm)}`, f.panneaux.map((pn: any) => paire(pn.id, cote(pn.largeur_cm))).join(", "), cote(m.angles_deg[i], "°")]), [3, 4]);

  // implantation et plans : les SVG du modele, injectes tels quels
  // planches : l'entete en texte (titre, detail, legende), le dessin sans titre dessous
  const PL = core.planches || {};
  // chaque planche a son lien « agrandir » : le SVG s'ouvre seul dans un nouvel onglet (blob : marche aussi en file://)
  const planche = (cle: string, extra = "") => { const q = PL[cle], f = m.faces.find((x: any) => `facade-${x.cle}` === cle); return q ? `<h3>${q.lettre ? `Face ${face(q.lettre)} · ` : ""}${f ? nom_face(f) : q.nom}${extra}${q.detail ? ` <span class="precision">· ${q.detail}</span>` : ""}</h3><p class="note">${q.lignes.join(" · ")}</p><div class="planbox" id="plan-${cle}"><a class="zoom" href="#" data-zoom="${cle}" title="Ouvrir en grand dans un nouvel onglet">agrandir ↗</a>${q.svg}</div>` : ""; };
  // les deux planches de tete sont des sections : leur titre est le h2 de la boite
  for (const k of ["implantation", "sol"]) {
    const q = PL[k];
    if (!q) continue;
    html(`titre-${k}`, `${q.nom}${q.detail ? ` <span class="precision">· ${q.detail}</span>` : ""}`);
    html(`planche-${k}`, `<p class="note">${q.lignes.join(" · ")}</p><div class="planbox" id="plan-${k}"><a class="zoom" href="#" data-zoom="${k}" title="Ouvrir en grand dans un nouvel onglet">agrandir ↗</a>${q.svg}</div>`);
  }
  const main = document.querySelector("main");
  if (main && !(main as any).__zoom) {
    (main as any).__zoom = true;
    main.addEventListener("click", (ev) => {
      const z = (ev.target as HTMLElement).closest("a.zoom") as HTMLElement | null;
      if (!z || !z.dataset.zoom) return;
      ev.preventDefault();
      const q = (a.core.planches || {})[z.dataset.zoom];
      if (!q) return;
      const url = URL.createObjectURL(new Blob([q.svg.replace("<svg ", '<svg style="background:#fff" ')], { type: "image/svg+xml" }));
      window.open(url, "_blank");
    });
  }
  const details_plans = el("plans-details"), liste_plans = el("plans-liste"), mode_plans = el("plans-mode");
  if (details_plans && liste_plans && mode_plans) {
    const cles = [...m.faces.map((f: any) => `facade-${f.cle}`), "toit", "rehausse"];
    html("plans-details", cles.map((k) => `<article data-cle="${k}">${planche(k, k.startsWith("facade-") ? (v.porte && m.faces[v.porte.cote].cle === k.slice(7) ? " (porte)" : k === "facade-A" ? " (jardin)" : "") : "")}</article>`).join(""));
    maitre_detail({
      liste: liste_plans, mode: mode_plans, panneaux: details_plans, memoire: `abri-v${a.version}-plans`, ancre: el("plans-liste") || undefined,
      entrees: () => cles.map((k): Entree => { const f = m.faces.find((x: any) => `facade-${x.cle}` === k); return { cle: k, titre: f ? `Face ${f.cle} · ${nom_face(f)}` : PL[k].nom, num: PL[k].lettre, panneau: details_plans.querySelector(`article[data-cle="${k}"]`) as HTMLElement }; }),
    });
  }

  // debit
  table("debit-murs", ["pièce", "largeur", "provenance", "découpe"],
    m.faces.flatMap((f: any) => f.panneaux.map((pn: any) => [face(pn.id), cote(pn.largeur_cm), pn.source === "chute" ? "chute d'un autre panneau" : pn.largeur_cm < mod - 0.05 ? "panneau recoupé" : "panneau entier", pn.decoupes.length ? pn.decoupes.join(", ") : "–"])), [2, 3]);
  table("debit-toit", ["pièce", "largeur", "longueur", "coupe"],
    m.toit.panneaux.map((t: any) => [face(t.id), cote(t.largeur_cm), cote(t.longueur_cm), `${t.largeur_cm < mod - 0.05 ? "refendu en largeur, " : ""}${t.biais ? "un bord en biais" : "entier"}`]), [3]);
  table("debit-rehausse", ["pièce", "mur", "longueur", "hauteur début → fin"], m.rehausse.pieces.map((r: any) => [face(r.id), face(r.face), cote(r.L), `${cote(r.h0)} → ${cote(r.h1)}`]), [3]);

  // materiaux : par groupe, quantites calculees, prix TTC, ni main-d'oeuvre ni forfait
  html("materiaux", B.groupes.map((gr: any) => `<article data-cle="${gr.nom}"><h3>${gr.nom}<span class="sous-total">${eur(gr.total_eur)}</span></h3><div class="table-wrap"><table class="bom"><thead><tr><th>matériau</th><th class="num">quantité</th><th class="num">prix unitaire</th><th class="num">montant</th></tr></thead><tbody>${B.lignes.filter((l: any) => l.groupe === gr.nom).map((l: any) => `<tr><td class="pliable"><div class="poste">${l.poste}${l.a_confirmer ? ' <span class="a-confirmer">prix à confirmer</span>' : ""}</div><div class="regle">${l.regle}${l.note ? ` · <span class="note-prix">${echappe(l.note)}</span>` : ""}${l.source ? ` <a class="source" href="${l.source}" target="_blank" rel="noopener">source</a>` : ""}</div></td><td class="num">${fr(l.qte)} ${l.unite}</td><td class="num">${eur(l.pu_eur)}</td><td class="num">${eur(l.montant_eur)}</td></tr>`).join("")}</tbody></table></div></article>`).join(""));
  const materiaux = el("materiaux"), liste_materiaux = el("materiaux-liste"), mode_materiaux = el("materiaux-mode");
  if (materiaux && liste_materiaux && mode_materiaux) maitre_detail({
    liste: liste_materiaux, mode: mode_materiaux, panneaux: materiaux, memoire: `abri-v${a.version}-materiaux`, ancre: el("materiaux-section") || undefined,
    entrees: () => B.groupes.map((gr: any): Entree => {
      const lignes = B.lignes.filter((l: any) => l.groupe === gr.nom), incertain = lignes.some((l: any) => l.a_confirmer);
      return { cle: gr.nom, titre: gr.nom, badge: eur(gr.total_eur), etat: lignes.every((l: any) => l.optionnel) ? "optionnel" : incertain ? "a-confirmer" : "", panneau: materiaux.querySelector(`article[data-cle="${gr.nom}"]`) as HTMLElement };
    }),
  });
  html("materiaux-total", `<b>Total : ${eur(B.materiaux_eur)} TTC</b> (${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}) · équipement optionnel ${eur(B.options_eur)}${B.hors_materiaux.length ? ` · hors total : ${B.hors_materiaux.map((h: any) => `${h.poste.replace(/ \(.*/, "")} ≈ ${eur(h.montant_eur)}`).join(", ")}` : ""}.`);

  rend_guide(m.guide, a.version);

  // ouvertures et mobilier
  table("ouvertures-table", ["ouverture", "taille", "où", "détail"], [
    [`porte ${po.vitree === false ? "pleine" : "vitrée"}`, `${cote(`${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)}`)} (cadre ${cote(`${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)}`)})`, `face ${face(m.faces[po.cote].cle)}, de ${cote(po.debut_cm)} à ${cote(Math.round((po.debut_cm + po.largeur_cm) * 10) / 10)} depuis la façade`, "ouvre vers l'extérieur, ferrée côté fond"],
    ...v.fenetres.map((f: any) => [`fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"}`, cote(`${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)}`), `face ${face("A")}, de ${cote(f.debut_cm)} à ${cote(Math.round((f.debut_cm + f.largeur_cm) * 10) / 10)} depuis le coin gauche`, `allège ${cote(f.allege_cm)}, dans un seul panneau`]),
  ], [2, 3]);
  table("amenagement", ["élément", "taille", "place"], [
    ...v.bureaux.map((b: any) => [`bureau ${b.cote === "avant" ? "de façade" : b.cote}`, cote(`${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)}`), `tout le mur ${b.cote === "avant" ? "de façade" : b.cote}`]),
    ...(v.sieges || []).map((st: any) => [st.type, cote(`${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)}`), `devant le bureau ${st.contre === "avant" ? "de façade" : st.contre}`]),
    ...(v.lit_pliant ? [[`lit ${v.lit_pliant.replie ? "rabattable" : "pliant"}`, cote(`${fz(v.lit_pliant.largeur_cm)} × ${fz(v.lit_pliant.longueur_cm)}`), v.lit_pliant.tient ? (v.lit_pliant.replie ? "contre un mur" : "déplié au sol libre, sièges rangés") : "ne tient pas"]] : []),
  ], [2]);

  // pourquoi : une puce par idee, l'accroche en gras, le reste en petit ; un marqueur par groupe
  const T = a.textes;
  const puce = (s: string) => {
    const gras = s.match(/^\*\*(.+?)\*\*\s*[:.]?\s*([\s\S]*)$/);
    const [tete, suite] = gras ? [gras[1], gras[2]] : (() => { const i = s.search(/[.!?]\s/); return i > 0 ? [s.slice(0, i + 1), s.slice(i + 2)] : [s, ""]; })();
    if (!gras && !suite) return `<li>${md_en_ligne(s)}</li>`;
    return `<li><b>${md_en_ligne(tete)}</b>${suite.trim() ? ` <span class="suite">${md_en_ligne(suite.trim())}</span>` : ""}</li>`;
  };
  const bloc = (marque: string, titre: string, items: string[]) => (items.length ? `<div class="pourquoi-bloc"><h3><span class="marque">${marque}</span>${titre}</h3><ul>${items.map(puce).join("")}</ul></div>` : "");
  // questions ouvertes, numerotees Q1, Q2… (span.question, le meme repere partout ou une question est citee)
  const section = el("pourquoi"); if (section) (section as HTMLElement).hidden = !T;
  const D = T && T.dossier;
  html("pourquoi-corps", D ? bloc("✅", "Points forts", D.atouts) + bloc("⚠️", "Points faibles", D.limites)
    : T ? bloc("✅", "Ce que cette forme apporte", T.atouts) + bloc("⚠️", "Ce qu'elle coûte", T.pertes) + bloc("💡", "Pourquoi ces choix", T.notes) + bloc("🔧", "Conseils hors plans", T.hors_modele) : "");
  // questions ouvertes : leur section, numerotees Q1, Q2… (span.question, le meme repere partout ou une question est citee)
  const sq = el("questions"); if (sq) (sq as HTMLElement).hidden = !(D && D.questions.length);
  html("questions-corps", D && D.questions.length ? `<ol class="questions">${D.questions.map((s: string, i: number) => `<li><span class="question">Q${i + 1}</span> ${md_en_ligne(s)}</li>`).join("")}</ol>` : "");

  // formes etudiees : une carte par forme de params.formes_etudiees
  const formes = formes_etudiees(a.p), liste_formes = el("alternatives-liste"), mode_formes = el("alternatives-mode"), corps_formes = el("alternatives-corps");
  html("alternatives-corps", formes.map((x, i) => `<article data-cle="f${i}"><h3>${echappe(x.nom)}</h3><p class="note">${echappe(x.chiffres)}${x.href ? ` · <a href="${x.href}">${x.commerce ? "site du fabricant" : "document"}</a>` : ""}</p><div class="planbox">${x.svg}</div></article>`).join(""));
  if (liste_formes && mode_formes && corps_formes) maitre_detail({
    liste: liste_formes, mode: mode_formes, panneaux: corps_formes, memoire: `abri-v${a.version}-formes`, ancre: el("alternatives-liste") || undefined,
    entrees: () => formes.map((x, i): Entree => ({ cle: `f${i}`, titre: x.nom, icone: x.svg, panneau: corps_formes.querySelector(`article[data-cle="f${i}"]`) as HTMLElement })),
  });
}

// guide de montage : liste des etapes a gauche, l'etape choisie a droite (composant maitre_detail).
// cases cochees gardees dans le navigateur, par version ; la liste montre l'avancement de chaque etape.
function rend_guide(Gd: any, version: number) {
  const cle_cases = `abri-v${version}-cases`;
  let faites: Record<string, boolean> = {};
  try { faites = JSON.parse(window.localStorage.getItem(cle_cases) || "{}"); } catch { faites = {}; }
  liste("guide-avant", Gd.avant.map(md_en_ligne));
  liste("guide-outillage", Gd.outillage.map(md_en_ligne));

  const conteneur = el("etapes"), lst = el("etapes-liste"), mode = el("etapes-mode");
  if (!conteneur || !lst || !mode) return;
  for (const vieux of conteneur.querySelectorAll("article[data-etape]")) vieux.remove();
  conteneur.insertAdjacentHTML("beforeend", Gd.etapes.map((e: any, i: number) => `<article class="etape" data-etape="${i}"><h3><span class="num-etape">${i + 1}</span>${e.titre}</h3><p class="but">${md_en_ligne(e.but)}</p><p class="outils"><b>Outils :</b> ${e.outils.join(", ")}</p><ol>${e.faire.map((x: string) => `<li>${md_en_ligne(x)}</li>`).join("")}</ol><div class="controle"><b>À contrôler avant de continuer</b>${e.controler.map((x: string, k: number) => `<label><input type="checkbox" data-case="${i}.${k}"${faites[`${i}.${k}`] ? " checked" : ""}> ${md_en_ligne(x)}</label>`).join("")}</div></article>`).join(""));

  const avancement = (i: number) => { const n = Gd.etapes[i].controler.length, f = Gd.etapes[i].controler.filter((_x: string, k: number) => faites[`${i}.${k}`]).length; return { n, f }; };
  const guide = maitre_detail({
    liste: lst, mode, panneaux: conteneur, memoire: `abri-v${version}-etape`, ancre: el("montage") || undefined,
    entrees: () => [
      { cle: "avant", titre: "Avant de commander", etat: "prealable", panneau: el("guide-avant-etape") as HTMLElement },
      { cle: "outillage", titre: "Outillage", etat: "prealable", panneau: el("guide-outillage-etape") as HTMLElement },
      ...Gd.etapes.map((e: any, i: number): Entree => {
        const av = avancement(i);
        return { cle: String(i), titre: e.titre, num: String(i + 1), badge: `${av.f}/${av.n}`, etat: av.f === av.n ? "faite" : av.f ? "en-cours" : "", panneau: conteneur.querySelector(`article[data-etape="${i}"]`) as HTMLElement };
      }),
    ],
  });
  conteneur.addEventListener("change", (ev) => {
    const c = ev.target as HTMLInputElement;
    if (!c || !c.dataset || !c.dataset.case) return;
    faites[c.dataset.case] = c.checked;
    try { window.localStorage.setItem(cle_cases, JSON.stringify(faites)); } catch { /* navigation privee : l'etat ne survit pas, la page marche */ }
    guide.rafraichir();
  });
}

// la section sous le tiers haut de l'ecran se surligne dans le sommaire (sous jsdom rien ne defile : rien ne bouge)
function surligne_section() {
  const liens = [...document.querySelectorAll<HTMLAnchorElement>("#sommaire a")];
  const sections = liens.map((l) => document.querySelector<HTMLElement>(l.getAttribute("href")!));
  const maj = () => {
    const ligne = window.scrollY + window.innerHeight * 0.35;
    let ici = 0;
    sections.forEach((s, i) => { if (s && !s.hidden && s.offsetTop <= ligne) ici = i; });
    liens.forEach((l, i) => l.classList.toggle("ici", i === ici));
  };
  window.addEventListener("scroll", maj, { passive: true });
  maj();
}
