// Jeux de parametres partages par les tests. Stressent geometrie (rectangle +
// rehausse), dalle reelle, porte, SVG (largeurs de titre), budget, debords.
export function makeCases(base) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cases = [{ name: "defaut", params: clone(base) }];

  {
    const p = clone(base);
    p.emprise_cm = { avant_A: 300, gauche_G: 260 };
    p.murs.hauteur_cm = 230;
    p.toit.pente_chute_cm = 32;
    p.toit.debord_cm = { avant: 20, arriere: 25, gauche: 10, droite: 30 };
    p.porte = { ...p.porte, position: "gauche", largeur_cm: 100, hauteur_cm: 215 };
    p.fenetres = [{ face: "D", largeur_cm: 100, hauteur_cm: 90, allege_cm: 100, position: "centre" },
                  { face: "B", largeur_cm: 60, hauteur_cm: 60, allege_cm: 120, position: "droite" }];
    p.prix_indicatifs_eur.panneau_mur_m2 = 49;
    p.prix_indicatifs_eur.incertitude_pct = 20;
    cases.push({ name: "grand-porte-gauche", params: p });
  }
  {
    // Tient entierement sur la partie pleine de la dalle : rien hors dalle.
    const p = clone(base);
    p.emprise_cm = { avant_A: 230, gauche_G: 160 };
    delete p.porte;
    p.fenetres = [];
    cases.push({ name: "sur-dalle-sans-porte", params: p });
  }
  {
    const p = clone(base);
    p.porte.position = "centre";
    p.panneau.largeur_utile_cm = 115;
    p.toit.pente_chute_cm = 18;
    delete p.dalle_cm;
    cases.push({ name: "porte-centree-cover115", params: p });
  }
  return cases;
}
