#!/usr/bin/env python3
"""Generateur parametrique de l'abri de jardin.

Lit params.json (source unique de verite) et produit :
  - site/data.js        : donnees calculees (geometrie 3D + tableaux) pour le site
  - site/data/derived.json : memes donnees, en JSON, pour reference / outils
  - site/assets/*.svg   : plan de sol, plan de toiture, facades cotees

Aucune dependance externe (stdlib uniquement). Lancer :  python3 scripts/generate.py
"""
from __future__ import annotations

import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARAMS = os.path.join(ROOT, "params.json")
SITE = os.path.join(ROOT, "site")
ASSETS = os.path.join(SITE, "assets")
DATADIR = os.path.join(SITE, "data")


def load_params() -> dict:
    with open(PARAMS, encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------------------- #
# Geometrie                                                                    #
# --------------------------------------------------------------------------- #
def geometry(p: dict) -> dict:
    e = p["emprise_cm"]
    G = float(e["gauche_G"])
    A = float(e["avant_A"])
    D = float(e["droite_D_jusqu_coupe"])
    B = float(e["arriere_B_jusqu_coupe"])

    # Repere : x vers la droite, y vers l'arriere. Origine = coin avant-gauche.
    FL = (0.0, 0.0)          # avant-gauche (Front-Left)
    FR = (A, 0.0)            # avant-droite : face Avant A le long de x
    Dend = (A, D)            # fin de la face Droite (depuis l'avant, le long de y)
    Bend = (B, G)            # fin de la face Arriere (depuis la gauche, le long de x)
    BL = (0.0, G)            # arriere-gauche : face Gauche G le long de y

    # Ordre antihoraire du pentagone
    verts = [FL, FR, Dend, Bend, BL]
    names = ["avant-gauche", "avant-droite", "fin-droite (coupe)",
             "fin-arriere (coupe)", "arriere-gauche"]

    def dist(p1, p2):
        return math.hypot(p2[0] - p1[0], p2[1] - p1[1])

    C = dist(Dend, Bend)  # longueur de la face coupee

    # Aire (formule du lacet)
    s = 0.0
    n = len(verts)
    for i in range(n):
        x1, y1 = verts[i]
        x2, y2 = verts[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    area_cm2 = abs(s) / 2.0

    # Toit mono-pente : la hauteur decroit lineairement avec y (avant haut, arriere bas)
    drop = float(p["toit"]["pente_chute_cm"])
    run = G  # plus grande profondeur avant->arriere
    Hf = float(p["murs"]["hauteur_avant_cm"])

    def h_at(y):
        return Hf - drop * (y / run)

    slope_pct = 100.0 * drop / run
    slope_deg = math.degrees(math.atan2(drop, run))

    vert_heights = [round(h_at(v[1]), 1) for v in verts]

    # Faces : (cle, libelle, sommet_debut, sommet_fin)
    faces = [
        ("A", "Avant",  FL,  FR),
        ("D", "Droite", FR,  Dend),
        ("C", "Coupe",  Dend, Bend),
        ("B", "Arriere", Bend, BL),
        ("G", "Gauche", BL,  FL),
    ]
    face_data = []
    for key, label, p1, p2 in faces:
        length = dist(p1, p2)
        h1 = h_at(p1[1])
        h2 = h_at(p2[1])
        face_data.append({
            "cle": key,
            "libelle": label,
            "longueur_cm": round(length, 1),
            "hauteur_debut_cm": round(h1, 1),
            "hauteur_fin_cm": round(h2, 1),
            "hauteur_max_cm": round(max(h1, h2), 1),
            "rake": abs(h1 - h2) > 0.1,
        })

    return {
        "verts": [[round(x, 1), round(y, 1)] for x, y in verts],
        "vert_names": names,
        "vert_heights_cm": vert_heights,
        "cotes": {"G": G, "A": A, "D": D, "B": B, "C": round(C, 1)},
        "aire_m2": round(area_cm2 / 1e4, 2),
        "perimetre_cm": round(sum(f["longueur_cm"] for f in face_data), 1),
        "pente": {
            "chute_cm": drop, "run_cm": run,
            "pourcent": round(slope_pct, 1), "degres": round(slope_deg, 2),
        },
        "hauteur_avant_cm": Hf,
        "hauteur_arriere_cm": round(Hf - drop, 1),
        "faces": face_data,
    }


# --------------------------------------------------------------------------- #
# Debit panneaux + quantites                                                   #
# --------------------------------------------------------------------------- #
def takeoff(p: dict, g: dict) -> dict:
    cover = float(p["panneau"]["largeur_utile_cm"])
    waste = 1.0 + float(p["divers"]["facteur_chute_pct"]) / 100.0
    door = p["porte"]
    door_area = (door["largeur_cm"] * door["hauteur_cm"]) / 1e4

    rows = []
    gross = 0.0
    net = 0.0
    for f in g["faces"]:
        L = f["longueur_cm"]
        n = math.ceil(L / cover)
        hmax = f["hauteur_max_cm"]
        g_area = n * (cover / 100.0) * (hmax / 100.0)
        avg_h = (f["hauteur_debut_cm"] + f["hauteur_fin_cm"]) / 2.0
        n_area = (L / 100.0) * (avg_h / 100.0)
        if f["cle"] == door["face"]:
            n_area -= door_area
        gross += g_area
        net += n_area
        rows.append({
            "face": f["cle"], "libelle": f["libelle"],
            "longueur_cm": L, "hauteur_cm": hmax,
            "nb_panneaux": n,
            "aire_brute_m2": round(g_area, 2),
            "rake": f["rake"],
        })

    # Toiture : panneaux dans le sens de la pente (avant->arriere)
    deb = p["toit"]["debord_cm"]
    run_len = g["pente"]["run_cm"] + deb["avant"] + deb["arriere"]
    width_x = g["cotes"]["A"] + deb["gauche"] + deb["droite"]
    n_roof = math.ceil(width_x / cover)
    roof_gross = n_roof * (cover / 100.0) * (run_len / 100.0)
    # Aire reelle de couverture ~ aire plan + perimetre*debord moyen
    avg_overhang = sum(deb.values()) / len(deb) / 100.0
    roof_real = g["aire_m2"] + (g["perimetre_cm"] / 100.0) * avg_overhang

    return {
        "murs": {
            "lignes": rows,
            "aire_brute_m2": round(gross, 2),
            "aire_nette_m2": round(net, 2),
            "porte_deduite_m2": round(door_area, 2),
            "total_panneaux": sum(r["nb_panneaux"] for r in rows),
        },
        "toit": {
            "nb_panneaux": n_roof,
            "longueur_panneau_cm": round(run_len, 1),
            "aire_brute_m2": round(roof_gross, 2),
            "aire_couverte_m2": round(roof_real, 2),
        },
        "commande_panneaux_m2": round((gross + roof_gross) * waste, 1),
        "facteur_chute_pct": p["divers"]["facteur_chute_pct"],
    }


def shopping(p: dict, g: dict, t: dict) -> list:
    perim = g["perimetre_cm"] / 100.0
    n_corners = len(g["faces"])
    corner_h = max(g["hauteur_avant_cm"], 2.4)
    # bas de pente = ou l'eau sort : arriere B + coupe C
    gutter_len = (g["cotes"]["B"] + g["cotes"]["C"]) / 100.0
    anchors = math.ceil(perim / 0.5)
    screws = math.ceil((t["murs"]["aire_brute_m2"] + t["toit"]["aire_brute_m2"]) * 6)
    return [
        {"poste": "Panneaux sandwich 60 mm (murs)", "qte": f"{t['murs']['aire_brute_m2']} m2 brut (net ~{t['murs']['aire_nette_m2']} m2)",
         "note": "Ame PIR. Commander a longueur. Parement laque 2 faces."},
        {"poste": "Panneaux sandwich 60 mm (toiture)", "qte": f"{t['toit']['nb_panneaux']} panneaux de ~{t['toit']['longueur_panneau_cm']/100:.2f} m ({t['toit']['aire_brute_m2']} m2 brut)",
         "note": "Profil toiture (nervures) pose dans le sens de la pente, joints longitudinaux a recouvrement."},
        {"poste": "Rail / lambourde de pied", "qte": f"~{math.ceil(perim)+1} m",
         "note": "U galvanise OU bois traite classe 4, sur bande EPDM. Sureleve les panneaux de la dalle."},
        {"poste": "Profils d'angle exterieurs", "qte": f"{n_corners} angles x {corner_h:.1f} m = ~{math.ceil(n_corners*corner_h)} m",
         "note": "L'angle C n'est pas a 90 deg : prevoir profil pliable ou sur-mesure."},
        {"poste": "Profils d'angle / finition interieurs", "qte": f"~{math.ceil(n_corners*corner_h)} m", "note": "Couvre-joints d'angle interieurs."},
        {"poste": "Bavette d'egout haut (avant)", "qte": f"~{math.ceil(g['cotes']['A']/100)+1} m", "note": "Larmier en haut de la face avant."},
        {"poste": "Bavettes de rive (gauche/droite/coupe)", "qte": f"~{math.ceil((g['cotes']['G']+g['cotes']['D']+g['cotes']['C'])/100)+1} m", "note": "Rives laterales du toit, avec debord."},
        {"poste": "Gouttiere + 1 descente", "qte": f"~{math.ceil(gutter_len)+1} m + 1 descente",
         "note": "En bas de pente (faces B + C), descente au point bas (coin Bend)."},
        {"poste": "Vis autoperceuses tete EPDM", "qte": f"~{screws} (boite de {math.ceil(screws/100)*100})",
         "note": "Longueur = epaisseur panneau + structure. Rondelle d'etancheite obligatoire."},
        {"poste": "Chevilles / scellement dalle", "qte": f"~{anchors}", "note": "Fixation du rail de pied sur la dalle beton (tous les ~50 cm)."},
        {"poste": "Porte vitree alu double vitrage", "qte": f"1 ({p['porte']['largeur_cm']}x{p['porte']['hauteur_cm']} cm)",
         "note": "Ouverture vers l'exterieur. Cadre/dormant + seuil + joint."},
        {"poste": "Ventilation (VMC ou aerateurs hygro)", "qte": "1 kit",
         "note": "INDISPENSABLE en usage habitable chauffe : evite la condensation (voir vigilance)."},
        {"poste": "Bande comprimee / mousse precomprimee", "qte": f"~{math.ceil(perim)+ math.ceil((p['porte']['largeur_cm']*2+p['porte']['hauteur_cm']*2)/100)} m",
         "note": "Etancheite a l'air au pied et au pourtour de la porte."},
        {"poste": "Bande butyle (joints de panneaux)", "qte": f"~{math.ceil(perim*2)} m", "note": "Joints longitudinaux et perimetriques."},
        {"poste": "Mastic PU + primaire anticorrosion", "qte": "~5 cartouches + 1 primaire", "note": "Cachetage et protection des chants coupes (anticorrosion)."},
        {"poste": "Peinture de retouche (RAL parement)", "qte": "1 aerosol", "note": "Retouche des rayures et chants."},
    ]


# --------------------------------------------------------------------------- #
# SVG                                                                          #
# --------------------------------------------------------------------------- #
def _svg_header(w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'font-family="system-ui,sans-serif" font-size="13">\n'
            f'<rect width="{w}" height="{h}" fill="#fbfbf8"/>\n')


def _line(x1, y1, x2, y2, stroke="#333", w=1, dash=""):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{w}"{d}/>\n'


def _text(x, y, s, anchor="middle", fill="#222", size=13, weight="normal"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" fill="{fill}" '
            f'font-size="{size}" font-weight="{weight}">{s}</text>\n')


def plan_sol_svg(p, g):
    pad, scale = 70, 0.42  # px par cm
    xs = [v[0] for v in g["verts"]]
    ys = [v[1] for v in g["verts"]]
    W = (max(xs) - min(xs)) * scale + 2 * pad
    H = (max(ys) - min(ys)) * scale + 2 * pad

    def P(v):  # cm -> px, y vers le bas (avant en bas)
        return (pad + (v[0] - min(xs)) * scale, H - pad - (v[1] - min(ys)) * scale)

    svg = _svg_header(round(W), round(H))
    pts = " ".join(f"{P(v)[0]:.1f},{P(v)[1]:.1f}" for v in g["verts"])
    svg += f'<polygon points="{pts}" fill="#dce8f5" stroke="#2b5d8a" stroke-width="2"/>\n'

    labels = ["A", "D", "C", "B", "G"]
    cot = g["cotes"]
    valmap = {"A": cot["A"], "D": cot["D"], "C": cot["C"], "B": cot["B"], "G": cot["G"]}
    n = len(g["verts"])
    for i in range(n):
        a = g["verts"][i]
        b = g["verts"][(i + 1) % n]
        ax, ay = P(a)
        bx, by = P(b)
        mx, my = (ax + bx) / 2, (ay + by) / 2
        lab = labels[i]
        svg += _text(mx, my - 6, f"{lab} = {valmap[lab]:.0f} cm", size=14, weight="bold", fill="#2b5d8a")

    # Porte sur la face A (en bas), centree
    A0 = P(g["verts"][0]); A1 = P(g["verts"][1])
    dw = p["porte"]["largeur_cm"] * scale
    cx = (A0[0] + A1[0]) / 2
    svg += _line(cx - dw / 2, A0[1], cx + dw / 2, A0[1], stroke="#c0392b", w=5)
    svg += f'<path d="M {cx-dw/2:.1f} {A0[1]:.1f} A {dw:.1f} {dw:.1f} 0 0 0 {cx-dw/2:.1f} {A0[1]+dw:.1f}" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>\n'
    svg += _text(cx, A0[1] + 22, f"Porte {p['porte']['largeur_cm']} cm (ouvre dehors)", fill="#c0392b", size=12)

    svg += _text(W / 2, 28, f"Plan de sol - aire {g['aire_m2']} m2 - pente vers l'arriere (B)", size=15, weight="bold")
    svg += _text(W / 2, H - 16, "AVANT (face A)", size=12, fill="#666")
    svg += "</svg>\n"
    return svg


def plan_toit_svg(p, g):
    pad, scale = 70, 0.42
    deb = p["toit"]["debord_cm"]
    xs = [v[0] for v in g["verts"]]
    ys = [v[1] for v in g["verts"]]
    minx, maxx = min(xs) - deb["gauche"], max(xs) + deb["droite"]
    miny, maxy = min(ys) - deb["avant"], max(ys) + deb["arriere"]
    W = (maxx - minx) * scale + 2 * pad
    H = (maxy - miny) * scale + 2 * pad

    def P(x, y):
        return (pad + (x - minx) * scale, H - pad - (y - miny) * scale)

    svg = _svg_header(round(W), round(H))
    # contour toit = emprise dilatee (approx : bbox dilatee + coupe)
    outline = [
        (minx, miny), (maxx, miny),
        (maxx, g["verts"][2][1] + deb["droite"]),
        (g["verts"][3][0] + deb["coupe"], maxy),
        (minx, maxy),
    ]
    pts = " ".join(f"{P(x,y)[0]:.1f},{P(x,y)[1]:.1f}" for x, y in outline)
    svg += f'<polygon points="{pts}" fill="#e8eee2" stroke="#6b8e23" stroke-width="2"/>\n'
    # emprise murs (pointilles)
    wpts = " ".join(f"{P(v[0],v[1])[0]:.1f},{P(v[0],v[1])[1]:.1f}" for v in g["verts"])
    svg += f'<polygon points="{wpts}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="6 4"/>\n'
    # fleches de pente (avant -> arriere = bas vers haut en y)
    for fx in (0.3, 0.6):
        x = minx + (maxx - minx) * fx
        y0 = P(x, miny + 20); y1 = P(x, maxy - 20)
        svg += _line(y0[0], y0[1], y1[0], y1[1], stroke="#2b7", w=2)
        svg += f'<polygon points="{y1[0]:.0f},{y1[1]:.0f} {y1[0]-5:.0f},{y1[1]+9:.0f} {y1[0]+5:.0f},{y1[1]+9:.0f}" fill="#2b7"/>\n'
    svg += _text(W / 2, 28, f"Plan de toiture - pente {g['pente']['pourcent']}% ({g['pente']['degres']} deg) vers l'arriere", size=15, weight="bold")
    svg += _text(W / 2, H - 16, "ecoulement de l'eau ->", size=12, fill="#2b7")
    svg += "</svg>\n"
    return svg


def facade_svg(p, g, face):
    pad, scale = 60, 0.6
    L = face["longueur_cm"]
    h1, h2 = face["hauteur_debut_cm"], face["hauteur_fin_cm"]
    W = L * scale + 2 * pad
    H = max(h1, h2) * scale + 2 * pad

    def P(x, h):  # x le long du mur, h hauteur
        return (pad + x * scale, H - pad - h * scale)

    svg = _svg_header(round(W), round(H))
    poly = [P(0, 0), P(L, 0), P(L, h2), P(0, h1)]
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in poly)
    svg += f'<polygon points="{pts}" fill="#eef2f6" stroke="#2b5d8a" stroke-width="2"/>\n'

    # Porte si face concernee
    if face["cle"] == p["porte"]["face"]:
        dw = p["porte"]["largeur_cm"] * scale
        dh = p["porte"]["hauteur_cm"] * scale
        cx = pad + (L * scale) / 2
        bx, by = cx - dw / 2, H - pad
        svg += f'<rect x="{bx:.1f}" y="{by-dh:.1f}" width="{dw:.1f}" height="{dh:.1f}" fill="#bfe3ef" stroke="#1b6" stroke-width="2"/>\n'
        svg += _line(bx, by - dh / 2, bx - 16, by - dh / 2, stroke="#1b6", w=1, dash="3 3")
        svg += _text(cx, by - dh / 2, "porte vitree", fill="#178", size=11)

    # cotes
    svg += _text(pad + L * scale / 2, H - pad + 26, f"{L:.0f} cm", size=13, weight="bold")
    svg += _text(pad - 8, P(0, h1)[1], f"{h1:.0f}", anchor="end", size=12, fill="#2b5d8a")
    svg += _text(pad + L * scale + 8, P(L, h2)[1], f"{h2:.0f}", anchor="start", size=12, fill="#2b5d8a")
    svg += _text(W / 2, 26, f"Face {face['cle']} - {face['libelle']}", size=15, weight="bold")
    svg += "</svg>\n"
    return svg


# --------------------------------------------------------------------------- #
# Modele 3D (donnees pour Three.js)                                            #
# --------------------------------------------------------------------------- #
def model3d(p, g):
    # en metres, y = profondeur, z = hauteur
    verts_m = [[v[0] / 100.0, v[1] / 100.0] for v in g["verts"]]
    heights_m = [h / 100.0 for h in g["vert_heights_cm"]]
    return {
        "footprint": verts_m,
        "heights": heights_m,
        "thickness_m": p["panneau"]["epaisseur_mm"] / 1000.0,
        "door": {
            "face_index": 0,  # face A = arete verts[0]-verts[1]
            "width_m": p["porte"]["largeur_cm"] / 100.0,
            "height_m": p["porte"]["hauteur_cm"] / 100.0,
        },
    }


# --------------------------------------------------------------------------- #
def main():
    p = load_params()
    g = geometry(p)
    t = takeoff(p, g)
    sh = shopping(p, g, t)
    m = model3d(p, g)

    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(DATADIR, exist_ok=True)

    # SVG
    files = {
        "plan-sol.svg": plan_sol_svg(p, g),
        "plan-toit.svg": plan_toit_svg(p, g),
    }
    for f in g["faces"]:
        files[f"facade-{f['cle']}.svg"] = facade_svg(p, g, f)
    for name, content in files.items():
        with open(os.path.join(ASSETS, name), "w", encoding="utf-8") as fh:
            fh.write(content)

    derived = {
        "projet": p["projet"],
        "geometrie": g,
        "debit": t,
        "achats": sh,
        "porte": p["porte"],
        "panneau": p["panneau"],
        "model3d": m,
        "svg": list(files.keys()),
    }
    with open(os.path.join(DATADIR, "derived.json"), "w", encoding="utf-8") as fh:
        json.dump(derived, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(SITE, "data.js"), "w", encoding="utf-8") as fh:
        fh.write("// Genere par scripts/generate.py - NE PAS EDITER A LA MAIN\n")
        fh.write("window.SHED = ")
        json.dump(derived, fh, ensure_ascii=False, indent=2)
        fh.write(";\n")

    print(f"OK - aire {g['aire_m2']} m2, perimetre {g['perimetre_cm']} cm, "
          f"pente {g['pente']['pourcent']}% ({g['pente']['degres']} deg)")
    print(f"     face C (coupe) = {g['cotes']['C']} cm")
    print(f"     panneaux murs {t['murs']['aire_brute_m2']} m2 brut / {t['murs']['aire_nette_m2']} m2 net")
    print(f"     toiture {t['toit']['nb_panneaux']} panneaux, commande totale {t['commande_panneaux_m2']} m2")
    print(f"     {len(files)} SVG + data.js + derived.json ecrits dans site/")


if __name__ == "__main__":
    main()
