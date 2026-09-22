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
avant 10, droite 5, grand pan 45, petit pan 12, gauche 10 ⇒ zone utile **6,53 m²**. Elle sert aux
13 formes de `variantes(p, g)` ; l'abri, lui, impose ses cotes. L'étude des formes publiée
(`etudes/variantes.md`) est figée : elle a été faite avec les bandes de la première forme (gauche 12, avant 5).

### Murs de propriété
`murs_mitoyens = [gauche, arriere_gauche, arriere_droite]` : ces côtés de la dalle **sont** la limite
de propriété, infranchissables. `grillages = [gauche, arriere_gauche]` : un grillage (1 m) ;
`palissades = [arriere_droite]` : une palissade en bois. L'avant et la droite donnent sur le jardin.
Le **passage** derrière l'abri est la vraie distance entre la forme et chaque mur du fond
(`v.passages`, extrémités du mur comprises), visée : `passage_souhaite_cm`.

## L'abri : option 13 à cotes imposées (`modele_trapeze`)
`disposition_trapeze.cotes_cm` impose façade 200, droite 175, gauche 275 et un mur du fond de 100
d'équerre sur le mur gauche ; le pan **C** relie le haut du mur droit au bout du fond. Contour :
`(10,10) → (210,10) → (210,185) → (110,285) → (10,285)` : 10 cm de dalle à gauche et devant.

| face | longueur | hauteur finie (début → fin) | panneaux |
|---|---|---|---|
| A façade | 200 | 237,5 → 237,5 | 100 + 100 |
| D droite | 175 | 237,5 → 223,2 | 75 + 100 (bande en tête, `panneaux_depuis_la_fin`) |
| C pan à 45° | 141,4 | 223,2 → 215 | 100 + 41,4 |
| B fond | 100 | 215 → 215 | 100 |
| G gauche | 275 | 215 → 237,5 | 100 + 100 + 75 |

- Angles **90 / 90 / 135 / 135 / 90**. Murs **5,00 m²** (au seuil), intérieur 4,48 m², sol libre
  hors bureaux 2,26 m². Passage derrière : 57,8 cm au grand pan, 40,3 cm au petit pan. Espace
  caché derrière l'abri 1,74 m². **10 panneaux de mur** de 100 × 215 à commander.
- **Toit plan vers le fond** (`toit.sens = "arriere"`) : `h(y) = H + c·(1 − (y − y0)/D)`, `H` = 215,
  `c` = 22,5, `D` = profondeur 275 ⇒ pente **8,2 %** (4,68°), portée 2,75 m (panne intermédiaire
  prévue, `toit.panne_intermediaire`). Débords 5 devant et derrière, 0 sur les côtés : **2 panneaux
  de toit** 100 × 286, dont un coupé en biais ; 5,22 m² couverts.
- **Rehausse** (madrier 75 × 225) : R1 façade 22,5 → 22,5, R2 droite 22,5 → 8,2, R3 pan 8,2 → 0,
  R4 gauche 0 → 22,5 ; rien sur le fond. **2 madriers** de 450.
- **Gouttière** derrière l'abri, 240,6 cm en deux tronçons (C 138,5 + B 102,1) : les nervures du
  toit mènent l'eau aux bouts arrière des panneaux. Descente au bout droit (`toit.descente`), à
  l'entrée du passage.
- **Porte** pleine 80 × 205 sur D, de 82,5 à 162,5 depuis la façade, chambranle 5 : le cadre tient
  dans le module entier du fond. **Fenêtres** 80 × 80, allège 110, en façade : ouvrante de 10 à 90,
  fixe de 110 à 190.
- **Mobilier** : bureau en L (gauche et façade), fauteuil et tabouret, lit pliant 70 × 190 posé au sol
  libre le long du mur de la porte, pied sous le bureau de façade ; seconde position en biais au fond
  (`lit_pliant_2`).

Les études qui ont précédé (4 murs à angle aigu, toit vers la droite) sont figées dans `etudes/`
et restent couvertes par les tests via `tests/fixtures/etude-v{1,2,3}.json`.
