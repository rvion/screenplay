// Point d'entree de la page d'accueil : calcule l'abri retenu depuis window.SHED_PARAMS,
// remplit la page, puis branche la scene 3D (qui echoue proprement sans WebGL).
import { calcule_abri, rend_abri } from "./abri_page";
import { createAbriViewer, VUES, type AbriViewer, type NomVue } from "./viewer_abri";

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
  // vignettes : trois points de vue fixes sous la vue principale ; un clic y amene la camera
  const vignettes = [...document.querySelectorAll<HTMLElement>("#vignettes [data-vue]")];
  const rend_vignettes = () => { for (const b of vignettes) { const c = b.querySelector("canvas"); if (vue && c) vue.vignette(c, b.dataset.vue as NomVue); } };
  for (const b of vignettes) {
    const titre = b.querySelector("span"); if (titre) titre.textContent = VUES[b.dataset.vue as NomVue].titre;
    b.addEventListener("click", () => vue && vue.voir(b.dataset.vue as NomVue));
  }
  rend_vignettes();
  // barre de camera : focale, distance, et « copier la vue » (position, cible, focale, distance en JSON)
  const fov = document.getElementById("cam-fov") as HTMLInputElement | null, dist = document.getElementById("cam-dist") as HTMLInputElement | null, copier = document.getElementById("cam-copier") as HTMLButtonElement | null;
  if (fov) fov.addEventListener("input", () => vue && vue.regler({ fov: +fov.value }));
  if (dist) dist.addEventListener("input", () => vue && vue.regler({ distance: +dist.value }));
  const etat_el = document.getElementById("cam-etat");
  const affiche_etat = () => { if (vue && etat_el) { const e = vue.etat(); etat_el.innerHTML = `<span>pos ${e.position.join(" ")} · ${e.fov}°</span><span>cible ${e.cible.join(" ")} · ${e.distance} m</span>`; } };
  if (vue) vue.surChangement((e) => { if (dist && document.activeElement !== dist) dist.value = String(e.distance); if (fov) fov.value = String(e.fov); affiche_etat(); });
  if (fov) fov.addEventListener("input", affiche_etat);
  if (dist) dist.addEventListener("input", affiche_etat);
  affiche_etat();
  if (copier) copier.addEventListener("click", async () => {
    if (!vue) return;
    const texte = JSON.stringify(vue.etat());
    try { await navigator.clipboard.writeText(texte); copier.classList.add("copie"); } catch { window.prompt("Copier la vue :", texte); }
    window.setTimeout(() => copier.classList.remove("copie"), 1500);
  });
  for (const nom of ["toit", "mobilier", "lit", "etiquettes", "personne", "porte"] as const) {
    const c = document.getElementById("voir-" + nom) as HTMLInputElement | null;
    if (c) c.addEventListener("change", () => { if (vue) { vue.montrer(nom, c.checked); rend_vignettes(); } });
  }
  // filet de securite : CDN bloque ou WebGL absent, rien n'a ete dessine
  window.setTimeout(() => {
    if (boite && !boite.querySelector("canvas") && !boite.textContent!.trim()) boite.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloquée). Les plans plus bas restent entièrement valables.</p>';
  }, 4000);
});
