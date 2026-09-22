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
et de surface de plancher = aucune formalité. ⚠️ **La phrase « l'emprise au sol compte les débords »
était FAUSSE** (elle donnait 220 × 260 = 5,72 m² ⇒ déclaration préalable) : l'article R*420-1 exclut
les débords de toiture de l'emprise au sol tant qu'aucun poteau, pilier ou encorbellement ne les
porte. **Corrigé par D29**, qui fait foi. *Écarté :* 230 × 246 (0,39 m² hors dalle, pas de tour),
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

## D28 — Variante « version 2 » de l'abri retenu, générée à côté de la version 1
L'abri retenu (D27) a été dimensionné par une cible d'intérieur (4,8 m²). Une relecture propose de
le dimensionner par **les panneaux, le seuil et l'eau** : trois murs au module (200 / 200 / 300,
soit 5,00 m² de murs), abri avancé de 4 cm, **toit vers la droite** (égout côté jardin, portée
2 m, madrier courant 75 × 225), débord de 25 cm sur la porte, porte de 80, deux fenêtres de 80.
Plutôt que de remplacer la version 1, la variante est une **surcouche de paramètres** (`abri_v2`)
rejouée par les mêmes fonctions : `abri-v2.md` s'ouvre sur un tableau comparé **calculé**, et dit
aussi ce que la variante perd. *Pourquoi :* deux versions dessinées par le même code se comparent
sans débat sur les chiffres ; le tableau a d'ailleurs corrigé la proposition (la v2 coûte un peu
plus à cause de la fenêtre ouvrante, deux panneaux de toit portent un biais, et un lit de 190
rabattable ne tient pas contre un fond de 224 cm : il lui faut 244 cm). *Écarté :* modifier
`disposition_trapeze` en place (la version 1 est en cours de réglage) ; une page écrite à la main
(chiffres non vérifiables). *Le choix entre les deux versions reste ouvert* (backlog).
*Usage (ajout du 2026-09-21)* : la version 2 prend une **porte pleine** et dit pourquoi cette
disposition sert au quotidien. Les voisins de l'étage voient la façade : porte de côté et pleine,
ils ne voient jamais l'intérieur. Le jour n'entre que par la façade : écrans sur le bureau gauche,
lumière de côté, rien de vitré dans le dos. Et la dalle derrière l'abri (1,89 m², calculé) cache
les outils de jardin, ce qui évite un second abri. Le calcul montre que la version 1 offre la même
surface cachée (1,88 m²) : ce n'est pas un argument pour l'une contre l'autre.

## D29 — Chaque document Markdown a sa page sur le site, avec un index
Les documents du projet (`abri.md`, `abri-v2.md`, `variantes.md`…) ne se lisaient que sur GitHub.
`npm run emit` écrit désormais `site/docs/` : une page HTML par `.md` suivi par git et un index,
pour partager une adresse `rvion.github.io/screenplay/docs/…`. La liste vient de `git ls-files`,
pas d'une déclaration : une future `abri-v3.md` est publiée sans rien toucher, et un fichier
ignoré (chemins privés de `CLAUDE.local.md`) ne peut pas fuiter. Rendu à la génération par
`marked` (devDependency) : aucun script de plus dans le navigateur, D4 et la règle `file://`
tiennent. Pages hors navigation et en `noindex` tant que le projet n'est pas annoncé.
*Écarté :* rendre le markdown dans le navigateur (dépendance au runtime, `fetch` interdit en
`file://`) ; un petit moteur markdown maison (le README contient du HTML et des tableaux) ; une
liste de pages tenue à la main (oubliée à la première v3). Les blocs `abri_vN` sont généralisés
dans le même mouvement (`versions_abri`).

## D29 — Emprise au sol : les débords de toiture n'y entrent pas (correction de D21)
**Article R*420-1 du Code de l'urbanisme** : l'emprise au sol est la projection verticale du volume
de la construction, **exclusion faite des débords de toiture** tant qu'ils ne sont **pas soutenus par
des poteaux, piliers ou encorbellements**. Notre toit ne repose sur aucun poteau : l'emprise au sol
est donc celle des **murs**, et les 10 à 25 cm de débord n'y entrent pas. D21, `01-besoins` (H4),
le backlog, le `README` et la carte « Seuil des 5 m² » du site disaient l'inverse depuis le
2026-09-06 : chiffre gonflé (5,2 puis 5,72 m²) et déclaration préalable annoncée à tort.
*Pourquoi cette correction est mécanique et pas seulement rédactionnelle :* `reglementaire` porte la
règle, ses deux seuils (5 puis 20 m²), la référence de l'article et le commutateur
`debords_sur_poteaux` ; `formalites(p, …)` en déduit `emprise_au_sol_m2`, `surface_plancher_m2` et
la formalité, pour l'ancien rectangle comme pour le modèle trapèze ; `tests/formalites.mjs` est une
**garde** : elle exige que compter les débords fasse basculer en déclaration préalable quand le
commutateur est vrai, et qu'un simple débord en l'air ne change rien quand il est faux.
*Conséquence sur le projet :* la version 1 (5,37 m² de murs) reste au-dessus du seuil, mais parce
que ses **murs** dépassent 5 m², pas à cause du toit ; la version 2 (5,00 m² pile) est dispensée, et
son débord de 25 cm au-dessus de la porte ne la fait pas basculer. *Réserves inchangées :* secteur
protégé ou abords d'un monument historique (déclaration préalable même sous le seuil), et le PLU
(hauteur, implantation, distance aux limites) s'applique de toute façon. *Corrige* D21 ; *complète*
D27 et D28.

## D30 — Version 3 : cinq murs, fond d'équerre d'un module et pan à 45°
Troisième variante, héritée de la version 2 (`herite`) et comparée à elle : le mur du fond devient
d'équerre sur **100 cm**, puis un pan rejoint le haut du mur droit. Avec gauche 300, droite 200 et
fond 100 il reste un coin de 100 × 100 : le pan fait **exactement 45°** et 141,4 cm, sans cote
ajustée. La bande libre gauche passe de 12 à **5 cm**. *Ce que le calcul donne :* 5,50 m² de murs
(déclaration préalable), 4,95 m² d'intérieur (+0,49), plus aucun angle aigu (deux angles de 135°
identiques), une seule bande de panneau recoupée, passage 49,4 cm presque constant car le pan longe
le grand pan de la dalle (42,8°). *Ce qu'il coûte :* le seuil de 5 m², un mur et un angle de plus,
une gouttière en deux tronçons, et le rangement caché derrière l'abri qui passe de 1,89 à 1,41 m².
Le glissement de 7 cm vers la gauche rend au passage ce que le cinquième mur lui prenait (44,7 cm
sans lui). *Pourquoi le modèle a été généralisé plutôt que contourné :* lettres de faces (C),
gouttière sur tous les bords d'égout, zones cachées multiples et héritage de variantes servent à
toute forme future. *Le choix entre les versions reste ouvert.*

## D31 — Réglages du 2026-09-21 : fenêtres 80 × 80, 10 cm à gauche, débords courts, et une version 4
Quatre demandes. (1) **Fenêtres 80 × 80, allège à 110 cm** (haut à 190) au lieu de 80 × 110 allège
95 : assis, les yeux (vers 120 cm) passent juste au-dessus de l'allège, et depuis l'étage des
voisins on voit moins le bureau. 110 plutôt que 115 pour garder cette vue assise. Réglé dans la
version 2, donc hérité. (2) **10 cm au bord gauche** pour la version 2 et ses héritières, au lieu
de 12 (v2) et 5 (v3, *amende D30*) : le vide reste traitable. Conséquence calculée : le passage de
la version 3 passe de 49,4 à **46 cm**, celui de la version 2 monte à 51,5 cm. (3) **Débords de
toit plus courts** : 15 cm au-dessus de la porte (v2, v3), 5 cm devant et derrière (v4).
(4) **Version 4 = version 3 avec le toit vers le fond**, demandée parce que les panneaux de toit
ont des nervures dans le sens de la pente : l'eau ne sort que par leurs bouts bas, la gouttière va
donc derrière, sur le mur du fond et le pan à 45° (règle générale du modèle, D30). *Ce que le
calcul montre :* façade de niveau à 237,5 cm et un panneau de toit en moins, mais portée 3 m au
lieu de 2 m, pente 7,5 % au lieu de 11,2 %, plus de débord gratuit sur la porte, et une descente
sans bonne place (coincée au coin arrière gauche, ou à l'entrée du passage comme retenu ici, avec
un tuyau à ramener au jardin). Les deux sens restent proposés côte à côte (`abri-v3.md`,
`abri-v4.md`).

## D32 — Version 3 réduite : murs 275 et 175, 10 cm de dalle à gauche et devant, 5,00 m²
La version 3 plaisait mais était « un peu trop grande ». Demande : environ 20 cm de moins sur les
murs gauche et droit, et 10 cm de dalle visibles à gauche **et devant**. Retenu : **25 cm** de moins
(gauche 275, droite 175). *Pourquoi 25 et pas 20 :* à 280 / 180 l'abri fait 5,10 m² de murs, soit
une déclaration préalable pour 0,10 m² ; à 275 / 175 il fait **5,00 m²**, sans formalité. Les deux
murs raccourcis de la même longueur, le pan reste un vrai 45° (141,4 cm). *Ce que le calcul
donne :* 4,48 m² d'intérieur (la version 2 en a 4,46), passage arrière **57,8 cm** (l'abri recule
de 9 cm mais son fond avance de 16), rangement caché 1,74 m². *Ce que ça coûte :* les murs gauche
et droit ne sont plus au module, chacun porte une bande de 75 cm. Celle du mur droit est placée en
tête (`panneaux_depuis_la_fin`) pour que le module entier du fond reçoive tout le cadre de la
porte ; celle du mur gauche tombe en bout côté façade, accessible. La version 4 hérite de tout
(portée 2,75 m, pente 8,2 %). *Amende D30 et D31* (cotes et passage de la version 3).

## D33 — La version 3 devient l'abri retenu ; la page d'accueil est sa page de construction, en 3D
Décision de Rémi (2026-09-21) : le bureau à cinq murs (D30, D32) est **l'abri à construire**.
*Mécanisme :* un pointeur, `abri_principal: "abri_v3"`, plutôt qu'une réécriture des paramètres de
base. `abri.md`, la page d'accueil et le modèle 3D suivent ce nom ; la première forme passe dans
`abri-v1.md`, l'ancienne adresse de la version 3 devient une page relais, les liens entre pages se
recalculent. *Pourquoi un pointeur :* retenir une autre version reste un changement d'un mot, les
variantes gardent leur héritage (`herite`), et les tests du modèle de base restent valables.
*Page d'accueil :* elle n'est plus le configurateur du rectangle (déplacé sur
`configurateur.html`) mais la page de l'abri retenu, calculée dans le navigateur : 3D, implantation,
plans, à commander, budget, montage étape par étape, raisons. *Modèle 3D :* une scène générique
(N murs, toit dans un sens ou l'autre) décrite par `modele3d_abri`, pour qu'une future version
retenue s'affiche sans code nouveau. *Vérification :* la scène est construite sous Node avec
three.js et **mesurée** (boîtes englobantes), puis la page est ouverte dans un vrai navigateur ;
l'aspect reste à juger par Rémi. *Écarté :* fondre la version 3 dans `disposition_trapeze`
(casse l'héritage des versions 2 et 4 et tous les tests de la version 1) ; garder deux pages
d'accueil concurrentes.

## D34 — L'abri retenu a son toit vers le fond : la version 4 devient principale
Demande de Rémi (2026-09-22) : l'eau vers le fond, pas vers la droite. La version 4 (D31) est
exactement cela : les cinq murs de la version 3, le toit qui descend de la façade vers le fond, la
gouttière derrière l'abri sur le mur du fond et le pan à 45°. Le changement tient en un mot,
`abri_principal: "abri_v4"` (D33) : `abri.md`, la page d'accueil et le modèle 3D suivent, la
version 3 (toit vers le jardin) redevient une page de comparaison, `abri-v4.md` devient la page
relais. *Ce que ce choix apporte :* une façade de niveau, une gouttière invisible, un panneau de
toit en moins, et le mur contre la propriété n'est plus le mur haut. *Ce qu'il coûte, et que la
page dit :* portée de toit 2,75 m au lieu de 2 m (panne en bois à mi-profondeur conseillée, pas
encore modélisée), pente 8,2 % au lieu de 11,2 %, plus de débord gratuit au-dessus de la porte, et
une descente à l'entrée du passage avec un tuyau à ramener au jardin.

## D35 — Menu de gauche des versions prêtes, et murs en onglet dans la scène 3D
Demande de Rémi (2026-09-22) : un menu à gauche pour passer d'une version à l'autre, limité à
celles qui sont prêtes. `abri_menu` liste les versions montrées (`abri_v3`, `abri_v4`) ; la page
d'accueil rend n'importe quelle version par `?v=N` avec les mêmes fonctions, donc le menu n'ajoute
aucune page : il change le jeu de paramètres. Les versions 1 et 2 restent calculables et
atteignables par leur adresse, avec leur document dans `docs/`, sans être mises en avant.
*Trouvé en chemin :* en mesurant la scène 3D de **chaque** version et plus seulement de la retenue,
le test a montré qu'aux angles aigus des versions 1 et 2 (58° et 63°) les murs à bouts droits
dépassaient de 3 cm à travers le mur voisin ; les angles de 135° des versions 3 et 4 le cachaient.
Les murs et la rehausse ont maintenant des coupes d'onglet. La garde a été vue rouge sans l'onglet,
verte avec. *Leçon de mesure :* la boîte englobante rapide de three.js enveloppe la boîte locale
d'un objet tourné ; il faut la boîte précise pour mesurer un mur en biais.

## D36 — Une nomenclature de matériaux au lieu d'un budget, un vrai guide de montage, une page sobre
Retours de Rémi (2026-09-22). (1) « Les prix sont faux, je ne demande pas le prix des services :
seulement les matériaux bruts, et un guide de montage complet. » L'ancien budget mêlait des prix au
m² de mémoire et des **forfaits** (ventilation, électricité, finition, livraison). Il est remplacé
par une **nomenclature** : chaque article est un achat, sa quantité est calculée par une règle
affichée, son prix est **TTC** avec une **source** ; un article sans source est marqué « prix à
confirmer ». La livraison est hors total, l'équipement est optionnel et à part. (2) Le montage en
11 lignes devient un **guide** : avant de commander, outillage, étapes avec but, outils, gestes et
contrôles à cocher portant les cotes du modèle. (3) « Plus dense, plus simple, plus professionnel,
facile pour moi et pour les gens que je ferai venir » : la page d'accueil perd son bandeau coloré,
ses badges et ses emoji ; elle devient un dossier de construction (fiche chantier, tableaux serrés,
impression). La version retenue passe en tête du menu. *Pourquoi une feuille à part* (`abri.css`) :
`style.css` sert encore le configurateur du rectangle, qu'on ne touche pas. *Écarté :* garder des
forfaits « pour arrondir » ; un guide écrit à la main dans le HTML (il citerait des cotes fausses
au premier changement).

## D37 — Polish de la page : une seule version, liste + détail partagée, fond gris et cartes blanches
Retours de Rémi (2026-09-22) : ne garder que la version 4 (plus de lien vers la 3), moins de mots, un
menu plus fin, le guide en deux colonnes (liste des étapes à gauche, l'étape choisie à droite), les
matériaux pareil, une bascule pour tout déplier (fermée par défaut), **le même composant pour les
deux**, un fond un peu plus sombre avec des boîtes plus claires. Il laissait le choix d'un outil de
build ou de React + MobX. *Retenu :* rester en DOM pur. La page doit marcher en `file://`, se teste
sous jsdom sans navigateur, et le composant tient en 60 lignes (`maitre_detail.ts`) : un framework
ajouterait un runtime et une étape de build pour deux listes. *Mécanismes :* `abri_menu` ne liste
que `abri_v4`, et le bloc des versions ne s'affiche qu'à partir de deux entrées (la version 3 reste
à `?v=3` et dans `docs/`) ; le sommaire surligne la section sous le tiers haut de l'écran par un
écouteur de défilement (un `IntersectionObserver` ne se laisse pas vérifier en Chrome headless à
temps virtuel, l'écouteur oui) ; l'entrée choisie, la bascule et les cases cochées vivent dans
`localStorage`, par version ; l'impression déroule tout. *Mots retirés :* sous-titre réduit à
« version 4 · panneaux sandwich 6 cm · toit vers le fond », libellés du sommaire à un ou deux mots,
notes et total des matériaux raccourcis. *Écarté :* une liste de versions à une seule entrée (un
choix sans choix) ; deux composants proches (un par section).
*Suite du même jour :* les plans passent aussi en liste + détail (ils étaient trop petits côte à côte,
et trop grands en pleine largeur : un seul plan à la fois, borné à la hauteur de l'écran, et
l'implantation en première entrée plutôt qu'une section à part, ce qui répond à « implantation et
plans côte à côte » sans troisième colonne) ; une silhouette de 1,80 m dans la 3D (mesurée par
`tests/abri3d.mjs` : 1,80 m, pieds au sol, dehors devant la porte) ; un style unique pour les cotes
(`span.cote`) et les repères (`span.face`) ; la bascule « tout afficher » à droite du titre ; les
liens « ailleurs » au pied du menu, sans le configurateur. Puis : la fiche chantier tombe à six lignes
(la 3D est le sujet de cette section), l'implantation et le plan de sol sortent dans leur propre section,
côte à côte au-dessus du tableau des murs, et les titres des plans **sortent du dessin** : l'entête d'un
plan est une donnée (`EntetePlan`), le fichier SVG la dessine, la page la rend en texte au-dessus d'un
dessin sans entête. Avant, le titre dans l'image doublait celui de la liste et gonflait l'image.
Puis (correction de terrain) : le côté gauche et le petit pan de 104 sont un **grillage**, pas un mur ;
seul le grand pan de 258 est un mur. `dalle_cm.grillages` porte la distinction, même limite
infranchissable, dessin différent (pointillé vert, treillis en 3D), et les textes qui parlaient du
« mur de propriété » à gauche disent « grillage de la limite ». La fiche devient un **Résumé** (deux
phrases calculées et six cartes), les étiquettes 3D passent sur plaque blanche, le menu à 164 px.


## D38 — « Document complet » est un mode de la page, pas un lien vers la page markdown
Retour de Rémi (2026-09-22) : les deux boutons du haut à droite doivent donner le site entier, déroulé,
sans menu, et rien d'ancien. Avant, « Document complet » ouvrait `docs/abri.html`, le rendu de `abri.md`,
une seconde présentation des mêmes données avec sa propre mise en page. Désormais `?doc=1` pose
`body.document` : la même page, chaque liste déroulée par CSS (`.detail[hidden]` visible, listes et
bascules cachées), et « Imprimer » pose ce mode le temps de l'impression. *Pourquoi un mode CSS et non un
état des listes :* l'état « tout afficher » de chaque liste reste celui de Rémi dans `localStorage`, le
document ne l'écrase pas ; et `@media print` ne porte plus que le papier, donc rien n'est déroulé deux
fois. *Trouvé en imprimant :* la page imprimée fait ~800 px de large, donc les règles « tablette »
(`max-width: 980px`) s'appliquaient au papier : une colonne partout, chaque plan à sa hauteur d'écran,
27 pages dont la moitié blanches, les tableaux de matériaux coupés à droite. Rémi préfère cette mise en page
« tablette » sur papier (une colonne, un plan sous l'autre) à la large : le bloc d'impression la garde,
borne les dessins à 40 % de page, et le plan du rectangle (seul SVG sans `width`/`height`) reçoit ses cotes pour ne plus disparaître en
`height: auto`. Vérifié par un PDF de Chrome headless (23 pages, vignettes 3D rendues) ; l'aspect à
l'écran reste à juger par Rémi. Dans la foulée : le titre « Sommaire » du menu tombe, et la section
des questions devient « Questions et idées », deux listes simples (Q1…, I1…) au lieu d'un texte en
deux colonnes, les idées étant des pistes de simplification à explorer, aucune décidée.

## D39 — Les études sortent de la racine : `etudes/`, et plus de page relais
Demande de Rémi (2026-09-22) : la racine mêlait l'abri retenu et quatre pages d'étude (`abri-v1.md` à
`abri-v4.md`, `variantes.md`), sans dire où vit la version du site. Désormais la racine ne porte que
`README.md` et `abri.md` (la version retenue) ; `npm run emit` vide puis réécrit `etudes/` avec les
autres versions et les 13 formes. La page relais `abri-v4.md` disparaît : les pages de `docs/` sont
cachées (`noindex`, D29), aucune adresse publique n'en dépendait. *Mécanisme :* les générateurs
écrivent tous leurs liens depuis la racine du dépôt (`nom_page` rend `etudes/abri-v2.md`), et une seule
fonction (`relativise`, `docs.ts`) les rend relatifs au dossier de la page au moment de l'écrire. Les
textes de `params.json` suivent la même règle, ce qui sert aussi la page d'accueil (lien vers
`docs/etudes/…`). *Écarté :* supprimer ces pages (les comparaisons calculées gardent leur valeur) ;
un dossier `archive/` (les versions restent recalculées, ce ne sont pas des fichiers figés).


## D40 — Plus de versions : `params.json` décrit l'abri actuel, les études sont figées
Demande de Rémi (2026-09-22) : la seule version qu'il connaît est la quatrième, et elle ne doit pas
s'appeler « v4 » : c'est l'abri actuel. Avant, ses cotes n'existaient nulle part en clair : la base de
`params.json` (la première forme), puis les surcouches `abri_v2`, `abri_v3`, `abri_v4` fusionnées en
chaîne (`herite`, `params_v2`), pointées par `abri_principal`. *Maintenant :* la fusion est écrite une
fois pour toutes dans `params.json`, et les textes de la page vont dans un bloc `abri` (`titre`,
`dossier`). Le code perd le menu des versions, `?v=N`, le bandeau d'étude, le tableau comparé
(`compare_md`) et les textes comparatifs (`atouts/pertes/notes` de chaque version) ; `abri.md` finit sur
le `dossier`, comme la page. *Les études 1 à 3* ne peuvent plus se recalculer : leurs pages sont
**figées** dans `etudes/` (bandeau « archive figée », plans copiés sous `site/assets/etudes/vN/`), et
leurs paramètres fusionnés deviennent des **fixtures de test** (`tests/fixtures/etude-v{1,2,3}.json`) :
le solveur d'intérieur visé, les 4 murs à angle aigu et le toit vers la droite restent couverts.
*Vérification :* la sortie complète de l'abri (24 plans, modèle, scène 3D, planches) est identique
octet pour octet avant et après la fusion. *Garde :* `tests/abri_dom.mjs` refuse tout bloc `abri_vN` ou
`abri_principal`, `tests/modele.mjs` tout numéro de version dans `abri.md`. La clé du navigateur reste
`abri-v4-…` pour ne pas perdre les cases déjà cochées. *Écarté :* supprimer les études (elles gardent
leurs comparaisons, et l'archive était demandée) ; les régénérer depuis les fixtures (des données de
test ne pilotent pas des documents publiés). *Remplace* D33 (pointeur `abri_principal`) et D35 (menu).

## D41 — L'étude du rectangle quitte le dépôt
Demande de Rémi (2026-09-22) : retirer le poids mort. Le rectangle 200 × 240 (D16 à D24) vivait encore
en parallèle de l'abri : `configurateur.html` et son bundle `app.js`, quatre modules (`main`,
`controls`, `render`, `viewer`), `style.css`, la moitié de `compute.ts` (débit, achats, budget, scène
3D, plan de sol, toiture, rehausse et élévations du rectangle), `site/data/derived.json`, ses
snapshots, ses tests DOM et ses blocs de `params.json` (`emprise_cm`, `fenetres`, `toit`, `divers`,
`prix_indicatifs_eur`, les postes d'aménagement autres que le plancher). Tout est retiré.
*Ce qui reste et pourquoi :* `geometry(p)` ne rend plus que la dalle, dans son propre repère (plus de
`decalage_cm` : le rectangle en était le seul usager) ; `porte`, `murs`, `rehausse` gardent les valeurs
que lisent encore les formes 1 à 12 et le modèle ; `docs.css` reprend la base de `style.css` pour les
pages de documents. *Vérification :* sur la sortie complète de l'abri, seuls `plan-dalle.svg` et
`plan-dalle-bandes.svg` changent (ils dessinaient le rectangle en fantôme) ; modèle, formes, scène 3D,
planches et les 22 autres plans sont identiques. *Garde remplacée :* les snapshots du rectangle
cèdent la place à un snapshot golden de l'abri (`tests/snapshots/abri.json`), vu rouge sur une chute
changée de 22,5 à 23 cm. *Remplace* D16 à D24 pour le code ; ces décisions restent comme historique.
