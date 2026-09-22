# Pipeline & exploitation

## Arborescence
```
screenplay/
├── CLAUDE.md            # 2 lignes : @./CLAUDE.local.md puis @./agent/index.md (cf. D15)
├── CLAUDE.local.md     # GITIGNORÉ, machine de Rémi : @~/dev/corvion/wiki/index.md
├── README.md           # cahier lisible sur GitHub (public)
├── abri.md            # GÉNÉRÉ : l'abri, tel que params.json le décrit
├── etudes/            # l'archive des études (D39, D40)
│   ├── variantes.md   #   GÉNÉRÉ à chaque emit : les 13 formes d'abri sur la dalle (SVG inclus)
│   └── abri-v{1,2,3}.md #  FIGÉES le 2026-09-22, plans dans site/assets/etudes/v{1,2,3}/
├── params.json         # l'abri et la dalle (source unique des dimensions, en cm)
├── package.json        # scripts npm (build / emit / test / typecheck)
├── tsconfig.json       # alias site/src/* (imports), extensions .ts permises
├── agent/              # spec-first : index.md (routeur, chargé par CLAUDE.md) + vision, besoins,
│                       # spec, décisions, géométrie, pipeline, backlog, handoff
├── tests/
│   ├── snapshot.mjs    # snapshot golden de l'abri (snapshots/abri.json)
│   ├── dalle.mjs       # dalle, zone utile, formes possibles
│   ├── modele.mjs      # modèle de l'abri et des études (faces, rehausse, toit, plans)
│   ├── formalites.mjs  # emprise au sol et seuils (garde R*420-1)
│   ├── docs.mjs        # pages de documents à jour, aucun lien mort
│   ├── ports.mjs       # ports locaux propres au dépôt
│   ├── abri3d.mjs      # scène 3D mesurée avec three.js (abri + études)
│   ├── abri_dom.mjs    # page d'accueil sous jsdom
│   └── fixtures/       # paramètres fusionnés des études figées (etude-v1..v3.json)
└── site/               # GitHub Pages (publié tel quel)
    ├── index.html      # page de l'abri (3D, plans, matériaux, montage) ; charge abri.js
    ├── src/            # TypeScript : compute + chantier (logique pure), abri_page (page, DOM seul),
    │                   # maitre_detail (liste + détail), viewer_abri (3D), docs + cli (Node)
    ├── abri.js         # GÉNÉRÉ (bundle esbuild de src/abri_main.ts)
    ├── params.js       # GÉNÉRÉ (window.SHED_PARAMS = params.json)
    ├── .nojekyll
    ├── abri.css        # feuille de la page d'accueil (dense, imprimable ; écrite à la main)
    ├── docs.css        # feuille des pages de documents (écrite à la main, autonome)
    ├── docs/           # GÉNÉRÉ : une page HTML par .md suivi par git + index.html (adresses à partager)
    └── assets/         # GÉNÉRÉS : plan-dalle*, variante-*, modele-* (.svg) ; etudes/vN/ = plans figés
```

## Régénérer
```bash
npm ci                         # une fois (esbuild, typescript, jsdom, three)
npm run build                  # bundle src/abri_main.ts -> site/abri.js
npm run emit                   # cli.ts --emit : params.js, assets/*.svg, abri.md, etudes/variantes.md, docs/, cache-bust
npm run test:raw               # tous les tests (npm test passe par shipkit ci ; test:raw = brut)
shipkit ci                     # la porte complète : tâches + règles SK* (repo.config.ts) ; STATUS.md ignoré
```
La CI GitHub (`pages.yml`) appelle `npm run test:raw` : shipkit (bun) n'y est pas installé.
Les fichiers générés (`abri.js`, `params.js`, `assets/*.svg`, `abri.md`, `docs/`) sont **commités**
pour que le site fonctionne même sans CI. Si un changement de calcul est **voulu** :
`npm run snapshot:update`, puis relire le diff de `tests/snapshots/abri.json`.

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
