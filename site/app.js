// site/src/chantier.ts
var rnd = (x, nd = 0) => {
  const k = Math.pow(10, nd);
  return Math.round(x * k) / k;
};
var fr = (x) => String(x).replace(".", ",");
var fz = (x) => fr(rnd(x, 1));
var haut = (n) => Math.ceil(n - 1e-9);
function bords_toit(m) {
  const c = m.toit.contour, n = c.length, droite = m.sens === "droite";
  let egout = 0, hautc = 0, rive = 0;
  for (let i = 0; i < n; i++) {
    const a = c[i], b = c[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l, k = droite ? nx : ny;
    if (k > 0.2) egout += l;
    else if (k < -0.2) hautc += l;
    else rive += l;
  }
  return { egout_m: egout / 100, haut_m: hautc / 100, rive_m: rive / 100 };
}
function nomenclature_abri(p, v, m) {
  const prix = p.prix_materiaux_eur_ttc || {}, d = p.disposition_trapeze || {}, t = d.toit || {};
  const mod = +p.panneau.largeur_utile_cm / 100, H = m.hauteur_mur_cm / 100, ep = +p.panneau.epaisseur_mm;
  const perim = m.faces.reduce((s, f) => s + f.longueur_cm, 0) / 100;
  const n_murs = m.panneaux_mur_a_commander, n_toit = m.toit.panneaux.length;
  const toit_m2 = m.toit.panneaux.reduce((s, x) => s + mod * x.longueur_cm / 100, 0);
  const joints_murs = m.faces.reduce((s, f) => s + Math.max(0, f.panneaux.length - 1), 0);
  const angles_droits = m.angles_deg.map((g, i) => ({ g, h: m.hauteurs_coins_cm[i] / 100 })).filter((x) => Math.abs(x.g - 90) < 0.5);
  const angles_speciaux = m.angles_deg.map((g, i) => ({ g, h: m.hauteurs_coins_cm[i] / 100 })).filter((x) => Math.abs(x.g - 90) >= 0.5);
  const B = bords_toit(m), G = m.toit.gouttiere, po = v.porte, fen = v.fenetres || [];
  const ouv_perim = (po ? 2 * po.hauteur_cm + po.largeur_cm : 0) / 100 + fen.reduce((s, f) => s + 2 * (f.largeur_cm + f.hauteur_cm), 0) / 100;
  const panne = t.panne_intermediaire ? m.faces[0].longueur_cm / 100 : 0;
  const appuis_toit = 2 + (panne ? 1 : 0);
  const aire = v.aire_interieure_m2, pl = p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif;
  const h_descente = Math.min(...m.hauteurs_coins_cm) / 100;
  const lignes = [];
  const pose = (groupe, cle, poste, qte, regle, optionnel = false) => {
    const e = prix[cle] || {}, pu = +e.pu || 0, q = rnd(qte, 2);
    if (q <= 0) return;
    lignes.push({ groupe, poste, qte: q, unite: e.unite || "u", pu_eur: pu, montant_eur: rnd(q * pu), regle, a_confirmer: !e.source || !!e.incertain, source: e.source || "", note: e.note || "", optionnel });
  };
  pose("Panneaux", "panneau_mur_m2", `Panneaux sandwich de mur ${ep} mm, ${fz(mod * 100)} \xD7 ${fz(H * 100)} cm`, n_murs * mod * H, `${n_murs} panneaux entiers \xE0 commander (les bandes recoup\xE9es sortent des chutes)`);
  pose("Panneaux", "panneau_toit_m2", `Panneaux sandwich de toiture ${ep} mm, nervur\xE9s, teinte claire`, toit_m2, `${n_toit} panneaux coup\xE9s \xE0 longueur : ${m.toit.panneaux.map((x) => `${x.id} ${fz(x.longueur_cm)} cm`).join(", ")}`);
  pose("Bois", "madrier_ml", `Madrier ${m.rehausse.section_mm.join(" \xD7 ")} classe 4 (rehausse, lisse haute)`, m.rehausse.nb_madriers * m.rehausse.longueur_stock_cm / 100, `${m.rehausse.nb_madriers} pi\xE8ce(s) de ${fz(m.rehausse.longueur_stock_cm)} cm`);
  if (panne) pose("Bois", "panne_ml", "Panne interm\xE9diaire 75 \xD7 150 classe 4, en travers \xE0 mi-profondeur", panne, `port\xE9e du toit ${fz(m.portee_cm / 100)} m : une panne de la longueur de la fa\xE7ade la ram\xE8ne \xE0 ${fz(m.portee_cm / 200)} m`);
  if (po) pose("Bois", "chevron_cadre_ml", `Bois du cadre de porte, section ${fz(po.chambranle_cm * 10)} \xD7 ${ep} mm`, (2 * (po.hauteur_cm + po.chambranle_cm) + po.largeur_cm) / 100, "deux montants + une traverse haute");
  pose("Profils et bavettes", "profil_pied_ml", "Profil de d\xE9part en U (rail de pied)", perim - (po ? (po.largeur_cm + 2 * po.chambranle_cm) / 100 : 0), "p\xE9rim\xE8tre des murs moins le cadre de la porte");
  pose("Profils et bavettes", "angle_standard_ml", "Profils d'angle \xE0 90\xB0, ext\xE9rieur + int\xE9rieur", 2 * angles_droits.reduce((s, x) => s + x.h, 0), `${angles_droits.length} angles droits, hauteur finie de chaque coin, deux faces`);
  pose("Profils et bavettes", "angle_sur_mesure_ml", `Profils d'angle pli\xE9s sur mesure (${[...new Set(angles_speciaux.map((x) => fr(x.g) + "\xB0"))].join(", ")}), ext\xE9rieur + int\xE9rieur`, 2 * angles_speciaux.reduce((s, x) => s + x.h, 0), `${angles_speciaux.length} angles non droits, deux faces`);
  pose("Profils et bavettes", "bande_rive_ml", "Bandes de rive de toit", B.rive_m, "bords du toit parall\xE8les \xE0 la pente");
  pose("Profils et bavettes", "bandeau_haut_ml", "Bavette de t\xEAte (bord haut du toit)", B.haut_m, "bord haut du toit");
  pose("Profils et bavettes", "closoir_ml", "Closoirs mousse sous les nervures", B.egout_m + B.haut_m, "bord haut + bord d'\xE9gout");
  pose("Fixations", "vis_toit_100", "Vis autoperceuses de toiture \xE0 rondelle, longues (panneau + nervure dans le bois)", haut(n_toit * appuis_toit * 4 / 100 * 1.1 * 100) / 100, `${n_toit} panneaux \xD7 ${appuis_toit} appuis \xD7 4 vis, +10 %`);
  pose("Fixations", "vis_couture_100", "Vis de couture (recouvrements de panneaux, bavettes, profils)", haut(((n_toit - 1) * (m.portee_cm / 100) / 0.4 + (perim + B.rive_m + B.haut_m) / 0.3) * 1.1) / 100, "un recouvrement tous les 40 cm, une bavette tous les 30 cm, +10 %");
  pose("Fixations", "vis_mur_100", "Vis autoperceuses de panneaux de mur (pied et t\xEAte)", haut(n_murs * 2 * 3 * 1.1) / 100, `${n_murs} panneaux \xD7 2 extr\xE9mit\xE9s \xD7 3 vis, +10 %`);
  pose("Fixations", "cheville_beton_u", "Chevilles ou goujons pour fixer le rail dans la dalle", haut(perim / 0.5) + 2, "une tous les 50 cm");
  pose("\xC9tanch\xE9it\xE9", "bande_arase_ml", "Bande d'arase sous le rail de pied", perim, "p\xE9rim\xE8tre des murs");
  pose("\xC9tanch\xE9it\xE9", "butyle_ml", "Bande butyle (joints de panneaux, t\xEAte de mur sous la rehausse)", joints_murs * H + perim + (n_toit - 1) * m.portee_cm / 100, `${joints_murs} joints de mur \xD7 ${fz(H)} m + p\xE9rim\xE8tre + recouvrements de toit`);
  pose("\xC9tanch\xE9it\xE9", "mastic_cartouche", "Mastic polyur\xE9thane ou MS polym\xE8re, cartouches", haut((perim * 2 + ouv_perim) / 8), "une cartouche pour 8 m de cordon : pied de mur dedans et dehors, tour des ouvertures");
  pose("\xC9tanch\xE9it\xE9", "bande_comprimee_ml", "Bande comprim\xE9e au pourtour des ouvertures", ouv_perim, "tour de la porte et des fen\xEAtres");
  pose("\xC9tanch\xE9it\xE9", "mousse_pu_u", "Mousse polyur\xE9thane expansive, bombes", 2, "calfeutrement des ouvertures et des angles");
  if (po) pose("Ouvertures", po.vitree === false ? "porte_pleine_u" : "porte_vitree_u", `Porte de service ${po.vitree === false ? "pleine isol\xE9e" : "vitr\xE9e"} ${fz(po.largeur_cm)} \xD7 ${fz(po.hauteur_cm)} cm, avec dormant`, 1, "une porte");
  pose("Ouvertures", "fenetre_fixe_u", `Fen\xEAtre fixe PVC double vitrage ${fen[0] ? `${fz(fen[0].largeur_cm)} \xD7 ${fz(fen[0].hauteur_cm)}` : ""} cm`, fen.filter((f) => !f.ouvrant).length, "fen\xEAtres fixes");
  pose("Ouvertures", "fenetre_ob_u", `Fen\xEAtre oscillo-battante PVC double vitrage ${fen[0] ? `${fz(fen[0].largeur_cm)} \xD7 ${fz(fen[0].hauteur_cm)}` : ""} cm`, fen.filter((f) => f.ouvrant).length, "fen\xEAtres ouvrantes");
  pose("Eaux pluviales", "gouttiere_ml", "Goutti\xE8re demi-ronde", G.longueur_cm / 100, `${G.troncons.length} tron\xE7on(s) : ${G.troncons.map((x) => `${x.face} ${fz(x.longueur_cm)} cm`).join(" + ")}`);
  pose("Eaux pluviales", "gouttiere_crochet_u", "Crochets de goutti\xE8re", haut(G.longueur_cm / 100 / 0.5) + 1, "un tous les 50 cm");
  pose("Eaux pluviales", "gouttiere_accessoires_u", "Naissance, fonds, angle, coudes et colliers (lot)", 1, `${G.troncons.length > 1 ? "un angle, " : ""}une naissance, deux fonds, deux coudes, deux colliers`);
  pose("Eaux pluviales", "descente_ml", "Tuyau de descente", h_descente + (t.descente === "droite" && m.sens !== "droite" ? m.faces[1].longueur_cm / 100 : 0), t.descente === "droite" && m.sens !== "droite" ? "hauteur du mur + le retour au sol le long du mur droit jusqu'au jardin" : "hauteur du mur c\xF4t\xE9 \xE9gout");
  if (pl) {
    pose("Plancher isol\xE9", "lambourde_ml", "Lambourdes trait\xE9es (entraxe 40 cm)", haut(aire / 0.4 * 1.1), "surface int\xE9rieure \xF7 0,40 m, +10 %");
    pose("Plancher isol\xE9", "isolant_sol_m2", "Isolant rigide 40 mm entre lambourdes", aire * 1.05, "surface int\xE9rieure, +5 %");
    pose("Plancher isol\xE9", "film_pe_m2", "Film poly\xE9thyl\xE8ne sous le plancher", aire * 1.15, "surface int\xE9rieure, +15 % de recouvrements");
    pose("Plancher isol\xE9", "osb_m2", "Dalles OSB3 18 mm rainur\xE9es", aire * 1.1, "surface int\xE9rieure, +10 % de chutes");
    pose("Plancher isol\xE9", "revetement_sol_m2", "Rev\xEAtement de sol (vinyle ou stratifi\xE9)", aire * 1.1, "surface int\xE9rieure, +10 % de chutes");
  }
  pose("\xC9quipement (optionnel)", "aerateur_u", "Grilles ou entr\xE9es d'air murales", 2, "une basse, une haute, sur deux murs oppos\xE9s", true);
  pose("\xC9quipement (optionnel)", "goulotte_u", "Goulotte \xE9lectrique 2 m", haut(perim / 2 / 2), "la moiti\xE9 du p\xE9rim\xE8tre, en longueurs de 2 m", true);
  pose("\xC9quipement (optionnel)", "multiprise_u", "Multiprise parafoudre", 1, "sur le c\xE2ble d\xE9j\xE0 en place", true);
  pose("\xC9quipement (optionnel)", "eclairage_u", "R\xE9glette ou plafonnier LED", 1, "un point lumineux", true);
  pose("\xC9quipement (optionnel)", "radiateur_u", "Radiateur panneau 750 W \xE0 thermostat", 1, "bureau chauff\xE9 toute l'ann\xE9e", true);
  pose("\xC9quipement (optionnel)", "store_u", "Stores des fen\xEAtres de fa\xE7ade", fen.length, "un par fen\xEAtre", true);
  pose("Consommables", "lame_metal_u", "Lame de scie circulaire pour m\xE9tal (coupe \xE0 froid des panneaux)", 1, "jamais de meuleuse : elle br\xFBle le laquage et la mousse");
  const groupes = [...new Set(lignes.map((l) => l.groupe))].map((nom) => ({ nom, total_eur: rnd(lignes.filter((l) => l.groupe === nom).reduce((s, l) => s + l.montant_eur, 0)), optionnel: lignes.filter((l) => l.groupe === nom).every((l) => l.optionnel) }));
  const materiaux = rnd(lignes.filter((l) => !l.optionnel).reduce((s, l) => s + l.montant_eur, 0)), options = rnd(lignes.filter((l) => l.optionnel).reduce((s, l) => s + l.montant_eur, 0));
  const plancher = rnd(lignes.filter((l) => l.groupe === "Plancher isol\xE9").reduce((s, l) => s + l.montant_eur, 0));
  const inc = prix.incertitude_pct == null ? 15 : +prix.incertitude_pct;
  return {
    ttc: true,
    lignes,
    groupes,
    materiaux_eur: materiaux,
    options_eur: options,
    a_confirmer: lignes.filter((l) => l.a_confirmer).length,
    hors_materiaux: prix.livraison_panneaux ? [{ poste: "Livraison des panneaux (service, hors total)", montant_eur: +prix.livraison_panneaux.pu || 0, note: prix.livraison_panneaux.note || "" }] : [],
    // memes champs que l'ancien budget, pour les tableaux compares : le total ne compte que les materiaux
    coque_eur: rnd(materiaux - plancher),
    amenagement_eur: plancher,
    total_eur: materiaux,
    incertitude_pct: inc,
    total_bas_eur: rnd(materiaux * (1 - inc / 100)),
    total_haut_eur: rnd(materiaux * (1 + inc / 100))
  };
}
function guide_montage(p, v, m) {
  const d = p.disposition_trapeze || {}, t = d.toit || {}, mod = +p.panneau.largeur_utile_cm, ep = +p.panneau.epaisseur_mm / 10;
  const limite = (p.dalle_cm && p.dalle_cm.grillages || []).includes("gauche") ? "grillage de la limite" : "mur de propri\xE9t\xE9";
  const F = Object.fromEntries(m.faces.map((f) => [f.cle, f])), n = m.faces.length, po = v.porte, fen = v.fenetres || [];
  const gauche = Math.min(...v.polygone.map((z) => z[0])), avant = Math.min(...v.polygone.map((z) => z[1]));
  const perim = m.faces.reduce((s, f) => s + f.longueur_cm, 0) / 100, G = m.toit.gouttiere;
  const bande = (f) => f.panneaux.find((x) => x.largeur_cm < mod - 0.05);
  const liste = (f) => f.panneaux.map((x) => `${x.id} (${fz(x.largeur_cm)})`).join(", ");
  const diag = (a, b) => fz(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const q = v.polygone, speciaux = [...new Set(m.angles_deg.filter((g) => Math.abs(g - 90) >= 0.5).map((g) => fr(g) + "\xB0"))];
  const face_porte = po ? m.faces[po.cote] : null, passage = v.passages.find((x) => x.cote === "arriere_droite");
  const vers = m.sens === "droite" ? "la droite (jardin)" : "le fond";
  const avantTout = [
    `Faire confirmer par le fournisseur la **largeur utile** des panneaux (${fz(mod)} cm ici, la largeur de tous les panneaux de 60 mm relev\xE9s) : tout le calepinage en d\xE9pend.`,
    "**Acheter des panneaux en petite quantit\xE9 est le vrai sujet.** Les vendeurs en ligne les moins chers imposent 100 m\xB2 ou un paquet entier de panneaux de 6 \xE0 7,5 m. Demander un devis \xAB coup\xE9 \xE0 longueur, petite quantit\xE9 \xBB \xE0 deux sp\xE9cialistes et \xE0 un n\xE9goce local, qui vend au panneau mais plus cher. Sinon acheter des longueurs de stock et les recouper sur place : compter alors plus de surface que le d\xE9bit.",
    `Rehausse : le madrier ${m.rehausse.section_mm.join(" \xD7 ")} ne se trouve en stock qu'en **classe 2**. En **classe 4** la section courante est 70 \xD7 220, en 4 m ou 4,5 m : la prendre (la chute du toit perd 5 mm, sans cons\xE9quence) ou prot\xE9ger un classe 2 par la bavette.`,
    "Fen\xEAtres : 80 \xD7 80 n'est pas une taille de stock (sur mesure, 4 \xE0 5 semaines). En stock il existe du 80 de large \xD7 75 ou 105 de haut. Porte : le bloc de service plein 205 \xD7 80 avec dormant est un article de stock.",
    `Faire confirmer la **port\xE9e** admise du panneau de toit de ${fz(ep)} cm : ${fz(m.portee_cm / 100)} m ici${t.panne_intermediaire ? `, ramen\xE9e \xE0 ${fz(m.portee_cm / 200)} m par la panne interm\xE9diaire` : ""} ; et la **pente minimale** (${fr(m.pente.pourcent)} % ici ; ArcelorMittal admet 5 % pour des panneaux d'une seule longueur, sans p\xE9n\xE9tration ni recouvrement en bout).`,
    `Commander les panneaux de toit **coup\xE9s \xE0 longueur**, et les profils des angles de ${speciaux.join(" et ") || "90\xB0"} **pli\xE9s sur mesure**, en m\xEAme temps que les panneaux.`,
    `V\xE9rifier au PLU la r\xE8gle d'implantation (l'abri est \xE0 ${fz(gauche)} cm de la limite).`,
    "Pr\xE9voir deux personnes pour lever les murs et poser le toit, et une journ\xE9e sans vent : un panneau de 2 m\xB2 est une voile."
  ];
  const outillage = [
    "Scie circulaire avec **lame pour m\xE9tal** (coupe \xE0 froid) et rail de guidage ; scie sauteuse lame m\xE9tal pour les angles des ouvertures. **Pas de meuleuse** : elle br\xFBle le laquage et la mousse, et ses \xE9tincelles piquent la t\xF4le.",
    "Visseuse \xE0 choc avec douilles 8 mm, perforateur et foret b\xE9ton, cordeau \xE0 tracer, m\xE8tre de 5 m, niveau de 1,20 m ou laser, grande \xE9querre, fil \xE0 plomb.",
    "Pistolet \xE0 mastic, cutter, serre-joints, 4 \xE9tais ou chevrons pour tenir les murs pendant le montage, \xE9chelle ou escabeau stable.",
    "Gants anti-coupure, lunettes, protection auditive. Les rives de t\xF4le coupent."
  ];
  const etapes = [
    {
      titre: "Tracer l'abri sur la dalle",
      but: "Tout le reste s'aligne sur ce trac\xE9 : dix minutes de plus ici \xE9vitent un mur qui ne ferme pas.",
      outils: ["cordeau", "m\xE8tre", "grande \xE9querre"],
      faire: [
        `Tracer la fa\xE7ade \xE0 ${fz(avant)} cm du bord avant de la dalle et le mur gauche \xE0 ${fz(gauche)} cm du bord gauche.`,
        `Reporter les ${n} murs dans l'ordre : ${m.faces.map((f) => `${f.cle} ${fr(f.longueur_cm)} cm`).join(", ")}.`,
        `Angles, dans le m\xEAme ordre : ${m.angles_deg.map((g) => fr(g) + "\xB0").join(", ")}.`
      ],
      controler: [`Diagonales du trac\xE9 : coin avant gauche \u2192 haut du mur droit = ${diag(q[0], q[2])} cm ; coin avant droit \u2192 coin arri\xE8re gauche = ${diag(q[1], q[n - 1])} cm.`, `Passage derri\xE8re l'abri : ${fr(passage.cm)} cm au plus \xE9troit, \xE0 mesurer une fois le trac\xE9 fait.`]
    },
    {
      titre: "Poser le rail de pied",
      but: "Le rail tient le pied des panneaux et les isole de l'eau de la dalle.",
      outils: ["perforateur", "visseuse", "niveau"],
      faire: [`D\xE9rouler la bande d'arase sur le trac\xE9 (${fr(rnd(perim, 2))} m), poser le profil en U dessus, **nu ext\xE9rieur du rail sur le trait**.`, "Cheviller tous les 50 cm, et \xE0 10 cm de chaque angle.", po ? `Interrompre le rail sur la largeur du cadre de la porte (${fz(po.largeur_cm + 2 * po.chambranle_cm)} cm, face ${face_porte.cle}).` : "", "Cordon de mastic continu entre le rail et la dalle, c\xF4t\xE9 ext\xE9rieur."].filter(Boolean),
      controler: ["Rail de niveau : caler si la dalle a plus de 5 mm de faux niveau sur un mur.", "Angles du rail conformes au trac\xE9 avant de cheviller le dernier mur."]
    },
    {
      titre: "Pr\xE9parer toutes les coupes \xE0 plat",
      but: "Un panneau se coupe bien sur tr\xE9teaux, mal une fois debout.",
      outils: ["scie circulaire lame m\xE9tal", "rail de guidage", "scie sauteuse"],
      faire: [
        `Bandes de mur : ${m.faces.map((f) => bande(f)).filter(Boolean).map((x) => `${x.id} ${fz(x.largeur_cm)} cm`).join(", ") || "aucune"}. Couper dans la longueur, face laqu\xE9e vers le bas, et garder les chutes : elles fournissent les autres bandes.`,
        `Fen\xEAtres : ${fen.map((f) => `${fz(f.largeur_cm)} \xD7 ${fz(f.hauteur_cm)} cm, bas \xE0 ${fz(f.allege_cm)} cm`).join(" ; ")}, une par panneau, jamais sur un joint. Percer les quatre angles, puis couper \xE0 la scie sauteuse.`,
        `Toit : ${m.toit.panneaux.filter((x) => x.biais).map((x) => x.id).join(", ") || "aucun panneau"} \xE0 couper en biais d'apr\xE8s le plan de toiture.`,
        `Rehausse : ${m.rehausse.pieces.map((r) => `${r.id} (mur ${r.face}, ${fr(r.L)} cm, ${fr(r.h0)} \u2192 ${fr(r.h1)} cm)`).join(", ")}, tir\xE9es de ${m.rehausse.nb_madriers} madrier(s) selon le plan de d\xE9bit.`
      ],
      controler: ["Retirer le film de protection des panneaux au fur et \xE0 mesure : apr\xE8s quelques semaines au soleil il ne part plus.", "\xC9bavurer chaque coupe et passer une retouche de peinture sur la t\xF4le mise \xE0 nu."]
    },
    {
      titre: `Monter le mur gauche \xE0 plat, puis le lever`,
      but: `\xC0 ${fz(gauche)} cm du ${limite} aucune visseuse ne passe : ce mur se fait au sol.`,
      outils: ["visseuse", "serre-joints", "2 personnes", "\xE9tais"],
      faire: [`Assembler ${F.G ? liste(F.G) : ""} \xE0 plat, butyle dans chaque joint, et visser dessus leur pi\xE8ce de rehausse.`, F.G && bande(F.G) ? `Placer la bande de ${fz(bande(F.G).largeur_cm)} cm c\xF4t\xE9 fa\xE7ade, la seule extr\xE9mit\xE9 qu'on atteindra ensuite.` : "", "Lever le mur \xE0 deux, l'engager dans le rail, le tenir par deux \xE9tais viss\xE9s dans la rehausse.", "Visser le pied dans le rail depuis l'int\xE9rieur."].filter(Boolean),
      controler: ["Aplomb dans les deux sens avant de l\xE2cher les \xE9tais.", `Vide de ${fz(gauche)} cm r\xE9gulier sur toute la longueur.`]
    },
    {
      titre: "Monter les autres murs",
      but: "On tourne dans un seul sens pour que chaque panneau s'embo\xEEte dans le pr\xE9c\xE9dent.",
      outils: ["visseuse", "niveau", "\xE9tais"],
      faire: [
        ...m.faces.filter((f) => f.cle !== "G").reverse().map((f) => `Mur ${f.cle} (${f.cle === "A" ? "fa\xE7ade" : f.nom}, ${fr(f.longueur_cm)} cm) : ${liste(f)}${f === face_porte ? ", en laissant le vide du cadre de porte" : ""}.`),
        "Butyle dans chaque embo\xEEtement, panneau serr\xE9 contre le pr\xE9c\xE9dent, viss\xE9 au pied dans le rail.",
        "\xC9tayer chaque mur tant que la rehausse n'est pas pos\xE9e : avant elle, rien ne tient les t\xEAtes."
      ],
      controler: ["Aplomb de chaque panneau avant de visser le suivant : l'erreur se cumule.", `T\xEAtes de murs toutes \xE0 ${fz(m.hauteur_mur_cm)} cm, \xE0 3 mm pr\xE8s, au niveau laser.`]
    },
    {
      titre: "Fermer les angles",
      but: "Les profils d'angle lient deux murs et ferment la mousse.",
      outils: ["visseuse", "mastic"],
      faire: [`Profil ext\xE9rieur puis int\xE9rieur \xE0 chacun des ${n} angles, viss\xE9 tous les 30 cm (vis de couture), mastic sous les deux ailes.`, speciaux.length ? `Les angles de ${speciaux.join(" et ")} re\xE7oivent les profils pli\xE9s sur mesure : les pr\xE9senter \xE0 blanc avant de percer.` : "", "Bourrer le vide de l'angle \xE0 la mousse avant de fermer le profil int\xE9rieur."].filter(Boolean),
      controler: ["Aucun jour entre profil et panneau : c'est l\xE0 que l'air et l'eau entrent."]
    },
    {
      titre: "Poser la rehausse bois",
      but: "Elle donne la pente au toit et sert de lisse haute : c'est elle qui tient les murs entre eux.",
      outils: ["visseuse", "serre-joints"],
      faire: [`Poser ${m.rehausse.pieces.map((r) => `${r.id} sur ${r.face}`).join(", ")}, sur un cordon de butyle en t\xEAte de panneaux.`, "Visser la rehausse dans la t\xF4le des deux faces de chaque panneau, tous les 40 cm.", "Assembler les pi\xE8ces entre elles aux angles par deux longues vis en biais."],
      controler: [`Hauteurs finies des coins : ${m.hauteurs_coins_cm.map((h2) => fr(h2)).join(" \xB7 ")} cm (dans l'ordre des coins, \xE0 partir du coin avant gauche).`, "Dessus de la rehausse dans un m\xEAme plan : poser une r\xE8gle d'un mur \xE0 l'autre."]
    },
    ...t.panne_intermediaire ? [{
      titre: "Poser la panne interm\xE9diaire",
      but: `Le toit porte sur ${fz(m.portee_cm / 100)} m : une panne en travers ram\xE8ne la port\xE9e \xE0 ${fz(m.portee_cm / 200)} m.`,
      outils: ["visseuse", "niveau"],
      faire: [`Poser un bois de 75 \xD7 150 de ${fz(m.faces[0].longueur_cm)} cm en travers, \xE0 mi-profondeur, du mur gauche au mur droit, port\xE9 par deux sabots ou deux tasseaux viss\xE9s dans la rehausse.`, "R\xE9gler son dessus dans le plan du toit : il est plus bas que la rehausse de fa\xE7ade et plus haut que celle du fond."],
      controler: ["Une r\xE8gle pos\xE9e de la fa\xE7ade au fond touche la panne sans la forcer."]
    }] : [],
    {
      titre: "Couvrir",
      but: `Nervures dans le sens de la pente, vers ${vers} : l'eau ne quitte le toit que par le bas des panneaux.`,
      outils: ["visseuse", "2 personnes", "\xE9chelle"],
      faire: [
        `Poser ${m.toit.panneaux.map((x) => `${x.id} (${fz(x.largeur_cm)} \xD7 ${fz(x.longueur_cm)} cm)`).join(", ")}, en commen\xE7ant du c\xF4t\xE9 oppos\xE9 aux vents dominants.`,
        "Closoirs mousse sous les nervures, en haut et en bas, avant de visser.",
        `Visser dans la rehausse${t.panne_intermediaire ? " et dans la panne" : ""} par le sommet des nervures, vis longues \xE0 rondelle, quatre par panneau et par appui. Serrer jusqu'\xE0 \xE9craser la rondelle, pas plus.`,
        "Recouvrements entre panneaux : butyle, puis vis de couture tous les 40 cm.",
        "Bandes de rive sur les bords parall\xE8les \xE0 la pente, bavette de t\xEAte sur le bord haut."
      ],
      controler: [`D\xE9bords : ${fz(m.toit.debord_cm.avant)} cm devant, ${fz(m.toit.debord_cm.arriere)} cm au fond, ${fz(m.toit.debord_cm.droite)} cm \xE0 droite, ${fz(m.toit.debord_cm.gauche)} cm \xE0 gauche.`, "Ne jamais marcher entre deux appuis : marcher au droit des murs, sur une planche."]
    },
    {
      titre: "Goutti\xE8re et descente",
      but: "Recueillir toute l'eau du toit et l'emmener au jardin.",
      outils: ["visseuse", "niveau", "scie \xE0 m\xE9taux"],
      faire: [`${fr(G.longueur_cm)} cm de goutti\xE8re en ${G.troncons.length} tron\xE7on(s) : ${G.troncons.map((x) => `${x.face} ${fr(x.longueur_cm)} cm`).join(" + ")}.`, "Crochets tous les 50 cm, pente de 5 mm par m\xE8tre vers la descente.", t.descente === "droite" && m.sens !== "droite" ? "Descente au bout droit de la goutti\xE8re, puis un tuyau au sol le long du mur droit jusqu'au jardin : rien ne doit s'\xE9couler au pied du mur de propri\xE9t\xE9." : "Descente au point bas, \xE9vacu\xE9e loin de la dalle."],
      controler: ["Verser un seau d'eau en haut du toit : tout doit arriver \xE0 la descente."]
    },
    ...po ? [{
      titre: "Poser la porte",
      but: "Le cadre bois reprend la porte : le panneau seul ne porte pas de paumelles.",
      outils: ["visseuse", "niveau", "cales"],
      faire: [`Monter le cadre bois de ${fz(po.largeur_cm + 2 * po.chambranle_cm)} \xD7 ${fz(po.hauteur_cm + po.chambranle_cm)} cm dans le vide du mur ${face_porte.cle}, viss\xE9 dans la dalle en pied et dans la rehausse en t\xEAte.`, `Poser la porte ${po.vitree === false ? "pleine" : "vitr\xE9e"} de ${fz(po.largeur_cm)} \xD7 ${fz(po.hauteur_cm)} cm dans le cadre, ferr\xE9e c\xF4t\xE9 fond, ouvrant vers l'ext\xE9rieur.`, "Bande comprim\xE9e entre dormant et cadre, mastic \xE0 l'ext\xE9rieur, seuil sur cordon de mastic."],
      controler: ["Jeu r\xE9gulier de 3 mm autour du battant, la porte se ferme sans forcer.", "Arr\xEAt de porte \xE0 pr\xE9voir : ouverte, elle prend le vent."]
    }] : [],
    {
      titre: "Poser les fen\xEAtres",
      but: "Une fen\xEAtre se fixe dans la t\xF4le des deux faces, jamais dans la mousse.",
      outils: ["visseuse", "niveau", "cales"],
      faire: [`${fen.length} fen\xEAtre(s) en fa\xE7ade : ${fen.map((f) => `${f.ouvrant ? "oscillo-battante" : "fixe"} de ${fz(f.debut_cm)} \xE0 ${fz(f.debut_cm + f.largeur_cm)} cm`).join(" ; ")}.`, "Habiller la tranche de la d\xE9coupe d'un profil en U ou d'un tasseau, caler la fen\xEAtre, visser par le dormant.", "Bande comprim\xE9e au pourtour, mastic dehors, bavette d'appui sous la fen\xEAtre."],
      controler: ["Niveau et aplomb du dormant avant le serrage final.", "L'ouvrante s'ouvre sans toucher le bureau."]
    },
    {
      titre: "\xC9tanch\xE9it\xE9 g\xE9n\xE9rale",
      but: "L'air qui entre apporte l'humidit\xE9 qui condense sur l'acier.",
      outils: ["pistolet \xE0 mastic", "mousse"],
      faire: ["Cordon de mastic au pied des murs, dedans et dehors.", `Fermer le vide de ${fz(gauche)} cm contre le ${limite} : bavette devant, grillage fin au fond (feuilles, rongeurs), sans bloquer l'\xE9coulement de l'eau.`, "Mousse puis mastic \xE0 chaque travers\xE9e (c\xE2ble, entr\xE9e d'air)."],
      controler: ["De nuit, une lampe allum\xE9e dedans : aucun jour visible de dehors."]
    },
    ...p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? [{
      titre: "Plancher isol\xE9",
      but: "La dalle est froide : le plancher fait le confort des pieds.",
      outils: ["scie", "visseuse"],
      faire: ["Film poly\xE9thyl\xE8ne sur la dalle, remont\xE9 de 10 cm le long des murs.", "Lambourdes tous les 40 cm, cal\xE9es de niveau, isolant rigide de 40 mm entre elles.", "Dalles OSB de 18 mm viss\xE9es, joints d\xE9cal\xE9s, 8 mm de jeu contre les murs ; rev\xEAtement de sol ensuite."],
      controler: [`Hauteur sous plafond apr\xE8s plancher : ${fr(rnd((Math.max(...m.hauteurs_coins_cm) - +p.amenagement.plancher.epaisseur_cm) / 100, 2))} m au plus haut, ${fr(rnd((Math.min(...m.hauteurs_coins_cm) - +p.amenagement.plancher.epaisseur_cm) / 100, 2))} m au plus bas.`]
    }] : [],
    {
      titre: "Ventilation, \xE9lectricit\xE9, am\xE9nagement",
      but: "Une pi\xE8ce \xE9tanche et chauff\xE9e sans ventilation condense.",
      outils: ["scie cloche", "visseuse"],
      faire: ["Deux entr\xE9es d'air sur deux murs oppos\xE9s, une basse et une haute.", "\xC9lectricit\xE9 en apparent, sous goulotte, depuis le c\xE2ble existant : on ne perce pas la t\xF4le ext\xE9rieure pour un c\xE2ble.", `Bureaux sur pieds ou sur \xE9querres au sol : ${(v.bureaux || []).map((b) => `${fz(b.profondeur_cm)} \xD7 ${fr(b.longueur_cm)} cm ${b.cote === "avant" ? "en fa\xE7ade" : "\xE0 " + b.cote}`).join(", ")}. Les parements de 0,5 mm ne portent pas une charge suspendue.`],
      controler: ["Apr\xE8s une semaine chauff\xE9e : aucune trace de condensation aux angles ni autour des fen\xEAtres."]
    }
  ];
  return { avant: avantTout, outillage, etapes };
}

// site/src/compute.ts
var FACE_INDEX = { A: 0, D: 1, B: 2, G: 3 };
function rnd2(x, nd = 0) {
  if (!isFinite(x)) return x;
  const neg = x < 0;
  const v = Math.abs(x);
  const m = Math.pow(10, nd);
  const scaled = v * m;
  const fl = Math.floor(scaled);
  const diff = scaled - fl;
  let r;
  if (diff === 0.5) r = fl % 2 === 0 ? fl : fl + 1;
  else r = Math.round(scaled);
  const out = r / m;
  return neg ? -out : out;
}
function incDigits(s) {
  const a = s.split("");
  let i = a.length - 1;
  for (; i >= 0; i--) {
    if (a[i] === "9") a[i] = "0";
    else {
      a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1);
      break;
    }
  }
  if (i < 0) a.unshift("1");
  return a.join("");
}
function pyfix(x, nd) {
  if (!isFinite(x)) return String(x);
  const neg = x < 0;
  const ax = Math.abs(x);
  const [intp, fracRaw] = ax.toFixed(18).split(".");
  const frac = fracRaw || "";
  let digits = intp + frac.slice(0, nd).padEnd(nd, "0");
  const rest = frac.slice(nd);
  if (rest) {
    const head = rest[0];
    let up;
    if (head > "5") up = true;
    else if (head < "5") up = false;
    else up = /[1-9]/.test(rest.slice(1)) ? true : (digits.charCodeAt(digits.length - 1) - 48) % 2 === 1;
    if (up) digits = incDigits(digits);
  }
  digits = digits.padStart(nd + 1, "0");
  const cut = digits.length - nd;
  let out = digits.slice(0, cut).replace(/^0+(?=\d)/, "");
  if (nd) out += "." + digits.slice(cut);
  return neg && /[1-9]/.test(digits) ? "-" + out : out;
}
var f0 = (x) => pyfix(x, 0);
var f1 = (x) => pyfix(x, 1);
var f2 = (x) => pyfix(x, 2);
var itr = (x) => Math.trunc(x);
var fz2 = (x) => Number.isInteger(x) ? f0(x) : f1(x);
function slab_apex(L, R, ag, ad) {
  const dx = R[0] - L[0], dy = R[1] - L[1], dist = Math.hypot(dx, dy);
  if (!(dist > 0) || !(ag > 0) || !(ad > 0)) return null;
  const a = (ag * ag - ad * ad + dist * dist) / (2 * dist);
  const h2 = ag * ag - a * a;
  if (a < 0 || a > dist || h2 <= 1e-9) return null;
  const h3 = Math.sqrt(h2), ux = dx / dist, uy = dy / dist;
  let nx = -uy, ny = ux;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [L[0] + a * ux + h3 * nx, L[1] + a * uy + h3 * ny];
}
function interior_angles(q) {
  return q.map((b, i) => {
    const a = q[(i + q.length - 1) % q.length], c = q[(i + 1) % q.length];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    let t = Math.atan2(v2[0] * v1[1] - v2[1] * v1[0], v2[0] * v1[0] + v2[1] * v1[1]);
    if (t < 0) t += 2 * Math.PI;
    return t * 180 / Math.PI;
  });
}
function poly_area(q) {
  let s = 0;
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
function clip_half(subject, a, b, keepLeft) {
  const side = (q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) * (keepLeft ? 1 : -1);
  const out = [];
  for (let i = 0; i < subject.length; i++) {
    const cur = subject[i], nxt = subject[(i + 1) % subject.length];
    const sc = side(cur), sn = side(nxt);
    if (sc >= 0) out.push(cur);
    if (sc > 0 && sn < 0 || sc < 0 && sn > 0) {
      const t = sc / (sc - sn);
      out.push([cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])]);
    }
  }
  return out;
}
function clip_convex(subject, clipper) {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) out = clip_half(out, clipper[i], clipper[(i + 1) % clipper.length], true);
  return out;
}
function inset(q, largeurs) {
  let z = q;
  q.forEach((a, i) => {
    const b = q[(i + 1) % q.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l * largeurs[i], ny = (b[0] - a[0]) / l * largeurs[i];
    if (z.length) z = clip_half(z, [a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], true);
  });
  return z;
}
function inset_ordre(q, e) {
  const n = q.length;
  const dec = q.map((a, i) => {
    const ei = Array.isArray(e) ? e[i] : e;
    const b = q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * ei, ny = (b[0] - a[0]) / l * ei;
    return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]];
  });
  return q.map((_, i) => {
    const [p1, p2] = dec[(i + n - 1) % n], [p3, p4] = dec[i];
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    const u = p1[0] * p2[1] - p1[1] * p2[0], v = p3[0] * p4[1] - p3[1] * p4[0];
    return [(u * (p3[0] - p4[0]) - (p1[0] - p2[0]) * v) / d, (u * (p3[1] - p4[1]) - (p1[1] - p2[1]) * v) / d];
  });
}
function nom_cote(a, b) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
  if (ux > 0.9999) return "avant";
  if (uy > 0.9999) return "droite";
  if (ux < -0.9999) return "fond";
  if (uy < -0.9999) return "gauche";
  return uy < -0.9 ? "gauche en biais" : uy > 0.9 ? "droite en biais" : "fond en biais";
}
function outside_pieces(rect, slab) {
  const pieces = [];
  for (let i = 0; i < slab.length; i++) {
    const pts = clip_half(rect, slab[i], slab[(i + 1) % slab.length], false);
    if (pts.length >= 3 && poly_area(pts) > 1) pieces.push({ cote: i, pts });
  }
  return pieces;
}
function clearance(rect, a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return Math.min(...rect.map((q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / len));
}
function rear_edge_y(slab, x) {
  let best = -Infinity;
  for (let i = 0; i < slab.length; i++) {
    const a = slab[i], b = slab[(i + 1) % slab.length];
    if (x < Math.min(a[0], b[0]) - 1e-9 || x > Math.max(a[0], b[0]) + 1e-9) continue;
    const y = Math.abs(b[0] - a[0]) < 1e-9 ? Math.max(a[1], b[1]) : a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
    best = Math.max(best, y);
  }
  return best;
}
function formalites(p, emprise_murs_m2, emprise_debords_m2, surface_plancher_m2) {
  const rg = p.reglementaire || {};
  const sur_poteaux = !!rg.debords_sur_poteaux;
  const s1 = +(rg.seuil_sans_formalite_m2 ?? 5), s2 = +(rg.seuil_declaration_m2 ?? 20);
  const emprise = sur_poteaux ? emprise_debords_m2 : emprise_murs_m2;
  const retenue = Math.max(emprise, surface_plancher_m2);
  return {
    emprise_au_sol_m2: rnd2(emprise, 2),
    emprise_debords_inclus_m2: rnd2(emprise_debords_m2, 2),
    surface_plancher_m2: rnd2(surface_plancher_m2, 2),
    debords_comptes: sur_poteaux,
    seuil_sans_formalite_m2: s1,
    seuil_declaration_m2: s2,
    formalite: retenue <= s1 ? "aucune" : retenue <= s2 ? "declaration prealable" : "permis de construire",
    libelle: retenue <= s1 ? "aucune formalit\xE9" : retenue <= s2 ? "d\xE9claration pr\xE9alable" : "permis de construire",
    reserve: "secteur prot\xE9g\xE9 ou abords d'un monument historique : d\xE9claration pr\xE9alable m\xEAme sous le seuil ; le PLU (implantation, hauteur, distance aux limites) s'applique dans tous les cas",
    reference: rg.reference || "Code de l'urbanisme R*420-1, R421-2, R421-9"
  };
}
function geometry(p) {
  const A = +p.emprise_cm.avant_A, G = +p.emprise_cm.gauche_G;
  const FL = [0, 0], FR = [A, 0], BR = [A, G], BL = [0, G];
  const verts = [FL, FR, BR, BL];
  const names = ["avant-gauche", "avant-droite", "arriere-droite", "arriere-gauche"];
  const H = +p.murs.hauteur_cm;
  const drop = +p.toit.pente_chute_cm;
  const run = G;
  const h_at = (y) => H + drop * (1 - y / run);
  const slope_pct = 100 * drop / run;
  const slope_deg = Math.atan2(drop, run) * 180 / Math.PI;
  const rampant = Math.hypot(run, drop);
  const facesDef = [
    ["A", "Avant", FL, FR, "bandeau"],
    ["D", "Droite", FR, BR, "triangle"],
    ["B", "Arriere", BR, BL, "aucune"],
    ["G", "Gauche", BL, FL, "triangle"]
  ];
  const faces = facesDef.map(([key, label, p1, p2, reh]) => {
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const h1 = h_at(p1[1]), h2 = h_at(p2[1]);
    return {
      cle: key,
      libelle: label,
      longueur_cm: rnd2(length, 1),
      hauteur_mur_cm: H,
      hauteur_debut_cm: rnd2(h1, 1),
      hauteur_fin_cm: rnd2(h2, 1),
      hauteur_max_cm: rnd2(Math.max(h1, h2), 1),
      rehausse: reh
    };
  });
  let dalle = null;
  const d = p.dalle_cm;
  if (d) {
    const dA = +d.avant, dD = +d.droite, dG = +d.gauche, ag = +d.arriere_gauche, ad = +d.arriere_droite;
    const ox = d.decalage_cm ? +d.decalage_cm.x : 0, oy = d.decalage_cm ? +d.decalage_cm.y : 0;
    const apex = slab_apex([0, dG], [dA, dD], ag, ad);
    const local = [[0, 0], [dA, 0], [dA, dD], ...apex ? [apex] : [], [0, dG]];
    const poly2 = local.map(([x, y]) => [x - ox, y - oy]);
    const noms = apex ? ["avant", "droite", "arriere_droite", "arriere_gauche", "gauche"] : ["avant", "droite", "arriere", "gauche"];
    const rect = [[0, 0], [A, 0], [A, G], [0, G]];
    const mitoyens = d.murs_mitoyens || [];
    const est_mur = (nom) => mitoyens.includes(nom) || nom === "arriere" && mitoyens.some((k) => k.startsWith("arriere"));
    const deb = p.toit.debord_cm, gout = +p.toit.gouttiere_largeur_cm || 0;
    const toit = [[-deb.gauche, -deb.avant], [A + +deb.droite, -deb.avant], [A + +deb.droite, G + +deb.arriere + gout], [-deb.gauche, G + +deb.arriere + gout]];
    const grillages = d.grillages || [], palissades = d.palissades || [];
    const murs = noms.map((nom, i) => ({ nom, i })).filter(({ nom }) => est_mur(nom)).map(({ nom, i }) => {
      const a = poly2[i], b = poly2[(i + 1) % poly2.length];
      return { cote: nom, type: grillages.includes(nom) ? "grillage" : palissades.includes(nom) ? "palissade" : "mur", de: [rnd2(a[0], 1), rnd2(a[1], 1)], a: [rnd2(b[0], 1), rnd2(b[1], 1)], abri_cm: rnd2(clearance(rect, a, b), 1), toit_cm: rnd2(clearance(toit, a, b), 1) };
    });
    const hors_cm2 = Math.max(0, A * G - poly_area(clip_convex(poly2, rect)));
    const pieces = hors_cm2 > 1 ? outside_pieces(rect, poly2) : [];
    const rear = (x) => {
      const y = rear_edge_y(poly2, x);
      return Number.isFinite(y) ? rnd2(y - G, 1) : null;
    };
    const fond = murs.filter((w) => w.cote !== "gauche");
    let passage = null;
    if (fond.length) {
      const pince = fond.reduce((m, w) => w.abri_cm < m.abri_cm ? w : m);
      const souhaite = +d.passage_souhaite_cm || 0;
      const libre = (depth) => Math.min(...fond.map((w) => clearance([[0, 0], [A, 0], [A, depth], [0, depth]], w.de, w.a)));
      let lo = 0, hi = 2e3;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (libre(mid) >= souhaite) lo = mid;
        else hi = mid;
      }
      const [wa, wb] = [pince.de, pince.a], wl = Math.hypot(wb[0] - wa[0], wb[1] - wa[1]) || 1;
      const sd = (q) => ((wb[0] - wa[0]) * (q[1] - wa[1]) - (wb[1] - wa[1]) * (q[0] - wa[0])) / wl;
      const coin = rect.reduce((m, q) => sd(q) < sd(m) ? q : m);
      const nx = (wb[1] - wa[1]) / wl, ny = -(wb[0] - wa[0]) / wl, s = sd(coin);
      passage = {
        cm: pince.abri_cm,
        cote: pince.cote,
        souhaite_cm: souhaite,
        etat: pince.abri_cm < 35 ? "impraticable" : pince.abri_cm < 50 ? "de profil" : "praticable",
        profondeur_max_cm: rnd2(lo, 0),
        segment: [[rnd2(coin[0], 1), rnd2(coin[1], 1)], [rnd2(coin[0] + nx * s, 1), rnd2(coin[1] + ny * s, 1)]]
      };
    }
    let zone_utile = null;
    const bandes = d.bandes_libres_cm;
    if (bandes) {
      const largeurs = noms.map((nom) => +bandes[nom] || 0);
      const z = inset(local, largeurs);
      zone_utile = {
        bandes_cm: largeurs,
        polygone: z.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]),
        cotes_cm: z.map((a, i) => {
          const b = z[(i + 1) % z.length];
          return rnd2(Math.hypot(b[0] - a[0], b[1] - a[1]), 1);
        }),
        angles_deg: interior_angles(z).map((a) => rnd2(a, 1)),
        aire_m2: rnd2(poly_area(z) / 1e4, 2),
        bandes_m2: rnd2((poly_area(local) - poly_area(z)) / 1e4, 2)
      };
    }
    dalle = {
      zone_utile,
      avant: dA,
      droite: dD,
      gauche: dG,
      arriere_gauche: ag,
      arriere_droite: ad,
      decalage_cm: [ox, oy],
      pointe_cm: apex ? [rnd2(apex[0], 1), rnd2(apex[1], 1)] : null,
      // polygone de la dalle dans le repere de l'abri (origine = coin avant-gauche de l'abri)
      polygone: poly2.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]),
      // angles interieurs, dans l'ordre du polygone (coin avant-gauche d'abord)
      angles_deg: interior_angles(local).map((a) => rnd2(a, 1)),
      aire_m2: rnd2(poly_area(local) / 1e4, 2),
      cotes_cm: [dA, dD, ...apex ? [ad, ag] : [rnd2(Math.hypot(dA, dD - dG), 1)], dG],
      cotes_noms: noms,
      murs,
      mur_hauteur_cm: +d.mur_hauteur_cm || 0,
      grillage_hauteur_cm: +d.grillage_hauteur_cm || +d.mur_hauteur_cm || 0,
      palissade_epaisseur_cm: +d.palissade_epaisseur_cm || 4,
      palissade_travee_cm: +d.palissade_travee_cm || 180,
      mur_epaisseur_cm: +d.mur_epaisseur_cm || 15,
      passage,
      toit_touche_mur: murs.some((w) => w.toit_cm < 0),
      degagement_toit_min_cm: murs.length ? Math.min(...murs.map((w) => w.toit_cm)) : null,
      marges_cm: { gauche: ox, avant: oy, droite: rnd2(dA - ox - A, 1), arriere_droite: rear(A), arriere_gauche: rear(0) },
      hors_dalle: hors_cm2 > 1,
      hors_dalle_m2: rnd2(hors_cm2 / 1e4, 2),
      hors_dalle_polygones: pieces.map((q) => q.pts.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)])),
      hors_dalle_contre_mur: pieces.some((q) => est_mur(noms[q.cote]))
    };
  }
  return {
    verts,
    vert_names: names,
    vert_heights_cm: verts.map((v) => rnd2(h_at(v[1]), 1)),
    cotes: { A, G },
    aire_m2: rnd2(A * G / 1e4, 2),
    aire_interieure_m2: rnd2((A - 2 * +p.panneau.epaisseur_mm / 10) * (G - 2 * +p.panneau.epaisseur_mm / 10) / 1e4, 2),
    emprise_debords_m2: rnd2((A + +p.toit.debord_cm.gauche + +p.toit.debord_cm.droite) * (G + +p.toit.debord_cm.avant + +p.toit.debord_cm.arriere) / 1e4, 2),
    perimetre_cm: rnd2(2 * (A + G), 1),
    pente: { chute_cm: drop, run_cm: run, pourcent: rnd2(slope_pct, 1), degres: rnd2(slope_deg, 2), rampant_cm: rnd2(rampant, 1) },
    hauteur_mur_cm: H,
    hauteur_avant_cm: rnd2(H + drop, 1),
    hauteur_arriere_cm: H,
    faces,
    dalle,
    formalites: formalites(p, rnd2(A * G / 1e4, 2), rnd2((A + +p.toit.debord_cm.gauche + +p.toit.debord_cm.droite) * (G + +p.toit.debord_cm.avant + +p.toit.debord_cm.arriere) / 1e4, 2), rnd2((A - 2 * +p.panneau.epaisseur_mm / 10) * (G - 2 * +p.panneau.epaisseur_mm / 10) / 1e4, 2))
  };
}
function opening_start_cm(o, face_len) {
  const w = +o.largeur_cm;
  const margin = o.marge_bord_cm == null ? 5 : +o.marge_bord_cm;
  const pos = o.position == null ? "centre" : o.position;
  if (typeof pos === "number" || /^\d+(\.\d+)?$/.test(String(pos))) return Math.max(0, Math.min(+pos, face_len - w));
  if (pos === "droite") return Math.max(0, face_len - w - margin);
  if (pos === "gauche") return margin;
  return Math.max(0, (face_len - w) / 2);
}
function resolve_openings(p, g) {
  const facelen = {};
  for (const f of g.faces) facelen[f.cle] = f.longueur_cm;
  const list = p.porte ? [{ id: "porte", type: "porte", allege_cm: 0, ...p.porte }] : [];
  (p.fenetres || []).forEach((f, i) => list.push({ id: `fenetre-${i + 1}`, type: "fenetre", ouvrant: false, ...f }));
  return list.map((o) => ({
    id: o.id,
    type: o.type,
    face: o.face,
    face_index: FACE_INDEX[o.face],
    largeur_cm: +o.largeur_cm,
    hauteur_cm: +o.hauteur_cm,
    allege_cm: +o.allege_cm || 0,
    start_cm: rnd2(opening_start_cm(o, facelen[o.face]), 1),
    position: o.position == null ? "centre" : o.position,
    ouvrant: o.type === "porte" ? true : !!o.ouvrant,
    ouverture: o.ouverture || "",
    description: o.description || ""
  }));
}
function panel_replaced_by(openings, face, s0, s1, H) {
  for (const o of openings) {
    if (o.face !== face || o.allege_cm > 0.5) continue;
    if (o.start_cm <= s0 + 0.5 && o.start_cm + o.largeur_cm >= s1 - 0.5 && o.allege_cm + o.hauteur_cm >= H - 0.5) return o;
  }
  return null;
}
function takeoff(p, g, openings) {
  const cover = +p.panneau.largeur_utile_cm;
  const waste = 1 + +p.divers.facteur_chute_pct / 100;
  const H = g.hauteur_mur_cm, drop = g.pente.chute_cm;
  const { A, G } = g.cotes;
  const ded = {};
  for (const o of openings) ded[o.face] = (ded[o.face] || 0) + o.largeur_cm * o.hauteur_cm / 1e4;
  const rows = [];
  let gross = 0, net = 0;
  for (const f of g.faces) {
    const L = f.longueur_cm;
    const nb = Math.ceil(L / cover);
    const pieces = [];
    let nn = 0;
    for (let i = 0; i < nb; i++) {
      const s0 = i * cover, s1 = Math.min((i + 1) * cover, L);
      const rep = panel_replaced_by(openings, f.cle, s0, s1, H);
      pieces.push({ label: `${f.cle}${i + 1}`, largeur_cm: rnd2(s1 - s0, 1), remplace_par: rep ? rep.id : null });
      if (!rep) nn++;
    }
    const g_area = nn * (cover / 100) * (H / 100);
    let n_area = L / 100 * (H / 100);
    if (f.cle in ded) n_area -= ded[f.cle];
    gross += g_area;
    net += n_area;
    rows.push({
      face: f.cle,
      libelle: f.libelle,
      longueur_cm: L,
      hauteur_cm: H,
      nb_panneaux: nn,
      aire_brute_m2: rnd2(g_area, 2),
      rehausse: f.rehausse,
      pieces
    });
  }
  const rh = p.rehausse || { materiau: "panneau" };
  const strip_len = Math.max(A, G);
  const n_reh = Math.ceil(2 * drop / cover);
  const reh_gross = n_reh * (cover / 100) * (strip_len / 100);
  const bois = rh.materiau === "bois";
  const stock = bois ? +rh.longueur_stock_cm || 480 : 0;
  const rehausse = {
    materiau: bois ? "bois" : "panneau",
    pieces: [
      { label: "R1", piece: "Bandeau avant (face A)", longueur_cm: A, hauteur_cm: drop, nb: 1, note: bois ? "madrier droit, pose sur le mur A" : "rectangle, pose sur le mur A" },
      { label: "R2+R3", piece: "Coins lateraux (R2 face G, R3 face D)", longueur_cm: G, hauteur_cm: drop, nb: 2, note: bois ? "1 madrier de G coupe en diagonale = 2 coins (tourner R3 de 180 deg)" : "1 bande G x chute coupee en diagonale = 2 triangles (tourner R3 de 180 deg)" }
    ],
    nb_panneaux: bois ? 0 : n_reh,
    longueur_panneau_cm: bois ? 0 : strip_len,
    aire_brute_m2: bois ? 0 : rnd2(reh_gross, 2),
    aire_nette_m2: bois ? 0 : rnd2((A * drop + G * drop) / 1e4, 2)
  };
  if (bois) {
    rehausse.section_mm = rh.section_mm || [75, 225];
    rehausse.longueur_stock_cm = stock;
    rehausse.ml = rnd2((A + G) / 100, 2);
    rehausse.nb_madriers = Math.ceil((A + G) / stock);
  }
  const deb = p.toit.debord_cm;
  const width_x = A + +deb.gauche + +deb.droite;
  const len_h = G + +deb.avant + +deb.arriere;
  const run_len = len_h * Math.hypot(1, drop / G);
  const n_roof = Math.ceil(width_x / cover);
  const roof_gross = n_roof * (cover / 100) * (run_len / 100);
  const roof_real = width_x / 100 * (len_h / 100);
  const roof_pieces = [];
  for (let i = 0; i < n_roof; i++) roof_pieces.push({ label: `T${i + 1}`, largeur_cm: rnd2(Math.min(cover, width_x - i * cover), 1) });
  return {
    murs: {
      lignes: rows,
      aire_brute_m2: rnd2(gross, 2),
      aire_nette_m2: rnd2(net, 2),
      ouvertures_deduites_m2: rnd2(Object.values(ded).reduce((a, b) => a + b, 0), 2),
      total_panneaux: rows.reduce((a, r) => a + r.nb_panneaux, 0)
    },
    rehausse,
    toit: {
      face: "T",
      libelle: "Toiture",
      nb_panneaux: n_roof,
      largeur_cm: rnd2(width_x, 1),
      longueur_panneau_cm: rnd2(run_len, 1),
      aire_brute_m2: rnd2(roof_gross, 2),
      aire_couverte_m2: rnd2(roof_real, 2),
      portee_cm: rnd2(len_h, 1),
      pieces: roof_pieces
    },
    commande_mur_m2: rnd2((gross + (bois ? 0 : reh_gross)) * waste, 1),
    commande_toit_m2: rnd2(roof_gross * waste, 1),
    commande_panneaux_m2: rnd2((gross + (bois ? 0 : reh_gross) + roof_gross) * waste, 1),
    facteur_chute_pct: p.divers.facteur_chute_pct
  };
}
function shopping(p, g, t, openings) {
  const ceil = Math.ceil;
  const perim = g.perimetre_cm / 100;
  const corner_h = g.hauteur_avant_cm / 100;
  const { A, G } = g.cotes;
  const anchors = ceil(perim / 0.5);
  const screws = ceil((t.murs.aire_brute_m2 + t.rehausse.aire_brute_m2 + t.toit.aire_brute_m2) * 6);
  const portes = openings.filter((o) => o.type === "porte");
  const porte_q = portes.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} cm`).join(", ") || "-";
  const fenetres = openings.filter((o) => o.type === "fenetre");
  const fen_q = fenetres.map((o) => `${itr(o.largeur_cm)}x${itr(o.hauteur_cm)} all.${itr(o.allege_cm)} (face ${o.face}, ${o.ouvrant ? "oscillo-battante" : "fixe"})`).join(", ");
  const r = t.rehausse;
  const rehItem = r.materiau === "bois" ? { poste: `Rehausse bois : madrier ${r.section_mm[0]}x${r.section_mm[1]} mm traite classe 4`, qte: `${r.nb_madriers} x ${f2(r.longueur_stock_cm / 100)} m (${r.ml} ml : R1 = ${itr(A)} cm droit, R2+R3 = ${itr(G)} cm coupe en diagonale)`, note: "Pose sur le chant des panneaux (bande butyle), visse dans les panneaux ; sert de lisse haute qui lie murs et toit. Larmier par-dessus cote exterieur." } : { poste: "Rehausse : bande de panneau mur", qte: `${r.nb_panneaux} panneau de ${f2(r.longueur_panneau_cm / 100)} m`, note: "2 bandes (A x chute, G x chute), la 2e coupee en diagonale." };
  const open_perim = openings.reduce((a, o) => a + 2 * (o.largeur_cm + o.hauteur_cm), 0) / 100;
  const ep = p.panneau.epaisseur_mm;
  const items = [
    { poste: `Panneaux sandwich ${ep} mm - finition MUR`, qte: `${t.murs.total_panneaux} panneaux de ${f2(g.hauteur_mur_cm / 100)} m${t.rehausse.nb_panneaux ? ` + ${t.rehausse.nb_panneaux} de ${f2(t.rehausse.longueur_panneau_cm / 100)} m` : ""} (~${t.commande_mur_m2} m2 avec chute)`, note: "Ame PIR, autoportants (pas d'ossature). FIXATION CACHEE dans le joint (pas de tete de vis visible), parement lisse/micro-nervure, couleur au choix (mur fonce + toit clair). Coupes droites uniquement." },
    rehItem,
    { poste: `Panneaux sandwich ${ep} mm - finition TOIT (face T)`, qte: `${t.toit.nb_panneaux} panneaux de ~${f2(t.toit.longueur_panneau_cm / 100)} m (~${t.commande_toit_m2} m2 avec chute)`, note: `Profil TOITURE (nervures hautes), sens de la pente, COULEUR CLAIRE (chaleur d'ete). Portee libre ~${f2(t.toit.portee_cm / 100)} m : verifier le tableau de portees du fabricant.` },
    { poste: "Rail / lambourde de pied", qte: `~${ceil(perim) + 1} m`, note: "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle." },
    { poste: "Profils d'angle exterieurs + interieurs", qte: `4 angles x ${f2(corner_h)} m, ext + int = ~${ceil(8 * corner_h)} m`, note: "4 angles droits standard (profil L / couvre-joint)." },
    { poste: "Bavette d'egout haut (avant)", qte: `~${ceil(A / 100) + 1} m`, note: "Larmier en haut de la face avant." },
    { poste: "Bavettes de rive (gauche/droite)", qte: `~${ceil(2 * G / 100) + 1} m`, note: "Rives laterales du toit (affleurantes si debord lateral = 0 : la bavette ferme le chant du panneau)." },
    { poste: "Gouttiere + 1 descente", qte: `~${ceil(A / 100) + 1} m + 1 descente`, note: "En bas de pente (face B), descente a un angle arriere." },
    { poste: "Vis autoperceuses tete EPDM", qte: `~${screws} (boite de ${ceil(screws / 100) * 100})`, note: "Longueur = epaisseur panneau + rail. Rondelle d'etancheite obligatoire." },
    { poste: "Chevilles / scellement dalle", qte: `~${anchors}`, note: "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)." },
    { poste: "Bloc-porte vitre alu double vitrage", qte: `${portes.length} (${porte_q})`, note: "Dormant compris, aux cotes d'un module entier (largeur utile x hauteur de mur) : remplace un panneau, rien a decouper. Poignee + serrure, ouverture vers l'exterieur, seuil + joints. La piece touchee tous les jours : ne pas economiser ici." },
    { poste: "Ventilation (VMC ou aerateurs hygro)", qte: "1 kit", note: "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)." },
    { poste: "Bande comprimee / mousse precomprimee", qte: `~${ceil(perim + open_perim)} m`, note: "Etancheite a l'air au pied et au pourtour des ouvertures." },
    { poste: "Bande butyle (joints de panneaux)", qte: `~${ceil(perim * 2)} m`, note: "Joints longitudinaux, joint mur/rehausse et perimetriques." },
    { poste: "Mastic PU + primaire anticorrosion", qte: "~5 cartouches + 1 primaire", note: "Cachetage et protection des chants coupes (anticorrosion)." },
    { poste: "Peinture de retouche (RAL parement)", qte: "1 aerosol", note: "Retouche des rayures et chants." }
  ];
  if (fenetres.length) {
    items.splice(11, 0, { poste: "Fenetre(s) double vitrage", qte: `${fenetres.length} : ${fen_q}`, note: "allege = hauteur sous fenetre (cm). L'ouvrante assure la ventilation traversante avec la porte. Chaque fenetre dans un seul panneau (pas a cheval sur un joint). Cadre + appui + joints." });
  }
  const am = p.amenagement || {};
  const on = (k) => am[k] && am[k].actif;
  if (on("plancher")) items.push({ poste: "Plancher isole", qte: `~${g.aire_interieure_m2} m2, ${am.plancher.epaisseur_cm} cm`, note: `${am.plancher.description}. Hauteur sous plafond arriere ~${f2((g.hauteur_arriere_cm - am.plancher.epaisseur_cm) / 100)} m.` });
  if (on("electricite")) items.push({ poste: "Electricite (cable existant par le sol)", qte: "1 lot", note: am.electricite.description });
  if (on("chauffage")) items.push({ poste: "Chauffage", qte: "1", note: am.chauffage.description });
  if (on("store")) items.push({ poste: "Store / occultation", qte: "1", note: am.store.description });
  if (on("finition_interieure")) items.push({ poste: "Finition interieure", qte: "1 lot", note: am.finition_interieure.description });
  return items;
}
function budget(p, g, t, openings) {
  const pr = p.prix_indicatifs_eur || {};
  const get = (k) => pr[k] == null ? 0 : pr[k];
  const perim = g.perimetre_cm / 100;
  const corner_h = g.hauteur_avant_cm / 100;
  const profils_ml = 4 * corner_h * 2 + perim;
  const portes = openings.filter((o) => o.type === "porte").length;
  const fen_fixes = openings.filter((o) => o.type === "fenetre" && !o.ouvrant).length;
  const fen_ouv = openings.filter((o) => o.type === "fenetre" && o.ouvrant).length;
  const bois = t.rehausse.materiau === "bois";
  const mur_m2 = rnd2(t.murs.aire_brute_m2 + (bois ? 0 : t.rehausse.aire_brute_m2), 2);
  const src = [
    [bois ? "Panneaux sandwich - mur (brut)" : "Panneaux sandwich - mur + rehausse (brut)", mur_m2, "m\xB2", get("panneau_mur_m2")],
    ["Surcout fixation cachee (mur)", mur_m2, "m\xB2", get("fixation_cachee_m2")],
    ["Panneaux sandwich - toit (brut)", t.toit.aire_brute_m2, "m\xB2", get("panneau_toit_m2")]
  ];
  if (bois) src.push(["Rehausse bois (madrier)", t.rehausse.ml, "ml", p.rehausse && p.rehausse.prix_ml_eur != null ? +p.rehausse.prix_ml_eur : 10]);
  src.push(
    ["Bloc-porte vitre", portes, "u", get("porte_vitree")],
    ["Fenetre(s) fixe(s)", fen_fixes, "u", get("fenetre_fixe")],
    ["Fenetre(s) ouvrante(s)", fen_ouv, "u", get("fenetre_ouvrante")],
    ["Profils (angles, rives, rail)", rnd2(profils_ml, 1), "ml", get("profils_ml")],
    ["Visserie + etancheite", 1, "forfait", get("visserie_etancheite_forfait")],
    ["Gouttiere + descente", 1, "forfait", get("gouttiere_descente_forfait")],
    ["Ventilation (VMC/aerateurs)", 1, "forfait", get("ventilation_forfait")],
    ["Livraison des panneaux", 1, "forfait", get("livraison_forfait")]
  );
  const am = p.amenagement || {};
  const amen = [];
  if (am.plancher && am.plancher.actif) amen.push(["Amenagement - plancher isole", g.aire_interieure_m2, "m\xB2", +am.plancher.prix_m2_eur || 0]);
  for (const [k, label] of [["electricite", "Amenagement - electricite (multiprise, eclairage)"], ["chauffage", "Amenagement - chauffage"], ["store", "Amenagement - store"], ["finition_interieure", "Amenagement - finition interieure"]]) {
    if (am[k] && am[k].actif) amen.push([label, 1, "forfait", +am[k].forfait_eur || 0]);
  }
  const rows = [];
  let sous = 0, coque = 0;
  for (const [label, qte, unit, pu] of src) {
    const montant = qte * pu;
    sous += montant;
    coque += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd2(montant), groupe: "coque" });
  }
  for (const [label, qte, unit, pu] of amen) {
    const montant = qte * pu;
    sous += montant;
    rows.push({ poste: label, qte, unite: unit, pu_eur: pu, montant_eur: rnd2(montant), groupe: "amenagement" });
  }
  const inc = pr.incertitude_pct == null ? 15 : +pr.incertitude_pct;
  return {
    lignes: rows,
    coque_eur: rnd2(coque),
    amenagement_eur: rnd2(sous - coque),
    sous_total_eur: rnd2(sous),
    incertitude_pct: inc,
    total_bas_eur: rnd2(sous * (1 - inc / 100)),
    total_haut_eur: rnd2(sous * (1 + inc / 100))
  };
}
function model3d(p, g, openings) {
  const { A, G } = g.cotes;
  const deb = p.toit.debord_cm;
  const m = (v) => rnd2(v / 100, 3);
  const drop = g.pente.chute_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const panels = [];
  g.faces.forEach((f) => {
    const n = Math.ceil(f.longueur_cm / cover);
    for (let i = 0; i < n; i++) {
      const s0 = i * cover, s1 = Math.min((i + 1) * cover, f.longueur_cm);
      if (panel_replaced_by(openings, f.cle, s0, s1, g.hauteur_mur_cm)) continue;
      panels.push({ label: `${f.cle}${i + 1}`, face_index: FACE_INDEX[f.cle], s0_m: m(s0), s1_m: m(s1) });
    }
  });
  const rehMat = p.rehausse && p.rehausse.materiau || "panneau";
  const rehausse_pieces = drop > 0 ? [
    { label: "R1", face_index: FACE_INDEX.A, kind: "bandeau", materiau: rehMat },
    { label: "R2", face_index: FACE_INDEX.G, kind: "triangle", materiau: rehMat },
    { label: "R3", face_index: FACE_INDEX.D, kind: "triangle", materiau: rehMat }
  ] : [];
  const am = p.amenagement || {};
  const floor_m = am.plancher && am.plancher.actif ? m(+am.plancher.epaisseur_cm || 6) : 0;
  const roof_w = A + +deb.gauche + +deb.droite;
  const roof_panels = [];
  for (let i = 0, n = Math.ceil(roof_w / cover); i < n; i++) roof_panels.push({
    label: `T${i + 1}`,
    x0_m: m(-deb.gauche + i * cover),
    x1_m: m(-deb.gauche + Math.min((i + 1) * cover, roof_w))
  });
  const slab = g.dalle ? g.dalle.polygone : g.verts;
  return {
    footprint: g.verts.map((v) => [m(v[0]), m(v[1])]),
    heights: g.vert_heights_cm.map((h2) => rnd2(h2 / 100, 3)),
    wall_height_m: m(g.hauteur_mur_cm),
    panel_cover_m: m(+p.panneau.largeur_utile_cm),
    thickness_m: +p.panneau.epaisseur_mm / 1e3,
    roof_outline: [
      [m(-deb.gauche), m(-deb.avant)],
      [m(A + +deb.droite), m(-deb.avant)],
      [m(A + +deb.droite), m(G + +deb.arriere)],
      [m(-deb.gauche), m(G + +deb.arriere)]
    ],
    roof_front_m: m(g.hauteur_avant_cm),
    roof_slope: rnd2(drop / G, 5),
    slab: slab.map((v) => [m(v[0]), m(v[1])]),
    walls: g.dalle && g.dalle.mur_hauteur_cm > 0 ? g.dalle.murs.map((w) => ({ a: [m(w.de[0]), m(w.de[1])], b: [m(w.a[0]), m(w.a[1])], h_m: m(g.dalle.mur_hauteur_cm), ep_m: m(g.dalle.mur_epaisseur_cm) })) : [],
    gutter_face_index: FACE_INDEX.B,
    panels,
    rehausse_pieces,
    roof_panels,
    rehausse_materiau: rehMat,
    floor_m,
    openings: openings.map((o) => ({
      type: o.type,
      face_index: o.face_index,
      ouvrant: !!o.ouvrant,
      offset_m: m(o.start_cm),
      width_m: m(o.largeur_cm),
      height_m: m(o.hauteur_cm),
      sill_m: m(o.allege_cm)
    }))
  };
}
function plus_grand_k_gone(Z, k, garde = []) {
  let best = null, ba = -1;
  const rec = (i, pris) => {
    if (pris.length === k) {
      const q = pris.map((j) => Z[j]), a = poly_area(q);
      if (a > ba) {
        ba = a;
        best = q;
      }
      return;
    }
    if (i >= Z.length || Z.length - i < k - pris.length) return;
    rec(i + 1, [...pris, i]);
    if (!garde.includes(i)) rec(i + 1, pris);
  };
  rec(0, []);
  return best;
}
function plus_grand_rectangle(Z) {
  const essai = (deg2) => {
    const t = deg2 * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    const R = Z.map(([x, y]) => [x * c + y * s, -x * s + y * c]);
    const ymin = Math.min(...R.map((v) => v[1])), ymax = Math.max(...R.map((v) => v[1]));
    const N = 240, dy = (ymax - ymin) / N, L = [], D = [];
    for (let k = 0; k <= N; k++) {
      const y = ymin + k * dy, xs = [];
      R.forEach((a, i) => {
        const b = R[(i + 1) % R.length];
        if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      });
      L.push(xs.length ? Math.min(...xs) : Infinity);
      D.push(xs.length ? Math.max(...xs) : -Infinity);
    }
    let best = { aire: 0, w: 0, h: 0, x: 0, y: 0 };
    for (let i = 0; i <= N; i++) for (let j = i + 1; j <= N; j++) {
      const w = Math.min(D[i], D[j]) - Math.max(L[i], L[j]), h2 = (j - i) * dy;
      if (w > 0 && w * h2 > best.aire) best = { aire: w * h2, w, h: h2, x: Math.max(L[i], L[j]), y: ymin + i * dy };
    }
    const back = ([x, y]) => [x * c - y * s, x * s + y * c];
    return { ...best, deg: deg2, pts: [[best.x, best.y], [best.x + best.w, best.y], [best.x + best.w, best.y + best.h], [best.x, best.y + best.h]].map(back) };
  };
  let top = essai(0);
  for (let d = 2; d < 180; d += 2) {
    const e = essai(d);
    if (e.aire > top.aire) top = e;
  }
  for (let d = top.deg - 2; d <= top.deg + 2; d += 0.25) {
    const e = essai(d);
    if (e.aire > top.aire) top = e;
  }
  if (!(top.aire > 0)) return null;
  const deg = top.deg > 90 ? top.deg - 180 : top.deg;
  return { w: top.w, h: top.h, deg, pts: top.pts };
}
function variantes(p, g) {
  const zu = g.dalle && g.dalle.zone_utile;
  if (!zu || zu.polygone.length < 3) return [];
  const Z0 = zu.polygone;
  const k0 = Z0.reduce((m, v, i) => v[1] < Z0[m][1] - 1e-6 || Math.abs(v[1] - Z0[m][1]) <= 1e-6 && v[0] < Z0[m][0] ? i : m, 0);
  const Z = [...Z0.slice(k0), ...Z0.slice(0, k0)];
  const x0 = Math.min(...Z.map((v) => v[0])), y0 = Math.min(...Z.map((v) => v[1]));
  const x1 = Math.max(...Z.map((v) => v[0]));
  const dedans = (q) => Z.every((a, i) => {
    const b = Z[(i + 1) % Z.length];
    return (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= -1e-6 * Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  const rect = (w, h2) => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h2], [x0, y0 + h2]];
  const tient = (w, h2) => rect(w, h2).every(dedans);
  const prof_max = (w) => {
    if (!tient(w, 0)) return 0;
    let lo2 = 0, hi2 = 2e3;
    for (let k = 0; k < 40; k++) {
      const m = (lo2 + hi2) / 2;
      if (tient(w, m)) lo2 = m;
      else hi2 = m;
    }
    return lo2;
  };
  const sous = (yb2) => {
    const c = clip_half(Z, [1e4, yb2], [-1e4, yb2], true);
    return c.filter((v, i) => Math.hypot(v[0] - c[(i + 1) % c.length][0], v[1] - c[(i + 1) % c.length][1]) > 0.05);
  };
  const ep = +p.panneau.epaisseur_mm / 10, seuil = +(p.reglementaire && p.reglementaire.seuil_sans_formalite_m2) || 5;
  const [ox, oy] = g.dalle.decalage_cm;
  const fond = g.dalle.murs.filter((w) => w.cote.startsWith("arriere")).map((w) => ({ cote: w.cote, a: [w.de[0] + ox, w.de[1] + oy], b: [w.a[0] + ox, w.a[1] + oy] }));
  const pied = (q, a, b) => {
    const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / l2));
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  const passages = (r) => fond.map(({ cote, a, b }) => {
    let best2 = null;
    const garde = (forme_pt, mur_pt) => {
      const cm = Math.hypot(forme_pt[0] - mur_pt[0], forme_pt[1] - mur_pt[1]);
      if (!best2 || cm < best2.cm) best2 = { cote, cm, segment: [forme_pt, mur_pt] };
    };
    r.forEach((p2, i) => {
      const q = r[(i + 1) % r.length];
      garde(p2, pied(p2, a, b));
      garde(pied(a, p2, q), a);
      garde(pied(b, p2, q), b);
    });
    return { cote, cm: rnd2(best2.cm, 1), segment: best2.segment.map((v) => [rnd2(v[0], 1), rnd2(v[1], 1)]) };
  });
  const dalle_abs = g.dalle.polygone.map(([x, y]) => [x + ox, y + oy]);
  const derriere_abri = (r) => {
    const fonds = r.map((a, i) => i).filter((i) => nom_cote(r[i], r[(i + 1) % r.length]).startsWith("fond"));
    if (fonds.length < 1 || fonds.length > 2) return null;
    const xmax = Math.max(...r.map((z) => z[0]));
    const zones = fonds.map((i) => clip_half(clip_half(dalle_abs, r[i], r[(i + 1) % r.length], false), [xmax, -1e4], [xmax, 1e4], true)).filter((z) => z.length >= 3);
    if (!zones.length) return null;
    const commun = zones.length === 2 ? poly_area(clip_convex(zones[0], zones[1])) : 0;
    const aire = zones.reduce((s, z) => s + poly_area(z), 0) - commun;
    const a_l_abri = (z) => Math.min(...r.map((a, i) => {
      const f = pied(z, a, r[(i + 1) % r.length]);
      return Math.hypot(z[0] - f[0], z[1] - f[1]);
    }));
    return { aire_m2: rnd2(aire / 1e4, 2), profondeur_max_cm: rnd2(Math.max(...zones.flat().map(a_l_abri)), 0), polygones: zones.map((z) => z.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)])) };
  };
  const forme = (id, titre, note, q) => {
    const k = q.reduce((m, v, i) => v[1] < q[m][1] - 1e-6 || Math.abs(v[1] - q[m][1]) <= 1e-6 && v[0] < q[m][0] ? i : m, 0);
    const r = [...q.slice(k), ...q.slice(0, k)];
    return {
      id,
      titre,
      note,
      polygone: r.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]),
      cotes_cm: r.map((a, i) => {
        const b = r[(i + 1) % r.length];
        return rnd2(Math.hypot(b[0] - a[0], b[1] - a[1]), 1);
      }),
      angles_deg: interior_angles(r).map((a) => rnd2(a, 1)),
      aire_m2: rnd2(poly_area(r) / 1e4, 2),
      aire_interieure_m2: rnd2(poly_area(inset(r, r.map(() => ep))) / 1e4, 2),
      noms_cotes: r.map((a, i) => nom_cote(a, r[(i + 1) % r.length])),
      cotes_interieures_cm: (() => {
        const s = inset_ordre(r, ep);
        return s.map((a, i) => {
          const b = s[(i + 1) % s.length];
          return rnd2(Math.hypot(b[0] - a[0], b[1] - a[1]), 1);
        });
      })(),
      passages: passages(r),
      arriere: derriere_abri(r)
    };
  };
  const out = [];
  const mod = +p.panneau.largeur_utile_cm;
  let best = [0, 0];
  for (let i = 1; i * mod <= x1 - x0 + 1e-6; i++) for (let j = 1; j < 20 && tient(i * mod, j * mod); j++) if (i * j > best[0] * best[1]) best = [i, j];
  if (best[0]) out.push(forme(1, "rectangle en panneaux entiers", `${best[0]} \xD7 ${best[1]} modules de ${fz2(mod)} : aucune recoupe, angles droits`, rect(best[0] * mod, best[1] * mod)));
  let bw = 0, bh = 0;
  for (let w = 1; w <= Math.floor(x1 - x0); w++) {
    const h2 = Math.floor(prof_max(w));
    if (w * h2 > bw * bh) {
      bw = w;
      bh = h2;
    }
  }
  out.push(forme(2, "plus grand rectangle", "le plus grand rectangle qui tient dans la zone", rect(bw, bh)));
  const wf = Math.floor(x1 - x0);
  out.push(forme(3, "rectangle pleine largeur", "toute la largeur de la zone, profondeur limit\xE9e par le grand pan", rect(wf, Math.floor(prof_max(wf)))));
  const yb = Math.max(...Z.filter((v) => Math.abs(v[0] - x0) < 0.5).map((v) => v[1]));
  const cinq = sous(yb);
  let lo = y0, hi = yb;
  for (let k = 0; k < 50; k++) {
    const m = (lo + hi) / 2;
    if (poly_area(sous(m)) <= seuil * 1e4) lo = m;
    else hi = m;
  }
  out.push(forme(4, `coin coup\xE9, plafonn\xE9 \xE0 ${fz2(seuil)} m\xB2`, `mur arri\xE8re recul\xE9 pour ne pas d\xE9passer ${fz2(seuil)} m\xB2 de murs`, sous(lo)));
  out.push(forme(5, "coin coup\xE9, pleine profondeur", "un pan coup\xE9 parall\xE8le au mur du fond, le reste \xE0 angle droit", cinq));
  out.push(forme(6, "toute la zone utile", "suit toute la zone : 3 angles non droits, pointe \xE0 l'arri\xE8re", Z));
  const r7 = plus_grand_rectangle(Z);
  if (r7) out.push(forme(7, "plus grand rectangle, orientation libre", Math.abs(r7.deg) < 0.01 ? `${f1(r7.w)} \xD7 ${f1(r7.h)} : aucune rotation ne fait mieux que le rectangle droit` : `${f1(r7.w)} \xD7 ${f1(r7.h)}, tourn\xE9 de ${f1(r7.deg)}\xB0 : porte sur le c\xF4t\xE9 de son choix`, r7.pts));
  if (Z.length > 4) {
    const q8 = plus_grand_k_gone(Z, 4, [0, 1]);
    const drop = Z.find((v) => !q8.includes(v));
    const angle_perdu = interior_angles(Z)[Z.indexOf(drop)];
    if (q8) out.push(forme(8, "plus grand quadrilat\xE8re", `4 murs, le coin de ${f1(angle_perdu)}\xB0 de la zone est sacrifi\xE9 : l'aire maximale \xE0 4 murs`, q8));
    const HG = Z[Z.length - 1], HD = Z[2];
    out.push(forme(9, "trap\xE8ze, mur arri\xE8re en biais", "c\xF4t\xE9s gauche et droit d'\xE9querre sur l'avant, un seul mur en biais au fond", [Z[0], Z[1], HD, HG]));
    const trap = (w) => {
      const x = Z[0][0] + w, t = (x - HG[0]) / (HD[0] - HG[0]);
      return [Z[0], [x, Z[0][1]], [x, HG[1] + t * (HD[1] - HG[1])], HG];
    };
    let lo2 = 0, hi2 = Z[1][0] - Z[0][0];
    for (let k = 0; k < 50; k++) {
      const m = (lo2 + hi2) / 2;
      if (poly_area(trap(m)) <= seuil * 1e4) lo2 = m;
      else hi2 = m;
    }
    const w10 = Math.floor(lo2);
    out.push(forme(10, `trap\xE8ze plafonn\xE9 \xE0 ${fz2(seuil)} m\xB2`, `le trap\xE8ze 9, mur droit recul\xE9 \xE0 ${w10} de large : sous ${fz2(seuil)} m\xB2`, trap(w10)));
    const pivot = (h2) => [Z[0], Z[1], [Z[1][0], Z[1][1] + h2], HG];
    lo2 = 0;
    hi2 = HD[1] - Z[1][1];
    for (let k = 0; k < 50; k++) {
      const m = (lo2 + hi2) / 2;
      if (poly_area(pivot(m)) <= seuil * 1e4) lo2 = m;
      else hi2 = m;
    }
    const h11 = Math.floor(lo2);
    const vise = +p.dalle_cm.passage_souhaite_cm || 0;
    const fixe = p.disposition_trapeze && p.disposition_trapeze.cotes_cm;
    if (fixe) {
      const [fa, fd, fg] = [+fixe.avant, +fixe.droite, +fixe.gauche], ff = +fixe.fond || 0;
      if (ff > 0 && ff < fa) out.push(forme(13, `cinq murs aux cotes ${fz2(fa)} / ${fz2(fd)} / ${fz2(ff)} / ${fz2(fg)}`, `fa\xE7ade ${fz2(fa)}, mur droit ${fz2(fd)}, mur du fond ${fz2(ff)} d'\xE9querre sur le mur gauche de ${fz2(fg)}, et un pan \xE0 ${f1(Math.atan2(fg - fd, fa - ff) * 180 / Math.PI)}\xB0 entre les deux`, [Z[0], [Z[0][0] + fa, Z[0][1]], [Z[0][0] + fa, Z[0][1] + fd], [Z[0][0] + ff, Z[0][1] + fg], [Z[0][0], Z[0][1] + fg]]));
      else out.push(forme(13, `trap\xE8ze aux cotes ${fz2(fa)} / ${fz2(fd)} / ${fz2(fg)}`, `fa\xE7ade ${fz2(fa)}, mur droit ${fz2(fd)}, mur gauche ${fz2(fg)} : trois murs d'\xE9querre cal\xE9s sur le module de ${fz2(mod)}, le fond en biais en d\xE9coule`, [Z[0], [Z[0][0] + fa, Z[0][1]], [Z[0][0] + fa, Z[0][1] + fd], [Z[0][0], Z[0][1] + fg]]));
    } else if (vise > 0) {
      const derriere = (q) => {
        const w = passages(q).find((x) => x.cote === "arriere_droite");
        return w ? w.cm : Infinity;
      };
      lo2 = 0;
      hi2 = HG[1] - Z[1][1];
      for (let k = 0; k < 50; k++) {
        const m = (lo2 + hi2) / 2;
        if (derriere(pivot(m)) >= vise) lo2 = m;
        else hi2 = m;
      }
      const h13 = Math.floor(lo2), plein = pivot(h13);
      const cible = +(p.disposition_trapeze && p.disposition_trapeze.interieur_vise_m2) || 0;
      const HR = plein[2];
      const glisse = (w) => {
        const x = Z[0][0] + w, t = (x - HG[0]) / (HR[0] - HG[0]);
        return [Z[0], [x, Z[0][1]], [x, HG[1] + t * (HR[1] - HG[1])], HG];
      };
      const interieur = (q) => poly_area(inset(q, q.map(() => ep))) / 1e4;
      let w13 = Z[1][0] - Z[0][0];
      if (cible > 0 && interieur(plein) > cible) {
        lo2 = 0;
        hi2 = w13;
        for (let k = 0; k < 50; k++) {
          const m = (lo2 + hi2) / 2;
          if (interieur(glisse(m)) <= cible) lo2 = m;
          else hi2 = m;
        }
        w13 = Math.round(lo2);
      }
      out.push(forme(13, `trap\xE8ze, ${fz2(vise)} cm derri\xE8re${cible > 0 ? `, ~${fz2(cible)} m\xB2 int\xE9rieur` : ""}`, `mur arri\xE8re du haut du c\xF4t\xE9 gauche, pivot\xE9 pour ${fz2(vise)} cm de passage derri\xE8re, fa\xE7ade ${w13}${cible > 0 ? ` pour ~${fz2(cible)} m\xB2 int\xE9rieur` : ""}`, glisse(w13)));
    }
    out.push(forme(11, `trap\xE8ze pivot\xE9, plafonn\xE9 \xE0 ${fz2(seuil)} m\xB2`, `le trap\xE8ze 9, coin arri\xE8re droit abaiss\xE9 \xE0 ${h11} : sous ${fz2(seuil)} m\xB2, passage arri\xE8re \xE9largi`, pivot(h11)));
    const pente_pan = (Z[3][1] - HD[1]) / (HD[0] - Z[3][0]);
    const au_module = (i, j) => {
      const C = [x0 + i * mod, y0 + j * mod];
      if (C[0] >= x1 - 1e-6 || !dedans(C)) return null;
      const yd = C[1] - (x1 - C[0]) * pente_pan;
      return yd > y0 + 1 ? [[x0, y0], [x1, y0], [x1, yd], C, [x0, C[1]]] : null;
    };
    let m12 = null;
    for (let i = 1; i * mod < x1 - x0; i++) for (let j = 1; j < 20; j++) {
      const q = au_module(i, j);
      if (q && poly_area(q) <= seuil * 1e4 && (!m12 || poly_area(q) > poly_area(m12.q))) m12 = { q, i, j };
    }
    if (m12) out.push(forme(12, "coin coup\xE9 au module", `l'option 1 \xE9largie \xE0 toute la fa\xE7ade : mur du fond ${m12.i} et mur gauche ${m12.j} modules de ${fz2(mod)} sans recoupe, pan coup\xE9 parall\xE8le au grand pan`, m12.q));
  }
  const place = (v, cote, position, largeur) => {
    const k = v.noms_cotes.indexOf(cote);
    if (k < 0) return null;
    const L = v.cotes_cm[k], w = Math.min(largeur, L);
    const s0 = typeof position === "number" ? position : position === "gauche" ? 0 : position === "centre" ? (L - w) / 2 : L - w;
    return { cote: k, nom: cote, debut_cm: rnd2(s0, 1), largeur_cm: w };
  };
  const disp = p.disposition_trapeze;
  for (const v of out) {
    if (!p.porte || v.id === 7) {
      v.porte = null;
      continue;
    }
    const perso = v.id === 13 && disp;
    v.porte = perso ? place(v, disp.porte_cote, disp.porte_position, +(disp.porte_largeur_cm || p.porte.largeur_cm)) : place(v, "avant", p.porte.position, +p.porte.largeur_cm);
    if (!perso) continue;
    if (v.porte) {
      const ch = +(disp.porte_chambranle_cm || 0), mg = +(disp.porte_marge_cm || 0), k = v.porte.cote, w = v.porte.largeur_cm;
      const r2 = v.polygone, I = inset_ordre(r2, ep), a = r2[k], b = r2[(k + 1) % r2.length], L = v.cotes_cm[k];
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, le_long = (z) => (z[0] - a[0]) * ux + (z[1] - a[1]) * uy;
      const min = le_long(I[k]) + mg + ch, max = le_long(I[(k + 1) % r2.length]) - mg - ch - w;
      const pos = disp.porte_position;
      const s0 = typeof pos === "number" ? Math.min(Math.max(pos, min), max) : pos === "gauche" ? min : pos === "centre" ? (min + max) / 2 : max;
      const Hm = +p.murs.hauteur_cm;
      v.porte = { ...v.porte, vitree: disp.porte_vitree !== false, debut_cm: rnd2(s0, 1), chambranle_cm: ch, marge_cm: mg, hauteur_cm: rnd2(Math.min(+(disp.porte_hauteur_cm || Hm), Hm - mg - ch), 1), tient: max >= min - 1e-6 };
    }
    v.fenetres = (disp.fenetres || []).map((f) => {
      const k = v.noms_cotes.indexOf(f.cote);
      if (k < 0) return null;
      const L = v.cotes_cm[k], w = +f.largeur_cm;
      const s0 = typeof f.position === "number" ? +f.position : f.position === "gauche" ? 0 : f.position === "centre" ? (L - w) / 2 : L - w;
      return { cote: k, nom: f.cote, debut_cm: rnd2(s0, 1), largeur_cm: w, hauteur_cm: +f.hauteur_cm, allege_cm: +f.allege_cm, ouvrant: !!f.ouvrant, tient: s0 >= 0 && s0 + w <= L + 1e-6 };
    }).filter(Boolean);
    const r = v.polygone, inter = inset(r, r.map(() => ep));
    v.bureaux = (disp.bureaux || []).map((b) => {
      const i = v.noms_cotes.indexOf(b.cote);
      if (i < 0) return null;
      const a = r[i], c = r[(i + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, e = ep + +b.profondeur_cm;
      const nx = -(c[1] - a[1]) / l * e, ny = (c[0] - a[0]) / l * e;
      const q = clip_half(inter, [a[0] + nx, a[1] + ny], [c[0] + nx, c[1] + ny], false);
      return { cote: b.cote, profondeur_cm: +b.profondeur_cm, longueur_cm: v.cotes_interieures_cm[i], aire_m2: rnd2(poly_area(q) / 1e4, 2), polygone: q.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]), brut: q };
    }).filter(Boolean);
    let occ = v.bureaux.reduce((s, b) => s + poly_area(b.brut), 0);
    for (let i = 0; i < v.bureaux.length; i++) for (let j = i + 1; j < v.bureaux.length; j++) occ -= poly_area(clip_convex(v.bureaux[i].brut, v.bureaux[j].brut));
    const dedans_int = (z) => inter.every((a, i) => {
      const b = inter[(i + 1) % inter.length];
      return (b[0] - a[0]) * (z[1] - a[1]) - (b[1] - a[1]) * (z[0] - a[0]) >= -1e-6;
    });
    const poses = [];
    v.sieges = (disp.sieges || []).map((st) => {
      const bu = v.bureaux.find((b) => b.cote === st.contre);
      if (!bu) return null;
      const i = v.noms_cotes.indexOf(bu.cote), a = r[i], c = r[(i + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux, e = ep + bu.profondeur_cm, W = +st.largeur_cm, Dp = +st.profondeur_cm;
      const carre = (s) => [[a[0] + ux * s + nx * e, a[1] + uy * s + ny * e], [a[0] + ux * (s + W) + nx * e, a[1] + uy * (s + W) + ny * e], [a[0] + ux * (s + W) + nx * (e + Dp), a[1] + uy * (s + W) + ny * (e + Dp)], [a[0] + ux * s + nx * (e + Dp), a[1] + uy * s + ny * (e + Dp)]];
      const libre = (s) => {
        const q2 = carre(s);
        return q2.every(dedans_int) && [...v.bureaux.filter((b) => b !== bu).map((b) => b.brut), ...poses].every((o) => poly_area(clip_convex(q2, o)) < 1);
      };
      let run = null, cur = null;
      for (let s = 0; s <= l; s += 1) {
        if (libre(s)) {
          cur = cur ? [cur[0], s] : [s, s];
          if (!run || cur[1] - cur[0] > run[1] - run[0]) run = [...cur];
        } else cur = null;
      }
      if (!run) return { type: st.type, largeur_cm: W, profondeur_cm: Dp, contre: st.contre, tient: false, polygone: [] };
      const s0 = typeof st.position === "number" ? Math.min(run[0] + +st.position, run[1]) : st.position === "debut" ? run[0] : st.position === "fin" ? run[1] : (run[0] + run[1]) / 2;
      const q = carre(Math.round(s0));
      poses.push(q);
      return { type: st.type, largeur_cm: W, profondeur_cm: Dp, contre: st.contre, tient: true, debut_cm: Math.round(s0), polygone: q.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]) };
    }).filter(Boolean);
    if (disp.lit_pliant) {
      const LW = +disp.lit_pliant.largeur_cm, LL = +disp.lit_pliant.longueur_cm;
      const acces = [];
      if (v.porte) {
        const k = v.porte.cote, a = r[k], c = r[(k + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        const s0 = v.porte.debut_cm, s1 = s0 + v.porte.largeur_cm, pr = ep + +(disp.lit_pliant.acces_porte_cm ?? 60);
        acces.push([[a[0] + ux * s0, a[1] + uy * s0], [a[0] + ux * s1, a[1] + uy * s1], [a[0] + ux * s1 + nx * pr, a[1] + uy * s1 + ny * pr], [a[0] + ux * s0 + nx * pr, a[1] + uy * s0 + ny * pr]]);
      }
      const sous2 = !!disp.lit_pliant.sous_bureau;
      const fixes = sous2 ? acces : [...v.bureaux.map((b) => b.brut), ...acces];
      const candidats = [];
      const kc = disp.lit_pliant.contre ? v.noms_cotes.findIndex((nm) => nm.startsWith(disp.lit_pliant.contre)) : -1;
      let mur = null;
      if (kc >= 0) {
        const a = r[kc], c = r[(kc + 1) % r.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uy = (c[1] - a[1]) / l, nx = -uy, ny = ux;
        mur = { a, ux, uy, nx, ny };
        for (let s = 0; s + LL <= l; s += 1) candidats.push({ s, q: [[a[0] + ux * s + nx * ep, a[1] + uy * s + ny * ep], [a[0] + ux * (s + LL) + nx * ep, a[1] + uy * (s + LL) + ny * ep], [a[0] + ux * (s + LL) + nx * (ep + LW), a[1] + uy * (s + LL) + ny * (ep + LW)], [a[0] + ux * s + nx * (ep + LW), a[1] + uy * s + ny * (ep + LW)]] });
      } else {
        const xs = inter.map((z) => z[0]), ys = inter.map((z) => z[1]);
        const angles = [0, 90, ...r.map((a, i) => {
          const c = r[(i + 1) % r.length];
          return Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI;
        })];
        for (const deg of angles) {
          const t = deg * Math.PI / 180, ca = Math.cos(t), sa = Math.sin(t);
          for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2)
            candidats.push({ q: [[x, y], [x + ca * LL, y + sa * LL], [x + ca * LL - sa * LW, y + sa * LL + ca * LW], [x - sa * LW, y + ca * LW]] });
        }
      }
      let best2 = null;
      {
        for (const { q, s } of candidats) {
          if (!q.every(dedans_int)) continue;
          if (!fixes.every((o) => poly_area(clip_convex(q, o)) < 1)) continue;
          const dessous = sous2 ? v.bureaux.reduce((s2, b) => s2 + poly_area(clip_convex(q, b.brut)), 0) : 0;
          const gene = poses.reduce((s2, o) => s2 + poly_area(clip_convex(q, o)), 0);
          const cout = dessous * 1e3 + gene;
          if (!best2 || cout < best2.cout - 1) best2 = { gene, dessous, cout, q, s };
        }
      }
      v.lit_pliant = best2 ? {
        largeur_cm: LW,
        longueur_cm: LL,
        tient: true,
        gene_sieges_m2: rnd2(best2.gene / 1e4, 2),
        sous_bureau_cm2: rnd2(best2.dessous, 0),
        polygone: best2.q.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]),
        // rabattable : replie a plat contre le mur, deux fixations (charnieres) sur la face interieure
        ...mur ? (() => {
          const e = +(disp.lit_pliant.epaisseur_replie_cm ?? 10), s0 = best2.s, { a, ux, uy, nx, ny } = mur, at = (s, d) => [a[0] + ux * s + nx * d, a[1] + uy * s + ny * d];
          const rep = [at(s0, ep), at(s0 + LL, ep), at(s0 + LL, ep + e), at(s0, ep + e)], fx = [at(s0 + 15, ep), at(s0 + LL - 15, ep)];
          return { contre: v.noms_cotes[kc], debut_cm: s0, replie: rep.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]), epaisseur_replie_cm: e, fixations: fx.map(([x, y]) => [rnd2(x, 1), rnd2(y, 1)]) };
        })() : {}
      } : { largeur_cm: LW, longueur_cm: LL, tient: false, polygone: [] };
    }
    for (const b of v.bureaux) delete b.brut;
    v.bureaux_m2 = rnd2(occ / 1e4, 2);
    v.sol_libre_m2 = rnd2((poly_area(inter) - occ) / 1e4, 2);
  }
  return out.sort((a, b) => a.id - b.id);
}
function svgHeader(w, h2, nu = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h2}"${nu ? ` width="${w}" height="${h2}"` : ""} font-family="system-ui,sans-serif" font-size="13">
${nu ? "" : `<rect width="${w}" height="${h2}" fill="#fbfbf8"/>
`}`;
}
function line(x1, y1, x2, y2, stroke = "#333", w = 1, dash = "") {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}"${d}/>
`;
}
function text(x, y, s, anchor = "middle", fill = "#222", size = 13, weight = "normal") {
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}">${s}</text>
`;
}
function poly(pts, fill, stroke, w = 2, dash = "") {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<polygon points="${pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"${d}/>
`;
}
function tw(s, size) {
  return s.length * size * 0.58;
}
function plan_sol_svg(p, g, openings, sans_entete = false) {
  const pad = 90, scale = 0.42;
  const { A, G } = g.cotes;
  const d = g.dalle;
  const allx = [0, A, ...d ? d.polygone.map((q) => q[0]) : []];
  const ally = [0, G, ...d ? d.polygone.map((q) => q[1]) : []];
  const minx = Math.min(...allx), maxx = Math.max(...allx), miny = Math.min(...ally), maxy = Math.max(...ally);
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de sol \xB7 ${A} \xD7 ${G} cm \xB7 ${g.aire_m2} m\xB2`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (v) => [pad + xoff + (v[0] - minx) * scale, H - pad - (v[1] - miny) * scale];
  let svg = svgHeader(rnd2(W), rnd2(H));
  if (d) svg += poly(d.polygone.map(P), "#eeeae0", "#a89f8a", 1.5, "6 4");
  svg += poly(g.verts.map(P), "#dce8f5", "#2b5d8a", 2);
  if (d) for (const w of d.murs) {
    const a = P(w.de), b = P(w.a), wl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ex = -(b[1] - a[1]) / wl * 2.5, ey = (b[0] - a[0]) / wl * 2.5;
    svg += line(a[0] + ex, a[1] + ey, b[0] + ex, b[1] + ey, "#5b4a3a", 5);
  }
  if (d && d.murs.length && !sans_entete) svg += text(W / 2, 60, `${legende_clotures(d)} (limite infranchissable)`, "middle", "#5b4a3a", 10);
  if (d && d.passage && d.passage.cm > 0 && d.passage.cm < 200) {
    const col = d.passage.etat === "praticable" ? "#2a8a4a" : d.passage.etat === "de profil" ? "#c77d0a" : "#c0392b";
    const [a, b] = d.passage.segment.map(P);
    svg += line(a[0], a[1], b[0], b[1], col, 2.5);
    svg += text(b[0] + 8, b[1] - 6, `passage ${f0(d.passage.cm)} cm`, "start", col, 11, "bold");
  }
  if (d && d.hors_dalle) {
    svg += `<defs><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c0392b" stroke-width="2"/></pattern></defs>
`;
    for (const piece of d.hors_dalle_polygones) svg += poly(piece.map(P), "url(#hach)", "#c0392b", 1.5);
    const c = P([A / 2, G / 2]);
    svg += text(c[0], c[1] + 4, `hors dalle ${d.hors_dalle_m2} m\xB2`, "middle", "#c0392b", 11, "bold");
  }
  if (d) {
    const n = d.polygone.length;
    d.polygone.forEach((a, i) => {
      const b = d.polygone[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;
      const along = i === 0 ? 0.12 : i === 1 ? 0.25 : i === n - 1 ? 0.08 : 0.5;
      const off = i === 0 ? 34 : 12;
      const q = P([a[0] + (b[0] - a[0]) * along, a[1] + (b[1] - a[1]) * along]);
      const anchor = nx > 0.3 ? "start" : nx < -0.3 ? "end" : "middle";
      svg += text(q[0] + nx * off, q[1] - ny * off + 4, `dalle ${f0(d.cotes_cm[i])}`, anchor, "#8a8170", 10);
    });
  }
  const labels = {
    A: [A / 2, 0, "middle", 0, 18],
    D: [A, G / 2, "start", 8, 4],
    B: [A / 2, G, "middle", 0, -8],
    G: [0, G / 2, "end", -8, 4]
  };
  const vals = { A, D: G, B: A, G };
  for (const k of Object.keys(labels)) {
    const [x, y, anchor, dx, dy] = labels[k];
    const q = P([x, y]);
    svg += text(q[0] + dx, q[1] + dy, `${k} = ${f0(vals[k])} cm`, anchor, "#2b5d8a", 14, "bold");
  }
  const edge = { A: [0, 1], D: [1, 2], B: [2, 3], G: [3, 0] };
  for (const o of openings) {
    const [i1, i2] = edge[o.face];
    const v1 = g.verts[i1], v2 = g.verts[i2];
    const Lf = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
    const ux = (v2[0] - v1[0]) / Lf, uy = (v2[1] - v1[1]) / Lf;
    const s0 = o.start_cm, s1 = o.start_cm + o.largeur_cm;
    const q0 = P([v1[0] + ux * s0, v1[1] + uy * s0]);
    const q1 = P([v1[0] + ux * s1, v1[1] + uy * s1]);
    const owx = uy, owy = ux;
    if (o.type !== "porte") {
      svg += line(q0[0], q0[1], q1[0], q1[1], "#1b9aa8", 5);
      svg += text((q0[0] + q1[0]) / 2 + owx * 16, (q0[1] + q1[1]) / 2 + owy * 16 + 4, `fen. ${itr(o.largeur_cm)}`, "middle", "#137", 10);
      continue;
    }
    const dwpx = o.largeur_cm * scale;
    const oe = [q0[0] + owx * dwpx, q0[1] + owy * dwpx];
    svg += line(q0[0], q0[1], q1[0], q1[1], "#c0392b", 5);
    svg += line(q0[0], q0[1], oe[0], oe[1], "#c0392b", 2);
    svg += `<path d="M ${f1(q1[0])} ${f1(q1[1])} A ${f1(dwpx)} ${f1(dwpx)} 0 0 1 ${f1(oe[0])} ${f1(oe[1])}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>
`;
    svg += text((q0[0] + q1[0]) / 2 + owx * (dwpx + 14), (q0[1] + q1[1]) / 2 + owy * (dwpx + 14), `porte ${itr(o.largeur_cm)} (ouvre dehors)`, "middle", "#c0392b", 11);
  }
  if (!sans_entete) {
    svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
    svg += text(W / 2, 44, "pente vers l'arri\xE8re (face B) \xB7 dalle r\xE9elle en pointill\xE9", "middle", "#888", 11);
  }
  svg += text(W / 2, H - 14, "AVANT (face A)", "middle", "#666", 12);
  svg += "</svg>\n";
  return svg;
}
function variante_svg(v, P, scale, sobre = false) {
  const q = v.polygone, n = q.length, BLEU = "#2b5d8a", ANGLE = "#b0452a";
  let svg = poly(q.map(P), "#cfe0f1", BLEU, 2.5);
  for (const bu of sobre ? [] : v.bureaux || []) {
    svg += poly(bu.polygone.map(P), "#e6c79c", "#9a7040", 1.2);
    const c2 = bu.polygone.reduce((s, w) => [s[0] + w[0] / bu.polygone.length, s[1] + w[1] / bu.polygone.length], [0, 0]), pc = P(c2);
    const vertical = bu.cote.startsWith("gauche") || bu.cote.startsWith("droite");
    svg += `<text x="${f1(pc[0])}" y="${f1(pc[1])}" text-anchor="middle" dominant-baseline="middle" fill="#7a5530" font-size="11" font-weight="bold"${vertical ? ` transform="rotate(-90 ${f1(pc[0])} ${f1(pc[1])})"` : ""}>bureau ${fz2(bu.profondeur_cm)} \xD7 ${fz2(bu.longueur_cm)}</text>
`;
  }
  for (const st of sobre ? [] : v.sieges || []) {
    if (!st.tient) continue;
    svg += poly(st.polygone.map(P), "#dcdce6", "#55556a", 1.2);
    const c2 = P([st.polygone.reduce((s, z) => s + z[0], 0) / 4, st.polygone.reduce((s, z) => s + z[1], 0) / 4]);
    svg += text(c2[0], c2[1] - (st.largeur_cm >= 50 ? 4 : -3), st.largeur_cm >= 50 ? st.type : "tab.", "middle", "#44445a", st.largeur_cm >= 50 ? 10 : 8, "bold");
    if (st.largeur_cm >= 50) svg += text(c2[0], c2[1] + 10, `${fz2(st.largeur_cm)} \xD7 ${fz2(st.profondeur_cm)}`, "middle", "#44445a", 9);
  }
  if (!sobre && v.lit_pliant && v.lit_pliant.tient) {
    const lp = v.lit_pliant;
    if (lp.replie) {
      svg += poly(lp.replie.map(P), "#d9c8ec", "#6a3d9a", 1.5);
      for (const z of lp.fixations) {
        const c2 = P(z);
        svg += `<rect x="${f1(c2[0] - 3)}" y="${f1(c2[1] - 3)}" width="6" height="6" fill="#6a3d9a"/>
`;
      }
    }
    svg += poly(lp.polygone.map(P), "none", "#6a3d9a", 1.8, "7 4");
    const [q0, q1, q2, q3] = lp.polygone;
    const tete = P([q0[0] + (q3[0] - q0[0]) / 2 + (q1[0] - q0[0]) * 0.12, q0[1] + (q3[1] - q0[1]) / 2 + (q1[1] - q0[1]) * 0.12]);
    svg += text(tete[0], tete[1] - 2, `lit ${lp.replie ? "rabattable" : "pliant"} ${fz2(lp.largeur_cm)} \xD7 ${fz2(lp.longueur_cm)}`, "middle", "#6a3d9a", 10, "bold");
    if (lp.sous_bureau_cm2 > 0) svg += text(tete[0], tete[1] + 11, "pied sous le bureau", "middle", "#6a3d9a", 9);
  }
  q.forEach((a, i) => {
    const b = q[(i + 1) % n], pa = P(a), pb = P(b);
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const ux = (pb[0] - pa[0]) / len, uy = (pb[1] - pa[1]) / len, nx = uy, ny = -ux;
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180;
    else if (rot < -90) rot += 180;
    const m = [(pa[0] + pb[0]) / 2 + nx * 14, (pa[1] + pb[1]) / 2 + ny * 14];
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${BLEU}" font-size="13" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${fz2(v.cotes_cm[i])}</text>
`;
  });
  q.forEach((b, i) => {
    const c2 = q[(i + 1) % n], u2 = Math.atan2(c2[1] - b[1], c2[0] - b[0]), ang = v.angles_deg[i] * Math.PI / 180;
    const r = 16 / scale, pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = u2 + ang * k / 12;
      pts.push(P([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]));
    }
    svg += `<polyline points="${pts.map((w) => `${f1(w[0])},${f1(w[1])}`).join(" ")}" fill="none" stroke="${ANGLE}" stroke-width="1.2"/>
`;
    if (Math.abs(v.angles_deg[i] - 90) > 0.05) {
      const bis = u2 + ang / 2, tp = P([b[0] + 40 / scale * Math.cos(bis), b[1] + 40 / scale * Math.sin(bis)]);
      svg += text(tp[0], tp[1] + 4, `${f1(v.angles_deg[i])}\xB0`, "middle", ANGLE, 11, "bold");
    }
  });
  for (const f of v.fenetres || []) {
    const a = q[f.cote], b = q[(f.cote + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const col = f.tient ? "#1b9aa8" : "#c0392b";
    const h0 = P([a[0] + ux * f.debut_cm, a[1] + uy * f.debut_cm]), h1 = P([a[0] + ux * (f.debut_cm + f.largeur_cm), a[1] + uy * (f.debut_cm + f.largeur_cm)]);
    svg += line(h0[0], h0[1], h1[0], h1[1], col, 6);
    const m = P([a[0] + ux * (f.debut_cm + f.largeur_cm / 2) + uy * 12 / scale, a[1] + uy * (f.debut_cm + f.largeur_cm / 2) - ux * 12 / scale]);
    svg += text(m[0], m[1] + 4, `fen. ${fz2(f.largeur_cm)}\xD7${fz2(f.hauteur_cm)}${f.ouvrant ? " ouvr." : " fixe"}`, "middle", col, 10, "bold");
  }
  if (v.porte) {
    const k = v.porte.cote, a = q[k], b = q[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), w = v.porte.largeur_cm, s0 = v.porte.debut_cm;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, ox = uy, oy = -ux;
    const f0w = [a[0] + ux * s0, a[1] + uy * s0], hw = [a[0] + ux * (s0 + w), a[1] + uy * (s0 + w)];
    const h0 = P(f0w), h1 = P(hw), ext = P([hw[0] + ox * w, hw[1] + oy * w]);
    if (v.porte.chambranle_cm) {
      const e = v.porte.chambranle_cm, c0 = P([a[0] + ux * (s0 - e), a[1] + uy * (s0 - e)]), c1 = P([a[0] + ux * (s0 + w + e), a[1] + uy * (s0 + w + e)]);
      svg += line(c0[0], c0[1], h0[0], h0[1], "#7a5530", 7);
      svg += line(h1[0], h1[1], c1[0], c1[1], "#7a5530", 7);
    }
    svg += line(h0[0], h0[1], h1[0], h1[1], "#c0392b", 5);
    svg += line(h1[0], h1[1], ext[0], ext[1], "#c0392b", 2);
    const arc = [];
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI / 2 * i / 16;
      arc.push(P([hw[0] + w * (-ux * Math.cos(t) + ox * Math.sin(t)), hw[1] + w * (-uy * Math.cos(t) + oy * Math.sin(t))]));
    }
    svg += `<polyline points="${arc.map((z) => `${f1(z[0])},${f1(z[1])}`).join(" ")}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>
`;
    const m = P([(f0w[0] + hw[0]) / 2 + ox * 18 / scale, (f0w[1] + hw[1]) / 2 + oy * 18 / scale]);
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="#c0392b" font-size="11" font-weight="bold"${k === 0 ? "" : ` transform="rotate(${f1(Math.atan2(-uy, ux) * 180 / Math.PI + (uy > 0 ? 180 : 0))} ${f1(m[0])} ${f1(m[1])})"`}>porte ${fz2(w)}</text>
`;
  }
  for (const ps of v.passages || []) {
    const pc = ps.cm, col = pc < 35 ? "#c0392b" : pc < 50 ? "#c77d0a" : "#2a8a4a";
    if (!(pc > 0) || pc > 150) continue;
    const [a, b] = ps.segment.map(P);
    svg += line(a[0], a[1], b[0], b[1], col, 2.5);
    svg += `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="3" fill="${col}"/>
`;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let nx = -uy, ny = ux;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180;
    else if (rot < -90) rot += 180;
    const m = [(a[0] + b[0]) / 2 + nx * 9, (a[1] + b[1]) / 2 + ny * 9];
    svg += `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="11" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${fz2(pc)}</text>
`;
  }
  const cx = q.reduce((s, w) => s + w[0], 0) / n, cy = q.reduce((s, w) => s + w[1], 0) / n, c = P([cx, cy]);
  svg += text(c[0], c[1], `${v.aire_m2} m\xB2`, "middle", BLEU, 22, "bold");
  svg += text(c[0], c[1] + 18, `int\xE9rieur ${v.aire_interieure_m2} m\xB2`, "middle", BLEU, 12);
  return svg;
}
var legende_clotures = (d) => {
  const types = new Set((d.murs || []).map((w) => w.type));
  const parts = [types.has("palissade") ? "brun = palissade bois" : "", types.has("mur") ? "brun = mur" : "", types.has("grillage") ? "vert pointill\xE9 = grillage" : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "brun = mur de propri\xE9t\xE9";
};
function entete_implantation(v, d) {
  return { nom: "Implantation sur la dalle", detail: `abri ${v.aire_m2} m\xB2 sur ${d.aire_m2} m\xB2 de dalle`, lignes: [`${legende_clotures(d)} \xB7 orange = distance aux bords \xB7 vert = passage derri\xE8re \xB7 hachures = rangement cach\xE9`] };
}
function plan_dalle_svg(g, avecBandes = false, v = null, m = null, sans_entete = false) {
  const d = g.dalle;
  const zu = !m && (avecBandes || v) ? d.zone_utile : null;
  const [ox, oy] = d.decalage_cm;
  const q = d.polygone.map(([x, y]) => [x + ox, y + oy]);
  const n = q.length, scale = 1.25, pad = sans_entete ? 85 : 110, top = sans_entete ? 0 : 90;
  const xs = q.map((v2) => v2[0]), ys = q.map((v2) => v2[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const pw = v && v.porte ? v.porte.largeur_cm * scale - 60 : 0;
  const W = (maxx - minx) * scale + 2 * pad + (v && v.porte && v.porte.cote !== 0 ? Math.max(0, pw) : 0);
  const H = (maxy - miny) * scale + pad + top + 40 + (v && v.porte && v.porte.cote === 0 ? Math.max(0, pw) : 0);
  const P = (v2) => [pad + (v2[0] - minx) * scale, top + 40 + (maxy - v2[1]) * scale];
  const mur = new Set(d.murs.map((w) => w.cote));
  const BRUN = "#5b4a3a", GRIS = "#6f675a", COTE = "#2b5d8a", ANGLE = "#b0452a", GRILLAGE = "#5f8a4a";
  const leg_cloture = legende_clotures(d);
  let svg = svgHeader(rnd2(W), rnd2(H), sans_entete);
  if (zu) svg += `<defs><pattern id="bande" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f3e3cf"/><line x1="0" y1="0" x2="0" y2="7" stroke="#e0b98a" stroke-width="2"/></pattern></defs>
`;
  svg += poly(q.map(P), zu ? "url(#bande)" : "#e9e5da", GRIS, 2);
  if (zu) svg += poly(zu.polygone.map(P), "#e3efe0", "#2a8a4a", 1.8, v ? "5 4" : "");
  const { A, G } = g.cotes;
  if (!v) {
    svg += poly([[ox, oy], [ox + A, oy], [ox + A, oy + G], [ox, oy + G]].map(P), "none", "#9bb5cf", 1, "5 4");
    const c = P([ox + A / 2, oy + G / 2]);
    svg += text(c[0], c[1] + (zu ? 60 : 0), `abri ${A} \xD7 ${G}`, "middle", "#9bb5cf", 11);
  }
  q.forEach((a, i) => {
    const b = q[(i + 1) % n], pa = P(a), pb = P(b);
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const ux = (pb[0] - pa[0]) / len, uy = (pb[1] - pa[1]) / len;
    const nx = -uy, ny = ux;
    const est_mur = mur.has(d.cotes_noms[i]), cloture = d.murs.find((w) => w.cote === d.cotes_noms[i]);
    if (est_mur && cloture && cloture.type === "grillage") svg += line(pa[0] + nx * 3, pa[1] + ny * 3, pb[0] + nx * 3, pb[1] + ny * 3, GRILLAGE, 3, "7 4");
    else if (est_mur) svg += line(pa[0] + nx * 4, pa[1] + ny * 4, pb[0] + nx * 4, pb[1] + ny * 4, BRUN, 6);
    const off = 30;
    const a2 = [pa[0] + nx * off, pa[1] + ny * off], b2 = [pb[0] + nx * off, pb[1] + ny * off];
    svg += line(pa[0] + nx * 8, pa[1] + ny * 8, pa[0] + nx * (off + 5), pa[1] + ny * (off + 5), "#999", 0.8);
    svg += line(pb[0] + nx * 8, pb[1] + ny * 8, pb[0] + nx * (off + 5), pb[1] + ny * (off + 5), "#999", 0.8);
    svg += line(a2[0], a2[1], b2[0], b2[1], COTE, 1.2);
    for (const e of [a2, b2]) svg += line(e[0] - (ux - nx) * 4, e[1] - (uy - ny) * 4, e[0] + (ux - nx) * 4, e[1] + (uy - ny) * 4, COTE, 1.2);
    let rot = Math.atan2(uy, ux) * 180 / Math.PI;
    if (rot > 90) rot -= 180;
    else if (rot < -90) rot += 180;
    const m2 = [(a2[0] + b2[0]) / 2 + nx * 8, (a2[1] + b2[1]) / 2 + ny * 8];
    const lbl = `${fz2(d.cotes_cm[i])} cm${est_mur ? " \xB7 mur" : ""}`;
    svg += `<text x="${f1(m2[0])}" y="${f1(m2[1])}" text-anchor="middle" dominant-baseline="middle" fill="${COTE}" font-size="13" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m2[0])} ${f1(m2[1])})">${lbl}</text>
`;
  });
  q.forEach((b, i) => {
    if (v && i < 2) return;
    const cc = q[(i + 1) % n];
    const u2 = Math.atan2(cc[1] - b[1], cc[0] - b[0]), ang = d.angles_deg[i] * Math.PI / 180;
    const r = 22 / scale, pts = [];
    for (let k = 0; k <= 16; k++) {
      const t = u2 + ang * k / 16;
      pts.push(P([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]));
    }
    svg += `<polyline points="${pts.map((v2) => `${f1(v2[0])},${f1(v2[1])}`).join(" ")}" fill="none" stroke="${ANGLE}" stroke-width="1.5"/>
`;
    const bis = u2 + ang / 2, rl = 44 / scale;
    const tp = P([b[0] + rl * Math.cos(bis), b[1] + rl * Math.sin(bis)]);
    const suppose = i < 2 ? "*" : "";
    svg += text(tp[0], tp[1] + 4, `${f1(d.angles_deg[i])}\xB0${suppose}`, "middle", ANGLE, 12, "bold");
  });
  if (m) {
    svg += poly(m.toit.contour.map(P), "none", "#7a6f5a", 1.2, "6 4");
    const dsc = P(m.toit.gouttiere.descente);
    for (const tr of m.toit.gouttiere.troncons) {
      const g0 = P(tr.de), g1 = P(tr.a);
      svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 4);
    }
    svg += `<circle cx="${f1(dsc[0])}" cy="${f1(dsc[1])}" r="5" fill="#1b6fa8"/>
`;
  }
  if (m && v && v.arriere) {
    svg += `<defs><pattern id="cache" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#6b8e23" stroke-width="1.6"/></pattern></defs>
`;
    for (const zone of v.arriere.polygones) svg += poly(zone.map(P), "url(#cache)", "#6b8e23", 1);
    const derniere = v.arriere.polygones[v.arriere.polygones.length - 1];
    const zx = derniere.map((z) => z[0]), zy = derniere.map((z) => z[1]);
    const c = P([(Math.min(...zx) + Math.max(...zx)) / 2 - 20, (Math.min(...zy) + Math.max(...zy)) / 2 + 12]);
    svg += text(c[0], c[1], `rangement cach\xE9`, "middle", "#4f6b18", 11, "bold") + text(c[0], c[1] + 13, `${v.arriere.aire_m2} m\xB2`, "middle", "#4f6b18", 11, "bold");
  }
  if (v) svg += variante_svg(v, P, scale, !!m);
  if (m && v) {
    svg += poly(m.interieur.map(P), "none", "#2b5d8a", 1, "3 2");
    q.forEach((a, i) => {
      if ((d.cotes_noms[i] || "").startsWith("arriere")) return;
      const b = q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let best = null;
      for (const z of v.polygone) {
        const t = Math.max(0, Math.min(1, ((z[0] - a[0]) * (b[0] - a[0]) + (z[1] - a[1]) * (b[1] - a[1])) / (l * l)));
        const f = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], dd = Math.hypot(z[0] - f[0], z[1] - f[1]);
        if (!best || dd < best.dd - 0.01) best = { dd, z, f };
      }
      if (!best || best.dd < 0.5) return;
      const za = P(best.z), fa = P(best.f);
      svg += line(za[0], za[1], fa[0], fa[1], "#b86e1f", 2);
      const horiz = Math.abs(fa[1] - za[1]) < Math.abs(fa[0] - za[0]);
      svg += text((za[0] + fa[0]) / 2 + (horiz ? 0 : 8), (za[1] + fa[1]) / 2 + (horiz ? -6 : 4), `${fz2(rnd2(best.dd, 1))}`, horiz ? "middle" : "start", "#b86e1f", 11, "bold");
    });
  }
  if (d.pointe_cm && !v) {
    const pt = d.pointe_cm, pp = P(pt), p0 = P([pt[0], 0]), pl = P([0, pt[1]]);
    svg += line(pp[0], pp[1], p0[0], p0[1], "#aaa", 0.8, "4 4");
    svg += line(pp[0], pp[1], pl[0], pl[1], "#aaa", 0.8, "4 4");
    svg += `<circle cx="${f1(pp[0])}" cy="${f1(pp[1])}" r="3" fill="${GRIS}"/>
`;
    svg += text(W / 2, 62, `pointe : ${f1(pt[0])} depuis la gauche, ${f1(pt[1])} depuis l'avant`, "middle", GRIS, 11);
    svg += text(p0[0] + 4, p0[1] - 8, `${f1(pt[0])}`, "start", "#999", 10);
    svg += text(pl[0] + 4, pl[1] - 6, `${f1(pt[1])}`, "start", "#999", 10);
  }
  if (zu && !v) {
    const m2 = zu.polygone.length;
    q.forEach((a, i) => {
      const b = q[(i + 1) % n], w = zu.bandes_cm[i];
      if (!(w > 0)) return;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const t = i === 0 ? 0.5 : d.cotes_noms[i] === "arriere_gauche" ? 0.7 : 0.35, off = w >= 20 ? w / 2 : w + 9 / scale;
      const s = P([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
      svg += text(s[0], s[1] + 4, `libre ${fz2(w)}`, "middle", "#b86e1f", 11, "bold");
    });
    zu.polygone.forEach((a, i) => {
      const b = zu.polygone[(i + 1) % m2];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const s = P([a[0] + (b[0] - a[0]) * 0.65 + nx * 12 / scale, a[1] + (b[1] - a[1]) * 0.65 + ny * 12 / scale]);
      svg += text(s[0], s[1] + 4, `${f1(zu.cotes_cm[i])}`, "middle", "#2a8a4a", 10);
    });
    const cx = zu.polygone.reduce((s, v2) => s + v2[0], 0) / m2, cy = zu.polygone.reduce((s, v2) => s + v2[1], 0) / m2;
    const cz = P([cx, cy]);
    svg += text(cz[0], cz[1], "zone utile", "middle", "#2a8a4a", 13, "bold");
    svg += text(cz[0], cz[1] + 22, `${zu.aire_m2} m\xB2`, "middle", "#2a8a4a", 20, "bold");
    svg += text(cz[0], cz[1] + 38, `bandes libres ${zu.bandes_m2} m\xB2`, "middle", "#b86e1f", 11);
  }
  const somme = d.angles_deg.reduce((s, x) => s + x, 0);
  if (m && v) {
    if (!sans_entete) svg += dessine_entete(W, entete_implantation(v, d));
  } else if (v) {
    if (!sans_entete) {
      svg += text(W / 2, 26, `Option ${v.id} \xB7 ${v.titre}`, "middle", "#222", 15, "bold");
      svg += text(W / 2, 46, `murs ${v.aire_m2} m\xB2 \xB7 int\xE9rieur ${v.aire_interieure_m2} m\xB2 \xB7 ${v.polygone.length} c\xF4t\xE9s`, "middle", "#2b5d8a", 13, "bold");
      svg += text(W / 2, 64, v.note, "middle", "#666", 11);
    }
  } else svg += text(W / 2, 26, zu ? `Dalle r\xE9elle ${d.aire_m2} m\xB2 \xB7 zone utile ${zu.aire_m2} m\xB2` : `Dalle r\xE9elle \xB7 ${n} c\xF4t\xE9s \xB7 ${d.aire_m2} m\xB2`, "middle", "#222", 15, "bold");
  if (!v) svg += text(W / 2, 44, `vue de dessus \xB7 cotes relev\xE9es au m\xE8tre \xB7 somme des angles ${f0(somme)}\xB0`, "middle", "#888", 11);
  if (!v) svg += text(W / 2, H - 30, "* angles avant suppos\xE9s droits", "middle", "#888", 10);
  svg += text(W / 2, H - 12, m ? `AVANT (jardin) \xB7 ${leg_cloture}` : v ? `AVANT (jardin) \xB7 ${leg_cloture} \xB7 vert pointill\xE9 = zone utile \xB7 trait color\xE9 = passage (cm)` : `AVANT (jardin) \xB7 ${leg_cloture}`, "middle", "#666", 11);
  svg += "</svg>\n";
  return svg;
}
function plan_toit_svg(p, g, t) {
  const pad = 70, scale = 0.42;
  const deb = p.toit.debord_cm;
  const { A, G } = g.cotes;
  const minx = -deb.gauche, maxx = A + +deb.droite, miny = -deb.avant, maxy = G + +deb.arriere;
  const base_W = (maxx - minx) * scale + 2 * pad;
  const H = (maxy - miny) * scale + 2 * pad;
  const title = `Plan de toiture \xB7 ${t.toit.nb_panneaux} panneaux \xB7 pente ${g.pente.pourcent} %`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const xoff = (W - base_W) / 2;
  const P = (x, y) => [pad + xoff + (x - minx) * scale, H - pad - (y - miny) * scale];
  let svg = svgHeader(rnd2(W), rnd2(H));
  svg += poly([P(minx, miny), P(maxx, miny), P(maxx, maxy), P(minx, maxy)], "#e8eee2", "#6b8e23", 2);
  svg += poly(g.verts.map((v) => P(v[0], v[1])), "none", "#999", 1, "6 4");
  const cover = +p.panneau.largeur_utile_cm;
  for (let x = minx + cover; x < maxx - 1e-6; x += cover) {
    const a = P(x, miny), b = P(x, maxy);
    svg += line(a[0], a[1], b[0], b[1], "#9aab7a", 1, "3 3");
  }
  for (let i = 0; i < t.toit.nb_panneaux; i++) {
    const x0 = minx + i * cover, x1 = Math.min(minx + (i + 1) * cover, maxx);
    const c = P((x0 + x1) / 2, miny + (maxy - miny) * 0.5);
    svg += text(c[0], c[1] + 6, `T${i + 1}`, "middle", "#8aa06a", 18, "bold");
  }
  for (const fx of [0.3, 0.7]) {
    const x = minx + (maxx - minx) * fx;
    const y0 = P(x, miny + 20), y1 = P(x, maxy - 20);
    svg += line(y0[0], y0[1], y1[0], y1[1], "#2b7", 2);
    svg += `<polygon points="${f0(y1[0])},${f0(y1[1])} ${f0(y1[0] - 5)},${f0(y1[1] + 9)} ${f0(y1[0] + 5)},${f0(y1[1] + 9)}" fill="#2b7"/>
`;
  }
  const top = P((minx + maxx) / 2, maxy), bot = P((minx + maxx) / 2, miny);
  svg += text(top[0], top[1] - 8, `${f0(maxx - minx)} cm`, "middle", "#50701d", 12, "bold");
  const side = P(maxx, (miny + maxy) / 2);
  svg += text(side[0] + 8, side[1] + 4, `${f0(t.toit.longueur_panneau_cm)} cm (rampant)`, "start", "#50701d", 11);
  svg += text(W / 2, 28, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, 44, `${g.pente.degres}\xB0 \xB7 \xE9coulement vers l'arri\xE8re`, "middle", "#888", 11);
  svg += text(bot[0], H - 16, "\xE9coulement de l'eau \u2192", "middle", "#2b7", 12);
  svg += "</svg>\n";
  return svg;
}
function plan_rehausse_svg(p, g, t) {
  if (t.rehausse.materiau === "bois") return plan_rehausse_bois_svg(p, g, t);
  const pad = 50, scale = 1;
  const cover = +p.panneau.largeur_utile_cm;
  const { A, G } = g.cotes;
  const drop = g.pente.chute_cm;
  const Lp = t.rehausse.longueur_panneau_cm;
  const title = `Rehausse \xB7 1 panneau ${f0(Lp)} \xD7 ${f0(cover)} cm \u2192 2 triangles + 1 bandeau`;
  const lab1 = `bande 1 : ${f0(G)} \xD7 ${f0(drop)}, coup\xE9e en diagonale = triangle G + triangle D`;
  const lab2 = `bande 2 : bandeau avant ${f0(A)} \xD7 ${f0(drop)}`;
  const labW = Math.max(tw(lab1, 11), tw(lab2, 11));
  const base_W = pad + Lp * scale + 16 + labW + 20;
  const H = cover * scale + 2 * pad + 20;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x, y) => [pad + x * scale, pad + 20 + y * scale];
  let svg = svgHeader(rnd2(W), rnd2(H));
  svg += poly([P(0, 0), P(Lp, 0), P(Lp, cover), P(0, cover)], "#f3f5f1", "#999", 1.5, "5 4");
  svg += poly([P(0, 0), P(G, 0), P(G, drop), P(0, drop)], "#fdf6e3", "#a07400", 2);
  const d0 = P(0, drop), d1 = P(G, 0);
  svg += line(d0[0], d0[1], d1[0], d1[1], "#a07400", 2, "6 3");
  svg += text(P(G * 0.12, 0)[0], P(0, drop)[1] - 4, "R2 (G)", "middle", "#a07400", 11, "bold");
  svg += text(P(G * 0.88, 0)[0], P(0, 0)[1] + 12, "R3 (D)", "middle", "#a07400", 11, "bold");
  const y2 = drop + 8;
  svg += poly([P(0, y2), P(A, y2), P(A, y2 + drop), P(0, y2 + drop)], "#e3ecf7", "#2b5d8a", 2);
  svg += text(P(A / 2, 0)[0], P(0, y2 + drop / 2)[1] + 4, "R1 \xB7 bandeau A", "middle", "#2b5d8a", 11, "bold");
  const lx = P(Lp, 0)[0] + 16;
  svg += text(lx, P(0, drop / 2)[1] + 4, lab1, "start", "#a07400", 11);
  svg += text(lx, P(0, y2 + drop / 2)[1] + 4, lab2, "start", "#2b5d8a", 11);
  svg += text(lx, P(0, cover)[1], `panneau ${f0(Lp)} \xD7 ${f0(cover)} cm (reste = chute)`, "start", "#999", 11);
  svg += text(P(Lp / 2, 0)[0], P(0, 0)[1] - 8, `${f0(Lp)} cm`, "middle", "#666", 11);
  svg += text(P(0, 0)[0] - 6, P(0, drop / 2)[1] + 4, `${f0(drop)}`, "end", "#a07400", 11);
  svg += text(P(0, 0)[0] - 6, P(0, y2 + drop / 2)[1] + 4, `${f0(drop)}`, "end", "#2b5d8a", 11);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, H - 12, "toutes coupes droites + une seule diagonale \xB7 le triangle D est le m\xEAme que G, tourn\xE9 de 180\xB0", "middle", "#888", 11);
  svg += "</svg>\n";
  return svg;
}
function plan_rehausse_bois_svg(p, g, t) {
  const pad = 50, scale = 1;
  const { A, G } = g.cotes;
  const drop = g.pente.chute_cm;
  const r = t.rehausse;
  const stock = r.longueur_stock_cm;
  const title = `Rehausse bois \xB7 ${r.nb_madriers} madrier ${r.section_mm[0]}\xD7${r.section_mm[1]} de ${f2(stock / 100)} m \u2192 R1 + R2 + R3`;
  const lab1 = `R2+R3 : ${f0(G)} cm coup\xE9 en diagonale = 2 coins (R3 tourn\xE9 de 180\xB0)`;
  const lab2 = `R1 : bandeau avant ${f0(A)} cm, coupe droite`;
  const base_W = Math.max(stock, A + G + 4) * scale + 2 * pad;
  const H = drop * scale + 2 * pad + 60;
  const W = Math.max(base_W, tw(title, 15) + 24, tw(lab1, 11) + 2 * pad);
  const xoff = (W - base_W) / 2;
  const P = (x, y) => [pad + xoff + x * scale, pad + 20 + y * scale];
  let svg = svgHeader(rnd2(W), rnd2(H));
  const wood = "#d9b98a", woodLine = "#8a5a2b";
  svg += poly([P(0, 0), P(stock, 0), P(stock, drop), P(0, drop)], "#f3f5f1", "#999", 1.5, "5 4");
  svg += poly([P(0, 0), P(G, 0), P(G, drop), P(0, drop)], wood, woodLine, 2);
  const d0 = P(0, drop), d1 = P(G, 0);
  svg += line(d0[0], d0[1], d1[0], d1[1], woodLine, 2, "6 3");
  svg += text(P(G * 0.12, 0)[0], P(0, drop)[1] - 4, "R2 (G)", "middle", woodLine, 11, "bold");
  svg += text(P(G * 0.88, 0)[0], P(0, 0)[1] + 12, "R3 (D)", "middle", woodLine, 11, "bold");
  const x2 = G + 4;
  svg += poly([P(x2, 0), P(x2 + A, 0), P(x2 + A, drop), P(x2, drop)], wood, woodLine, 2);
  svg += text(P(x2 + A / 2, 0)[0], P(0, drop / 2)[1] + 4, "R1 (A)", "middle", woodLine, 11, "bold");
  const ly = P(0, drop)[1] + 22;
  svg += text(P(0, 0)[0], ly, lab1, "start", woodLine, 11);
  svg += text(P(0, 0)[0], ly + 16, lab2, "start", woodLine, 11);
  svg += text(P(0, 0)[0], ly + 32, `chute de madrier : ${f0(Math.max(0, stock - A - G))} cm \xB7 section ${r.section_mm[0]} \xD7 ${r.section_mm[1]} mm = rehausse de ${fz2(drop)} cm`, "start", "#888", 11);
  svg += text(P(G / 2, 0)[0], P(0, 0)[1] - 8, `${f0(G)} cm`, "middle", "#666", 11);
  svg += text(P(x2 + A / 2, 0)[0], P(0, 0)[1] - 8, `${f0(A)} cm`, "middle", "#666", 11);
  svg += text(P(0, 0)[0] - 6, P(0, drop / 2)[1] + 4, `${fz2(drop)}`, "end", woodLine, 11);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += text(W / 2, H - 12, "pos\xE9 sur le chant des panneaux, viss\xE9, sert de lisse haute \xB7 larmier par-dessus \xE0 l'ext\xE9rieur", "middle", "#888", 11);
  svg += "</svg>\n";
  return svg;
}
function facade_svg(p, g, face, openings) {
  const pad = 60, scale = 0.6;
  const L = face.longueur_cm, h1 = face.hauteur_debut_cm, h2 = face.hauteur_fin_cm, Hm = face.hauteur_mur_cm;
  const cover = +p.panneau.largeur_utile_cm;
  const base_W = L * scale + 2 * pad;
  const H = Math.max(h1, h2) * scale + 2 * pad;
  const title = `Face ${face.cle} \u2014 ${face.libelle}`;
  const W = Math.max(base_W, tw(title, 15) + 24);
  const P = (x, h3) => [pad + x * scale, H - pad - h3 * scale];
  let svg = svgHeader(rnd2(W), rnd2(H));
  svg += poly([P(0, 0), P(L, 0), P(L, Hm), P(0, Hm)], "#eef2f6", "#2b5d8a", 2);
  for (let x = cover; x < L - 1e-6; x += cover) {
    const a = P(x, 0), b = P(x, Hm);
    svg += line(a[0], a[1], b[0], b[1], "#8fa3b8", 1, "4 3");
  }
  const boisF = p.rehausse && p.rehausse.materiau === "bois";
  const rf = boisF ? "#d9b98a" : "#fdf6e3", rs = boisF ? "#8a5a2b" : "#a07400";
  if (face.rehausse !== "aucune") {
    svg += poly([P(0, Hm), P(L, Hm), P(L, h2), P(0, h1)], rf, rs, 2);
    if (face.rehausse === "bandeau") {
      const mid = P(L / 2, (h1 + Hm) / 2);
      svg += text(mid[0], mid[1] + 4, `R1 \xB7 ${boisF ? "madrier" : "bandeau"} ${f0(L)} \xD7 ${fz2(h1 - Hm)}`, "middle", rs, 10, "bold");
    } else {
      const mid = P(L / 2, (h1 + h2) / 2);
      svg += text(mid[0], mid[1] - 8, `${face.cle === "G" ? "R2" : "R3"} \xB7 ${boisF ? "coin bois" : "triangle"} ${f0(L)} \xD7 ${fz2(Math.abs(h1 - h2))}`, "middle", rs, 10, "bold");
    }
  }
  for (const o of openings) {
    if (o.face !== face.cle) continue;
    const ow = o.largeur_cm * scale, oh = o.hauteur_cm * scale;
    const sx = pad + o.start_cm * scale;
    const by = H - pad - o.allege_cm * scale;
    svg += `<rect x="${f1(sx)}" y="${f1(by - oh)}" width="${f1(ow)}" height="${f1(oh)}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>
`;
    if (o.type === "porte") {
      svg += line(sx, by - oh / 2, sx - 16, by - oh / 2, "#1b6", 1, "3 3");
      svg += text(sx + ow / 2, by - oh / 2 - 6, o.largeur_cm >= cover - 0.5 ? "bloc-porte" : "porte", "middle", "#178", 11);
      svg += text(sx + ow / 2, by - oh / 2 + 8, `${itr(o.largeur_cm)}\xD7${itr(o.hauteur_cm)}`, "middle", "#178", 10);
    } else {
      svg += text(sx + ow / 2, by - oh / 2 - 2, o.ouvrant ? "fen\xEAtre ouvrante" : "fen\xEAtre fixe", "middle", "#178", 10);
      svg += text(sx + ow / 2, by - oh / 2 + 10, `${itr(o.largeur_cm)}\xD7${itr(o.hauteur_cm)}`, "middle", "#178", 9);
      svg += text(sx + ow / 2, by + 12, `all\xE8ge ${itr(o.allege_cm)}`, "middle", "#888", 9);
    }
  }
  const mine = openings.filter((o) => o.face === face.cle);
  for (let i = 0, n = Math.ceil(L / cover); i < n; i++) {
    const x0 = i * cover, x1 = Math.min((i + 1) * cover, L);
    const rep = panel_replaced_by(mine, face.cle, x0, x1, Hm);
    if (rep) {
      const c2 = P((x0 + x1) / 2, Hm * 0.9);
      svg += text(c2[0], c2[1] + 4, `${face.cle}${i + 1} = bloc-porte`, "middle", "#178", 10, "bold");
      continue;
    }
    const over = mine.filter((o) => o.start_cm < x1 && o.start_cm + o.largeur_cm > x0);
    const topOpen = over.length ? Math.max(...over.map((o) => o.allege_cm + o.hauteur_cm)) : 0;
    const hy = over.length ? Math.min(Hm - 6, topOpen + (Hm - topOpen) / 2) : Hm * 0.86;
    const c = P((x0 + x1) / 2, hy);
    svg += text(c[0], c[1] + 6, `${face.cle}${i + 1}`, "middle", "#9fb0c2", over.length && Hm - topOpen < 30 ? 11 : 18, "bold");
  }
  const nPan = Array.from({ length: Math.ceil(L / cover) }, (_, i) => panel_replaced_by(mine, face.cle, i * cover, Math.min((i + 1) * cover, L), Hm) ? 0 : 1).reduce((a, b) => a + b, 0);
  svg += text(pad + L * scale / 2, H - pad + 26, `${f0(L)} cm \xB7 ${nPan} panneau${nPan > 1 ? "x" : ""} de ${f0(Hm)}`, "middle", "#222", 13, "bold");
  svg += text(pad - 8, P(0, h1)[1], `${fz2(h1)}`, "end", "#2b5d8a", 12);
  svg += text(pad + L * scale + 8, P(L, h2)[1], `${fz2(h2)}`, "start", "#2b5d8a", 12);
  svg += text(W / 2, 26, title, "middle", "#222", 15, "bold");
  svg += "</svg>\n";
  return svg;
}
function buildCore(p) {
  const g = geometry(p);
  const openings = resolve_openings(p, g);
  const t = takeoff(p, g, openings);
  const sh = shopping(p, g, t, openings);
  const bud = budget(p, g, t, openings);
  const m = model3d(p, g, openings);
  const svg = {
    "plan-sol": plan_sol_svg(p, g, openings),
    "plan-toit": plan_toit_svg(p, g, t),
    "plan-rehausse": plan_rehausse_svg(p, g, t)
  };
  if (g.dalle) svg["plan-dalle"] = plan_dalle_svg(g);
  if (g.dalle && g.dalle.zone_utile) svg["plan-dalle-bandes"] = plan_dalle_svg(g, true);
  const vars = variantes(p, g);
  for (const v of vars) svg[`variante-${v.id}`] = plan_dalle_svg(g, true, v);
  const v13 = vars.find((v) => v.id === 13 && v.bureaux);
  const modele = v13 ? modele_trapeze(p, v13) : null;
  if (modele) modele.budget = budget_modele(p, v13, modele);
  if (modele) modele.guide = guide_montage(p, v13, modele);
  const modele3d = modele && g.dalle ? modele3d_abri(p, g, v13, modele) : null;
  if (modele) {
    svg["modele-implantation"] = plan_dalle_svg(g, false, v13, modele);
    svg["modele-sol"] = modele_sol_svg(p, v13, modele);
    svg["modele-toit"] = modele_toit_svg(v13, modele);
    svg["modele-rehausse"] = modele_rehausse_svg(modele);
    for (const f of modele.faces) svg[`modele-facade-${f.cle}`] = modele_facade_svg(modele, f);
  }
  for (const f of g.faces) svg[`facade-${f.cle}`] = facade_svg(p, g, f, openings);
  const planches = {};
  if (g.dalle) {
    planches.rectangle = { nom: `Rectangle ${g.cotes.A} \xD7 ${g.cotes.G}`, detail: `${g.aire_m2} m\xB2 de murs`, lignes: [], svg: plan_sol_svg(p, g, openings, true) };
    for (const v of vars) planches[`variante-${v.id}`] = { nom: `Option ${v.id}`, detail: v.titre, lignes: [], svg: plan_dalle_svg(g, true, v, null, true) };
  }
  if (modele && g.dalle) {
    planches.implantation = { ...entete_implantation(v13, g.dalle), svg: plan_dalle_svg(g, false, v13, modele, true) };
    planches.resume = { nom: "R\xE9sum\xE9", lignes: [], svg: resume_svg(g, v13, modele) };
    planches.sol = { ...entete_sol(p, v13), svg: modele_sol_svg(p, v13, modele, true) };
    planches.toit = { ...entete_toit(modele), svg: modele_toit_svg(v13, modele, true) };
    planches.rehausse = { ...entete_rehausse(modele), svg: modele_rehausse_svg(modele, true) };
    const plus_long = Math.max(...modele.faces.map((f) => f.longueur_cm));
    for (const f of modele.faces) planches[`facade-${f.cle}`] = { ...entete_facade(f), svg: modele_facade_svg(modele, f, true, plus_long) };
  }
  return { geometrie: g, debit: t, achats: sh, budget: bud, ouvertures: openings, model3d: m, variantes: vars, modele, modele3d, svg, planches };
}
var LETTRE = { avant: "A", droite: "D", fond: "B", gauche: "G" };
var lettre = (nom) => LETTRE[nom.split(" ")[0]] || "?";
function ranger_rehausse(pieces, section, stock) {
  const hauteur = (q, s, inverse) => {
    const t = inverse ? 1 - s / q.L : s / q.L;
    return q.h0 + (q.h1 - q.h0) * t;
  };
  const tient = (a, b, inverse) => {
    const m = Math.min(a.L, b.L);
    return [0, m].every((s) => hauteur(a, s, false) + hauteur(b, s, inverse) <= section + 1e-6);
  };
  const troncons = [];
  for (const q of [...pieces].sort((x, y) => y.L - x.L)) {
    const t = troncons.find((x) => x.pieces.length === 1 && (tient(x.pieces[0], q, false) || tient(x.pieces[0], q, true)));
    if (t) {
      t.inverse = !tient(t.pieces[0], q, false);
      t.pieces.push(q);
      t.L = Math.max(t.L, q.L);
    } else troncons.push({ pieces: [q], L: q.L, inverse: false });
  }
  const barres = [];
  for (const t of troncons) {
    const b = barres.find((x) => x.L + t.L <= stock + 1e-6);
    if (b) {
      t.x = b.L;
      b.troncons.push(t);
      b.L += t.L;
    } else {
      t.x = 0;
      barres.push({ troncons: [t], L: t.L });
    }
  }
  return barres.map((b) => ({ ...b, L: rnd2(b.L, 1), chute_cm: rnd2(stock - b.L, 1) }));
}
function modele_trapeze(p, v) {
  const d = p.disposition_trapeze, t = d && d.toit || {};
  const q = v.polygone, n = q.length;
  const H = +p.murs.hauteur_cm, c = +(t.chute_cm ?? p.toit.pente_chute_cm), mod = +p.panneau.largeur_utile_cm;
  const y0 = Math.min(...q.map((z) => z[1])), D = Math.max(...q.map((z) => z[1])) - y0;
  const x0 = Math.min(...q.map((z) => z[0])), Wd = Math.max(...q.map((z) => z[0])) - x0;
  const droite = t.sens === "droite", course = droite ? Wd : D;
  const h2 = (z) => H + c * (1 - (droite ? (z[0] - x0) / Wd : (z[1] - y0) / D));
  const porte_h = v.porte && v.porte.hauteur_cm ? +v.porte.hauteur_cm : +(d.porte_hauteur_cm || p.porte.hauteur_cm);
  const faces = q.map((a, i) => {
    const b = q[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const deux_fonds = v.noms_cotes.filter((nm) => lettre(nm) === "B").length > 1;
    const F = deux_fonds && v.noms_cotes[i] === "fond en biais" ? "C" : lettre(v.noms_cotes[i]);
    const panneaux = [];
    const reste = L - Math.floor((L + 0.05) / mod) * mod;
    const tete = (d.panneaux_depuis_la_fin || []).includes(v.noms_cotes[i]) && reste > 0.05 ? reste : 0;
    if (tete) panneaux.push({ id: `${F}1`, debut_cm: 0, largeur_cm: rnd2(tete, 1) });
    for (let s = tete, k = tete ? 2 : 1; s < L - 0.05; s += mod, k++) panneaux.push({ id: `${F}${k}`, debut_cm: rnd2(s, 1), largeur_cm: rnd2(Math.min(mod, L - s), 1) });
    const ouvertures = [];
    if (v.porte && v.porte.cote === i) ouvertures.push({ type: "porte", vitree: v.porte.vitree !== false, debut_cm: v.porte.debut_cm, largeur_cm: v.porte.largeur_cm, allege_cm: 0, hauteur_cm: porte_h, chambranle_cm: v.porte.chambranle_cm || 0 });
    for (const f of v.fenetres || []) if (f.cote === i) ouvertures.push({ type: "fenetre", debut_cm: f.debut_cm, largeur_cm: f.largeur_cm, allege_cm: f.allege_cm, hauteur_cm: f.hauteur_cm, ouvrant: f.ouvrant });
    return { cle: F, nom: v.noms_cotes[i], de: a, a: b, longueur_cm: rnd2(L, 1), hauteur_debut_cm: rnd2(h2(a), 1), hauteur_fin_cm: rnd2(h2(b), 1), hauteur_mur_cm: H, panneaux, ouvertures };
  });
  const sec = d.rehausse_section_mm || p.rehausse.section_mm, section = +sec[1] / 10, stock = +p.rehausse.longueur_stock_cm;
  const pieces = faces.filter((f) => Math.max(f.hauteur_debut_cm, f.hauteur_fin_cm) > H + 0.05).map((f, k) => ({ id: `R${k + 1}`, face: f.cle, L: f.longueur_cm, h0: rnd2(f.hauteur_debut_cm - H, 1), h1: rnd2(f.hauteur_fin_cm - H, 1) }));
  const barres = ranger_rehausse(pieces, section, stock);
  const deb = t.debord_cm || { avant: 10, arriere: 10, cotes: 0 };
  const cotes = +deb.cotes || 0;
  const decal = faces.map((f) => -(f.cle === "A" ? +deb.avant : f.cle === "B" || f.cle === "C" ? +deb.arriere : f.cle === "D" ? +(deb.droite ?? cotes) : +(deb.gauche ?? cotes)));
  const contour = inset_ordre(q, decal);
  const rampant = Math.sqrt(1 + (c / course) ** 2);
  const xmin = Math.min(...contour.map((z) => z[0])), xmax = Math.max(...contour.map((z) => z[0]));
  const ymin = Math.min(...contour.map((z) => z[1])), ymax = Math.max(...contour.map((z) => z[1]));
  const panneaux_toit = [];
  for (let s = droite ? ymin : xmin, k = 1, fin = droite ? ymax : xmax; s < fin - 0.05; s += mod, k++) {
    const s1 = Math.min(s + mod, fin);
    let pc = droite ? clip_half(contour, [-1e4, s], [1e4, s], true) : clip_half(contour, [s, 1e4], [s, -1e4], true);
    pc = droite ? clip_half(pc, [1e4, s1], [-1e4, s1], true) : clip_half(pc, [s1, -1e4], [s1, 1e4], true);
    const le_long = pc.map((z) => z[droite ? 0 : 1]);
    const biais = pc.some((a, i) => {
      const b = pc[(i + 1) % pc.length];
      return Math.abs(b[0] - a[0]) > 0.5 && Math.abs(b[1] - a[1]) > 0.5;
    });
    panneaux_toit.push({ id: `T${k}`, largeur_cm: rnd2(s1 - s, 1), longueur_cm: rnd2((Math.max(...le_long) - Math.min(...le_long)) * rampant, 1), biais, polygone: pc.map(([a, b]) => [rnd2(a, 1), rnd2(b, 1)]) });
  }
  const bandes = faces.flatMap((f) => f.panneaux.map((pn) => ({ face: f.cle, ...pn }))).sort((x, y) => y.largeur_cm - x.largeur_cm);
  const chutes = [];
  let panneaux_mur = 0;
  for (const b of bandes) {
    const k = b.largeur_cm < mod - 0.05 ? chutes.findIndex((c2) => c2 >= b.largeur_cm - 1e-6) : -1;
    if (k >= 0) {
      b.source = "chute";
      chutes[k] -= b.largeur_cm;
    } else {
      panneaux_mur++;
      b.source = "neuf";
      if (mod - b.largeur_cm > 5) chutes.push(mod - b.largeur_cm);
    }
  }
  for (const f of faces) for (const pn of f.panneaux) {
    const b = bandes.find((x) => x.id === pn.id);
    pn.source = b ? b.source : "neuf";
    pn.decoupes = f.ouvertures.filter((o) => o.debut_cm - (o.chambranle_cm || 0) < pn.debut_cm + pn.largeur_cm && o.debut_cm + o.largeur_cm + (o.chambranle_cm || 0) > pn.debut_cm).map((o) => `${o.type === "porte" ? "porte" : "fen\xEAtre"} ${fz2(o.largeur_cm + 2 * (o.chambranle_cm || 0))} \xD7 ${fz2(o.hauteur_cm + (o.chambranle_cm || 0))}`);
  }
  const fB = faces.findIndex((f) => f.cle === (droite ? "D" : "B"));
  const g0 = contour[fB], g1 = contour[(fB + 1) % n];
  const bas = droite ? g0[1] < g1[1] ? g0 : g1 : g0[1] > g1[1] ? g0 : g1;
  const egouts = contour.map((a, i) => ({ a, b: contour[(i + 1) % n], cle: faces[i].cle })).filter(({ a, b }) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l;
    return (droite ? nx : ny) > 0.2;
  });
  return {
    hauteur_mur_cm: H,
    chute_cm: c,
    profondeur_cm: rnd2(D, 1),
    sens: droite ? "droite" : "arriere",
    // portee = plus longue bande de toit entre deux murs porteurs
    portee_cm: rnd2(droite ? Wd : D, 1),
    pente: { pourcent: rnd2(100 * c / course, 1), degres: rnd2(Math.atan2(c, course) * 180 / Math.PI, 2) },
    hauteurs_coins_cm: q.map((z) => rnd2(h2(z), 1)),
    faces,
    rehausse: { section_mm: sec, longueur_stock_cm: stock, pieces, barres, nb_madriers: barres.length },
    toit: {
      contour: contour.map(([a, b]) => [rnd2(a, 1), rnd2(b, 1)]),
      aire_m2: rnd2(poly_area(contour) / 1e4, 2),
      // plan du toit : hauteur du dessous du toit = haut_cm au depart de la pente, bas_cm au bout de la course
      plan: { sens: droite ? "droite" : "arriere", origine_cm: rnd2(droite ? x0 : y0, 1), course_cm: rnd2(course, 1), haut_cm: H + c, bas_cm: H },
      panneaux: panneaux_toit,
      debord_cm: { avant: +deb.avant, arriere: +deb.arriere, droite: +(deb.droite ?? cotes), gauche: +(deb.gauche ?? cotes) },
      gouttiere: {
        face: droite ? "D" : "B",
        de: g0.map((z) => rnd2(z, 1)),
        a: g1.map((z) => rnd2(z, 1)),
        troncons: egouts.map(({ a, b, cle }) => ({ face: cle, de: a.map((z) => rnd2(z, 1)), a: b.map((z) => rnd2(z, 1)), longueur_cm: rnd2(Math.hypot(b[0] - a[0], b[1] - a[1]), 1) })),
        longueur_cm: rnd2(egouts.reduce((s, { a, b }) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0), 1),
        descente: (() => {
          if (t.descente !== "droite" && t.descente !== "gauche") return bas;
          const bouts = egouts.flatMap(({ a, b }) => [a, b]);
          return bouts.reduce((m, z) => (t.descente === "droite" ? z[0] > m[0] + 1e-6 : z[0] < m[0] - 1e-6) ? z : m, bouts[0] || bas);
        })().map((z) => rnd2(z, 1))
      }
    },
    interieur: inset_ordre(q, +p.panneau.epaisseur_mm / 10).map(([a, b]) => [rnd2(a, 1), rnd2(b, 1)]),
    panneaux_mur_a_commander: panneaux_mur,
    formalites: formalites(p, v.aire_m2, rnd2(poly_area(contour) / 1e4, 2), v.aire_interieure_m2),
    angles_deg: v.angles_deg
  };
}
function modele3d_abri(p, g, v, m) {
  const d = g.dalle, [ox, oy] = d.decalage_cm, abs = (z) => [z[0] + ox, z[1] + oy];
  const pl = p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? +p.amenagement.plancher.epaisseur_cm : 0;
  const sec = m.rehausse.section_mm;
  return {
    dalle: d.polygone.map(abs),
    murs_propriete: d.mur_hauteur_cm > 0 ? d.murs.map((w) => ({ cote: w.cote, type: w.type, de: abs(w.de), a: abs(w.a), hauteur_cm: w.type === "grillage" ? d.grillage_hauteur_cm : d.mur_hauteur_cm, epaisseur_cm: w.type === "grillage" ? 1 : w.type === "palissade" ? d.palissade_epaisseur_cm : d.mur_epaisseur_cm, travee_cm: d.palissade_travee_cm })) : [],
    epaisseur_cm: +p.panneau.epaisseur_mm / 10,
    sol: { polygone: m.interieur, epaisseur_cm: pl },
    murs: m.faces.map((f, i) => ({
      cle: f.cle,
      nom: f.nom,
      de: f.de,
      a: f.a,
      longueur_cm: f.longueur_cm,
      hauteur_mur_cm: f.hauteur_mur_cm,
      angle_debut_deg: m.angles_deg[i],
      angle_fin_deg: m.angles_deg[(i + 1) % m.faces.length],
      hauteur_debut_cm: f.hauteur_debut_cm,
      hauteur_fin_cm: f.hauteur_fin_cm,
      panneaux: f.panneaux.map((pn) => ({ id: pn.id, debut_cm: pn.debut_cm, largeur_cm: pn.largeur_cm })),
      ouvertures: f.ouvertures
    })),
    rehausse_epaisseur_cm: +sec[0] / 10,
    rehausse_pieces: m.rehausse.pieces.map((r) => ({ id: r.id, face: r.face })),
    toit: { contour: m.toit.contour, plan: m.toit.plan, epaisseur_cm: +p.panneau.epaisseur_mm / 10, panneaux: m.toit.panneaux.map((t) => ({ id: t.id, polygone: t.polygone })) },
    gouttiere: { troncons: m.toit.gouttiere.troncons, descente: m.toit.gouttiere.descente },
    mobilier: {
      bureaux: (v.bureaux || []).map((b) => ({ cote: b.cote, polygone: b.polygone })),
      sieges: (v.sieges || []).filter((st) => st.tient !== false).map((st) => ({ type: st.type, contre: st.contre, polygone: st.polygone })),
      lit: v.lit_pliant && v.lit_pliant.tient ? { polygone: v.lit_pliant.polygone, replie: v.lit_pliant.replie || null } : null
    }
  };
}
function budget_modele(p, v, m) {
  return nomenclature_abri(p, v, m);
}
function cote_svg(pa, pb, label, off, col = "#2b5d8a", size = 12, recul = 8) {
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1, ux = (pb[0] - pa[0]) / L, uy = (pb[1] - pa[1]) / L, nx = -uy, ny = ux;
  const a2 = [pa[0] + nx * off, pa[1] + ny * off], b2 = [pb[0] + nx * off, pb[1] + ny * off];
  let s = line(pa[0] + nx * 4, pa[1] + ny * 4, a2[0] + nx * 4, a2[1] + ny * 4, "#aaa", 0.7) + line(pb[0] + nx * 4, pb[1] + ny * 4, b2[0] + nx * 4, b2[1] + ny * 4, "#aaa", 0.7);
  s += line(a2[0], a2[1], b2[0], b2[1], col, 1);
  for (const e of [a2, b2]) s += line(e[0] - (ux - nx) * 3, e[1] - (uy - ny) * 3, e[0] + (ux - nx) * 3, e[1] + (uy - ny) * 3, col, 1);
  let rot = Math.atan2(uy, ux) * 180 / Math.PI;
  if (rot > 90) rot -= 180;
  else if (rot < -90) rot += 180;
  const m = [(a2[0] + b2[0]) / 2 + nx * recul, (a2[1] + b2[1]) / 2 + ny * recul];
  return s + `<text x="${f1(m[0])}" y="${f1(m[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="${size}" font-weight="bold" transform="rotate(${f1(rot)} ${f1(m[0])} ${f1(m[1])})">${label}</text>
`;
}
function resume_svg(g, v, m) {
  const d = g.dalle, [ox, oy] = d.decalage_cm, dalle = d.polygone.map(([x, y]) => [x + ox, y + oy]), q = v.polygone;
  const xs = dalle.map((z) => z[0]), ys = dalle.map((z) => z[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const scale = 0.5, padx = 24, pady = 14, W = (maxx - minx) * scale + 2 * padx, H = (maxy - miny) * scale + 2 * pady;
  const P = (z) => [padx + (z[0] - minx) * scale, pady + (maxy - z[1]) * scale];
  const qx = q.map((z) => z[0]), qy = q.map((z) => z[1]), gx = Math.min(...qx), dx = Math.max(...qx), av = Math.min(...qy), ymid = (av + Math.max(...qy)) / 2;
  const mur = new Set(d.murs.map((w) => w.cote)), grillage = new Set(d.murs.filter((w) => w.type === "grillage").map((w) => w.cote));
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rnd2(W)} ${rnd2(H)}" width="${rnd2(W)}" height="${rnd2(H)}" font-family="system-ui,sans-serif" font-size="11">
`;
  svg += poly(dalle.map(P), "#f3f1ec", "#b5b0a5", 1.2);
  dalle.forEach((a, i) => {
    const nom = d.cotes_noms[i];
    if (!mur.has(nom)) return;
    const b = dalle[(i + 1) % dalle.length], pa = P(a), pb = P(b);
    svg += grillage.has(nom) ? line(pa[0], pa[1], pb[0], pb[1], "#5f8a4a", 2.5, "5 3") : line(pa[0], pa[1], pb[0], pb[1], "#5b4a3a", 4);
  });
  svg += poly(q.map(P), "#dbe6f0", "#2b5d8a", 2);
  m.faces.forEach((f, i) => {
    const a = P(f.de), b = P(f.a), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = uy, ny = -ux;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let deg = Math.atan2(uy, ux) * 180 / Math.PI;
    if (deg > 90 || deg < -90) deg += 180;
    const tx = mx + nx * 11, ty = my + ny * 11;
    svg += `<text x="${f1(tx)}" y="${f1(ty)}" transform="rotate(${f1(deg)} ${f1(tx)} ${f1(ty)})" text-anchor="middle" dominant-baseline="middle" fill="#1f5a8c" font-size="10.5" font-weight="bold">${fr1(f.longueur_cm)}</text>
`;
    svg += `<rect x="${f1(mx - 7)}" y="${f1(my - 7)}" width="14" height="14" rx="3" fill="#1c2530" stroke="#fff" stroke-width="1.2"/>
`;
    svg += `<text x="${f1(mx)}" y="${f1(my + 0.5)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="9" font-weight="bold" font-family="ui-monospace,Menlo,monospace">${f.cle}</text>
`;
    const p0 = P(q[i]), prev = P(q[(i - 1 + q.length) % q.length]), next = P(q[(i + 1) % q.length]);
    const v1 = [prev[0] - p0[0], prev[1] - p0[1]], v2 = [next[0] - p0[0], next[1] - p0[1]], l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const r = 13, e1 = [p0[0] + v1[0] / l1 * r, p0[1] + v1[1] / l1 * r], e2 = [p0[0] + v2[0] / l2 * r, p0[1] + v2[1] / l2 * r];
    const sweep = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 1 : 0;
    svg += `<path d="M ${f1(e1[0])} ${f1(e1[1])} A ${r} ${r} 0 0 ${sweep} ${f1(e2[0])} ${f1(e2[1])}" fill="none" stroke="#b0452a" stroke-width="1.2"/>
`;
    const bx = v1[0] / l1 + v2[0] / l2, by = v1[1] / l1 + v2[1] / l2, bl = Math.hypot(bx, by) || 1;
    svg += text(p0[0] + bx / bl * 27, p0[1] + by / bl * 27 + 3, `${fr1(m.angles_deg[i])}\xB0`, "middle", "#b0452a", 8.5);
  });
  const marge = (a, b, label, ou, col = "#b86e1f") => {
    const pa = P(a), pb = P(b);
    svg += line(pa[0], pa[1], pb[0], pb[1], col, 1.4);
    if (ou === "gauche") svg += text(pa[0] - 4, pa[1] + 4, label, "end", col, 10.5, "bold");
    else if (ou === "bas") svg += text(pa[0], pa[1] + 12, label, "middle", col, 10.5, "bold");
    else svg += text(pb[0] + 4, pb[1] + 4, label, "start", col, 10.5, "bold");
  };
  const yb = av + 40;
  marge([0, yb], [gx, yb], `${fr1(gx)}`, "gauche");
  marge([(gx + dx) / 2, 0], [(gx + dx) / 2, av], `${fr1(av)}`, "bas");
  marge([dx, yb], [d.avant, yb], `${fr1(rnd2(d.avant - dx, 1))}`, "droite");
  const pas = v.passages.find((x) => x.cote === "arriere_droite");
  if (pas && pas.segment) {
    const [s0, s1] = pas.segment, pa = P(s0), pb = P(s1), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    svg += line(pa[0], pa[1], pb[0], pb[1], "#b86e1f", 1.4);
    svg += text(pb[0] + (pb[0] - pa[0]) / L * 18 + 3, pb[1] + (pb[1] - pa[1]) / L * 18 + 2, `${fr1(pas.cm)}`, "middle", "#b86e1f", 10.5, "bold");
  }
  return svg + "</svg>\n";
}
var titre_plan = (e) => `${e.lettre ? `Face ${e.lettre} \xB7 ` : ""}${e.nom}${e.detail ? ` \xB7 ${e.detail}` : ""}`;
function dessine_entete(W, e) {
  let svg = text(W / 2, 26, titre_plan(e), "middle", "#222", 15, "bold");
  e.lignes.forEach((l, i) => {
    svg += text(W / 2, 46 + 18 * i, l, "middle", i === 0 ? "#888" : "#666", 11);
  });
  return svg;
}
function cadre_plan(pts, scale, pad, top) {
  const xs = pts.map((z) => z[0]), ys = pts.map((z) => z[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const W = (maxx - minx) * scale + 2 * pad, H = (maxy - miny) * scale + 2 * pad + top;
  return { W, H, P: (z) => [pad + (z[0] - minx) * scale, top + pad + (maxy - z[1]) * scale] };
}
function entete_sol(p, v) {
  const lignes = [`murs ${fz2(+p.panneau.epaisseur_mm / 10)} cm \xB7 porte ${fz2(v.porte.largeur_cm)} ouvrant dehors \xB7 fen\xEAtres en bleu${v.sol_libre_m2 != null ? ` \xB7 sol libre ${v.sol_libre_m2} m\xB2` : ""}${v.lit_pliant && v.lit_pliant.tient ? " \xB7 violet pointill\xE9 = lit d\xE9pli\xE9" : ""}`];
  return { nom: "Plan de sol", detail: `murs ${v.aire_m2} m\xB2 \xB7 int\xE9rieur ${v.aire_interieure_m2} m\xB2`, lignes };
}
function modele_sol_svg(p, v, m, sans_entete = false) {
  const q = v.polygone, n = q.length, scale = 1.6;
  const { W, H, P } = cadre_plan(q, scale, sans_entete ? 108 : 120, sans_entete ? 0 : 50);
  let svg = svgHeader(rnd2(W), rnd2(H), sans_entete);
  svg += poly(q.map(P), "#8fa3b8", "#2b5d8a", 1.5);
  svg += poly(m.interieur.map(P), "#fbfbf8", "#2b5d8a", 1.2);
  for (const b of v.bureaux || []) {
    svg += poly(b.polygone.map(P), "#e6c79c", "#9a7040", 1);
    const c = b.polygone.reduce((s, z) => [s[0] + z[0] / b.polygone.length, s[1] + z[1] / b.polygone.length], [0, 0]), pc = P(c);
    const vert = b.cote.startsWith("gauche");
    svg += `<text x="${f1(pc[0])}" y="${f1(pc[1])}" text-anchor="middle" dominant-baseline="middle" fill="#7a5530" font-size="12" font-weight="bold"${vert ? ` transform="rotate(-90 ${f1(pc[0])} ${f1(pc[1])})"` : ""}>bureau ${fz2(b.profondeur_cm)} \xD7 ${fz2(b.longueur_cm)}</text>
`;
  }
  for (const st of v.sieges || []) {
    if (!st.tient) continue;
    svg += poly(st.polygone.map(P), "#dcdce6", "#55556a", 1.2);
    const c = P([st.polygone.reduce((s, z) => s + z[0], 0) / 4, st.polygone.reduce((s, z) => s + z[1], 0) / 4]);
    svg += text(c[0], c[1] - (st.largeur_cm >= 50 ? 4 : -3), st.largeur_cm >= 50 ? st.type : "tab.", "middle", "#44445a", st.largeur_cm >= 50 ? 10 : 8, "bold");
    if (st.largeur_cm >= 50) svg += text(c[0], c[1] + 10, `${fz2(st.largeur_cm)} \xD7 ${fz2(st.profondeur_cm)}`, "middle", "#44445a", 9);
  }
  if (v.lit_pliant && v.lit_pliant.tient) {
    const lp = v.lit_pliant;
    if (lp.replie) {
      svg += poly(lp.replie.map(P), "#d9c8ec", "#6a3d9a", 1.5);
      for (const z of lp.fixations) {
        const c = P(z);
        svg += `<rect x="${f1(c[0] - 3)}" y="${f1(c[1] - 3)}" width="6" height="6" fill="#6a3d9a"/>
`;
      }
    }
    svg += poly(lp.polygone.map(P), "none", "#6a3d9a", 1.8, "7 4");
    const [q0, q1, q2, q3] = lp.polygone;
    const tete = P([q0[0] + (q3[0] - q0[0]) / 2 + (q1[0] - q0[0]) * 0.12, q0[1] + (q3[1] - q0[1]) / 2 + (q1[1] - q0[1]) * 0.12]);
    svg += text(tete[0], tete[1] - 2, `lit ${lp.replie ? "rabattable" : "pliant"} ${fz2(lp.largeur_cm)} \xD7 ${fz2(lp.longueur_cm)}`, "middle", "#6a3d9a", 10, "bold");
    if (lp.sous_bureau_cm2 > 0) svg += text(tete[0], tete[1] + 11, "pied sous le bureau", "middle", "#6a3d9a", 9);
  }
  m.faces.forEach((f, i) => {
    const a = q[i], b = q[(i + 1) % n], L = f.longueur_cm, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const at = (s) => P([a[0] + ux * s, a[1] + uy * s]);
    for (const o of f.ouvertures) {
      const e = +p.panneau.epaisseur_mm / 10, nx = -uy * e, ny = ux * e;
      const c0 = [a[0] + ux * o.debut_cm, a[1] + uy * o.debut_cm], c1 = [a[0] + ux * (o.debut_cm + o.largeur_cm), a[1] + uy * (o.debut_cm + o.largeur_cm)];
      const col = o.type === "porte" ? "#c0392b" : "#1b9aa8";
      if (o.chambranle_cm) {
        const e2 = o.chambranle_cm, f02 = [c0[0] - ux * e2, c0[1] - uy * e2], f1p = [c1[0] + ux * e2, c1[1] + uy * e2];
        for (const [s, t] of [[f02, c0], [c1, f1p]]) svg += poly([s, t, [t[0] + nx, t[1] + ny], [s[0] + nx, s[1] + ny]].map(P), "#b98a55", "#7a5530", 1);
      }
      svg += poly([c0, c1, [c1[0] + nx, c1[1] + ny], [c0[0] + nx, c0[1] + ny]].map(P), o.type === "porte" ? "#fbfbf8" : "#bfe3ef", col, 1.5);
      if (o.type === "porte") {
        const ox = uy, oy = -ux, w = o.largeur_cm, arc = [];
        for (let k = 0; k <= 16; k++) {
          const tt = Math.PI / 2 * k / 16;
          arc.push(P([c1[0] + w * (-ux * Math.cos(tt) + ox * Math.sin(tt)), c1[1] + w * (-uy * Math.cos(tt) + oy * Math.sin(tt))]));
        }
        const ex = P([c1[0] + ox * w, c1[1] + oy * w]), h1 = P(c1);
        svg += line(h1[0], h1[1], ex[0], ex[1], col, 2);
        svg += `<polyline points="${arc.map((z) => `${f1(z[0])},${f1(z[1])}`).join(" ")}" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="4 3"/>
`;
      }
    }
    const pts = [0, ...f.ouvertures.flatMap((o) => [o.debut_cm - (o.chambranle_cm || 0), o.debut_cm, o.debut_cm + o.largeur_cm, o.debut_cm + o.largeur_cm + (o.chambranle_cm || 0)]), L].sort((x, y) => x - y);
    const uniq = pts.filter((s, k) => k === 0 || s - pts[k - 1] > 0.5);
    let court = 0;
    if (uniq.length > 2) for (let k = 0; k + 1 < uniq.length; k++) {
      const dl = uniq[k + 1] - uniq[k], petit = dl * scale < 26;
      svg += cote_svg(at(uniq[k]), at(uniq[k + 1]), fz2(rnd2(dl, 1)), 28, "#666", 10, petit ? court++ % 2 ? 8 : 20 : 8);
    }
    svg += cote_svg(at(0), at(L), `${f.cle} \xB7 ${fz2(L)}`, uniq.length > 2 ? 58 : 30);
  });
  const I = m.interieur;
  I.forEach((a, i) => {
    const b = I[(i + 1) % n], pa = P(a), pb = P(b);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const nx = (pb[1] - pa[1]) / l, ny = -(pb[0] - pa[0]) / l, t = i === 3 ? 0.85 : 0.3;
    const mpt = [pa[0] + (pb[0] - pa[0]) * t + nx * 12, pa[1] + (pb[1] - pa[1]) * t + ny * 12];
    let rot = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180 / Math.PI;
    if (rot > 90) rot -= 180;
    else if (rot < -90) rot += 180;
    svg += `<text x="${f1(mpt[0])}" y="${f1(mpt[1])}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="10" transform="rotate(${f1(rot)} ${f1(mpt[0])} ${f1(mpt[1])})">int. ${fz2(rnd2(L, 1))}</text>
`;
  });
  if (!sans_entete) svg += dessine_entete(W, entete_sol(p, v));
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}
function entete_toit(m) {
  const T = m.toit;
  return { lettre: "T", nom: "Toiture", detail: `${T.panneaux.length} panneaux \xB7 ${T.aire_m2} m\xB2 couverts`, lignes: [`panneaux dans le sens de la pente (longueur = rampant) \xB7 murs en pointill\xE9 \xB7 ${m.sens === "droite" ? "\xE9gout c\xF4t\xE9 jardin (droite), haut contre le mur gauche" : "d\xE9bords avant et fond"}`] };
}
function modele_toit_svg(v, m, sans_entete = false) {
  const T = m.toit, scale = 1.6;
  const { W, H, P } = cadre_plan(T.contour, scale, sans_entete ? 85 : 110, sans_entete ? 0 : 50);
  let svg = svgHeader(rnd2(W), rnd2(H), sans_entete);
  for (const pn of T.panneaux) {
    svg += poly(pn.polygone.map(P), "#f3f0e8", "#7a6f5a", 1.5);
    const ys2 = pn.polygone.map((z) => z[1]), xs2 = pn.polygone.map((z) => z[0]);
    const c = P([(Math.min(...xs2) + Math.max(...xs2)) / 2, (Math.min(...ys2) + Math.max(...ys2)) / 2]);
    svg += text(c[0], c[1] - 6, pn.id, "middle", "#5a4f3a", 16, "bold");
    svg += text(c[0], c[1] + 12, `${fz2(pn.largeur_cm)} \xD7 ${fz2(pn.longueur_cm)}`, "middle", "#5a4f3a", 11);
    if (m.sens === "droite") for (let y = Math.min(...ys2) + 25; y < Math.max(...ys2) - 5; y += 25) {
      const row = clip_half(clip_half(pn.polygone, [-1e4, y - 0.5], [1e4, y - 0.5], true), [1e4, y + 0.5], [-1e4, y + 0.5], true);
      if (row.length < 3) continue;
      const cx = row.map((z) => z[0]), a = P([Math.min(...cx), y]), b = P([Math.max(...cx), y]);
      svg += line(a[0], a[1], b[0], b[1], "#cfc6b3", 1);
    }
    else for (let x = Math.min(...xs2) + 25; x < Math.max(...xs2) - 5; x += 25) {
      const col = clip_half(clip_half(pn.polygone, [x - 0.5, 1e4], [x - 0.5, -1e4], true), [x + 0.5, -1e4], [x + 0.5, 1e4], true);
      if (col.length < 3) continue;
      const cy = col.map((z) => z[1]), a = P([x, Math.min(...cy)]), b = P([x, Math.max(...cy)]);
      svg += line(a[0], a[1], b[0], b[1], "#cfc6b3", 1);
    }
  }
  svg += poly(v.polygone.map(P), "none", "#2b5d8a", 1.2, "5 4");
  const dsc = P(T.gouttiere.descente);
  for (const tr of T.gouttiere.troncons) {
    const g0 = P(tr.de), g1 = P(tr.a);
    svg += line(g0[0], g0[1], g1[0], g1[1], "#1b6fa8", 6);
  }
  svg += `<circle cx="${f1(dsc[0])}" cy="${f1(dsc[1])}" r="7" fill="#1b6fa8"/>
`;
  svg += text(dsc[0] + 12, dsc[1] - 10, "descente", "start", "#1b6fa8", 11, "bold");
  const mid = P([(T.gouttiere.de[0] + T.gouttiere.a[0]) / 2, (T.gouttiere.de[1] + T.gouttiere.a[1]) / 2]);
  svg += text(mid[0] + 10, mid[1] - 12, `goutti\xE8re ${fz2(T.gouttiere.longueur_cm)}`, "start", "#1b6fa8", 11, "bold");
  const xs = T.contour.map((z) => z[0]), ys = T.contour.map((z) => z[1]);
  if (m.sens === "droite") {
    const ay = Math.min(...ys) + 80, a = P([Math.min(...xs) + 40, ay]), b = P([Math.min(...xs) + 130, ay]);
    svg += line(a[0], a[1], b[0], b[1], "#c0392b", 2.5);
    svg += `<polygon points="${f1(b[0] + 2)},${f1(b[1])} ${f1(b[0] - 12)},${f1(b[1] - 7)} ${f1(b[0] - 12)},${f1(b[1] + 7)}" fill="#c0392b"/>
`;
    svg += text((a[0] + b[0]) / 2, a[1] - 9, `pente ${fr1(m.pente.pourcent)} % (${fr1(m.pente.degres)}\xB0)`, "middle", "#c0392b", 12, "bold");
  } else {
    const ax = Math.min(...xs) + 100, a = P([ax, Math.min(...ys) + 40]), b = P([ax, Math.min(...ys) + 130]);
    svg += line(a[0], a[1], b[0], b[1], "#c0392b", 2.5);
    svg += `<polygon points="${f1(b[0])},${f1(b[1] - 2)} ${f1(b[0] - 7)},${f1(b[1] + 12)} ${f1(b[0] + 7)},${f1(b[1] + 12)}" fill="#c0392b"/>
`;
    svg += text(a[0] - 10, (a[1] + b[1]) / 2, `pente ${fr1(m.pente.pourcent)} % (${fr1(m.pente.degres)}\xB0)`, "end", "#c0392b", 12, "bold");
  }
  const q = T.contour, n = q.length;
  q.forEach((z, i) => {
    svg += cote_svg(P(z), P(q[(i + 1) % n]), fz2(rnd2(Math.hypot(q[(i + 1) % n][0] - z[0], q[(i + 1) % n][1] - z[1]), 1)), 26, "#7a6f5a", 11);
  });
  if (!sans_entete) svg += dessine_entete(W, entete_toit(m));
  svg += text(W / 2, H - 12, "AVANT (jardin)", "middle", "#666", 12);
  return svg + "</svg>\n";
}
var fr1 = (x) => String(x).replace(".", ",");
function entete_rehausse(m) {
  const R = m.rehausse;
  return { lettre: "R", nom: "Rehausse bois", detail: `${R.pieces.length} pi\xE8ces dans ${R.nb_madriers} madrier${R.nb_madriers > 1 ? "s" : ""}`, lignes: ["hauteur de chaque pi\xE8ce : de son d\xE9but \xE0 sa fin, dans le sens de la face (vue de l'ext\xE9rieur, de gauche \xE0 droite)"] };
}
function modele_rehausse_svg(m, sans_entete = false) {
  const R = m.rehausse, section = +R.section_mm[1] / 10, stock = R.longueur_stock_cm, sx = 1.9, sy = 3.2, pad = sans_entete ? 20 : 50, gap = 60, ent = sans_entete ? 20 : 70;
  const W = stock * sx + 2 * pad, H = ent + R.barres.length * (section * sy + gap) + (sans_entete ? 10 : 30);
  let svg = svgHeader(rnd2(W), rnd2(H), sans_entete);
  R.barres.forEach((b, k) => {
    const top = ent + k * (section * sy + gap), X = (x) => pad + x * sx, Y = (h2) => top + (section - h2) * sy;
    svg += text(pad, top - 10, `madrier ${k + 1} \xB7 ${R.section_mm[0]} \xD7 ${R.section_mm[1]} \xB7 ${fz2(stock)} cm \xB7 chute ${fz2(b.chute_cm)} cm`, "start", "#5a4f3a", 12, "bold");
    svg += poly([[X(0), Y(0)], [X(stock), Y(0)], [X(stock), Y(section)], [X(0), Y(section)]], "#f3ece0", "#b8a888", 1, "4 3");
    for (const t of b.troncons) t.pieces.forEach((pc, j) => {
      const x0 = t.x, pts = j === 0 ? [[x0, 0], [x0 + pc.L, 0], [x0 + pc.L, pc.h1], [x0, pc.h0]] : t.inverse ? [[x0, section], [x0 + pc.L, section], [x0 + pc.L, section - pc.h0], [x0, section - pc.h1]] : [[x0, section], [x0 + pc.L, section], [x0 + pc.L, section - pc.h1], [x0, section - pc.h0]];
      svg += poly(pts.map(([x, h2]) => [X(x), Y(h2)]), "#d9b98a", "#8a5a2b", 1.5);
      const cx = X(x0 + pc.L * 0.5), cy = Y(j === 0 ? Math.max(pc.h0, pc.h1) / 3 : section - Math.max(pc.h0, pc.h1) / 3);
      svg += text(cx, cy + 4, `${pc.id} \xB7 face ${pc.face} \xB7 ${fz2(pc.L)} \xB7 ${fz2(pc.h0)} \u2192 ${fz2(pc.h1)}`, "middle", "#5a3a1a", 11, "bold");
    });
  });
  if (!sans_entete) svg += dessine_entete(W, entete_rehausse(m));
  return svg + "</svg>\n";
}
function entete_facade(f) {
  return { lettre: f.cle, nom: f.nom, lignes: [`vue de l'ext\xE9rieur \xB7 ${f.panneaux.length} panneau${f.panneaux.length > 1 ? "x" : ""} de ${fz2(f.hauteur_mur_cm)} \xB7 hauteurs finies aux deux bouts`] };
}
function modele_facade_svg(m, f, sans_entete = false, largeur_commune = 0) {
  const scale = 1.25, pad = sans_entete ? 30 : 60, top = sans_entete ? 0 : 50, L = f.longueur_cm, Hm = f.hauteur_mur_cm, h0 = f.hauteur_debut_cm, h1 = f.hauteur_fin_cm;
  const W = Math.max(L, largeur_commune) * scale + 2 * pad + 60, H = Math.max(...m.hauteurs_coins_cm, h0, h1) * scale + 2 * pad + top + 30;
  const P = (x, h2) => [pad + 30 + x * scale, H - pad - 30 - h2 * scale];
  let svg = svgHeader(rnd2(W), rnd2(H), sans_entete);
  for (const pn of f.panneaux) {
    svg += poly([P(pn.debut_cm, 0), P(pn.debut_cm + pn.largeur_cm, 0), P(pn.debut_cm + pn.largeur_cm, Hm), P(pn.debut_cm, Hm)], "#eef2f6", "#2b5d8a", 1.5);
    const c = P(pn.debut_cm + pn.largeur_cm / 2, Hm - 18);
    svg += text(c[0], c[1], pn.id, "middle", "#2b5d8a", 12, "bold");
    if (pn.largeur_cm < +m.faces[0].panneaux[0].largeur_cm - 0.05 || pn.largeur_cm < 99.95) svg += text(c[0], c[1] + 14, `${fz2(pn.largeur_cm)}`, "middle", "#2b5d8a", 10);
  }
  if (Math.max(h0, h1) > Hm + 0.05) {
    const pc = m.rehausse.pieces.find((x) => x.face === f.cle);
    svg += poly([P(0, Hm), P(L, Hm), P(L, h1), P(0, h0)], "#d9b98a", "#8a5a2b", 1.5);
    const c = P(L / 2, Hm + Math.max(h0, h1) - Hm > 16 ? Hm + 6 : Hm + 2);
    svg += text(c[0], c[1] - 2, `${pc ? pc.id + " \xB7 " : ""}rehausse ${fz2(rnd2(h0 - Hm, 1))} \u2192 ${fz2(rnd2(h1 - Hm, 1))}`, "middle", "#5a3a1a", 10, "bold");
  }
  for (const o of f.ouvertures) {
    if (o.chambranle_cm) {
      const e = o.chambranle_cm, fa = P(o.debut_cm - e, 0), fb = P(o.debut_cm + o.largeur_cm + e, o.hauteur_cm + e);
      svg += `<rect x="${f1(fa[0])}" y="${f1(fb[1])}" width="${f1(fb[0] - fa[0])}" height="${f1(fa[1] - fb[1])}" fill="#b98a55" stroke="#7a5530" stroke-width="1.2"/>
`;
      svg += cote_svg(P(o.debut_cm + o.largeur_cm + e, o.hauteur_cm + e), P(o.debut_cm + o.largeur_cm + e, f.hauteur_mur_cm), fz2(rnd2(f.hauteur_mur_cm - o.hauteur_cm - e, 1)), -14, "#7a5530", 9);
    }
    const a = P(o.debut_cm, o.allege_cm), b = P(o.debut_cm + o.largeur_cm, o.allege_cm + o.hauteur_cm);
    const col = o.type === "porte" ? "#c0392b" : "#1b9aa8";
    svg += `<rect x="${f1(a[0])}" y="${f1(b[1])}" width="${f1(b[0] - a[0])}" height="${f1(a[1] - b[1])}" fill="${o.type === "porte" && o.vitree === false ? "#c9cfd4" : "#bfe3ef"}" stroke="${col}" stroke-width="2"/>
`;
    const c = P(o.debut_cm + o.largeur_cm / 2, o.allege_cm + o.hauteur_cm / 2);
    svg += text(c[0], c[1] - 4, o.type === "porte" ? o.vitree === false ? "porte pleine" : "porte" : o.ouvrant ? "fen\xEAtre ouvrante" : "fen\xEAtre fixe", "middle", col, 11, "bold");
    svg += text(c[0], c[1] + 12, `${fz2(o.largeur_cm)} \xD7 ${fz2(o.hauteur_cm)}${o.allege_cm ? ` \xB7 all\xE8ge ${fz2(o.allege_cm)}` : ""}`, "middle", col, 10);
    svg += cote_svg(P(o.debut_cm, 0), P(o.debut_cm + o.largeur_cm, 0), fz2(o.largeur_cm), 20, col, 10);
    if (o.chambranle_cm) {
      const t = P(o.debut_cm + o.largeur_cm / 2, o.hauteur_cm - 14);
      svg += text(t[0], t[1], `cadre ${fz2(o.largeur_cm + 2 * o.chambranle_cm)} \xD7 ${fz2(o.hauteur_cm + o.chambranle_cm)}`, "middle", "#7a5530", 10, "bold");
    }
  }
  svg += cote_svg(P(0, 0), P(L, 0), `${fz2(L)} cm`, f.ouvertures.length ? 44 : 20);
  svg += text(P(0, h0)[0] - 8, P(0, h0)[1] + 4, `${fz2(h0)}`, "end", "#2b5d8a", 12, "bold");
  svg += text(P(L, h1)[0] + 8, P(L, h1)[1] + 4, `${fz2(h1)}`, "start", "#2b5d8a", 12, "bold");
  svg += text(P(0, Hm)[0] - 8, P(0, Hm)[1] + 16, `${fz2(Hm)}`, "end", "#888", 10);
  if (!sans_entete) svg += dessine_entete(W, entete_facade(f));
  return svg + "</svg>\n";
}

// site/src/viewer.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#5b9bd9");
  g.addColorStop(0.5, "#9cc4ec");
  g.addColorStop(1, "#e6eef5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function prismGeo(V, outline, zTop, zBot) {
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], zTop));
  const bot = outline.map((p) => V(p[0], p[1], zBot));
  const pts = [];
  for (let i = 1; i < n - 1; i++) pts.push(top[0], top[i], top[i + 1]);
  for (let i = 1; i < n - 1; i++) pts.push(bot[0], bot[i + 1], bot[i]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pts.push(top[i], bot[i], bot[j], top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  return g;
}
function offsetRect(r, d) {
  const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
  const x0 = Math.min(...xs) - d, x1 = Math.max(...xs) + d, y0 = Math.min(...ys) - d, y1 = Math.max(...ys) + d;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}
function addRoofSlab(scene, V, outline, roofZ, thk, mat) {
  const n = outline.length;
  const top = outline.map((p) => V(p[0], p[1], roofZ(p[1]) + thk));
  const bot = outline.map((p) => V(p[0], p[1], roofZ(p[1])));
  const pts = [];
  for (let i = 1; i < n - 1; i++) pts.push(top[0], top[i], top[i + 1]);
  for (let i = 1; i < n - 1; i++) pts.push(bot[0], bot[i + 1], bot[i]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pts.push(top[i], bot[i], bot[j], top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  scene.add(mesh);
}
function addRoofRibs(parent, V, outline, roofZ, thk, mat) {
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const step = 0.18, ribW = 0.045, eps = 0.016, inset2 = 0.05;
  const zt = (yy) => roofZ(yy) + thk + eps;
  const y0 = miny + inset2, y1 = maxy - inset2;
  const pts = [];
  for (let x = minx + 0.06; x < maxx - ribW; x += step) {
    pts.push(
      V(x, y0, zt(y0)),
      V(x + ribW, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y0, zt(y0)),
      V(x + ribW, y1, zt(y1)),
      V(x, y1, zt(y1))
    );
  }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  parent.add(new THREE.Mesh(g, mat));
}
function addGutter(scene, V, a, b, roofZ, over, mat) {
  const yb = Math.max(a[1], b[1]) + over * 0.8;
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const zc = roofZ(Math.max(a[1], b[1])) - 0.03;
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.12, 0.06, 0.08), mat);
  gutter.position.copy(V((x0 + x1) / 2, yb, zc));
  gutter.castShadow = true;
  scene.add(gutter);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.max(zc, 0.1), 14), mat);
  pipe.position.copy(V(a[0], yb, zc / 2));
  scene.add(pipe);
}
function addWall(scene, V, a, b, ha, hb, holes, mat) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h2) => V(a[0] + ux * s, a[1] + uy * s, h2);
  const topAt = (s) => ha + (hb - ha) * (s / len);
  const pts = [];
  const quad = (p0, p1, p2, p3) => pts.push(p0, p1, p2, p0, p2, p3);
  const sorted = holes.slice().sort((A, B) => A.s0 - B.s0);
  let cur = 0;
  for (const h2 of sorted) {
    if (h2.s0 > cur + 1e-4) quad(P(cur, 0), P(h2.s0, 0), P(h2.s0, topAt(h2.s0)), P(cur, topAt(cur)));
    if (h2.y0 > 1e-4) quad(P(h2.s0, 0), P(h2.s1, 0), P(h2.s1, h2.y0), P(h2.s0, h2.y0));
    quad(P(h2.s0, h2.y1), P(h2.s1, h2.y1), P(h2.s1, topAt(h2.s1)), P(h2.s0, topAt(h2.s0)));
    cur = h2.s1;
  }
  if (len > cur + 1e-4) quad(P(cur, 0), P(len, 0), P(len, topAt(len)), P(cur, topAt(cur)));
  const g = new THREE.BufferGeometry();
  g.setFromPoints(pts);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
function rectMinus(r, h2) {
  if (h2.s1 <= r.s0 || h2.s0 >= r.s1 || h2.y1 <= r.y0 || h2.y0 >= r.y1) return [r];
  const out = [];
  if (h2.s0 > r.s0) out.push({ s0: r.s0, s1: Math.min(h2.s0, r.s1), y0: r.y0, y1: r.y1 });
  if (h2.s1 < r.s1) out.push({ s0: Math.max(h2.s1, r.s0), s1: r.s1, y0: r.y0, y1: r.y1 });
  const ms0 = Math.max(r.s0, h2.s0), ms1 = Math.min(r.s1, h2.s1);
  if (h2.y0 > r.y0) out.push({ s0: ms0, s1: ms1, y0: r.y0, y1: Math.min(h2.y0, r.y1) });
  if (h2.y1 < r.y1) out.push({ s0: ms0, s1: ms1, y0: Math.max(h2.y1, r.y0), y1: r.y1 });
  return out.filter((q) => q.s1 - q.s0 > 1e-4 && q.y1 - q.y0 > 1e-4);
}
var labelCache = {};
function labelTexture(txt) {
  if (labelCache[txt]) return labelCache[txt];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2933";
  ctx.font = `bold ${txt.length > 2 ? 110 : 140}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(txt, 128, 136);
  const tex = new THREE.CanvasTexture(c);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return labelCache[txt] = tex;
}
function addLabel(scene, pos, size, txt, rotY, rotX = 0) {
  const mat = new THREE.MeshBasicMaterial({ map: labelTexture(txt), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.position.copy(pos);
  mesh.rotation.set(rotX, rotY, 0, "YXZ");
  scene.add(mesh);
}
function addPanels(scene, V, a, b, ha, hb, wallH, panels, pieces, holes, mat, rehMat) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = uy, ny = -ux;
  const off = 4e-3, ins = 9e-3;
  const P = (s, h2) => V(a[0] + ux * s + nx * off, a[1] + uy * s + ny * off, h2);
  const topAt = (s) => ha + (hb - ha) * (s / len);
  const rotY = Math.atan2(nx, -ny);
  const bigHoles = holes.map((h2) => ({ s0: h2.s0 - ins, s1: h2.s1 + ins, y0: h2.y0 - ins, y1: h2.y1 + ins }));
  const quads = (rects, m) => {
    const pts = [];
    for (const r of rects) pts.push(P(r.s0, r.y0), P(r.s1, r.y0), P(r.s1, r.y1), P(r.s0, r.y0), P(r.s1, r.y1), P(r.s0, r.y1));
    if (!pts.length) return;
    const g = new THREE.BufferGeometry();
    g.setFromPoints(pts);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, m));
  };
  for (const pn of panels) {
    let rects = [{ s0: pn.s0_m + ins, s1: pn.s1_m - ins, y0: ins, y1: wallH - ins }];
    for (const h2 of bigHoles) rects = rects.flatMap((r) => rectMinus(r, h2));
    quads(rects, mat);
    const w = pn.s1_m - pn.s0_m, cs = (pn.s0_m + pn.s1_m) / 2;
    const free = holes.filter((h2) => h2.s0 < pn.s1_m && h2.s1 > pn.s0_m);
    let ch = wallH * 0.72;
    if (free.length) ch = Math.min(wallH - 0.3, Math.max(...free.map((h2) => h2.y1)) + 0.3);
    addLabel(scene, P(cs, ch).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.5, w * 0.7), pn.label, rotY);
  }
  for (const pc of pieces) {
    if (pc.kind === "bandeau") {
      const top = Math.max(ha, hb);
      quads([{ s0: ins, s1: len - ins, y0: wallH + ins, y1: top - ins }], rehMat);
      addLabel(scene, P(len / 2, (wallH + top) / 2).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.2, (top - wallH) * 0.85), pc.label, rotY);
    } else {
      const tallAtEnd = hb > ha;
      const sT = tallAtEnd ? len - ins : ins, sS = tallAtEnd ? ins : len - ins;
      const top = topAt(tallAtEnd ? len : 0) - ins;
      const pts = tallAtEnd ? [P(sS, wallH + ins), P(sT, wallH + ins), P(sT, top)] : [P(sT, wallH + ins), P(sS, wallH + ins), P(sT, top)];
      const g = new THREE.BufferGeometry();
      g.setFromPoints(pts);
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, rehMat));
      const sl = tallAtEnd ? len * 0.8 : len * 0.2;
      addLabel(scene, P(sl, (wallH + topAt(sl)) / 2).add(new THREE.Vector3(nx * 4e-3, 0, -ny * 4e-3)), Math.min(0.17, (topAt(sl) - wallH) * 0.85), pc.label, rotY);
    }
  }
}
function addRoofPanels(scene, V, outline, roofZ, thk, slope, panels, mat) {
  const ys = outline.map((p) => p[1]);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  const ins = 0.012, z = (yy) => roofZ(yy) + thk + 3e-3;
  for (const pn of panels) {
    const x0 = pn.x0_m + ins, x1 = pn.x1_m - ins, y0 = miny + ins, y1 = maxy - ins;
    const g = new THREE.BufferGeometry();
    g.setFromPoints([V(x0, y0, z(y0)), V(x1, y0, z(y0)), V(x1, y1, z(y1)), V(x0, y0, z(y0)), V(x1, y1, z(y1)), V(x0, y1, z(y1))]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, mat));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    addLabel(scene, V(cx, cy, roofZ(cy) + thk + 0.03), Math.min(0.5, (x1 - x0) * 0.7), pn.label, 0, -Math.PI / 2 - Math.atan(slope));
  }
}
function addGlass(scene, V, a, b, o) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const P = (s, h2) => V(a[0] + ux * s, a[1] + uy * s, h2);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 12575727,
    transparent: true,
    opacity: 0.34,
    roughness: 0.05,
    transmission: 0.6,
    side: THREE.DoubleSide
  });
  if (o.type !== "porte") {
    const s0 = o.offset_m, s1 = o.offset_m + o.width_m, y0 = o.sill_m, y1 = o.sill_m + o.height_m;
    const g = new THREE.BufferGeometry();
    g.setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y0), P(s1, y1), P(s0, y1)]);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, glass));
    scene.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1)]),
      new THREE.LineBasicMaterial({ color: 5595755 })
    ));
    if (o.ouvrant) {
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([P(s0, y0), P((s0 + s1) / 2, y1), P(s1, y0)]), new THREE.LineBasicMaterial({ color: 5595755 })));
    }
    return;
  }
  const hinge = new THREE.Group();
  hinge.position.copy(P(o.offset_m, 0));
  const dir = new THREE.Vector3().subVectors(P(o.offset_m + o.width_m, 0), P(o.offset_m, 0));
  dir.y = 0;
  dir.normalize();
  hinge.rotation.y = -Math.atan2(dir.z, dir.x);
  const lg = new THREE.PlaneGeometry(o.width_m, o.height_m);
  lg.translate(o.width_m / 2, o.height_m / 2, 0);
  const leaf = new THREE.Mesh(lg, glass);
  leaf.rotation.y = -0.6;
  hinge.add(leaf);
  scene.add(hinge);
}
function populate(group2, m) {
  const fp = m.footprint, hs = m.heights, n = fp.length;
  const cx = fp.reduce((s, p) => s + p[0], 0) / n;
  const cy = fp.reduce((s, p) => s + p[1], 0) / n;
  const V = (x, y, z) => new THREE.Vector3(x - cx, z, cy - y);
  const roofZ = (ym) => m.roof_front_m - (m.roof_slope || 0) * ym;
  const panelMat = new THREE.MeshStandardMaterial({ color: 15659250, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const rehMat = new THREE.MeshStandardMaterial({ color: m.rehausse_materiau === "bois" ? 12093786 : 15853256, roughness: m.rehausse_materiau === "bois" ? 0.85 : 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 13215612, roughness: 0.7, side: THREE.DoubleSide });
  const baseMat = new THREE.MeshStandardMaterial({ color: 4870232, roughness: 0.8, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 10135476, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const roofBaseMat = new THREE.MeshStandardMaterial({ color: 4870232, roughness: 0.8, side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 8293014, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 15394783, roughness: 0.95, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 7041399, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const metalMat = new THREE.MeshStandardMaterial({ color: 11844288, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
  group2.add(new THREE.Mesh(prismGeo(V, m.slab || fp, 0, -0.14), concreteMat));
  const wallMat = new THREE.MeshStandardMaterial({ color: 12168087, roughness: 0.95, side: THREE.DoubleSide });
  for (const w of m.walls || []) {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) || 1;
    const nx = (w.b[1] - w.a[1]) / len * w.ep_m, ny = -(w.b[0] - w.a[0]) / len * w.ep_m;
    const wall = new THREE.Mesh(prismGeo(V, [w.a, w.b, [w.b[0] + nx, w.b[1] + ny], [w.a[0] + nx, w.a[1] + ny]], w.h_m, -0.14), wallMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group2.add(wall);
  }
  group2.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, 5e-3), 0.06, 1e-3), railMat));
  if (m.floor_m > 0) group2.add(new THREE.Mesh(prismGeo(V, offsetRect(fp, -(m.thickness_m || 0.06)), m.floor_m + 5e-3, 2e-3), floorMat));
  const openings = m.openings || [];
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n], ha = hs[i], hb = hs[(i + 1) % n];
    const holes = openings.filter((o) => o.face_index === i).map((o) => ({
      s0: o.offset_m,
      s1: o.offset_m + o.width_m,
      y0: o.sill_m,
      y1: o.sill_m + o.height_m
    }));
    addWall(group2, V, a, b, ha, hb, holes, baseMat);
    addPanels(
      group2,
      V,
      a,
      b,
      ha,
      hb,
      m.wall_height_m,
      (m.panels || []).filter((q) => q.face_index === i),
      (m.rehausse_pieces || []).filter((q) => q.face_index === i),
      holes,
      panelMat,
      rehMat
    );
  }
  for (const o of openings) addGlass(group2, V, fp[o.face_index], fp[(o.face_index + 1) % n], o);
  const outline = m.roof_outline || offsetRect(fp, 0.15);
  addRoofSlab(group2, V, outline, roofZ, m.thickness_m, roofBaseMat);
  addRoofPanels(group2, V, outline, roofZ, m.thickness_m, m.roof_slope || 0, m.roof_panels || [], roofMat);
  addRoofRibs(group2, V, outline, roofZ, m.thickness_m, ribMat);
  const gi = m.gutter_face_index == null ? 2 : m.gutter_face_index;
  addGutter(group2, V, fp[gi], fp[(gi + 1) % n], roofZ, 0.2, metalMat);
}
function createViewer(container, model0) {
  const scene = new THREE.Scene();
  scene.background = makeSky();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(4.6, 3.2, 5.6);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.1, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  scene.add(new THREE.AmbientLight(16777215, 0.7));
  const sun = new THREE.DirectionalLight(16777215, 1);
  sun.position.set(5, 8, 3);
  sun.castShadow = true;
  sun.shadow.bias = -8e-4;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(13624319, 7039824, 0.4));
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 8628567, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.07;
  grass.receiveShadow = true;
  scene.add(grass);
  const building = new THREE.Group();
  scene.add(building);
  function rebuild(model) {
    for (let i = building.children.length - 1; i >= 0; i--) {
      const ch = building.children[i];
      building.remove(ch);
      ch.traverse((o) => {
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      });
    }
    populate(building, model);
  }
  rebuild(model0);
  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", onResize);
  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
  return { rebuild };
}

// site/src/render.ts
function setHTML(sel, html) {
  const e = document.querySelector(sel);
  if (e) e.innerHTML = html;
}
function setText(id, txt) {
  const e = document.getElementById(id);
  if (e) e.textContent = txt;
}
function renderKpis(core, p) {
  const g = core.geometrie, t = core.debit;
  const data = [
    [g.aire_m2 + " m\xB2", `Surface (${g.cotes.A} \xD7 ${g.cotes.G} cm)`],
    [g.pente.pourcent + " %", "Pente toiture (" + g.pente.degres + "\xB0)"],
    [`${t.murs.total_panneaux + t.rehausse.nb_panneaux} + ${t.toit.nb_panneaux}`, "Panneaux mur + toit"],
    [t.commande_panneaux_m2 + " m\xB2", "\xC0 commander (avec chute)"]
  ];
  setHTML("#kpis", data.map(([v, l]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join(""));
}
var REH = { bandeau: "bandeau", triangle: "triangle", aucune: "\u2014" };
function renderFaces(core) {
  const g = core.geometrie, t = core.debit.toit;
  let rows = g.faces.map((f) => `<tr><td><b>${f.cle}</b> \xB7 ${f.libelle}</td><td>${f.longueur_cm} cm</td><td>${f.hauteur_mur_cm} cm</td><td>${f.rehausse === "aucune" ? "\u2014" : `<span class="tag rake">${REH[f.rehausse]}</span> \u2192 ${f.hauteur_debut_cm}\u2013${f.hauteur_fin_cm} cm`}</td></tr>`).join("");
  rows += `<tr class="row-toit"><td><b>${t.face}</b> \xB7 ${t.libelle} <span class="tag toit">toit</span></td><td>${t.largeur_cm} cm</td><td colspan="2">${(t.longueur_panneau_cm / 100).toFixed(2)} m de rampant \xB7 ${g.hauteur_avant_cm} \u2192 ${g.hauteur_arriere_cm} cm</td></tr>`;
  setHTML("#faces tbody", rows);
}
function renderPlans(core) {
  for (const [name, svg] of Object.entries(core.svg)) {
    const box = document.getElementById("plan-" + name);
    if (box) box.innerHTML = svg;
  }
}
function renderDebit(core, p) {
  const t = core.debit, r = t.rehausse, cover = p.panneau.largeur_utile_cm;
  let rows = t.murs.lignes.map((x) => `<tr><td><b>${x.face}</b> \xB7 ${x.libelle}</td><td><span class="tag">mur</span></td><td>${x.pieces.map((q) => q.remplace_par ? `<s>${q.label}</s> = ${q.remplace_par}` : `<b>${q.label}</b> ${q.largeur_cm}`).join(" \xB7 ")} \xD7 ${x.hauteur_cm} cm \u2014 coupes droites</td><td>${x.nb_panneaux}</td><td>${x.aire_brute_m2} m\xB2</td></tr>`).join("");
  const bois = r.materiau === "bois";
  rows += `<tr><td><b>R</b> \xB7 Rehausse</td><td><span class="tag rake">${bois ? "bois" : "mur"}</span></td><td>${r.pieces.map((q) => `<b>${q.label}</b> ${q.longueur_cm} \xD7 ${q.hauteur_cm} cm (${q.piece.toLowerCase()})`).join(" + ")}, ` + (bois ? `${r.nb_madriers} madrier ${r.section_mm[0]}\xD7${r.section_mm[1]} de ${(r.longueur_stock_cm / 100).toFixed(2)} m (${r.ml} ml)` : `tir\xE9es de ${r.nb_panneaux} panneau de ${(r.longueur_panneau_cm / 100).toFixed(2)} m`) + `</td><td>${bois ? r.nb_madriers + " madrier" : r.nb_panneaux}</td><td>${bois ? "\u2014" : r.aire_brute_m2 + " m\xB2"}</td></tr>`;
  rows += `<tr class="row-toit"><td><b>${t.toit.face}</b> \xB7 ${t.toit.libelle}</td><td><span class="tag toit">toit</span></td><td>${t.toit.pieces.map((q) => `<b>${q.label}</b> ${q.largeur_cm}`).join(" \xB7 ")} \xD7 ${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m dans le sens de la pente \xB7 couvre ${t.toit.aire_couverte_m2} m\xB2</td><td>${t.toit.nb_panneaux}</td><td>${t.toit.aire_brute_m2} m\xB2</td></tr>`;
  setHTML("#debit tbody", rows);
  setHTML(
    "#debit-resume",
    `Murs : <b>${t.murs.total_panneaux} panneaux</b> identiques (~${t.murs.aire_brute_m2} m\xB2 brut, ${t.murs.aire_nette_m2} m\xB2 net)` + (bois ? ` + rehausse en <b>bois</b> (${r.nb_madriers} madrier)` : ` + <b>${r.nb_panneaux} panneau</b> de rehausse`) + `. Toiture : <b>${t.toit.nb_panneaux} panneaux</b> de ~${(t.toit.longueur_panneau_cm / 100).toFixed(2)} m. Commande totale avec chute ${t.facteur_chute_pct} % : <b>${t.commande_panneaux_m2} m\xB2</b>.`
  );
}
function renderAchats(core) {
  setHTML("#achats tbody", core.achats.map((a) => `<tr><td>${a.poste}</td><td>${a.qte}</td><td class="note">${a.note}</td></tr>`).join(""));
}
function renderBudget(core) {
  const b = core.budget;
  const row = (r) => `<tr class="${r.groupe === "amenagement" ? "row-amen" : ""}"><td>${r.poste}</td><td>${r.qte} ${r.unite}</td><td>${r.pu_eur} \u20AC</td><td><b>${r.montant_eur} \u20AC</b></td></tr>`;
  const coque = b.lignes.filter((r) => r.groupe !== "amenagement"), amen = b.lignes.filter((r) => r.groupe === "amenagement");
  setHTML("#budget tbody", coque.map(row).join("") + `<tr class="row-sub"><td colspan="3">Coque (structure, menuiseries, toit)</td><td><b>${b.coque_eur} \u20AC</b></td></tr>` + amen.map(row).join("") + (amen.length ? `<tr class="row-sub"><td colspan="3">Am\xE9nagement (confort au quotidien)</td><td><b>${b.amenagement_eur} \u20AC</b></td></tr>` : ""));
  setHTML(
    "#budget-total",
    `Total <b>${b.sous_total_eur} \u20AC</b> HT \xB7 fourchette indicative <b>${b.total_bas_eur} \u2013 ${b.total_haut_eur} \u20AC</b> (\xB1${b.incertitude_pct} %)`
  );
}
function renderAmenagement(core, p) {
  const am = p.amenagement || {}, g = core.geometrie;
  const items = [
    ["plancher", "\u{1FAB5} Plancher isol\xE9", am.plancher ? `${am.plancher.description}. ${am.plancher.epaisseur_cm} cm \u21D2 hauteur sous plafond ${((g.hauteur_arriere_cm - am.plancher.epaisseur_cm) / 100).toFixed(2)} m \xE0 l'arri\xE8re, ${((g.hauteur_avant_cm - am.plancher.epaisseur_cm) / 100).toFixed(2)} m \xE0 l'avant.` : ""],
    ["electricite", "\u{1F50C} \xC9lectricit\xE9", am.electricite ? am.electricite.description : ""],
    ["chauffage", "\u{1F525} Chauffage", am.chauffage ? am.chauffage.description : ""],
    ["store", "\u{1F31E} Store", am.store ? am.store.description : ""],
    ["finition_interieure", "\u{1F3A7} Finition int\xE9rieure", am.finition_interieure ? am.finition_interieure.description : ""]
  ];
  setHTML("#amenagement-list", items.filter(([k]) => am[k] && am[k].actif).map(([, t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("") || '<li class="note">Aucun am\xE9nagement activ\xE9 (voir r\xE9glages).</li>');
  setText("v-interieur", String(g.aire_interieure_m2));
}
function renderVigilance(core, p) {
  const g = core.geometrie, pente = g.pente, d = g.dalle;
  setText("cover", p.panneau.largeur_utile_cm + " cm");
  setText("v-chute", String(pente.chute_cm));
  setText("v-pente", pente.pourcent + " %");
  setText("v-pente-deg", pente.degres + "\xB0");
  setText("v-portee", (core.debit.toit.portee_cm / 100).toFixed(2) + " m");
  setText("v-ep", String(p.panneau.epaisseur_mm));
  setText("v-emprise-deb", String(g.emprise_debords_m2));
  setText("v-emprise", String(g.formalites.emprise_au_sol_m2));
  const seuil = document.getElementById("v-seuil");
  const F = g.formalites;
  setText("v-plancher", String(F.surface_plancher_m2));
  if (seuil) seuil.textContent = F.formalite === "aucune" ? "aucune formalit\xE9 a priori, \xE0 confirmer en mairie." : `${F.libelle} \xE0 d\xE9poser.`;
  const card = document.getElementById("v-dalle");
  if (card && d) {
    card.hidden = !d.hors_dalle;
    const worst = Math.min(...Object.values(d.marges_cm).filter((v) => typeof v === "number"));
    setText("v-dalle-tri", `${d.hors_dalle_m2} m\xB2${worst < 0 ? ` (jusqu'\xE0 ${Math.round(-worst)} cm au-del\xE0 du bord)` : ""}`);
    const mur = document.getElementById("v-dalle-mur");
    if (mur) mur.hidden = !d.hors_dalle_contre_mur;
  } else if (card) card.hidden = true;
  const pc = document.getElementById("v-passage");
  if (pc) {
    const ps = d && d.passage;
    pc.hidden = !ps;
    if (ps) {
      pc.className = "card " + (ps.etat === "praticable" ? "ok" : "warn");
      setText("v-passage-cm", `${Math.round(ps.cm)} cm`);
      setText("v-passage-etat", ps.etat === "praticable" ? "on passe normalement" : ps.etat === "de profil" ? "on passe de profil seulement" : ps.cm <= 0 ? "l'abri traverse le mur : impossible" : "on ne passe pas");
      setText("v-passage-souhaite", String(ps.souhaite_cm));
      setText("v-passage-gmax", String(ps.profondeur_max_cm));
      setText("v-passage-g", String(g.cotes.G));
      const gauche = d.murs.find((w) => w.cote === "gauche");
      setText("v-passage-gauche", gauche ? `${gauche.abri_cm} cm` : "\u2014");
      setText("v-passage-toit", d.degagement_toit_min_cm == null ? "\u2014" : `${d.degagement_toit_min_cm} cm`);
    }
  }
}
function renderAll(core, p) {
  renderKpis(core, p);
  renderFaces(core);
  renderPlans(core);
  renderDebit(core, p);
  renderAchats(core);
  renderBudget(core);
  renderAmenagement(core, p);
  renderVigilance(core, p);
}

// site/src/controls.ts
var POSITIONS = [["gauche", "\xE0 gauche"], ["centre", "centr\xE9e"], ["droite", "\xE0 droite"]];
var FACES = [["A", "A \xB7 avant"], ["D", "D \xB7 droite"], ["B", "B \xB7 arri\xE8re"], ["G", "G \xB7 gauche"]];
function h(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of children) e.append(c);
  return e;
}
function group(title, nodes, open = true) {
  return h("details", { class: "ctl-group", ...open ? { open: "" } : {} }, [
    h("summary", {}, [title]),
    ...nodes
  ]);
}
function buildControls(container, params, onChange) {
  function slider(label, obj, key, min, max, step = 1, unit = "cm") {
    const out = h("span", { class: "ctl-val" }, [`${obj[key]} ${unit}`]);
    const input = h("input", { type: "range", min, max, step, value: obj[key] });
    input.addEventListener("input", () => {
      obj[key] = Number(input.value);
      out.textContent = `${obj[key]} ${unit}`;
      onChange();
    });
    return h("label", { class: "ctl ctl-range" }, [h("span", { class: "ctl-lbl" }, [label, out]), input]);
  }
  function num(label, obj, key, step = 1, width = "5.5em") {
    const input = h("input", { type: "number", step, value: obj[key], style: `width:${width}` });
    input.addEventListener("input", () => {
      obj[key] = input.value === "" ? 0 : Number(input.value);
      onChange();
    });
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), input]);
  }
  function select(label, obj, key, options) {
    const sel = h("select", {
      onchange: () => {
        obj[key] = sel.value;
        onChange();
      }
    }, options.map(([v, l]) => {
      const o = h("option", { value: v }, [l]);
      if (String(obj[key]) === v) o.selected = true;
      return o;
    }));
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), sel]);
  }
  function check(label, obj, key) {
    const input = h("input", { type: "checkbox" });
    input.checked = !!obj[key];
    input.addEventListener("change", () => {
      obj[key] = input.checked;
      onChange();
    });
    return h("label", { class: "ctl ctl-check" }, [input, h("span", {}, [label])]);
  }
  function amenagementGroup() {
    const am = params.amenagement || (params.amenagement = {});
    const labels = [["plancher", "Plancher isol\xE9"], ["electricite", "\xC9lectricit\xE9 (multiprise + \xE9clairage)"], ["chauffage", "Chauffage"], ["store", "Store"], ["finition_interieure", "Finition int\xE9rieure"]];
    return labels.filter(([k]) => am[k]).map(([k, l]) => check(l, am[k], "actif"));
  }
  function dalleGroup() {
    const d = params.dalle_cm;
    const off = d.decalage_cm || (d.decalage_cm = { x: 0, y: 0 });
    return [
      slider("C\xF4t\xE9 avant", d, "avant", 100, 500),
      slider("C\xF4t\xE9 droit", d, "droite", 50, 500),
      slider("C\xF4t\xE9 gauche", d, "gauche", 50, 500),
      slider("Pan arri\xE8re gauche (petit)", d, "arriere_gauche", 0, 500),
      slider("Pan arri\xE8re droit (grand)", d, "arriere_droite", 0, 500),
      slider("Passage arri\xE8re vis\xE9 (le long du grand pan)", d, "passage_souhaite_cm", 0, 100),
      slider("Abri : distance au mur gauche", off, "x", 0, 150),
      slider("Abri : distance au bord avant de la dalle", off, "y", 0, 150)
    ];
  }
  function priceControls() {
    const pr = params.prix_indicatifs_eur || {};
    return Object.keys(pr).filter((k) => !k.startsWith("_") && typeof pr[k] === "number").map((k) => num(k.replace(/_/g, " "), pr, k, 1, "5.5em"));
  }
  function windowsGroup() {
    const list = params.fenetres || (params.fenetres = []);
    const body = h("div", { class: "openings" });
    const rerender = () => {
      renderPanel();
      onChange();
    };
    list.forEach((w, i) => {
      const faceSel = h(
        "select",
        { onchange: () => {
          w.face = faceSel.value;
          onChange();
        } },
        FACES.map(([v, l]) => {
          const o = h("option", { value: v }, [l]);
          if (w.face === v) o.selected = true;
          return o;
        })
      );
      if (typeof w.position !== "number") {
        const faceLen = w.face === "A" || w.face === "B" ? +params.emprise_cm.avant_A : +params.emprise_cm.gauche_G;
        w.position = Math.round(opening_start_cm(w, faceLen));
      }
      body.append(h("div", { class: "opening-card" }, [
        h("div", { class: "ctl-row" }, [
          h("b", {}, [`Fen\xEAtre ${i + 1}`]),
          faceSel,
          h("button", { class: "btn-mini", title: "Supprimer", onclick: () => {
            list.splice(i, 1);
            rerender();
          } }, ["\u2715"])
        ]),
        slider("Largeur", w, "largeur_cm", 40, 140),
        slider("Hauteur", w, "hauteur_cm", 40, 140),
        slider("All\xE8ge (bas / sol)", w, "allege_cm", 60, 160),
        slider("Position depuis le d\xE9but de la face", w, "position", 0, 400),
        check("Ouvrante (oscillo-battante)", w, "ouvrant")
      ]));
    });
    body.append(h("button", { class: "btn btn-ghost btn-add", onclick: () => {
      list.push({ face: "D", largeur_cm: 80, hauteur_cm: 110, allege_cm: 95, position: 110, ouvrant: false });
      rerender();
    } }, ["+ Ajouter une fen\xEAtre"]));
    return body;
  }
  function renderPanel() {
    container.innerHTML = "";
    const e = params.emprise_cm;
    const deb = params.toit.debord_cm;
    container.append(
      group("Emprise & murs (cm)", [
        slider("Largeur \u2014 face avant (A)", e, "avant_A", 100, 400),
        slider("Profondeur \u2014 face gauche (G)", e, "gauche_G", 100, 400),
        slider("Hauteur des murs (arri\xE8re)", params.murs, "hauteur_cm", 180, 300)
      ]),
      ...params.dalle_cm ? [group("Dalle existante (cm)", dalleGroup())] : [],
      group("Toit", [
        slider("Rehausse avant = chute", params.toit, "pente_chute_cm", 5, 60),
        h("div", { class: "ctl-row" }, [
          h("span", { class: "ctl-lbl ctl-lbl-wide" }, ["D\xE9bords (cm)"]),
          ...["avant", "arriere", "gauche", "droite"].map((k) => {
            const input = h("input", { type: "number", step: 1, value: deb[k] ?? 0, style: "width:4.5em" });
            input.addEventListener("input", () => {
              deb[k] = input.value === "" ? 0 : Number(input.value);
              onChange();
            });
            return h("label", { class: "ctl-inline" }, [k.replace("arriere", "arr."), input]);
          })
        ])
      ]),
      group("Porte", [
        slider("Largeur", params.porte, "largeur_cm", 60, 140),
        slider("Hauteur", params.porte, "hauteur_cm", 180, 230),
        select("Position sur la face avant", params.porte, "position", POSITIONS)
      ]),
      group("Fen\xEAtres", [windowsGroup()], (params.fenetres || []).length > 0),
      group("Am\xE9nagement", amenagementGroup()),
      group("Panneaux", [
        slider("Largeur utile", params.panneau, "largeur_utile_cm", 80, 120),
        slider("Chute / pertes", params.divers, "facteur_chute_pct", 0, 30, 1, "%")
      ]),
      group("Prix indicatifs (\u20AC)", priceControls(), false)
    );
  }
  renderPanel();
  return { refresh: renderPanel };
}

// site/src/main.ts
var clone = (o) => JSON.parse(JSON.stringify(o));
document.addEventListener("DOMContentLoaded", () => {
  const DEFAULTS = window.SHED_PARAMS;
  if (!DEFAULTS) {
    console.error("params.js manquant (window.SHED_PARAMS).");
    return;
  }
  const params = clone(DEFAULTS);
  let core = buildCore(params);
  renderAll(core, params);
  let viewer = null;
  const viewerEl = document.getElementById("viewer");
  try {
    if (viewerEl) viewer = createViewer(viewerEl, core.model3d);
  } catch (e) {
    if (viewerEl) viewerEl.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible (WebGL requis). Voir les plans ci-dessous.</p>';
    console.error(e);
  }
  const onChange = () => {
    try {
      core = buildCore(params);
      renderAll(core, params);
      if (viewer) viewer.rebuild(core.model3d);
      setStatus("\u2713 Mod\xE8le, plans et chiffres mis \xE0 jour en direct.", "#2a8");
    } catch (e) {
      setStatus("\u2717 Param\xE8tre invalide : " + (e?.message || e), "#c0392b");
      console.error(e);
    }
  };
  const controls = buildControls(document.getElementById("controls"), params, onChange);
  const reset = document.getElementById("cfg-reset");
  if (reset) reset.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    for (const k of Object.keys(params)) delete params[k];
    Object.assign(params, fresh);
    controls.refresh();
    onChange();
    setStatus("R\xE9initialis\xE9 aux valeurs publi\xE9es.", "#888");
  });
  window.setTimeout(() => {
    const v = document.getElementById("viewer");
    if (v && !v.querySelector("canvas") && !v.textContent.trim()) {
      v.innerHTML = '<p class="viewer-fallback">Rendu 3D indisponible ici (WebGL requis, ou librairie bloqu\xE9e). Les plans plus bas restent enti\xE8rement valables.</p>';
    }
  }, 4e3);
});
function setStatus(msg, color) {
  const s = document.getElementById("cfg-status");
  if (s) {
    s.textContent = msg;
    s.style.color = color;
  }
}
