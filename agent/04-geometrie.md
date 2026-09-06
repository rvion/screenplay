# Géométrie (détail mathématique)

## Entrées
| Paramètre | Symbole | Valeur (cm) |
|---|---|---|
| `emprise_cm.avant_A` (largeur) | A | 230 |
| `emprise_cm.gauche_G` (profondeur) | G | 246 |
| `murs.hauteur_cm` (panneaux de mur = arrière) | H | 215 |
| `toit.pente_chute_cm` (rehausse avant = chute) | c | 25 |

## Sommets (plan, origine = coin avant-gauche)
```
FL = (0, 0)        coin avant-gauche
FR = (A, 0)   = (230,   0)   coin avant-droit
BR = (A, G)   = (230, 246)   coin arrière-droit
BL = (0, G)   = (0,   246)   coin arrière-gauche
```
Rectangle antihoraire : `FL → FR → BR → BL`. Faces : A = FL→FR (230), D = FR→BR (246),
B = BR→BL (230), G = BL→FL (246). Périmètre = 2(A+G) = **952 cm**. Aire = A·G = **5,66 m²**.

## Dalle réelle (`dalle_cm`) et partie hors dalle
Dalle = pentagone `(0,0) (230,0) (230,160) (140,246) (0,246)` ; coin coupé de largeur
`cw = 230−140 = 90` et profondeur `ch = 246−160 = 86` (coupe ≈ 124,5 cm).
Avec `uA = clamp((A−140)/cw)`, `vG = clamp((G−160)/ch)` et `t = max(0, uA+vG−1)`, le
triangle de l'emprise hors dalle a pour côtés `t·cw × t·ch`. Par défaut `t = 1` ⇒
**90 × 86 cm = 0,39 m²** au coin arrière-droit. Pour `G ≤ 160` ou `A ≤ 140` : rien hors dalle.

## Hauteurs et rehausse
- `h(y) = H + c·(1 − y/G) = 215 + 25·(1 − y/246)` : avant **240**, arrière **215**.
- Pente = `c / G = 25/246 ≈ 10,2 %` soit **5,8°** ; rampant = `√(G² + c²) ≈ 247,3 cm`.
- **Murs** : 4 faces, hauteur H = 215 partout (rectangles).
- **Rehausse** posée sur les murs :

| Face | pièce | dimensions | hauteur finie |
|---|---|---|---|
| A (avant) | bandeau rectangulaire | 230 × 25 | 240 → 240 |
| D (droite) | triangle rectangle | base 246, hauteur 25 | 240 → 215 |
| B (arrière) | aucune | — | 215 → 215 |
| G (gauche) | triangle rectangle | base 246, hauteur 25 | 215 → 240 |

Les deux triangles proviennent d'**une bande 246 × 25 coupée en diagonale** ; le second est
tourné de 180° dans son plan (le parement extérieur reste dehors). Bande + bandeau (230 × 25)
tiennent dans **un panneau 246 × 100** (50 cm utilisés) : `ceil(2c / largeur_utile)` panneau.

## Toiture
- Rectangle débordant : largeur `A + dG + dD = 260`, profondeur `G + dav + darr = 281`.
- Panneaux dans le sens de la pente : `ceil(260/100) = 3`, longueur `281·√(1+(c/G)²) ≈ 282,4 cm`.
- Portée libre ≈ 2,81 m (à vérifier contre le tableau du fabricant pour 60 mm).

## Vérification
Le site affiche aire, périmètre, pente, rampant, débit et le triangle hors dalle (recalculés en
direct par `compute.ts`) ; ces valeurs doivent correspondre au tableau ci-dessus. Les snapshots
golden (`npm run test:raw`) figent cette sortie.
