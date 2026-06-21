# CLAUDE.md — contexte de l'agent

Ce dépôt est un projet **spec-first** : la conception est écrite *avant* le code.
Toute la spécification vit dans `agent/`. Avant d'agir, lis-la — elle fait foi sur le
« pourquoi » et les invariants.

## Spécification (chargée automatiquement)
- @agent/00-vision.md — vision, principes, définition de « terminé »
- @agent/01-besoins.md — besoins utilisateur, hypothèses, non-objectifs
- @agent/02-specification.md — spécification technique et livrables
- @agent/03-decisions.md — journal des décisions (ADR léger)
- @agent/04-geometrie.md — géométrie : sommets, longueurs, aire, pente
- @agent/05-pipeline.md — arborescence, génération, publication, invariants
- @agent/06-backlog.md — questions ouvertes, améliorations, limites

## Règles d'or
1. **`params.json` est la source unique de vérité des cotes.** Aucune cote en dur ailleurs.
2. **`site/src/compute.ts` est la source unique de la logique** (géométrie, débit, plans SVG,
   budget, modèle 3D). Le site la rejoue en direct ; le CLI Node la réutilise. Reste **pur**
   (aucun `import` de DOM ni de Three) pour tourner navigateur **et** Node.
3. Après toute édition de `compute.ts` : `npm run build` (bundle esbuild → `site/app.js`) puis
   `npm run emit` (regénère `site/params.js`, `site/assets/*.svg`, `site/data/derived.json` +
   cache-bust). **Committer les fichiers générés.** Lancer `npm test` (snapshots + smoke DOM).
4. Si un changement de calcul est **voulu**, mettre à jour les snapshots : `npm run snapshot:update`.
5. Le site doit fonctionner en `file://` (données via `params.js`, pas de `fetch`) et
   **dégrader proprement** sans WebGL.
6. Si tu modifies la géométrie, mets à jour `agent/04-geometrie.md`.

## Commandes utiles
```bash
npm ci                                 # installe esbuild / typescript / jsdom (dev)
npm run build && npm run emit          # bundle l'app + régénère params.js, SVG, derived.json
npm test                               # snapshots golden (compute.ts) + smoke DOM (jsdom)
npm run typecheck                      # tsc --noEmit
python3 -m http.server -d site 8000    # prévisualise le site (ou ouvrir site/index.html)
```
