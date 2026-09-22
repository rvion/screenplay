// Genere par scripts/build.mjs : les parametres de l'abri.
window.SHED_PARAMS = {
  "_comment": "Source unique de verite du bureau de jardin. Toutes les cotes sont en centimetres sauf indication contraire. La page recalcule tout depuis ce fichier ; pour regenerer les artefacts versionnes : npm run build && npm run emit.",
  "projet": {
    "nom": "Abri de jardin - panneaux sandwich",
    "description": "Petit abri/bureau de jardin rectangulaire (4 faces) en panneaux sandwich 60 mm autoportants, toit mono-pente, porte vitree + fenetre, sur dalle beton existante.",
    "auteur": "Remi Vion",
    "depot_url": "https://github.com/rvion/screenplay"
  },
  "abri": {
    "_comment": "Textes de l'abri (page d'accueil et abri.md). Les {champs} sont remplaces par des valeurs calculees ; aucune cote n'est saisie ici.",
    "titre": "Abri de jardin : le bureau à cinq murs",
    "dossier": {
      "atouts": [
        "**Cinq murs, aucun angle aigu.** Deux angles de 135° identiques, un seul mur en biais ({pan_cm} cm) : profils d'angle standard pliés, pas de recoupe de panneau dans les angles.",
        "**{murs_m2} m² de murs, au seuil.** Aucune formalité en mairie (sous 5 m²), {interieur_m2} m² à l'intérieur, {sol_libre_m2} m² de sol libre hors bureaux.",
        "**Façade de niveau à {hauteur_facade_cm} cm, toit vers le fond.** La gouttière ({gouttiere_cm} cm) est derrière l'abri, invisible du jardin ; la façade ne porte que deux fenêtres.",
        "**Porte pleine sur le côté.** Les voisins de l'étage voient la façade, jamais l'intérieur. La lumière entre par les deux fenêtres de façade : écrans sur le bureau gauche, lumière de côté.",
        "**Passage derrière de {passage_cm} cm.** {arriere_m2} m² de dalle cachés derrière le mur du fond pour les outils de jardin : pas de second abri.",
        "**Peu de coupes.** Deux panneaux de toit entiers, une seule bande recoupée par mur long, les trois autres murs en panneaux entiers.",
        "**Bureau en L** sur tout le mur gauche et toute la façade, un fauteuil, un tabouret, et un lit rabattable contre le fond."
      ],
      "limites": [
        "**Portée du toit {portee_m} m.** À la limite pour des panneaux de 60 mm : sans panne, le fabricant doit confirmer qu'il la porte seul (question Q2).",
        "**Pente {pente_pourcent} %.** Faible pour une toiture en panneaux ; le fabricant doit la confirmer pour des panneaux d'une seule longueur, sans recouvrement.",
        "**La descente est {descente}.** Un tuyau au sol le long du mur droit ramène l'eau au jardin : rien ne doit s'écouler au pied du mur de propriété.",
        "**Aucun débord au-dessus de la porte.** Prévoir une petite marquise.",
        "**Deux profils d'angle à 135°** à faire plier sur mesure, en même temps que les panneaux.",
        "**Un mur à {gauche_cm} cm du grillage** : le mur gauche se monte à plat puis se lève, et le vide se ferme par une bavette, pas par une visseuse."
      ],
      "questions": [
        "La pente de {pente_pourcent} % est-elle admise par le fabricant des panneaux de toit, pour {portee_m} m de portée en 60 mm ?",
        "Le panneau de toit de 60 mm porte-t-il {portee_m} m seul, ou faut-il une panne en travers à mi-profondeur ?",
        "Madrier de rehausse : 75 × 225 en classe 2 protégé par la bavette, ou 70 × 220 en classe 4 ?",
        "Quelle est la hauteur réelle du mur du fond (grand pan), que le débord arrière doit dégager ?",
        "Où va l'eau de la descente : au jardin, ou dans un récupérateur au bout du mur droit ?"
      ],
      "idees": [
        "**Fixation visible derrière.** Le mur du fond et le pan à 45° ne se voient que depuis le passage : les commander en fixation visible, et garder la fixation cachée pour la façade, le mur droit et le mur gauche.",
        "**Angles à 135° sans pliage sur mesure.** Une cornière alu pliée à la main sur un tasseau, ou deux profils plats à recouvrement avec mastic, ou un tasseau bois intérieur plus une bavette extérieure : le seul article sans prix public disparaît.",
        "**Porte sans cadre bois.** Le dormant du bloc-porte vissé dans le rail en bas, dans la rehausse en haut, et dans la tranche des panneaux par un profil en U : le cadre 50 × 60, ses coupes et son calage disparaissent.",
        "**Toit en 80 ou 100 mm.** Un panneau plus épais porte {portee_m} m sans panne : une pièce, deux sabots et une étape de moins, contre un panneau un peu plus cher.",
        "**Plancher flottant.** L'isolant rigide posé sur le film, l'OSB rainuré directement dessus, collé aux rainures : sans lambourdes, sans vis dans la dalle, 45 mm au lieu de 60.",
        "**Chaîne de pluie.** Au bout de la gouttière, une chaîne dans un bac ou un tonneau au coin, plutôt qu'un tuyau au sol jusqu'au jardin : rien à ramener, de l'eau pour le jardin.",
        "**Rehausse plus basse.** Si le fabricant admet 5 %, un madrier 75 × 150 (chute 15 cm) : bois courant, façade à 230, moins de prise au vent, une pente encore au-dessus du minimum.",
        "**Rail de pied simplifié.** Une cornière alu de 40 vissée sur la bande d'arase, dedans et dehors, plutôt qu'un profil en U introuvable au détail : deux longueurs de stock, le même mastic.",
        "**Électricité sous les bureaux.** Une seule goulotte sous le plateau du bureau gauche et de la façade, prises fixées dessous : rien de visible sur les murs, un seul parcours depuis le câble."
      ]
    }
  },
  "dalle_cm": {
    "_comment": "Dalle REELLE deja coulee, relevee au metre : pentagone a pointe arriere. 5 longueurs : avant, droite, gauche, puis les deux pans arriere qui se rejoignent en pointe (arriere_gauche part du haut du cote gauche, arriere_droite arrive en haut du cote droit). La pointe est calculee par triangulation (~73 ; 398), angles avant supposes droits. Mesure de controle : 260 de large a hauteur du coin droit. murs_mitoyens = cotes longes par le mur de propriete (infranchissables) : gauche et les deux pans arriere ; l'avant et la droite donnent sur le jardin. mur_hauteur_cm / mur_epaisseur_cm : HYPOTHESES pour le dessin 3D, a mesurer. decalage_cm = position du coin avant-gauche de l'abri par rapport au coin avant-gauche de la dalle : l'abri LONGE le mur gauche (2 cm), 2 cm devant, pour garder une bande de passage le long du pan de 258 jusqu'a l'arriere de l'abri. passage_souhaite_cm = largeur de bande visee : le site en deduit la profondeur maximale de l'abri. Tout est reglable sur le site (groupe Dalle).",
    "avant": 262,
    "droite": 223,
    "gauche": 324,
    "arriere_gauche": 104,
    "arriere_droite": 258,
    "murs_mitoyens": [
      "gauche",
      "arriere_gauche",
      "arriere_droite"
    ],
    "grillages": [
      "gauche",
      "arriere_gauche"
    ],
    "palissades": [
      "arriere_droite"
    ],
    "palissade_epaisseur_cm": 4,
    "palissade_travee_cm": 180,
    "_grillages_comment": "Parmi murs_mitoyens, les cotes fermes par un grillage metallique et non par un mur : le cote gauche et le petit pan de 104. Seul le grand pan de 258 est un mur. Meme limite infranchissable ; dessin different (pointille vert sur les plans, poteaux et treillis en 3D). grillage_hauteur_cm = hauteur du grillage (environ 1 m, mesure de Remi). palissades = cotes fermes par une palissade en bois (planches a sommet bombe entre deux poteaux, travees de palissade_travee_cm, epaisseur palissade_epaisseur_cm) : le grand pan de 258 ; mur_hauteur_cm est sa hauteur (hypothese).",
    "mur_hauteur_cm": 180,
    "grillage_hauteur_cm": 100,
    "mur_epaisseur_cm": 15,
    "passage_souhaite_cm": 50,
    "bandes_libres_cm": {
      "_comment": "Bande reservee (laissee libre) le long de chaque cote de la dalle, vers l'interieur. Ce qui reste au centre = zone utile (plan-dalle-bandes.svg).",
      "avant": 10,
      "droite": 5,
      "arriere_droite": 45,
      "arriere_gauche": 12,
      "gauche": 10
    }
  },
  "disposition_trapeze": {
    "_comment": "Amenagement de l'option 13 (trapeze, passage vise derriere) : mur droit recule jusqu'a interieur_vise_m2, porte de porte_largeur_cm (ouverture) sur le cote droit, entouree d'un chambranle de porte_chambranle_cm, le cadre a porte_marge_cm des faces interieures des murs voisins et sous le haut du mur (hauteur de passage = hauteur du mur - marge - chambranle), bureau en L le long de tout le mur gauche et de toute la facade, facade = fenetres seulement ; sieges = emprise au sol posee contre le bord interieur d'un bureau (contre), sur la plus longue partie libre de ce bord (position = centre|debut|fin ou decalage en cm) ; lit_pliant = lit rabattable facon couchette de bateau : contre = mur ou il est fixe (plaque contre sa face interieure, replie a plat sur epaisseur_replie_cm, deux fixations ; rien sur la facade), emprise depliee placee automatiquement hors d'une zone d'acces devant la porte (acces_porte_cm) et hors des bureaux, sauf si sous_bureau (lit plus bas que le plateau : son pied peut glisser dessous quand le sol libre ne suffit pas ; sur le sol libre seul, 65 de large tient jusqu'a ~165 de long) (une par module de panneau, centree, jamais sur un joint ; allege au-dessus du bureau). position = gauche|centre|droite le long du cote (droite = vers le fond) ou distance en cm depuis le debut du cote.",
    "interieur_vise_m2": 4.8,
    "porte_cote": "droite",
    "porte_position": "droite",
    "porte_largeur_cm": 75,
    "porte_chambranle_cm": 5,
    "porte_marge_cm": 5,
    "toit": {
      "sens": "arriere",
      "chute_cm": 22.5,
      "debord_cm": {
        "avant": 5,
        "arriere": 5,
        "cotes": 0,
        "gauche": 0,
        "droite": 0
      },
      "descente": "droite",
      "panne_intermediaire": false
    },
    "rehausse_section_mm": [
      75,
      225
    ],
    "bureaux": [
      {
        "cote": "gauche",
        "profondeur_cm": 80
      },
      {
        "cote": "avant",
        "profondeur_cm": 50
      }
    ],
    "lit_pliant": {
      "largeur_cm": 70,
      "longueur_cm": 190,
      "contre": "",
      "epaisseur_replie_cm": 10,
      "acces_porte_cm": 0,
      "sous_bureau": true,
      "pied_sous": "avant",
      "pres_de": "droite",
      "_comment": "lit pliant libre : le pied passe sous le bureau de facade (jusqu'a sa profondeur), le lit longe le mur droit, pres de la porte (elle ouvre dehors, aucun degagement)"
    },
    "sieges": [
      {
        "type": "fauteuil de bureau",
        "largeur_cm": 70,
        "profondeur_cm": 70,
        "contre": "gauche",
        "position": "centre"
      },
      {
        "type": "tabouret",
        "largeur_cm": 30,
        "profondeur_cm": 30,
        "contre": "avant",
        "position": "centre"
      }
    ],
    "fenetres": [
      {
        "cote": "avant",
        "largeur_cm": 80,
        "hauteur_cm": 75,
        "allege_cm": 110,
        "position": 10,
        "ouvrant": true
      },
      {
        "cote": "avant",
        "largeur_cm": 80,
        "hauteur_cm": 75,
        "allege_cm": 110,
        "position": 110,
        "ouvrant": true
      }
    ],
    "cotes_cm": {
      "avant": 210,
      "droite": 175,
      "gauche": 245,
      "fond": 140
    },
    "porte_vitree": false,
    "lit_pliant_2": {
      "pied_sous": "",
      "pres_de": "fond en biais",
      "parallele_a": "fond en biais",
      "sieges_ranges": true,
      "_comment": "seconde position, en biais au fond : le lit est parallele au pan a 45 degres et au plus pres de lui ; les sieges sont ranges (leur gene ne compte pas), le fauteuil pousse vers le bureau de facade"
    },
    "panneaux_depuis_la_fin": [
      "droite"
    ],
    "lits_muraux": [
      {
        "nom": "v3",
        "contre": "avant",
        "largeur_cm": 80,
        "longueur_cm": 190,
        "tete": "droite",
        "bureaux": [
          "gauche"
        ],
        "position": "fin",
        "bureaux_entiers": true
      }
    ],
    "_comment_lits_muraux": "lits poses a demeure contre le mur `contre`, cales au debut de ce mur (position 'fin' = a l'autre bout) ; tete = cote de l'oreiller (gauche | droite | fond) ; bureaux = ceux qui restent, reduits au plus grand morceau hors du lit, sauf bureaux_entiers : le plateau (72 cm) passe AU-DESSUS du pied du lit (55 cm) et reste entier ; les sieges sont ranges dessous, jamais sur le lit. v3 : lit 80 x 190 le long de la facade (198 dedans), tete a droite contre le mur de la porte, pieds vers le bureau gauche et ses ecrans, le pied du lit sous le plateau de 80"
  },
  "formes_etudiees": [
    {
      "type": "commerce",
      "nom": "Everbox 2 × 2 m",
      "cotes_cm": [
        200,
        200
      ],
      "note": "bureau de jardin du commerce, livré en kit ; prix et délai à relever chez le fabricant",
      "url": ""
    },
    {
      "type": "archive",
      "nom": "Carré 2 × 2 m",
      "plan": "assets/etudes/formes/carre.svg",
      "chiffres": "4 murs · 4 m² de murs · 3,53 m² int.",
      "href": "docs/etudes/variantes.html#option-1",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 498 688\" width=\"498\" height=\"688\" font-family=\"system-ui,sans-serif\" font-size=\"13\">\n<defs><pattern id=\"bande\" width=\"7\" height=\"7\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><rect width=\"7\" height=\"7\" fill=\"#f3e3cf\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"7\" stroke=\"#e0b98a\" stroke-width=\"2\"/></pattern></defs>\n<polygon points=\"85.0,537.9 412.5,537.9 412.5,259.1 175.9,40.0 85.0,132.9\" fill=\"url(#bande)\" stroke=\"#6f675a\" stroke-width=\"2\"/>\n<polygon points=\"100.0,531.6 406.2,531.6 406.2,330.0 147.6,90.4 100.0,139.0\" fill=\"#e3efe0\" stroke=\"#2a8a4a\" stroke-width=\"1.8\" stroke-dasharray=\"5 4\"/>\n<line x1=\"85.0\" y1=\"545.9\" x2=\"85.0\" y2=\"572.9\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"412.5\" y1=\"545.9\" x2=\"412.5\" y2=\"572.9\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"85.0\" y1=\"567.9\" x2=\"412.5\" y2=\"567.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"81.0\" y1=\"571.9\" x2=\"89.0\" y2=\"563.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"408.5\" y1=\"571.9\" x2=\"416.5\" y2=\"563.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<text x=\"248.8\" y=\"575.9\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(0.0 248.8 575.9)\">262 cm</text>\n<line x1=\"420.5\" y1=\"537.9\" x2=\"447.5\" y2=\"537.9\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"420.5\" y1=\"259.1\" x2=\"447.5\" y2=\"259.1\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"442.5\" y1=\"537.9\" x2=\"442.5\" y2=\"259.1\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"446.5\" y1=\"541.9\" x2=\"438.5\" y2=\"533.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"446.5\" y1=\"263.1\" x2=\"438.5\" y2=\"255.1\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<text x=\"450.5\" y=\"398.5\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(-90.0 450.5 398.5)\">223 cm</text>\n<line x1=\"415.2\" y1=\"256.2\" x2=\"178.6\" y2=\"37.1\" stroke=\"#5b4a3a\" stroke-width=\"6\"/>\n<line x1=\"417.9\" y1=\"253.3\" x2=\"436.3\" y2=\"233.4\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"181.3\" y1=\"34.1\" x2=\"199.7\" y2=\"14.3\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"432.9\" y1=\"237.1\" x2=\"196.3\" y2=\"18.0\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"438.5\" y1=\"236.9\" x2=\"427.2\" y2=\"237.3\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"201.9\" y1=\"17.8\" x2=\"190.6\" y2=\"18.2\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<text x=\"320.0\" y=\"121.7\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(42.8 320.0 121.7)\">258 cm · mur</text>\n<line x1=\"173.7\" y1=\"37.9\" x2=\"82.9\" y2=\"130.8\" stroke=\"#5f8a4a\" stroke-width=\"3\" stroke-dasharray=\"7 4\"/>\n<line x1=\"170.2\" y1=\"34.4\" x2=\"150.9\" y2=\"15.5\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"79.3\" y1=\"127.3\" x2=\"60.0\" y2=\"108.4\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"154.4\" y1=\"19.0\" x2=\"63.6\" y2=\"111.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"154.4\" y1=\"13.4\" x2=\"154.5\" y2=\"24.7\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"63.5\" y1=\"106.2\" x2=\"63.6\" y2=\"117.6\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<text x=\"103.3\" y=\"59.9\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(-45.6 103.3 59.9)\">104 cm · mur</text>\n<line x1=\"82.0\" y1=\"132.9\" x2=\"82.0\" y2=\"537.9\" stroke=\"#5f8a4a\" stroke-width=\"3\" stroke-dasharray=\"7 4\"/>\n<line x1=\"77.0\" y1=\"132.9\" x2=\"50.0\" y2=\"132.9\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"77.0\" y1=\"537.9\" x2=\"50.0\" y2=\"537.9\" stroke=\"#999\" stroke-width=\"0.8\"/>\n<line x1=\"55.0\" y1=\"132.9\" x2=\"55.0\" y2=\"537.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"51.0\" y1=\"128.9\" x2=\"59.0\" y2=\"136.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<line x1=\"51.0\" y1=\"533.9\" x2=\"59.0\" y2=\"541.9\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<text x=\"47.0\" y=\"335.4\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(90.0 47.0 335.4)\">324 cm · mur</text>\n<polyline points=\"396.4,244.2 394.4,246.7 392.8,249.4 391.6,252.4 390.8,255.5 390.5,258.6 390.7,261.8 391.3,264.9 392.3,267.9 393.8,270.8 395.7,273.3 397.9,275.6 400.5,277.5 403.2,279.1 406.2,280.2 409.3,280.9 412.5,281.1\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.5\"/>\n<text x=\"372.2\" y=\"280.7\" text-anchor=\"middle\" fill=\"#b0452a\" font-size=\"12\" font-weight=\"bold\">132.8°</text>\n<polyline points=\"160.5,55.7 162.1,57.2 163.9,58.5 165.8,59.6 167.8,60.5 169.9,61.2 172.0,61.7 174.2,61.9 176.4,62.0 178.6,61.8 180.8,61.4 182.9,60.9 184.9,60.0 186.9,59.0 188.7,57.8 190.5,56.5 192.0,54.9\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.5\"/>\n<text x=\"177.0\" y=\"88.0\" text-anchor=\"middle\" fill=\"#b0452a\" font-size=\"12\" font-weight=\"bold\">91.6°</text>\n<polyline points=\"85.0,154.9 88.2,154.6 91.4,153.9 94.4,152.7 97.3,151.1 99.8,149.1 102.1,146.8 103.9,144.1 105.4,141.2 106.4,138.1 106.9,134.9 107.0,131.6 106.5,128.4 105.7,125.3 104.3,122.3 102.5,119.6 100.4,117.2\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.5\"/>\n<text x=\"125.7\" y=\"153.5\" text-anchor=\"middle\" fill=\"#b0452a\" font-size=\"12\" font-weight=\"bold\">135.6°</text>\n<polygon points=\"100.0,531.6 350.0,531.6 350.0,281.6 100.0,281.6\" fill=\"#cfe0f1\" stroke=\"#2b5d8a\" stroke-width=\"2.5\"/>\n<text x=\"225.0\" y=\"517.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(0.0 225.0 517.6)\">200</text>\n<text x=\"336.0\" y=\"406.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(-90.0 336.0 406.6)\">200</text>\n<text x=\"225.0\" y=\"295.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(0.0 225.0 295.6)\">200</text>\n<text x=\"114.0\" y=\"406.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"13\" font-weight=\"bold\" transform=\"rotate(90.0 114.0 406.6)\">200</text>\n<polyline points=\"116.0,531.6 115.9,529.5 115.5,527.5 114.8,525.5 113.9,523.6 112.7,521.9 111.3,520.3 109.7,518.9 108.0,517.8 106.1,516.8 104.1,516.2 102.1,515.8 100.0,515.6\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.2\"/>\n<polyline points=\"350.0,515.6 347.9,515.8 345.9,516.2 343.9,516.8 342.0,517.8 340.3,518.9 338.7,520.3 337.3,521.9 336.1,523.6 335.2,525.5 334.5,527.5 334.1,529.5 334.0,531.6\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.2\"/>\n<polyline points=\"334.0,281.6 334.1,283.7 334.5,285.8 335.2,287.7 336.1,289.6 337.3,291.4 338.7,292.9 340.3,294.3 342.0,295.5 343.9,296.4 345.9,297.1 347.9,297.5 350.0,297.6\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.2\"/>\n<polyline points=\"100.0,297.6 102.1,297.5 104.1,297.1 106.1,296.4 108.0,295.5 109.7,294.3 111.3,292.9 112.7,291.4 113.9,289.6 114.8,287.7 115.5,285.8 115.9,283.7 116.0,281.6\" fill=\"none\" stroke=\"#b0452a\" stroke-width=\"1.2\"/>\n<line x1=\"225.0\" y1=\"531.6\" x2=\"350.0\" y2=\"531.6\" stroke=\"#c0392b\" stroke-width=\"5\"/>\n<line x1=\"350.0\" y1=\"531.6\" x2=\"350.0\" y2=\"656.6\" stroke=\"#c0392b\" stroke-width=\"2\"/>\n<polyline points=\"225.0,531.6 225.6,543.9 227.4,556.0 230.4,567.9 234.5,579.5 239.8,590.5 246.1,601.1 253.4,610.9 261.6,620.0 270.7,628.3 280.6,635.6 291.1,641.9 302.2,647.1 313.7,651.2 325.6,654.2 337.7,656.0 350.0,656.6\" fill=\"none\" stroke=\"#c0392b\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/>\n<text x=\"287.5\" y=\"549.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#c0392b\" font-size=\"11\" font-weight=\"bold\">porte 100</text>\n<line x1=\"350.0\" y1=\"281.6\" x2=\"390.1\" y2=\"238.4\" stroke=\"#c77d0a\" stroke-width=\"2.5\"/>\n<circle cx=\"350.0\" cy=\"281.6\" r=\"3\" fill=\"#c77d0a\"/>\n<text x=\"376.7\" y=\"266.1\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#c77d0a\" font-size=\"11\" font-weight=\"bold\" transform=\"rotate(-47.1 376.7 266.1)\">47.2</text>\n<line x1=\"100.0\" y1=\"281.6\" x2=\"85.0\" y2=\"132.9\" stroke=\"#2a8a4a\" stroke-width=\"2.5\"/>\n<circle cx=\"100.0\" cy=\"281.6\" r=\"3\" fill=\"#2a8a4a\"/>\n<text x=\"83.5\" y=\"208.2\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2a8a4a\" font-size=\"11\" font-weight=\"bold\" transform=\"rotate(84.2 83.5 208.2)\">119.6</text>\n<text x=\"225.0\" y=\"406.6\" text-anchor=\"middle\" fill=\"#2b5d8a\" font-size=\"22\" font-weight=\"bold\">4 m²</text>\n<text x=\"225.0\" y=\"424.6\" text-anchor=\"middle\" fill=\"#2b5d8a\" font-size=\"12\" font-weight=\"normal\">intérieur 3.53 m²</text>\n<text x=\"248.8\" y=\"661.9\" text-anchor=\"middle\" fill=\"#666\" font-size=\"11\" font-weight=\"normal\">AVANT (jardin) · brun = palissade bois, vert pointillé = grillage</text>\n<text x=\"248.8\" y=\"675.9\" text-anchor=\"middle\" fill=\"#666\" font-size=\"11\" font-weight=\"normal\">vert pointillé = zone utile · trait coloré = passage (cm)</text>\n</svg>\n"
    },
    {
      "type": "archive",
      "nom": "Rectangle 200 × 240",
      "plan": "assets/etudes/formes/rectangle.svg",
      "chiffres": "4 murs · 4,8 m² de murs · 4,29 m² int. · étude initiale, figée",
      "href": "",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 328 347\" width=\"328\" height=\"347\" font-family=\"system-ui,sans-serif\" font-size=\"13\">\n<polygon points=\"109.2,257.3 219.3,257.3 219.3,163.6 139.8,90.0 109.2,121.2\" fill=\"#eeeae0\" stroke=\"#a89f8a\" stroke-width=\"1.5\" stroke-dasharray=\"6 4\"/>\n<polygon points=\"110.1,256.4 194.1,256.4 194.1,155.6 110.1,155.6\" fill=\"#dce8f5\" stroke=\"#2b5d8a\" stroke-width=\"2\"/>\n<line x1=\"221.0\" y1=\"161.8\" x2=\"141.5\" y2=\"88.2\" stroke=\"#5b4a3a\" stroke-width=\"5\"/>\n<line x1=\"138.0\" y1=\"88.3\" x2=\"107.4\" y2=\"119.5\" stroke=\"#5b4a3a\" stroke-width=\"5\"/>\n<line x1=\"106.7\" y1=\"121.2\" x2=\"106.7\" y2=\"257.3\" stroke=\"#5b4a3a\" stroke-width=\"5\"/>\n<line x1=\"194.1\" y1=\"155.6\" x2=\"201.7\" y2=\"147.4\" stroke=\"#c0392b\" stroke-width=\"2.5\"/>\n<text x=\"209.7\" y=\"141.4\" text-anchor=\"start\" fill=\"#c0392b\" font-size=\"11\" font-weight=\"bold\">passage 27 cm</text>\n<text x=\"122.4\" y=\"295.3\" text-anchor=\"middle\" fill=\"#8a8170\" font-size=\"10\" font-weight=\"normal\">dalle 262</text>\n<text x=\"231.3\" y=\"237.9\" text-anchor=\"start\" fill=\"#8a8170\" font-size=\"10\" font-weight=\"normal\">dalle 223</text>\n<text x=\"187.7\" y=\"122.0\" text-anchor=\"start\" fill=\"#8a8170\" font-size=\"10\" font-weight=\"normal\">dalle 258</text>\n<text x=\"115.9\" y=\"101.2\" text-anchor=\"end\" fill=\"#8a8170\" font-size=\"10\" font-weight=\"normal\">dalle 104</text>\n<text x=\"97.2\" y=\"136.1\" text-anchor=\"end\" fill=\"#8a8170\" font-size=\"10\" font-weight=\"normal\">dalle 324</text>\n<text x=\"152.1\" y=\"274.4\" text-anchor=\"middle\" fill=\"#2b5d8a\" font-size=\"14\" font-weight=\"bold\">A = 200 cm</text>\n<text x=\"202.1\" y=\"210.0\" text-anchor=\"start\" fill=\"#2b5d8a\" font-size=\"14\" font-weight=\"bold\">D = 240 cm</text>\n<text x=\"152.1\" y=\"147.6\" text-anchor=\"middle\" fill=\"#2b5d8a\" font-size=\"14\" font-weight=\"bold\">B = 200 cm</text>\n<text x=\"102.1\" y=\"210.0\" text-anchor=\"end\" fill=\"#2b5d8a\" font-size=\"14\" font-weight=\"bold\">G = 240 cm</text>\n<line x1=\"152.1\" y1=\"256.4\" x2=\"194.1\" y2=\"256.4\" stroke=\"#c0392b\" stroke-width=\"5\"/>\n<line x1=\"152.1\" y1=\"256.4\" x2=\"152.1\" y2=\"298.4\" stroke=\"#c0392b\" stroke-width=\"2\"/>\n<path d=\"M 194.1 256.4 A 42.0 42.0 0 0 1 152.1 298.4\" fill=\"none\" stroke=\"#c0392b\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/>\n<text x=\"173.1\" y=\"312.4\" text-anchor=\"middle\" fill=\"#c0392b\" font-size=\"11\" font-weight=\"normal\">porte 100 (ouvre dehors)</text>\n<line x1=\"194.1\" y1=\"210.2\" x2=\"194.1\" y2=\"176.6\" stroke=\"#1b9aa8\" stroke-width=\"5\"/>\n<text x=\"210.1\" y=\"197.4\" text-anchor=\"middle\" fill=\"#137\" font-size=\"10\" font-weight=\"normal\">fen. 80</text>\n<line x1=\"110.1\" y1=\"201.8\" x2=\"110.1\" y2=\"235.4\" stroke=\"#1b9aa8\" stroke-width=\"5\"/>\n<text x=\"94.1\" y=\"222.6\" text-anchor=\"middle\" fill=\"#137\" font-size=\"10\" font-weight=\"normal\">fen. 80</text>\n<text x=\"164.2\" y=\"333.3\" text-anchor=\"middle\" fill=\"#666\" font-size=\"12\" font-weight=\"normal\">AVANT (face A)</text>\n</svg>\n"
    },
    {
      "type": "archive",
      "nom": "Trapèze",
      "plan": "assets/etudes/formes/trapeze.svg",
      "chiffres": "4 murs · 5,37 m² de murs · 4,81 m² int. · passage 51 cm · 3 680 €",
      "href": "docs/etudes/abri-v1.html",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 565 719\" width=\"565\" height=\"719\" font-family=\"system-ui,sans-serif\" font-size=\"13\">\n<polygon points=\"108.0,610.6 456.8,610.6 456.8,324.5 108.0,108.0\" fill=\"#8fa3b8\" stroke=\"#2b5d8a\" stroke-width=\"1.5\"/>\n<polygon points=\"117.6,601.0 447.2,601.0 447.2,329.8 117.6,125.3\" fill=\"#fbfbf8\" stroke=\"#2b5d8a\" stroke-width=\"1.2\"/>\n<polygon points=\"117.6,601.0 213.6,601.0 213.6,184.8 117.6,125.3\" fill=\"#e6c79c\" stroke=\"#9a7040\" stroke-width=\"1\"/>\n<text x=\"165.6\" y=\"378.0\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#7a5530\" font-size=\"12\" font-weight=\"bold\" transform=\"rotate(-90 165.6 378.0)\">bureau 60 × 297.3</text>\n<polygon points=\"117.6,601.0 447.2,601.0 447.2,521.0 117.6,521.0\" fill=\"#e6c79c\" stroke=\"#9a7040\" stroke-width=\"1\"/>\n<text x=\"282.4\" y=\"561.0\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#7a5530\" font-size=\"12\" font-weight=\"bold\">bureau 50 × 206</text>\n<polygon points=\"213.6,332.0 213.6,444.0 325.6,444.0 325.6,332.0\" fill=\"#dcdce6\" stroke=\"#55556a\" stroke-width=\"1.2\"/>\n<text x=\"269.6\" y=\"384.0\" text-anchor=\"middle\" fill=\"#44445a\" font-size=\"10\" font-weight=\"bold\">fauteuil de bureau</text>\n<text x=\"269.6\" y=\"398.0\" text-anchor=\"middle\" fill=\"#44445a\" font-size=\"9\" font-weight=\"normal\">70 × 70</text>\n<polygon points=\"306.4,521.0 354.4,521.0 354.4,473.0 306.4,473.0\" fill=\"#dcdce6\" stroke=\"#55556a\" stroke-width=\"1.2\"/>\n<text x=\"330.4\" y=\"500.0\" text-anchor=\"middle\" fill=\"#44445a\" font-size=\"8\" font-weight=\"bold\">tab.</text>\n<polygon points=\"446.2,329.3 188.0,169.0 179.5,182.6 437.9,342.9\" fill=\"#d9c8ec\" stroke=\"#6a3d9a\" stroke-width=\"1.5\"/>\n<rect x=\"422.9\" y=\"313.6\" width=\"6\" height=\"6\" fill=\"#6a3d9a\"/>\n<rect x=\"205.3\" y=\"178.6\" width=\"6\" height=\"6\" fill=\"#6a3d9a\"/>\n<polygon points=\"446.2,329.3 188.0,169.0 129.0,264.2 387.2,424.5\" fill=\"none\" stroke=\"#6a3d9a\" stroke-width=\"1.8\" stroke-dasharray=\"7 4\"/>\n<text x=\"385.7\" y=\"355.6\" text-anchor=\"middle\" fill=\"#6a3d9a\" font-size=\"10\" font-weight=\"bold\">lit rabattable 70 × 190</text>\n<text x=\"385.7\" y=\"368.6\" text-anchor=\"middle\" fill=\"#6a3d9a\" font-size=\"9\" font-weight=\"normal\">pied sous le bureau</text>\n<polygon points=\"268.0,610.6 428.0,610.6 428.0,601.0 268.0,601.0\" fill=\"#bfe3ef\" stroke=\"#1b9aa8\" stroke-width=\"1.5\"/>\n<line x1=\"108.0\" y1=\"614.6\" x2=\"108.0\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"268.0\" y1=\"614.6\" x2=\"268.0\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"108.0\" y1=\"638.6\" x2=\"268.0\" y2=\"638.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"105.0\" y1=\"641.6\" x2=\"111.0\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"265.0\" y1=\"641.6\" x2=\"271.0\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"188.0\" y=\"646.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(0.0 188.0 646.6)\">100</text>\n<line x1=\"268.0\" y1=\"614.6\" x2=\"268.0\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"428.0\" y1=\"614.6\" x2=\"428.0\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"268.0\" y1=\"638.6\" x2=\"428.0\" y2=\"638.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"265.0\" y1=\"641.6\" x2=\"271.0\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"425.0\" y1=\"641.6\" x2=\"431.0\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"348.0\" y=\"646.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(0.0 348.0 646.6)\">100</text>\n<line x1=\"428.0\" y1=\"614.6\" x2=\"428.0\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"456.8\" y1=\"614.6\" x2=\"456.8\" y2=\"642.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"428.0\" y1=\"638.6\" x2=\"456.8\" y2=\"638.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"425.0\" y1=\"641.6\" x2=\"431.0\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"453.8\" y1=\"641.6\" x2=\"459.8\" y2=\"635.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"442.4\" y=\"646.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(0.0 442.4 646.6)\">18</text>\n<line x1=\"108.0\" y1=\"614.6\" x2=\"108.0\" y2=\"672.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"456.8\" y1=\"614.6\" x2=\"456.8\" y2=\"672.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"108.0\" y1=\"668.6\" x2=\"456.8\" y2=\"668.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"105.0\" y1=\"671.6\" x2=\"111.0\" y2=\"665.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"453.8\" y1=\"671.6\" x2=\"459.8\" y2=\"665.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<text x=\"282.4\" y=\"676.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"12\" font-weight=\"bold\" transform=\"rotate(0.0 282.4 676.6)\">A · 218</text>\n<polygon points=\"456.8,457.8 456.8,449.8 447.2,449.8 447.2,457.8\" fill=\"#b98a55\" stroke=\"#7a5530\" stroke-width=\"1\"/>\n<polygon points=\"456.8,345.8 456.8,337.8 447.2,337.8 447.2,345.8\" fill=\"#b98a55\" stroke=\"#7a5530\" stroke-width=\"1\"/>\n<polygon points=\"456.8,449.8 456.8,345.8 447.2,345.8 447.2,449.8\" fill=\"#fbfbf8\" stroke=\"#c0392b\" stroke-width=\"1.5\"/>\n<line x1=\"456.8\" y1=\"345.8\" x2=\"560.8\" y2=\"345.8\" stroke=\"#c0392b\" stroke-width=\"2\"/>\n<polyline points=\"456.8,449.8 467.0,449.3 477.1,447.8 487.0,445.3 496.6,441.8 505.8,437.5 514.6,432.2 522.8,426.2 530.3,419.3 537.2,411.7 543.3,403.5 548.5,394.8 552.9,385.6 556.3,375.9 558.8,366.0 560.3,356.0 560.8,345.8\" fill=\"none\" stroke=\"#c0392b\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/>\n<line x1=\"460.8\" y1=\"610.6\" x2=\"488.8\" y2=\"610.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"457.8\" x2=\"488.8\" y2=\"457.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"484.8\" y1=\"610.6\" x2=\"484.8\" y2=\"457.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"613.6\" x2=\"481.8\" y2=\"607.6\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"460.8\" x2=\"481.8\" y2=\"454.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"492.8\" y=\"534.2\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(-90.0 492.8 534.2)\">95.5</text>\n<line x1=\"460.8\" y1=\"457.8\" x2=\"488.8\" y2=\"457.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"449.8\" x2=\"488.8\" y2=\"449.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"484.8\" y1=\"457.8\" x2=\"484.8\" y2=\"449.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"460.8\" x2=\"481.8\" y2=\"454.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"452.8\" x2=\"481.8\" y2=\"446.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"504.8\" y=\"453.8\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(-90.0 504.8 453.8)\">5</text>\n<line x1=\"460.8\" y1=\"449.8\" x2=\"488.8\" y2=\"449.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"345.8\" x2=\"488.8\" y2=\"345.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"484.8\" y1=\"449.8\" x2=\"484.8\" y2=\"345.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"452.8\" x2=\"481.8\" y2=\"446.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"348.8\" x2=\"481.8\" y2=\"342.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"492.8\" y=\"397.8\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(-90.0 492.8 397.8)\">65</text>\n<line x1=\"460.8\" y1=\"345.8\" x2=\"488.8\" y2=\"345.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"337.8\" x2=\"488.8\" y2=\"337.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"484.8\" y1=\"345.8\" x2=\"484.8\" y2=\"337.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"348.8\" x2=\"481.8\" y2=\"342.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"340.8\" x2=\"481.8\" y2=\"334.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"492.8\" y=\"341.8\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(-90.0 492.8 341.8)\">5</text>\n<line x1=\"460.8\" y1=\"337.8\" x2=\"488.8\" y2=\"337.8\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"324.5\" x2=\"488.8\" y2=\"324.5\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"484.8\" y1=\"337.8\" x2=\"484.8\" y2=\"324.5\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"340.8\" x2=\"481.8\" y2=\"334.8\" stroke=\"#666\" stroke-width=\"1\"/>\n<line x1=\"487.8\" y1=\"327.5\" x2=\"481.8\" y2=\"321.5\" stroke=\"#666\" stroke-width=\"1\"/>\n<text x=\"504.8\" y=\"331.1\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#666\" font-size=\"10\" font-weight=\"bold\" transform=\"rotate(-90.0 504.8 331.1)\">8.3</text>\n<line x1=\"460.8\" y1=\"610.6\" x2=\"518.8\" y2=\"610.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"460.8\" y1=\"324.5\" x2=\"518.8\" y2=\"324.5\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"514.8\" y1=\"610.6\" x2=\"514.8\" y2=\"324.5\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"517.8\" y1=\"613.6\" x2=\"511.8\" y2=\"607.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"517.8\" y1=\"327.5\" x2=\"511.8\" y2=\"321.5\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<text x=\"522.8\" y=\"467.5\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"12\" font-weight=\"bold\" transform=\"rotate(-90.0 522.8 467.5)\">D · 178.8</text>\n<line x1=\"458.9\" y1=\"321.1\" x2=\"474.7\" y2=\"295.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"110.1\" y1=\"104.6\" x2=\"125.9\" y2=\"79.1\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"472.6\" y1=\"299.0\" x2=\"123.8\" y2=\"82.5\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"476.8\" y1=\"298.0\" x2=\"468.5\" y2=\"300.0\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"128.0\" y1=\"81.5\" x2=\"119.7\" y2=\"83.5\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<text x=\"302.4\" y=\"184.0\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"12\" font-weight=\"bold\" transform=\"rotate(31.8 302.4 184.0)\">B · 256.6</text>\n<line x1=\"104.0\" y1=\"108.0\" x2=\"74.0\" y2=\"108.0\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"104.0\" y1=\"610.6\" x2=\"74.0\" y2=\"610.6\" stroke=\"#aaa\" stroke-width=\"0.7\"/>\n<line x1=\"78.0\" y1=\"108.0\" x2=\"78.0\" y2=\"610.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"75.0\" y1=\"105.0\" x2=\"81.0\" y2=\"111.0\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<line x1=\"75.0\" y1=\"607.6\" x2=\"81.0\" y2=\"613.6\" stroke=\"#2b5d8a\" stroke-width=\"1\"/>\n<text x=\"70.0\" y=\"359.3\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#2b5d8a\" font-size=\"12\" font-weight=\"bold\" transform=\"rotate(90.0 70.0 359.3)\">G · 314.1</text>\n<text x=\"216.5\" y=\"589.0\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#888\" font-size=\"10\" transform=\"rotate(0.0 216.5 589.0)\">int. 206</text>\n<text x=\"435.2\" y=\"519.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#888\" font-size=\"10\" transform=\"rotate(-90.0 435.2 519.6)\">int. 169.5</text>\n<text x=\"342.0\" y=\"278.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#888\" font-size=\"10\" transform=\"rotate(31.8 342.0 278.6)\">int. 242.4</text>\n<text x=\"129.6\" y=\"529.6\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"#888\" font-size=\"10\" transform=\"rotate(90.0 129.6 529.6)\">int. 297.3</text>\n<text x=\"282.4\" y=\"706.6\" text-anchor=\"middle\" fill=\"#666\" font-size=\"12\" font-weight=\"normal\">AVANT (jardin)</text>\n</svg>\n"
    }
  ],
  "_formes_etudiees_comment": "Section « Formes étudiées » de la page d'accueil : une carte par forme. commerce = produit du commerce (dessin d'un simple rectangle aux cotes donnees, note, url facultative) ; archive = une etude figee le 2026-09-22 : son plan (plan, un SVG de site/, que npm run emit recopie dans params.js), ses chiffres de ce jour et son document.",
  "reglementaire": {
    "seuil_sans_formalite_m2": 5,
    "seuil_declaration_m2": 20,
    "debords_sur_poteaux": false,
    "reference": "Code de l'urbanisme R*420-1 : l'emprise au sol est la projection verticale du volume de la construction, MAIS les debords de toiture en sont exclus tant qu'ils ne sont PAS soutenus par des poteaux, piliers ou encorbellements. Seuils : R421-2 (dispense jusqu'a 5 m2 d'emprise au sol ET de surface de plancher), R421-9 (declaration prealable de 5 a 20 m2), au-dela permis de construire. Surface de plancher : R111-22 (nu interieur, sous plafond >= 1,80 m).",
    "_comment": "Notre toit n'a aucun poteau : debords_sur_poteaux = false, donc l'emprise au sol = l'emprise des MURS, debords exclus. Mettre true si un poteau, un pilier ou un encorbellement vient un jour porter un debord : l'emprise au sol integrerait alors ce debord. Reserve : en secteur protege / abords de monument historique, une declaration prealable est due meme sous le seuil."
  },
  "panneau": {
    "epaisseur_mm": 60,
    "autoportant": true,
    "ame": "PIR (polyisocyanurate) - bon rapport isolation/epaisseur pour usage habitable",
    "largeur_utile_cm": 100,
    "orientation_murs": "verticale",
    "_comment": "60 mm = panneau autoportant (murs ET toit) : pas d'ossature secondaire, seulement un rail de pied et des profils d'angle. largeur_utile = largeur couverte apres recouvrement (souvent 1000 ou 1150 mm selon fabricant). Verifier la portee libre du toit (~2,8 m) dans le tableau du fabricant."
  },
  "murs": {
    "hauteur_cm": 215,
    "_comment": "Hauteur des panneaux muraux (coupes droites) = hauteur du point bas ; la rehausse bois donne la pente du toit."
  },
  "rehausse": {
    "section_mm": [
      75,
      225
    ],
    "longueur_stock_cm": 450,
    "_comment": "Madrier classe 4 de la rehausse (section par defaut si disposition_trapeze.rehausse_section_mm manque). Les madriers classe 4 se vendent en 4 m ou 4,5 m."
  },
  "porte": {
    "largeur_cm": 100,
    "hauteur_cm": 215,
    "position": "droite",
    "_comment": "Porte des formes 1 a 12 de etudes/variantes.md (cote avant) ; hauteur par defaut de la porte de l'abri quand disposition_trapeze n'en donne pas."
  },
  "amenagement": {
    "plancher": {
      "actif": true,
      "epaisseur_cm": 6,
      "prix_m2_eur": 45,
      "description": "plancher isole : lambourdes + 40 mm d'isolant + OSB + sol vinyle/parquet"
    }
  },
  "prix_materiaux_eur_ttc": {
    "_comment": "Prix des MATERIAUX, TTC, pour un particulier, en France, releves en septembre 2026. Ni main-d'oeuvre ni forfait ; la livraison est a part et hors total. Chaque article : pu (prix unitaire), unite, source (page ou le prix a ete lu), note, incertain (une seule source, ou prix deduit). Un article sans source, ou incertain, est marque 'prix a confirmer' sur le site et dans abri.md. Les quantites sont calculees par site/src/chantier.ts.",
    "incertitude_pct": 15,
    "panneau_mur_m2": {
      "pu": 44,
      "unite": "m²",
      "source": "https://www.panelsell.fr/articles-en-stock-panneaux-de-toiture-bardage/panneaux-sandwichs-bardage-fixation-cachee-60-mm-lw-70",
      "note": "fixation cachee PIR 60 mm : 37,80 EUR/m2 par paquet entier ; 40 a 50 EUR/m2 en petite quantite ou au detail (negoce). La plupart des vendeurs en ligne imposent 100 m2 ou un paquet de 12 panneaux de 6 m.",
      "incertain": true
    },
    "panneau_toit_m2": {
      "pu": 45,
      "unite": "m²",
      "source": "https://www.panelsell.fr/articles-en-stock-panneaux-de-toiture-bardage/panneaux-sandwich-toiture-60-mm-lw-128",
      "note": "35,40 EUR/m2 par paquet de 10 ; 34,20 chez toleacier.fr en longueurs de stock ; jusqu'a 71 EUR/m2 au detail en negoce (Ondatherm). Teinte claire RAL 9010 disponible sur commande.",
      "incertain": true
    },
    "madrier_ml": {
      "pu": 14.7,
      "unite": "ml",
      "source": "https://www.boidiscount.com/index.php?p=1_190_PRIX-BASTAINGS-MADRIERS-BOIS-D-OSSATURE.-TRAIT-AUTOCLAVE-CLASSE-4",
      "note": "classe 4 : la section en stock est 70 x 220 (58,80 EUR les 4 m, 66 EUR les 4,5 m). Le 75 x 225 n'existe en stock qu'en classe 2 (environ 10 EUR/m)."
    },
    "panne_ml": {
      "pu": 9,
      "unite": "ml",
      "source": "https://www.boidiscount.com/index.php?p=1_190_PRIX-BASTAINGS-MADRIERS-BOIS-D-OSSATURE.-TRAIT-AUTOCLAVE-CLASSE-4",
      "note": "68 x 145 classe 4 : 6,20 EUR/m ; 75 x 145 rabote : 17 EUR/m"
    },
    "chevron_cadre_ml": {
      "pu": 5,
      "unite": "ml",
      "note": "pas de prix releve"
    },
    "profil_pied_ml": {
      "pu": 12,
      "unite": "ml",
      "source": "https://www.panelsell.fr/accessoires-pour-panneaux-sandwichs",
      "note": "4,86 EUR HT la longueur de 0,5 m",
      "incertain": true
    },
    "angle_standard_ml": {
      "pu": 10,
      "unite": "ml",
      "source": "https://www.panelsell.fr/profiles-plies-pour-panneaux-sandwichs-sur-mesure/profile-d-angle-exterieur",
      "note": "7,92 EUR HT le metre, tole 0,75 mm"
    },
    "angle_sur_mesure_ml": {
      "pu": 15,
      "unite": "ml",
      "source": "https://www.panelsell.fr/profiles-plies-pour-panneaux-sandwichs-sur-mesure/profile-d-angle-exterieur",
      "note": "aucun prix public pour un pliage a 135 degres : estimation d'apres le profil standard, a faire chiffrer",
      "incertain": true
    },
    "bande_rive_ml": {
      "pu": 14,
      "unite": "ml",
      "source": "https://www.yousteel.fr/pliages-accessoires/180-bande-de-rive-universelle-2100m.html",
      "note": "12,90 EUR/m en longueurs de 2,1 m"
    },
    "bandeau_haut_ml": {
      "pu": 14,
      "unite": "ml",
      "source": "https://www.mastock.fr/toiture/846-1506-accessoires-tole-bac-acier.html",
      "note": "solin ou faitiere 2,10 m : 29 EUR"
    },
    "closoir_ml": {
      "pu": 3.5,
      "unite": "ml",
      "source": "https://www.leroymerlin.fr/produits/closoir-mousse-pour-plaque-acier-6-m-66887583.html",
      "note": "rouleau de 6 m de 11,90 a 21,90 EUR ; le profil doit correspondre aux nervures du panneau choisi",
      "incertain": true
    },
    "vis_toit_100": {
      "pu": 90,
      "unite": "cent",
      "source": "https://www.wovar.fr/vis-pour-panneaux-sandwich-inox/",
      "note": "inox 6,5 x 145 a rondelle EPDM : 89,99 EUR le cent. Longueur = panneau + nervure + 50 mm dans le bois."
    },
    "vis_couture_100": {
      "pu": 35,
      "unite": "cent",
      "source": "https://www.toletome.fr/les-produits-tole-to-me/accessoires-de-fixation/visserie/vis-de-couture-en-acier-(4-8-x-20).html",
      "note": "4,8 x 20 : de 24 a 45 EUR le cent"
    },
    "vis_mur_100": {
      "pu": 90,
      "unite": "cent",
      "source": "https://www.tolesmoinscheres.com/produit/100-fixations-pour-panneau-sandwich-de-bardage",
      "note": "vis 6,3 x 100 + rondelle + cache de couleur"
    },
    "cheville_beton_u": {
      "pu": 0.56,
      "unite": "u",
      "source": "https://www.toutbrico.com/goujons-d-ancrage/7242-boite-100-goujons-d-ancrage-8-x-80mm-zingue-batifix-3700013413404.html",
      "note": "goujons 8 x 80 : 55,90 EUR la boite de 100"
    },
    "bande_arase_ml": {
      "pu": 0.56,
      "unite": "ml",
      "source": "https://www.bricodepot.fr/catalogue/bande-darase-long-30-m-larg-30-cm-500-microns/prod59812/",
      "note": "rouleau de 30 m x 30 cm : 16,90 EUR"
    },
    "butyle_ml": {
      "pu": 1.5,
      "unite": "ml",
      "source": "https://tolganor.fr/produit/joint-butyl-pour-etancheite-rouleau-de-13-ml-etanco/",
      "note": "rouleau de 13 m : 19,66 EUR"
    },
    "mastic_cartouche": {
      "pu": 9,
      "unite": "cartouche",
      "source": "https://www.maxoutil.com/mastic-ms-polymere-parabond-600-dl-chemicals-cartouche-de-290-ml-40001000.html",
      "note": "MS polymere de 6,50 a 13 EUR ; Sikaflex 11FC environ 11,50 EUR"
    },
    "bande_comprimee_ml": {
      "pu": 7,
      "unite": "ml",
      "source": "https://www.pointp.fr/p/couverture/bande-mousse-impregnee-bitume-20x30-rouleau-de-5m-A3242825",
      "note": "rouleau de 5 m : 44 EUR en negoce, moins cher ailleurs",
      "incertain": true
    },
    "mousse_pu_u": {
      "pu": 9,
      "unite": "bombe",
      "source": "https://www.bricodepot.fr/produits/materiau-et-gros-oeuvre/isolation-et-cloison/etancheite/mousse-expansive",
      "note": "750 ml : de 7,90 a 9,90 EUR"
    },
    "porte_pleine_u": {
      "pu": 199,
      "unite": "u",
      "source": "https://www.bricodepot.fr/catalogue/bloc-porte-de-service-en-pvc-poussant-droit-h-205-x-l-80-cm/prod54514/",
      "note": "bloc-porte de service PVC plein avec dormant, serrure 5 points, Ud 1,6. Le 205 x 80 de stock coute 199 EUR ; en 75 de large il passe sur mesure (delai et prix a confirmer chez un menuisier, compter 300 a 450 EUR)",
      "incertain": true
    },
    "porte_vitree_u": {
      "pu": 900,
      "unite": "u",
      "note": "pas de prix releve (l'abri retenu a une porte pleine)"
    },
    "fenetre_fixe_u": {
      "pu": 165,
      "unite": "u",
      "source": "https://www.brico-fenetre.com/fr_FR/p/chassis-fixe-simple-pvc-gamme-confort",
      "note": "80 x 80 n'est pas une taille de stock : chassis fixe sur mesure, 4 a 5 semaines",
      "incertain": true
    },
    "fenetre_ob_u": {
      "pu": 119,
      "unite": "u",
      "source": "https://www.bricodepot.fr/catalogue/fenetre-pvc-blanc-oscillo-battante-2-vantaux-h75-x-l80-cm/prod75983/",
      "note": "taille de stock 80 x 75 (2 vantaux, Uw 1,2), sans delai ; hors tout 85 x 78 ; poignee vendue a part"
    },
    "gouttiere_ml": {
      "pu": 4.7,
      "unite": "ml",
      "source": "https://www.bricodepot.fr/produits/materiau-et-gros-oeuvre/gros-oeuvre-et-evacuation-des-eaux/evacuation-des-eaux-de-pluie/gouttiere-pvc",
      "note": "PVC demi-ronde de 25 : 9,40 EUR les 2 m (zinc : 22,50 EUR les 2 m)"
    },
    "gouttiere_crochet_u": {
      "pu": 2,
      "unite": "u",
      "source": "https://www.brico-toiture.com/175-gouttiere-pvc-25-80-gris"
    },
    "gouttiere_accessoires_u": {
      "pu": 45,
      "unite": "lot",
      "source": "https://www.brico-toiture.com/175-gouttiere-pvc-25-80-gris",
      "note": "naissance 14 + 2 fonds 6 + jonction ou angle 5 + 2 coudes 11 + 3 colliers 8"
    },
    "descente_ml": {
      "pu": 5,
      "unite": "ml",
      "source": "https://www.brico-toiture.com/175-gouttiere-pvc-25-80-gris",
      "note": "tube de 80 : 10 EUR les 2 m"
    },
    "lambourde_ml": {
      "pu": 3.3,
      "unite": "ml",
      "source": "https://www.bricodepot.fr/catalogue/lambourde-en-bois-classe-4-2700-x-70-x-45-mm/prod97284/",
      "note": "classe 4, 45 x 70, 2,70 m : 8,90 EUR"
    },
    "isolant_sol_m2": {
      "pu": 7.43,
      "unite": "m²",
      "source": "https://www.leroymerlin.fr/produits/materiaux/isolation/plaque-polystyrene/polystyrene-extrude/polystyrene-extrude-40-mm-prix-p.html",
      "note": "polystyrene extrude 40 mm"
    },
    "film_pe_m2": {
      "pu": 1,
      "unite": "m²",
      "source": "https://www.bricodepot.fr/catalogue/rouleau-pare-vapeur-ep-015-mm-20-m-l-200cm-x-l-1000cm/prod90796/",
      "note": "rouleau de 20 m2 : 19,90 EUR"
    },
    "osb_m2": {
      "pu": 11.23,
      "unite": "m²",
      "source": "https://www.lamaison.fr/0275785.html",
      "note": "dalle OSB3 18 mm 2500 x 675 : 18,95 EUR"
    },
    "revetement_sol_m2": {
      "pu": 15,
      "unite": "m²",
      "source": "https://www.bricodepot.fr/produits/carrelage-stratifie-et-parquet/stratifie-parquet-et-sol-vinyle-pvc",
      "note": "vinyle rigide a clipser ; stratifie des 5 EUR/m2"
    },
    "aerateur_u": {
      "pu": 8,
      "unite": "u",
      "source": "https://www.bricodepot.fr/produits/chauffage-clim-et-ventilation/climatisation-et-confort-thermique/vmc-et-extracteur-d-air/grille-d-aeration",
      "note": "grille avec moustiquaire, de 4 a 16 EUR ; un extracteur hygroreglable coute 95 EUR"
    },
    "goulotte_u": {
      "pu": 14.9,
      "unite": "u",
      "source": "https://www.bricodepot.fr/produits/electricite/installation-electrique/goulotte-plinthe-et-moulure-electrique/goulotte-electrique",
      "note": "60 x 40, longueur de 2 m"
    },
    "multiprise_u": {
      "pu": 20,
      "unite": "u",
      "note": "pas de prix lu, 15 a 30 EUR"
    },
    "eclairage_u": {
      "pu": 10,
      "unite": "u",
      "source": "https://www.bricodepot.fr/p/3501709011368/reglette-led-etanche-36w-120-cm-blanc-neutre-4000k-2400-lm-ip65",
      "note": "reglette LED 120 cm 36 W : 6,90 EUR"
    },
    "radiateur_u": {
      "pu": 64.9,
      "unite": "u",
      "source": "https://www.bricodepot.fr/catalogue/radiateur-acier-jaina-blanc-750-w/prod87074/",
      "note": "panneau acier 750 W, thermostat, detection de fenetre ouverte"
    },
    "store_u": {
      "pu": 30,
      "unite": "u",
      "note": "pas de prix releve"
    },
    "lame_metal_u": {
      "pu": 67,
      "unite": "u",
      "source": "https://clickoutil.com/lame-scie-circulaire/142169-lames-de-scies-circulaires-expert-for-sandwich-panel-bosch.html",
      "note": "Bosch Expert for Sandwich Panel, 36 dents"
    },
    "livraison_panneaux": {
      "pu": 250,
      "unite": "forfait",
      "note": "service, affiche a part, jamais dans le total des materiaux. Aucun tarif public : sur devis, selon la quantite et la distance."
    }
  }
};
