# Vision

## Pourquoi ce dépôt
Concevoir, documenter et chiffrer un **petit abri de jardin / bureau** que Rémi veut
construire **lui-même** sur une **dalle béton déjà coulée** au fond de son jardin.
Le dépôt est la **source unique** du projet : plans, débit matière, liste d'achats,
cahier de montage et points de vigilance — le tout **paramétrique** et publié sur un
**petit site web** lisible et illustré.

## Principes
1. **Spec-first.** On écrit la spécification et les décisions *avant* le code. Ce dossier
   `agent/` est la mémoire de conception ; il fait foi sur le « pourquoi ».
2. **Source unique de vérité.** Toutes les cotes vivent dans `params.json`. Aucun chiffre
   n'est saisi à la main ailleurs : plans, tableaux et modèle 3D sont **générés**.
3. **Paramétrique.** Changer une mesure ⇒ relancer `python3 scripts/generate.py` ⇒ plans,
   débit, liste d'achats et site à jour. La dalle existe déjà mais la géométrie reste
   pilotée par paramètres pour itérer.
4. **Zéro dépendance lourde.** Génération en Python stdlib ; rendu 3D via Three.js (CDN).
   Doit fonctionner hors-ligne (`file://`) et sur GitHub Pages.
5. **Lisible par un humain non-pro du bâtiment.** Le livrable explique aussi *à quoi faire
   attention* (pente, condensation, drainage, angle non orthogonal, porte extérieure).

## Définition de « terminé »
- `params.json` décrit l'abri réel ; `generate.py` produit plans + débit + achats + data 3D.
- Le site `site/` affiche tout joliment (KPIs, 3D, plans, tableaux, montage, vigilance).
- Le `README.md` est lisible directement sur GitHub une fois le dépôt public.
- Ce dossier `agent/` documente besoins, spec, décisions, géométrie, pipeline et backlog.
