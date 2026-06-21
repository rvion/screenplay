// Jeux de parametres partages par les tests. Stressent geometrie, ouvertures,
// SVG (largeurs de titre), budget, debords.
export function makeCases(base) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cases = [{ name: "defaut", params: clone(base) }];

  {
    const p = clone(base);
    p.emprise_cm = { gauche_G: 300, avant_A: 260, droite_D_jusqu_coupe: 180, arriere_B_jusqu_coupe: 150 };
    p.murs.hauteur_avant_cm = 250;
    p.toit.pente_chute_cm = 32;
    p.panneau.epaisseur_mm = 80;
    p.toit.debord_cm = { avant: 20, arriere: 25, gauche: 10, droite: 30, coupe: 12 };
    p.ouvertures[0].position = "gauche";
    p.ouvertures[1].position = "droite";
    p.ouvertures[1].allege_cm = 95;
    p.ouvertures.push({ id: "fen-C", type: "fenetre", face: "C", largeur_cm: 60, hauteur_cm: 60, allege_cm: 100, position: "centre" });
    p.prix_indicatifs_eur.panneau_mur_m2 = 49;
    p.prix_indicatifs_eur.incertitude_pct = 20;
    cases.push({ name: "grand-ouvertures", params: p });
  }
  {
    const p = clone(base);
    p.ouvertures = [];
    cases.push({ name: "sans-ouverture", params: p });
  }
  {
    const p = clone(base);
    p.ouvertures[0].position = "centre";
    p.panneau.largeur_utile_cm = 115;
    p.toit.pente_chute_cm = 18;
    cases.push({ name: "porte-centree-cover115", params: p });
  }
  return cases;
}
