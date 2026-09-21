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
- `dalle_cm` décrit la dalle **réelle** par les **5 longueurs relevées au mètre** (`avant`,
  `droite`, `gauche`, `arriere_gauche`, `arriere_droite`) + `decalage_cm` (position de l'abri sur
  la dalle). La pointe arrière est trouvée par triangulation. Elle ne pilote pas le bâtiment :
  elle sert à calculer la **partie de l'emprise hors dalle** (découpage de polygone, tout débord
  compte), affichée sur le plan de sol, en 3D et en vigilance. Tout est réglable sur le site ;
  des longueurs qui ne ferment pas donnent un quadrilatère, jamais une erreur.
- `dalle_cm.murs_mitoyens` : côtés qui sont le **mur de propriété** (gauche + les deux pans du
  fond). Dessinés en trait brun épais sur le plan et en volume en 3D (`mur_hauteur_cm`,
  hypothèse à mesurer). `dalle.passage` = largeur de la bande entre l'abri et le mur du fond au
  point le plus étroit, cotée sur le plan (vert / orange / rouge), avec la profondeur maximale qui
  garde `passage_souhaite_cm`. Carte **Passage derrière l'abri** en vigilance. Un débord hors
  dalle contre un mur est signalé comme impossible à combler.

## Murs — tous rectangulaires
- Panneaux sandwich **verticaux**, largeur utile `panneau.largeur_utile_cm`, hauteur unique
  `murs.hauteur_cm` (= hauteur arrière). **Coupes droites uniquement.**
- Nombre de panneaux/face = `ceil(longueur / largeur_utile)`.
- Autoportants (60 mm) : pas d'ossature, rail de pied + profils d'angle à 90°.

## Rehausse — la pente sans coupe d'arase, en bois
- Chute `toit.pente_chute_cm` = hauteur de la rehausse à l'avant = hauteur de la section du
  madrier (`rehausse.section_mm`, 75 × 225 ⇒ 22,5 cm).
- `rehausse.materiau = "bois"` (défaut) : **R2+R3** = un madrier de longueur `G` coupé **en
  diagonale** ⇒ 2 coins identiques sur les murs **G** et **D** (le second tourné de 180°) ;
  **R1** = un madrier droit de longueur `A` sur le mur **A**. Le mur **B** ne reçoit rien.
  Posés sur le chant des panneaux (butyle), vissés, ils font **lisse haute** entre murs et toit.
  Débit : `ceil((A+G)/longueur_stock)` madrier(s) (`debit.rehausse.nb_madriers`).
- `rehausse.materiau = "panneau"` : ancienne variante, deux bandes tirées d'un panneau mur
  (`2·chute ≤ largeur_utile`), toujours calculée pour comparaison.

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
  `position`, `ouvrant`. Défaut : **deux fenêtres 80 × 110, allège 95** — une **ouvrante**
  (oscillo-battante) face D dans le module D2 (110–190), une **fixe** face G dans le module G2
  (110–190 depuis l'arrière, la face G se parcourant BL→FL) : lumière des deux côtés, ventilation traversante avec la porte. Jamais à cheval sur
  un joint. Prix distincts `fenetre_fixe` / `fenetre_ouvrante`.
- `position` accepte `gauche`/`centre`/`droite` (+ marge) **ou un nombre** = distance en cm
  depuis le début de la face. Le site convertit en nombre au premier affichage du curseur.
- Toute ouverture est déduite du net des murs, dessinée (plan de sol + élévation), rendue en 3D
  (trou réel + vitrage), comptée en achats et au budget (`prix_indicatifs_eur.fenetre`).

## Aménagement (confort au quotidien)
Bloc `amenagement` : `plancher` (épaisseur, prix/m² sur `aire_interieure_m2`), `electricite`
(câble déjà présent par le sol : multiprise + éclairage, pas de tableau), `chauffage`, `store`,
`finition_interieure`. Chaque poste a `actif` (case à cocher sur le site) et compte au budget
dans un groupe **Aménagement** distinct de la **Coque** (`budget.coque_eur`,
`budget.amenagement_eur`). Le plancher est dessiné en 3D. Panneaux mur commandés en **fixation
cachée** (surcoût `fixation_cachee_m2`), toit en **couleur claire** (chaleur d'été).

## Calcul & livrables (`site/src/compute.ts`)
`buildCore(params)` (pur, sans DOM/Three) produit géométrie + débit + achats + budget + modèle 3D
**et** les 30 SVG. Consommé en direct par le site et par le CLI Node `site/src/cli.ts --emit` :

| Sortie | Rôle |
|---|---|
| `site/params.js` | `window.SHED_PARAMS` : cotes par défaut (marche en `file://`) |
| `site/data/derived.json` | géométrie + débit + achats + budget + modèle 3D en JSON |
| `site/assets/plan-sol.svg` | plan de sol coté, dalle réelle en pointillé avec ses 5 cotes en gris, partie hors dalle hachurée |
| `site/assets/plan-dalle.svg` | dalle seule vue de dessus : cote de chaque côté, angle intérieur à chaque sommet (`dalle.angles_deg`), position de la pointe, murs de propriété, abri en fantôme |
| `site/assets/plan-dalle-bandes.svg` | même plan + bande libre le long de chaque côté (`dalle_cm.bandes_libres_cm`), zone utile au centre avec ses cotes et son aire (`dalle.zone_utile`) |
| `site/assets/variante-{1..13}.svg` | formes d'abri possibles dans la zone utile (`variantes(p, g)`, porte sur le côté avant) : 1 rectangle en modules entiers, 2 plus grand rectangle, 3 rectangle pleine largeur, 4 coin coupé plafonné à `reglementaire.seuil_sans_formalite_m2`, 5 coin coupé pleine profondeur, 6 toute la zone, 7 plus grand rectangle à orientation libre (`plus_grand_rectangle`, sans contrainte de porte ; avec la zone par défaut il retombe sur l'option 2, toute rotation perd de 0,5 à 1,1 m²). 8 plus grand quadrilatère gardant le mur avant (`plus_grand_k_gone` : ses sommets sont des sommets de la zone), 9 trapèze à mur arrière en biais, 10 le même trapèze dont le mur droit glisse vers la gauche le long du mur arrière jusqu'au seuil (le passage ne peut que s'élargir), 11 le même trapèze dont le mur arrière pivote vers le bas autour de son coin gauche jusqu'au seuil (la pince au bout du grand pan s'élargit), 12 coin coupé **au module** : mur gauche et mur du fond en panneaux entiers (`i × j` modules, le plus grand couple sous le seuil dont le coin arrière tient dans la zone), façade sur toute la largeur de la zone, pan coupé parallèle au grand pan tiré depuis le bout du mur du fond (les deux murs difficiles d'accès n'ont aucune recoupe, le pan coupé tombe sous la seule bande de toit recoupée), 13 trapèze pleine largeur dont le mur arrière part du haut du côté gauche et pivote jusqu'à garder `dalle_cm.passage_souhaite_cm` derrière l'abri (vraie distance au grand pan, seule contrainte du fond : il peut dépasser la bande du grand pan près du bout du mur), aménagé par `disposition_trapeze` (porte sur le côté droit, bureau en L sur tout le mur gauche et toute la façade, sol libre calculé ; `sieges` : fauteuil 70 × 70 devant le bureau gauche et tabouret 30 × 30 devant celui de façade, posés sur la plus longue partie libre du bord du bureau ; `lit_pliant` : emprise dépliée en pointillé, cherchée hors de l'accès à la porte et des bureaux, et seulement si le sol libre ne suffit pas, le pied sous un bureau quand `sous_bureau`). Chaque variante porte ses `passages` (par mur du fond : vraie distance entre la forme et le segment de mur, extrémités du mur comprises, cotée sur le plan). Chaque plan garde la dalle entière, les bandes et la zone |
| `abri-v2.md` + `site/assets/modele-v2-*.svg` | **variante proposée de l'abri retenu** : `params.json` porte un bloc `abri_v2` dont `params` est une **surcouche** (fusion en profondeur par `params_v2`, les listes sont remplacées). Le CLI rejoue `buildCore` sur ce second jeu et écrit les mêmes plans sous le préfixe `modele-v2-`, plus une page qui s'ouvre sur un **tableau comparé calculé** (`compare_md` : surfaces, formalités, côtés, faces en panneaux entiers, bandes étroites, passage, sens du toit, pente, portée, panneaux de toit, gouttière, rehausse, porte, fenêtres, lit, budget), puis `pertes`, `notes` (le pourquoi) et `hors_modele` (conseils non dessinés). Aucun chiffre du tableau n'est saisi. Le modèle accepte pour cela : `disposition_trapeze.cotes_cm` (façade, droite, gauche imposées, le fond en découle, à la place du solveur d'intérieur visé), `toit.sens = "droite"` (haut contre le mur gauche, égout et descente côté jardin, panneaux de toit du mur gauche au mur droit, `portee_cm` = largeur) et des débords par face (`debord_cm.droite`, `debord_cm.gauche`) |
| `site/assets/modele-implantation.svg` | l'abri retenu **sur la dalle réelle** (côtés, angles, murs de propriété), toit et gouttière, distances aux bords de la dalle, passages derrière ; première image d'`abri.md` |
| `site/assets/modele-{sol,toit,rehausse}.svg`, `modele-facade-{A,D,B,G}.svg` | **plans de l'abri retenu** (option 13, `modele_trapeze`, D27) : plan de sol (murs 6 cm, ouvertures et chambranle, chaîne de cotes, cotes intérieures, bureau en L), toiture (panneaux dans le sens de la pente, rampant, gouttière, descente, pente), débit de la rehausse (pièces rangées dans les madriers, deux coins complémentaires partagent une coupe en biais), élévations vues de l'extérieur (panneaux, rehausse, porte avec cadre, fenêtres, hauteurs aux deux bouts) |
| `site/assets/plan-toit.svg` | plan de toiture (panneaux, sens d'écoulement, rampant) |
| `site/assets/plan-rehausse.svg` | **plan de coupe de la rehausse** : madrier coupé en diagonale + madrier droit (ou bande de panneau) |
| `site/assets/facade-{A,D,B,G}.svg` | élévations : rectangles de mur + joints + rehausse + porte |

## Formalités (`formalites(p, …)`)
`reglementaire` (params) porte les deux seuils (5 puis 20 m²), la référence de l'article et
`debords_sur_poteaux`. `formalites()` en tire `emprise_au_sol_m2` (celle des **murs** : les débords
de toiture sont exclus tant qu'aucun poteau ne les porte, R*420-1), `surface_plancher_m2`,
`formalite` et les réserves ; `geometrie.formalites` (rectangle) et `modele.formalites` (trapèze)
l'exposent, le site et les pages `abri*.md` n'affichent que ce calcul. Garde : `tests/formalites.mjs`.

## Site (`site/`)
- `index.html` + `style.css` + `app.js` (bundle esbuild de `src/`, Three.js via CDN).
- Sections : Aperçu (KPIs + tableau des faces), 3D, **Réglages** (emprise, murs, **dalle**, toit,
  porte, fenêtres, aménagement, panneaux ; prix repliés), Plans, Débit, Achats, Budget (coque /
  aménagement), **Confort au quotidien**, **Montage en 6 étapes**, Vigilance (dont chaleur d'été).
- Volontairement court : une carte par fenêtre (face + 4 curseurs), pas de choix d'épaisseur
  (60 mm fixé).
- Tout est recalculé en direct (pas de chiffre en dur, pas de `fetch`). Dégrade proprement sans
  WebGL (message + plans).
- 3D : dalle réelle (pointe arrière visible), rail, murs percés, **chaque panneau dessiné avec ses
  bords sombres et son étiquette imprimée au centre** (A1, A2, D1… ; R1 bandeau, R2/R3 triangles ;
  T1… toiture), porte + fenêtre vitrées, toit débordant nervuré, gouttière B.
- **Étiquettes de pièces** : les mêmes ids apparaissent sur les élévations, le plan de toiture, le
  plan de rehausse et dans le tableau de débit (`debit.*.pieces`). Le dernier panneau d'une face
  est le plus étroit (recoupe).

## Documents partageables (`site/docs/`)
- Chaque fichier **Markdown suivi par git** (racine : `README.md`, `variantes.md`, `abri.md`,
  `abri-vN.md` ; et `agent/*.md`) a sa page HTML sous `site/docs/`, donc une adresse stable :
  `https://rvion.github.io/screenplay/docs/abri-v2.html`. `site/docs/index.html` les liste
  (README, puis tri naturel : abri, abri-v2, abri-v3… ; puis la spécification).
- **Rien à déclarer** pour une nouvelle page : `npm run emit` prend les `.md` de `git ls-files`
  et les nouveaux `.md` que git n'ignore pas (`--others --exclude-standard`). **git fait foi** : un fichier ignoré (`CLAUDE.local.md`,
  `STATUS.md`) ne peut pas être publié ; `CLAUDE*.md` et `STATUS*.md` sont exclus par nom en plus.
- Rendu par `site/src/docs.ts` (**côté Node seulement**, `marked` en devDependency : le bundle du
  navigateur n'en dépend pas, le site reste statique et marche en `file://`). Une seule passe de
  réécriture des liens : fichier sous `site/` → chemin du site ; `.md` publié → sa page ; tout le
  reste → le dépôt (`projet.depot_url`). Titres ancrés façon GitHub (les `#option-1` marchent).
- **Cachées pour l'instant** : aucune entrée dans la navigation du site, `noindex` sur chaque page.
- Le dossier est **vidé puis réécrit** à chaque emit (pas de page orpheline). `tests/docs.mjs`
  garde : pages à jour avec leur `.md`, une page par `.md` suivi, aucun lien, image, ancre ou lien
  vers le dépôt mort (la garde est d'abord essayée sur un échantillon cassé).
- Une variante peut porter `atouts` (ce que la disposition apporte à l'usage : vie privée, lumière,
  rangement), rendus avant `pertes`. Les `{champs}` y sont remplacés par des valeurs **calculées**
  (`{arriere_m2}`, `{arriere_profondeur_cm}`, `{passage_cm}`, `{porte_cm}`) : aucun chiffre saisi.
  `arriere` = dalle au-delà du mur du fond et dans la largeur de l'abri, donc invisible depuis la
  façade ; hachurée en vert sur le plan d'implantation. `disposition_trapeze.porte_vitree = false`
  donne une porte pleine (prix `porte_pleine`, dessin et libellés).
- Le modèle de l'abri retenu accepte **N murs** : `cotes_cm.fond` ajoute un mur du fond d'équerre
  sur le mur gauche, relié au haut du mur droit par un pan (face **C**, entre D et B) ; élévations,
  angles, rehausse, débit et page suivent le nombre de faces. La **gouttière** court sur tous les
  bords par où l'eau sort (normale extérieure dans le sens de la pente : `gouttiere.troncons`).
  L'espace caché derrière l'abri se calcule sur un ou deux murs de fond (union des zones).
  Une variante peut **hériter** d'une autre (`herite`) et choisir sa base de comparaison
  (`compare_a`) : `abri_v3` = `abri_v2` + cinq murs, comparée à la version 2 ; `abri_v4` = `abri_v3` +
  toit vers le fond, comparée à la version 3. `toit.descente` (`droite`/`gauche`) place la descente
  au bout de la gouttière choisi ; sans lui, elle va au point bas. Les textes d'une variante
  reçoivent aussi `{gauche_cm}`, les débords, la pente, la portée et la position de la descente.
- Plusieurs variantes : tout bloc `abri_vN` de `params.json` (`versions_abri`) donne `abri-vN.md`
  et ses plans `modele-vN-*.svg`, comparés à la version 1.

## Contraintes techniques
- Logique **TypeScript pure** dans `compute.ts` ; build esbuild.
- Fonctionne en `file://`.
- Tests : snapshots golden (`compute.ts`) + smoke DOM (jsdom) — `npm run test:raw`
  (`npm test` passe par `shipkit ci`).
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
