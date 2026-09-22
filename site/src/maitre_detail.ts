// liste a gauche, detail a droite : un composant DOM partage par le guide de montage et les materiaux.
// une entree visible a la fois par defaut ; une bascule montre tout (l'impression montre toujours tout).
// l'entree choisie et la bascule sont gardees dans le navigateur sous `memoire`.

export interface Entree { cle: string; titre: string; num?: string; badge?: string; etat?: string; panneau: HTMLElement }
export interface MaitreDetail { montrer(cle: string, defiler?: boolean): void; rafraichir(): void }

interface Options {
  liste: HTMLElement;            // le <ol> de gauche
  mode: HTMLElement;             // ou va la bascule « tout afficher »
  panneaux: HTMLElement;         // la colonne de droite, qui contient chaque panneau
  entrees: () => Entree[];       // recalculees a chaque rafraichissement (badges, etats)
  memoire: string;               // cle localStorage
  ancre?: HTMLElement;           // vers quoi defiler quand on change d'entree par le pied d'un panneau
}

const lire = (cle: string) => { try { return JSON.parse(window.localStorage.getItem(cle) || "null"); } catch { return null; } };
const ecrire = (cle: string, val: unknown) => { try { window.localStorage.setItem(cle, JSON.stringify(val)); } catch { /* navigation privee : l'etat ne survit pas, la page marche */ } };

export function maitre_detail(o: Options): MaitreDetail {
  const etat = { cle: "", tout: false, ...(lire(o.memoire) || {}) } as { cle: string; tout: boolean };
  const cles = () => o.entrees().map((e) => e.cle);

  // pied de chaque panneau : precedente / suivante (cache quand tout est affiche)
  const liste0 = o.entrees();
  liste0.forEach((e, i) => {
    const prec = liste0[i - 1], suiv = liste0[i + 1];
    e.panneau.classList.add("detail");
    e.panneau.insertAdjacentHTML("beforeend", `<p class="suivante">${prec ? `<button type="button" data-aller="${prec.cle}">← ${prec.titre}</button>` : "<span></span>"}${suiv ? `<button type="button" data-aller="${suiv.cle}">${suiv.titre} →</button>` : ""}</p>`);
  });
  o.mode.innerHTML = `<label><input type="checkbox" data-tout${etat.tout ? " checked" : ""}> tout afficher</label>`;

  const rend_liste = () => {
    o.liste.innerHTML = o.entrees().map((e) => `<li class="${[e.etat || "", e.cle === etat.cle ? "ici" : ""].filter(Boolean).join(" ")}"><button type="button" data-aller="${e.cle}">${e.num ? `<span class="num-etape">${e.num}</span>` : ""}<span class="t">${e.titre}</span>${e.badge ? `<span class="badge">${e.badge}</span>` : ""}</button></li>`).join("");
  };
  const applique = () => {
    for (const e of o.entrees()) e.panneau.hidden = !etat.tout && e.cle !== etat.cle;
    o.panneaux.classList.toggle("tout", etat.tout);
    rend_liste();
    ecrire(o.memoire, etat);
  };
  const montrer = (k: string, defiler = false) => {
    if (!cles().includes(k)) k = cles()[0];
    etat.cle = k;
    applique();
    const cible = etat.tout ? o.entrees().find((e) => e.cle === k)!.panneau : o.ancre;
    if (defiler && cible && typeof cible.scrollIntoView === "function") cible.scrollIntoView({ block: "start" });
  };
  montrer(etat.cle);

  const racine = o.panneaux.parentElement || o.panneaux;
  racine.addEventListener("click", (ev) => {
    const b = (ev.target as HTMLElement).closest("[data-aller]") as HTMLElement | null;
    if (b && b.dataset.aller !== undefined) montrer(b.dataset.aller, etat.tout || b.parentElement!.classList.contains("suivante"));
  });
  o.mode.addEventListener("change", (ev) => {
    const c = ev.target as HTMLInputElement;
    if (c && c.dataset && c.dataset.tout !== undefined) { etat.tout = c.checked; applique(); }
  });
  return { montrer, rafraichir: rend_liste };
}
