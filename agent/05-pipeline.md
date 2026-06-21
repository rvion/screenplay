# Pipeline & exploitation

## Arborescence
```
screenplay/
├── CLAUDE.md            # référence agent/* via @ (contexte de l'agent)
├── README.md           # cahier lisible sur GitHub (public)
├── params.json         # cotes par défaut (source unique des dimensions, en cm)
├── package.json        # scripts npm (build / emit / test / typecheck)
├── tsconfig.json
├── agent/              # spec-first : vision, besoins, spec, décisions, géométrie, pipeline, backlog
├── tests/
│   ├── snapshot.mjs    # snapshots golden de compute.ts (remplace l'oracle Python)
│   ├── cases.mjs       # jeux de params partagés
│   ├── dom.mjs         # smoke-test DOM (jsdom)
│   └── snapshots/*.json
└── site/               # GitHub Pages (publié tel quel)
    ├── index.html
    ├── style.css
    ├── src/            # TypeScript : compute (logique pure) + viewer/render/controls/main + cli
    ├── app.js          # GÉNÉRÉ (bundle esbuild de src/main.ts)
    ├── params.js       # GÉNÉRÉ (window.SHED_PARAMS = cotes par défaut)
    ├── .nojekyll
    ├── assets/*.svg    # GÉNÉRÉS (plans + façades, snapshot statique pour le README)
    └── data/derived.json # GÉNÉRÉ (référence)
```

## Régénérer
```bash
npm ci                         # une fois (esbuild, typescript, jsdom)
npm run build                  # bundle src/main.ts -> site/app.js
npm run emit                   # cli.ts --emit : params.js + assets/*.svg + derived.json + cache-bust
npm test                       # snapshots golden + smoke DOM
```
Les fichiers générés (`app.js`, `params.js`, `assets/*.svg`, `data/derived.json`) sont **commités**
pour que le site fonctionne même sans CI. Si un changement de calcul est **voulu** :
`npm run snapshot:update`.

## Prévisualiser le site en local
```bash
python3 -m http.server -d site 8000   # puis http://localhost:8000
```
(ou ouvrir `site/index.html` directement : `params.js` évite tout besoin de serveur.)

## Publication GitHub Pages
- Workflow : `.github/workflows/pages.yml` build le TS, lance les tests, puis déploie `site/`.
- Activation : *Settings → Pages → Source = GitHub Actions* (une fois).
- URL résultante : `https://rvion.github.io/screenplay/`.

## Invariants à préserver
1. Aucun chiffre métier en dur : cotes dans `params.json`, logique dans `compute.ts`.
2. `compute.ts` reste **pur** (aucun `import` de DOM ni de Three) pour tourner navigateur + Node.
3. Le site doit marcher en `file://` (donc `params.js`, pas de `fetch`).
4. La 3D doit échouer proprement sans WebGL (les plans restent lisibles).
5. Quand on touche la géométrie/calcul : mettre à jour `agent/04-geometrie.md`, relancer
   `npm run build && npm run emit`, et vérifier/mettre à jour les snapshots (`npm test`).
