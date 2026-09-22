// Page d'accueil : l'abri retenu (params.abri_principal), tout calcule depuis les parametres.
// DOM seulement, aucun import de Three : testable sous jsdom. La scene 3D est branchee par abri_main.ts.
import { buildCore, params_v2, version_principale, versions_abri, textes_variante, type Params } from "./compute";
import { maitre_detail, type Entree } from "./maitre_detail";

const fr = (x: number) => String(x).replace(".", ",");
const fz = (x: number) => fr(Math.round(x * 10) / 10);
const eur = (x: number) => `${Math.round(x).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// une cote (nombre + unite) et un repere de face ou de panneau (A, D1, T2, R3) : un style unique sur toute la page
const cote = (x: number | string, u = "cm") => `<span class="cote">${typeof x === "number" ? fr(x) : x}${u ? `<span class="u">${u === "°" ? "" : " "}${u}</span>` : ""}</span>`;
const face = (id: string) => `<span class="face">${id}</span>`;

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

  // menu des versions (seulement s'il y a un choix), en-tete
  const menu = menu_versions(a.p);
  html("versions", menu.map((x) => `<li${x.n === a.version ? ' class="ici"' : ""}><a href="?v=${x.n}"><span class="v-nom">Version ${x.n}${x.principale ? ' <span class="v-retenue">retenue</span>' : ""}</span><span class="v-desc">${echappe(x.nom)}</span><span class="v-chiffres">${fr(x.interieur_m2)} m² int. · passage ${fz(Math.round(x.passage_cm))} cm · ${eur(x.budget_eur)}</span></a></li>`).join(""));
  const bloc_versions = el("bloc-versions"); if (bloc_versions) (bloc_versions as HTMLElement).hidden = menu.length < 2;
  texte("titre", `Bureau de jardin à ${NOMBRES[n] || n} murs`);
  texte("sous-titre", `version ${a.version}${retenue ? "" : " (étude)"} · panneaux sandwich ${fz(ep)} cm · toit vers ${m.sens === "droite" ? "le jardin" : "le fond"}`);
  surligne_section();
  html("bandeau", retenue ? "" : `Vous regardez la <b>version ${a.version}</b>, une étude. L'abri retenu est la <a href="?v=${a.principale}">version ${a.principale}</a>.`);
  const bandeau = el("bandeau"); if (bandeau) (bandeau as HTMLElement).hidden = retenue;
  const doc = el("lien-document") as HTMLAnchorElement | null;
  if (doc) doc.setAttribute("href", retenue ? "docs/abri.html" : `docs/abri-v${a.version}.html`);

  // fiche chantier : ce qu'on cherche sur place, sur un ecran
  // fiche courte : les chiffres qu'on cherche sur place ; le detail est dans les sections
  const paires: [string, string][] = [
    ["Murs", m.faces.map((f: any) => `${face(f.cle)} ${cote(f.longueur_cm, "")}`).join(" · ") + " cm"],
    ["Hauteurs", `panneaux ${cote(m.hauteur_mur_cm)} · finies ${cote(Math.max(...m.hauteurs_coins_cm))} → ${cote(Math.min(...m.hauteurs_coins_cm))}`],
    ["Toit", `vers ${m.sens === "droite" ? "la droite" : "le fond"} · ${cote(m.pente.pourcent, "%")} · portée ${cote(Math.round(m.portee_cm) / 100, "m")}${a.pp.disposition_trapeze.toit.panne_intermediaire ? " + panne" : ""} · gouttière ${G.troncons.map((t: any) => face(t.face)).join(" ")}`],
    ["Surfaces", `${cote(v.aire_m2, "m²")} de murs${sans_formalite ? "" : " (déclaration préalable)"} · ${cote(v.aire_interieure_m2, "m²")} intérieur`],
    ["Passage derrière", cote(passage.cm)],
    ["Matériaux", `${eur(B.materiaux_eur)} TTC`],
  ];
  html("fiche", paires.map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join(""));
  table("murs", ["mur", "long. ext.", "long. int.", "hauteur finie", "panneaux", "angle au début"],
    m.faces.map((f: any, i: number) => [`${face(f.cle)} ${nom_face(f)}`, cote(f.longueur_cm), cote(v.cotes_interieures_cm[i]), `${cote(f.hauteur_debut_cm)} → ${cote(f.hauteur_fin_cm)}`, f.panneaux.map((pn: any) => `${face(pn.id)} ${cote(pn.largeur_cm, "")}`).join(" · "), cote(m.angles_deg[i], "°")]));

  // implantation et plans : les SVG du modele, injectes tels quels
  liste("implantation-points", [
    `${cote(gauche)} du bord gauche (mur de propriété), ${cote(avant)} du bord avant, ${cote(droite_libre)} de dalle à droite : le chemin vers la porte et l'arrière.`,
    `Passage derrière, le long du grand pan : ${cote(passage.cm)} au plus étroit.`,
    v.arriere ? `${cote(v.arriere.aire_m2, "m²")} de dalle cachés derrière l'abri (hachures vertes), jusqu'à ${cote(v.arriere.profondeur_max_cm)} de profondeur : les outils de jardin.` : "",
  ].filter(Boolean));
  const plans: [string, string][] = [["modele-implantation", "implantation"], ["modele-sol", "sol"], ["modele-toit", "toit"], ["modele-rehausse", "rehausse"]];
  for (const [nom, id] of plans) html(`plan-${id}`, core.svg[nom] || "");
  const details_plans = el("plans-details"), liste_plans = el("plans-liste"), mode_plans = el("plans-mode");
  if (details_plans && liste_plans && mode_plans) {
    for (const vieux of details_plans.querySelectorAll("article[data-cle^='facade-']")) vieux.remove();
    details_plans.insertAdjacentHTML("beforeend", m.faces.map((f: any, i: number) => `<article data-cle="facade-${f.cle}"><h3>Face ${face(f.cle)} · ${nom_face(f)}${v.porte && v.porte.cote === i ? " (porte)" : f.cle === "A" ? " (jardin)" : ""}</h3><div class="planbox">${core.svg[`modele-facade-${f.cle}`] || ""}</div></article>`).join(""));
    const fixes: [string, string][] = [["toit", "Toiture"], ["rehausse", "Rehausse"]];
    maitre_detail({
      liste: liste_plans, mode: mode_plans, panneaux: details_plans, memoire: `abri-v${a.version}-plans`, ancre: el("plans-liste") || undefined,
      entrees: () => [
        ...m.faces.map((f: any): Entree => ({ cle: `facade-${f.cle}`, titre: `Face ${f.cle} · ${nom_face(f)}`, num: f.cle, panneau: details_plans.querySelector(`article[data-cle="facade-${f.cle}"]`) as HTMLElement })),
        ...fixes.map(([k, t]): Entree => ({ cle: k, titre: t, panneau: details_plans.querySelector(`article[data-cle="${k}"]`) as HTMLElement })),
      ],
    });
  }

  // debit
  table("debit-murs", ["pièce", "largeur", "provenance", "découpe"],
    m.faces.flatMap((f: any) => f.panneaux.map((pn: any) => [face(pn.id), cote(pn.largeur_cm), pn.source === "chute" ? "chute d'un autre panneau" : pn.largeur_cm < mod - 0.05 ? "panneau recoupé" : "panneau entier", pn.decoupes.length ? pn.decoupes.join(", ") : "–"])));
  table("debit-toit", ["pièce", "largeur", "longueur", "coupe"],
    m.toit.panneaux.map((t: any) => [face(t.id), cote(t.largeur_cm), cote(t.longueur_cm), `${t.largeur_cm < mod - 0.05 ? "refendu en largeur, " : ""}${t.biais ? "un bord en biais" : "entier"}`]));
  table("debit-rehausse", ["pièce", "mur", "longueur", "hauteur début → fin"], m.rehausse.pieces.map((r: any) => [face(r.id), face(r.face), cote(r.L), `${cote(r.h0)} → ${cote(r.h1)}`]));

  // materiaux : par groupe, quantites calculees, prix TTC, ni main-d'oeuvre ni forfait
  html("materiaux", B.groupes.map((gr: any) => `<article data-cle="${gr.nom}"><h3>${gr.nom}<span class="sous-total">${eur(gr.total_eur)}</span></h3><div class="table-wrap"><table class="bom"><thead><tr><th>matériau</th><th class="num">quantité</th><th class="num">prix unitaire</th><th class="num">montant</th><th>règle · source</th></tr></thead><tbody>${B.lignes.filter((l: any) => l.groupe === gr.nom).map((l: any) => `<tr><td>${l.poste}${l.a_confirmer ? ' <span class="a-confirmer">prix à confirmer</span>' : ""}</td><td class="num">${fr(l.qte)} ${l.unite}</td><td class="num">${eur(l.pu_eur)}</td><td class="num">${eur(l.montant_eur)}</td><td class="regle">${l.regle}${l.note ? `<br><span class="note-prix">${echappe(l.note)}</span>` : ""}${l.source ? ` <a class="source" href="${l.source}" target="_blank" rel="noopener">source</a>` : ""}</td></tr>`).join("")}</tbody></table></div></article>`).join(""));
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
    [`porte ${po.vitree === false ? "pleine" : "vitrée"}`, `${cote(`${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)}`)} (cadre ${cote(`${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)}`)})`, `face ${face(m.faces[po.cote].cle)}, de ${cote(po.debut_cm, "")} à ${cote(Math.round((po.debut_cm + po.largeur_cm) * 10) / 10)} depuis la façade`, "ouvre vers l'extérieur, ferrée côté fond"],
    ...v.fenetres.map((f: any) => [`fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"}`, cote(`${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)}`), `face ${face("A")}, de ${cote(f.debut_cm, "")} à ${cote(Math.round((f.debut_cm + f.largeur_cm) * 10) / 10)} depuis le coin gauche`, `allège ${cote(f.allege_cm)}, dans un seul panneau`]),
  ]);
  table("amenagement", ["élément", "taille", "place"], [
    ...v.bureaux.map((b: any) => [`bureau ${b.cote === "avant" ? "de façade" : b.cote}`, cote(`${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)}`), `tout le mur ${b.cote === "avant" ? "de façade" : b.cote}`]),
    ...(v.sieges || []).map((st: any) => [st.type, cote(`${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)}`), `devant le bureau ${st.contre === "avant" ? "de façade" : st.contre}`]),
    ...(v.lit_pliant ? [[`lit ${v.lit_pliant.replie ? "rabattable" : "pliant"}`, cote(`${fz(v.lit_pliant.largeur_cm)} × ${fz(v.lit_pliant.longueur_cm)}`), v.lit_pliant.tient ? (v.lit_pliant.replie ? "contre un mur" : "déplié au sol libre, sièges rangés") : "ne tient pas"]] : []),
  ]);

  // pourquoi
  const T = a.textes;
  const bloc = (titre: string, items: string[], ordonne = false) => (items.length ? `<h3>${titre}</h3><${ordonne ? "ol" : "ul"}>${items.map((s) => `<li>${md_en_ligne(s)}</li>`).join("")}</${ordonne ? "ol" : "ul"}>` : "");
  const section = el("pourquoi"); if (section) (section as HTMLElement).hidden = !T;
  html("pourquoi-corps", T ? bloc("Ce que cette disposition apporte", T.atouts) + bloc("Ce qu'elle coûte", T.pertes) + bloc("Pourquoi ces choix", T.notes, true) + bloc("Conseils que les plans ne montrent pas", T.hors_modele) : "");
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
