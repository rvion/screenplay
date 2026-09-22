# 🏡 Bureau de jardin en panneaux sandwich

Conception **paramétrique**, **spec-first** et auto-documentée d'un petit **bureau de jardin** à
cinq murs, murs et toit en **panneaux sandwich 60 mm autoportants** (pas d'ossature), sur une
**dalle béton déjà coulée**.

Ce dépôt contient **tout le nécessaire** : plans cotés, débit des panneaux, matériaux à acheter,
guide de montage étape par étape et modèle 3D, le tout calculé depuis un **fichier de paramètres
unique** et publié sur un petit **site web**.

> 🌐 **Site en ligne** : **<https://rvion.github.io/screenplay/>**
> · 🧠 **Spécification** : dossier [`agent/`](agent/) · ⚙️ **Paramètres** : [`params.json`](params.json)

---

## L'abri : le bureau à cinq murs

La dalle réelle, relevée au mètre, se termine en pointe et longe la limite de propriété à gauche
et au fond. L'abri est un **bureau à cinq murs**, avec un mur du fond d'équerre et un pan à 45° qui
longe le mur de propriété et garde un passage vers l'arrière. Il reste au seuil des 5 m² de murs
(sans formalité), sa porte pleine est sur le côté, ses deux fenêtres en façade, et son toit penche
vers le fond : la gouttière court derrière l'abri, le long du mur du fond et du pan à 45°.

![implantation de l'abri sur la dalle](site/assets/modele-implantation.svg)

- **Le document complet** (plans, débit, matériaux, guide de montage, raisons), généré : **[abri.md](abri.md)**
- **La page d'accueil du site** montre le même abri : modèle 3D, plans, matériaux, montage pas à pas
- Les formes qui l'ont précédé, archivées (figées) dans [`etudes/`](etudes/) : [abri-v1.md](etudes/abri-v1.md), [abri-v2.md](etudes/abri-v2.md), [abri-v3.md](etudes/abri-v3.md) (le même abri, toit vers le jardin) ;
  toutes les formes envisagées sur la dalle : [variantes.md](etudes/variantes.md)
- Toutes ses cotes vivent dans [`params.json`](params.json) : les changer, puis `npm run emit`

Aucun chiffre n'est recopié ici : ils vivent dans `abri.md`, recalculé à chaque `npm run emit`.

---

## Comment ça marche (paramétrique)

Toute la logique vit dans [`site/src/compute.ts`](site/src/compute.ts) (dalle, formes possibles,
modèle de l'abri, plans SVG, scène 3D), et la nomenclature et le guide dans
[`site/src/chantier.ts`](site/src/chantier.ts). Les deux sont **purs**, donc partagés entre le
navigateur, le CLI Node et les tests. Les cotes vivent dans [`params.json`](params.json). **Aucune
cote n'est écrite à la main ailleurs.** La 3D utilise Three.js via CDN.

```bash
npm ci                              # esbuild + typescript + jsdom + three (dev)
$EDITOR params.json                 # éditer les cotes
npm run build && npm run emit       # bundle la page + regénère params.js, plans SVG, abri.md, docs
npm run test:raw                    # modèle, dalle, formalités, documents, scène 3D, page
npm run site                        # prévisualiser sur http://localhost:5885 (ou ouvrir site/index.html)
```

---

## Structure du dépôt

```
params.json          ← l'abri et la dalle (source unique des dimensions, en cm)
abri.md              ← le document complet de l'abri (généré)
etudes/              ← études archivées, figées : les 13 formes (variantes.md) et les versions 1 à 3
site/src/            ← TypeScript : compute + chantier (logique pure), abri_page + viewer_abri (page)
site/                ← site GitHub Pages (index.html + abri.js bundlé + params.js + plans + docs/)
tests/               ← tests Node (modèle, dalle, 3D, page sous jsdom) + fixtures des études
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

- **Seuil des 5 m²** : emprise au sol = emprise des **murs**. D'après l'article R*420-1 du Code de
  l'urbanisme, les débords de toiture sont **exclus** de l'emprise au sol tant qu'ils ne sont pas
  soutenus par des poteaux, piliers ou encorbellements. Jusqu'à 5 m² d'emprise au sol *et* de
  surface de plancher : aucune formalité ; de 5 à 20 m² : déclaration préalable. Réserves : secteur
  protégé ou abords d'un monument historique (déclaration préalable quand même), et le PLU.
- **Portée et pente du toit** : vérifier le tableau de portées et la pente mini du fabricant pour
  du 60 mm ; `abri.md` donne la portée et la pente calculées, et la panne à mi-profondeur.
- **Condensation** (usage chauffé) : parements acier = pare-vapeur ⇒ risque aux ponts
  thermiques (dont le joint mur/rehausse). **Ventilation indispensable**.
- **Accès derrière l'abri** : les murs contre la limite ne sont plus accessibles une fois montés ;
  le guide de montage dit lesquels monter à plat.

---

## Publier le site (GitHub Pages)

Pages est sur **Source = GitHub Actions** ; le workflow
[`pages.yml`](.github/workflows/pages.yml) régénère et redéploie `site/` à chaque push sur la
branche par défaut. Site : <https://rvion.github.io/screenplay/>.
