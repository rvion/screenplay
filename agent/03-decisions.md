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

## D16 — Emprise rectangulaire (abandon du coin coupé)
Le bâtiment devient un **rectangle A × G** à 4 faces ; le coin coupé de la dalle n'est plus suivi
par les murs. `dalle_cm` conserve les mesures réelles, uniquement pour calculer la partie de
l'emprise **hors dalle** (triangle 90 × 86 cm par défaut) et l'afficher (plan, 3D, vigilance).
*Pourquoi :* « l'angle est une mauvaise idée, un carré est mieux, faisons plus simple » : 4 angles à
90°, profils standard, aucune coupe d'about en biais, moins de pièces. *Écarté :* réduire d'office
l'emprise à 230 × 160 pour tenir sur la dalle (3,7 m², trop petit) — c'est à l'utilisateur de
trancher entre compléter la dalle et réduire G. *Remplace* les sommets `Dfin`/`Bfin` et la face C.

## D17 — Pente par rehausse : murs rectangulaires + 2 triangles + 1 bandeau
Tous les panneaux de mur sont des **rectangles identiques** de hauteur `murs.hauteur_cm` (coupes
droites). La pente vient d'une **rehausse** : une bande `G × chute` coupée **en diagonale** donne
les deux triangles des faces G et D (le second tourné de 180° dans son plan, même parement dehors),
plus un bandeau `A × chute` sur la face A ; le mur B reste à H. Les deux bandes sortent d'un seul
panneau (`debit.rehausse`, plan de coupe `plan-rehausse.svg`). *Pourquoi :* les coupes d'arase
en biais sur chaque panneau (D5) étaient « bizarres » ; ici une seule coupe en biais dans tout
le projet. *Écarté :* garder l'arase par panneau ; poser les panneaux latéraux horizontaux.
*Remplace* D5 pour la tête des murs (la pose verticale est conservée).

## D18 — Une seule ouverture : la porte vitrée
`ouvertures[]` (D11) est remplacé par un objet `porte` unique ; les fenêtres par défaut sont
retirées, ainsi que l'éditeur d'ouvertures du site. La logique interne reste une liste
(`resolve_openings`) pour réintroduire des fenêtres sans refonte. *Pourquoi :* demande explicite
(« pas de fenêtre pour l'instant, une seule porte comme source de lumière ») ; moins de pièces,
moins de déperditions, budget réduit. *Complète* D8.

## D19 — Panneaux 60 mm autoportants, épaisseur fixée, site allégé
L'épaisseur n'est plus un réglage du site : **60 mm** est la valeur du projet, choisie parce que
ces panneaux sont **autoportants** (pas d'ossature secondaire, seulement rail de pied + profils
d'angle). Le site est réduit : réglages emprise/murs/toit/porte/panneaux (prix repliés), montage
en 6 étapes, vigilance recentrée (débord de dalle, portée du toit, pente, condensation, porte).
*Pourquoi :* « le site est trop d'étapes, trop complexe, trop cher » ; une épaisseur plus fine
imposerait une ossature. *À vérifier :* portée libre du toit (~2,8 m) dans le tableau du
fabricant. *Complète* D7 ; *rend caduc* le choix 40/60/80/100 de D13/D14.

## D20 — Retour d'une fenêtre (face D), liste `fenetres[]` séparée de la porte
Après D18 (porte seule), l'utilisateur demande une fenêtre sur la face droite. `params.json`
reçoit une liste `fenetres[]` (une fenêtre 80 × 80, allège 110, face D, à 110 cm de l'avant),
distincte de l'objet `porte`. `position` accepte désormais un **nombre** (distance en cm) pour
caler la fenêtre **dans un seul panneau** (le 2e, 100–200 cm) et ne jamais chevaucher un joint.
Le site propose une carte par fenêtre (face + curseurs) et un bouton d'ajout. *Pourquoi :* lumière
côté droit ; coût contenu (+250 € indicatif) et un seul panneau découpé. *Écarté :* revenir à la
liste unique `ouvertures[]` de D11 (la porte a des règles propres : allège 0, vantail, seuil).
*Amende* D18 (« seule ouverture » ne tient plus) ; *complète* D11.

## D21 — Emprise 200 × 240 (4,8 m²), débords 10 cm, pas d'angle pour gagner 0,4 m²
Le terrain laisse ~2,00 × 2,40 m si l'on veut **faire le tour** de l'abri ; atteindre 5 m² imposait
de reprendre l'angle coupé. Choix : **200 × 240**, débords ramenés à 10 cm, petit triangle
(~54 × 51 cm) de dalle à combler. *Pourquoi :* l'angle rapporte ~0,4 m² intérieur (une bande de
30 cm) contre deux angles obtus, des profils sur mesure, la perte du tour (entretien gouttière,
distance aux limites) et le passage au-dessus de 5 m². *Réglementaire :* ≤ 5 m² d'emprise au sol
et de surface de plancher = aucune formalité ; l'emprise au sol compte les débords, donc 220 × 260
= 5,72 m² ⇒ déclaration préalable probable, à confirmer en mairie. Le site affiche les deux
chiffres (carte « Seuil des 5 m² »). *Écarté :* 230 × 246 (0,39 m² hors dalle, pas de tour),
200 × 190 (seul rectangle entièrement sur la dalle, 3,8 m², trop petit). *Précise* D16.

## D22 — Toit à 2 panneaux entiers (débords latéraux 0) et bloc-porte au module
Deux simplifications de débit. (1) Débords latéraux ramenés à 0 : le toit fait exactement `A`
= 200 de large, soit **2 panneaux entiers** au lieu de 2 + une bande de 20 cm ; la rive est fermée
par une bavette affleurante (pratique standard). (2) La porte devient un **bloc-porte 100 × 215**,
dormant compris, aux cotes d'un module : il **remplace le panneau A2** au lieu de laisser deux
bandes de 5 cm à découper de part et d'autre d'une porte de 90. Règle codée
(`panel_replaced_by`) : une ouverture allège 0, pleine hauteur, couvrant tout un module retire ce
panneau du débit, du 3D et des étiquettes. *Effet :* 9 panneaux de mur + 2 de toit, commande
~29,7 m², budget ~2 820 € HT. *Écarté :* garder 10 cm de débord latéral (3e panneau à refendre) ;
porte 90 dans un panneau (chutes, bandes fragiles). *Complète* D17/D18.

## D23 — Rehausse en bois, deux fenêtres, aménagement chiffré : « simple, abordable, robuste, agréable »
L'utilisateur précise l'objectif : pas le moins cher, mais un bureau agréable au quotidien.
(1) **Rehausse en madrier 75 × 225** (`rehausse.materiau = "bois"`) : un madrier coupé en
diagonale = R2/R3, un droit = R1 ; chute ramenée à 22,5 cm (9,4 %, > 5°). Le bois se coupe à la
scie circulaire, tient les vis et fait **lisse haute** entre murs et toit — le point faible
structurel des triangles de panneau disparaît. (2) **Deux fenêtres 80 × 110** : ouvrante face D
(ventilation traversante avec la porte), fixe face G ; prix distincts. (3) **Bloc-porte alu**
avec serrure à 900 €, panneaux mur à **fixation cachée**, toit **clair**. (4) Bloc `amenagement`
(plancher isolé, multiprise + éclairage sur le câble existant, chauffage, store, finition
intérieure) : cases à cocher, budget en deux groupes **coque / aménagement**, plancher en 3D.
*Écarté :* supprimer la gouttière (le débord de 10 cm goutte sur la dalle qui dépasse) ;
tableau électrique (câble déjà en place). *Effet :* coque ~3 340 €, aménagement ~570 €, total
~3 920 € HT. *Complète* D17 (rehausse), D20 (fenêtres), D22.

## D24 — Dalle mesurée 260 × 220, réglable sur le site
Deux cotes mesurées : **260** de large vue de face, **220** sur le côté droit (le plus court). Les
deux autres ne sont pas mesurées : elles sont **déduites en conservant la coupe 90 × 86** du
premier relevé (gauche 306, arrière jusqu'à la coupe 170), les deux relevés différant exactement
de +30 en largeur et +60 en profondeur. L'abri est **centré en largeur** (`decalage_cm.x = 30`),
2 cm devant : rien hors dalle, et 30 cm de dalle de chaque côté pour en faire le tour. Le site
reçoit un groupe **Dalle** (4 cotes + position de l'abri) : plan de sol, 3D et carte de vigilance
suivent en direct. `compute.ts` borne `arriere_jusqu_coupe ≤ avant` et `droite_jusqu_coupe ≤
gauche`. *Pourquoi :* la dalle était la seule donnée du projet non réglable, et c'est celle qui
reste incertaine. *Écarté :* caler l'abri à droite (`x = 58` ⇒ 21 × 20 cm hors dalle) ; garder
`x = 2` (58 cm de dalle d'un seul côté). *Remplace* les valeurs provisoires du 2026-09-06.

## D25 — Dalle décrite par ses 5 longueurs relevées, pointe trouvée par triangulation
Le relevé au mètre (croquis du 2026-09-19 : 262 / 223 / 324 / 104 / 258, contrôle 260) montre que
la dalle n'est **pas** un rectangle à coin coupé : l'arrière est fait de **deux pans obliques** qui
se rejoignent en pointe. `dalle_cm` passe de 4 cotes (`avant`, `gauche`, `droite_jusqu_coupe`,
`arriere_jusqu_coupe`) à **5 longueurs mesurables** (`avant`, `droite`, `gauche`,
`arriere_gauche`, `arriere_droite`) ; la pointe est calculée par triangulation depuis les hauts
des deux côtés. La partie hors dalle n'est plus une formule de triangle mais un **découpage de
polygone** (emprise − emprise ∩ dalle), valable quel que soit le côté qui déborde.
*Pourquoi :* les paramètres sont ce qu'un mètre ruban mesure ; aucune coordonnée à calculer à la
main, aucun angle à relever. *Hypothèse :* angles avant droits (le contrôle 260 contre 262 le
confirme à 2 cm près). *Écarté :* liste libre de sommets (x, y) (illisible, non mesurable) ;
garder l'ancien modèle avec un arrière horizontal (faux de 74 cm à la pointe). *Remplace* les
cotes déduites de D24 (gauche 306, coupe 90 × 86 : fausses) ; le groupe **Dalle** du site et le
centrage de l'abri restent.

## D26 — Murs de propriété, abri le long du mur gauche, passage arrière mesuré
Le côté gauche et les deux pans du fond de la dalle **sont** le mur de propriété. L'abri
**longe le mur gauche** (`decalage_cm.x = 2`) : tout l'espace libre va à droite (60 cm de dalle,
puis le jardin), et l'accès à l'arrière se fait par une **bande le long du pan de 258**. Cette
bande devient une grandeur calculée (`dalle.passage`), cotée sur le plan, affichée en vigilance,
avec la profondeur maximale qui garde le passage visé (`passage_souhaite_cm`, 45). *Pourquoi :*
« optimiser pour la dalle qu'on a » : la contrainte réelle n'est pas de tenir sur la dalle mais de
garder l'arrière accessible (gouttière et descente sont sur la face B). *Constat :* à 200 × 240
la bande fait 26,8 cm, on ne passe pas ; 200 × 215 donne 45 cm, 200 × 200 donne 56 cm avec 4 faces
en panneaux entiers. **Le choix de la profondeur reste ouvert** (backlog). *Écarté :* abri centré
(D24 : 31 cm perdus contre un mur, et le coin du toit touchait le pan de 258). *Conséquence à
traiter :* la fenêtre fixe de la face G regarde désormais un mur à 2 cm. *Amende* D24 (position).

## D27 — Abri retenu : trapèze de l'option 13, plans 2D générés
Parmi les formes de `variantes(p, g)`, l'utilisateur retient le **trapèze** : façade et mur droit
d'équerre, un seul mur en biais au fond, et ~50 cm de passage derrière l'abri comme seule contrainte
du fond (la bande de 45 cm sur le petit pan de 104 était une erreur, ramenée à 12). Le mur droit
recule jusqu'à ~4,8 m² intérieur (`disposition_trapeze.interieur_vise_m2`) : façade 218, droite
178,8, fond 256,6, gauche 314,1, 5,37 m² de murs. Porte de 65 sur le **mur droit**, chambranle de
5, cadre à 5 cm de la face intérieure du mur du fond et 5 cm sous le haut du mur (passage 65 × 205).
Bureau en L : 60 cm sur tout le mur gauche, 50 cm sur toute la façade, qui ne porte que deux
fenêtres 80 × 110 (allège 95, une par module). `modele_trapeze(p, v)` en tire faces, panneaux,
rehausse, toit et gouttière, et 7 plans (`modele-*.svg`). *Choix par défaut, à confirmer :* toit
**vers l'arrière** (côté haut au jardin, bas contre les murs de propriété, descente au coin arrière
gauche) et **chute 30 cm** (5,5° sur 314 cm ; 22,5 donnait 4,1°, sous le mini usuel), donc madrier
75 × 300. *Écarté :* toit perpendiculaire au fond (le plus de coupes), toit vers la droite (côté haut
contre la propriété). *Reste sur l'ancien rectangle :* débit, achats, budget et 3D (priorité aux
plans 2D, demande explicite). *Amende* D21 (emprise), D26 (passage).
*Précisé ensuite :* lit 75 × 190 minimum, rabattable contre le mur du fond, aucun dégagement devant la
porte (elle ouvre dehors) ; une seule fenêtre de façade, la droite, élargie à 100 (fixe) ; `abri.md`
devient le document complet de l'abri (implantation sur la dalle, plans, débit, budget).
