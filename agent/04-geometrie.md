# Géométrie (détail mathématique)

Repère : celui de la dalle, origine au coin **avant-gauche** de la dalle, `x` vers la droite, `y`
vers l'arrière, cotes en cm. Les chiffres ci-dessous sont ceux de `params.json` ; ils sont figés
par le snapshot golden (`tests/snapshots/abri.json`), qui fait foi en cas d'écart.

## Dalle réelle (`dalle_cm`)
La dalle est un **pentagone à pointe arrière**, décrit par les **5 longueurs relevées au mètre** :
`avant`, `droite`, `gauche`, `arriere_gauche` (petit pan, du haut du côté gauche à la pointe),
`arriere_droite` (grand pan, de la pointe au haut du côté droit). Hypothèse : les deux angles
avant sont droits.
```
(0,0) → (avant,0) → R = (avant, droite) → P (pointe) → L = (0, gauche)
```
La pointe `P` se trouve par **triangulation** depuis `L` et `R` : avec `d = |LR|`,
`a = (ag² − ad² + d²) / 2d`, `h = √(ag² − a²)`, `P = L + a·u + h·n` (`u` = unitaire `L→R`,
`n` = normale côté arrière). Si les longueurs ne ferment pas le triangle (`ag + ad < d` ou
`|ag − ad| > d`), `a` est borné à `[0, d]` et `h = 0` : la dalle devient un quadrilatère, jamais
une erreur.

**Relevé du 2026-09-19** : avant **262**, droite **223**, gauche **324**, petit pan **104**,
grand pan **258** ⇒ pointe `P ≈ (72,7 ; 398,3)`. Mesure de contrôle : **260** de large à hauteur
du coin droit (2 cm de moins que devant : côtés quasi parallèles, négligé).
Angles intérieurs (`dalle.angles_deg`, plan `plan-dalle.svg`) : **90 / 90 / 132,8 / 91,6 / 135,6**
(avant-gauche, avant-droit, haut droit, pointe, haut gauche ; somme 540°). Aire **8,51 m²**.

**Bandes libres et zone utile** (`bandes_libres_cm`, `dalle.zone_utile`) : chaque côté est
décalé vers l'intérieur de sa bande, la zone utile est l'intersection des demi-plans. Bandes :
avant 5, droite 5, grand pan 45, petit pan 12, gauche 10 ⇒ zone utile **6,65 m²**. Elle sert aux
13 formes de `variantes(p, g)` ; l'abri, lui, impose ses cotes. L'étude des formes publiée
(`etudes/variantes.md`) est figée : elle a été faite avec les bandes de la première forme (gauche 12, avant 5).

### Murs de propriété
`murs_mitoyens = [gauche, arriere_gauche, arriere_droite]` : ces côtés de la dalle **sont** la limite
de propriété, infranchissables. `grillages = [gauche, arriere_gauche]` : un grillage (1 m) ;
`palissades = [arriere_droite]` : une palissade en bois. L'avant et la droite donnent sur le jardin.
Le **passage** derrière l'abri est la vraie distance entre la forme et chaque mur du fond
(`v.passages`, extrémités du mur comprises), visée : `passage_souhaite_cm`.

## L'abri : option 13 à cotes imposées (`modele_trapeze`)
`disposition_trapeze.cotes_cm` impose façade 208, droite 180, gauche 250 et un mur du fond de 136,6
d'équerre sur le mur gauche ; le pan **C** relie le haut du mur droit au bout du fond et fait **100**, un
panneau entier. Il monte de G − D = 70, donc il avance de √(100² − 70²) = 71,4 : il fait **44,4°** et
non 45°, et le fond est ce qui reste (B = A − 71,4). La façade ne change rien à l'angle. Contour :
`(10,5) → (218,5) → (218,185) → (146,6 ; 255) → (10,255)` : 10 cm de dalle à
gauche, **5 devant**, 44 à droite.

**Gaine électrique** (`dalle_cm.gaine_electrique`) : trou de 4 cm, 85 depuis la gauche, de 12 à 16
depuis l'avant. Façade à 5 cm du bord et panneau de 6 : face intérieure à 11, donc le câble sort
**dans l'abri**, 1 cm derrière le mur de façade, sous le bord du bureau gauche, entre le mur et le lit. À 10 cm devant, il tombait sous
le mur, pile au joint A1/A2 : c'est pour lui que la bande avant est passée de 10 à 5.

| face | longueur | hauteur finie (début → fin) | panneaux |
|---|---|---|---|
| A façade | 208 | 237 → 237 | 115 + 93 |
| D droite | 180 | 237 → 221,2 | 65 + 115 (bande en tête, `panneaux_depuis_la_fin`) |
| C pan en biais | 100 | 221,2 → 215 | 100 (un panneau recoupé) |
| B fond | 136,6 | 215 → 215 | 115 + 21,6 (chute) |
| G gauche | 250 | 215 → 237 | 115 + 115 + 20 (chute) |

- Angles **90 / 90 / 134,4 / 135,6 / 90** (angles droits : profils du commerce ; angles obtus : bande plate laquée pliée sur place, D52). Murs **4,95 m²** ⇒ **aucune formalité** (seuil 5 m², comparé
  à l'aire exacte, jamais arrondie : `tests/formalites.mjs`). Intérieur 4,44 m², sol libre hors
  bureau 2,77 m². Cotes intérieures : façade **196**, droite 171,5, pan 95, fond 128,1, gauche 238.
  Passage derrière : 54,9 cm au grand pan, 69,7 au petit pan. Matériaux 2 873 € TTC.
- **Pourquoi 208 et pas 210** : à 210 avec droite 180, gauche 250 et un pan de 100, les murs font
  5,0001 m², au-dessus du seuil ; à 208 ils font 4,95 m² (209 donnerait 4,975).
- **Le plancher flottant prend 9 cm** (film PE, 60 mm de XPS continu, OSB 22 collé aux rainures,
  revêtement 5 ; ni lambourde ni vis dans la dalle, D52) : la hauteur sous plafond tombe à
  **2,06 m au plus bas et 2,28 m en façade**, et c'est cette hauteur
  que montre le modèle 3D.
- **La façade de 196 dedans porte le lit** : 190 de long, donc 6 cm de jeu pour le cadre.
- **Le mur droit de 180 dégage la porte** : la baie est **entièrement libre**, même avec une porte
  de 80, parce que le lit (80 de profondeur) s'arrête avant elle.
- **Toit plan vers le fond** : `H` = 215, `c` = 22, `D` = 250 ⇒ pente **8,8 %** (5,03°), portée 2,50 m.
  **2 panneaux de toit de 115** (115 × 261, 93 × 261 en biais).
- **Une seule référence de panneau, 115 de large**, murs et toit (D52) : **8 panneaux de mur** au lieu de
  9 (7 de 100 et 2 de 115), et chaque chute sert à n'importe quel mur (B2 et G3 en sortent). Façade et
  toit en deux pièces, une fenêtre par panneau de façade (17,5 et 121,5). `panneau.largeur_utile_par_face_cm`
  reste possible si le fournisseur n'a pas le 115 partout.
- **Pied des murs** : deux cornières alu 40 × 40, dedans et dehors, coupées d'onglet à chaque angle (D52).
- **Rehausse** (madrier **70 × 220 classe 4**, la section vendue en stock ; chute 22) : R1 façade, R2 droite, R3 pan, R4 gauche ; rien sur le fond.
- **Gouttière** derrière l'abri, sur le pan C et le fond B ; **descente au coin arrière gauche**
  (angle G/B, `toit.descente = "gauche"`), le point le plus reculé : l'eau part de là.
- **Porte** : bloc de service **extérieur** PVC plein, **70 × 200 hors tout**, dormant compris (pas de cadre
  bois), sur D, à **10 cm** de la face intérieure du pan C, ouvrant vers l'extérieur.
  **Fenêtres** 80 × 75 de stock, oscillo-battantes, allège 115, en façade.
- **Mobilier, une seule disposition** : le bureau gauche **70 de profondeur sur 238 cm** (trois écrans
  de 27" = 190), le fauteuil qui se range dessous et se **centre sur la partie libre** du bureau quand on s'en sert, quatre pieds sous le plateau (deux au ras du lit, deux au fond), le poste de travail posé dessus (deux dalles de 27" de 62 × 37 près du mur, un MacBook Pro 16 ouvert, puis un clavier nomade au bord du plateau, aux cotes réelles), et le lit **80 × 190** le long de la façade,
  calé à droite (`position: "fin"`), **tête côté porte** : couché, les pieds vont vers les écrans, et le
  plateau passe **au-dessus du pied du lit** sans être coupé (`bureaux_entiers`). Plus de lit pliant ni de
  bureau de façade : le bouton **mobilier** ne dit plus que l'usage (rien, au bureau, couché).

Les études qui ont précédé (4 murs à angle aigu, toit vers la droite) sont figées dans `etudes/`
et restent couvertes par les tests via `tests/fixtures/etude-v{1,2,3}.json`.
