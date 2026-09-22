// Point d'entree de la page d'accueil : calcule l'abri retenu depuis window.SHED_PARAMS,
// remplit la page, puis branche la scene 3D (qui echoue proprement sans WebGL).
import { calcule_abri, rend_abri } from "./abri_page";
import { createAbriViewer, applique_etats, VUES, ETATS_DEFAUT, type AbriViewer, type NomVue, type Etats } from "./viewer_abri";

document.addEventListener("DOMContentLoaded", () => {
  const params = (window as any).SHED_PARAMS;
  if (!params) { console.error("params.js manquant (window.SHED_PARAMS)."); return; }
  // ?v=2 : une autre version prete ; sans rien, la version retenue
  const demande = Number(new URLSearchParams(window.location.search).get("v")) || 0;
  const abri = calcule_abri(JSON.parse(JSON.stringify(params)), demande);
  rend_abri(abri);

  const boite = document.getElementById("viewer");
  let vue: AbriViewer | null = null;
  try {
    if (boite && abri.core.modele3d) vue = createAbriViewer(boite, abri.core.modele3d);
    // abri_vue.placer({...}) depuis la console : rejouer un etat copie
    (window as any).abri_vue = vue;
  } catch (e) {
    if (boite) boite.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible (WebGL requis). Les plans ci-dessous restent entièrement valables.</p>';
    console.error(e);
  }
  // boutons d'etat : un clic avance l'etat ; un point de vue les regle tous d'un coup
  const NOMS = ["toit", "murs", "porte", "mobilier", "lit", "etiquettes", "personne", "cloture"] as const;
  const bouton = (nom: string) => document.getElementById("voir-" + nom) as HTMLButtonElement | null;
  const montre_bouton = (nom: string, etat: number) => {
    const b = bouton(nom); if (!b) return;
    b.dataset.etat = String(etat); b.setAttribute("aria-pressed", String(etat > 0));
    b.querySelectorAll(".points b").forEach((pt, i) => pt.classList.toggle("ici", i === etat));
  };
  const etats = (): Etats => { const e: any = { ...ETATS_DEFAUT }; for (const n of NOMS) { const b = bouton(n); if (b) e[n] = +(b.dataset.etat || 0); } return e; };
  const applique = (e: Etats) => { for (const n of NOMS) montre_bouton(n, e[n]); };
  // vignettes : les points de vue fixes sous le resume, la premiere est la vue de depart ; un clic regle camera et etats
  const vignettes = [...document.querySelectorAll<HTMLElement>("#vignettes [data-vue]")];
  const rend_vignettes = () => { for (const b of vignettes) { const c = b.querySelector("canvas"); if (vue && c) vue.vignette(c, b.dataset.vue as NomVue); } };
  for (const b of vignettes) {
    const titre = b.querySelector("span"); if (titre) titre.textContent = VUES[b.dataset.vue as NomVue].titre;
    b.addEventListener("click", () => { if (vue) { vue.voir(b.dataset.vue as NomVue); applique(VUES[b.dataset.vue as NomVue].etats); } });
  }
  // barre de camera : focale, distance, et « copier la vue » (position, cible, focale, distance en JSON)
  const fov = document.getElementById("cam-fov") as HTMLInputElement | null, dist = document.getElementById("cam-dist") as HTMLInputElement | null, copier = document.getElementById("cam-copier") as HTMLButtonElement | null;
  if (fov) fov.addEventListener("input", () => vue && vue.regler({ fov: +fov.value }));
  if (dist) dist.addEventListener("input", () => vue && vue.regler({ distance: +dist.value }));
  const etat_el = document.getElementById("cam-etat");
  const affiche_etat = () => { if (vue && etat_el) { const e = vue.etat(); etat_el.innerHTML = `<i class="cible">cible(${e.cible.join(",")})</i><i class="fov">${e.fov}°</i><i class="dist">${e.distance}m</i><i class="pos">pos(${e.position.join(",")})</i>`; } };
  if (vue) vue.surChangement((e) => { if (dist && document.activeElement !== dist) dist.value = String(e.distance); if (fov) fov.value = String(e.fov); affiche_etat(); });
  if (fov) fov.addEventListener("input", affiche_etat);
  if (dist) dist.addEventListener("input", affiche_etat);
  affiche_etat();
  const reset = document.getElementById("cam-reset");
  if (reset) reset.addEventListener("click", () => { if (vue) { vue.voir("jardin"); applique(VUES.jardin.etats); } });
  if (copier) copier.addEventListener("click", async () => {
    if (!vue) return;
    const texte = JSON.stringify({ ...vue.etat(), etats: etats() });
    try { await navigator.clipboard.writeText(texte); copier.classList.add("copie"); } catch { window.prompt("Copier la vue :", texte); }
    window.setTimeout(() => copier.classList.remove("copie"), 1500);
  });
  // les vignettes attendent la premiere image : la page s'affiche d'abord
  window.requestAnimationFrame(() => window.setTimeout(rend_vignettes, 0));
  // boutons d'etat : un clic avance l'etat (0/1, ou 0/1/2 pour la porte et la personne)
  for (const nom of NOMS) {
    const b = bouton(nom);
    if (!b) continue;
    b.addEventListener("click", () => {
      const n = +(b.dataset.etats || 2), etat = (+(b.dataset.etat || 0) + 1) % n;
      montre_bouton(nom, etat);
      if (vue) applique_etats(vue, etats());
    });
  }
  // filet de securite : CDN bloque ou WebGL absent, rien n'a ete dessine
  window.setTimeout(() => {
    if (boite && !boite.querySelector("canvas") && !boite.textContent!.trim()) boite.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloquée). Les plans plus bas restent entièrement valables.</p>';
  }, 4000);
});
