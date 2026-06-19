# Spécification

## Repère et conventions
- Cotes en **centimètres** dans `params.json` (mètres dans le modèle 3D).
- Repère plan : origine au coin **avant-gauche**, `x` vers la **droite**, `y` vers
  l'**arrière**. Hauteur `z` (ou `Y` monde Three.js) vers le haut.
- Faces : **A** avant, **D** droite, **C** coupe, **B** arrière, **G** gauche
  (ordre antihoraire du pentagone).

## Géométrie (voir `04-geometrie.md` pour le détail)
Sommets dérivés des 4 mesures de `emprise_cm` :
- `FL=(0,0)`, `FR=(A,0)`, `Dfin=(A,D)`, `Bfin=(B,G)`, `BL=(0,G)`.
- Face **C** = segment `Dfin→Bfin` (longueur **calculée**, non saisie).
- Aire par formule du lacet ; pente du toit = `pente_chute_cm / G`.

## Toiture — face **T**
- **Mono-pente**, plan unique incliné, hauteur décroissante avec `y`
  (avant haut → arrière bas). `h(y) = hauteur_avant − chute · y / G`.
- Évacuation vers l'arrière ; point bas = coin **arrière-droit** (`Bfin`).
- Panneaux dans le sens de la pente, débords paramétrables, recouvrements vers le bas.
- La toiture est nommée **face T** dans le débit ; comptée séparément des murs.

## Deux finitions de panneau (même épaisseur 60 mm)
- **Finition mur** (parement lisse / micro-nervuré) : faces **A, D, C, B, G**.
- **Finition toit** (profil à nervures hautes, évacue l'eau) : face **T**.
- Ce sont des **produits différents** chez le fabricant : à commander séparément.

## Murs
- Panneaux sandwich **verticaux**, largeur utile paramétrable.
- Faces **G, D, C** : tête **en biais** (suivent le plan de toit) ⇒ coupe d'arase sur site.
- Faces **A, B** : tête **horizontale**.
- Nombre de panneaux/face = `ceil(longueur / largeur_utile)`.

## Porte
- Face **A**, vitrée, **ouverture extérieure**, double vitrage, charnière à gauche.
- Sert d'apport de lumière principal. Déduite des surfaces nettes de panneaux.

## Livrables générés (`generate.py`)
| Sortie | Rôle |
|---|---|
| `site/data.js` | `window.SHED` : géométrie + débit + achats + modèle 3D (consommé par le site) |
| `site/data/derived.json` | même contenu en JSON (référence / outils) |
| `site/assets/plan-sol.svg` | plan de sol coté + porte |
| `site/assets/plan-toit.svg` | plan de toiture + sens d'écoulement |
| `site/assets/facade-{A,D,C,B,G}.svg` | élévations cotées (trapèzes si biais) |

## Site (`site/`)
- `index.html` + `style.css` + `app.js` (Three.js via CDN, OrbitControls).
- Sections : Aperçu (KPIs), Modèle 3D, Plans, Débit, Achats, Montage, Vigilance.
- Tableaux **remplis dynamiquement** depuis `window.SHED` (pas de chiffre en dur).
- Doit tomber en panne **proprement** si WebGL absent (message + plans toujours visibles).

## Contraintes techniques
- Python **stdlib uniquement** ; pas d'étape de build pour le site.
- Fonctionne en `file://` (d'où `data.js` injecté plutôt que `fetch` JSON).
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
