// Genere par scripts/build.mjs - parametres par defaut pour l'app.
window.SHED_PARAMS = {
  "_comment": "Source unique de verite du projet d'abri de jardin. Toutes les cotes sont en centimetres sauf indication contraire. Le site recalcule tout en direct (TypeScript) ; pour regenerer les artefacts versionnes : npm run build && npm run emit.",
  "projet": {
    "nom": "Abri de jardin - panneaux sandwich",
    "description": "Petit abri/bureau de jardin rectangulaire (4 faces) en panneaux sandwich 60 mm autoportants, toit mono-pente, une seule porte vitree, sur dalle beton existante.",
    "auteur": "Remi Vion"
  },
  "emprise_cm": {
    "_comment": "Rectangle : A = largeur (face avant), G = profondeur (face gauche). Faces A (avant), D (droite), B (arriere), G (gauche). Par defaut = bbox de la dalle ; le coin arriere-droit depasse alors de la dalle (voir dalle_cm et vigilance).",
    "avant_A": 230,
    "gauche_G": 246
  },
  "dalle_cm": {
    "_comment": "Dalle REELLE deja coulee (coin arriere-droit coupe). Sert uniquement a verifier que l'emprise tient dessus : le site calcule la partie hors dalle.",
    "gauche": 246,
    "avant": 230,
    "droite_jusqu_coupe": 160,
    "arriere_jusqu_coupe": 140
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
    "pente_chute_cm": 25,
    "draine_vers": "arriere_B",
    "debord_cm": {
      "avant": 15,
      "arriere": 20,
      "gauche": 15,
      "droite": 15
    },
    "_comment": "pente_chute = hauteur de la rehausse a l'avant = denivele avant -> arriere. 25 cm sur 2,46 m = ~10% (~5,8 deg), dans la plage admise par la plupart des panneaux de toiture (verifier le mini du fabricant). La rehausse = 1 bande G x chute coupee en diagonale (2 triangles, faces G et D) + 1 bande A x chute (bandeau avant)."
  },
  "porte": {
    "face": "A",
    "largeur_cm": 90,
    "hauteur_cm": 210,
    "position": "droite",
    "marge_bord_cm": 5,
    "ouverture": "vers l'exterieur",
    "description": "porte vitree aluminium double vitrage - seule ouverture, source principale de lumiere",
    "_comment": "Seule ouverture du projet (pas de fenetre pour l'instant). position = gauche|centre|droite sur la face (+ marge_bord_cm)."
  },
  "divers": {
    "facteur_chute_pct": 10,
    "_comment": "Marge de perte/chute appliquee aux quantites de panneaux pour la commande."
  },
  "prix_indicatifs_eur": {
    "_comment": "Prix INDICATIFS a confirmer (HT, fourchette large). Modifiables : le widget budget du site se recalcule.",
    "panneau_mur_m2": 45,
    "panneau_toit_m2": 52,
    "porte_vitree": 700,
    "profils_ml": 12,
    "visserie_etancheite_forfait": 160,
    "gouttiere_descente_forfait": 130,
    "ventilation_forfait": 350,
    "incertitude_pct": 15
  }
};
