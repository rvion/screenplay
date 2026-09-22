# Spécification

## Repère et conventions
- Cotes en **centimètres** dans `params.json` (mètres dans le modèle 3D).
- Repère plan = celui de la dalle : origine au coin **avant-gauche** de la dalle, `x` vers la
  **droite**, `y` vers l'**arrière**. Hauteur `z` (ou `Y` monde Three.js) vers le haut.
- Faces de l'abri dans l'ordre du contour : **A** façade, **D** droite, **C** pan, **B** fond,
  **G** gauche ; **T** toiture et **R** rehausse dans le débit.

## Dalle (voir `04-geometrie.md`)
- `dalle_cm` décrit la dalle **réelle** par les **5 longueurs relevées au mètre** (`avant`,
  `droite`, `gauche`, `arriere_gauche`, `arriere_droite`). La pointe arrière est trouvée par
  triangulation ; des longueurs qui ne ferment pas donnent un quadrilatère, jamais une erreur.
  `geometry(p)` ne rend que la dalle (`{ dalle }`) : polygone, angles, cotes, murs de propriété,
  zone utile (`bandes_libres_cm`).
- `dalle_cm.murs_mitoyens` : côtés qui sont la **limite de propriété** (gauche + les deux pans du
  fond), infranchissables. `dalle_cm.grillages` nomme ceux fermés par un **grillage** et non un mur
  (gauche, petit pan de 104) et `dalle_cm.palissades` ceux fermés par une **palissade en bois** (grand pan de
  258) : `dalle.murs[].type` vaut `grillage`, `palissade` ou `mur`. Un mur est un trait brun épais sur le
  plan et un volume en 3D ; une palissade un trait brun sur le plan et, en 3D, des poteaux carrés à chaque
  travée (`palissade_travee_cm`) et entre eux un panneau de planches de `palissade_epaisseur_cm` à sommet
  bombé, dans le groupe `cloture`, **translucide au départ** (bouton « clôture » à trois états : translucide, pleine, absente) ;
  les **parois** (murs, joints, rehausse, cadre et battant, fenêtres, étiquettes) sont dans le groupe `murs`
  et portent un fondu de coupe injecté dans leurs matériaux (`onBeforeCompile`, uniform `uCoupe`) : le
  bouton « murs » les laisse pleins, les **coupe net à 1 m**, les **voile** (translucides, `voile()`), **retire les faces D et C**
  (chaque pièce de mur porte la lettre de sa face) ou les cache ; le bouton « toit » a le même état voilé, et le bouton « porte » un quatrième état (fermée et
  voilée). La vue « au bureau » est en murs coupés, la vue « debout dedans » montre **tout l'abri voilé**,
  à sa vraie hauteur, et la vue « regarder » se met à la place de quelqu'un couché, grand angle.
  Le lit se lit comme un **canapé** (gros coussins de dossier contre la façade) partout sauf dans la vue
  « couché », où le couchage (drap, oreiller, plaque de taille) remplace les coussins. Le bouton **mobilier** a trois états (l'usage, le lit étant à demeure) : rien d'utilisé (fauteuil à moitié
  rentré), fauteuil au bureau, **lit v1** le long de la porte (sommier, matelas, drap, oreiller lavande avec la taille du lit sur
  une plaque ; le fauteuil et le tabouret sont **rangés sous les bureaux**), **lit v2** en biais au fond, la tête côté porte (le fauteuil
  et le tabouret sont calés sous le bureau de façade, le fauteuil glissé à gauche s'il chevauche le lit), puis les **lits à demeure** de `lits_muraux`,
  un état chacun : **lit v3** (lit 70 × 180 le long du mur avant, tête dans le coin gauche, plus de bureau de
  façade, le bureau gauche arrêté au bord du lit en bureau d'angle au fond) et **lit v4** (lit 90 × 190 contre le
  mur gauche, tête au fond, bureau en L devant : toute la façade plus un retour sur le mur gauche jusqu'au pied
  du lit). Chaque entrée nomme son mur, son lit, le côté de la tête et les bureaux qui restent ; `compute.ts`
  réduit chaque bureau au plus grand morceau hors du lit et range les sièges dessous, hors du lit (groupes
  numérotés à partir de 3 : `lit3`, `bureaux3`, `sieges_ranges3`, `personne_couchee3`, puis 4…). La **personne** dedans suit le
  mobilier : debout, assise au fauteuil face au bureau, ou couchée sur le lit la tête sur l'oreiller
  (groupes `personne_dedans`, `personne_assise`, `personne_couchee`, `personne_couchee2`, puis `personne_couchee3`… des lits à demeure) ;
  un grillage un pointillé vert sur le plan, et en 3D un treillis
  à mailles losange (texture de grillage dessinée sur un canvas, maille de 5 cm, vide entre les fils ; plan
  translucide uni sans canvas) avec poteaux tous les 2 m et lisse haute, haut de `grillage_hauteur_cm` (100, mesuré) ; le mur
  garde `mur_hauteur_cm` (180, hypothèse à mesurer). La légende (`legende_clotures`) et les textes du guide suivent. Le passage derrière l'abri se mesure sur la forme elle-même
  (`v.passages`, vraie distance à chaque mur du fond, visée : `passage_souhaite_cm`).

## Calcul & livrables (`site/src/compute.ts`)
`buildCore(params)` (pur, sans DOM/Three) produit la dalle, les formes possibles, le modèle de
l'abri (faces, panneaux, rehausse, toit, nomenclature, guide), la scène 3D, les planches de la page
**et** les SVG. Consommé en direct par la page et par le CLI Node `site/src/cli.ts --emit` (qui
supprime tout plan de `site/assets/` qu'il ne produit plus) :

| Sortie | Rôle |
|---|---|
| `site/params.js` | `window.SHED_PARAMS` : les paramètres (marche en `file://`) |
| `abri.md` | le document complet de l'abri |
| `site/assets/plan-dalle.svg` | dalle seule vue de dessus : cote de chaque côté, angle intérieur à chaque sommet (`dalle.angles_deg`), position de la pointe, murs de propriété |
| `etudes/variantes.md` + `site/assets/etudes/variantes/*.svg` | **étude des formes, figée le 2026-09-22** (D42) : la dalle et ses bandes libres, puis les 13 formes possibles dans la zone utile, faite avec les bandes de la première forme (gauche 12, avant 5). `variantes(p, g)` reste calculé, car l'option 13 porte l'abri ; ses 13 plans ne sont plus dessinés |
| `variantes(p, g)` | formes d'abri possibles dans la zone utile, porte sur le côté avant : 1 rectangle en modules entiers, 2 plus grand rectangle, 3 rectangle pleine largeur, 4 et 5 coins coupés, 6 toute la zone, 7 rectangle à orientation libre, 8 plus grand quadrilatère, 9 à 11 trapèzes, 12 coin coupé au module, 13 trapèze pleine largeur aménagé par `disposition_trapeze` (porte, bureau en L, `sieges`, `lit_pliant`, `lit_pliant_2`) ; chaque forme porte ses `passages` (vraie distance à chaque mur du fond). L'option 13 à cotes imposées (`cotes_cm`) est l'abri |
| `etudes/abri-v{1,2,3}.md` + `site/assets/etudes/v{1,2,3}/*.svg` | **études archivées, figées le 2026-09-22** (D40) : les trois formes qui ont précédé l'abri actuel, avec leurs plans et leurs tableaux comparés. Plus recalculées : leurs paramètres ne sont plus dans `params.json`. Leurs jeux de paramètres fusionnés servent de **fixtures de test** (`tests/fixtures/etude-v{1,2,3}.json`) pour garder couverts les cas à 4 murs, à angle aigu et à toit vers la droite |
| `site/assets/modele-implantation.svg` | l'abri retenu **sur la dalle réelle** (côtés, angles, murs de propriété), toit et gouttière, distances aux bords de la dalle, passages derrière ; première image d'`abri.md` |
| `site/assets/modele-{sol,toit,rehausse}.svg`, `modele-facade-{A,D,C,B,G}.svg` | **plans de l'abri** (option 13, `modele_trapeze`, D27) : plan de sol (murs 6 cm, ouvertures et chambranle, chaîne de cotes, cotes intérieures ; la disposition réellement retenue : s'il existe un lit à demeure (`lits_muraux`), c'est lui en violet plein, avec ses bureaux par-dessus son pied et ses sièges rangés, sinon le bureau en L et le lit pliant en pointillé), toiture (panneaux dans le sens de la pente, rampant, gouttière, descente, pente), débit de la rehausse (pièces rangées dans les madriers, deux coins complémentaires partagent une coupe en biais), élévations vues de l'extérieur (panneaux, rehausse, porte avec cadre, fenêtres, hauteurs aux deux bouts) |

## Formalités (`formalites(p, …)`)
`reglementaire` (params) porte les deux seuils (5 puis 20 m²), la référence de l'article et
`debords_sur_poteaux`. `formalites()` en tire `emprise_au_sol_m2` (celle des **murs** : les débords
de toiture sont exclus tant qu'aucun poteau ne les porte, R*420-1), `surface_plancher_m2`,
`formalite` et les réserves ; `modele.formalites` l'expose, le site et les pages `abri*.md` n'affichent que ce calcul. Garde : `tests/formalites.mjs`.

## L'abri et la page d'accueil
- `params.json` **décrit l'abri lui-même** (D40) : ses cotes vivent dans la base (`disposition_trapeze`,
  `dalle_cm`, `panneau`…), ses textes dans le bloc `abri` (`titre`, `dossier`). Aucune version, aucune
  surcouche. Conséquences, toutes générées :
  - `abri.md` = cet abri, ses raisons **en fin** de page (« Pourquoi cette forme » : le `dossier`) ;
    tout `etudes/` est figé (D42) ;
    les générateurs écrivent leurs liens depuis la racine, `relativise` les rend relatifs à la page (D39).
  - **`site/index.html` = le dossier de construction de l'abri retenu** (bundle `site/abri.js`, entrée
    `src/abri_main.ts`, feuille `site/abri.css` autonome). C'est un document de travail pour Rémi et
    pour les personnes qu'il fera venir : en-tête fin sans couleur ni emoji, texte dense, tableaux
    serrés. Deux boutons en haut à droite : **Document complet** (`?doc=1`, `body.document` : la même
    page tout déroulée, sans menu, sans listes ni bascules, plans et alternatives en grille de deux, le
    plan de rehausse sur toute la largeur ; le bouton devient « Vue interactive ») et
    **Imprimer**, qui pose ce mode le temps de l'impression (`beforeprint` / `afterprint`) : `@media print`
    ne porte que le papier : la page imprimée fait ~800 px de large, donc c'est la mise en page
    « tablette » (une colonne, un plan sous l'autre, borné à 40 % de page) qui s'imprime ; 3D et liens
    « agrandir » cachés, tableaux sans défilement, page neuve avant les élévations, le guide et les
    alternatives. Aucun bouton ne mène à
    la page markdown : `docs/abri.html` reste atteignable par « Tous les documents » dans le menu.
    Sections : **Résumé** (un paragraphe de faits séparés par des points médians, les faits clés surlignés
    en `span.fait` : murs, panneaux, toit, pente, portée, porte, fenêtres, bureaux, hauteurs, surfaces,
    matériaux ; un petit dessin nu, `resume_svg` : l'abri sur
    la dalle, la longueur et la lettre de chaque mur et l'angle de chaque coin à l'intérieur du contour, les
    marges gauche, devant, droite et le passage derrière avec leur chiffre hors de la dalle, la limite en
    trait, avec une courte légende à côté ; le détail vit dans les sections) à
    côté du **modèle 3D**, qui remplit la hauteur de la colonne ; trois mises en page : large (texte et dessin
    à gauche, 3D à droite), moyenne de 640 à 980 px (texte à gauche, dessin à droite, 3D en dessous sur toute
    la largeur), téléphone (tout empilé, dessin réduit avec sa légende à droite) ; **Implantation sur la
    dalle** et **Plan de sol** (deux boîtes côte à côte) ; **Murs** (le tableau) ; élévations, toiture,
    rehausse ; débit des panneaux ; **matériaux à acheter** ; **guide de montage** ; **Ouvertures** et
    **Mobilier** (l'une sous l'autre) ; **Pourquoi cette forme** (`abri.dossier` :
    ✅ points forts, ⚠️ points faibles) ; **Questions et idées** (deux listes simples côte à côte :
    `dossier.questions`, numérotées `Q1`… en `span.question`, chacune finit par « ? », et
    `dossier.idees`, numérotées `I1`…, des pistes pour simplifier sans changer la forme, accroche en
    gras ; aucune n'est décidée ni dessinée) ; textes
    **autonomes**, sans comparaison ; chaque puce ouvre sur son accroche en gras, la suite en petit) ;
    **Formes étudiées** (`params.formes_etudiees` : Everbox, Carré 2 × 2, Rectangle 200 × 240, Trapèze ;
    produit du commerce dessiné en simple rectangle, ou étude figée : son plan, un SVG sous
    `site/assets/etudes/formes/` que `npm run emit` recopie dans `params.js`, ses chiffres du 2026-09-22
    et son document ; dessins sans
    entête, chiffres, lien). Les **matériaux** tiennent en quatre colonnes : la règle de calcul, la note et
    la source sont sous le nom de l'article, en petit italique. Tout est calculé dans
    le navigateur depuis `params.js` (`calcule_abri` puis `rend_abri`, `src/abri_page.ts`, DOM seul) :
    aucune cote dans le HTML, et la page marche en `file://`.
  - **Menu de gauche** (196 px) : le sommaire des sections sans titre, la section sous le tiers haut de l'écran
    surlignée, puis les liens « ailleurs ». Sur petit écran la colonne passe en haut.
  - **Liste + détail** (`src/maitre_detail.ts`, un composant DOM pour deux usages) : une liste à
    gauche, l'entrée choisie seule à droite, boutons précédente / suivante au pied de chaque
    entrée, et une bascule **« tout afficher »** (décochée par défaut) qui déroule tout. L'entrée
    choisie et la bascule sont gardées dans le navigateur (clé `abri-v4-…`, gardée telle quelle pour ne pas perdre
    les cases déjà cochées). L'impression montre toujours
    tout. La bascule est à droite du titre de la section. La section **Implantation et plan de sol**
    montre ces deux plans **côte à côte** puis le tableau des murs ; la section **Élévations, toiture,
    rehausse** est la liste (une élévation par mur, T toiture, R rehausse : chaque plan prend toute la
    colonne, borné à la hauteur de l'écran ; « tout afficher » les range sur deux colonnes), les
    **matériaux** par groupe (sous-total sur chaque ligne, « ? » quand un prix est à confirmer) et le
    **guide** par étape (« avant de commander » et « outillage » en tête, puis les étapes numérotées avec
    leur avancement `cochées/contrôles`, bleu en cours, vert fait).
  - **Planches** (`core.planches`) : chaque plan du modèle a une **entête en données** (`EntetePlan` :
    lettre, nom, détail chiffré, lignes de légende ; `entete_facade`, `entete_sol`…) et deux rendus :
    le fichier SVG la dessine (image autonome pour `abri.md` et `docs/`), la page prend le corps **sans
    entête** (`sans_entete`) et rend le titre en `h3` et la légende en `p.note` au-dessus du dessin :
    rien n'est écrit deux fois, la page contrôle la taille du dessin : pas de fond, marges serrées, boîte à
    la taille du dessin (calé à gauche, jamais centré), **même boîte pour toutes les élévations** (largeur du
    mur le plus long, `largeur_commune`) et même hauteur rendue pour chaque entrée de la liste. Les deux
    planches de tête (implantation, plan de sol) s'alignent rang par rang (titre, légende d'une ligne,
    dessin). Chaque planche a un lien **« agrandir »** qui ouvre le SVG seul dans un nouvel onglet (blob,
    donc aussi en `file://`).
  - **Cotes et repères** : toute cote de la page passe par `cote(x, unité)` (`span.cote`, chiffres
    tabulaires, unité en gris, le degré collé) et tout repère de face ou de panneau par `face(id)`
    (`span.face`, monospace sur fond gris) : un seul style, dans la fiche, les tableaux et les listes.
  - **Menu** (164 px) : sommaire en haut, et tout en bas, petits et gris, les liens « ailleurs »
    (documents, dépôt).
  - **Matériaux à acheter** (`src/chantier.ts`, `nomenclature_abri`) : une **nomenclature**, pas un
    budget. Que des matériaux, en **TTC**, quantités **calculées** depuis le modèle avec leur règle
    affichée (« comment c'est compté »). **Ni main-d'œuvre, ni forfait, ni livraison** (la livraison
    est citée à part, hors total). Groupes : panneaux, bois, profils et bavettes, fixations,
    étanchéité, ouvertures, eaux pluviales, plancher isolé, consommables ; l'équipement (aérateurs,
    électricité, chauffage, stores) est **optionnel et compté à part**. Prix dans
    `prix_materiaux_eur_ttc` : chaque article a `pu`, `unite`, `source` ; **sans source il est marqué
    « prix à confirmer »** sur le site et dans `abri.md`. `m.budget` garde `total_eur`, `coque_eur`,
    `amenagement_eur` pour les tableaux comparés, mais ils ne comptent que des matériaux.
  - **Guide de montage** (`guide_montage`) : avant de commander, outillage, puis les étapes (tracé,
    rail, coupes à plat, mur gauche monté à plat, autres murs, angles, rehausse, panne si
    `toit.panne_intermediaire`, couverture, gouttière, porte, fenêtres, étanchéité, plancher,
    ventilation et électricité). Chaque étape : but, outils, gestes numérotés, **contrôles à
    cocher** avec les cotes du modèle (diagonales du tracé, hauteurs des coins, débords). Les cases
    cochées sont gardées dans le navigateur et comptées dans la liste des étapes. Le
    même guide est écrit dans `abri.md`.
  - `chantier.ts` est pur et **n'importe pas `compute.ts`** (pas de cycle) : il reçoit la variante et
    le modèle déjà calculés.
- **Modèle 3D** : `modele3d_abri` (pur, dans `compute.ts`) décrit la scène en cm dans le repère de la
  dalle : dalle, murs de propriété, plancher, murs (panneaux, ouvertures, rehausse), toit (contour,
  plan, panneaux), gouttière, mobilier. `src/viewer_abri.ts` la construit pour **N murs sur un
  contour convexe** et un toit dans un sens ou l'autre : murs extrudés vers l'intérieur et percés,
  joints et repères de panneaux, cadre et battant de porte ouvert vers l'extérieur, fenêtres,
  rehausse bois, **coupes d'onglet** aux bouts des murs et de la rehausse (la face intérieure raccourcie de
  `e / tan(angle / 2)` : sans elles un mur à bouts droits traverse son voisin à un angle aigu), toit
  nervuré dans le sens de la pente, gouttière sur chaque bord d'égout, descente,
  bureaux, sièges, lit, **étiquettes** de panneaux sur plaque blanche à bord sombre en haut de chaque
  panneau (au-dessus des fenêtres), et une **silhouette de 1,85 m** (`TAILLE_PERSONNE`, sa taille écrite sur le
  torse) pour l'échelle, devant la porte ou à 60 cm du seuil dedans, sur le plancher, dont l'épaisseur
  réelle (`amenagement.plancher.epaisseur_cm`) est celle du modèle. Les **options** sont une colonne de textes posée sur la vue, en
  bas à gauche (icône, libellé fixe, autant de points que d'états, le point actif en bleu ; la pilule de
  verre n'apparaît qu'au survol) : toit, murs, porte, lit, personne, mobilier, repères, clôture. **Rendu** : soleil chaud avec ombres douces (PCF), hémisphère ciel/sol,
  contre-jour faible, environnement de pièce (PMREM) pour les reflets des panneaux métalliques (metalness 0,55),
  tone mapping ACES ; couleurs distinctes par plan (panneaux RAL 9002, toit gris moyen, dalle béton, herbe
  sombre) ; **arêtes** sombres (EdgesGeometry) sur murs, rehausse et toit pour lire les angles. **Bascules** sous la vue : boutons carrés à icône et petit libellé
  (toit, porte (le battant), mobilier, lit, repères, personne) ; lit et personne éteints au départ ; la
  personne a trois états (éteinte, dehors, dedans) marqués par trois points sous le bouton.
  Sur la vue, une **barre de caméra** fine et translucide (angle 15 à 110°, distance, les valeurs en petit
  sur deux lignes, un bouton icône « copier la vue » qui met sur le presse-papiers position, cible, angle
  et distance en JSON : c'est ainsi que Rémi transmet un point de vue à régler dans `VUES` ;
  `window.abri_vue.placer({...})` rejoue un état copié). Sous les deux colonnes du résumé, **sept vignettes** (`VUES` : jardin = vue de
  départ, vue de droite, derrière avec le passage, puis quatre vues de l'intérieur sans toit qui
  partagent une seule caméra (`DEDANS`) : côté porte, au bureau, debout dedans, couché) : des rendus fixes tirés du même contexte WebGL (la scène prend les **états d'options** de la
  vignette le temps du rendu, puis retrouve les siens). Chaque vue fixe porte ses sept états (toit, porte,
  mobilier, lit, repères, personne, clôture) ; un clic règle la caméra **et** les boutons ; la première
  vignette ramène à l'état de départ, comme le bouton reset ; « copier la vue » copie position, cible,
  angle, distance **et** les états. `peuple_abri`
  construit la scène **sans renderer**, ce qui permet de la mesurer sous Node.
- Tests : `tests/abri3d.mjs` construit la scène avec le vrai three.js (devDependency, même version
  que `site/three.js`) et vérifie, **pour l'abri et chaque étude archivée** (fixtures), les boîtes englobantes précises (aucun mur ne traverse son voisin, chaque mur sur son tracé et épaissi vers
  l'intérieur, emprise, sens de la pente, rehausse, gouttière, descente, battant vers l'extérieur,
  bureaux) ; `tests/abri_dom.mjs` remplit `index.html` sous jsdom et vérifie chaque section.

## Documents partageables (`site/docs/`)
- Chaque fichier **Markdown suivi par git** (racine : `README.md`, `abri.md` ; `etudes/*.md` ;
  et `agent/*.md`) a sa page HTML sous `site/docs/`, au même chemin :
  `https://rvion.github.io/screenplay/docs/etudes/abri-v2.html`. `site/docs/index.html` les liste
  (README, puis tri naturel : abri, etudes/… ; puis la spécification).
- **Rien à déclarer** pour une nouvelle page : `npm run emit` prend les `.md` de `git ls-files`
  et les nouveaux `.md` que git n'ignore pas (`--others --exclude-standard`). **git fait foi** : un fichier ignoré (`CLAUDE.local.md`,
  `STATUS.md`) ne peut pas être publié ; `CLAUDE*.md` et `STATUS*.md` sont exclus par nom en plus, et `asks/` (la file `shipkit asks` des actions à faire par Rémi) par dossier.
- Rendu par `site/src/docs.ts` (**côté Node seulement**, `marked` en devDependency : le bundle du
  navigateur n'en dépend pas, le site reste statique et marche en `file://`). Une seule passe de
  réécriture des liens : fichier sous `site/` → chemin du site ; `.md` publié → sa page ; tout le
  reste → le dépôt (`projet.depot_url`). Titres ancrés façon GitHub (les `#option-1` marchent).
- **Cachées pour l'instant** : aucune entrée dans la navigation du site, `noindex` sur chaque page.
- Le dossier est **vidé puis réécrit** à chaque emit (pas de page orpheline). `tests/docs.mjs`
  garde : pages à jour avec leur `.md`, une page par `.md` suivi, aucun lien, image, ancre ou lien
  vers le dépôt mort (la garde est d'abord essayée sur un échantillon cassé).
- Les textes de `abri.dossier` (points forts, points faibles, questions, idées) : les `{champs}` y sont remplacés par des valeurs **calculées**
  (`{arriere_m2}`, `{arriere_profondeur_cm}`, `{passage_cm}`, `{porte_cm}`) : aucun chiffre saisi.
  `arriere` = dalle au-delà du mur du fond et dans la largeur de l'abri, donc invisible depuis la
  façade ; hachurée en vert sur le plan d'implantation. `disposition_trapeze.porte_vitree = false`
  donne une porte pleine (prix `porte_pleine`, dessin et libellés).
- Le modèle de l'abri retenu accepte **N murs** : `cotes_cm.fond` ajoute un mur du fond d'équerre
  sur le mur gauche, relié au haut du mur droit par un pan (face **C**, entre D et B) ; élévations,
  angles, rehausse, débit et page suivent le nombre de faces. La **gouttière** court sur tous les
  bords par où l'eau sort (normale extérieure dans le sens de la pente : `gouttiere.troncons`).
  L'espace caché derrière l'abri se calcule sur un ou deux murs de fond (union des zones).
  `panneaux_depuis_la_fin` (liste de murs) place la bande recoupée d'un mur **en tête** : sur le
  mur de la porte, le module entier du fond reçoit tout le cadre et la bande reste pleine.
  `toit.descente` (`droite`/`gauche`) place la descente au bout de la gouttière choisi ; sans lui, elle
  va au point bas. Les textes reçoivent aussi `{gauche_cm}`, les débords, la pente, la portée et la
  position de la descente (`injecteur`).

## Contraintes techniques
- Logique **TypeScript pure** dans `compute.ts` ; build esbuild.
- Fonctionne en `file://`.
- Tests : snapshot golden de l'abri (`tests/snapshots/abri.json`), tests du modèle, de la dalle,
  de la scène 3D et de la page sous jsdom : `npm run test:raw`
  (`npm test` passe par `shipkit ci`).
- Publication : GitHub Pages (Actions) — voir `05-pipeline.md`.
