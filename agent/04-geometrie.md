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
`disposition_trapeze.cotes_cm` impose façade 210, droite 175, gauche 250 et un mur du fond de 135
d'équerre sur le mur gauche ; le pan **C** relie le haut du mur droit au bout du fond. Contour :
`(10,10) → (220,10) → (220,185) → (145,260) → (10,260)` : 10 cm de dalle à gauche et devant, 42 à droite.

| face | longueur | hauteur finie (début → fin) | panneaux |
|---|---|---|---|
| A façade | 210 | 237,5 → 237,5 | 100 + 100 + 10 |
| D droite | 175 | 237,5 → 221,8 | 75 + 100 (bande en tête, `panneaux_depuis_la_fin`) |
| C pan à 45° | 106,1 | 221,8 → 215 | 100 + 6,1 |
| B fond | 135 | 215 → 215 | 100 + 35 |
| G gauche | 250 | 215 → 237,5 | 100 + 100 + 50 |

- Angles **90 / 90 / 135 / 135 / 90**. Murs **4,97 m²** ⇒ **aucune formalité** (seuil 5 m²),
  intérieur 4,46 m², sol libre hors bureaux et lit 1,96 m². Cotes intérieures : façade **198**,
  droite 166,5, pan 101,1, fond 126,5, gauche 238. Passage derrière : 52,3 cm au grand pan, 64,8 au
  petit pan. Matériaux 2 901 € TTC.
- **La façade de 198 dedans est la raison de cette forme** : un lit de 190 y tient à demeure. Le fond
  passe de 100 à 135 pour que le pan reste un vrai 45° (deux profils d'angle identiques).
- **Le lit fait 80 de large, pas 90** : il s'arrête avant la baie de la porte, qui reste **entièrement
  dégagée**. La porte est ramenée à **75** : les tailles de stock sont 80 et 90, donc elle passe sur
  mesure (prix à confirmer, compter 300 à 450 € au lieu de 199).
- **Toit plan vers le fond** (`toit.sens = "arriere"`) : `H` = 215, `c` = 22,5, `D` = 250 ⇒ pente
  **9 %** (5,14°), portée 2,5 m. **3 panneaux de toit** (100 × 261, 100 × 261 en biais, bande de
  10 × 198 en biais).
- **Rehausse** (madrier 75 × 225) : R1 façade, R2 droite, R3 pan, R4 gauche ; rien sur le fond.
- **Gouttière** derrière l'abri, sur le pan C et le fond B ; descente au bout droit.
- **Porte** pleine 75 × 205 sur D, à 87,5 cm de la façade, chambranle 5. **Fenêtres** 80 × 75 de
  stock, oscillo-battantes, allège 110, en façade.
- **Mobilier** : bureau gauche **80 de profondeur sur 238 cm** (trois écrans de 27" = 190 cm) et
  bureau de façade 50 ; lit pliant 70 × 190 (`lit_pliant`, `lit_pliant_2`) ; un lit à demeure
  (`lits_muraux`) : **v3**, lit **80 × 190** le long de la façade, calé à droite (`position: "fin"`),
  **tête côté porte** : couché, les pieds vont vers le bureau gauche et ses écrans, et le plateau du
  bureau passe **au-dessus du pied du lit** sans être coupé (`bureaux_entiers`).

Les études qui ont précédé (4 murs à angle aigu, toit vers la droite) sont figées dans `etudes/`
et restent couvertes par les tests via `tests/fixtures/etude-v{1,2,3}.json`.
