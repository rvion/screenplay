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
`disposition_trapeze.cotes_cm` impose façade 215, droite 175, gauche 275 et un mur du fond de 115
d'équerre sur le mur gauche ; le pan **C** relie le haut du mur droit au bout du fond. Contour :
`(10,10) → (225,10) → (225,185) → (125,285) → (10,285)` : 10 cm de dalle à gauche et devant, 37 à droite.

| face | longueur | hauteur finie (début → fin) | panneaux |
|---|---|---|---|
| A façade | 215 | 237,5 → 237,5 | 100 + 100 + 15 |
| D droite | 175 | 237,5 → 223,2 | 75 + 100 (bande en tête, `panneaux_depuis_la_fin`) |
| C pan à 45° | 141,4 | 223,2 → 215 | 100 + 41,4 |
| B fond | 115 | 215 → 215 | 100 + 15 |
| G gauche | 275 | 215 → 237,5 | 100 + 100 + 75 |

- Angles **90 / 90 / 135 / 135 / 90**. Murs **5,41 m²** ⇒ **déclaration préalable** (seuil 5 m²),
  intérieur 4,87 m², sol libre hors bureaux 2,15 m². Cotes intérieures : façade **203**, droite 166,5,
  pan 136,5, fond 106,5, gauche 263. Passage derrière : 47,6 cm au grand pan, 40,3 cm au petit pan.
- **La façade de 203 dedans est la raison de cette forme** : un lit de 190 y tient à demeure, la tête
  contre le mur de la porte, et il reste 67 cm de baie de porte dégagés sur 80. Le fond passe de 100 à
  115 pour que le pan reste un vrai 45° (deux profils d'angle identiques).
- **Toit plan vers le fond** (`toit.sens = "arriere"`) : `h(y) = H + c·(1 − (y − y0)/D)`, `H` = 215,
  `c` = 22,5, `D` = profondeur 275 ⇒ pente **8,2 %** (4,68°), portée 2,75 m. Débords 5 devant et
  derrière, 0 sur les côtés : **3 panneaux de toit** (100 × 286, 100 × 286 en biais, bande de
  15 × 203 en biais).
- **Rehausse** (madrier 75 × 225) : R1 façade, R2 droite, R3 pan, R4 gauche ; rien sur le fond.
- **Gouttière** derrière l'abri, sur le pan C et le fond B ; descente au bout droit (`toit.descente`).
- **Porte** pleine 80 × 205 sur D, à 82,5 cm de la façade, chambranle 5. **Fenêtres** 80 × 75 de
  stock, oscillo-battantes, allège 110, en façade.
- **Mobilier** : bureau en L, le bureau gauche à **80 de profondeur** (trois écrans de 27") sur les
  263 cm du mur ; lit pliant 70 × 190 (`lit_pliant`, `lit_pliant_2`) ; lits à demeure
  (`lits_muraux`) : **v3**, lit 90 × 190 le long de la façade, calé à droite (`position: "fin"`),
  **tête côté porte** : couché, les pieds vont vers le bureau gauche et ses écrans, et le plateau du
  bureau (72 cm) passe **au-dessus du pied du lit** (55 cm) sur 6 030 cm², donc il n'est pas coupé
  (`bureaux_entiers`) ; **v4**, lit 90 × 190 contre le mur gauche, tête au fond, bureau en L devant.

Les études qui ont précédé (4 murs à angle aigu, toit vers la droite) sont figées dans `etudes/`
et restent couvertes par les tests via `tests/fixtures/etude-v{1,2,3}.json`.
