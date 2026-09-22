# Formes d'abri possibles sur la dalle

> **Abri retenu : option 13.** Ses plans complets (sol, toit, rehausse, 4 façades) sont dans [abri.md](../abri.md).

> Généré par `npm run emit` depuis `params.json` et `site/src/compute.ts` : ne pas éditer à la main.

## Hypothèses

- **Dalle réelle** : 8,51 m², côtés avant 262, droite 223, grand pan du fond 258, petit pan du fond 104, gauche 324 cm.
- **Bandes libres** laissées le long de chaque côté : avant 10, droite 5, grand pan du fond 45, petit pan du fond 12, gauche 10 cm. Reste la **zone utile** : 6,53 m².
- **Porte** de 100 cm sur le côté avant (jardin), ouvrant vers l'extérieur : elle ne prend aucune place dedans.
- **Intérieur** = murs en panneaux sandwich de 6 cm retirés sur tout le tour. Les couvre-joints d'angle intérieurs (quelques mm) sont négligés.
- **Hauteur sous plafond** (toutes les options) : 2,32 m à l'avant, 2,09 m au fond = murs 215 + rehausse 22,5 à l'avant, moins le plancher isolé de 6 cm.
- **Seuil** : jusqu'à 5 m² de murs, aucune formalité (à confirmer en mairie, et le PLU s'applique quand même).
- **Passage** : écart réel entre l'abri et chaque mur de propriété du fond (vert ≥ 50, orange 35 à 50, rouge < 35).

![dalle et zone utile](../site/assets/plan-dalle-bandes.svg)

## En bref

- **Le plus simple** : option 1, panneaux entiers, angles droits.
- **Le meilleur compromis sous le seuil** : option 12, l'option 1 élargie à toute la façade avec un seul coin coupé.
- **Sous le seuil avec 4 murs** : option 11, pleine largeur et le passage le plus large des trapèzes.
- **Bureau en L, passage visé derrière** : option 13, porte à droite, bureau sur tout le mur gauche et toute la façade.
- **Le plus grand intérieur facile à meubler** : option 5, que des angles obtus, mais au-dessus du seuil.

## Comparatif

| # | forme | murs (ext.) | **intérieur** | côtés | passage grand pan | passage petit pan | ≤ 5 m² |
|---|---|---|---|---|---|---|---|
| [1](#option-1) | rectangle en panneaux entiers | 2 m² | **1,65 m²** | 4 | 112,8 cm | 114,4 cm | oui |
| [2](#option-2) | plus grand rectangle | 4 m² | **3,53 m²** | 4 | 45 cm | 117,4 cm | oui |
| [3](#option-3) | rectangle pleine largeur | 3,85 m² | **3,38 m²** | 4 | 57,2 cm | 158,3 cm | oui |
| [4](#option-4) | coin coupé, plafonné à 5 m² | 5 m² | **4,49 m²** | 5 | 45 cm | 106,1 cm | oui |
| [5](#option-5) | coin coupé, pleine profondeur | 6,36 m² | **5,76 m²** | 5 | 44,9 cm | 12 cm | non |
| [6](#option-6) | toute la zone utile | 6,53 m² | **5,91 m²** | 5 | 44,9 cm | 12 cm | non |
| [7](#option-7) | plus grand rectangle, orientation libre | 4 m² | **3,54 m²** | 4 | 45 cm | 121,6 cm | oui |
| [8](#option-8) | plus grand quadrilatère | 5,91 m² | **5,31 m²** | 4 | 44,9 cm | 12 cm | non |
| [9](#option-9) | trapèze, mur arrière en biais | 5,72 m² | **5,14 m²** | 4 | 51 cm | 12 cm | non |
| [10](#option-10) | trapèze plafonné à 5 m² | 4,99 m² | **4,45 m²** | 4 | 55 cm | 12 cm | oui |
| [11](#option-11) | trapèze pivoté, plafonné à 5 m² | 4,99 m² | **4,42 m²** | 4 | 91,6 cm | 12 cm | oui |
| [12](#option-12) | coin coupé au module | 3,94 m² | **3,47 m²** | 5 | 112,8 cm | 114,4 cm | oui |
| [13](#option-13) | cinq murs aux cotes 200 / 175 / 100 / 275 | 5 m² | **4,48 m²** | 5 | 57,8 cm | 40,3 cm | oui |

## Option 1

**rectangle en panneaux entiers** · 1 × 2 modules de 100 : aucune recoupe, angles droits

![option 1](../site/assets/variante-1.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 2 m² | **1,65 m²** |
| côté avant | 100 cm | 88 cm |
| côté droite | 200 cm | 188 cm |
| côté fond | 100 cm | 88 cm |
| côté gauche | 200 cm | 188 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 112,8 cm · petit pan 114,4 cm | |
| porte | 100 cm sur le côté avant, de 0 à 100 cm | |

- ✅ panneaux entiers sur les 4 faces : aucune recoupe
- ✅ le plus simple et le moins cher à monter
- ✅ sous le seuil même si la mairie compte les débords
- ⚠️ le plus petit bureau de la liste
- ⚠️ laisse inutilisée toute la bande de dalle à droite

## Option 2

**plus grand rectangle** · le plus grand rectangle qui tient dans la zone

![option 2](../site/assets/variante-2.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4 m² | **3,53 m²** |
| côté avant | 203 cm | 191 cm |
| côté droite | 197 cm | 185 cm |
| côté fond | 203 cm | 191 cm |
| côté gauche | 197 cm | 185 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 117,4 cm | |
| porte | 100 cm sur le côté avant, de 103 à 203 cm | |

- ✅ un peu plus grand que l'option 1, toujours à angles droits
- ⚠️ gain minime pour des panneaux à recouper sur les 4 faces

## Option 3

**rectangle pleine largeur** · toute la largeur de la zone, profondeur limitée par le grand pan

![option 3](../site/assets/variante-3.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 3,85 m² | **3,38 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 156 cm | 144 cm |
| côté fond | 247 cm | 235 cm |
| côté gauche | 156 cm | 144 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 57,2 cm · petit pan 158,3 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ façade la plus large : porte et fenêtre côte à côte
- ✅ passage arrière confortable
- ⚠️ peu profond : le plus petit intérieur
- ⚠️ panneaux à recouper en largeur

## Option 4

**coin coupé, plafonné à 5 m²** · mur arrière reculé pour ne pas dépasser 5 m² de murs

![option 4](../site/assets/variante-4.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5 m² | **4,49 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 156,3 cm | 147,7 cm |
| côté fond en biais | 76,6 cm | 71,6 cm |
| côté fond | 190,8 cm | 182,5 cm |
| côté gauche | 208,3 cm | 196,3 cm |
| angles | 90° · 90° · 132,8° · 137,2° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 106,1 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ sous le seuil de surface
- ✅ pleine largeur et un seul pan coupé, court
- ⚠️ 5 murs et 2 angles obtus : profils d'angle sur mesure
- ⚠️ le pan coupé rogne un coin pour un petit gain

## Option 5

**coin coupé, pleine profondeur** · un pan coupé parallèle au mur du fond, le reste à angle droit

![option 5](../site/assets/variante-5.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 6,36 m² | **5,76 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 156,3 cm | 147,7 cm |
| côté fond en biais | 221,9 cm | 216,9 cm |
| côté fond | 84,2 cm | 75,9 cm |
| côté gauche | 307,1 cm | 295,1 cm |
| angles | 90° · 90° · 132,8° · 137,2° · 90° | |
| passage arrière | grand pan 44,9 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ le plus grand intérieur sans angle aigu : que des angles obtus, faciles à meubler
- ✅ le pan coupé suit le mur du fond : passage régulier
- ⚠️ au-dessus du seuil : déclaration préalable probable
- ⚠️ 5 murs, 2 profils d'angle sur mesure, toit recoupé en biais, gouttière avec un angle

## Option 6

**toute la zone utile** · suit toute la zone : 3 angles non droits, pointe à l'arrière

![option 6](../site/assets/variante-6.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 6,53 m² | **5,91 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 156,3 cm | 147,7 cm |
| côté fond en biais | 282,1 cm | 273,6 cm |
| côté fond en biais | 57,3 cm | 49 cm |
| côté gauche | 307,1 cm | 298,6 cm |
| angles | 90° · 90° · 132,8° · 91,6° · 135,6° | |
| passage arrière | grand pan 44,9 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ la surface maximale de la zone
- ⚠️ la pointe du fond est un coin perdu
- ⚠️ 3 angles non droits, toit et gouttière les plus compliqués
- ⚠️ au-dessus du seuil

## Option 7

**plus grand rectangle, orientation libre** · 207.6 × 192.8 : aucune rotation ne fait mieux que le rectangle droit

![option 7](../site/assets/variante-7.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4 m² | **3,54 m²** |
| côté avant | 207,6 cm | 195,6 cm |
| côté droite | 192,8 cm | 180,8 cm |
| côté fond | 207,6 cm | 195,6 cm |
| côté gauche | 192,8 cm | 180,8 cm |
| angles | 90° · 90° · 90° · 90° | |
| passage arrière | grand pan 45 cm · petit pan 121,6 cm | |

- ✅ prouve qu'aucune rotation ne fait mieux qu'un rectangle droit
- ⚠️ identique à l'option 2 avec la zone actuelle

## Option 8

**plus grand quadrilatère** · 4 murs, le coin de 135.6° de la zone est sacrifié : l'aire maximale à 4 murs

![option 8](../site/assets/variante-8.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5,91 m² | **5,31 m²** |
| côté avant | 247 cm | 234,3 cm |
| côté droite | 156,3 cm | 147,7 cm |
| côté fond en biais | 282,1 cm | 267,6 cm |
| côté gauche en biais | 350,3 cm | 331,7 cm |
| angles | 83,4° · 90° · 132,8° · 53,8° | |
| passage arrière | grand pan 44,9 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ la plus grande surface possible avec 4 murs
- ⚠️ mur gauche en biais : un coin perdu en long contre le mur de propriété
- ⚠️ deux angles aigus, difficiles à meubler

## Option 9

**trapèze, mur arrière en biais** · côtés gauche et droit d'équerre sur l'avant, un seul mur en biais au fond

![option 9](../site/assets/variante-9.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5,72 m² | **5,14 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 156,3 cm | 146,9 cm |
| côté fond en biais | 289,4 cm | 275,3 cm |
| côté gauche | 307,1 cm | 290,4 cm |
| angles | 90° · 90° · 121,4° · 58,6° | |
| passage arrière | grand pan 51 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ 4 murs, un seul en biais, deux angles droits côté porte
- ✅ toit simple : un seul bord en biais
- ⚠️ au-dessus du seuil
- ⚠️ angle aigu au fond à gauche

## Option 10

**trapèze plafonné à 5 m²** · le trapèze 9, mur droit reculé à 204 de large : sous 5 m²

![option 10](../site/assets/variante-10.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4,99 m² | **4,45 m²** |
| côté avant | 204 cm | 192 cm |
| côté droite | 182,6 cm | 173,2 cm |
| côté fond en biais | 239 cm | 225 cm |
| côté gauche | 307,1 cm | 290,4 cm |
| angles | 90° · 90° · 121,4° · 58,6° | |
| passage arrière | grand pan 55 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 104 à 204 cm | |

- ✅ sous le seuil, même forme que l'option 9
- ✅ passage arrière un peu élargi
- ⚠️ façade plus étroite

## Option 11

**trapèze pivoté, plafonné à 5 m²** · le trapèze 9, coin arrière droit abaissé à 97 : sous 5 m², passage arrière élargi

![option 11](../site/assets/variante-11.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 4,99 m² | **4,42 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 97 cm | 88,2 cm |
| côté fond en biais | 324,3 cm | 308,5 cm |
| côté gauche | 307,1 cm | 288,1 cm |
| angles | 90° · 90° · 130,4° · 49,6° | |
| passage arrière | grand pan 91,6 cm · petit pan 12 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ sous le seuil sans perdre de largeur de façade
- ✅ le passage arrière le plus large des trapèzes
- ⚠️ mur droit court : peu de place pour une porte ou une fenêtre à droite
- ⚠️ angle aigu au fond à gauche, plus fermé que l'option 9

## Option 12

**coin coupé au module** · l'option 1 élargie à toute la façade : mur du fond 1 et mur gauche 2 modules de 100 sans recoupe, pan coupé parallèle au grand pan

![option 12](../site/assets/variante-12.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 3,94 m² | **3,47 m²** |
| côté avant | 247 cm | 235 cm |
| côté droite | 63,8 cm | 55,2 cm |
| côté fond en biais | 200,4 cm | 195,4 cm |
| côté fond | 100 cm | 91,6 cm |
| côté gauche | 200 cm | 188 cm |
| angles | 90° · 90° · 132,8° · 137,2° · 90° | |
| passage arrière | grand pan 112,8 cm · petit pan 114,4 cm | |
| porte | 100 cm sur le côté avant, de 147 à 247 cm | |

- ✅ mur gauche et mur du fond en panneaux entiers : aucune recoupe sur les deux murs contre la propriété, inaccessibles après montage
- ✅ sous le seuil, même intérieur que le 200 × 240 d'origine
- ✅ façade pleine largeur : porte et fenêtre côté jardin
- ✅ que des angles droits ou obtus, pan coupé court
- ✅ le pan coupé tombe sous la bande de toit déjà recoupée : une seule coupe de toit en biais
- ⚠️ 5 murs et 2 angles obtus : profils d'angle pliés sur mesure
- ⚠️ 3 bandes de panneau à recouper (façade, mur droit, pan coupé), tirées de 2 panneaux
- ⚠️ gouttière arrière arrêtée avant le pan coupé

## Option 13

**cinq murs aux cotes 200 / 175 / 100 / 275** · façade 200, mur droit 175, mur du fond 100 d'équerre sur le mur gauche de 275, et un pan à 45.0° entre les deux · **retenue : plans complets dans [abri.md](../abri.md)**

![option 13](../site/assets/variante-13.svg)

| | murs (extérieur) | intérieur |
|---|---|---|
| surface | 5 m² | **4,48 m²** |
| côté avant | 200 cm | 188 cm |
| côté droite | 175 cm | 166,5 cm |
| côté fond en biais | 141,4 cm | 136,5 cm |
| côté fond | 100 cm | 91,5 cm |
| côté gauche | 275 cm | 263 cm |
| angles | 90° · 90° · 135° · 135° · 90° | |
| passage arrière | grand pan 57,8 cm · petit pan 40,3 cm | |
| porte | 80 cm sur le côté droite, de 82,5 à 162,5 cm | |
| fenêtre ouvrante | 80 × 80 cm sur le côté avant, de 10 à 90 cm, allège 110 cm | |
| fenêtre fixe | 80 × 80 cm sur le côté avant, de 110 à 190 cm, allège 110 cm | |
| bureau gauche | | 60 cm de profondeur sur 263 cm |
| bureau avant | | 50 cm de profondeur sur 188 cm |
| sol libre | | **2,26 m²** (bureaux 2,22 m²) |
| fauteuil de bureau | | 70 × 70 cm devant le bureau gauche |
| tabouret | | 30 × 30 cm devant le bureau avant |

- ✅ pleine largeur et la plus grande surface des trapèzes, avec le passage voulu derrière
- ✅ porte sur le côté droit : bureau en L sur tout le mur gauche et toute la façade
- ✅ façade libre pour des fenêtres, lumière sur le bureau
- ⚠️ au-dessus du seuil : déclaration préalable probable
- ⚠️ angle aigu au fond à gauche, occupé par le bout du bureau
- ⚠️ mur gauche très haut contre la propriété : panneau long, inaccessible après montage

