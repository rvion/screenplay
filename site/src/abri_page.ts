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
  if (!v || !m) { html("kpis", '<p class="viewer-fallback">Aucun abri retenu dans params.json.</p>'); return; }
  const seuil = +(pp.reglementaire && pp.reglementaire.seuil_sans_formalite_m2) || 5, ep = +pp.panneau.epaisseur_mm / 10, mod = +pp.panneau.largeur_utile_cm;
  const passage = v.passages.find((q: any) => q.cote === "arriere_droite"), B = m.budget, n = m.faces.length;
  const gauche = Math.min(...v.polygone.map((z: number[]) => z[0])), avant = Math.min(...v.polygone.map((z: number[]) => z[1]));
  const droite_libre = core.geometrie.dalle.avant - Math.max(...v.polygone.map((z: number[]) => z[0]));
  const sans_formalite = v.aire_m2 <= seuil;
  const nom_face = (f: any) => (f.cle === "A" ? "façade" : f.nom);

  // menu des versions, et ce que la page montre
  const NOMBRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"];
  html("versions", menu_versions(a.p).map((x) => `<li${x.n === a.version ? ' class="ici"' : ""}><a href="?v=${x.n}"><span class="v-nom">Version ${x.n}${x.principale ? ' <span class="v-retenue">retenue</span>' : ""}</span><span class="v-desc">${echappe(x.nom)}</span><span class="v-chiffres">${fr(x.interieur_m2)} m² int. · ${fr(x.murs_m2)} m² · passage ${fz(Math.round(x.passage_cm))} cm · ${eur(x.budget_eur)}</span></a></li>`).join(""));
  texte("titre", `🏡 Bureau de jardin à ${NOMBRES[n] || n} murs`);
  const retenue = a.version === a.principale;
  html("bandeau", retenue ? "" : `Vous regardez la <b>version ${a.version}</b>, une étude. L'abri retenu est la <a href="?v=${a.principale}">version ${a.principale}</a>.`);
  const bandeau = el("bandeau"); if (bandeau) (bandeau as HTMLElement).hidden = retenue;
  const doc = el("lien-document") as HTMLAnchorElement | null;
  if (doc) doc.setAttribute("href", retenue ? "docs/abri.html" : `docs/abri-v${a.version}.html`);

  // en-tete
  texte("sous-titre", `${n} murs en panneaux sandwich ${fz(ep)} cm autoportants · ${fr(v.aire_m2)} m² de murs, ${fr(v.aire_interieure_m2)} m² intérieur · toit vers ${m.sens === "droite" ? "le jardin" : "le fond"} · sur la dalle existante`);
  html("badges", [sans_formalite ? `Sans formalité (≤ ${fz(seuil)} m²)` : "Déclaration préalable", `Passage arrière ${fz(Math.floor(passage.cm))} cm`, `${m.panneaux_mur_a_commander} panneaux de mur`, "Paramétrique"].map((s) => `<span class="badge">${s}</span>`).join(""));

  // apercu
  html("kpis", [[`${fr(v.aire_interieure_m2)} m²`, "intérieur"], [`${fr(v.aire_m2)} m²`, "murs (emprise)"], [`${fz(passage.cm)} cm`, "passage derrière"], [eur(B.total_eur), "budget indicatif HT"]]
    .map(([val, lab]) => `<div class="card kpi"><div class="v">${val}</div><div class="l">${lab}</div></div>`).join(""));
  table("murs", ["mur", "longueur ext.", "longueur int.", "hauteur finie", "panneaux", "angle au début"],
    m.faces.map((f: any, i: number) => [`<b>${f.cle}</b> · ${nom_face(f)}`, `${fr(f.longueur_cm)} cm`, `${fr(v.cotes_interieures_cm[i])} cm`, `${fr(f.hauteur_debut_cm)} → ${fr(f.hauteur_fin_cm)} cm`, f.panneaux.map((pn: any) => `${pn.id} ${fz(pn.largeur_cm)}`).join(" · "), `${fr(m.angles_deg[i])}°`]));

  // implantation
  liste("implantation-points", [
    `L'abri est posé à <b>${fz(gauche)} cm</b> du bord gauche de la dalle (mur de propriété) et à <b>${fz(avant)} cm</b> du bord avant.`,
    `À droite il reste <b>${fz(droite_libre)} cm</b> de dalle : le chemin vers la porte et vers l'arrière.`,
    `Derrière, le passage le long du grand pan fait <b>${fr(passage.cm)} cm</b> au plus étroit.`,
    v.arriere ? `<b>${fr(v.arriere.aire_m2)} m²</b> de dalle restent cachés derrière l'abri (hachures vertes), jusqu'à ${fz(v.arriere.profondeur_max_cm)} cm de profondeur : le rangement des outils de jardin.` : "",
    sans_formalite ? `${fr(v.aire_m2)} m² de murs : au seuil de ${fz(seuil)} m², aucune formalité a priori (à confirmer en mairie, et le PLU s'applique quand même).` : `${fr(v.aire_m2)} m² de murs : au-dessus de ${fz(seuil)} m², déclaration préalable.`,
  ].filter(Boolean));

  // plans : les SVG du modele, injectes tels quels
  const plans: [string, string][] = [["modele-implantation", "implantation"], ["modele-sol", "sol"], ["modele-toit", "toit"], ["modele-rehausse", "rehausse"]];
  for (const [nom, id] of plans) html(`plan-${id}`, core.svg[nom] || "");
  html("facades", m.faces.map((f: any, i: number) => `<figure><div class="planbox">${core.svg[`modele-facade-${f.cle}`] || ""}</div><figcaption>Face ${f.cle} · ${nom_face(f)}${v.porte && v.porte.cote === i ? " (porte)" : f.cle === "A" ? " (jardin)" : ""}</figcaption></figure>`).join(""));

  // a commander
  table("debit-murs", ["pièce", "largeur", "provenance", "découpe"],
    m.faces.flatMap((f: any) => f.panneaux.map((pn: any) => [`<b>${pn.id}</b>`, `${fr(pn.largeur_cm)} cm`, pn.source === "chute" ? "chute d'un autre panneau" : pn.largeur_cm < mod - 0.05 ? "panneau recoupé" : "panneau entier", pn.decoupes.length ? pn.decoupes.join(", ") : "–"])));
  texte("debit-murs-total", `${m.panneaux_mur_a_commander} panneaux de mur de ${fz(mod)} × ${fz(m.hauteur_mur_cm)} cm à commander (les bandes étroites sortent des chutes).`);
  table("debit-toit", ["pièce", "largeur", "longueur à commander", "coupe"],
    m.toit.panneaux.map((t: any) => [`<b>${t.id}</b>`, `${fr(t.largeur_cm)} cm`, `${fr(t.longueur_cm)} cm`, `${t.largeur_cm < mod - 0.05 ? "refendu en largeur, " : ""}${t.biais ? "un bord en biais" : "entier, coupes droites"}`]));
  table("debit-rehausse", ["pièce", "mur", "longueur", "hauteur début → fin"], m.rehausse.pieces.map((r: any) => [`<b>${r.id}</b>`, r.face, `${fr(r.L)} cm`, `${fr(r.h0)} → ${fr(r.h1)} cm`]));
  texte("debit-rehausse-total", `${m.rehausse.nb_madriers} madrier(s) ${m.rehausse.section_mm.join(" × ")} de ${fz(m.rehausse.longueur_stock_cm)} cm. Deux pièces sur un même tronçon = une seule coupe en biais.`);
  const perim = m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100, G = m.toit.gouttiere;
  liste("debit-divers", [
    `Gouttière <b>${fr(G.longueur_cm)} cm</b> (${G.troncons.map((t: any) => `${t.face} ${fr(t.longueur_cm)}`).join(" + ")}), descente ${ou_descente(m)}.`,
    `Rail de pied sur tout le périmètre : <b>${fr(Math.round(perim * 100) / 100)} m</b>, sur bande EPDM.`,
    `${n} profils d'angle (extérieur + intérieur) : ${m.faces.map((f: any, i: number) => `${m.faces[(i + n - 1) % n].cle}/${f.cle} ${fr(m.angles_deg[i])}°`).join(", ")}. Les angles qui ne sont pas droits se commandent pliés sur mesure.`,
  ]);

  // ouvertures et amenagement
  const po = v.porte;
  table("ouvertures-table", ["ouverture", "taille", "où", "détail"], [
    [`porte ${po.vitree === false ? "pleine" : "vitrée"}`, `${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} cm (cadre ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)})`, `face ${m.faces[po.cote].cle}, de ${fr(po.debut_cm)} à ${fr(Math.round((po.debut_cm + po.largeur_cm) * 10) / 10)} cm depuis la façade`, "ouvre vers l'extérieur, ferrée côté fond"],
    ...v.fenetres.map((f: any) => [`fenêtre ${f.ouvrant ? "oscillo-battante" : "fixe"}`, `${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} cm`, `face A, de ${fr(f.debut_cm)} à ${fr(Math.round((f.debut_cm + f.largeur_cm) * 10) / 10)} cm depuis le coin gauche`, `allège ${fz(f.allege_cm)} cm, dans un seul panneau`]),
  ]);
  table("amenagement", ["élément", "taille", "place"], [
    ...v.bureaux.map((b: any) => [`bureau ${b.cote === "avant" ? "de façade" : b.cote}`, `${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)} cm`, `tout le mur ${b.cote === "avant" ? "de façade" : b.cote}`]),
    ...(v.sieges || []).map((st: any) => [st.type, `${fz(st.largeur_cm)} × ${fz(st.profondeur_cm)} cm`, `devant le bureau ${st.contre === "avant" ? "de façade" : st.contre}`]),
    ...(v.lit_pliant ? [[`lit ${v.lit_pliant.replie ? "rabattable" : "pliant"}`, `${fz(v.lit_pliant.largeur_cm)} × ${fz(v.lit_pliant.longueur_cm)} cm`, v.lit_pliant.tient ? (v.lit_pliant.replie ? "contre un mur" : "déplié au sol libre, sièges rangés") : "ne tient pas"]] : []),
  ]);
  texte("sol-libre", `Sol libre hors bureaux : ${fr(v.sol_libre_m2)} m².`);

  // budget
  table("budget", ["poste", "quantité", "prix unitaire", "montant"], B.lignes.map((l: any) => [l.poste, `${fr(l.qte)} ${l.unite}`, eur(l.pu_eur), eur(l.montant_eur)]),
    ["<b>total</b>", `coque ${eur(B.coque_eur)} · aménagement ${eur(B.amenagement_eur)}`, "", `<b>${eur(B.total_eur)}</b>`]);
  texte("budget-fourchette", `${eur(B.total_bas_eur)} à ${eur(B.total_haut_eur)} HT (±${B.incertitude_pct} %), fourniture seule, prix médians à confirmer par devis.`);

  // montage : les etapes, avec les cotes du modele
  const F = Object.fromEntries(m.faces.map((f: any) => [f.cle, f])), bande = (f: any) => f.panneaux.find((pn: any) => pn.largeur_cm < mod - 0.05);
  const obtus = m.angles_deg.filter((g: number) => Math.abs(g - 90) > 0.5);
  liste("etapes", [
    `<b>Tracer sur la dalle.</b> Reporter les ${n} murs : ${m.faces.map((f: any) => `${f.cle} ${fr(f.longueur_cm)}`).join(", ")} cm, à ${fz(gauche)} cm du bord gauche et ${fz(avant)} cm du bord avant. Vérifier les angles (${m.angles_deg.map((g: number) => fr(g) + "°").join(", ")}) et les diagonales avant de percer.`,
    `<b>Rail de pied.</b> ${fr(Math.round(perim * 100) / 100)} m de rail sur bande EPDM, chevillé tous les 50 cm. Il surélève les panneaux de la dalle.`,
    F.G ? `<b>Mur gauche d'abord, assemblé à plat.</b> ${F.G.panneaux.length} panneaux (${F.G.panneaux.map((pn: any) => fz(pn.largeur_cm)).join(" + ")} cm) et leur rehausse, vissés au sol puis levés d'un bloc : à ${fz(gauche)} cm du mur de propriété aucune visseuse ne passe.${bande(F.G) ? ` La bande de ${fz(bande(F.G).largeur_cm)} cm est côté façade, la seule extrémité qu'on atteint.` : ""}` : "",
    F.B ? `<b>Mur du fond${F.C ? " et pan en biais" : ""}.</b> ${F.B.panneaux.map((pn: any) => pn.id).join(", ")}${F.C ? ` puis ${F.C.panneaux.map((pn: any) => `${pn.id} (${fz(pn.largeur_cm)})`).join(", ")}` : ""}. Les angles de ${[...new Set(obtus.map((g: number) => fr(g) + "°"))].join(" et ")} reçoivent des profils pliés sur mesure, à commander avec les panneaux.` : "",
    `<b>Façade.</b> ${F.A.panneaux.length} panneaux ; découper les ${v.fenetres.length} fenêtres (${v.fenetres.map((f: any) => `${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)}, allège ${fz(f.allege_cm)}`).join(" ; ")}) à plat avant la pose, une par panneau, jamais sur un joint.`,
    `<b>Mur de la porte.</b> ${F[m.faces[po.cote].cle].panneaux.map((pn: any) => `${pn.id} ${fz(pn.largeur_cm)}`).join(", ")} cm. Le cadre bois de ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)} cm tient dans le module du fond et sert de montant d'angle.`,
    `<b>Rehausse bois.</b> ${m.rehausse.pieces.length} pièces (${m.rehausse.pieces.map((r: any) => `${r.id} sur ${r.face}`).join(", ")}) tirées de ${m.rehausse.nb_madriers} madrier(s) ${m.rehausse.section_mm.join(" × ")}. Posée sur butyle et vissée en tête des panneaux, elle fait lisse haute : c'est elle qui tient le toit.`,
    `<b>Toit.</b> ${m.toit.panneaux.length} panneaux (${m.toit.panneaux.map((t: any) => `${t.id} ${fz(t.largeur_cm)} × ${fz(t.longueur_cm)}`).join(", ")} cm), nervures dans le sens de la pente (${fr(m.pente.pourcent)} %, vers ${m.sens === "droite" ? "la droite" : "le fond"}). ${m.toit.panneaux.filter((t: any) => t.biais).length} portent un bord en biais à couper au sol. Rives fermées par une bavette.`,
    `<b>Gouttière.</b> ${fr(G.longueur_cm)} cm en ${G.troncons.length} tronçon(s) sur ${G.troncons.map((t: any) => t.face).join(" et ")}, descente ${ou_descente(m)}.`,
    `<b>Porte, fenêtres, étanchéité.</b> Bande comprimée au pourtour des ouvertures et au pied, couvre-joints d'angle. Fermer le vide de ${fz(gauche)} cm contre le mur de propriété : bavette devant, grillage au fond.`,
    `<b>Intérieur.</b> Plancher isolé, multiprise et éclairage sur le câble déjà présent, bureaux sur pieds (les parements de 0,5 mm ne portent pas une charge suspendue), chauffage, stores sur les fenêtres de façade.`,
  ].filter(Boolean));

  // pourquoi
  const T = a.textes;
  const bloc = (titre: string, items: string[], ordonne = false) => (items.length ? `<h3>${titre}</h3><${ordonne ? "ol" : "ul"}>${items.map((s) => `<li>${md_en_ligne(s)}</li>`).join("")}</${ordonne ? "ol" : "ul"}>` : "");
  const section = el("pourquoi"); if (section) (section as HTMLElement).hidden = !T;
  html("pourquoi-corps", T ? bloc("Ce que cette disposition apporte", T.atouts) + bloc("Ce qu'elle coûte", T.pertes) + bloc("Pourquoi ces choix", T.notes, true) + bloc("Conseils que les plans ne montrent pas", T.hors_modele) : "");
}
