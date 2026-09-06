# screenplay — abri de jardin / bureau paramétrique

Conception, plans, débit, budget et modèle 3D d'un petit abri de jardin (rectangle 4 faces,
panneaux sandwich 60 mm autoportants, pente par rehausse, une porte) que Rémi construit
lui-même sur une dalle déjà coulée. Projet
**spec-first** : la conception est écrite *avant* le code, dans ce dossier `agent/`.
Stack : TypeScript pur (`site/src/compute.ts`) bundlé par esbuild en un seul `site/app.js`,
Three.js via CDN, tests Node (snapshots golden + jsdom), publication GitHub Pages.

## Quick start
```bash
npm ci                                 # installe esbuild / typescript / jsdom (dev)
npm run build && npm run emit          # bundle l'app + régénère params.js, SVG, derived.json
npm test                               # snapshots golden + smoke DOM, via shipkit (test:raw = brut)
npm run typecheck                      # tsc --noEmit, via shipkit (typecheck:raw = brut)
shipkit ci                             # LA porte : typecheck + test + imports + cycles + règles SK*
python3 -m http.server -d site 8000    # prévisualise le site → http://localhost:8000
```
Site public : https://rvion.github.io/screenplay/

Toute la spécification vit dans ce dossier — la mettre à jour AVANT de changer le code.

**Chargé à chaque session** (la spec complète fait foi sur le « pourquoi » et les invariants) :

@00-vision.md
@01-besoins.md
@02-specification.md
@03-decisions.md
@04-geometrie.md
@05-pipeline.md
@06-backlog.md

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
6. Si tu modifies la géométrie, mets à jour `04-geometrie.md`.

## Où lire avant de toucher…

| surface | doc |
|---|---|
| TRAVAIL EN COURS de la session précédente : lire EN PREMIER, agir, puis vider | `agent/handoff.md` |
| pourquoi ce projet, définition de « terminé » | `agent/00-vision.md` |
| besoins, hypothèses à valider, non-objectifs | `agent/01-besoins.md` |
| `compute.ts`, livrables, sections du site, contraintes techniques | `agent/02-specification.md` |
| pourquoi une chose est comme elle est (ADR) | `agent/03-decisions.md` |
| `emprise_cm`, `dalle_cm`, rehausse (triangles + bandeau), toiture | `agent/04-geometrie.md` |
| arborescence, `npm run build/emit`, fichiers générés, Pages | `agent/05-pipeline.md` |
| questions ouvertes, améliorations, dette | `agent/06-backlog.md` |
