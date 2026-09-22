# Backlog & questions ouvertes

Seulement ce qui reste ouvert sur l'abri actuel (`params.json`, `04-geometrie.md`). Ce qui est tranché
vit dans `03-decisions.md`, l'historique dans git.

## À trancher avec l'utilisateur
- [ ] **Devis de panneaux** (D36) : prix relevés en ligne le 2026-09-22, avec leur source. Restent
      « à confirmer » les panneaux (les vendeurs les moins chers imposent 100 m² ou un paquet
      entier : demander deux devis « petite quantité, coupé à longueur » et un négoce local), les
      profils pliés à 135°, les fenêtres 80 × 80 (hors stock). C'est la moitié du total.
- [ ] **Fenêtres : 80 × 80 sur mesure, ou 80 × 75 de stock ?** Le 80 de large × 75 de haut existe en
      stock à 119 €, sans délai ; le 80 × 80 se fait sur mesure (environ 155 €, 4 à 5 semaines).
- [ ] **Rehausse** : le 75 × 225 n'existe en stock qu'en classe 2. Prendre du 70 × 220 classe 4 (la
      chute passe de 22,5 à 22 cm) ou protéger un classe 2 par la bavette (larmier) ?
- [ ] **Juger l'aspect de la page d'accueil et du modèle 3D** (D33) : couleurs, angle de vue,
      lisibilité des repères de panneaux, ordre des sections. Vérifié par mesure et dans un
      navigateur, pas encore par l'œil de Rémi.
- [ ] **Toit : portée et pente** (D34) : portée 2,75 m, pente 8,2 % (4,7°, sous les 5° usuels).
      Confirmer les deux dans le tableau du fabricant pour du 60 mm (charge neige et vent).
- [ ] **Panne à mi-profondeur** : comptée aux matériaux et au guide de montage, pas encore dessinée
      (plans, élévations, 3D).
- [ ] **Palissade du grand pan** : mesurer sa hauteur (`mur_hauteur_cm`, 180 supposé) ; le grillage
      fait 1 m (`grillage_hauteur_cm`). Si elle dépasse la gouttière, vérifier le débord arrière.
- [ ] **Formalités** : l'emprise au sol est celle des murs, débords de toiture exclus (R*420-1,
      D29). Reste à vérifier en mairie : secteur protégé / abords MH (déclaration préalable même
      sous 5 m²) et la distance aux limites du PLU.
- [ ] **Hauteur des murs** réelle souhaitée (215 au point bas, 237,5 en façade).
- [ ] **Porte pleine 80 × 205** : confirmer chez le menuisier (bloc-porte, sens d'ouverture).
- [ ] **Exposition** : vérifier l'orientation réelle des fenêtres de façade (soleil d'été).
- [ ] **Largeur utile de panneau** réelle du fournisseur (100 vs 115 cm).
- [ ] **Âme** : PIR vs laine de roche.

## Défauts connus
- [ ] `abri.md` écrit « portée … sans panne : à confirmer » même quand `toit.panne_intermediaire`
      est vrai : la phrase doit citer la portée ramenée par la panne.
- [ ] **`file://`** : Chrome bloque le module `abri.js` chargé depuis `file://` (CORS sur les
      scripts de type module) ; la page ne se remplit que servie en http (`npm run site`, Pages).
      La règle d'or 5 ne tient donc pas dans Chrome : passer le bundle en script classique, ou
      retirer la promesse.

## Améliorations possibles (non bloquantes)
- [ ] Élévations : cotes des joints de panneaux et de la porte plus détaillées.
- [ ] Débit : tenir compte des recouvrements de nervure réels (perte de largeur utile).
- [ ] Bilan thermique chiffré (vitrages, ponts thermiques, rehausse bois).
- [ ] Renommer la branche par défaut (`claude/garden-shed-docs-n7eq2b` → `main`) et mettre à jour
      `pages.yml` (pas pour l'instant, décision de Rémi du 2026-09-22).

## Dette / limites connues
- Quantités de visserie / accessoires = estimations à recouper avec le fabricant.
- Pas de validation structurelle (vent/neige/charge) : hors périmètre actuel.
- `npm test` / `npm run typecheck` passent par `shipkit ci` ; les variantes `:raw` lancent
  directement les outils (la CI GitHub utilise `test:raw`).
