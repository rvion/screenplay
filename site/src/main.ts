// Point d'entree navigateur : 100% client-side.
// params (window.SHED_PARAMS) -> buildCore -> rendu complet + 3D. Chaque
// changement de controle recalcule tout en direct (rien n'est fige).
import { buildCore } from "./compute";
import { createViewer, type Viewer } from "./viewer";
import { renderAll } from "./render";
import { buildControls } from "./controls";

const clone = (o: any) => JSON.parse(JSON.stringify(o));

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULTS = (window as any).SHED_PARAMS;
  if (!DEFAULTS) {
    console.error("params.js manquant (window.SHED_PARAMS).");
    return;
  }
  const params = clone(DEFAULTS);

  let core = buildCore(params);
  renderAll(core, params);

  let viewer: Viewer | null = null;
  const viewerEl = document.getElementById("viewer");
  try {
    if (viewerEl) viewer = createViewer(viewerEl, core.model3d);
  } catch (e) {
    if (viewerEl) viewerEl.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible (WebGL requis). Voir les plans ci-dessous.</p>';
    console.error(e);
  }

  const onChange = () => {
    try {
      core = buildCore(params);
      renderAll(core, params);
      if (viewer) viewer.rebuild(core.model3d);
      setStatus("✓ Modèle, plans et chiffres mis à jour en direct.", "#2a8");
    } catch (e: any) {
      setStatus("✗ Paramètre invalide : " + (e?.message || e), "#c0392b");
      console.error(e);
    }
  };

  const controls = buildControls(document.getElementById("controls")!, params, onChange);

  const reset = document.getElementById("cfg-reset");
  if (reset) reset.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    for (const k of Object.keys(params)) delete params[k];
    Object.assign(params, fresh);
    controls.refresh();
    onChange();
    setStatus("Réinitialisé aux valeurs publiées.", "#888");
  });

  // Filet de securite : si le 3D n'a rien rendu (WebGL absent / CDN bloque).
  window.setTimeout(() => {
    const v = document.getElementById("viewer");
    if (v && !v.querySelector("canvas") && !v.textContent!.trim()) {
      v.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloquée). Les plans plus bas restent entièrement valables.</p>';
    }
  }, 4000);
});

function setStatus(msg: string, color: string) {
  const s = document.getElementById("cfg-status");
  if (s) { s.textContent = msg; s.style.color = color; }
}
