# Géométrie (détail mathématique)

## Entrées
| Paramètre | Symbole | Valeur (cm) |
|---|---|---|
| `emprise_cm.avant_A` (largeur) | A | 200 |
| `emprise_cm.gauche_G` (profondeur) | G | 240 |
| `murs.hauteur_cm` (panneaux de mur = arrière) | H | 215 |
| `toit.pente_chute_cm` (rehausse avant = chute) | c | 25 |

## Sommets (plan, origine = coin avant-gauche)
```
FL = (0, 0)        coin avant-gauche
FR = (A, 0)   = (200,   0)   coin avant-droit
BR = (A, G)   = (200, 240)   coin arrière-droit
BL = (0, G)   = (0,   240)   coin arrière-gauche
```
Rectangle antihoraire : `FL → FR → BR → BL`. Faces : A = FL→FR (200), D = FR→BR (240),
B = BR→BL (200), G = BL→FL (240). Périmètre = 2(A+G) = **880 cm**. Aire = A·G = **4,80 m²**.
Emprise débords inclus (10 cm partout) : 220 × 260 = **5,72 m²** (`emprise_debords_m2`).

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
- `h(y) = H + c·(1 − y/G) = 215 + 25·(1 − y/240)` : avant **240**, arrière **215**.
- Pente = `c / G = 25/240 ≈ 10,4 %` soit **5,9°** ; rampant = `√(G² + c²) ≈ 241,3 cm`.
- **Murs** : 4 faces, hauteur H = 215 partout (rectangles).
- **Rehausse** posée sur les murs :

| Face | pièce | dimensions | hauteur finie |
|---|---|---|---|
| A (avant) | bandeau rectangulaire | 200 × 25 | 240 → 240 |
| D (droite) | triangle rectangle | base 240, hauteur 25 | 240 → 215 |
| B (arrière) | aucune | — | 215 → 215 |
| G (gauche) | triangle rectangle | base 240, hauteur 25 | 215 → 240 |

Les deux triangles proviennent d'**une bande 240 × 25 coupée en diagonale** ; le second est
tourné de 180° dans son plan (le parement extérieur reste dehors). Bande + bandeau (200 × 25)
tiennent dans **un panneau 240 × 100** (50 cm utilisés) : `ceil(2c / largeur_utile)` panneau.
Murs : A et B = 2 panneaux, D et G = 3 ⇒ **10 panneaux de 215**.

## Toiture
- Rectangle débordant : largeur `A + dG + dD = 220`, profondeur `G + dav + darr = 260`.
- Panneaux dans le sens de la pente : `ceil(220/100) = 3`, longueur `260·√(1+(c/G)²) ≈ 261,4 cm`.
- Portée libre ≈ 2,6 m (à vérifier contre le tableau du fabricant pour 60 mm).

## Vérification
Le site affiche aire, périmètre, pente, rampant, débit et le triangle hors dalle (recalculés en
direct par `compute.ts`) ; ces valeurs doivent correspondre au tableau ci-dessus. Les snapshots
golden (`npm run test:raw`) figent cette sortie.
