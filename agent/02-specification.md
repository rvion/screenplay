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
  de la pente, longueur = rampant du rectangle débordant.
- Finition **toit** (nervures hautes) : produit différent des panneaux de mur.
- Gouttière sur toute la face **B**, une descente à un angle arrière.

## Porte (seule ouverture)
- Objet `porte` dans `params.json` : `face` (A), `largeur_cm`, `hauteur_cm`, `position`
  (`gauche`/`centre`/`droite`), `marge_bord_cm`. Vitrée, ouvrant **extérieur**, source
  principale de lumière. Déduite du net des murs, dessinée (plan de sol + élévation A), rendue en
  3D (trou réel + vantail entrouvert).
- Pas de fenêtre. `compute.ts` garde une liste interne d'ouvertures (`resolve_openings`) pour
  pouvoir en rajouter plus tard sans refonte.

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
  panneaux ; prix repliés), Plans, Débit, Achats, Budget, **Montage en 6 étapes**, Vigilance.
- Volontairement court : pas d'éditeur d'ouvertures, pas de choix d'épaisseur (60 mm fixé).
- Tout est recalculé en direct (pas de chiffre en dur, pas de `fetch`). Dégrade proprement sans
  WebGL (message + plans).
- 3D : dalle réelle (coin coupé visible), rail, murs percés, **joints de panneaux dessinés**
  (verticaux + joint mur/rehausse), porte vitrée entrouverte, toit débordant nervuré, gouttière B.

## Contraintes techniques
- Logique **TypeScript pure** dans `compute.ts` ; build esbuild.
- Fonctionne en `file://`.
- Tests : snapshots golden (`compute.ts`) + smoke DOM (jsdom) — `npm run test:raw`
  (`npm test` passe par `shipkit ci`).
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
