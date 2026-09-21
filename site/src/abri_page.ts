// Page d'accueil : l'abri retenu (params.abri_principal), tout calcule depuis les parametres.
// DOM seulement, aucun import de Three : testable sous jsdom. La scene 3D est branchee par abri_main.ts.
import { buildCore, params_v2, version_principale, versions_abri, textes_variante, ou_descente, type Params } from "./compute";

const fr = (x: number) => String(x).replace(".", ",");
const fz = (x: number) => fr(Math.round(x * 10) / 10);
const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

const el = (id: string) => document.getElementById(id);
const texte = (id: string, s: string) => { const e = el(id); if (e) e.textContent = s; };
const html = (id: string, s: string) => { const e = el(id); if (e) e.innerHTML = s; };
const table = (id: string, tetes: string[], lignes: string[][], pied: string[] | null = null) => {
  html(id, `<thead><tr>${tetes.map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>${pied ? `<tfoot><tr>${pied.map((c) => `<td>${c}</td>`).join("")}</tr></tfoot>` : ""}`);
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

  // menu des versions, en-tete
  html("versions", menu_versions(a.p).map((x) => `<li${x.n === a.version ? ' class="ici"' : ""}><a href="?v=${x.n}"><span class="v-nom">Version ${x.n}${x.principale ? ' <span class="v-retenue">retenue</span>' : ""}</span><span class="v-desc">${echappe(x.nom)}</span><span class="v-chiffres">${fr(x.interieur_m2)} m² int. · passage ${fz(Math.round(x.passage_cm))} cm · ${eur(x.budget_eur)}</span></a></li>`).join(""));
  texte("titre", `Bureau de jardin à ${NOMBRES[n] || n} murs`);
  texte("sous-titre", `Dossier de construction · version ${a.version}${retenue ? " (retenue)" : " (étude)"} · panneaux sandwich ${fz(ep)} cm autoportants · toit vers ${m.sens === "droite" ? "le jardin" : "le fond"}`);
  html("bandeau", retenue ? "" : `Vous regardez la <b>version ${a.version}</b>, une étude. L'abri retenu est la <a href="?v=${a.principale}">version ${a.principale}</a>.`);
  const bandeau = el("bandeau"); if (bandeau) (bandeau as HTMLElement).hidden = retenue;
  const doc = el("lien-document") as HTMLAnchorElement | null;
  if (doc) doc.setAttribute("href", retenue ? "docs/abri.html" : `docs/abri-v${a.version}.html`);

  // fiche chantier : ce qu'on cherche sur place, sur un ecran
  const paires: [string, string][] = [
    ["Murs (extérieur)", m.faces.map((f: any) => `${f.cle} ${fr(f.longueur_cm)}`).join(" · ") + " cm"],
    ["Angles", m.angles_deg.map((g: number) => fr(g) + "°").join(" · ")],
    ["Hauteurs finies des coins", m.hauteurs_coins_cm.map((h: number) => fr(h)).join(" · ") + " cm"],
    ["Hauteur des panneaux de mur", `${fz(m.hauteur_mur_cm)} cm`],
    ["Toit", `vers ${m.sens === "droite" ? "la droite (jardin)" : "le fond"} · pente ${fr(m.pente.pourcent)} % · portée ${fr(Math.round(m.portee_cm) / 100)} m${a.pp.disposition_trapeze.toit.panne_intermediaire ? " (panne à mi-profondeur)" : ""}`],
    ["Implantation", `${fz(gauche)} cm du bord gauche · ${fz(avant)} cm du bord avant · ${fz(droite_libre)} cm de dalle à droite`],
    ["Passage derrière", `${fr(passage.cm)} cm au plus étroit`],
    ["Surfaces", `${fr(v.aire_m2)} m² de murs (${sans_formalite ? `au seuil de ${fz(seuil)} m², sans formalité` : "déclaration préalable"}) · ${fr(v.aire_interieure_m2)} m² intérieur · ${fr(v.sol_libre_m2)} m² de sol libre`],
    ["Panneaux", `${m.panneaux_mur_a_commander} de mur (${fz(mod)} × ${fz(m.hauteur_mur_cm)}) · ${m.toit.panneaux.length} de toit · ${m.rehausse.nb_madriers} madrier(s) ${m.rehausse.section_mm.join(" × ")}`],
    ["Ouvertures", `porte ${po.vitree === false ? "pleine" : "vitrée"} ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} face ${m.faces[po.cote].cle} · ${v.fenetres.map((f: any) => `${f.ouvrant ? "OB" : "fixe"} ${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)}, allège ${fz(f.allege_cm)}`).join(" · ")}`],
    ["Gouttière", `${fr(G.longueur_cm)} cm sur ${G.troncons.map((t: any) => t.face).join(" + ")} · descente ${ou_descente(m)}`],
    ["Matériaux", `${eur(B.materiaux_eur)} TTC (${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}), sans main-d'œuvre ni livraison`],
  ];
  html("fiche", paires.map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join(""));
  table("murs", ["mur", "long. ext.", "long. int.", "hauteur finie", "panneaux", "angle au début"],
    m.faces.map((f: any, i: number) => [`<b>${f.cle}</b> ${nom_face(f)}`, `${fr(f.longueur_cm)}`, `${fr(v.cotes_interieures_cm[i])}`, `${fr(f.hauteur_debut_cm)} → ${fr(f.hauteur_fin_cm)}`, f.panneaux.map((pn: any) => `${pn.id} ${fz(pn.largeur_cm)}`).join(" · "), `${fr(m.angles_deg[i])}°`]));

  // implantation et plans : les SVG du modele, injectes tels quels
  liste("implantation-points", [
    `Abri à <b>${fz(gauche)} cm</b> du bord gauche (mur de propriété) et <b>${fz(avant)} cm</b> du bord avant ; <b>${fz(droite_libre)} cm</b> de dalle à droite, le chemin vers la porte et l'arrière.`,
    `Passage derrière, le long du grand pan : <b>${fr(passage.cm)} cm</b> au plus étroit.`,
    v.arriere ? `<b>${fr(v.arriere.aire_m2)} m²</b> de dalle cachés derrière l'abri (hachures vertes), jusqu'à ${fz(v.arriere.profondeur_max_cm)} cm de profondeur : le rangement des outils de jardin.` : "",
  ].filter(Boolean));
  const plans: [string, string][] = [["modele-implantation", "implantation"], ["modele-sol", "sol"], ["modele-toit", "toit"], ["modele-rehausse", "rehausse"]];
  for (const [nom, id] of plans) html(`plan-${id}`, core.svg[nom] || "");
  html("facades", m.faces.map((f: any, i: number) => `<figure><div class="planbox">${core.svg[`modele-facade-${f.cle}`] || ""}</div><figcaption>Face ${f.cle} · ${nom_face(f)}${v.porte && v.porte.cote === i ? " (porte)" : f.cle === "A" ? " (jardin)" : ""}</figcaption></figure>`).join(""));

  // debit
  table("debit-murs", ["pièce", "largeur", "provenance", "découpe"],
    m.faces.flatMap((f: any) => f.panneaux.map((pn: any) => [`<b>${pn.id}</b>`, `${fr(pn.largeur_cm)} cm`, pn.source === "chute" ? "chute d'un autre panneau" : pn.largeur_cm < mod - 0.05 ? "panneau recoupé" : "panneau entier", pn.decoupes.length ? pn.decoupes.join(", ") : "–"])));
  table("debit-toit", ["pièce", "largeur", "longueur", "coupe"],
    m.toit.panneaux.map((t: any) => [`<b>${t.id}</b>`, `${fr(t.largeur_cm)} cm`, `${fr(t.longueur_cm)} cm`, `${t.largeur_cm < mod - 0.05 ? "refendu en largeur, " : ""}${t.biais ? "un bord en biais" : "entier"}`]));
  table("debit-rehausse", ["pièce", "mur", "longueur", "hauteur début → fin"], m.rehausse.pieces.map((r: any) => [`<b>${r.id}</b>`, r.face, `${fr(r.L)} cm`, `${fr(r.h0)} → ${fr(r.h1)} cm`]));

  // materiaux : par groupe, quantites calculees, prix TTC, ni main-d'oeuvre ni forfait
  html("materiaux", B.groupes.map((gr: any) => `<h3>${gr.nom}<span class="sous-total">${eur(gr.total_eur)}</span></h3><div class="table-wrap"><table class="bom"><thead><tr><th>matériau</th><th class="num">quantité</th><th class="num">prix unitaire</th><th class="num">montant</th><th>comment c'est compté · d'où vient le prix</th></tr></thead><tbody>${B.lignes.filter((l: any) => l.groupe === gr.nom).map((l: any) => `<tr><td>${l.poste}${l.a_confirmer ? ' <span class="a-confirmer">prix à confirmer</span>' : ""}</td><td class="num">${fr(l.qte)} ${l.unite}</td><td class="num">${eur(l.pu_eur)}</td><td class="num">${eur(l.montant_eur)}</td><td class="regle">${l.regle}${l.note ? `<br><span class="note-prix">${echappe(l.note)}</span>` : ""}${l.source ? ` <a class="source" href="${l.source}" target="_blank" rel="noopener">source</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`).join(""));
  html("materiaux-total", `<b>Total des matériaux : ${eur(B.materiaux_eur)} TTC</b> (fourchette ${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)}). Équipement optionnel en plus : ${eur(B.options_eur)}.${B.hors_materiaux.length ? ` Hors total : ${B.hors_materiaux.map((h: any) => `${h.poste.replace(/ \(.*/, "")} ≈ ${eur(h.montant_eur)}`).join(", ")}.` : ""} Ni main-d'œuvre ni forfait : seulement ce qu'on achète.`);

  // guide de montage : cases a cocher, etat garde dans le navigateur (par version)
  const Gd = m.guide, cle_cases = `abri-v${a.version}-cases`;
  let faites: Record<string, boolean> = {};
  try { faites = JSON.parse(window.localStorage.getItem(cle_cases) || "{}"); } catch { faites = {}; }
  liste("guide-avant", Gd.avant.map(md_en_ligne));
  liste("guide-outillage", Gd.outillage.map(md_en_ligne));
  html("etapes", Gd.etapes.map((e: any, i: number) => `<li class="etape"><h3><span class="num-etape">${i + 1}</span>${e.titre}</h3><p class="but">${md_en_ligne(e.but)}</p><p class="outils"><b>Outils :</b> ${e.outils.join(", ")}</p><ol>${e.faire.map((x: string) => `<li>${md_en_ligne(x)}</li>`).join("")}</ol><div class="controle"><b>À contrôler avant de continuer</b>${e.controler.map((x: string, k: number) => `<label><input type="checkbox" data-case="${i}.${k}"${faites[`${i}.${k}`] ? " checked" : ""}> ${md_en_ligne(x)}</label>`).join("")}</div></li>`).join(""));
  const etapes = el("etapes");
  if (etapes) etapes.addEventListener("change", (ev) => {
    const c = ev.target as HTMLInputElement;
    if (!c || !c.dataset || !c.dataset.case) return;
    faites[c.dataset.case] = c.checked;
    try { window.localStorage.setItem(cle_cases, JSON.stringify(faites)); } catch { /* navigation privee : l'etat ne survit pas, la page marche */ }
  });

  // ouvertures et amenagement
  table("ouvertures-table", ["ouverture", "taille", "où", "détail"], [
    [`porte ${po.vitree === false ? "pleine" : "vitrée"}`, `${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} cm (cadre ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)})`, `face ${m.faces[po.cote].cle}, de ${fr(po.debut_cm)} à ${fr(Math.round((po.debut_cm + po.largeur_cm) * 10) / 10)} cm depuis la façade`, "ouvre vers l'extérieur, ferrée côté fond"],
    ...v.fenetres.map((f: any) => [`fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"}`, `${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} cm`, `face A, de ${fr(f.debut_cm)} à ${fr(Math.round((f.debut_cm + f.largeur_cm) * 10) / 10)} cm depuis le coin gauche`, `allège ${fz(f.allege_cm)} cm, dans un seul panneau`]),
  ]);
  table("amenagement", ["élément", "taille", "place"], [
    ...v.bureaux.map((b: any) => [`bureau ${b.cote === "avant" ? "de façade" : b.cote}`, `${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)} cm`, `tout le mur ${b.cote === "avant" ? "de façade" : b.cote}`]),
    ...(v.sieges || []).map((st: any) => [st.type, `${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)} cm`, `devant le bureau ${st.contre === "avant" ? "de façade" : st.contre}`]),
    ...(v.lit_pliant ? [[`lit ${v.lit_pliant.replie ? "rabattable" : "pliant"}`, `${fz(v.lit_pliant.largeur_cm)} × ${fz(v.lit_pliant.longueur_cm)} cm`, v.lit_pliant.tient ? (v.lit_pliant.replie ? "contre un mur" : "déplié au sol libre, sièges rangés") : "ne tient pas"]] : []),
  ]);

  // pourquoi
  const T = a.textes;
  const bloc = (titre: string, items: string[], ordonne = false) => (items.length ? `<h3>${titre}</h3><${ordonne ? "ol" : "ul"}>${items.map((s) => `<li>${md_en_ligne(s)}</li>`).join("")}</${ordonne ? "ol" : "ul"}>` : "");
  const section = el("pourquoi"); if (section) (section as HTMLElement).hidden = !T;
  html("pourquoi-corps", T ? bloc("Ce que cette disposition apporte", T.atouts) + bloc("Ce qu'elle coûte", T.pertes) + bloc("Pourquoi ces choix", T.notes, true) + bloc("Conseils que les plans ne montrent pas", T.hors_modele) : "");
}
