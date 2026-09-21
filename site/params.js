// Genere par scripts/build.mjs - parametres par defaut pour l'app.
window.SHED_PARAMS = {
  "_comment": "Source unique de verite du projet d'abri de jardin. Toutes les cotes sont en centimetres sauf indication contraire. Le site recalcule tout en direct (TypeScript) ; pour regenerer les artefacts versionnes : npm run build && npm run emit.",
  "projet": {
    "nom": "Abri de jardin - panneaux sandwich",
    "description": "Petit abri/bureau de jardin rectangulaire (4 faces) en panneaux sandwich 60 mm autoportants, toit mono-pente, porte vitree + fenetre, sur dalle beton existante.",
    "auteur": "Remi Vion",
    "depot_url": "https://github.com/rvion/screenplay"
  },
  "emprise_cm": {
    "_comment": "Rectangle : A = largeur (face avant), G = profondeur (face gauche). Faces A (avant), D (droite), B (arriere), G (gauche). 200 x 240 = 4,8 m2 : on peut en faire le tour, on reste sous le seuil des 5 m2 (murs), et l'abri tient entierement sur la dalle (262 de large, 223 a droite, pointe arriere).",
    "avant_A": 200,
    "gauche_G": 240
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
    "mur_hauteur_cm": 180,
    "mur_epaisseur_cm": 15,
    "passage_souhaite_cm": 50,
    "bandes_libres_cm": {
      "_comment": "Bande reservee (laissee libre) le long de chaque cote de la dalle, vers l'interieur. Ce qui reste au centre = zone utile (plan-dalle-bandes.svg).",
      "avant": 5,
      "droite": 5,
      "arriere_droite": 45,
      "arriere_gauche": 12,
      "gauche": 12
    },
    "decalage_cm": {
      "x": 2,
      "y": 2
    }
  },
  "disposition_trapeze": {
    "_comment": "Amenagement de l'option 13 (trapeze, passage vise derriere) : mur droit recule jusqu'a interieur_vise_m2, porte de porte_largeur_cm (ouverture) sur le cote droit, entouree d'un chambranle de porte_chambranle_cm, le cadre a porte_marge_cm des faces interieures des murs voisins et sous le haut du mur (hauteur de passage = hauteur du mur - marge - chambranle), bureau en L le long de tout le mur gauche et de toute la facade, facade = fenetres seulement ; sieges = emprise au sol posee contre le bord interieur d'un bureau (contre), sur la plus longue partie libre de ce bord (position = centre|debut|fin ou decalage en cm) ; lit_pliant = lit rabattable facon couchette de bateau : contre = mur ou il est fixe (plaque contre sa face interieure, replie a plat sur epaisseur_replie_cm, deux fixations ; rien sur la facade), emprise depliee placee automatiquement hors d'une zone d'acces devant la porte (acces_porte_cm) et hors des bureaux, sauf si sous_bureau (lit plus bas que le plateau : son pied peut glisser dessous quand le sol libre ne suffit pas ; sur le sol libre seul, 65 de large tient jusqu'a ~165 de long) (une par module de panneau, centree, jamais sur un joint ; allege au-dessus du bureau). position = gauche|centre|droite le long du cote (droite = vers le fond) ou distance en cm depuis le debut du cote.",
    "interieur_vise_m2": 4.8,
    "porte_cote": "droite",
    "porte_position": "droite",
    "porte_largeur_cm": 65,
    "porte_chambranle_cm": 5,
    "porte_marge_cm": 5,
    "toit": {
      "sens": "arriere",
      "chute_cm": 30,
      "debord_cm": {
        "avant": 10,
        "arriere": 10,
        "cotes": 0
      }
    },
    "rehausse_section_mm": [
      75,
      300
    ],
    "bureaux": [
      {
        "cote": "gauche",
        "profondeur_cm": 60
      },
      {
        "cote": "avant",
        "profondeur_cm": 50
      }
    ],
    "lit_pliant": {
      "largeur_cm": 75,
      "longueur_cm": 190,
      "contre": "fond",
      "epaisseur_replie_cm": 10,
      "acces_porte_cm": 0,
      "sous_bureau": true
    },
    "rehausse_prix_ml_eur": 13,
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
        "largeur_cm": 100,
        "hauteur_cm": 110,
        "allege_cm": 95,
        "position": 100,
        "ouvrant": false
      }
    ]
  },
  "abri_principal": "abri_v4",
  "abri_menu": [
    "abri_v3",
    "abri_v4"
  ],
  "_abri_menu_comment": "Les versions montrees dans le menu de gauche du site, celles qui sont pretes. Les autres restent atteignables par ?v=N et ont leur document dans docs/.",
  "abri_v1": {
    "_comment": "La version 1 est la disposition de base (disposition_trapeze) : ce bloc ne porte que son nom pour le menu du site, pas de params.",
    "nom_court": "première forme : trapèze, toit vers le fond"
  },
  "_abri_principal_comment": "La version retenue : son bloc abri_vN devient abri.md, la page d'accueil du site et le modele 3D. La premiere forme (disposition_trapeze de base) passe dans abri-v1.md. Pour retenir une autre version, changer ce seul nom.",
  "abri_v2": {
    "nom_court": "quatre murs au module, toit vers le jardin",
    "_comment": "Variante proposee de l'abri retenu : une SURCOUCHE de ce fichier (params = seulement ce qui change, fusionne en profondeur, les listes sont remplacees). npm run emit ecrit abri-v2.md et site/assets/modele-v2-*.svg a cote de abri.md, avec un tableau compare calcule. notes = le pourquoi de chaque changement ; hors_modele = conseils que le modele ne dessine pas.",
    "titre": "Abri de jardin : le bureau trapèze, version 2 (calée sur les panneaux)",
    "params": {
      "dalle_cm": {
        "bandes_libres_cm": {
          "avant": 1,
          "gauche": 10
        }
      },
      "disposition_trapeze": {
        "cotes_cm": {
          "avant": 200,
          "droite": 200,
          "gauche": 300
        },
        "porte_largeur_cm": 80,
        "porte_vitree": false,
        "toit": {
          "sens": "droite",
          "chute_cm": 22.5,
          "debord_cm": {
            "avant": 0,
            "arriere": 0,
            "gauche": 0,
            "droite": 15
          }
        },
        "rehausse_section_mm": [
          75,
          225
        ],
        "rehausse_prix_ml_eur": 10,
        "lit_pliant": {
          "contre": ""
        },
        "fenetres": [
          {
            "cote": "avant",
            "largeur_cm": 80,
            "hauteur_cm": 80,
            "allege_cm": 110,
            "position": 10,
            "ouvrant": true
          },
          {
            "cote": "avant",
            "largeur_cm": 80,
            "hauteur_cm": 80,
            "allege_cm": 110,
            "position": 110,
            "ouvrant": false
          }
        ]
      }
    },
    "atouts": [
      "**À l'abri des regards.** Les voisins de l'étage voient la façade de l'abri. Avec la porte sur le mur droit, de côté, une porte ouverte ne leur montre jamais l'intérieur : ils ne voient que le battant. La porte est **pleine**, pas vitrée : fermée, elle ne montre rien non plus. Il reste les deux fenêtres de façade : petites (80 × 80) et hautes (allège à 110 cm), elles donnent sur le bord du plateau et pas sur les écrans ; un store règle le reste.",
      "**La lumière de côté, comme le demande l'ergonomie.** Le jour n'entre que par les fenêtres de façade. L'ordinateur et le second écran vont sur le bureau gauche, contre le mur aveugle : assis face à ce mur, on reçoit la lumière **par le côté gauche**, écrans perpendiculaires aux fenêtres, sans fenêtre dans le dos ni en face. Une porte vitrée sur le mur droit aurait été exactement dans le dos, en reflet sur les écrans : la porte pleine supprime ce défaut.",
      "**Les outils de jardin cachés derrière, et pas de second abri.** Derrière le mur du fond il reste **{arriere_m2} m² de dalle**, profonds de {arriere_profondeur_cm} cm au plus large, entre l'abri et le mur de propriété : invisibles depuis le jardin et depuis la maison, hachurés en vert sur le plan d'implantation. Outils à manche accrochés au mur, tuyau, pots, sacs de terreau, échelle : tout y tient, le jardin garde une seule construction et reste dégagé. On y accède par le passage de {passage_cm} cm le long du grand pan. **À vérifier :** ce qui est plus large que ce passage n'y entre pas (une brouette fait environ 60 cm, certaines tondeuses 50 à 55) ; mesurer la tondeuse avant de compter dessus."
    ],
    "pertes": [
      "**0,35 m² d'intérieur en moins** (4,46 au lieu de 4,81 m²), pris surtout dans le coin aigu du fond, la surface la moins utile.",
      "**Le lit rabattable contre le fond ne tient plus** : un lit de 190 plaqué contre le mur en biais demande un mur d'au moins 244 cm (le coin aigu et le coin obtus mangent chacun leur part), et le fond ne fait plus que 224 cm. La version 2 garde un lit pliant de 75 × 190 posé au sol libre, sièges rangés (`lit_pliant.contre` vide). Garder le lit rabattable impose un fond de 244 cm au moins, donc de sortir du module ou du seuil de 5 m².",
      "**Bureau gauche plus court de 13 cm** (284 au lieu de 297 cm) : sans effet, aucun siège n'atteint le bout.",
      "**Un peu plus chère** (voir la ligne budget du tableau) : l'écart vient de la deuxième fenêtre, ouvrante. À fenêtres égales la coque de la version 2 coûte moins (madrier courant, toit plus court)."
    ],
    "notes": [
      "**Trois murs au module de 100** (façade 200, droite 200, gauche 300) : la façade et le mur gauche ne sont que des panneaux entiers. Le mur gauche longe le mur de propriété à {gauche_cm} cm : une fois monté, on n'y accède plus, il ne doit porter aucune recoupe. La seule bande à recouper est sur le fond en biais, qu'on atteint par le passage.",
      "**5,00 m² de murs** : au seuil sans formalité (emprise et plancher ≤ 5 m²), au lieu d'une déclaration préalable pour 0,37 m² de murs en plus. Le prix : 0,35 m² d'intérieur en moins, pris surtout dans le coin aigu du fond.",
      "**Abri avancé de 4 cm** (bande libre avant 1 au lieu de 5) : la porte n'est plus en façade, cette bande ne sert plus. Le passage derrière l'abri retrouve 50 cm.",
      "**Toit vers la droite, côté jardin**, au lieu du fond : descente devant, côté jardin, accessible tous les jours, récupérateur d'eau possible (aujourd'hui toute l'eau du toit arrive au coin le plus enfermé, au pied du mur de propriété). **Attention :** l'eau du fond du toit sort par le mur du fond en biais, pas par le mur droit. La gouttière doit donc courir aussi le long du fond, en pente naturelle vers le coin droit où elle rejoint celle du mur droit (le modèle la compte sur les deux bords : voir le tableau). Sans ce tronçon, cette eau tomberait dans le passage arrière.",
      "**Portée du toit 2,0 m** au lieu de 3,1 m : les panneaux vont du mur gauche au mur droit. C'était l'hypothèse la plus fragile du projet (H6).",
      "**Chute 22,5 cm sur 2 m = 11 %** : le madrier courant 75 × 225 suffit, plus besoin d'un 75 × 300 introuvable en stock. Le mur droit (porte) ne reçoit aucune rehausse, le mur gauche aveugle est le mur haut.",
      "**Toit en 3 panneaux de 100 de large, sans bande étroite** (la version 1 a un panneau de toit de 18 cm) : T1 entier, T2 écorné d'un petit coin sous le débord, T3 coupé une fois en biais le long du fond. Rives avant et fond affleurantes, fermées par une bavette.",
      "**Débord de {debord_droite_cm} cm à droite** : il abrite la porte, qui n'a aucun auvent dans la version 1. Volontairement court : il ne coûte rien (c'est la longueur des panneaux de toit) et reste discret.",
      "**Porte pleine de 80** : une porte de service standard (un fauteuil de bureau ne passe pas dans 65, et un bloc vitré de 65 est du sur-mesure). Elle tient entièrement dans le deuxième module du mur droit : le panneau D1 reste entier, le cadre bois fait office de poteau d'angle.",
      "**Deux fenêtres de 80 × 80, allège à 110 cm**, une par panneau entier de façade, l'ouvrante à gauche, en diagonale de la porte pour la ventilation traversante. Petites et hautes : assis, le regard passe juste au-dessus de l'allège (yeux vers 120 cm), et depuis l'étage des voisins on voit moins le plateau du bureau qu'avec des fenêtres de 110 de haut."
    ],
    "hors_modele": [
      "La gouttière a **deux tronçons et un angle** (fond en biais, puis mur droit) : pièce d'angle à prévoir à la commande, le budget ne compte qu'un forfait.",
      "Lit rabattable et bureaux **sur pieds ou équerres au sol** : les parements acier de 0,5 mm ne reprennent pas une charge suspendue. Les fixations murales ne tiennent le lit que replié.",
      "Arrêter le **bureau gauche vers 220 cm** et mettre un meuble haut dans le coin aigu du fond : aucun siège n'atteint le bout du plateau.",
      "Monter le **mur gauche à plat puis le lever** (3 panneaux + rehausse, environ 80 kg) : à {gauche_cm} cm du mur de propriété, aucune visseuse ne passe. Fermer ce vide par une bavette devant et un grillage au fond (feuilles, nids).",
      "**Store sur les fenêtres de façade** plutôt que sur la porte : ce sont elles qui font face aux écrans. À dimensionner selon l'orientation réelle.",
      "Porte **ferrée côté fond** : ouverte, elle s'efface vers l'arrière quand on arrive du jardin. Deux ou trois dalles de jardin en guise de seuil, la dalle s'arrêtant au ras du mur droit.",
      "À exactement 5,00 m², une mairie pointilleuse peut discuter : raccourcir le mur gauche à 298 donne 4,98 m² pour une recoupe de 2 cm."
    ]
  },
  "abri_v3": {
    "nom_court": "cinq murs, toit vers le jardin",
    "_comment": "Version 3 = version 2 (herite) + un cinquieme mur : le fond d'equerre sur un module, puis un pan a 45 degres jusqu'au haut du mur droit ; murs gauche 275 et droit 175 (25 cm de moins que le module : 5,00 m2 de murs, au seuil) ; 10 cm de dalle visibles a gauche ET devant. compare_a = la version a laquelle abri-v3.md se compare. Les {champs} des textes sont remplaces par des valeurs calculees.",
    "herite": "abri_v2",
    "compare_a": 2,
    "titre": "Abri de jardin : le bureau à cinq murs, version 3 (fond d'équerre et pan à 45°)",
    "titre_principal": "Abri de jardin : le bureau à cinq murs",
    "params": {
      "dalle_cm": {
        "bandes_libres_cm": {
          "avant": 10,
          "gauche": 10
        }
      },
      "disposition_trapeze": {
        "cotes_cm": {
          "avant": 200,
          "droite": 175,
          "gauche": 275,
          "fond": 100
        },
        "panneaux_depuis_la_fin": [
          "droite"
        ]
      }
    },
    "atouts": [
      "**La surface de la version 2, mieux dessinée** : {murs_m2} m² de murs et {interieur_m2} m² d'intérieur (version 2 : {base_murs_m2} et {base_interieur_m2} m²), donc **toujours sans formalité**. Mais le fond de la pièce est une travée d'équerre large d'un mètre, plus une pointe à 63° : {gain_sol_libre_m2} m² de sol libre en plus à surface égale.",
      "**Plus aucun angle aigu.** Les deux angles qui ne sont pas droits sont identiques, 135° : un seul profil d'angle plié à commander en deux exemplaires, et un bout de bureau gauche d'équerre contre le mur du fond.",
      "**La façade et le mur du fond restent en panneaux entiers** (200 et 100). Les murs gauche (275) et droit (175) ont chacun une bande de 75 cm, et le pan à 45° une bande de 41 cm. Les bandes sont placées là où on les atteint : celle du mur gauche est en bout côté façade, celle du mur droit côté façade aussi (le module entier du fond reçoit le cadre de la porte), celle du pan donne sur le passage.",
      "**Le pan à 45° longe le mur de propriété** (incliné à 42,8°) : le passage derrière garde une largeur presque constante au lieu de s'ouvrir en entonnoir, et il est **plus large que dans la version 2** : {passage_cm} cm au plus étroit contre {base_passage_cm} cm. La tondeuse manuelle y passe à l'aise.",
      "**10 cm de dalle visibles à gauche et devant** : l'abri ne vient pas au ras de la dalle. Devant, le rail de pied et sa bavette s'égouttent sur le béton et pas dans l'herbe ; à gauche, le vide contre le mur de propriété reste assez large pour être fermé proprement (bavette devant, grillage au fond) et pour que l'eau et les feuilles n'y restent pas.",
      "Tout ce que la version 2 apporte reste vrai ici : porte pleine sur le côté, à l'abri des regards de l'étage voisin ; lumière de côté sur les écrans du bureau gauche ; toit vers le jardin, portée de 2 m, madrier courant. Voir [abri-v2.md](abri-v2.md)."
    ],
    "pertes": [
      "**Rangement caché derrière l'abri** : {arriere_m2} m², contre {base_arriere_m2} m² dans la version 2, passage compris. Le cinquième mur occupe le fond de la dalle, mais l'abri raccourci en rend une partie. La tondeuse manuelle, les outils à manche, le tuyau et quelques sacs y tiennent, contre le mur de propriété.",
      "**Un mur, un angle et une pièce de rehausse de plus**, et une gouttière en deux tronçons avec un angle ({gouttiere_cm} cm en tout) : l'eau du fond du toit sort par le pan à 45°, il faut donc la recueillir là aussi pour qu'elle ne tombe pas dans le passage.",
      "**Budget** : {ecart_budget_eur} € d'écart avec la version 2 (voir le tableau), pour les bandes de panneau et la pièce de rehausse en plus.",
      "Le lit de 190 rabattable contre un mur ne tient toujours pas : le fond fait 100 cm et le pan 141 cm. Lit pliant posé au sol, comme en version 2."
    ],
    "notes": [
      "**La forme reste un vrai 45°** : mur gauche 275, mur droit 175, fond 100. Les deux murs ont été raccourcis de la même longueur, il reste donc toujours un coin de 100 × 100 à fermer, soit un pan à 45° de 141,4 cm, sans cote ajustée.",
      "**Pourquoi 25 cm de moins et pas 20** : à 280 et 180 l'abri fait 5,10 m² de murs, juste au-dessus du seuil, et demande une déclaration préalable pour 0,10 m². À 275 et 175 il fait 5,00 m² : aucune formalité a priori. Pour revenir à 20, changer les deux nombres de `cotes_cm`. À exactement 5,00 m², une mairie pointilleuse peut discuter : 274 et 174 donnent 4,98 m².",
      "**Pourquoi comparer à la version 2** : la version 3 en reprend tous les réglages (`herite`), seuls la forme et la bande gauche changent. Le tableau isole donc l'effet du cinquième mur."
    ],
    "hors_modele": [
      "Le mur gauche se monte à plat puis se lève (voir les conseils de la version 2) : on ne visse rien dans le vide de {gauche_cm} cm. Le fermer devant par une bavette et au fond par un grillage.",
      "Le modèle dessine la gouttière sur les deux bords d'égout, mais pas sa pièce d'angle à 135° ni la pente à lui donner vers la descente : à prévoir à la commande.",
      "Le pan à 45° reçoit une pièce de rehausse en biais dont la hauteur varie le long du mur : c'est une coupe de plus dans le madrier, pas une difficulté.",
      "Même sans formalité, vérifier au PLU la règle d'implantation par rapport à la limite (à {gauche_cm} cm du mur de propriété, l'abri n'est ni en limite ni à 3 m)."
    ]
  },
  "abri_v4": {
    "nom_court": "cinq murs, toit vers le fond, gouttière derrière",
    "_comment": "Version 4 = version 3 (herite) avec le toit vers le FOND : les nervures des panneaux menent l'eau a l'arriere, la gouttiere court derriere l'abri (mur du fond + pan a 45 degres). descente = bout de la gouttiere ou placer la descente (droite = vers le jardin). Comparee a la version 3 : le tableau isole l'effet du sens du toit.",
    "herite": "abri_v3",
    "compare_a": 3,
    "titre": "Abri de jardin : le bureau à cinq murs, version 4 (toit vers le fond, gouttière derrière)",
    "titre_principal": "Abri de jardin : le bureau à cinq murs",
    "params": {
      "disposition_trapeze": {
        "toit": {
          "sens": "arriere",
          "descente": "droite",
          "panne_intermediaire": true,
          "chute_cm": 22.5,
          "debord_cm": {
            "avant": 5,
            "arriere": 5,
            "gauche": 0,
            "droite": 0
          }
        }
      }
    },
    "atouts": [
      "**Une façade droite et haute** : {hauteur_facade_cm} cm d'un bout à l'autre, le toit ne se voit pas pencher depuis le jardin ni depuis la maison. Dans la version 3 la façade descend de 237,5 à 215 cm vers la porte.",
      "**La gouttière est derrière, invisible** : {gouttiere_cm} cm le long du mur du fond puis du pan à 45°. Les nervures des panneaux de toit vont de l'avant vers l'arrière, toute l'eau arrive donc aux bouts arrière des panneaux, et nulle part ailleurs.",
      "**Un panneau de toit en moins** : {panneaux_toit} panneaux au lieu de {base_panneaux_toit}, dans le sens de la profondeur, sans bande étroite. Un seul porte une coupe en biais, le long du pan à 45°.",
      "**Le mur contre la propriété n'est plus le mur haut** : il descend de 237,5 cm devant à 215 cm au fond, au lieu de rester à 237,5 cm sur toute sa longueur. Moins de mur visible au-dessus du mur du voisin.",
      "Débord de {debord_avant_cm} cm devant : il protège un peu les fenêtres de façade, que la version 3 laisse à nu."
    ],
    "pertes": [
      "**Portée du toit : {portee_m} m au lieu de {base_portee_m} m.** Les panneaux vont de la façade au mur du fond. C'est l'hypothèse la plus fragile du projet pour du 60 mm : à faire confirmer par le fabricant, ou prévoir une panne en bois en travers, à mi-profondeur (2 m de portée, elle relie aussi le mur gauche au mur droit).",
      "**Pente {pente_pourcent} % au lieu de {base_pente_pourcent} %** : la même chute de 22,5 cm s'étale sur {portee_m} m au lieu de {base_portee_m} m. C'est peu pour une toiture en panneaux ; une chute de 30 cm donnerait 10 %, mais demande un madrier de 300, introuvable en stock (ou deux pièces superposées).",
      "**La descente n'a pas de bonne place.** Au coin arrière gauche, le point bas naturel, elle est coincée entre deux murs, hors d'atteinte, et l'eau finit au pied du mur de propriété. Placée {descente}, comme ici, elle se trouve dans le passage qu'on veut garder libre, et il faut encore un tuyau le long du mur droit pour amener l'eau au jardin. La version 3 la met devant, côté jardin, sur la dalle.",
      "**La gouttière du pan à 45° est à contre-pente** : le bord du toit y monte de 7,5 cm vers le mur droit, la gouttière doit descendre dans l'autre sens. Elle pend donc de 8 à 9 cm sous le bord du toit à son bout droit.",
      "**Plus d'abri au-dessus de la porte** : le débord de {base_debord_droite_cm} cm de la version 3 venait gratuitement de la longueur des panneaux. Ici un débord à droite demande un panneau de toit de plus, refendu. Prévoir une marquise.",
      "**Gouttière dans le passage** : à 2,05 m du sol environ, au point où le passage fait {passage_cm} cm. Avec un débord arrière de {debord_arriere_cm} cm, le bord du toit et la gouttière avancent d'une quinzaine de centimètres au-dessus du passage : on passe dessous, mais elle se nettoie dans un couloir étroit, pas depuis le jardin."
    ],
    "notes": [
      "**Pourquoi les nervures décident** : un panneau sandwich de toiture a des nervures dans sa longueur, et il se pose nervures dans le sens de la pente. L'eau ne quitte donc le toit que par les bouts bas des panneaux. Toit vers le fond : gouttière au fond, sur les deux bords où finissent les panneaux (mur du fond et pan à 45°). Le modèle applique cette règle à toute forme.",
      "**Tout le reste est celui de la version 3** : mêmes cinq murs, même intérieur, même passage, porte pleine sur le côté, deux fenêtres de 80 × 80. Le tableau ne montre que ce que le sens du toit change."
    ],
    "hors_modele": [
      "La panne intermédiaire conseillée n'est ni dessinée ni chiffrée : un bois de 75 × 150 environ, 2 m, posé sur les murs gauche et droit.",
      "Le tuyau qui ramène l'eau de la descente au jardin (2 m le long du mur droit, au sol) n'est pas chiffré non plus.",
      "Une marquise au-dessus de la porte est à ajouter au budget."
    ]
  },
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
    "_comment": "Hauteur des panneaux muraux (rectangles, coupes droites) = hauteur arriere. L'avant = hauteur_cm + toit.pente_chute_cm grace a la rehausse."
  },
  "toit": {
    "pente_chute_cm": 22.5,
    "draine_vers": "arriere_B",
    "debord_cm": {
      "avant": 10,
      "arriere": 10,
      "gauche": 0,
      "droite": 0
    },
    "gouttiere_largeur_cm": 10,
    "_comment": "Debords lateraux a 0 : le toit fait exactement A de large = 2 panneaux de 100, la rive est fermee par une bavette de rive (standard). pente_chute = hauteur de la rehausse a l'avant = denivele avant -> arriere. 25 cm sur 2,46 m = ~10% (~5,8 deg), dans la plage admise par la plupart des panneaux de toiture (verifier le mini du fabricant). La rehausse est en BOIS (voir rehausse) : chute = hauteur de la section du madrier (225 mm)."
  },
  "rehausse": {
    "materiau": "bois",
    "section_mm": [
      75,
      225
    ],
    "longueur_stock_cm": 480,
    "prix_ml_eur": 10,
    "_comment": "Madrier traite classe 4, section 75 x 225 (stock). R2+R3 = un madrier de G coupe en diagonale (2 coins), R1 = un madrier de A droit (bandeau). Fait aussi office de lisse haute qui lie murs et toit. Alternative : materiau = panneau (bande de panneau sandwich coupee en diagonale)."
  },
  "porte": {
    "face": "A",
    "largeur_cm": 100,
    "hauteur_cm": 215,
    "position": "droite",
    "marge_bord_cm": 0,
    "ouverture": "vers l'exterieur",
    "description": "bloc-porte vitre aluminium double vitrage, poignee + serrure (dormant compris) 100 x 215 : remplit tout le module A2, aucun panneau a decouper",
    "_comment": "Largeur = largeur utile d'un panneau et hauteur = hauteur des murs : le bloc-porte REMPLACE un panneau entier (A2), pas de bande de 5 cm a decouper. position = gauche|centre|droite (+ marge_bord_cm) ou distance en cm."
  },
  "fenetres": [
    {
      "id": "fenetre-droite",
      "face": "D",
      "largeur_cm": 80,
      "hauteur_cm": 110,
      "allege_cm": 95,
      "position": 110,
      "ouvrant": true,
      "description": "fenetre oscillo-battante double vitrage, face droite, dans le module D2 (ventilation traversante avec la porte)"
    },
    {
      "id": "fenetre-gauche",
      "face": "G",
      "largeur_cm": 80,
      "hauteur_cm": 110,
      "allege_cm": 95,
      "position": 110,
      "ouvrant": false,
      "description": "fenetre fixe double vitrage, face gauche, dans le module G2 (la face G se compte depuis l'arriere : 110-190 = 50-130 depuis l'avant)"
    }
  ],
  "_fenetres_comment": "Liste (vide = aucune). Chaque fenetre : face A|D|B|G, largeur, hauteur, allege (bas de fenetre / sol), position (gauche|centre|droite ou distance en cm). Conseil : la garder dans un seul panneau (ne pas chevaucher un joint).",
  "amenagement": {
    "_comment": "Confort au quotidien (bureau). actif = compte au budget et s'affiche sur le site. L'electricite arrive deja par le sol : pas de tableau, juste multiprise + eclairage.",
    "plancher": {
      "actif": true,
      "epaisseur_cm": 6,
      "prix_m2_eur": 45,
      "description": "plancher isole : lambourdes + 40 mm d'isolant + OSB + sol vinyle/parquet"
    },
    "electricite": {
      "actif": true,
      "forfait_eur": 80,
      "description": "cable existant par le sol : multiprise parafoudre + plafonnier LED + chemins de cable"
    },
    "chauffage": {
      "actif": true,
      "forfait_eur": 120,
      "description": "radiateur panneau 750 W avec thermostat"
    },
    "store": {
      "actif": true,
      "forfait_eur": 60,
      "description": "store sur la porte vitree (soleil / ecran)"
    },
    "finition_interieure": {
      "actif": true,
      "forfait_eur": 120,
      "description": "couvre-joints d'angle interieurs, tapis, rideau (acoustique)"
    }
  },
  "divers": {
    "facteur_chute_pct": 10,
    "_comment": "Marge de perte/chute appliquee aux quantites de panneaux pour la commande."
  },
  "prix_materiaux_eur_ttc": {
    "_comment": "Prix des MATERIAUX, TTC, pour un particulier, en France. Ni main-d'oeuvre ni forfait ; la livraison est a part et hors total. Chaque article : pu (prix unitaire), unite, source (adresse ou le prix a ete releve), note. Un article sans source est marque 'prix a confirmer' sur le site et dans abri.md. Les quantites sont calculees par site/src/chantier.ts.",
    "incertitude_pct": 15,
    "panneau_mur_m2": {
      "pu": 42,
      "unite": "m²",
      "note": ""
    },
    "panneau_toit_m2": {
      "pu": 40,
      "unite": "m²",
      "note": ""
    },
    "madrier_ml": {
      "pu": 14,
      "unite": "ml",
      "note": ""
    },
    "panne_ml": {
      "pu": 10,
      "unite": "ml",
      "note": ""
    },
    "chevron_cadre_ml": {
      "pu": 5,
      "unite": "ml",
      "note": ""
    },
    "profil_pied_ml": {
      "pu": 9,
      "unite": "ml",
      "note": ""
    },
    "angle_standard_ml": {
      "pu": 10,
      "unite": "ml",
      "note": ""
    },
    "angle_sur_mesure_ml": {
      "pu": 18,
      "unite": "ml",
      "note": ""
    },
    "bande_rive_ml": {
      "pu": 12,
      "unite": "ml",
      "note": ""
    },
    "bandeau_haut_ml": {
      "pu": 12,
      "unite": "ml",
      "note": ""
    },
    "closoir_ml": {
      "pu": 3,
      "unite": "ml",
      "note": ""
    },
    "vis_toit_100": {
      "pu": 45,
      "unite": "cent",
      "note": ""
    },
    "vis_couture_100": {
      "pu": 12,
      "unite": "cent",
      "note": ""
    },
    "vis_mur_100": {
      "pu": 25,
      "unite": "cent",
      "note": ""
    },
    "cheville_beton_u": {
      "pu": 0.6,
      "unite": "u",
      "note": ""
    },
    "bande_arase_ml": {
      "pu": 1.5,
      "unite": "ml",
      "note": ""
    },
    "butyle_ml": {
      "pu": 1.2,
      "unite": "ml",
      "note": ""
    },
    "mastic_cartouche": {
      "pu": 9,
      "unite": "cartouche",
      "note": ""
    },
    "bande_comprimee_ml": {
      "pu": 2.5,
      "unite": "ml",
      "note": ""
    },
    "mousse_pu_u": {
      "pu": 9,
      "unite": "bombe",
      "note": ""
    },
    "porte_pleine_u": {
      "pu": 450,
      "unite": "u",
      "note": ""
    },
    "porte_vitree_u": {
      "pu": 900,
      "unite": "u",
      "note": ""
    },
    "fenetre_fixe_u": {
      "pu": 150,
      "unite": "u",
      "note": ""
    },
    "fenetre_ob_u": {
      "pu": 220,
      "unite": "u",
      "note": ""
    },
    "gouttiere_ml": {
      "pu": 6,
      "unite": "ml",
      "note": ""
    },
    "gouttiere_crochet_u": {
      "pu": 2.5,
      "unite": "u",
      "note": ""
    },
    "gouttiere_accessoires_u": {
      "pu": 35,
      "unite": "lot",
      "note": ""
    },
    "descente_ml": {
      "pu": 6,
      "unite": "ml",
      "note": ""
    },
    "lambourde_ml": {
      "pu": 2,
      "unite": "ml",
      "note": ""
    },
    "isolant_sol_m2": {
      "pu": 12,
      "unite": "m²",
      "note": ""
    },
    "film_pe_m2": {
      "pu": 1,
      "unite": "m²",
      "note": ""
    },
    "osb_m2": {
      "pu": 14,
      "unite": "m²",
      "note": ""
    },
    "revetement_sol_m2": {
      "pu": 20,
      "unite": "m²",
      "note": ""
    },
    "aerateur_u": {
      "pu": 15,
      "unite": "u",
      "note": ""
    },
    "goulotte_u": {
      "pu": 8,
      "unite": "u",
      "note": ""
    },
    "multiprise_u": {
      "pu": 25,
      "unite": "u",
      "note": ""
    },
    "eclairage_u": {
      "pu": 30,
      "unite": "u",
      "note": ""
    },
    "radiateur_u": {
      "pu": 90,
      "unite": "u",
      "note": ""
    },
    "store_u": {
      "pu": 30,
      "unite": "u",
      "note": ""
    },
    "lame_metal_u": {
      "pu": 40,
      "unite": "u",
      "note": ""
    },
    "livraison_panneaux": {
      "pu": 250,
      "unite": "forfait",
      "note": "service, affiche a part, jamais dans le total des materiaux"
    }
  },
  "prix_indicatifs_eur": {
    "_comment": "Prix INDICATIFS HT, fourniture seule, medians du marche 2026 (panneaux 60 mm stock 27-40 EUR/m2 mur, 25-40 toit ; porte alu vitree 700-1300 ; fenetre PVC fixe 150-300, oscillo-battante 250-450 ; surcout panneaux mur a fixation cachee ~5 EUR/m2). A confirmer par devis. Modifiables : le widget budget du site se recalcule.",
    "panneau_mur_m2": 35,
    "panneau_toit_m2": 35,
    "porte_vitree": 900,
    "porte_pleine": 450,
    "fenetre_fixe": 200,
    "fenetre_ouvrante": 320,
    "fixation_cachee_m2": 5,
    "profils_ml": 12,
    "visserie_etancheite_forfait": 160,
    "gouttiere_descente_forfait": 130,
    "ventilation_forfait": 150,
    "livraison_forfait": 150,
    "incertitude_pct": 15
  }
};
