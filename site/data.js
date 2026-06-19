// Genere par scripts/generate.py - NE PAS EDITER A LA MAIN
window.SHED = {
  "projet": {
    "nom": "Abri de jardin - panneaux sandwich",
    "description": "Petit abri/bureau de jardin a 5 faces (carre avec un coin coupe) sur dalle beton existante.",
    "auteur": "Remi Vion"
  },
  "geometrie": {
    "verts": [
      [
        0.0,
        0.0
      ],
      [
        230.0,
        0.0
      ],
      [
        230.0,
        160.0
      ],
      [
        140.0,
        246.0
      ],
      [
        0.0,
        246.0
      ]
    ],
    "vert_names": [
      "avant-gauche",
      "avant-droite",
      "fin-droite (coupe)",
      "fin-arriere (coupe)",
      "arriere-gauche"
    ],
    "vert_heights_cm": [
      240.0,
      240.0,
      223.7,
      215.0,
      215.0
    ],
    "cotes": {
      "G": 246.0,
      "A": 230.0,
      "D": 160.0,
      "B": 140.0,
      "C": 124.5
    },
    "aire_m2": 5.27,
    "perimetre_cm": 900.5,
    "pente": {
      "chute_cm": 25.0,
      "run_cm": 246.0,
      "pourcent": 10.2,
      "degres": 5.8
    },
    "hauteur_avant_cm": 240.0,
    "hauteur_arriere_cm": 215.0,
    "faces": [
      {
        "cle": "A",
        "libelle": "Avant",
        "longueur_cm": 230.0,
        "hauteur_debut_cm": 240.0,
        "hauteur_fin_cm": 240.0,
        "hauteur_max_cm": 240.0,
        "rake": false
      },
      {
        "cle": "D",
        "libelle": "Droite",
        "longueur_cm": 160.0,
        "hauteur_debut_cm": 240.0,
        "hauteur_fin_cm": 223.7,
        "hauteur_max_cm": 240.0,
        "rake": true
      },
      {
        "cle": "C",
        "libelle": "Coupe",
        "longueur_cm": 124.5,
        "hauteur_debut_cm": 223.7,
        "hauteur_fin_cm": 215.0,
        "hauteur_max_cm": 223.7,
        "rake": true
      },
      {
        "cle": "B",
        "libelle": "Arriere",
        "longueur_cm": 140.0,
        "hauteur_debut_cm": 215.0,
        "hauteur_fin_cm": 215.0,
        "hauteur_max_cm": 215.0,
        "rake": false
      },
      {
        "cle": "G",
        "libelle": "Gauche",
        "longueur_cm": 246.0,
        "hauteur_debut_cm": 215.0,
        "hauteur_fin_cm": 240.0,
        "hauteur_max_cm": 240.0,
        "rake": true
      }
    ]
  },
  "debit": {
    "murs": {
      "lignes": [
        {
          "face": "A",
          "libelle": "Avant",
          "longueur_cm": 230.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 3,
          "aire_brute_m2": 7.2,
          "rake": false
        },
        {
          "face": "D",
          "libelle": "Droite",
          "longueur_cm": 160.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.8,
          "rake": true
        },
        {
          "face": "C",
          "libelle": "Coupe",
          "longueur_cm": 124.5,
          "hauteur_cm": 223.7,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.47,
          "rake": true
        },
        {
          "face": "B",
          "libelle": "Arriere",
          "longueur_cm": 140.0,
          "hauteur_cm": 215.0,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.3,
          "rake": false
        },
        {
          "face": "G",
          "libelle": "Gauche",
          "longueur_cm": 246.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 3,
          "aire_brute_m2": 7.2,
          "rake": true
        }
      ],
      "aire_brute_m2": 27.97,
      "aire_nette_m2": 18.68,
      "porte_deduite_m2": 1.89,
      "total_panneaux": 12
    },
    "toit": {
      "nb_panneaux": 3,
      "longueur_panneau_cm": 281.0,
      "aire_brute_m2": 8.43,
      "aire_couverte_m2": 6.71
    },
    "commande_panneaux_m2": 40.0,
    "facteur_chute_pct": 10
  },
  "achats": [
    {
      "poste": "Panneaux sandwich 60 mm (murs)",
      "qte": "27.97 m2 brut (net ~18.68 m2)",
      "note": "Ame PIR. Commander a longueur. Parement laque 2 faces."
    },
    {
      "poste": "Panneaux sandwich 60 mm (toiture)",
      "qte": "3 panneaux de ~2.81 m (8.43 m2 brut)",
      "note": "Profil toiture (nervures) pose dans le sens de la pente, joints longitudinaux a recouvrement."
    },
    {
      "poste": "Rail / lambourde de pied",
      "qte": "~11 m",
      "note": "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle."
    },
    {
      "poste": "Profils d'angle exterieurs",
      "qte": "5 angles x 240.0 m = ~1200 m",
      "note": "L'angle C n'est pas a 90 deg : prevoir profil pliable ou sur-mesure."
    },
    {
      "poste": "Profils d'angle / finition interieurs",
      "qte": "~1200 m",
      "note": "Couvre-joints d'angle interieurs."
    },
    {
      "poste": "Bavette d'egout haut (avant)",
      "qte": "~4 m",
      "note": "Larmier en haut de la face avant."
    },
    {
      "poste": "Bavettes de rive (gauche/droite/coupe)",
      "qte": "~7 m",
      "note": "Rives laterales du toit, avec debord."
    },
    {
      "poste": "Gouttiere + 1 descente",
      "qte": "~4 m + 1 descente",
      "note": "En bas de pente (faces B + C), descente au point bas (coin Bend)."
    },
    {
      "poste": "Vis autoperceuses tete EPDM",
      "qte": "~219 (boite de 300)",
      "note": "Longueur = epaisseur panneau + structure. Rondelle d'etancheite obligatoire."
    },
    {
      "poste": "Chevilles / scellement dalle",
      "qte": "~19",
      "note": "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)."
    },
    {
      "poste": "Porte vitree alu double vitrage",
      "qte": "1 (90x210 cm)",
      "note": "Ouverture vers l'exterieur. Cadre/dormant + seuil + joint."
    },
    {
      "poste": "Ventilation (VMC ou aerateurs hygro)",
      "qte": "1 kit",
      "note": "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)."
    },
    {
      "poste": "Bande comprimee / mousse precomprimee",
      "qte": "~16 m",
      "note": "Etancheite a l'air au pied et au pourtour de la porte."
    },
    {
      "poste": "Bande butyle (joints de panneaux)",
      "qte": "~19 m",
      "note": "Joints longitudinaux et perimetriques."
    },
    {
      "poste": "Mastic PU + primaire anticorrosion",
      "qte": "~5 cartouches + 1 primaire",
      "note": "Cachetage et protection des chants coupes (anticorrosion)."
    },
    {
      "poste": "Peinture de retouche (RAL parement)",
      "qte": "1 aerosol",
      "note": "Retouche des rayures et chants."
    }
  ],
  "porte": {
    "face": "A",
    "largeur_cm": 90,
    "hauteur_cm": 210,
    "position": "droite",
    "marge_bord_cm": 5,
    "type": "porte vitree aluminium double vitrage",
    "ouverture": "vers l'exterieur",
    "role": "acces principal + source principale de lumiere naturelle",
    "_comment": "position = gauche | centre | droite (le long de la face A, cote face D pour 'droite'). marge_bord_cm = retrait depuis le coin."
  },
  "panneau": {
    "epaisseur_mm": 60,
    "ame": "PIR (polyisocyanurate) - bon rapport isolation/epaisseur pour usage habitable",
    "largeur_utile_cm": 100,
    "orientation_murs": "verticale",
    "_comment": "largeur_utile = largeur couverte par panneau apres recouvrement de nervure (souvent 1000 ou 1150 mm selon fabricant)."
  },
  "model3d": {
    "footprint": [
      [
        0.0,
        0.0
      ],
      [
        2.3,
        0.0
      ],
      [
        2.3,
        1.6
      ],
      [
        1.4,
        2.46
      ],
      [
        0.0,
        2.46
      ]
    ],
    "heights": [
      2.4,
      2.4,
      2.237,
      2.15,
      2.15
    ],
    "thickness_m": 0.06,
    "door": {
      "face_index": 0,
      "width_m": 0.9,
      "height_m": 2.1,
      "offset_m": 1.35
    }
  },
  "svg": [
    "plan-sol.svg",
    "plan-toit.svg",
    "facade-A.svg",
    "facade-D.svg",
    "facade-C.svg",
    "facade-B.svg",
    "facade-G.svg"
  ]
};
