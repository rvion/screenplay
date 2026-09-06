# Géométrie (détail mathématique)

## Entrées
| Paramètre | Symbole | Valeur (cm) |
|---|---|---|
| `emprise_cm.avant_A` (largeur) | A | 200 |
| `emprise_cm.gauche_G` (profondeur) | G | 240 |
| `murs.hauteur_cm` (panneaux de mur = arrière) | H | 215 |
| `toit.pente_chute_cm` (rehausse avant = chute = section du madrier) | c | 22,5 |

## Sommets (plan, origine = coin avant-gauche)
```
FL = (0, 0)        coin avant-gauche
FR = (A, 0)   = (200,   0)   coin avant-droit
BR = (A, G)   = (200, 240)   coin arrière-droit
BL = (0, G)   = (0,   240)   coin arrière-gauche
```
Rectangle antihoraire : `FL → FR → BR → BL`. Faces : A = FL→FR (200), D = FR→BR (240),
B = BR→BL (200), G = BL→FL (240). Périmètre = 2(A+G) = **880 cm**. Aire = A·G = **4,80 m²**.
Emprise débords inclus (10 cm devant/derrière, 0 sur les côtés) : 200 × 260 = **5,20 m²**
(`emprise_debords_m2`).

## Dalle réelle (`dalle_cm`) et partie hors dalle
Dalle = pentagone `(0,0) (dA,0) (dA,dD) (dB,dG) (0,dG)` dans son propre repère ; l'abri est posé
avec son coin avant-gauche en `decalage_cm = (ox, oy)`. Coin coupé de largeur `cw = dA − dB` et
profondeur `ch = dG − dD`.
Avec `uA = clamp((ox+A−dB)/cw)`, `vG = clamp((oy+G−dD)/ch)` et `t = max(0, uA+vG−1)`, le
triangle de l'emprise hors dalle (au coin arrière-droit de l'abri) a pour côtés `t·cw × t·ch`.

**Valeurs provisoires (2026-09-06, à remplacer par le relevé exact)** : `dA = 204`, `dG = 348`,
`dD = 262`, `dB = 114`, `(ox, oy) = (2, 2)` ⇒ 2 cm de dalle à gauche, devant et à droite, le côté
droit dépasse de 20 cm derrière le mur B, coupe 90 × 86 conservée ⇒ `t = 0`, **rien hors dalle**.
(Ancien relevé 230 × 246 / 160 / 140 avec l'abri au coin : 54 × 51 cm hors dalle pour 200 × 240.)

## Hauteurs et rehausse
- `h(y) = H + c·(1 − y/G) = 215 + 22,5·(1 − y/240)` : avant **237,5**, arrière **215**.
- Pente = `c / G = 22,5/240 ≈ 9,4 %` soit **5,4°** (> 5° usuel) ; rampant ≈ **241,1 cm**.
- **Murs** : 4 faces, hauteur H = 215 partout (rectangles).
- **Rehausse bois** (madrier 75 × 225 classe 4) posée sur le chant des murs :

| Face | pièce | dimensions | hauteur finie |
|---|---|---|---|
| A (avant) | R1 madrier droit | 200 × 22,5 | 237,5 → 237,5 |
| D (droite) | R3 coin (triangle rectangle) | base 240, hauteur 22,5 | 237,5 → 215 |
| B (arrière) | aucune | — | 215 → 215 |
| G (gauche) | R2 coin (triangle rectangle) | base 240, hauteur 22,5 | 215 → 237,5 |

R2 et R3 sortent d'**un madrier de 240 coupé en diagonale** (R3 tourné de 180°) ; R1 est un
madrier droit de 200. Total 4,4 ml ⇒ **1 madrier de stock 4,8 m** (chute 40 cm). Ils font
lisse haute : le toit se visse dedans.
Murs : A et B = 2 modules, D et G = 3 ; le module A2 est pris par le bloc-porte 100 × 215 ⇒
**9 panneaux de 215** à commander.

## Toiture
- Rectangle débordant : largeur `A + 0 + 0 = 200`, profondeur `G + dav + darr = 260`.
- Panneaux dans le sens de la pente : `200/100 = 2` panneaux entiers, longueur
  `260·√(1+(c/G)²) ≈ 261,1 cm`. Rives latérales affleurantes (bavette de rive).
- Intérieur (parois 6 cm) : `(A−12)(G−12)` = 188 × 228 = **4,29 m²** (`aire_interieure_m2`) ;
  avec plancher 6 cm : 2,09 m sous plafond à l'arrière, 2,31 m à l'avant.
- Portée libre ≈ 2,6 m (à vérifier contre le tableau du fabricant pour 60 mm).

## Vérification
Le site affiche aire, périmètre, pente, rampant, débit et le triangle hors dalle (recalculés en
direct par `compute.ts`) ; ces valeurs doivent correspondre au tableau ci-dessus. Les snapshots
golden (`npm run test:raw`) figent cette sortie.
