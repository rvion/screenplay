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
Angles intérieurs (`dalle.angles_deg`, plan `plan-dalle.svg`) : **90 / 90 / 132,8 / 91,6 / 135,6**
(avant-gauche, avant-droit, haut droit, pointe, haut gauche ; somme 540°). Aire **8,51 m²**.
**Bandes libres et zone utile** (`bandes_libres_cm`, `dalle.zone_utile`) : chaque côté est
décalé vers l'intérieur de sa bande, la zone utile est l'intersection des demi-plans (découpage
de la dalle par chaque droite décalée). Défaut : gauche 12, grand pan 45, petit pan 12 (le 45
y était une erreur : le fond gauche est un cul-de-sac, seul compte le passage derrière l'abri),
droite 5, avant 5 ⇒ zone utile pentagonale 245 / 161,3 / 282,1 / 54,4 / 314,1, **6,59 m²**
(bandes 1,92 m²).
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
≥ 50 = praticable). `profondeur_max_cm` = plus grand `G` qui garde `passage_souhaite_cm` (50 par
défaut) à largeur `A` donnée, par dichotomie : **208** pour A = 200. Repères : 200 × 215 ⇒ 45 cm ;
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

## Abri retenu : trapèze de l'option 13 (`modele_trapeze`, D27)
Repère de la dalle. Côtés dans l'ordre du contour : **A** façade 218, **D** droite 178,8, **B** fond
en biais 256,6, **G** gauche 314,1 ; angles 90 / 90 / 121,8 / 58,2.
- **Toit plan**, pente de l'avant vers le point le plus au fond : `h(y) = H + c·(1 − (y − y0)/D)`,
  `D` = profondeur au point le plus au fond (314,1), `c = disposition_trapeze.toit.chute_cm` (30)
  ⇒ 9,6 %, **5,46°**. Hauteurs finies : façade 245, coin arrière droit 227,9, coin arrière gauche 215.
- **Murs** : panneaux de 215 posés depuis le début de chaque face (sens du contour, vue de
  l'extérieur de gauche à droite) : A 100+100+18, D 100+78,8, B 100+100+56,6, G 100+100+100+14,1.
- **Rehausse** (madrier 75 × 300) : R1 façade 30 → 30, R2 droite 30 → 12,9, R3 fond 12,9 → 0,
  R4 gauche 0 → 30. R3 et R4 partagent une coupe en biais : **2 madriers** de 480.
- **Toit** : contour = murs + débords (avant 10, fond 10, côtés 0) ; panneaux dans le sens de la
  pente : T1 100 × 337,4, T2 100 × 275,1, T3 18 × 212,7 (longueurs = rampant) ; 5,85 m² couverts.
  Gouttière le long du fond (256,6), descente au coin arrière gauche (point bas).
- **Sièges et lit** : fauteuil 70 × 70 contre le bureau gauche (y 109 → 179), tabouret 30 × 30
  contre le bureau de façade. Sur le sol libre, un lit de 65 de large tient jusqu'à **~165** de long
  (le fond en biais limite, pas l'accès à la porte) ; le lit est **rabattable contre le mur du fond**
  (couchette de bateau) : 55 × 170, long bord plaqué sur la face intérieure du fond en biais, replié à
  plat sur 10 cm, 2 fixations intérieures (rien en façade) ; déplié, son pied glisse sous le bureau
  gauche, et il laisse 50 cm devant la porte. À 60 cm devant la porte, seul un 55 × 160 tient.
- **Porte** : ouverture 65 × 205 sur D, de 100,5 à 165,5 ; chambranle 5 ; cadre à 5 cm de la face
  intérieure du mur du fond et 5 cm sous le haut du mur.
