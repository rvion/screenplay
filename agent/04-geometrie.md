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
La dalle est un **pentagone à pointe arrière**, décrit par les **5 longueurs relevées au mètre** :
`avant`, `droite`, `gauche`, `arriere_gauche` (petit pan, du haut du côté gauche à la pointe),
`arriere_droite` (grand pan, de la pointe au haut du côté droit). Hypothèse : les deux angles
avant sont droits. Dans le repère de la dalle :
```
(0,0) → (avant,0) → R = (avant, droite) → P (pointe) → L = (0, gauche)
```
La pointe `P` se trouve par **triangulation** depuis `L` et `R` : avec `d = |LR|`,
`a = (ag² − ad² + d²) / 2d`, `h = √(ag² − a²)`, `P = L + a·u + h·n` (`u` = unitaire `L→R`,
`n` = normale côté arrière). Si les longueurs ne ferment pas le triangle (`ag + ad < d` ou
`|ag − ad| > d`), `a` est borné à `[0, d]` et `h = 0` : la dalle devient un quadrilatère, jamais
une erreur. L'abri est posé avec son coin avant-gauche en `decalage_cm = (ox, oy)`.

**Hors dalle** = aire de l'emprise − aire de (emprise ∩ dalle), par découpage de polygone
(Sutherland–Hodgman), valable pour tout débord (arrière, côtés, avant). Pour le dessin, chaque
côté de la dalle donne la partie de l'emprise située au-delà (`hors_dalle_polygones`).
`marges_cm` : gauche, avant, droite, et derrière chacun des deux coins arrière de l'abri
(distance jusqu'au bord de dalle, négative = hors dalle).

**Relevé du 2026-09-19** : avant **262**, droite **223**, gauche **324**, petit pan **104**,
grand pan **258** ⇒ pointe `P ≈ (72,7 ; 398,3)`. Mesure de contrôle : **260** de large à hauteur
du coin droit (2 cm de moins que devant : côtés quasi parallèles, négligé).
`(ox, oy) = (2, 2)` ⇒ l'abri **longe le mur gauche** (2 cm), 2 cm devant ; **rien hors dalle**.
Calé à droite (`ox = 62`), le coin arrière-droit traverserait le mur du fond de ~19 cm.

### Murs de propriété et passage arrière
`murs_mitoyens = [gauche, arriere_gauche, arriere_droite]` : ces côtés de la dalle **sont** le mur
de propriété, infranchissables. L'avant et la droite donnent sur le jardin. Pour chaque mur,
`abri_cm` / `toit_cm` = distance (perpendiculaire à la droite du mur) du coin le plus proche de
l'abri / du toit (débords + `toit.gouttiere_largeur_cm` à l'arrière) ; négatif = ça traverse.

**Passage arrière** (`dalle.passage`) : on atteint l'arrière de l'abri par la droite, en longeant
le grand pan (258). La pince est au coin arrière-droit de l'abri `(ox+A, oy+G)`. Le grand pan a
pour pente `175,3 / 189,3` ; au droit de `x = 202` il passe à `y = 278,6`, soit 36,6 cm derrière
le coin, × `189,3/258` ⇒ **26,8 cm** pour 200 × 240 : *impraticable* (< 35 ; 35–50 = de profil ;
≥ 50 = praticable). `profondeur_max_cm` = plus grand `G` qui garde `passage_souhaite_cm` (45 par
défaut) à largeur `A` donnée, par dichotomie : **215** pour A = 200. Repères : 200 × 215 ⇒ 45 cm ;
200 × 200 ⇒ 56 cm (et 4 faces en panneaux entiers). Derrière l'abri, côté gauche, il reste
324 − 242 = 82 cm jusqu'au haut du côté gauche, puis la pointe.

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
