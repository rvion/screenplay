# Pipeline & exploitation

## Arborescence
```
screenplay/
├── CLAUDE.md            # référence agent/* via @ (contexte de l'agent)
├── README.md           # cahier lisible sur GitHub (public)
├── params.json         # SOURCE UNIQUE DE VÉRITÉ (cotes en cm)
├── agent/              # spec-first : vision, besoins, spec, décisions, géométrie, pipeline, backlog
├── scripts/
│   └── generate.py     # params.json -> SVG + data.js + derived.json
└── site/               # GitHub Pages (publié tel quel)
    ├── index.html
    ├── style.css
    ├── app.js          # Three.js (CDN) + tableaux dynamiques
    ├── data.js         # GÉNÉRÉ (window.SHED)
    ├── .nojekyll
    ├── assets/*.svg    # GÉNÉRÉS (plans + façades)
    └── data/derived.json # GÉNÉRÉ (référence)
```

## Régénérer
```bash
python3 scripts/generate.py
```
Idempotent, sans dépendance. À relancer après toute édition de `params.json`.
Les fichiers générés (`data.js`, `assets/*.svg`, `data/derived.json`) sont **commités**
pour que le site fonctionne même sans CI.

## Prévisualiser le site en local
```bash
python3 -m http.server -d site 8000   # puis http://localhost:8000
```
(ou ouvrir `site/index.html` directement : `data.js` évite tout besoin de serveur.)

## Publication GitHub Pages
- Workflow : `.github/workflows/pages.yml` régénère puis déploie `site/`.
- Activation : *Settings → Pages → Source = GitHub Actions* (une fois).
- URL résultante : `https://<compte>.github.io/screenplay/`.

## Invariants à préserver
1. Aucun chiffre métier en dur hors `params.json`.
2. `generate.py` reste stdlib-only.
3. Le site doit marcher en `file://` (donc `data.js`, pas de `fetch`).
4. La 3D doit échouer proprement sans WebGL (les plans restent lisibles).
5. Quand on touche la géométrie, mettre à jour `agent/04-geometrie.md` et relancer le script.
