# Journal des décisions (ADR léger)

Format : décision · contexte · raison · alternatives écartées.

## D1 — `params.json` comme source unique de vérité
Toutes les cotes y vivent ; le reste est généré. *Pourquoi :* éviter les incohérences
plan/débit/3D, rendre le projet réellement paramétrique (B9). *Écarté :* coter à la main
dans le SVG / le HTML.

## D2 — Génération en Python stdlib  *(remplacée par D14)*
`scripts/generate.py` produisait SVG + `data.js` + `derived.json`. *Pourquoi :* zéro install,
reproductible, lisible. *Écarté :* OpenSCAD (binaire absent de l'environnement), chaîne npm.
**Superseded par D14** : la logique a été portée en TypeScript (calcul côté client en direct) et
`generate.py` a été retiré.

## D3 — Rendu 3D via Three.js (CDN) lisant `window.SHED`
*Pourquoi :* « jolis rendus » interactifs (B10) sans binaire de rendu headless, toujours
synchro avec les paramètres. *Écarté :* PNG pré-rendus (nécessite un moteur), images figées.

## D4 — Données injectées via `data.js` (et non `fetch`)
*Pourquoi :* `fetch` d'un JSON échoue en `file://` (CORS) ; `data.js` marche en local **et**
sur Pages. `derived.json` reste produit pour les outils.

## D5 — Panneaux muraux verticaux
*Pourquoi :* gère simplement la tête en biais des faces G/D/C (une coupe d'arase par panneau)
et le calcul du nombre de panneaux. *Écarté :* pose horizontale (panneaux longs, abouts en
biais plus délicats sur une si petite emprise).

## D6 — Pente relevée de 10 → 25 cm (≈ 10 %) après confirmation
Le brief demandait ~10 cm (≈ 4 %), **sous le minimum usuel** des panneaux de toiture.
Après signalement du risque, l'utilisateur a validé de corriger : `pente_chute_cm = 25`
(≈ 10,2 %, 5,8°), dans la plage admise. Hauteur arrière ramenée à 215 cm (headroom OK).
*Pourquoi :* éviter stagnation / infiltration aux joints. *À vérifier :* mini exact du
fabricant de panneaux. Paramètre unique `toit.pente_chute_cm` si nouvel ajustement.

## D7 — Âme PIR, 60 mm, usage chauffé ⇒ insister sur ventilation
*Pourquoi :* parements acier = pare-vapeur ; le risque se déplace vers la condensation aux
ponts thermiques. La VMC/aérateurs devient **indispensable**, pas optionnelle.

## D8 — Porte sur la face A, ouverture extérieure, charnière gauche
*Pourquoi :* A est la façade d'entrée la plus longue exposée ; ouverture extérieure = B5.
*À confirmer :* position exacte (centrée par défaut) et sens de charnière.

## D9 — Publication GitHub Pages via Actions, dossier `site/`
*Pourquoi :* « adresse simple » `rvion.github.io/screenplay`, déploiement auto à chaque
push, régénération possible en CI. *Écarté :* branche `gh-pages` manuelle.

## D10 — `CLAUDE.md` racine référence `agent/*` via `@`
*Pourquoi :* demande explicite (B11) ; charge la spec dans le contexte de l'agent
automatiquement.

## D11 — Ouvertures généralisées en liste paramétrique
La porte (cas particulier) devient une entrée d'une liste `ouvertures[]` (porte + fenêtres).
*Pourquoi :* ajouter/déplacer des fenêtres sans toucher au code ; déduction débit, plans,
élévations et 3D pilotés par la même donnée. *Défaut :* 1 porte (A) + 1 fenêtre (D) + 1 (B).
*Écarté :* coder chaque ouverture en dur.

## D12 — Scène 3D enrichie (sol, dalle débordante, rail, nervures, gouttière)
Ajout d'un sol enherbé, d'une **dalle béton blanche avec débord**, d'un **rail de pied**
saillant, des **nervures de toiture** et d'une **gouttière arrière + descente**. Murs percés
de vrais trous pour chaque ouverture (généralisation du mur-porte). *Pourquoi :* rendu plus
lisible et réaliste (demande utilisateur). *Compromis :* débord de dalle/toit approximé par
dilatation radiale (pas d'offset mitré), suffisant visuellement.

## D13 — Budget indicatif + éditeur de config interactif  *(étendu par D14)*
Prix dans `params.json` (`prix_indicatifs_eur`) → `budget` calculé, affiché en widget + liens
fournisseurs (exemples, sans affiliation). Première version : un éditeur JSON rebâtissait **seulement
le 3D** côté client, le reste restant généré par Python. **Étendu par D14** : désormais *tout* (plans
SVG, tableaux, budget, 3D) est recalculé côté client par `compute.ts`, piloté par un panneau de
contrôles (sliders / éditeur d'ouvertures) plutôt qu'un textarea JSON.

## D14 — Port complet en TypeScript, Python retiré, site 100 % interactif
Toute la logique de `generate.py` a été portée dans `site/src/compute.ts` (**pur** : sans DOM ni
Three), bundlée par **esbuild** (`site/app.js`) et réutilisée par un **CLI Node** (`cli.ts`, mode
`--emit` pour les artefacts versionnés, `--json` pour les tests). Le site recalcule **tout en
direct** depuis un panneau de contrôles. *Pourquoi :* une seule source de logique (fin de la double
implémentation Python+JS de D13), interactivité totale demandée par l'utilisateur, typage.
*Validation :* la parité **exacte** TS == Python (données + 7 SVG, arrondi *half-even* compris) a
été prouvée par tests avant de retirer `generate.py` ; l'oracle Python est remplacé par des
**snapshots golden** (`tests/snapshots/*.json`) + un **smoke-test DOM** jsdom. *Écarté :* garder
Python comme générateur (duplication, deux langages à synchroniser).

## D15 — Câblage corvion : `CLAUDE.md` réduit à deux lignes, routeur `agent/index.md`
`CLAUDE.md` ne contient plus que deux imports : `@./CLAUDE.local.md` (fichier **gitignoré**,
propre à la machine de Rémi, qui charge `~/dev/corvion/wiki/index.md`) puis `@./agent/index.md`.
Tout l'ancien contenu de `CLAUDE.md` (description, règles d'or, commandes, `@` vers les pages
de spec) vit désormais dans `agent/index.md`, le routeur du dépôt. *Pourquoi :* opt-in au wiki
corvion (identité + capacités de l'agent) sans exposer un chemin privé dans un dépôt public ;
l'ordre des deux lignes est sémantique (contexte de base d'abord, docs du dépôt ensuite pour
qu'elles priment). Un clone étranger ignore silencieusement l'import manquant et ne charge que
`agent/`. Règle machine : SK003 de `shipkit check`. *Complète D10* (le `@` vers `agent/*` passe
par `agent/index.md`). *Écarté :* garder le contenu dans `CLAUDE.md` (invisible au graphe
`agent/` du hub) ; mettre l'import local en ligne 2 (inverse l'ordre).
Dans la foulée, `shipkit init` a câblé le dépôt : `repo.config.ts` (visibilité `public`), scripts
`test`/`typecheck` routés par `shipkit ci` (`*:raw` = l'outil brut, utilisé par la CI GitHub),
`.vscode/tasks.json` (hub sur 4885), `.claude/settings.json` (silencieux d'attribution + une seule
porte d'entrée pour les runners), `rvlib-shipkit` en devDependency.
