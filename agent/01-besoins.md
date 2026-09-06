# Besoins (exprimés par l'utilisateur)

Source : brief vocal + réponses aux questions de cadrage (2026-06), **révisés le 2026-09-06**
(simplification : rectangle, rehausse, porte seule, 60 mm autoportant).

## Fonctionnels
- **B1 — Forme.** **Rectangle, 4 faces** (révisé : le coin coupé de la dalle n'est plus suivi,
  « un carré est mieux, faisons plus simple »). Nommage :
  **A** = avant, **D** = droite, **B** = arrière, **G** = gauche, **T** = toiture.
- **B2 — Surface.** Environ **5 m²** au sol.
- **B3 — Dalle réelle** (déjà coulée) : Gauche **246**, Avant **230**, Droite jusqu'à la coupe
  **160**, Arrière jusqu'à la coupe **140** (cm). Le coin arrière-droit est coupé. L'emprise par
  défaut est la boîte englobante **230 × 246** : un triangle **90 × 86 cm** déborde donc de la
  dalle au coin arrière-droit — **à trancher** (compléter la dalle, ou réduire G). Voir vigilance.
- **B4 — Murs & toit** en **panneaux sandwich 60 mm autoportants** : pas d'ossature secondaire
  (« on m'a dit que 6 cm est autoportant »). Seulement rail de pied + profils d'angle.
- **B5 — Porte de service vitrée**, **ouvrant vers l'extérieur**, **source principale de
  lumière naturelle**. Depuis le 2026-09-06 : **une fenêtre sur la face droite (D)** par défaut,
  liste `fenetres[]` paramétrique (vide = aucune).
- **B6 — Toit mono-pente** : l'eau s'écoule **vers l'arrière (face B)**.
- **B7 — Coupes simples.** Tous les panneaux de mur sont des **rectangles** identiques (coupes
  droites). La pente est obtenue par une **rehausse** : **une bande coupée en diagonale** (deux
  triangles, faces G et D) + **un bandeau** rectangulaire sur la face A. Une seule coupe en biais
  dans tout le projet.
- **B8 — Usage** : **pièce à vivre / bureau**, toute l'année, **chauffée** ⇒ isolation soignée
  et gestion de la vapeur/condensation.

## Documentaires
- **B9 — Le dépôt contient tous les documents nécessaires** : plans, liste d'achats,
  détails de montage, points de vigilance.
- **B10 — Paramétrique** : la géométrie est pilotée par des paramètres.
- **B11 — Petit site web, simple** : le site précédent était « trop d'étapes, trop complexe,
  trop cher » ⇒ moins de réglages, montage court, débit lisible, budget réduit.
- **B12 — Dossier `agent/` spec-first**, référencé depuis `CLAUDE.md` (via `agent/index.md`).

## Décisions de cadrage
- Épaisseur panneaux : **60 mm** (murs + toit), autoportants.
- Hébergement : **GitHub Pages + README riche**.

## Hypothèses (à valider par l'utilisateur)
- **H1** Hauteur des murs (arrière) **215 cm** ; avant = 215 + 25 = **240 cm**
  (`murs.hauteur_cm`, `toit.pente_chute_cm`).
- **H2** Porte **90 × 210 cm**, face A, calée **à droite** (marge 5 cm), charnière côté droit.
- **H3** Largeur utile de panneau **100 cm**, pose **verticale** des panneaux muraux.
- **H4** Débords de toit 15–20 cm.
- **H5** Âme **PIR**.
- **H6** Portée libre du toit ≈ **2,8 m** sans panne : à confirmer dans le tableau de portées du
  fabricant pour du 60 mm (sinon une panne intermédiaire).

## Non-objectifs (pour l'instant)
- Calcul réglementaire/structurel signé, étude de sol, déclaration préalable de travaux.
- Électricité / CVC détaillés (mentionnés en vigilance, non chiffrés finement).
- Commande réelle / liens fournisseurs spécifiques.
