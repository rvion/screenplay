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

## Ouvertures (porte + fenêtres)
- Liste paramétrique `ouvertures[]` dans `params.json`. Chaque ouverture :
  `type` (`porte`/`fenetre`), `face`, `largeur_cm`, `hauteur_cm`, `allege_cm`
  (hauteur du bas / sol, 0 pour une porte), `position` (`gauche`/`centre`/`droite`).
- **Porte** : face **A**, vitrée, **ouverture extérieure**, charnière côté `position`.
  Apport de lumière principal. **Fenêtres** : faces **D** (droite) et **B** (arrière) par défaut.
- Chaque ouverture est **déduite** de la surface nette de panneau de sa face, **dessinée**
  sur le plan de sol et l'élévation concernée (avec allège), et **rendue en 3D** (trou réel
  dans le mur + vitrage ; vantail entrouvert pour la porte).
- ⚠️ Plus de vitrage ⇒ plus de déperditions (usage chauffé) : à doser, cf. vigilance.

## Calcul & livrables (`site/src/compute.ts`)
`buildCore(params)` (pur, sans DOM/Three) produit géométrie + débit + achats + budget + modèle 3D
**et** les 7 SVG. Consommé en direct par le site (recalcul à chaque réglage) et par le CLI Node
`site/src/cli.ts --emit`, qui écrit les artefacts **versionnés** :

| Sortie | Rôle |
|---|---|
| `site/params.js` | `window.SHED_PARAMS` : cotes par défaut (chargées par l'app, marche en `file://`) |
| `site/data/derived.json` | géométrie + débit + achats + budget + modèle 3D en JSON (référence / outils) |
| `site/assets/plan-sol.svg` | plan de sol coté + porte (snapshot statique pour le README) |
| `site/assets/plan-toit.svg` | plan de toiture + sens d'écoulement |
| `site/assets/facade-{A,D,C,B,G}.svg` | élévations cotées (trapèzes si biais) |

## Site (`site/`)
- `index.html` + `style.css` + `app.js` (bundle esbuild de `src/`, Three.js via CDN, OrbitControls).
- Sections : Aperçu (KPIs), Modèle 3D, **Configuration interactive (contrôles)**, Plans, Débit,
  Achats, Budget, Montage, Vigilance.
- **Tout** est recalculé en direct depuis les contrôles : KPIs, tableaux, plans SVG inline et 3D
  (pas de chiffre en dur, pas de `fetch`).
- Doit tomber en panne **proprement** si WebGL absent (message + plans toujours visibles).

## Contraintes techniques
- Logique **TypeScript pure** dans `compute.ts` (réutilisable navigateur + Node) ; build esbuild.
- Fonctionne en `file://` (d'où `params.js` injecté plutôt que `fetch` JSON).
- Tests : snapshots golden (`compute.ts`) + smoke DOM (jsdom) — `npm test`.
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
