// Point d'entree du smoke-test de la page d'accueil (sans Three.js) : calcul de l'abri + rendu DOM.
import { calcule_abri, rend_abri, md_en_ligne, mode_document } from "../site/src/abri_page";

export function run(params: any) {
  const abri = calcule_abri(params);
  rend_abri(abri);
  return abri;
}
export { md_en_ligne, mode_document };
