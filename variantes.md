# Formes d'abri possibles sur la dalle

> Généré par `npm run emit` depuis `params.json` et `site/src/compute.ts` : ne pas éditer à la main.

## Hypothèses

- **Dalle réelle** : 8,51 m², côtés avant 262, droite 223, grand pan du fond 258, petit pan du fond 104, gauche 324 cm.
- **Bandes libres** laissées le long de chaque côté : avant 5, droite 5, grand pan du fond 45, petit pan du fond 45, gauche 12 cm. Reste la **zone utile** : 6,35 m².
- **Porte** de 100 cm sur le côté avant (jardin), ouvrant vers l'extérieur : elle ne prend aucune place dedans.
- **Intérieur** = murs en panneaux sandwich de 6 cm retirés sur tout le tour. Les couvre-joints d'angle intérieurs (quelques mm) sont négligés.
- **Hauteur sous plafond** (toutes les options) : 2,32 m à l'avant, 2,09 m au fond = murs 215 + rehausse 22,5 à l'avant, moins le plancher isolé de 6 cm.
- **Seuil** : jusqu'à 5 m² de murs, aucune formalité (à confirmer en mairie, et le PLU s'applique quand même).
- **Passage** : écart réel entre l'abri et chaque mur de propriété du fond (vert ≥ 50, orange 35 à 50, rouge < 35).

![dalle et zone utile](site/assets/plan-dalle-bandes.svg)

## En bref

- **Le plus simple** : option 1, panneaux entiers, angles droits.
- **Sous le seuil avec 4 murs** : option 11, pleine largeur et le passage le plus large des trapèzes.
- **Le plus grand intérieur facile à meubler** : option 5, que des angles obtus, mais au-dessus du seuil.

## Comparatif

| # | forme | murs (ext.) | **intérieur** | côtés | passage grand pan | passage petit pan | ≤ 5 m² |
|---|---|---|---|---|---|---|---|
| [1](#option-1) | rectangle en panneaux entiers | 4 m² | **3,53 m²** | 4 | 47,2 cm | 119,6 cm | oui |
| [2](#option-2) | plus grand rectangle | 4,07 m² | **3,6 m²** | 4 | 45 cm | 129,6 cm | oui |
| [3](#option-3) | rectangle pleine largeur | 3,94 m² | **3,47 m²** | 4 | 57,2 cm | 158,5 cm | oui |
| [4](#option-4) | coin coupé, plafonné à 5 m² | 5 m² | **4,49 m²** | 5 | 45 cm | 110,5 cm | oui |
| [5](#option-5) | coin coupé, pleine profondeur | 5,94 m² | **5,38 m²** | 5 | 44,9 cm | 53,5 cm | non |
| [6](#option-6) | toute la zone utile | 6,35 m² | **5,76 m²** | 5 | 44,9 cm | 45 cm | non |
| [7](#option-7) | plus grand rectangle, orientation libre | 4,07 m² | **3,6 m²** | 4 | 45 cm | 125,3 cm | oui |
| [8](#option-8) | plus grand quadrilatère | 5,52 m² | **4,94 m²** | 4 | 44,9 cm | 45 cm | non |
| [9](#option-9) | trapèze, mur arrière en biais | 5,25 m² | **4,7 m²** | 4 | 54 cm | 53,5 cm | non |
| [10](#option-10) | trapèze plafonné à 5 m² | 5 m² | **4,46 m²** | 4 | 54 cm | 53,5 cm | oui |
| [11](#option-11) | trapèze pivoté, plafonné à 5 m² | 5 m² | **4,46 m²** | 4 | 70,8 cm | 53,5 cm | oui |

## Option 1

**rectangle en panneaux entiers** · 2 × 2 modules de 100 : aucune recoupe, angles droits

![option 1](site/assets/variante-1.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4 m² | **3,53 m²** |
| côté avant | 200 cm | 188 cm |
| côté droite | 200 cm | 188 cm |
| côté fond | 200 cm | 188 cm |
| côté gauche | 200 cm | 188 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 47,2 cm · petit pan 119,6 cm | |

- ✅ panneaux entiers sur les 4 faces : aucune recoupe
- ✅ le plus simple et le moins cher à monter
- ✅ sous le seuil même si la mairie compte les débords
- ⚠️ le plus petit bureau de la liste
- ⚠️ laisse inutilisée toute la bande de dalle à droite

## Option 2

**plus grand rectangle** · le plus grand rectangle qui tient dans la zone

![option 2](site/assets/variante-2.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4,07 m² | **3,6 m²** |
| côté avant | 214 cm | 202 cm |
| côté droite | 190 cm | 178 cm |
| côté fond | 214 cm | 202 cm |
| côté gauche | 190 cm | 178 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 129,6 cm | |

- ✅ un peu plus grand que l'option 1, toujours à angles droits
- ⚠️ gain minime pour des panneaux à recouper sur les 4 faces

## Option 3

**rectangle pleine largeur** · toute la largeur de la zone, profondeur limitée par le grand pan

![option 3](site/assets/variante-3.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 3,94 m² | **3,47 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 161 cm | 149 cm |
| côté fond | 245 cm | 233 cm |
| côté gauche | 161 cm | 149 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 57,2 cm · petit pan 158,5 cm | |

- ✅ façade la plus large : porte et fenêtre côte à côte
- ✅ passage arrière confortable
- ⚠️ peu profond : le plus petit intérieur
- ⚠️ panneaux à recouper en largeur

## Option 4

**coin coupé, plafonné à 5 m²** · mur arrière reculé pour ne pas dépasser 5 m² de murs

![option 4](site/assets/variante-4.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5 m² | **4,49 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 161,3 cm | 152,7 cm |
| côté fond en biais | 70,4 cm | 65,4 cm |
| côté fond | 193,4 cm | 185 cm |
| côté gauche | 209,1 cm | 197,1 cm |
| angles | 90° · 90° · 132,8° · 137,2° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 110,5 cm | |

- ✅ sous le seuil de surface
- ✅ pleine largeur et un seul pan coupé, court
- ⚠️ 5 murs et 2 angles obtus : profils d'angle sur mesure
- ⚠️ le pan coupé rogne un coin pour un petit gain

## Option 5

**coin coupé, pleine profondeur** · un pan coupé parallèle au mur du fond, le reste à angle droit

![option 5](site/assets/variante-5.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5,94 m² | **5,38 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 161,3 cm | 152,7 cm |
| côté fond en biais | 155,4 cm | 150,4 cm |
| côté fond | 131 cm | 122,7 cm |
| côté gauche | 266,9 cm | 254,9 cm |
| angles | 90° · 90° · 132,8° · 137,2° · 90° | |
| passage arrière | grand pan 44,9 cm · petit pan 53,5 cm | |

- ✅ le plus grand intérieur sans angle aigu : que des angles obtus, faciles à meubler
- ✅ le pan coupé suit le mur du fond : passage régulier
- ⚠️ au-dessus du seuil : déclaration préalable probable
- ⚠️ 5 murs, 2 profils d'angle sur mesure, toit recoupé en biais, gouttière avec un angle

## Option 6

**toute la zone utile** · suit toute la zone : 3 angles non droits, pointe à l'arrière

![option 6](site/assets/variante-6.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 6,35 m² | **5,76 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 161,3 cm | 152,7 cm |
| côté fond en biais | 249,1 cm | 240,6 cm |
| côté fond en biais | 89,1 cm | 80,8 cm |
| côté gauche | 266,9 cm | 258,5 cm |
| angles | 90° · 90° · 132,8° · 91,5° · 135,6° | |
| passage arrière | grand pan 44,9 cm · petit pan 45 cm | |

- ✅ la surface maximale de la zone
- ⚠️ la pointe du fond est un coin perdu
- ⚠️ 3 angles non droits, toit et gouttière les plus compliqués
- ⚠️ au-dessus du seuil

## Option 7

**plus grand rectangle, orientation libre** · 209.5 × 194.2 : aucune rotation ne fait mieux que le rectangle droit

![option 7](site/assets/variante-7.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4,07 m² | **3,6 m²** |
| côté avant | 209,5 cm | 197,5 cm |
| côté droite | 194,2 cm | 182,2 cm |
| côté fond | 209,5 cm | 197,5 cm |
| côté gauche | 194,2 cm | 182,2 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 125,3 cm | |

- ✅ prouve qu'aucune rotation ne fait mieux qu'un rectangle droit
- ⚠️ identique à l'option 2 avec la zone actuelle

## Option 8

**plus grand quadrilatère** · 4 murs, le coin de 135.6° de la zone est sacrifié : l'aire maximale à 4 murs

![option 8](site/assets/variante-8.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5,52 m² | **4,94 m²** |
| côté avant | 245 cm | 231,8 cm |
| côté droite | 161,3 cm | 152,7 cm |
| côté fond en biais | 249,1 cm | 235,6 cm |
| côté gauche en biais | 336,4 cm | 318,3 cm |
| angles | 79,3° · 90° · 132,8° · 57,9° | |
| passage arrière | grand pan 44,9 cm · petit pan 45 cm | |

- ✅ la plus grande surface possible avec 4 murs
- ⚠️ mur gauche en biais : un coin perdu en long contre le mur de propriété
- ⚠️ deux angles aigus, difficiles à meubler

## Option 9

**trapèze, mur arrière en biais** · côtés gauche et droit d'équerre sur l'avant, un seul mur en biais au fond

![option 9](site/assets/variante-9.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5,25 m² | **4,7 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 161,3 cm | 151,4 cm |
| côté fond en biais | 266,8 cm | 253,7 cm |
| côté gauche | 266,9 cm | 251,8 cm |
| angles | 90° · 90° · 113,3° · 66,7° | |
| passage arrière | grand pan 54 cm · petit pan 53,5 cm | |

- ✅ 4 murs, un seul en biais, deux angles droits côté porte
- ✅ toit simple : un seul bord en biais
- ⚠️ au-dessus du seuil
- ⚠️ angle aigu au fond à gauche

## Option 10

**trapèze plafonné à 5 m²** · le trapèze 9, mur droit reculé à 230 de large : sous 5 m²

![option 10](site/assets/variante-10.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5 m² | **4,46 m²** |
| côté avant | 230 cm | 218 cm |
| côté droite | 167,8 cm | 157,8 cm |
| côté fond en biais | 250,5 cm | 237,4 cm |
| côté gauche | 266,9 cm | 251,8 cm |
| angles | 90° · 90° · 113,3° · 66,7° | |
| passage arrière | grand pan 54 cm · petit pan 53,5 cm | |

- ✅ sous le seuil, même forme que l'option 9
- ⚠️ façade plus étroite
- ⚠️ aucun gain de passage : même pince que l'option 9

## Option 11

**trapèze pivoté, plafonné à 5 m²** · le trapèze 9, coin arrière droit abaissé à 141 : sous 5 m², passage arrière élargi

![option 11](site/assets/variante-11.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5 m² | **4,46 m²** |
| côté avant | 245 cm | 233 cm |
| côté droite | 141 cm | 131,3 cm |
| côté fond en biais | 275,5 cm | 262 cm |
| côté gauche | 266,9 cm | 251,1 cm |
| angles | 90° · 90° · 117,2° · 62,8° | |
| passage arrière | grand pan 70,8 cm · petit pan 53,5 cm | |

- ✅ sous le seuil sans perdre de largeur de façade
- ✅ le passage arrière le plus large des trapèzes
- ⚠️ mur droit court : peu de place pour une fenêtre à droite
- ⚠️ angle aigu au fond à gauche, un peu plus fermé que l'option 9

