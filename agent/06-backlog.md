# Backlog & questions ouvertes

Seulement ce qui reste ouvert sur l'abri actuel (`params.json`, `04-geometrie.md`). Ce qui est tranché
vit dans `03-decisions.md`, l'historique dans git.

## À trancher avec l'utilisateur
- [ ] **Devis de panneaux** (D36) : prix relevés en ligne le 2026-09-22, avec leur source. Restent
      « à confirmer » les panneaux (les vendeurs les moins chers imposent 100 m² ou un paquet
      entier : demander deux devis « petite quantité, coupé à longueur » et un négoce local). Une
      seule référence depuis D52 : 8 panneaux de mur et 2 de toit, tous de 115. C'est près de la moitié du total.
- [ ] **Juger l'aspect de la page d'accueil et du modèle 3D** (D33) : couleurs, angle de vue,
      lisibilité des repères de panneaux, ordre des sections. Vérifié par mesure et dans un
      navigateur, pas encore par l'œil de Rémi.
- [ ] **Toit : portée et pente** (D34) : portée 2,50 m, pente 8,8 % (5,03°).
      Confirmer les deux dans le tableau du fabricant pour du 60 mm (charge neige et vent).
- [ ] **Panne à mi-profondeur** : retirée des matériaux et du guide ; seulement une question (Q2) tant
      que le fabricant n'a pas dit si le 60 mm porte 2,50 m seul. Si oui, rien à faire ; sinon la dessiner.
- [ ] **Palissade du grand pan** : mesurer sa hauteur (`mur_hauteur_cm`, 180 supposé) ; le grillage
      fait 1 m (`grillage_hauteur_cm`). Si elle dépasse la gouttière, vérifier le débord arrière.
- [ ] **Hauteur des murs** réelle souhaitée (215 au point bas, 237 en façade).
- [ ] **Porte de service 70 × 200** : relever le prix du 70 en magasin (199 € noté, celui du 80) et prendre une serrure multipoint.
- [ ] **Exposition** : vérifier l'orientation réelle des fenêtres de façade (soleil d'été).
- [ ] **Largeur utile de panneau** : 115 partout (D52) ; le faire confirmer au devis. Si le fournisseur
      n'a le 115 qu'en toiture, `panneau.largeur_utile_par_face_cm` remet 100 sur les murs voulus.
- [ ] **Âme** : PIR vs laine de roche.

## Défauts connus

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
