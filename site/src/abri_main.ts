// Point d'entree de la page d'accueil : calcule l'abri retenu depuis window.SHED_PARAMS,
// remplit la page, puis branche la scene 3D (qui echoue proprement sans WebGL).
import { calcule_abri, rend_abri } from "./abri_page";
import { createAbriViewer, type AbriViewer } from "./viewer_abri";

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
  } catch (e) {
    if (boite) boite.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible (WebGL requis). Les plans ci-dessous restent entièrement valables.</p>';
    console.error(e);
  }
  for (const nom of ["toit", "mobilier", "lit", "etiquettes", "personne"] as const) {
    const c = document.getElementById("voir-" + nom) as HTMLInputElement | null;
    if (c) c.addEventListener("change", () => vue && vue.montrer(nom, c.checked));
  }
  // filet de securite : CDN bloque ou WebGL absent, rien n'a ete dessine
  window.setTimeout(() => {
    if (boite && !boite.querySelector("canvas") && !boite.textContent!.trim()) boite.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloquée). Les plans plus bas restent entièrement valables.</p>';
  }, 4000);
});
