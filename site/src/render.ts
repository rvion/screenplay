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
  const g = core.geometrie;
  const data: [string, string][] = [
    [g.aire_m2 + " m²", "Surface au sol"],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "°)"],
    [p.panneau.epaisseur_mm + " mm", "Panneaux sandwich"],
    [core.debit.commande_panneaux_m2 + " m²", "Panneaux à commander"],
  ];
  setHTML("#kpis", data.map(([v, l]) =>
    `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join(""));
}

function renderFaces(core: Core) {
  const g = core.geometrie, t = core.debit.toit;
  let rows = g.faces.map((f: any) =>
    `<tr><td><b>${f.cle}</b> · ${f.libelle}</td>` +
    `<td>${f.longueur_cm} cm</td>` +
    `<td>${f.hauteur_debut_cm} → ${f.hauteur_fin_cm} cm` +
    (f.rake ? ' <span class="tag rake">biais</span>' : "") + `</td></tr>`).join("");
  rows += `<tr style="background:#eef2e8"><td><b>${t.face}</b> · ${t.libelle} <span class="tag toit">toit</span></td>` +
    `<td>${(t.longueur_panneau_cm / 100).toFixed(2)} m <span class="note">(rampant)</span></td>` +
    `<td>${g.hauteur_avant_cm} → ${g.hauteur_arriere_cm} cm · pente ${g.pente.pourcent}%</td></tr>`;
  setHTML("#faces tbody", rows);
}

function renderPlans(core: Core) {
  for (const [name, svg] of Object.entries(core.svg)) {
    const box = document.getElementById("plan-" + name); // ids: plan-plan-sol, plan-facade-A, ...
    if (box) box.innerHTML = svg as string;
  }
}

function renderDebit(core: Core) {
  const t = core.debit;
  let rows = t.murs.lignes.map((r: any) =>
    `<tr><td><b>${r.face}</b> · ${r.libelle}</td>` +
    `<td><span class="tag">mur</span></td>` +
    `<td>${r.longueur_cm} × ${r.hauteur_cm} cm` +
    (r.rake ? ' <span class="tag rake">tête en biais</span>' : "") + `</td>` +
    `<td>${r.nb_panneaux}</td><td>${r.aire_brute_m2} m²</td></tr>`).join("");
  rows += `<tr style="background:#eef2e8"><td><b>${t.toit.face}</b> · ${t.toit.libelle}</td>` +
    `<td><span class="tag toit">toit</span></td>` +
    `<td>${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m (sens de la pente) · couvre ${t.toit.aire_couverte_m2} m²</td>` +
    `<td>${t.toit.nb_panneaux}</td><td>${t.toit.aire_brute_m2} m²</td></tr>`;
  setHTML("#debit tbody", rows);
  setHTML("#debit-resume",
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> (~${t.murs.aire_brute_m2} m² brut, ${t.murs.aire_nette_m2} m² net). ` +
    `Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. ` +
    `Commande totale avec chute ${t.facteur_chute_pct}% : <b>${t.commande_panneaux_m2} m²</b>.`);
}

function renderAchats(core: Core) {
  setHTML("#achats tbody", core.achats.map((a: any) =>
    `<tr><td>${a.poste}</td><td>${a.qte}</td><td class="note">${a.note}</td></tr>`).join(""));
}

function renderBudget(core: Core) {
  const b = core.budget;
  setHTML("#budget tbody", b.lignes.map((r: any) =>
    `<tr><td>${r.poste}</td><td>${r.qte} ${r.unite}</td><td>${r.pu_eur} €</td><td><b>${r.montant_eur} €</b></td></tr>`).join(""));
  setHTML("#budget-total",
    `Sous-total <b>${b.sous_total_eur} €</b> HT · fourchette indicative ` +
    `<b>${b.total_bas_eur} – ${b.total_haut_eur} €</b> (±${b.incertitude_pct} %)`);
}

function renderVigilance(core: Core, p: Params) {
  const pente = core.geometrie.pente;
  setText("cover", p.panneau.largeur_utile_cm + " cm");
  setText("v-chute", String(pente.chute_cm));
  setText("v-pente", pente.pourcent + " %");
  setText("v-pente-deg", pente.degres + "°");
}

export function renderAll(core: Core, p: Params) {
  renderKpis(core, p);
  renderFaces(core);
  renderPlans(core);
  renderDebit(core);
  renderAchats(core);
  renderBudget(core);
  renderVigilance(core, p);
}
