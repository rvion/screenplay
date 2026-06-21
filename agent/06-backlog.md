# Backlog & questions ouvertes

## À confirmer avec l'utilisateur
- [x] **Pente** : relevée de 10 → **25 cm** (≈ 10 %) après confirmation. Reste à vérifier la
      mini exacte du fabricant de panneaux toiture.
- [ ] **Hauteur d'égout avant** réelle souhaitée (hypothèse 240 cm ; arrière en découle = 215 cm).
- [ ] **Porte** : dimensions (90×210 ?), position exacte sur A, sens de charnière.
- [ ] **Largeur utile de panneau** réelle du fournisseur (100 vs 115 cm) → recalcule le débit.
- [ ] **Âme** : PIR vs laine de roche (feu/acoustique vs poids/prix).
- [ ] Besoin **électricité / chauffage / plancher** à intégrer (bureau) ?

## Améliorations possibles (non bloquantes)
- [x] **Ouvertures paramétriques** (porte + fenêtres D et B) : débit, plans, élévations, 3D.
- [x] **3D** : nervures de toiture, gouttière arrière + descente, rail de pied, sol enherbé,
      dalle béton blanche débordante.
- [ ] Élévations : ajouter cotes de la porte et lignes d'arase sur les SVG.
- [ ] Plan de toiture / dalle : vrai offset de polygone (mitré) au lieu de la dilatation radiale.
- [ ] Débit : tenir compte des recouvrements de nervure réels (perte de largeur utile).
- [ ] Fenêtres : choix fixe vs ouvrant, et bilan thermique chiffré (déperditions vitrage).
- [x] **Métré chiffré** (prix indicatifs paramétrables) + widget budget + liens fournisseurs.
- [x] **Éditeur de config interactif** sur le site : panneau de contrôles (sliders + ouvertures).
- [x] **Port complet en TypeScript** (`compute.ts`), Python retiré, **tout recalculé côté client**
      (plans/débit/budget/3D) ; parité prouvée puis snapshots golden + smoke DOM (cf. D14).
- [ ] Export PDF imprimable du cahier (via le site, `@media print`).
- [ ] Vérifier le rendu 3D dans un vrai navigateur (non validé dans l'environnement de build).

## Dette / limites connues
- Le contour de toiture est approximé (bbox dilatée + coupe), pas un offset exact.
- Quantités de visserie / accessoires = estimations à recouper avec le fabricant.
- Pas de validation structurelle (vent/neige/charge) — hors périmètre actuel.
