# 🏡 Abri de jardin — panneaux sandwich

Conception **paramétrique**, **spec-first** et auto-documentée d'un petit
**abri / bureau de jardin** (≈ 5 m²) à **5 faces** (carré avec un coin coupé),
murs et toit en **panneaux sandwich 60 mm**, sur une **dalle béton déjà coulée**.

Ce dépôt contient **tout le nécessaire** : plans cotés, débit matière, liste d'achats,
cahier de montage et points de vigilance — le tout généré depuis un **fichier de
paramètres unique** et publié sur un petit **site web**.

> 🌐 **Site en ligne** : **<https://rvion.github.io/screenplay/>**
> · 🧠 **Spécification** : dossier [`agent/`](agent/) · ⚙️ **Paramètres** : [`params.json`](params.json)

---

## En bref

| | |
|---|---|
| **Surface au sol** | ≈ **5,27 m²** |
| **Faces** | **A** avant (porte) · **D** droite · **C** coin coupé · **B** arrière · **G** gauche |
| **Panneaux** | sandwich **60 mm**, âme PIR, pose murale verticale |
| **Toit** | **mono-pente vers l'arrière**, chute 25 cm (**≈ 10 %**, dans la plage admise) |
| **Ouvertures** | **porte vitrée** (face A, ouvrant dehors) + **fenêtres** (faces D et B), paramétriques |
| **Rendu 3D** | sol, **dalle blanche débordante**, rail de pied, **toit nervuré**, gouttière arrière |
| **Usage** | bureau / pièce à vivre, chauffé toute l'année |

### Mesures relevées sur la dalle (cm)
Gauche **246** · Avant **230** · Droite jusqu'à la coupe **160** · Arrière jusqu'à la coupe **140**
→ face **C** (coupe) **calculée** ≈ **124,5 cm** · périmètre ≈ **900 cm**.

---

## Plans

| Plan de sol | Plan de toiture |
|---|---|
| ![Plan de sol](site/assets/plan-sol.svg) | ![Plan de toiture](site/assets/plan-toit.svg) |

| Face A — Avant | Face G — Gauche | Face B — Arrière |
|---|---|---|
| ![Face A](site/assets/facade-A.svg) | ![Face G](site/assets/facade-G.svg) | ![Face B](site/assets/facade-B.svg) |

| Face D — Droite | Face C — Coin coupé |
|---|---|
| ![Face D](site/assets/facade-D.svg) | ![Face C](site/assets/facade-C.svg) |

*(Le **modèle 3D interactif** est sur le site.)*

---

## Comment ça marche (paramétrique)

Le site est **100 % interactif** : un panneau de contrôles (cotes, pente, panneaux,
ouvertures, prix) **recalcule tout en direct** — KPIs, débit, **plans SVG cotés** et
modèle 3D. Pas besoin de rien lancer pour explorer : ouvre simplement le site.

Pour le développement / régénérer les artefacts versionnés :

```bash
npm ci                              # esbuild + typescript + jsdom (dev)
$EDITOR params.json                 # éditer les cotes par défaut
npm run build && npm run emit       # bundle l'app + regénère params.js, SVG, derived.json
npm test                            # snapshots golden + smoke DOM
python3 -m http.server -d site 8000 # prévisualiser (ou ouvrir site/index.html)
```

Toute la logique vit dans [`site/src/compute.ts`](site/src/compute.ts) (géométrie, débit,
plans SVG, budget, 3D) — **pur**, donc partagé entre le navigateur, le CLI Node et les tests.
Les cotes par défaut vivent dans [`params.json`](params.json). **Aucune cote n'est écrite à
la main ailleurs.** La 3D utilise Three.js via CDN.

---

## Structure du dépôt

```
params.json          ← cotes par défaut (source unique des dimensions, en cm)
site/src/            ← app TypeScript : compute (logique) + viewer/render/controls/main
site/                ← site GitHub Pages (index.html + app.js bundlé + params.js + plans)
tests/               ← snapshots golden (compute) + smoke DOM (jsdom)
agent/               ← spécification spec-first (voir CLAUDE.md)
.github/workflows/   ← build TS + tests + déploiement automatique de Pages
CLAUDE.md            ← référence la spec agent/ (contexte de l'agent)
```

La conception détaillée vit dans [`agent/`](agent/) :
[vision](agent/00-vision.md) · [besoins](agent/01-besoins.md) ·
[spécification](agent/02-specification.md) · [décisions](agent/03-decisions.md) ·
[géométrie](agent/04-geometrie.md) · [pipeline](agent/05-pipeline.md) ·
[backlog](agent/06-backlog.md).

---

## ⚠️ Points de vigilance (résumé)

- **Pente du toit** : réglée à 25 cm ≈ **10 %** (5,8°), dans la plage admise par la plupart des
  panneaux de toiture. **Vérifier la pente mini exacte du fabricant.** Paramètre `toit.pente_chute_cm`.
- **Condensation** (usage chauffé) : parements acier = pare-vapeur ⇒ risque aux ponts
  thermiques. **Ventilation (VMC/aérateurs) indispensable**.
- **Drainage** : eau vers le coin arrière-droit → gouttière sur B + C + descente au point bas,
  évacuée loin de la dalle ; bande d'étanchéité au pied.
- **Angle C non orthogonal** : profils d'angle pliables/sur-mesure, coupes d'about soignées.
- **Porte extérieure** : vérifier débattement, arrêt de porte (vent), étanchéité du seuil.

Détail complet : section « Points de vigilance » du site et [`agent/03-decisions.md`](agent/03-decisions.md).

---

## Publier le site (GitHub Pages)

Le dépôt est **public**, Pages est sur **Source = GitHub Actions**, et le site est **déjà en
ligne** : <https://rvion.github.io/screenplay/>. À chaque push sur `main`, le workflow
[`pages.yml`](.github/workflows/pages.yml) régénère et redéploie `site/` automatiquement.

> Le rendu 3D n'a pas pu être validé dans un navigateur réel pendant la génération
> (cf. [`agent/06-backlog.md`](agent/06-backlog.md)) — à vérifier directement sur le site.
