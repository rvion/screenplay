// Rendu DOM de toute la page a partir du coeur recalcule (buildCore) + params.
// Appele a chaque changement de parametre : tout est reconstruit (idempotent).
import type { Params } from "./compute";

type Core = ReturnType<typeof import("./compute").buildCore>;

function setHTML(sel: string, html: string) {
  const e = document.querySelector(sel);
  if (e) e.innerHTML = html;
}
function setText(id: string, txt: string) {
  const e = document.getElementById(id);
  if (e) e.textContent = txt;
}

function renderKpis(core: Core, p: Params) {
  const g = core.geometrie, t = core.debit;
  const data: [string, string][] = [
    [g.aire_m2 + " m²", `Surface (${g.cotes.A} × ${g.cotes.G} cm)`],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "°)"],
    [`${t.murs.total_panneaux + t.rehausse.nb_panneaux} + ${t.toit.nb_panneaux}`, "Panneaux mur + toit"],
    [t.commande_panneaux_m2 + " m²", "À commander (avec chute)"],
  ];
  setHTML("#kpis", data.map(([v, l]) =>
    `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join(""));
}

const REH: Record<string, string> = { bandeau: "bandeau", triangle: "triangle", aucune: "—" };

function renderFaces(core: Core) {
  const g = core.geometrie, t = core.debit.toit;
  let rows = g.faces.map((f: any) =>
    `<tr><td><b>${f.cle}</b> · ${f.libelle}</td>` +
    `<td>${f.longueur_cm} cm</td>` +
    `<td>${f.hauteur_mur_cm} cm</td>` +
    `<td>${f.rehausse === "aucune" ? "—" : `<span class="tag rake">${REH[f.rehausse]}</span> → ${f.hauteur_debut_cm}–${f.hauteur_fin_cm} cm`}</td></tr>`).join("");
  rows += `<tr class="row-toit"><td><b>${t.face}</b> · ${t.libelle} <span class="tag toit">toit</span></td>` +
    `<td>${t.largeur_cm} cm</td><td colspan="2">${(t.longueur_panneau_cm / 100).toFixed(2)} m de rampant · ${g.hauteur_avant_cm} → ${g.hauteur_arriere_cm} cm</td></tr>`;
  setHTML("#faces tbody", rows);
}

function renderPlans(core: Core) {
  for (const [name, svg] of Object.entries(core.svg)) {
    const box = document.getElementById("plan-" + name); // ids: plan-plan-sol, plan-facade-A, ...
    if (box) box.innerHTML = svg as string;
  }
}

function renderDebit(core: Core, p: Params) {
  const t = core.debit, r = t.rehausse, cover = p.panneau.largeur_utile_cm;
  let rows = t.murs.lignes.map((x: any) =>
    `<tr><td><b>${x.face}</b> · ${x.libelle}</td><td><span class="tag">mur</span></td>` +
    `<td>${x.pieces.map((q: any) => q.remplace_par ? `<s>${q.label}</s> = ${q.remplace_par}` : `<b>${q.label}</b> ${q.largeur_cm}`).join(" · ")} × ${x.hauteur_cm} cm — coupes droites</td>` +
    `<td>${x.nb_panneaux}</td><td>${x.aire_brute_m2} m²</td></tr>`).join("");
  const bois = r.materiau === "bois";
  rows += `<tr><td><b>R</b> · Rehausse</td><td><span class="tag rake">${bois ? "bois" : "mur"}</span></td>` +
    `<td>${r.pieces.map((q: any) => `<b>${q.label}</b> ${q.longueur_cm} × ${q.hauteur_cm} cm (${q.piece.toLowerCase()})`).join(" + ")}, ` +
    (bois ? `${r.nb_madriers} madrier ${r.section_mm[0]}×${r.section_mm[1]} de ${(r.longueur_stock_cm / 100).toFixed(2)} m (${r.ml} ml)` : `tirées de ${r.nb_panneaux} panneau de ${(r.longueur_panneau_cm / 100).toFixed(2)} m`) + `</td>` +
    `<td>${bois ? r.nb_madriers + " madrier" : r.nb_panneaux}</td><td>${bois ? "—" : r.aire_brute_m2 + " m²"}</td></tr>`;
  rows += `<tr class="row-toit"><td><b>${t.toit.face}</b> · ${t.toit.libelle}</td><td><span class="tag toit">toit</span></td>` +
    `<td>${t.toit.pieces.map((q: any) => `<b>${q.label}</b> ${q.largeur_cm}`).join(" · ")} × ${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m dans le sens de la pente · couvre ${t.toit.aire_couverte_m2} m²</td>` +
    `<td>${t.toit.nb_panneaux}</td><td>${t.toit.aire_brute_m2} m²</td></tr>`;
  setHTML("#debit tbody", rows);
  setHTML("#debit-resume",
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> identiques (~${t.murs.aire_brute_m2} m² brut, ${t.murs.aire_nette_m2} m² net)` +
    (bois ? ` + rehausse en <b>bois</b> (${r.nb_madriers} madrier)` : ` + <b>${r.nb_panneaux} panneau</b> de rehausse`) + `. Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. ` +
    `Commande totale avec chute ${t.facteur_chute_pct} % : <b>${t.commande_panneaux_m2} m²</b>.`);
}

function renderAchats(core: Core) {
  setHTML("#achats tbody", core.achats.map((a: any) =>
    `<tr><td>${a.poste}</td><td>${a.qte}</td><td class="note">${a.note}</td></tr>`).join(""));
}

function renderBudget(core: Core) {
  const b = core.budget;
  const row = (r: any) => `<tr class="${r.groupe === "amenagement" ? "row-amen" : ""}"><td>${r.poste}</td><td>${r.qte} ${r.unite}</td><td>${r.pu_eur} €</td><td><b>${r.montant_eur} €</b></td></tr>`;
  const coque = b.lignes.filter((r: any) => r.groupe !== "amenagement"), amen = b.lignes.filter((r: any) => r.groupe === "amenagement");
  setHTML("#budget tbody", coque.map(row).join("") +
    `<tr class="row-sub"><td colspan="3">Coque (structure, menuiseries, toit)</td><td><b>${b.coque_eur} €</b></td></tr>` +
    amen.map(row).join("") +
    (amen.length ? `<tr class="row-sub"><td colspan="3">Aménagement (confort au quotidien)</td><td><b>${b.amenagement_eur} €</b></td></tr>` : ""));
  setHTML("#budget-total",
    `Total <b>${b.sous_total_eur} €</b> HT · fourchette indicative ` +
    `<b>${b.total_bas_eur} – ${b.total_haut_eur} €</b> (±${b.incertitude_pct} %)`);
}

function renderAmenagement(core: Core, p: Params) {
  const am = p.amenagement || {}, g = core.geometrie;
  const items: [string, string, string][] = [
    ["plancher", "🪵 Plancher isolé", am.plancher ? `${am.plancher.description}. ${am.plancher.epaisseur_cm} cm ⇒ hauteur sous plafond ${((g.hauteur_arriere_cm - am.plancher.epaisseur_cm) / 100).toFixed(2)} m à l'arrière, ${((g.hauteur_avant_cm - am.plancher.epaisseur_cm) / 100).toFixed(2)} m à l'avant.` : ""],
    ["electricite", "🔌 Électricité", am.electricite ? am.electricite.description : ""],
    ["chauffage", "🔥 Chauffage", am.chauffage ? am.chauffage.description : ""],
    ["store", "🌞 Store", am.store ? am.store.description : ""],
    ["finition_interieure", "🎧 Finition intérieure", am.finition_interieure ? am.finition_interieure.description : ""],
  ];
  setHTML("#amenagement-list", items.filter(([k]) => am[k] && am[k].actif)
    .map(([, t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("") || "<li class=\"note\">Aucun aménagement activé (voir réglages).</li>");
  setText("v-interieur", String(g.aire_interieure_m2));
}

function renderVigilance(core: Core, p: Params) {
  const g = core.geometrie, pente = g.pente, d = g.dalle;
  setText("cover", p.panneau.largeur_utile_cm + " cm");
  setText("v-chute", String(pente.chute_cm));
  setText("v-pente", pente.pourcent + " %");
  setText("v-pente-deg", pente.degres + "°");
  setText("v-portee", (core.debit.toit.portee_cm / 100).toFixed(2) + " m");
  setText("v-ep", String(p.panneau.epaisseur_mm));
  setText("v-emprise", String(g.aire_m2));
  setText("v-emprise-deb", String(g.emprise_debords_m2));
  const seuil = document.getElementById("v-seuil");
  if (seuil) seuil.textContent = g.emprise_debords_m2 <= 5 ? "sous le seuil des 5 m² débords inclus : a priori aucune formalité." : g.aire_m2 <= 5 ? "murs sous 5 m² mais débords inclus au-dessus : selon la lecture de la mairie, déclaration préalable possible." : "au-dessus de 5 m² : déclaration préalable à prévoir.";
  const card = document.getElementById("v-dalle");
  if (card && d) {
    const hors = d.hors_dalle_m2 > 0 || d.depasse_bbox;
    card.hidden = !hors;
    setText("v-dalle-tri", `${d.hors_dalle_triangle_cm[0]} × ${d.hors_dalle_triangle_cm[1]} cm (${d.hors_dalle_m2} m²)`);
  } else if (card) card.hidden = true;
}

export function renderAll(core: Core, p: Params) {
  renderKpis(core, p);
  renderFaces(core);
  renderPlans(core);
  renderDebit(core, p);
  renderAchats(core);
  renderBudget(core);
  renderAmenagement(core, p);
  renderVigilance(core, p);
}
