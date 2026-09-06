# Spécification

## Repère et conventions
- Cotes en **centimètres** dans `params.json` (mètres dans le modèle 3D).
- Repère plan : origine au coin **avant-gauche**, `x` vers la **droite**, `y` vers
  l'**arrière**. Hauteur `z` (ou `Y` monde Three.js) vers le haut.
- Faces : **A** avant, **D** droite, **B** arrière, **G** gauche (ordre antihoraire du rectangle),
  **T** toiture, **R** rehausse (dans le débit).

## Géométrie (voir `04-geometrie.md`)
- Emprise **rectangulaire** `A × G` (`emprise_cm.avant_A`, `emprise_cm.gauche_G`).
- Sommets : `FL=(0,0)`, `FR=(A,0)`, `BR=(A,G)`, `BL=(0,G)`.
- `dalle_cm` décrit la dalle **réelle** (pentagone à coin coupé). Elle ne pilote pas le bâtiment :
  elle sert à calculer la **partie de l'emprise hors dalle** (triangle au coin arrière-droit),
  affichée sur le plan de sol, en 3D et en vigilance.

## Murs — tous rectangulaires
- Panneaux sandwich **verticaux**, largeur utile `panneau.largeur_utile_cm`, hauteur unique
  `murs.hauteur_cm` (= hauteur arrière). **Coupes droites uniquement.**
- Nombre de panneaux/face = `ceil(longueur / largeur_utile)`.
- Autoportants (60 mm) : pas d'ossature, rail de pied + profils d'angle à 90°.

## Rehausse — la pente sans coupe d'arase
- Chute `toit.pente_chute_cm` = hauteur de la rehausse à l'avant.
- **Bande 1** : `G × chute`, coupée **en diagonale** ⇒ **2 triangles** identiques, posés sur les
  murs **G** et **D** (le second tourné de 180° dans son plan : même parement dehors).
- **Bande 2** : `A × chute`, **bandeau** rectangulaire sur le mur **A**.
- Le mur **B** (arrière) ne reçoit rien.
- Les deux bandes sortent d'**un** panneau finition mur de largeur utile et de longueur
  `max(A, G)` tant que `2·chute ≤ largeur_utile` (calculé : `debit.rehausse`).

## Toiture — face T
- Mono-pente, plan unique : `h(y) = hauteur_cm + chute · (1 − y/G)`, avant haut → arrière bas.
- Rectangle débordant `(A + débords G/D) × (G + débords avant/arrière)` ; panneaux dans le sens
  de la pente, longueur = rampant du rectangle débordant. **Débords latéraux = 0 par défaut** :
  le toit fait exactement `A` de large ⇒ `A / largeur_utile` panneaux entiers (2), rive fermée
  par une bavette affleurante.
- Finition **toit** (nervures hautes) : produit différent des panneaux de mur.
- Gouttière sur toute la face **B**, une descente à un angle arrière.

## Ouvertures : porte + fenêtres
- Objet `porte` dans `params.json` : `face` (A), `largeur_cm`, `hauteur_cm`, `position`,
  `marge_bord_cm`. Vitrée, ouvrant **extérieur**, source principale de lumière. Rendue en 3D
  avec un vantail entrouvert.
- **Bloc-porte au module** : par défaut `largeur_cm` = largeur utile (100) et `hauteur_cm` =
  hauteur des murs (215), calé à droite sans marge ⇒ la porte **remplace le panneau A2**
  (`panel_replaced_by`) : il sort du débit, du 3D et des étiquettes (« A2 = bloc-porte »).
  Règle générale : un panneau est remplacé quand une ouverture allège 0, pleine hauteur, couvre
  toute sa largeur.
- Liste `fenetres[]` (vide = aucune) : `face`, `largeur_cm`, `hauteur_cm`, `allege_cm`,
  `position`. Défaut : **une fenêtre 80 × 80, allège 110, face D, à 110 cm de l'avant** — donc
  entièrement dans le 2e panneau (100–200), jamais à cheval sur un joint.
- `position` accepte `gauche`/`centre`/`droite` (+ marge) **ou un nombre** = distance en cm
  depuis le début de la face. Le site convertit en nombre au premier affichage du curseur.
- Toute ouverture est déduite du net des murs, dessinée (plan de sol + élévation), rendue en 3D
  (trou réel + vitrage), comptée en achats et au budget (`prix_indicatifs_eur.fenetre`).

## Calcul & livrables (`site/src/compute.ts`)
`buildCore(params)` (pur, sans DOM/Three) produit géométrie + débit + achats + budget + modèle 3D
**et** les 7 SVG. Consommé en direct par le site et par le CLI Node `site/src/cli.ts --emit` :

| Sortie | Rôle |
|---|---|
| `site/params.js` | `window.SHED_PARAMS` : cotes par défaut (marche en `file://`) |
| `site/data/derived.json` | géométrie + débit + achats + budget + modèle 3D en JSON |
| `site/assets/plan-sol.svg` | plan de sol coté, dalle réelle en pointillé, triangle hors dalle hachuré |
| `site/assets/plan-toit.svg` | plan de toiture (panneaux, sens d'écoulement, rampant) |
| `site/assets/plan-rehausse.svg` | **plan de coupe de la rehausse** sur un panneau (diagonale + bandeau) |
| `site/assets/facade-{A,D,B,G}.svg` | élévations : rectangles de mur + joints + rehausse + porte |

## Site (`site/`)
- `index.html` + `style.css` + `app.js` (bundle esbuild de `src/`, Three.js via CDN).
- Sections : Aperçu (KPIs + tableau des faces), 3D, **Réglages** (emprise, murs, toit, porte,
  fenêtres, panneaux ; prix repliés), Plans, Débit, Achats, Budget, **Montage en 6 étapes**, Vigilance.
- Volontairement court : une carte par fenêtre (face + 4 curseurs), pas de choix d'épaisseur
  (60 mm fixé).
- Tout est recalculé en direct (pas de chiffre en dur, pas de `fetch`). Dégrade proprement sans
  WebGL (message + plans).
- 3D : dalle réelle (coin coupé visible), rail, murs percés, **chaque panneau dessiné avec ses
  bords sombres et son étiquette imprimée au centre** (A1, A2, D1… ; R1 bandeau, R2/R3 triangles ;
  T1… toiture), porte + fenêtre vitrées, toit débordant nervuré, gouttière B.
- **Étiquettes de pièces** : les mêmes ids apparaissent sur les élévations, le plan de toiture, le
  plan de rehausse et dans le tableau de débit (`debit.*.pieces`). Le dernier panneau d'une face
  est le plus étroit (recoupe).

## Contraintes techniques
- Logique **TypeScript pure** dans `compute.ts` ; build esbuild.
- Fonctionne en `file://`.
- Tests : snapshots golden (`compute.ts`) + smoke DOM (jsdom) — `npm run test:raw`
  (`npm test` passe par `shipkit ci`).
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
