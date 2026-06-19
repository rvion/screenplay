# Backlog & questions ouvertes

## À confirmer avec l'utilisateur
- [ ] **Pente** : passer de 10 cm à 22–30 cm (≈ 9–12 %) ? (cf. vigilance toiture)
- [ ] **Hauteur d'égout avant** réelle souhaitée (hypothèse 240 cm).
- [ ] **Porte** : dimensions (90×210 ?), position exacte sur A, sens de charnière.
- [ ] **Largeur utile de panneau** réelle du fournisseur (100 vs 115 cm) → recalcule le débit.
- [ ] **Âme** : PIR vs laine de roche (feu/acoustique vs poids/prix).
- [ ] Besoin **électricité / chauffage / plancher** à intégrer (bureau) ?

## Améliorations possibles (non bloquantes)
- [ ] Élévations : ajouter cotes de la porte et lignes d'arase sur les SVG.
- [ ] Plan de toiture : vrai offset de polygone (mitré) au lieu de l'approximation bbox.
- [ ] Débit : tenir compte des recouvrements de nervure réels (perte de largeur utile).
- [ ] 3D : afficher les nervures de toiture, la gouttière et le rail de pied.
- [ ] Export PDF imprimable du cahier (via le site, `@media print`).
- [ ] Métré chiffré (prix indicatifs) — nécessite des sources fournisseur.
- [ ] Vérifier le rendu 3D dans un vrai navigateur (non validé dans l'environnement de build).

## Dette / limites connues
- Le contour de toiture est approximé (bbox dilatée + coupe), pas un offset exact.
- Quantités de visserie / accessoires = estimations à recouper avec le fabricant.
- Pas de validation structurelle (vent/neige/charge) — hors périmètre actuel.
