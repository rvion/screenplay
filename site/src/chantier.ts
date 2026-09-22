// Chantier de l'abri retenu : nomenclature des MATERIAUX (quantites calculees, prix TTC de params.json,
// ni main-d'oeuvre ni forfait) et guide de montage complet. Pur, sans import de compute.ts (pas de cycle) :
// tout vient de la variante `v` et du modele `m` deja calcules.
type P = any;
const rnd = (x: number, nd = 0) => { const k = Math.pow(10, nd); return Math.round(x * k) / k; };
const fr = (x: number) => String(x).replace(".", ",");
const fz = (x: number) => fr(rnd(x, 1));
const haut = (n: number) => Math.ceil(n - 1e-9);

export interface LigneMateriau { groupe: string; poste: string; qte: number; unite: string; pu_eur: number; montant_eur: number; regle: string; a_confirmer: boolean; source: string; note: string; optionnel: boolean }

// bords du toit : egout (l'eau sort), haut (cote oppose), rive (les autres)
function bords_toit(m: any) {
  const c: number[][] = m.toit.contour, n = c.length, droite = m.sens === "droite";
  let egout = 0, hautc = 0, rive = 0;
  for (let i = 0; i < n; i++) {
    const a = c[i], b = c[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l, k = droite ? nx : ny;
    if (k > 0.2) egout += l; else if (k < -0.2) hautc += l; else rive += l;
  }
  return { egout_m: egout / 100, haut_m: hautc / 100, rive_m: rive / 100 };
}

export function nomenclature_abri(p: P, v: any, m: any) {
  const prix = p.prix_materiaux_eur_ttc || {}, d = p.disposition_trapeze || {}, t = d.toit || {};
  const mod = +p.panneau.largeur_utile_cm / 100, H = m.hauteur_mur_cm / 100, ep = +p.panneau.epaisseur_mm;
  const perim = m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100;
  const n_murs = m.panneaux_mur_a_commander, n_toit = m.toit.panneaux.length;
  const mod_t = (m.toit.module_cm || mod * 100) / 100, toit_m2 = m.toit.panneaux.reduce((s: number, x: any) => s + mod_t * x.longueur_cm / 100, 0);
  const joints_murs = m.faces.reduce((s: number, f: any) => s + Math.max(0, f.panneaux.length - 1), 0);
  const angles_droits = m.angles_deg.map((g: number, i: number) => ({ g, h: m.hauteurs_coins_cm[i] / 100 })).filter((x: any) => Math.abs(x.g - 90) < 0.5);
  const angles_speciaux = m.angles_deg.map((g: number, i: number) => ({ g, h: m.hauteurs_coins_cm[i] / 100 })).filter((x: any) => Math.abs(x.g - 90) >= 0.5);
  const B = bords_toit(m), G = m.toit.gouttiere, po = v.porte, fen = v.fenetres || [];
  const ouv_perim = (po ? (2 * po.hauteur_cm + po.largeur_cm) : 0) / 100 + fen.reduce((s: number, f: any) => s + 2 * (f.largeur_cm + f.hauteur_cm), 0) / 100;
  const panne = t.panne_intermediaire ? m.faces[0].longueur_cm / 100 : 0;
  const appuis_toit = 2 + (panne ? 1 : 0);
  const aire = v.aire_interieure_m2, pl = p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif;
  const h_descente = Math.min(...m.hauteurs_coins_cm) / 100;

  const lignes: LigneMateriau[] = [];
  const pose = (groupe: string, cle: string, poste: string, qte: number, regle: string, optionnel = false) => {
    const e = prix[cle] || {}, pu = +e.pu || 0, q = rnd(qte, 2);
    if (q <= 0) return;
    lignes.push({ groupe, poste, qte: q, unite: e.unite || "u", pu_eur: pu, montant_eur: rnd(q * pu), regle, a_confirmer: !e.source || !!e.incertain, source: e.source || "", note: e.note || "", optionnel });
  };
  // --- panneaux
  // une ligne par largeur utile : 100 et 115 sont deux references chez le fournisseur
  const par_largeur: Record<string, number> = m.panneaux_mur_par_largeur || { [mod * 100]: n_murs };
  for (const [l, n] of Object.entries(par_largeur).sort((a, b) => +a[0] - +b[0])) pose("Panneaux", "panneau_mur_m2", `Panneaux sandwich de mur ${ep} mm, ${fz(+l)} × ${fz(H * 100)} cm`, n * (+l / 100) * H, `${n} panneau(x) entier(s) de ${fz(+l)} à commander (les bandes recoupées sortent des chutes)`);
  pose("Panneaux", "panneau_toit_m2", `Panneaux sandwich de toiture ${ep} mm, nervurés, teinte claire`, toit_m2, `${n_toit} panneaux coupés à longueur : ${m.toit.panneaux.map((x: any) => `${x.id} ${fz(x.longueur_cm)} cm`).join(", ")}`);
  // --- bois
  pose("Bois", "madrier_ml", `Madrier ${m.rehausse.section_mm.join(" × ")} classe 4 (rehausse, lisse haute)`, m.rehausse.nb_madriers * m.rehausse.longueur_stock_cm / 100, `${m.rehausse.nb_madriers} pièce(s) de ${fz(m.rehausse.longueur_stock_cm)} cm`);
  if (panne) pose("Bois", "panne_ml", "Panne intermédiaire 75 × 150 classe 4, en travers à mi-profondeur", panne, `portée du toit ${fz(m.portee_cm / 100)} m : une panne de la longueur de la façade la ramène à ${fz(m.portee_cm / 200)} m`);
  // un bloc de service exterieur a son dormant : pas de cadre bois (chambranle 0)
  if (po && po.chambranle_cm > 0) pose("Bois", "chevron_cadre_ml", `Bois du cadre de porte, section ${fz(po.chambranle_cm * 10)} × ${ep} mm`, (2 * (po.hauteur_cm + po.chambranle_cm) + po.largeur_cm) / 100, "deux montants + une traverse haute");
  // --- profils acier
  pose("Profils et bavettes", "profil_pied_ml", "Profil de départ en U (rail de pied)", perim - (po ? (po.largeur_cm + 2 * po.chambranle_cm) / 100 : 0), "périmètre des murs moins le cadre de la porte");
  pose("Profils et bavettes", "angle_standard_ml", "Profils d'angle à 90°, extérieur + intérieur", 2 * angles_droits.reduce((s: number, x: any) => s + x.h, 0), `${angles_droits.length} angles droits, hauteur finie de chaque coin, deux faces`);
  pose("Profils et bavettes", "angle_sur_mesure_ml", `Profils d'angle pliés sur mesure (${[...new Set(angles_speciaux.map((x: any) => fr(x.g) + "°"))].join(", ")}), extérieur + intérieur`, 2 * angles_speciaux.reduce((s: number, x: any) => s + x.h, 0), `${angles_speciaux.length} angles non droits, deux faces`);
  pose("Profils et bavettes", "bande_rive_ml", "Bandes de rive de toit", B.rive_m, "bords du toit parallèles à la pente");
  pose("Profils et bavettes", "bandeau_haut_ml", "Bavette de tête (bord haut du toit)", B.haut_m, "bord haut du toit");
  pose("Profils et bavettes", "closoir_ml", "Closoirs mousse sous les nervures", B.egout_m + B.haut_m, "bord haut + bord d'égout");
  // --- fixations
  pose("Fixations", "vis_toit_100", "Vis autoperceuses de toiture à rondelle, longues (panneau + nervure dans le bois)", haut(n_toit * appuis_toit * 4 / 100 * 1.1 * 100) / 100, `${n_toit} panneaux × ${appuis_toit} appuis × 4 vis, +10 %`);
  pose("Fixations", "vis_couture_100", "Vis de couture (recouvrements de panneaux, bavettes, profils)", haut(((n_toit - 1) * (m.portee_cm / 100) / 0.4 + (perim + B.rive_m + B.haut_m) / 0.3) * 1.1) / 100, "un recouvrement tous les 40 cm, une bavette tous les 30 cm, +10 %");
  pose("Fixations", "vis_mur_100", "Vis autoperceuses de panneaux de mur (pied et tête)", haut(n_murs * 2 * 3 * 1.1) / 100, `${n_murs} panneaux × 2 extrémités × 3 vis, +10 %`);
  pose("Fixations", "cheville_beton_u", "Chevilles ou goujons pour fixer le rail dans la dalle", haut(perim / 0.5) + 2, "une tous les 50 cm");
  // --- etancheite
  pose("Étanchéité", "bande_arase_ml", "Bande d'arase sous le rail de pied", perim, "périmètre des murs");
  pose("Étanchéité", "butyle_ml", "Bande butyle (joints de panneaux, tête de mur sous la rehausse)", joints_murs * H + perim + (n_toit - 1) * m.portee_cm / 100, `${joints_murs} joints de mur × ${fz(H)} m + périmètre + recouvrements de toit`);
  pose("Étanchéité", "mastic_cartouche", "Mastic polyuréthane ou MS polymère, cartouches", haut((perim * 2 + ouv_perim) / 8), "une cartouche pour 8 m de cordon : pied de mur dedans et dehors, tour des ouvertures");
  pose("Étanchéité", "bande_comprimee_ml", "Bande comprimée au pourtour des ouvertures", ouv_perim, "tour de la porte et des fenêtres");
  pose("Étanchéité", "mousse_pu_u", "Mousse polyuréthane expansive, bombes", 2, "calfeutrement des ouvertures et des angles");
  // --- ouvertures
  if (po) pose("Ouvertures", po.vitree === false ? "porte_pleine_u" : "porte_vitree_u", `Bloc-porte ${po.vitree === false ? "plein" : "vitré"} ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} cm, avec dormant`, 1, "une porte");
  pose("Ouvertures", "fenetre_fixe_u", `Fenêtre fixe PVC double vitrage ${fen[0] ? `${fz(fen[0].largeur_cm)} × ${fz(fen[0].hauteur_cm)}` : ""} cm`, fen.filter((f: any) => !f.ouvrant).length, "fenêtres fixes");
  pose("Ouvertures", "fenetre_ob_u", `Fenêtre oscillo-battante PVC double vitrage ${fen[0] ? `${fz(fen[0].largeur_cm)} × ${fz(fen[0].hauteur_cm)}` : ""} cm`, fen.filter((f: any) => f.ouvrant).length, "fenêtres ouvrantes");
  // --- eaux pluviales
  pose("Eaux pluviales", "gouttiere_ml", "Gouttière demi-ronde", G.longueur_cm / 100, `${G.troncons.length} tronçon(s) : ${G.troncons.map((x: any) => `${x.face} ${fz(x.longueur_cm)} cm`).join(" + ")}`);
  pose("Eaux pluviales", "gouttiere_crochet_u", "Crochets de gouttière", haut(G.longueur_cm / 100 / 0.5) + 1, "un tous les 50 cm");
  pose("Eaux pluviales", "gouttiere_accessoires_u", "Naissance, fonds, angle, coudes et colliers (lot)", 1, `${G.troncons.length > 1 ? "un angle, " : ""}une naissance, deux fonds, deux coudes, deux colliers`);
  pose("Eaux pluviales", "descente_ml", "Tuyau de descente", h_descente + (t.descente === "droite" && m.sens !== "droite" ? m.faces[1].longueur_cm / 100 : 0), t.descente === "droite" && m.sens !== "droite" ? "hauteur du mur + le retour au sol le long du mur droit jusqu'au jardin" : "hauteur du mur côté égout");
  // --- plancher
  if (pl) {
    pose("Plancher isolé", "lambourde_ml", "Lambourdes traitées (entraxe 40 cm)", haut(aire / 0.4 * 1.1), "surface intérieure ÷ 0,40 m, +10 %");
    pose("Plancher isolé", "isolant_sol_m2", "Isolant rigide 40 mm entre lambourdes", aire * 1.05, "surface intérieure, +5 %");
    pose("Plancher isolé", "film_pe_m2", "Film polyéthylène sous le plancher", aire * 1.15, "surface intérieure, +15 % de recouvrements");
    pose("Plancher isolé", "osb_m2", "Dalles OSB3 18 mm rainurées", aire * 1.1, "surface intérieure, +10 % de chutes");
    pose("Plancher isolé", "revetement_sol_m2", "Revêtement de sol (vinyle ou stratifié)", aire * 1.1, "surface intérieure, +10 % de chutes");
  }
  // --- equipement : a part, chacun decide
  pose("Équipement (optionnel)", "aerateur_u", "Grilles ou entrées d'air murales", 2, "une basse, une haute, sur deux murs opposés", true);
  pose("Équipement (optionnel)", "goulotte_u", "Goulotte électrique 2 m", haut(perim / 2 / 2), "la moitié du périmètre, en longueurs de 2 m", true);
  pose("Équipement (optionnel)", "multiprise_u", "Multiprise parafoudre", 1, "sur le câble déjà en place", true);
  pose("Équipement (optionnel)", "eclairage_u", "Réglette ou plafonnier LED", 1, "un point lumineux", true);
  pose("Équipement (optionnel)", "radiateur_u", "Radiateur panneau 750 W à thermostat", 1, "bureau chauffé toute l'année", true);
  pose("Équipement (optionnel)", "store_u", "Stores des fenêtres de façade", fen.length, "un par fenêtre", true);
  pose("Consommables", "lame_metal_u", "Lame de scie circulaire pour métal (coupe à froid des panneaux)", 1, "jamais de meuleuse : elle brûle le laquage et la mousse");

  const groupes = [...new Set(lignes.map((l) => l.groupe))].map((nom) => ({ nom, total_eur: rnd(lignes.filter((l) => l.groupe === nom).reduce((s, l) => s + l.montant_eur, 0)), optionnel: lignes.filter((l) => l.groupe === nom).every((l) => l.optionnel) }));
  const materiaux = rnd(lignes.filter((l) => !l.optionnel).reduce((s, l) => s + l.montant_eur, 0)), options = rnd(lignes.filter((l) => l.optionnel).reduce((s, l) => s + l.montant_eur, 0));
  const plancher = rnd(lignes.filter((l) => l.groupe === "Plancher isolé").reduce((s, l) => s + l.montant_eur, 0));
  const inc = prix.incertitude_pct == null ? 15 : +prix.incertitude_pct;
  return {
    ttc: true, lignes, groupes,
    materiaux_eur: materiaux, options_eur: options, a_confirmer: lignes.filter((l) => l.a_confirmer).length,
    hors_materiaux: prix.livraison_panneaux ? [{ poste: "Livraison des panneaux (service, hors total)", montant_eur: +prix.livraison_panneaux.pu || 0, note: prix.livraison_panneaux.note || "" }] : [],
    // memes champs que l'ancien budget, pour les tableaux compares : le total ne compte que les materiaux
    coque_eur: rnd(materiaux - plancher), amenagement_eur: plancher, total_eur: materiaux, incertitude_pct: inc,
    total_bas_eur: rnd(materiaux * (1 - inc / 100)), total_haut_eur: rnd(materiaux * (1 + inc / 100)),
  };
}

export interface EtapeGuide { titre: string; but: string; outils: string[]; faire: string[]; controler: string[] }

export function guide_montage(p: P, v: any, m: any): { avant: string[]; outillage: string[]; etapes: EtapeGuide[] } {
  const d = p.disposition_trapeze || {}, t = d.toit || {}, mod = +p.panneau.largeur_utile_cm, ep = +p.panneau.epaisseur_mm / 10;
  const limite = ((p.dalle_cm && p.dalle_cm.grillages) || []).includes("gauche") ? "grillage de la limite" : "mur de propriété";
  const F: Record<string, any> = Object.fromEntries(m.faces.map((f: any) => [f.cle, f])), n = m.faces.length, po = v.porte, fen = v.fenetres || [];
  const gauche = Math.min(...v.polygone.map((z: number[]) => z[0])), avant = Math.min(...v.polygone.map((z: number[]) => z[1]));
  const perim = m.faces.reduce((s: number, f: any) => s + f.longueur_cm, 0) / 100, G = m.toit.gouttiere;
  const bande = (f: any) => f.panneaux.find((x: any) => x.largeur_cm < mod - 0.05);
  const liste = (f: any) => f.panneaux.map((x: any) => `${x.id} (${fz(x.largeur_cm)})`).join(", ");
  const diag = (a: number[], b: number[]) => fz(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const q = v.polygone, speciaux = [...new Set(m.angles_deg.filter((g: number) => Math.abs(g - 90) >= 0.5).map((g: number) => fr(g) + "°"))];
  const face_porte = po ? m.faces[po.cote] : null, passage = v.passages.find((x: any) => x.cote === "arriere_droite");
  const vers = m.sens === "droite" ? "la droite (jardin)" : "le fond";

  const avantTout = [
    `Faire confirmer par le fournisseur la **largeur utile** des panneaux (${fz(mod)} cm ici${Object.keys(p.panneau.largeur_utile_par_face_cm || {}).length ? `, ${Object.entries(p.panneau.largeur_utile_par_face_cm).map(([f, l]) => `${fz(+(l as any))} pour ${f === "T" ? "le toit" : "le mur " + f}`).join(", ")}` : ""}) : tout le calepinage en dépend.`,
    "**Acheter des panneaux en petite quantité est le vrai sujet.** Les vendeurs en ligne les moins chers imposent 100 m² ou un paquet entier de panneaux de 6 à 7,5 m. Demander un devis « coupé à longueur, petite quantité » à deux spécialistes et à un négoce local, qui vend au panneau mais plus cher. Sinon acheter des longueurs de stock et les recouper sur place : compter alors plus de surface que le débit.",
    `Rehausse : le madrier ${m.rehausse.section_mm.join(" × ")} ne se trouve en stock qu'en **classe 2**. En **classe 4** la section courante est 70 × 220, en 4 m ou 4,5 m : la prendre (la chute du toit perd 5 mm, sans conséquence) ou protéger un classe 2 par la bavette.`,
    "Fenêtres et porte sont des articles de stock, sans délai : la découpe des panneaux se fait aux cotes hors tout lues sur l'article reçu, pas aux cotes nominales.",
    `Faire confirmer la **portée** admise du panneau de toit de ${fz(ep)} cm : ${fz(m.portee_cm / 100)} m ici${t.panne_intermediaire ? `, ramenée à ${fz(m.portee_cm / 200)} m par la panne intermédiaire` : ""} ; et la **pente minimale** (${fr(m.pente.pourcent)} % ici ; ArcelorMittal admet 5 % pour des panneaux d'une seule longueur, sans pénétration ni recouvrement en bout).`,
    `Commander les panneaux de toit **coupés à longueur**, et les profils des angles de ${speciaux.join(" et ") || "90°"} **pliés sur mesure**, en même temps que les panneaux.`,
    `Vérifier au PLU la règle d'implantation (l'abri est à ${fz(gauche)} cm de la limite).`,
    "Prévoir deux personnes pour lever les murs et poser le toit, et une journée sans vent : un panneau de 2 m² est une voile.",
  ];
  const outillage = [
    "Scie circulaire avec **lame pour métal** (coupe à froid) et rail de guidage ; scie sauteuse lame métal pour les angles des ouvertures. **Pas de meuleuse** : elle brûle le laquage et la mousse, et ses étincelles piquent la tôle.",
    "Visseuse à choc avec douilles 8 mm, perforateur et foret béton, cordeau à tracer, mètre de 5 m, niveau de 1,20 m ou laser, grande équerre, fil à plomb.",
    "Pistolet à mastic, cutter, serre-joints, 4 étais ou chevrons pour tenir les murs pendant le montage, échelle ou escabeau stable.",
    "Gants anti-coupure, lunettes, protection auditive. Les rives de tôle coupent.",
  ];
  const etapes: EtapeGuide[] = [
    {
      titre: "Tracer l'abri sur la dalle", but: "Tout le reste s'aligne sur ce tracé : dix minutes de plus ici évitent un mur qui ne ferme pas.",
      outils: ["cordeau", "mètre", "grande équerre"],
      faire: [
        `Tracer la façade à ${fz(avant)} cm du bord avant de la dalle et le mur gauche à ${fz(gauche)} cm du bord gauche.`,
        `Reporter les ${n} murs dans l'ordre : ${m.faces.map((f: any) => `${f.cle} ${fr(f.longueur_cm)} cm`).join(", ")}.`,
        `Angles, dans le même ordre : ${m.angles_deg.map((g: number) => fr(g) + "°").join(", ")}.`,
      ],
      controler: [`Diagonales du tracé : coin avant gauche → haut du mur droit = ${diag(q[0], q[2])} cm ; coin avant droit → coin arrière gauche = ${diag(q[1], q[n - 1])} cm.`, `Passage derrière l'abri : ${fr(passage.cm)} cm au plus étroit, à mesurer une fois le tracé fait.`],
    },
    {
      titre: "Poser le rail de pied", but: "Le rail tient le pied des panneaux et les isole de l'eau de la dalle.",
      outils: ["perforateur", "visseuse", "niveau"],
      faire: [`Dérouler la bande d'arase sur le tracé (${fr(rnd(perim, 2))} m), poser le profil en U dessus, **nu extérieur du rail sur le trait**.`, "Cheviller tous les 50 cm, et à 10 cm de chaque angle.", po ? `Interrompre le rail sur la largeur du cadre de la porte (${fz(po.largeur_cm + 2 * po.chambranle_cm)} cm, face ${face_porte.cle}).` : "", "Cordon de mastic continu entre le rail et la dalle, côté extérieur."].filter(Boolean),
      controler: ["Rail de niveau : caler si la dalle a plus de 5 mm de faux niveau sur un mur.", "Angles du rail conformes au tracé avant de cheviller le dernier mur."],
    },
    {
      titre: "Préparer toutes les coupes à plat", but: "Un panneau se coupe bien sur tréteaux, mal une fois debout.",
      outils: ["scie circulaire lame métal", "rail de guidage", "scie sauteuse"],
      faire: [
        `Bandes de mur : ${m.faces.map((f: any) => bande(f)).filter(Boolean).map((x: any) => `${x.id} ${fz(x.largeur_cm)} cm`).join(", ") || "aucune"}. Couper dans la longueur, face laquée vers le bas, et garder les chutes : elles fournissent les autres bandes.`,
        `Fenêtres : ${fen.map((f: any) => `${fz(f.largeur_cm)} × ${fz(f.hauteur_cm)} cm, bas à ${fz(f.allege_cm)} cm`).join(" ; ")}, une par panneau, jamais sur un joint. Percer les quatre angles, puis couper à la scie sauteuse.`,
        `Toit : ${m.toit.panneaux.filter((x: any) => x.biais).map((x: any) => x.id).join(", ") || "aucun panneau"} à couper en biais d'après le plan de toiture.`,
        `Rehausse : ${m.rehausse.pieces.map((r: any) => `${r.id} (mur ${r.face}, ${fr(r.L)} cm, ${fr(r.h0)} → ${fr(r.h1)} cm)`).join(", ")}, tirées de ${m.rehausse.nb_madriers} madrier(s) selon le plan de débit.`,
      ],
      controler: ["Retirer le film de protection des panneaux au fur et à mesure : après quelques semaines au soleil il ne part plus.", "Ébavurer chaque coupe et passer une retouche de peinture sur la tôle mise à nu."],
    },
    {
      titre: `Monter le mur gauche à plat, puis le lever`, but: `À ${fz(gauche)} cm du ${limite} aucune visseuse ne passe : ce mur se fait au sol.`,
      outils: ["visseuse", "serre-joints", "2 personnes", "étais"],
      faire: [`Assembler ${F.G ? liste(F.G) : ""} à plat, butyle dans chaque joint, et visser dessus leur pièce de rehausse.`, F.G && bande(F.G) ? `Placer la bande de ${fz(bande(F.G).largeur_cm)} cm côté façade, la seule extrémité qu'on atteindra ensuite.` : "", "Lever le mur à deux, l'engager dans le rail, le tenir par deux étais vissés dans la rehausse.", "Visser le pied dans le rail depuis l'intérieur."].filter(Boolean),
      controler: ["Aplomb dans les deux sens avant de lâcher les étais.", `Vide de ${fz(gauche)} cm régulier sur toute la longueur.`],
    },
    {
      titre: "Monter les autres murs", but: "On tourne dans un seul sens pour que chaque panneau s'emboîte dans le précédent.",
      outils: ["visseuse", "niveau", "étais"],
      faire: [
        ...m.faces.filter((f: any) => f.cle !== "G").reverse().map((f: any) => `Mur ${f.cle} (${f.cle === "A" ? "façade" : f.nom}, ${fr(f.longueur_cm)} cm) : ${liste(f)}${f === face_porte ? ", en laissant le vide du cadre de porte" : ""}.`),
        "Butyle dans chaque emboîtement, panneau serré contre le précédent, vissé au pied dans le rail.",
        "Étayer chaque mur tant que la rehausse n'est pas posée : avant elle, rien ne tient les têtes.",
      ],
      controler: ["Aplomb de chaque panneau avant de visser le suivant : l'erreur se cumule.", `Têtes de murs toutes à ${fz(m.hauteur_mur_cm)} cm, à 3 mm près, au niveau laser.`],
    },
    {
      titre: "Fermer les angles", but: "Les profils d'angle lient deux murs et ferment la mousse.",
      outils: ["visseuse", "mastic"],
      faire: [`Profil extérieur puis intérieur à chacun des ${n} angles, vissé tous les 30 cm (vis de couture), mastic sous les deux ailes.`, speciaux.length ? `Les angles de ${speciaux.join(" et ")} reçoivent les profils pliés sur mesure : les présenter à blanc avant de percer.` : "", "Bourrer le vide de l'angle à la mousse avant de fermer le profil intérieur."].filter(Boolean),
      controler: ["Aucun jour entre profil et panneau : c'est là que l'air et l'eau entrent."],
    },
    {
      titre: "Poser la rehausse bois", but: "Elle donne la pente au toit et sert de lisse haute : c'est elle qui tient les murs entre eux.",
      outils: ["visseuse", "serre-joints"],
      faire: [`Poser ${m.rehausse.pieces.map((r: any) => `${r.id} sur ${r.face}`).join(", ")}, sur un cordon de butyle en tête de panneaux.`, "Visser la rehausse dans la tôle des deux faces de chaque panneau, tous les 40 cm.", "Assembler les pièces entre elles aux angles par deux longues vis en biais."],
      controler: [`Hauteurs finies des coins : ${m.hauteurs_coins_cm.map((h: number) => fr(h)).join(" · ")} cm (dans l'ordre des coins, à partir du coin avant gauche).`, "Dessus de la rehausse dans un même plan : poser une règle d'un mur à l'autre."],
    },
    ...(t.panne_intermediaire ? [{
      titre: "Poser la panne intermédiaire", but: `Le toit porte sur ${fz(m.portee_cm / 100)} m : une panne en travers ramène la portée à ${fz(m.portee_cm / 200)} m.`,
      outils: ["visseuse", "niveau"],
      faire: [`Poser un bois de 75 × 150 de ${fz(m.faces[0].longueur_cm)} cm en travers, à mi-profondeur, du mur gauche au mur droit, porté par deux sabots ou deux tasseaux vissés dans la rehausse.`, "Régler son dessus dans le plan du toit : il est plus bas que la rehausse de façade et plus haut que celle du fond."],
      controler: ["Une règle posée de la façade au fond touche la panne sans la forcer."],
    } as EtapeGuide] : []),
    {
      titre: "Couvrir", but: `Nervures dans le sens de la pente, vers ${vers} : l'eau ne quitte le toit que par le bas des panneaux.`,
      outils: ["visseuse", "2 personnes", "échelle"],
      faire: [
        `Poser ${m.toit.panneaux.map((x: any) => `${x.id} (${fz(x.largeur_cm)} × ${fz(x.longueur_cm)} cm)`).join(", ")}, en commençant du côté opposé aux vents dominants.`,
        "Closoirs mousse sous les nervures, en haut et en bas, avant de visser.",
        `Visser dans la rehausse${t.panne_intermediaire ? " et dans la panne" : ""} par le sommet des nervures, vis longues à rondelle, quatre par panneau et par appui. Serrer jusqu'à écraser la rondelle, pas plus.`,
        "Recouvrements entre panneaux : butyle, puis vis de couture tous les 40 cm.",
        "Bandes de rive sur les bords parallèles à la pente, bavette de tête sur le bord haut.",
      ],
      controler: [`Débords : ${fz(m.toit.debord_cm.avant)} cm devant, ${fz(m.toit.debord_cm.arriere)} cm au fond, ${fz(m.toit.debord_cm.droite)} cm à droite, ${fz(m.toit.debord_cm.gauche)} cm à gauche.`, "Ne jamais marcher entre deux appuis : marcher au droit des murs, sur une planche."],
    },
    {
      titre: "Gouttière et descente", but: "Recueillir toute l'eau du toit et l'emmener au jardin.",
      outils: ["visseuse", "niveau", "scie à métaux"],
      faire: [`${fr(G.longueur_cm)} cm de gouttière en ${G.troncons.length} tronçon(s) : ${G.troncons.map((x: any) => `${x.face} ${fr(x.longueur_cm)} cm`).join(" + ")}.`, "Crochets tous les 50 cm, pente de 5 mm par mètre vers la descente.", t.descente === "droite" && m.sens !== "droite" ? "Descente au bout droit de la gouttière, puis un tuyau au sol le long du mur droit jusqu'au jardin : rien ne doit s'écouler au pied du mur de propriété." : "Descente au point bas, évacuée loin de la dalle."],
      controler: ["Verser un seau d'eau en haut du toit : tout doit arriver à la descente."],
    },
    ...(po ? [{
      titre: "Poser la porte", but: po.chambranle_cm > 0 ? "Le cadre bois reprend la porte : le panneau seul ne porte pas de paumelles." : "Le dormant du bloc-porte porte le battant : il se fixe au rail, à la rehausse et à la tôle des panneaux, jamais dans la mousse.",
      outils: ["visseuse", "niveau", "cales"],
      faire: po.chambranle_cm > 0 ? [`Monter le cadre bois de ${fz(po.largeur_cm + 2 * po.chambranle_cm)} × ${fz(po.hauteur_cm + po.chambranle_cm)} cm dans le vide du mur ${face_porte.cle}, vissé dans la dalle en pied et dans la rehausse en tête.`, `Poser la porte ${po.vitree === false ? "pleine" : "vitrée"} de ${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} cm dans le cadre, ferrée côté fond, ouvrant vers l'extérieur.`, "Bande comprimée entre dormant et cadre, mastic à l'extérieur, seuil sur cordon de mastic."] : [`Habiller la tranche des panneaux autour du vide (${fz(po.largeur_cm)} × ${fz(po.hauteur_cm)} cm, mur ${face_porte.cle}) d'un profil en U.`, `Poser le bloc-porte ${po.vitree === false ? "plein" : "vitré"} de service, dormant compris, calé d'aplomb, ferré côté fond, ouvrant vers l'extérieur : vissé dans le rail en pied, dans la rehausse en tête, et dans la tôle des panneaux par le profil en U.`, "Bande comprimée entre dormant et profil, mastic à l'extérieur, seuil sur cordon de mastic."],
      controler: ["Jeu régulier de 3 mm autour du battant, la porte se ferme sans forcer.", "Arrêt de porte à prévoir : ouverte, elle prend le vent."],
    } as EtapeGuide] : []),
    {
      titre: "Poser les fenêtres", but: "Une fenêtre se fixe dans la tôle des deux faces, jamais dans la mousse.",
      outils: ["visseuse", "niveau", "cales"],
      faire: [`${fen.length} fenêtre(s) en façade : ${fen.map((f: any) => `${f.ouvrant ? "oscillo-battante" : "fixe"} de ${fz(f.debut_cm)} à ${fz(f.debut_cm + f.largeur_cm)} cm`).join(" ; ")}.`, "Habiller la tranche de la découpe d'un profil en U ou d'un tasseau, caler la fenêtre, visser par le dormant.", "Bande comprimée au pourtour, mastic dehors, bavette d'appui sous la fenêtre."],
      controler: ["Niveau et aplomb du dormant avant le serrage final.", "L'ouvrante s'ouvre sans toucher le bureau."],
    },
    {
      titre: "Étanchéité générale", but: "L'air qui entre apporte l'humidité qui condense sur l'acier.",
      outils: ["pistolet à mastic", "mousse"],
      faire: ["Cordon de mastic au pied des murs, dedans et dehors.", `Fermer le vide de ${fz(gauche)} cm contre le ${limite} : bavette devant, grillage fin au fond (feuilles, rongeurs), sans bloquer l'écoulement de l'eau.`, "Mousse puis mastic à chaque traversée (câble, entrée d'air)."],
      controler: ["De nuit, une lampe allumée dedans : aucun jour visible de dehors."],
    },
    ...(p.amenagement && p.amenagement.plancher && p.amenagement.plancher.actif ? [{
      titre: "Plancher isolé", but: "La dalle est froide : le plancher fait le confort des pieds.",
      outils: ["scie", "visseuse"],
      faire: ["Film polyéthylène sur la dalle, remonté de 10 cm le long des murs.", "Lambourdes tous les 40 cm, calées de niveau, isolant rigide de 40 mm entre elles.", "Dalles OSB de 18 mm vissées, joints décalés, 8 mm de jeu contre les murs ; revêtement de sol ensuite."],
      controler: [`Hauteur sous plafond après plancher : ${fr(rnd((Math.max(...m.hauteurs_coins_cm) - +p.amenagement.plancher.epaisseur_cm) / 100, 2))} m au plus haut, ${fr(rnd((Math.min(...m.hauteurs_coins_cm) - +p.amenagement.plancher.epaisseur_cm) / 100, 2))} m au plus bas.`],
    } as EtapeGuide] : []),
    {
      titre: "Ventilation, électricité, aménagement", but: "Une pièce étanche et chauffée sans ventilation condense.",
      outils: ["scie cloche", "visseuse"],
      faire: ["Deux entrées d'air sur deux murs opposés, une basse et une haute.", "Électricité en apparent, sous goulotte, depuis le câble existant : on ne perce pas la tôle extérieure pour un câble.", `Bureaux sur pieds ou sur équerres au sol : ${(v.bureaux || []).map((b: any) => `${fz(b.profondeur_cm)} × ${fr(b.longueur_cm)} cm ${b.cote === "avant" ? "en façade" : "à " + b.cote}`).join(", ")}. Les parements de 0,5 mm ne portent pas une charge suspendue.`],
      controler: ["Après une semaine chauffée : aucune trace de condensation aux angles ni autour des fenêtres."],
    },
  ];
  return { avant: avantTout, outillage, etapes };
}
