// Point d'entree pour le smoke-test DOM (sans Three.js) : recalcule + rendu + controles.
import { buildCore } from "../site/src/compute";
import { renderAll } from "../site/src/render";
import { buildControls } from "../site/src/controls";

export function run(params: any) {
  let changes = 0;
  const recompute = () => { changes++; renderAll(buildCore(params), params); };
  renderAll(buildCore(params), params);
  const ctl = buildControls(document.getElementById("controls")!, params, recompute);
  return { ctl, changes: () => changes };
}
