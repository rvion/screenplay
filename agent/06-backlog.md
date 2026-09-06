# Backlog & questions ouvertes

## À trancher avec l'utilisateur
- [ ] **Dalle : saisir le relevé exact** (`dalle_cm`, provisoire depuis le 2026-09-06 : 2 cm de
      marge, côté droit +20 cm derrière le mur B). Le site calcule et affiche tout débord en direct.
- [ ] **Formalités** : 4,8 m² de murs mais 5,2 m² débords inclus ⇒ vérifier en mairie si une
      déclaration préalable est due (et la distance aux limites du PLU).
- [ ] **Portée du toit** ≈ 2,6 m en 60 mm sans panne : confirmer dans le tableau de portées du
      fabricant (charge neige/vent), sinon ajouter une panne intermédiaire.
- [ ] **Pente** : 22,5 cm (≈ 9,4 %, 5,4°). Vérifier la mini exacte du fabricant de panneaux toiture.
- [ ] **Hauteur des murs** réelle souhaitée (hypothèse 215 arrière / 240 avant).
- [ ] **Bloc-porte** : confirmer chez le menuisier un bloc 100 × 215 dormant compris (vantail ~90),
      sens de charnière.
- [ ] **Madrier 75 × 225** : vérifier la disponibilité en classe 4 (sinon 63 × 225 ou traitement
      sur place) et le larmier qui le couvre à l'extérieur.
- [ ] **Exposition** : orienter la fenêtre ouvrante et le store selon le soleil réel (sud/ouest).
- [ ] **Largeur utile de panneau** réelle du fournisseur (100 vs 115 cm).
- [ ] **Âme** : PIR vs laine de roche.
- [ ] Besoin **électricité / chauffage / plancher** à intégrer (bureau) ?

## Améliorations possibles (non bloquantes)
- [ ] Élévations : cotes des joints de panneaux et de la porte plus détaillées.
- [ ] Débit : tenir compte des recouvrements de nervure réels (perte de largeur utile).
- [ ] Bilan thermique chiffré (vitrages, ponts thermiques, rehausse bois).
- [ ] Export PDF imprimable du cahier (via le site, `@media print`).
- [ ] Vérifier le rendu 3D dans un vrai navigateur (non validé dans l'environnement de build).
- [ ] Renommer la branche par défaut (`claude/garden-shed-docs-n7eq2b` → `main`) et mettre à jour
      `pages.yml` (aucune branche `main`/`master` n'existe aujourd'hui).

## Fait (2026-09-06, simplification)
- [x] **Rectangle 4 faces** au lieu du pentagone à coin coupé ; dalle réelle conservée en
      `dalle_cm` pour calculer le débord. Emprise finale **200 × 240** (D21).
- [x] **Rehausse** : murs rectangulaires + 1 bande coupée en diagonale (2 triangles) + 1 bandeau ;
      plan de coupe SVG dédié ; joints dessinés en 3D et sur les élévations.
- [x] **Rehausse bois + 2 fenêtres + aménagement chiffré** (D23).
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
