# Géométrie (détail mathématique)

## Entrées (`emprise_cm`)
| Mesure | Symbole | Valeur (cm) |
|---|---|---|
| Gauche | G | 246 |
| Avant | A | 230 |
| Droite jusqu'à la coupe | D | 160 |
| Arrière jusqu'à la coupe | B | 140 |

## Sommets (plan, origine = coin avant-gauche)
```
FL  = (0,   0)      coin avant-gauche
FR  = (A,   0)   = (230,   0)   coin avant-droit
Dfin= (A,   D)   = (230, 160)   fin de la face Droite (début de la coupe)
Bfin= (B,   G)   = (140, 246)   fin de la face Arrière (autre bout de la coupe)
BL  = (0,   G)   = (0,   246)   coin arrière-gauche
```
Pentagone antihoraire : `FL → FR → Dfin → Bfin → BL`.

## Longueurs de faces
- A = FL→FR = **230**
- D = FR→Dfin = **160**
- **C = Dfin→Bfin = √((230−140)² + (160−246)²) = √(90² + 86²) ≈ 124,5 cm** *(calculée)*
- B = Bfin→BL = **140**
- G = BL→FL = **246**
- Périmètre ≈ **900,5 cm**

## Aire (formule du lacet)
`aire = ½ |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| ≈ 52 710 cm² ≈ 5,27 m²` ✅ (cible ~5 m²).

## Toiture mono-pente
- Profondeur de référence (run) = `G = 246 cm`.
- Chute = `pente_chute_cm = 10 cm`.
- `h(y) = hauteur_avant − chute · y / G = 240 − 10 · y/246`.
- Hauteurs par sommet : avant **240**, `Dfin` ≈ **233,5**, `Bfin`/`BL` **230**.
- Pente = `10 / 246 ≈ 4,1 %` soit **2,33°**. ⚠️ voir vigilance (sous le mini usuel).
- Sens d'écoulement : `+y` (vers l'arrière) ; **point bas = coin arrière-droit `Bfin`**.

## Têtes de murs
| Face | début → fin (cm) | biais ? |
|---|---|---|
| A (avant) | 240 → 240 | non |
| D (droite) | 240 → 233,5 | oui |
| C (coupe) | 233,5 → 230 | oui |
| B (arrière) | 230 → 230 | non |
| G (gauche) | 240 → 230 | oui |

## Vérification
`python3 scripts/generate.py` affiche aire, périmètre, C, pente et débit ; ces valeurs
doivent correspondre au tableau ci-dessus. Toute modification de `emprise_cm`,
`murs.hauteur_avant_cm` ou `toit.pente_chute_cm` se répercute automatiquement.
