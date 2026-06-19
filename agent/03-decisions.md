# Journal des décisions (ADR léger)

Format : décision · contexte · raison · alternatives écartées.

## D1 — `params.json` comme source unique de vérité
Toutes les cotes y vivent ; le reste est généré. *Pourquoi :* éviter les incohérences
plan/débit/3D, rendre le projet réellement paramétrique (B9). *Écarté :* coter à la main
dans le SVG / le HTML.

## D2 — Génération en Python stdlib
`scripts/generate.py` produit SVG + `data.js` + `derived.json`. *Pourquoi :* zéro install,
reproductible, lisible. *Écarté :* OpenSCAD (binaire absent de l'environnement), chaîne npm.

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

## D6 — Pente conservée à 10 cm dans les paramètres, mais signalée
L'utilisateur a demandé ~10 cm (≈ 4 %). On respecte la consigne **mais** on affiche un
**point de vigilance** fort (sous le mini usuel des panneaux toiture) avec recommandation
22–30 cm. *Pourquoi :* respecter le brief sans masquer un risque réel.

## D7 — Âme PIR, 60 mm, usage chauffé ⇒ insister sur ventilation
*Pourquoi :* parements acier = pare-vapeur ; le risque se déplace vers la condensation aux
ponts thermiques. La VMC/aérateurs devient **indispensable**, pas optionnelle.

## D8 — Porte sur la face A, ouverture extérieure, charnière gauche
*Pourquoi :* A est la façade d'entrée la plus longue exposée ; ouverture extérieure = B5.
*À confirmer :* position exacte (centrée par défaut) et sens de charnière.

## D9 — Publication GitHub Pages via Actions, dossier `site/`
*Pourquoi :* « adresse simple » `compte.github.io/screenplay`, déploiement auto à chaque
push, régénération possible en CI. *Écarté :* branche `gh-pages` manuelle.

## D10 — `CLAUDE.md` racine référence `agent/*` via `@`
*Pourquoi :* demande explicite (B11) ; charge la spec dans le contexte de l'agent
automatiquement.
