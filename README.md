# 🏡 Abri de jardin — panneaux sandwich

Conception **paramétrique**, **spec-first** et auto-documentée d'un petit
**abri / bureau de jardin** (≈ 5,7 m²) **rectangulaire**, murs et toit en
**panneaux sandwich 60 mm autoportants** (pas d'ossature), sur une **dalle béton déjà coulée**.

Ce dépôt contient **tout le nécessaire** : plans cotés, débit matière, liste d'achats,
cahier de montage en 6 étapes et points de vigilance — le tout généré depuis un **fichier de
paramètres unique** et publié sur un petit **site web**.

> 🌐 **Site en ligne** : **<https://rvion.github.io/screenplay/>**
> · 🧠 **Spécification** : dossier [`agent/`](agent/) · ⚙️ **Paramètres** : [`params.json`](params.json)

---

## Le principe, en une phrase

Une boîte rectangulaire dont **tous les panneaux de mur sont des rectangles identiques**
(coupes droites) ; la pente du toit vient d'une **rehausse** posée dessus : **une bande coupée
en diagonale** (deux triangles, faces gauche et droite) et **un bandeau** sur la face avant.
Une seule coupe en biais dans tout le projet. **Une seule ouverture** : la porte vitrée.

| | |
|---|---|
| **Emprise** | **230 × 246 cm** ≈ **5,66 m²** (4 faces : **A** avant · **D** droite · **B** arrière · **G** gauche) |
| **Panneaux** | sandwich **60 mm autoportants**, âme PIR, pose murale verticale, **12 panneaux de 215 cm** + 1 pour la rehausse |
| **Toit** | **mono-pente vers l'arrière**, rehausse 25 cm (**≈ 10 %**, 5,8°), 3 panneaux toiture de ~2,82 m |
| **Porte** | vitrée, **90 × 210**, face A à droite, ouvrant dehors, **seule source de lumière** |
| **Dalle** | réelle 246 × 230 à **coin coupé** : le coin arrière-droit (90 × 86 cm) **déborde** — à trancher |
| **Usage** | bureau / pièce à vivre, chauffé toute l'année (ventilation obligatoire) |

---

## Plans

| Plan de sol | Plan de toiture |
|---|---|
| ![Plan de sol](site/assets/plan-sol.svg) | ![Plan de toiture](site/assets/plan-toit.svg) |

![Plan de coupe de la rehausse](site/assets/plan-rehausse.svg)

| Face A — Avant | Face G — Gauche |
|---|---|
| ![Face A](site/assets/facade-A.svg) | ![Face G](site/assets/facade-G.svg) |

| Face D — Droite | Face B — Arrière |
|---|---|
| ![Face D](site/assets/facade-D.svg) | ![Face B](site/assets/facade-B.svg) |

*(Le **modèle 3D interactif** est sur le site : dalle réelle, joints de panneaux, porte, toit.)*

---

## Comment ça marche (paramétrique)

Le site est **interactif** : quelques réglages (emprise, hauteur des murs, rehausse, porte,
largeur utile) **recalculent tout en direct** — KPIs, débit, **plans SVG cotés**, budget et
modèle 3D. Pas besoin de rien lancer pour explorer : ouvre simplement le site.

Pour le développement / régénérer les artefacts versionnés :

```bash
npm ci                              # esbuild + typescript + jsdom (dev)
$EDITOR params.json                 # éditer les cotes par défaut
npm run build && npm run emit       # bundle l'app + regénère params.js, SVG, derived.json
npm run test:raw                    # snapshots golden + smoke DOM
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
agent/               ← spécification spec-first (voir CLAUDE.md → agent/index.md)
.github/workflows/   ← build TS + tests + déploiement automatique de Pages
```

La conception détaillée vit dans [`agent/`](agent/) :
[vision](agent/00-vision.md) · [besoins](agent/01-besoins.md) ·
[spécification](agent/02-specification.md) · [décisions](agent/03-decisions.md) ·
[géométrie](agent/04-geometrie.md) · [pipeline](agent/05-pipeline.md) ·
[backlog](agent/06-backlog.md).

---

## ⚠️ Points de vigilance (résumé)

- **Coin arrière-droit hors dalle** : la dalle a un coin coupé ; avec l'emprise 230 × 246 un
  triangle de 90 × 86 cm déborde. Compléter la dalle (coulage / plots) **ou** réduire la
  profondeur `gauche_G`. À trancher avant de commander.
- **Portée du toit** ≈ 2,8 m en 60 mm sans panne : vérifier le tableau de portées du fabricant
  (neige/vent), sinon ajouter une panne.
- **Pente du toit** : 25 cm ≈ **10 %** (5,8°). Vérifier la pente mini du fabricant.
- **Condensation** (usage chauffé) : parements acier = pare-vapeur ⇒ risque aux ponts
  thermiques (dont le joint mur/rehausse). **Ventilation indispensable**.
- **Porte extérieure** : unique source de lumière (double vitrage performant), débattement,
  arrêt de porte, étanchéité du seuil ; gouttière arrière + descente loin de la dalle.

---

## Publier le site (GitHub Pages)

Pages est sur **Source = GitHub Actions** ; le workflow
[`pages.yml`](.github/workflows/pages.yml) régénère et redéploie `site/` à chaque push sur la
branche par défaut. Site : <https://rvion.github.io/screenplay/>.
