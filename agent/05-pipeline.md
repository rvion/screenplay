# Pipeline & exploitation

## Arborescence
```
screenplay/
├── CLAUDE.md            # 2 lignes : @./CLAUDE.local.md puis @./agent/index.md (cf. D15)
├── CLAUDE.local.md     # GITIGNORÉ, machine de Rémi : @~/dev/corvion/wiki/index.md
├── README.md           # cahier lisible sur GitHub (public)
├── abri.md            # GÉNÉRÉ : l'abri RETENU = la version nommée par params.abri_principal (abri_v4)
├── etudes/            # GÉNÉRÉ, vidé puis réécrit à chaque emit : l'archive des études (D39)
│   ├── variantes.md   #   les 13 formes d'abri sur la dalle (SVG inclus)
│   ├── abri-v1.md     #   la première forme retenue (trapèze de l'option 13)
│   ├── abri-v2.md     #   bloc abri_v2 de params.json, tableau comparé + ses plans
│   └── abri-v3.md     #   cinq murs, toit vers le jardin, comparée à la version 2
│                      # (tout bloc abri_vN non retenu donne etudes/abri-vN.md ; ses plans : site/assets/modele-vN-*.svg)
├── params.json         # cotes par défaut (source unique des dimensions, en cm)
├── package.json        # scripts npm (build / emit / test / typecheck)
├── tsconfig.json
├── agent/              # spec-first : index.md (routeur, chargé par CLAUDE.md) + vision, besoins,
│                       # spec, décisions, géométrie, pipeline, backlog, handoff
├── tests/
│   ├── snapshot.mjs    # snapshots golden de compute.ts (remplace l'oracle Python)
│   ├── cases.mjs       # jeux de params partagés
│   ├── dalle.mjs       # dalle, zone utile, variantes de forme
│   ├── modele.mjs      # modèle 2D de l'abri retenu (faces, rehausse, toit, plans)
│   ├── dom.mjs         # smoke-test DOM (jsdom)
│   └── snapshots/*.json
└── site/               # GitHub Pages (publié tel quel)
    ├── index.html      # page de l'abri retenu (3D, plans, débit, montage) ; charge abri.js
    ├── configurateur.html # l'étude initiale : rectangle réglable ; charge app.js
    ├── style.css
    ├── src/            # TypeScript : compute (logique pure) + viewer/render/controls/main + cli
    │                   # abri_page (page d'accueil, DOM seul) + maitre_detail (liste + détail partagée) + viewer_abri
    ├── app.js          # GÉNÉRÉ (bundle esbuild de src/main.ts, pour configurateur.html)
    ├── abri.js         # GÉNÉRÉ (bundle esbuild de src/abri_main.ts, pour index.html)
    ├── params.js       # GÉNÉRÉ (window.SHED_PARAMS = cotes par défaut)
    ├── .nojekyll
    ├── abri.css        # feuille autonome de la page d'accueil (dense, imprimable ; écrite à la main)
    ├── docs.css        # styles des pages de documents (écrit à la main)
    ├── docs/           # GÉNÉRÉ : une page HTML par .md suivi par git + index.html (adresses à partager)
    ├── assets/*.svg    # GÉNÉRÉS : plan-sol, plan-toit, plan-rehausse, facade-{A,D,B,G}
    └── data/derived.json # GÉNÉRÉ (référence)
```

## Régénérer
```bash
npm ci                         # une fois (esbuild, typescript, jsdom)
npm run build                  # bundle src/main.ts -> site/app.js
npm run emit                   # cli.ts --emit : params.js + assets/*.svg + derived.json + cache-bust
npm run test:raw               # snapshots golden + smoke DOM (npm test passe par shipkit ci) (routé par shipkit ; test:raw = brut)
shipkit ci                     # la porte complète : tâches + règles SK* (repo.config.ts) ; STATUS.md ignoré
```
La CI GitHub (`pages.yml`) appelle `npm run test:raw` : shipkit (bun) n'y est pas installé.
Les fichiers générés (`app.js`, `params.js`, `assets/*.svg`, `data/derived.json`) sont **commités**
pour que le site fonctionne même sans CI. Si un changement de calcul est **voulu** :
`npm run snapshot:update`.

## Prévisualiser le site en local
```bash
npm run site   # puis http://localhost:5885 (documents : http://localhost:5885/docs/)
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
   `npm run build && npm run emit`, et vérifier/mettre à jour les snapshots (`npm run test:raw`).
