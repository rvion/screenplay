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
1. **`params.json` est la source unique de vérité.** Aucune cote en dur ailleurs.
2. Après toute édition de `params.json`, lancer `python3 scripts/generate.py` et
   **committer les fichiers générés** (`site/data.js`, `site/assets/*.svg`,
   `site/data/derived.json`).
3. `scripts/generate.py` reste **stdlib Python uniquement**.
4. Le site doit fonctionner en `file://` (données via `data.js`, pas de `fetch`) et
   **dégrader proprement** sans WebGL.
5. Si tu modifies la géométrie, mets à jour `agent/04-geometrie.md`.

## Commandes utiles
```bash
python3 scripts/generate.py            # régénère plans + débit + données 3D
python3 -m http.server -d site 8000    # prévisualise le site
```
