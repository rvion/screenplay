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
  "abri_v2": {
    "_comment": "Variante proposee de l'abri retenu : une SURCOUCHE de ce fichier (params = seulement ce qui change, fusionne en profondeur, les listes sont remplacees). npm run emit ecrit abri-v2.md et site/assets/modele-v2-*.svg a cote de abri.md, avec un tableau compare calcule. notes = le pourquoi de chaque changement ; hors_modele = conseils que le modele ne dessine pas.",
    "titre": "Abri de jardin : le bureau trapèze, version 2 (calée sur les panneaux)",
    "params": {
      "dalle_cm": {
        "bandes_libres_cm": {
          "avant": 1
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
            "droite": 25
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
            "hauteur_cm": 110,
            "allege_cm": 95,
            "position": 10,
            "ouvrant": true
          },
          {
            "cote": "avant",
            "largeur_cm": 80,
            "hauteur_cm": 110,
            "allege_cm": 95,
            "position": 110,
            "ouvrant": false
          }
        ]
      }
    },
    "atouts": [
      "**À l'abri des regards.** Les voisins de l'étage voient la façade de l'abri. Avec la porte sur le mur droit, de côté, une porte ouverte ne leur montre jamais l'intérieur : ils ne voient que le battant. La porte est **pleine**, pas vitrée : fermée, elle ne montre rien non plus. Il reste les deux fenêtres de façade, qui donnent sur le plateau du bureau et pas sur les écrans ; un film dépoli sur leur moitié basse ou un store règle le reste.",
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
      "**Trois murs au module de 100** (façade 200, droite 200, gauche 300) : la façade et le mur gauche ne sont que des panneaux entiers. Le mur gauche longe le mur de propriété à 12 cm : une fois monté, on n'y accède plus, il ne doit porter aucune recoupe. La seule bande à recouper est sur le fond en biais, qu'on atteint par le passage.",
      "**5,00 m² de murs** : au seuil sans formalité (emprise et plancher ≤ 5 m²), au lieu d'une déclaration préalable pour 0,37 m² de murs en plus. Le prix : 0,35 m² d'intérieur en moins, pris surtout dans le coin aigu du fond.",
      "**Abri avancé de 4 cm** (bande libre avant 1 au lieu de 5) : la porte n'est plus en façade, cette bande ne sert plus. Le passage derrière l'abri retrouve 50 cm.",
      "**Toit vers la droite, côté jardin**, au lieu du fond : descente devant, côté jardin, accessible tous les jours, récupérateur d'eau possible (aujourd'hui toute l'eau du toit arrive au coin le plus enfermé, au pied du mur de propriété). **Attention :** l'eau du fond du toit sort par le mur du fond en biais, pas par le mur droit. La gouttière doit donc courir aussi le long du fond, en pente naturelle vers le coin droit où elle rejoint celle du mur droit (le modèle la compte sur les deux bords : voir le tableau). Sans ce tronçon, cette eau tomberait dans le passage arrière.",
      "**Portée du toit 2,0 m** au lieu de 3,1 m : les panneaux vont du mur gauche au mur droit. C'était l'hypothèse la plus fragile du projet (H6).",
      "**Chute 22,5 cm sur 2 m = 11 %** : le madrier courant 75 × 225 suffit, plus besoin d'un 75 × 300 introuvable en stock. Le mur droit (porte) ne reçoit aucune rehausse, le mur gauche aveugle est le mur haut.",
      "**Toit en 3 panneaux de 100 de large, sans bande étroite** (la version 1 a un panneau de toit de 18 cm) : T1 entier, T2 écorné d'un petit coin sous le débord, T3 coupé une fois en biais le long du fond. Rives avant et fond affleurantes, fermées par une bavette.",
      "**Débord de 25 cm à droite** : il abrite la porte, qui n'a aucun auvent dans la version 1.",
      "**Porte pleine de 80** : une porte de service standard (un fauteuil de bureau ne passe pas dans 65, et un bloc vitré de 65 est du sur-mesure). Elle tient entièrement dans le deuxième module du mur droit : le panneau D1 reste entier, le cadre bois fait office de poteau d'angle.",
      "**Deux fenêtres de 80**, une par panneau entier de façade, l'ouvrante à gauche : en diagonale de la porte pour la ventilation traversante."
    ],
    "hors_modele": [
      "La gouttière a **deux tronçons et un angle** (fond en biais, puis mur droit) : pièce d'angle à prévoir à la commande, le budget ne compte qu'un forfait.",
      "Lit rabattable et bureaux **sur pieds ou équerres au sol** : les parements acier de 0,5 mm ne reprennent pas une charge suspendue. Les fixations murales ne tiennent le lit que replié.",
      "Arrêter le **bureau gauche vers 220 cm** et mettre un meuble haut dans le coin aigu du fond : aucun siège n'atteint le bout du plateau.",
      "Monter le **mur gauche à plat puis le lever** (3 panneaux + rehausse, environ 80 kg) : à 12 cm du mur de propriété, aucune visseuse ne passe. Fermer ce vide par une bavette devant et un grillage au fond (feuilles, nids).",
      "**Store sur les fenêtres de façade** plutôt que sur la porte : ce sont elles qui font face aux écrans. À dimensionner selon l'orientation réelle.",
      "Porte **ferrée côté fond** : ouverte, elle s'efface vers l'arrière quand on arrive du jardin. Deux ou trois dalles de jardin en guise de seuil, la dalle s'arrêtant au ras du mur droit.",
      "À exactement 5,00 m², une mairie pointilleuse peut discuter : raccourcir le mur gauche à 298 donne 4,98 m² pour une recoupe de 2 cm."
    ]
  },
  "abri_v3": {
    "_comment": "Version 3 = version 2 (herite) + un cinquieme mur : le fond d'equerre sur un module, puis un pan a 45 degres jusqu'au haut du mur droit ; et 5 cm seulement entre l'abri et le bord gauche de la dalle. compare_a = la version a laquelle abri-v3.md se compare. Les {champs} des textes sont remplaces par des valeurs calculees.",
    "herite": "abri_v2",
    "compare_a": 2,
    "titre": "Abri de jardin : le bureau à cinq murs, version 3 (fond d'équerre et pan à 45°)",
    "params": {
      "dalle_cm": {
        "bandes_libres_cm": {
          "gauche": 5
        }
      },
      "disposition_trapeze": {
        "cotes_cm": {
          "avant": 200,
          "droite": 200,
          "gauche": 300,
          "fond": 100
        }
      }
    },
    "atouts": [
      "**{gain_interieur_m2} m² d'intérieur en plus** que la version 2 ({interieur_m2} au lieu de {base_interieur_m2} m²), dont {gain_sol_libre_m2} m² de sol libre : le fond de la pièce devient une vraie travée d'équerre, large d'un mètre, au lieu de finir en pointe.",
      "**Plus aucun angle aigu.** Les deux angles qui ne sont pas droits sont identiques, 135° : un seul profil d'angle plié à commander en deux exemplaires, et un bout de bureau gauche d'équerre contre le mur du fond.",
      "**Une seule recoupe de panneau dans tout l'abri.** Façade 200, droite 200, fond 100, gauche 300 : des panneaux entiers. Seul le pan à 45° (141,4 cm) demande une bande, et il donne sur le passage, donc accessible.",
      "**Le pan à 45° longe le mur de propriété** (incliné à 42,8°) : le passage derrière garde une largeur presque constante, {passage_cm} cm au plus étroit, au lieu de s'ouvrir en entonnoir. La tondeuse manuelle y passe comme dans la version 2.",
      "**5 cm au lieu de 12 contre le bord gauche** : l'abri glisse de 7 cm vers le mur, et ses deux coins arrière s'éloignent d'autant du grand pan. C'est ce qui rend au passage les centimètres que le cinquième mur lui prenait.",
      "Tout ce que la version 2 apporte reste vrai ici : porte pleine sur le côté, à l'abri des regards de l'étage voisin ; lumière de côté sur les écrans du bureau gauche ; toit vers le jardin, portée de 2 m, madrier courant. Voir [abri-v2.md](abri-v2.md)."
    ],
    "pertes": [
      "**Au-dessus du seuil** : {murs_m2} m² de murs au lieu de {base_murs_m2}. Il faut une déclaration préalable, et la taxe d'aménagement s'applique probablement (quelques centaines d'euros, une fois). C'est le prix du cinquième mur, et il est connu d'avance.",
      "**Le rangement caché derrière l'abri fond** : {arriere_m2} m² au lieu de {base_arriere_m2} m², passage compris. L'abri occupe le fond de la dalle que la version 2 laissait aux outils. La tondeuse manuelle et les outils à manche y tiennent encore, contre le mur de propriété ; les sacs, les pots et l'échelle beaucoup moins. C'est l'argument « pas de second abri » qui s'affaiblit.",
      "**Un mur, un angle et une pièce de rehausse de plus**, et une gouttière en deux tronçons avec un angle ({gouttiere_cm} cm en tout) : l'eau du fond du toit sort par le pan à 45°, il faut donc la recueillir là aussi pour qu'elle ne tombe pas dans le passage.",
      "**Budget** : {ecart_budget_eur} € d'écart avec la version 2 (voir le tableau), hors taxe d'aménagement.",
      "Le lit de 190 rabattable contre un mur ne tient toujours pas : le fond fait 100 cm et le pan 141 cm. Lit pliant posé au sol, comme en version 2."
    ],
    "notes": [
      "**La forme se ferme toute seule sur le module** : mur gauche 300, mur droit 200, fond 100, il reste un coin de 100 × 100 à fermer, donc un pan à exactement 45° de 141,4 cm. Aucune cote n'est ajustée pour y arriver.",
      "**5 cm à gauche, c'est peu mais ça tient** : le mur gauche se monte à plat puis se lève (voir les conseils de la version 2), on ne visse rien dans ce vide. Il faut le fermer devant par une bavette et au fond par un grillage.",
      "**Pourquoi comparer à la version 2** : la version 3 en reprend tous les réglages (`herite`), seuls la forme et la bande gauche changent. Le tableau isole donc l'effet du cinquième mur."
    ],
    "hors_modele": [
      "Le modèle dessine la gouttière sur les deux bords d'égout, mais pas sa pièce d'angle à 135° ni la pente à lui donner vers la descente : à prévoir à la commande.",
      "Le pan à 45° reçoit une pièce de rehausse en biais dont la hauteur varie le long du mur : c'est une coupe de plus dans le madrier, pas une difficulté.",
      "Avant de déposer la déclaration préalable, vérifier au PLU la règle d'implantation par rapport à la limite (à 5 cm du mur de propriété, l'abri n'est ni en limite ni à 3 m)."
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
