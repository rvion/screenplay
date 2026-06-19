# Besoins (exprimés par l'utilisateur)

Source : brief vocal + réponses aux questions de cadrage (2026-06).

## Fonctionnels
- **B1 — Forme.** Carré avec **un coin coupé** ⇒ **5 faces**. Nommage :
  - **A** = avant, **G** = gauche, **D** = droite, **B** = arrière,
  - **C** = la face du coin coupé, située **entre l'arrière (B) et la droite (D)**.
- **B2 — Surface.** Environ **5 m²** au sol.
- **B3 — Mesures réelles** (dalle déjà coulée) : Gauche **246**, Avant **230**,
  Droite jusqu'à la coupe **160**, Arrière jusqu'à la coupe **140** (cm).
- **B4 — Murs & toit** en **panneaux sandwich 60 mm**.
- **B5 — Porte de service vitrée**, **ouvrant vers l'extérieur** (pour ne pas empiéter sur
  l'espace intérieur), servant aussi de **source principale de lumière naturelle**.
- **B6 — Toit mono-pente** : l'eau doit s'écouler **vers l'arrière (face B)** ; dévers
  d'« une dizaine de centimètres ».
- **B7 — Usage** : **pièce à vivre / bureau**, utilisée toute l'année, **chauffée** ⇒
  isolation soignée et gestion de la vapeur/condensation.

## Documentaires
- **B8 — Le dépôt contient tous les documents nécessaires** : plans, liste d'achats,
  détails de montage, points de vigilance.
- **B9 — Paramétrique** : la géométrie est pilotée par des paramètres.
- **B10 — Petit site web** affichant le document final, à une **adresse simple**, avec
  **images / rendus**. Le README peut suffire une fois le dépôt public.
- **B11 — Dossier `agent/` spec-first**, référencé depuis `CLAUDE.md` via des `@`.

## Décisions de cadrage (réponses aux questions)
- Épaisseur panneaux : **60 mm** (murs + toit).
- Hébergement : libre ⇒ **GitHub Pages + README riche**.

## Hypothèses (à valider par l'utilisateur)
- **H1** Hauteur d'égout avant **240 cm** (paramétrable `murs.hauteur_avant_cm`).
- **H2** Porte **90 × 210 cm**, centrée sur la face A, charnière à gauche.
- **H3** Largeur utile de panneau **100 cm**, pose **verticale** des panneaux muraux.
- **H4** Débords de toit 15–20 cm.
- **H5** Âme **PIR** (bon ratio isolation/épaisseur).

## Non-objectifs (pour l'instant)
- Calcul réglementaire/structurel signé, étude de sol, déclaration préalable de travaux.
- Électricité / CVC détaillés (mentionnés en vigilance, non chiffrés finement).
- Commande réelle / liens fournisseurs spécifiques.
