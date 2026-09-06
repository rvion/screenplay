# Backlog & questions ouvertes

## À trancher avec l'utilisateur
- [ ] **Coin arrière-droit hors dalle** (emprise 230 × 246 sur une dalle à coin coupé) :
      compléter la dalle sous le triangle 90 × 86 (coulage / plots), ou réduire `gauche_G` pour
      tenir sur la partie pleine (ex. 230 × 160 = 3,7 m², plus petit). Le site calcule et
      affiche le débord en direct.
- [ ] **Portée du toit** ≈ 2,8 m en 60 mm sans panne : confirmer dans le tableau de portées du
      fabricant (charge neige/vent), sinon ajouter une panne intermédiaire.
- [ ] **Pente** : 25 cm (≈ 10 %). Vérifier la mini exacte du fabricant de panneaux toiture.
- [ ] **Hauteur des murs** réelle souhaitée (hypothèse 215 arrière / 240 avant).
- [ ] **Porte** : dimensions (90 × 210 ?), position (à droite par défaut), sens de charnière.
- [ ] **Largeur utile de panneau** réelle du fournisseur (100 vs 115 cm).
- [ ] **Âme** : PIR vs laine de roche.
- [ ] Besoin **électricité / chauffage / plancher** à intégrer (bureau) ?

## Améliorations possibles (non bloquantes)
- [ ] Élévations : cotes des joints de panneaux et de la porte plus détaillées.
- [ ] Débit : tenir compte des recouvrements de nervure réels (perte de largeur utile).
- [ ] Bilan thermique chiffré (vitrage de la porte, ponts thermiques).
- [ ] Export PDF imprimable du cahier (via le site, `@media print`).
- [ ] Vérifier le rendu 3D dans un vrai navigateur (non validé dans l'environnement de build).
- [ ] Renommer la branche par défaut (`claude/garden-shed-docs-n7eq2b` → `main`) et mettre à jour
      `pages.yml` (aucune branche `main`/`master` n'existe aujourd'hui).

## Fait (2026-09-06, simplification)
- [x] **Rectangle 4 faces** au lieu du pentagone à coin coupé ; dalle réelle conservée en
      `dalle_cm` pour calculer le débord.
- [x] **Rehausse** : murs rectangulaires + 1 bande coupée en diagonale (2 triangles) + 1 bandeau ;
      plan de coupe SVG dédié ; joints dessinés en 3D et sur les élévations.
- [x] **Porte + liste `fenetres[]`** (une fenêtre face D par défaut, D20) ; contrôles réduits ;
      montage en 6 étapes ; épaisseur fixée à 60 mm autoportant ; prix médians 2026 + livraison.
- [x] Ouvertures paramétriques, 3D enrichie, budget + fournisseurs, éditeur interactif, port TS
      complet (historique, cf. D11–D14).

## Dette / limites connues
- Prix = médians marché 2026 (fourniture seule, HT), pas des devis. Longueurs de stock non
  modélisées : si le fournisseur ne coupe pas à longueur, compter +15–30 % sur la ligne murs.
- Quantités de visserie / accessoires = estimations à recouper avec le fabricant.
- Pas de validation structurelle (vent/neige/charge) — hors périmètre actuel.
- `npm test` / `npm run typecheck` passent par `shipkit ci` ; les variantes `:raw` lancent
  directement les tests Node.
