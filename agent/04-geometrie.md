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
`disposition_trapeze.cotes_cm` impose façade 210, droite 178, gauche 248 et un mur du fond de 140
d'équerre sur le mur gauche ; le pan **C** relie le haut du mur droit au bout du fond. Contour :
`(10,10) → (220,10) → (220,188) → (150,258) → (10,258)` : 10 cm de dalle à gauche et devant, 42 à droite.

| face | longueur | hauteur finie (début → fin) | panneaux |
|---|---|---|---|
| A façade | 210 | 237,5 → 237,5 | 100 + 100 + 10 |
| D droite | 178 | 237,5 → 221,4 | 78 + 100 (bande en tête, `panneaux_depuis_la_fin`) |
| C pan à 45° | 99 | 221,4 → 215 | 99 (un seul panneau, aucune bande) |
| B fond | 140 | 215 → 215 | 100 + 40 |
| G gauche | 248 | 215 → 237,5 | 100 + 100 + 48 |

- Angles **90 / 90 / 135 / 135 / 90**. Murs **4,96 m²** ⇒ **aucune formalité** (seuil 5 m²),
  intérieur 4,45 m², sol libre hors bureau et lit 2,16 m². Cotes intérieures : façade **198**,
  droite 169,5, pan 94, fond 131,5, gauche 236. Passage derrière : 50,4 cm au grand pan, 66,8 au
  petit pan. Matériaux 2 861 € TTC.
- **Le plancher isolé prend 10 cm** (60 mm de PIR entre lambourdes, OSB 22, revêtement 5) :
  la hauteur sous plafond tombe à **2,05 m au plus bas et 2,28 m en façade**, et c'est cette hauteur
  que montre le modèle 3D.
- **La façade de 198 dedans porte le lit** : 190 de long, donc 8 cm de jeu pour le cadre.
- **Le mur droit de 178 dégage la porte** : la baie est **entièrement libre**, même avec une porte
  de 80, parce que le lit (80 de profondeur) s'arrête avant elle.
- **Toit plan vers le fond** : `H` = 215, `c` = 22,5, `D` = 248 ⇒ pente **9,1 %** (5,18°), portée 2,48 m.
  **3 panneaux de toit** (100 × 259, 100 × 259 en biais, bande de 10 × 201 en biais).
- **Rehausse** (madrier 75 × 225) : R1 façade, R2 droite, R3 pan, R4 gauche ; rien sur le fond.
- **Gouttière** derrière l'abri, sur le pan C et le fond B ; **descente au coin arrière gauche**
  (angle G/B, `toit.descente = "gauche"`), le point le plus reculé : l'eau part de là.
- **Porte** pleine 73 × 204 sur D, chambranle 5 (le choix du bloc reste ouvert, question Q2).
  **Fenêtres** 80 × 75 de stock, oscillo-battantes, allège 110, en façade.
- **Mobilier, une seule disposition** : le bureau gauche **70 de profondeur sur 236 cm** (trois écrans
  de 27" = 190), le fauteuil qui se range dessous et se **centre sur la partie libre** du bureau quand on s'en sert, quatre pieds sous le plateau (deux au ras du lit, deux au fond), le poste de travail posé dessus (deux dalles de 27" de 62 × 37 et un MacBook Pro 16 ouvert, aux cotes réelles), et le lit **80 × 190** le long de la façade,
  calé à droite (`position: "fin"`), **tête côté porte** : couché, les pieds vont vers les écrans, et le
  plateau passe **au-dessus du pied du lit** sans être coupé (`bureaux_entiers`). Plus de lit pliant ni de
  bureau de façade : le bouton **mobilier** ne dit plus que l'usage (rien, au bureau, couché).

Les études qui ont précédé (4 murs à angle aigu, toit vers la droite) sont figées dans `etudes/`
et restent couvertes par les tests via `tests/fixtures/etude-v{1,2,3}.json`.
