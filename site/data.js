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
          "finition": "mur",
          "longueur_cm": 230.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 3,
          "aire_brute_m2": 7.2,
          "rake": false
        },
        {
          "face": "D",
          "libelle": "Droite",
          "finition": "mur",
          "longueur_cm": 160.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.8,
          "rake": true
        },
        {
          "face": "C",
          "libelle": "Coupe",
          "finition": "mur",
          "longueur_cm": 124.5,
          "hauteur_cm": 223.7,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.47,
          "rake": true
        },
        {
          "face": "B",
          "libelle": "Arriere",
          "finition": "mur",
          "longueur_cm": 140.0,
          "hauteur_cm": 215.0,
          "nb_panneaux": 2,
          "aire_brute_m2": 4.3,
          "rake": false
        },
        {
          "face": "G",
          "libelle": "Gauche",
          "finition": "mur",
          "longueur_cm": 246.0,
          "hauteur_cm": 240.0,
          "nb_panneaux": 3,
          "aire_brute_m2": 7.2,
          "rake": true
        }
      ],
      "aire_brute_m2": 27.97,
      "aire_nette_m2": 17.25,
      "ouvertures_deduites_m2": 3.32,
      "total_panneaux": 12
    },
    "toit": {
      "face": "T",
      "libelle": "Toiture",
      "finition": "toit",
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
      "poste": "Panneaux sandwich 60 mm - finition MUR (faces A,D,C,B,G)",
      "qte": "27.97 m2 brut (net ~17.25 m2)",
      "note": "Ame PIR. Parement mural lisse/micro-nervure, laque 2 faces. Commander a longueur."
    },
    {
      "poste": "Panneaux sandwich 60 mm - finition TOIT (face T)",
      "qte": "3 panneaux de ~2.81 m (8.43 m2 brut)",
      "note": "Profil de TOITURE (nervures hautes) pose dans le sens de la pente, recouvrements lateraux vers le bas. Different des panneaux de mur."
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
      "note": "Ouverture vers l'exterieur. Dormant + seuil + joints."
    },
    {
      "poste": "Fenetres double vitrage",
      "qte": "2 : 100x80 all.110 (face D), 90x70 all.115 (face B)",
      "note": "allege = hauteur sous fenetre (cm). Fixe ou oscillo-battant selon besoin. Cadre + appui + joints."
    },
    {
      "poste": "Ventilation (VMC ou aerateurs hygro)",
      "qte": "1 kit",
      "note": "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)."
    },
    {
      "poste": "Bande comprimee / mousse precomprimee",
      "qte": "~22 m",
      "note": "Etancheite a l'air au pied et au pourtour des ouvertures."
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
  "budget": {
    "lignes": [
      {
        "poste": "Panneaux sandwich - mur (brut)",
        "qte": 27.97,
        "unite": "m²",
        "pu_eur": 45,
        "montant_eur": 1259
      },
      {
        "poste": "Panneaux sandwich - toit (brut)",
        "qte": 8.43,
        "unite": "m²",
        "pu_eur": 52,
        "montant_eur": 438
      },
      {
        "poste": "Porte(s) vitree(s)",
        "qte": 1,
        "unite": "u",
        "pu_eur": 700,
        "montant_eur": 700
      },
      {
        "poste": "Fenetre(s)",
        "qte": 2,
        "unite": "u",
        "pu_eur": 260,
        "montant_eur": 520
      },
      {
        "poste": "Profils (angles, rives, rail)",
        "qte": 33.0,
        "unite": "ml",
        "pu_eur": 12,
        "montant_eur": 396
      },
      {
        "poste": "Visserie + etancheite",
        "qte": 1,
        "unite": "forfait",
        "pu_eur": 160,
        "montant_eur": 160
      },
      {
        "poste": "Gouttiere + descente",
        "qte": 1,
        "unite": "forfait",
        "pu_eur": 130,
        "montant_eur": 130
      },
      {
        "poste": "Ventilation (VMC/aerateurs)",
        "qte": 1,
        "unite": "forfait",
        "pu_eur": 350,
        "montant_eur": 350
      }
    ],
    "sous_total_eur": 3953,
    "incertitude_pct": 15.0,
    "total_bas_eur": 3360,
    "total_haut_eur": 4546
  },
  "ouvertures": [
    {
      "id": "porte",
      "type": "porte",
      "face": "A",
      "face_index": 0,
      "largeur_cm": 90.0,
      "hauteur_cm": 210.0,
      "allege_cm": 0.0,
      "start_cm": 135.0,
      "position": "droite",
      "ouverture": "vers l'exterieur",
      "description": "porte vitree aluminium double vitrage"
    },
    {
      "id": "fenetre-droite",
      "type": "fenetre",
      "face": "D",
      "face_index": 1,
      "largeur_cm": 100.0,
      "hauteur_cm": 80.0,
      "allege_cm": 110.0,
      "start_cm": 30.0,
      "position": "centre",
      "ouverture": "",
      "description": "fenetre double vitrage (face droite)"
    },
    {
      "id": "fenetre-arriere",
      "type": "fenetre",
      "face": "B",
      "face_index": 3,
      "largeur_cm": 90.0,
      "hauteur_cm": 70.0,
      "allege_cm": 115.0,
      "start_cm": 25.0,
      "position": "centre",
      "ouverture": "",
      "description": "fenetre double vitrage (face arriere)"
    }
  ],
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
    "roof_overhang_m": 0.16,
    "roof_front_m": 2.4,
    "roof_slope": 0.10163,
    "openings": [
      {
        "type": "porte",
        "face_index": 0,
        "offset_m": 1.35,
        "width_m": 0.9,
        "height_m": 2.1,
        "sill_m": 0.0
      },
      {
        "type": "fenetre",
        "face_index": 1,
        "offset_m": 0.3,
        "width_m": 1.0,
        "height_m": 0.8,
        "sill_m": 1.1
      },
      {
        "type": "fenetre",
        "face_index": 3,
        "offset_m": 0.25,
        "width_m": 0.9,
        "height_m": 0.7,
        "sill_m": 1.15
      }
    ]
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
window.SHED_PARAMS_TEXT = "{\n  \"_comment\": \"Source unique de verite du projet d'abri de jardin. Toutes les cotes sont en centimetres sauf indication contraire. Modifiez ces valeurs puis relancez `python3 scripts/generate.py` pour regenerer plans, debit et liste d'achats.\",\n  \"projet\": {\n    \"nom\": \"Abri de jardin - panneaux sandwich\",\n    \"description\": \"Petit abri/bureau de jardin a 5 faces (carre avec un coin coupe) sur dalle beton existante.\",\n    \"auteur\": \"Remi Vion\"\n  },\n  \"emprise_cm\": {\n    \"_comment\": \"Pentagone : faces A (avant), G (gauche), D (droite), B (arriere), C (coin coupe entre arriere et droite). Mesures relevees sur la dalle existante.\",\n    \"gauche_G\": 246,\n    \"avant_A\": 230,\n    \"droite_D_jusqu_coupe\": 160,\n    \"arriere_B_jusqu_coupe\": 140\n  },\n  \"panneau\": {\n    \"epaisseur_mm\": 60,\n    \"ame\": \"PIR (polyisocyanurate) - bon rapport isolation/epaisseur pour usage habitable\",\n    \"largeur_utile_cm\": 100,\n    \"orientation_murs\": \"verticale\",\n    \"_comment\": \"largeur_utile = largeur couverte par panneau apres recouvrement de nervure (souvent 1000 ou 1150 mm selon fabricant).\"\n  },\n  \"murs\": {\n    \"hauteur_avant_cm\": 240,\n    \"_comment\": \"Hauteur au point le plus haut (egout avant). Le toit descend ensuite vers l'arriere.\"\n  },\n  \"toit\": {\n    \"pente_chute_cm\": 25,\n    \"draine_vers\": \"arriere_B\",\n    \"debord_cm\": { \"avant\": 15, \"arriere\": 20, \"gauche\": 15, \"droite\": 15, \"coupe\": 15 },\n    \"_comment\": \"pente_chute = denivele total de l'avant vers l'arriere. Porte a 25 cm sur ~2,46 m = ~10% (~5,8 deg) : dans la plage admise par la plupart des panneaux de toiture. Le brief initial demandait ~10 cm (~4%) mais c'etait sous le minimum usuel ; valeur relevee apres confirmation. Verifier la mini exacte du fabricant.\"\n  },\n  \"ouvertures\": [\n    {\n      \"id\": \"porte\",\n      \"type\": \"porte\",\n      \"face\": \"A\",\n      \"largeur_cm\": 90,\n      \"hauteur_cm\": 210,\n      \"allege_cm\": 0,\n      \"position\": \"droite\",\n      \"marge_bord_cm\": 5,\n      \"ouverture\": \"vers l'exterieur\",\n      \"description\": \"porte vitree aluminium double vitrage\"\n    },\n    {\n      \"id\": \"fenetre-droite\",\n      \"type\": \"fenetre\",\n      \"face\": \"D\",\n      \"largeur_cm\": 100,\n      \"hauteur_cm\": 80,\n      \"allege_cm\": 110,\n      \"position\": \"centre\",\n      \"description\": \"fenetre double vitrage (face droite)\"\n    },\n    {\n      \"id\": \"fenetre-arriere\",\n      \"type\": \"fenetre\",\n      \"face\": \"B\",\n      \"largeur_cm\": 90,\n      \"hauteur_cm\": 70,\n      \"allege_cm\": 115,\n      \"position\": \"centre\",\n      \"description\": \"fenetre double vitrage (face arriere)\"\n    }\n  ],\n  \"_ouvertures_comment\": \"Liste des ouvertures (porte + fenetres). type = porte|fenetre. face = A|D|C|B|G. allege_cm = hauteur du bas de l'ouverture / sol (0 pour une porte). position = gauche|centre|droite (+ marge_bord_cm). Tout est deduit du debit, dessine sur les plans/elevations et rendu en 3D.\",\n  \"divers\": {\n    \"facteur_chute_pct\": 10,\n    \"_comment\": \"Marge de perte/chute appliquee aux quantites de panneaux pour la commande.\"\n  },\n  \"prix_indicatifs_eur\": {\n    \"_comment\": \"Prix INDICATIFS a confirmer (HT, fourchette large). Modifiables : le widget budget du site se recalcule.\",\n    \"panneau_mur_m2\": 45,\n    \"panneau_toit_m2\": 52,\n    \"porte_vitree\": 700,\n    \"fenetre\": 260,\n    \"profils_ml\": 12,\n    \"visserie_etancheite_forfait\": 160,\n    \"gouttiere_descente_forfait\": 130,\n    \"ventilation_forfait\": 350,\n    \"incertitude_pct\": 15\n  }\n}\n";
