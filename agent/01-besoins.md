# Besoins (exprimés par l'utilisateur)

Source : brief vocal + réponses aux questions de cadrage (2026-06), **révisés le 2026-09-06**
(simplification : rectangle, rehausse, porte seule, 60 mm autoportant).

## Objectif (formulé le 2026-09-06)
**Simple, abordable, robuste, agréable à utiliser tous les jours.** Pas « le moins cher » : un
bureau qu'on aime, pas un abri.

## Fonctionnels
- **B1 — Forme.** **Rectangle, 4 faces** (révisé : le coin coupé de la dalle n'est plus suivi,
  « un carré est mieux, faisons plus simple »). Nommage :
  **A** = avant, **D** = droite, **B** = arrière, **G** = gauche, **T** = toiture.
- **B2 — Surface.** Environ **5 m²** au sol.
- **B3 — Dalle réelle** (déjà coulée) : Gauche **246**, Avant **230**, Droite jusqu'à la coupe
  **160**, Arrière jusqu'à la coupe **140** (cm). Le coin arrière-droit est coupé. **Emprise
  retenue : 200 × 240** (4,8 m²) : on peut **en faire le tour** (contrainte du terrain), on
  reste sous 5 m² de murs. Relevé exact de la dalle **à fournir** (`dalle_cm` provisoire : 2 cm
  de marge autour, côté droit 20 cm derrière le mur B). L'angle coupé pour atteindre
  5,3 m² a été jugé non rentable (+0,4 m² intérieur contre 2 angles obtus et pas de tour).
- **B4 — Murs & toit** en **panneaux sandwich 60 mm autoportants** : pas d'ossature secondaire
  (« on m'a dit que 6 cm est autoportant »). Seulement rail de pied + profils d'angle.
- **B5 — Porte de service vitrée**, **ouvrant vers l'extérieur**, **source principale de
  lumière naturelle**. Depuis le 2026-09-06 : **une fenêtre sur la face droite (D)** par défaut,
  liste `fenetres[]` paramétrique (vide = aucune).
- **B6 — Toit mono-pente** : l'eau s'écoule **vers l'arrière (face B)**.
- **B7 — Coupes simples.** Tous les panneaux de mur sont des **rectangles** identiques (coupes
  droites). La pente est obtenue par une **rehausse en bois** : un madrier coupé en diagonale
  (deux coins, faces G et D) + un madrier droit sur la face A. Une seule coupe en biais dans tout
  le projet, dans du bois, et elle sert de lisse haute.
- **B13 — Confort quotidien.** Lumière des deux côtés (fenêtre ouvrante à droite, fixe à gauche),
  ventilation traversante, toit clair, plancher isolé, chauffage, store, finitions intérieures.
  **Électricité : un câble arrive déjà par le sol** ⇒ multiprise + éclairage, pas de tableau.
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
- **H1** Hauteur des murs (arrière) **215 cm** ; avant = 215 + 22,5 = **237,5 cm**
  (`murs.hauteur_cm`, `toit.pente_chute_cm` = section du madrier 225 mm).
- **H2** **Bloc-porte 100 × 215 cm** (dormant compris = un module entier, remplace le panneau A2),
  face A, calé à droite, charnière côté droit. Vantail vitré ~90 cm dedans.
- **H3** Largeur utile de panneau **100 cm**, pose **verticale** des panneaux muraux.
- **H4** Débords de toit **10 cm devant/derrière, 0 sur les côtés** (toit = 2 panneaux entiers,
  rives affleurantes). Emprise débords inclus 200 × 260 = 5,2 m² ⇒ déclaration préalable
  probable, à confirmer en mairie.
- **H5** Âme **PIR**, panneaux mur à **fixation cachée**, toit **couleur claire**.
- **H7** Rehausse en madrier **75 × 225 classe 4**, stock 4,8 m (`rehausse`).
- **H6** Portée libre du toit ≈ **2,6 m** sans panne : à confirmer dans le tableau de portées du
  fabricant pour du 60 mm (sinon une panne intermédiaire).

## Non-objectifs (pour l'instant)
- Calcul réglementaire/structurel signé, étude de sol, déclaration préalable de travaux.
- Électricité / CVC détaillés (mentionnés en vigilance, non chiffrés finement).
- Commande réelle / liens fournisseurs spécifiques.
