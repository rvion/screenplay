// Panneau de reglages, volontairement court : dimensions, toit, porte, fenetres, panneaux.
// Mute l'objet `params` (par reference) puis appelle onChange() -> main.ts
// recalcule tout (KPIs, debit, plans, budget, 3D). Prix repliés par defaut.
import { opening_start_cm, type Params } from "./compute";

const POSITIONS: [string, string][] = [["gauche", "à gauche"], ["centre", "centrée"], ["droite", "à droite"]];
const FACES: [string, string][] = [["A", "A · avant"], ["D", "D · droite"], ["B", "B · arrière"], ["G", "G · gauche"]];

function h(tag: string, attrs: Record<string, any> = {}, children: (Node | string)[] = []): HTMLElement {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of children) e.append(c);
  return e;
}

function group(title: string, nodes: HTMLElement[], open = true): HTMLElement {
  return h("details", { class: "ctl-group", ...(open ? { open: "" } : {}) }, [
    h("summary", {}, [title]), ...nodes,
  ]);
}

export interface Controls { refresh(): void; }

export function buildControls(container: HTMLElement, params: Params, onChange: () => void): Controls {
  function slider(label: string, obj: any, key: string, min: number, max: number, step = 1, unit = "cm"): HTMLElement {
    const out = h("span", { class: "ctl-val" }, [`${obj[key]} ${unit}`]);
    const input = h("input", { type: "range", min, max, step, value: obj[key] }) as HTMLInputElement;
    input.addEventListener("input", () => {
      obj[key] = Number(input.value);
      out.textContent = `${obj[key]} ${unit}`;
      onChange();
    });
    return h("label", { class: "ctl ctl-range" }, [h("span", { class: "ctl-lbl" }, [label, out]), input]);
  }

  function num(label: string, obj: any, key: string, step = 1, width = "5.5em"): HTMLElement {
    const input = h("input", { type: "number", step, value: obj[key], style: `width:${width}` }) as HTMLInputElement;
    input.addEventListener("input", () => { obj[key] = input.value === "" ? 0 : Number(input.value); onChange(); });
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), input]);
  }

  function select(label: string, obj: any, key: string, options: [string, string][]): HTMLElement {
    const sel = h("select", {
      onchange: () => { obj[key] = sel.value; onChange(); },
    }, options.map(([v, l]) => {
      const o = h("option", { value: v }, [l]) as HTMLOptionElement;
      if (String(obj[key]) === v) o.selected = true;
      return o;
    })) as HTMLSelectElement;
    return h("label", { class: "ctl ctl-num" }, [h("span", { class: "ctl-lbl" }, [label]), sel]);
  }

  function priceControls(): HTMLElement[] {
    const pr = params.prix_indicatifs_eur || {};
    return Object.keys(pr).filter((k) => !k.startsWith("_") && typeof pr[k] === "number")
      .map((k) => num(k.replace(/_/g, " "), pr, k, 1, "5.5em"));
  }

  function windowsGroup(): HTMLElement {
    const list: any[] = params.fenetres || (params.fenetres = []);
    const body = h("div", { class: "openings" });
    const rerender = () => { renderPanel(); onChange(); };
    list.forEach((w, i) => {
      const faceSel = h("select", { onchange: () => { w.face = faceSel.value; onChange(); } },
        FACES.map(([v, l]) => { const o = h("option", { value: v }, [l]) as HTMLOptionElement; if (w.face === v) o.selected = true; return o; })) as HTMLSelectElement;
      if (typeof w.position !== "number") { // "gauche|centre|droite" -> distance equivalente
        const faceLen = (w.face === "A" || w.face === "B") ? +params.emprise_cm.avant_A : +params.emprise_cm.gauche_G;
        w.position = Math.round(opening_start_cm(w, faceLen));
      }
      body.append(h("div", { class: "opening-card" }, [
        h("div", { class: "ctl-row" }, [h("b", {}, [`Fenêtre ${i + 1}`]), faceSel,
          h("button", { class: "btn-mini", title: "Supprimer", onclick: () => { list.splice(i, 1); rerender(); } }, ["✕"])]),
        slider("Largeur", w, "largeur_cm", 40, 140),
        slider("Hauteur", w, "hauteur_cm", 40, 140),
        slider("Allège (bas / sol)", w, "allege_cm", 60, 160),
        slider("Position depuis le début de la face", w, "position", 0, 400),
      ]));
    });
    body.append(h("button", { class: "btn btn-ghost btn-add", onclick: () => {
      list.push({ face: "D", largeur_cm: 80, hauteur_cm: 80, allege_cm: 110, position: 110 });
      rerender();
    } }, ["+ Ajouter une fenêtre"]));
    return body;
  }

  function renderPanel() {
    container.innerHTML = "";
    const e = params.emprise_cm;
    const deb = params.toit.debord_cm;
    container.append(
      group("Emprise & murs (cm)", [
        slider("Largeur — face avant (A)", e, "avant_A", 100, 400),
        slider("Profondeur — face gauche (G)", e, "gauche_G", 100, 400),
        slider("Hauteur des murs (arrière)", params.murs, "hauteur_cm", 180, 300),
      ]),
      group("Toit", [
        slider("Rehausse avant = chute", params.toit, "pente_chute_cm", 5, 60),
        h("div", { class: "ctl-row" }, [
          h("span", { class: "ctl-lbl ctl-lbl-wide" }, ["Débords (cm)"]),
          ...(["avant", "arriere", "gauche", "droite"] as const).map((k) => {
            const input = h("input", { type: "number", step: 1, value: deb[k] ?? 0, style: "width:4.5em" }) as HTMLInputElement;
            input.addEventListener("input", () => { deb[k] = input.value === "" ? 0 : Number(input.value); onChange(); });
            return h("label", { class: "ctl-inline" }, [k.replace("arriere", "arr."), input]);
          }),
        ]),
      ]),
      group("Porte", [
        slider("Largeur", params.porte, "largeur_cm", 60, 140),
        slider("Hauteur", params.porte, "hauteur_cm", 180, 230),
        select("Position sur la face avant", params.porte, "position", POSITIONS),
      ]),
      group("Fenêtres", [windowsGroup()], (params.fenetres || []).length > 0),
      group("Panneaux", [
        slider("Largeur utile", params.panneau, "largeur_utile_cm", 80, 120),
        slider("Chute / pertes", params.divers, "facteur_chute_pct", 0, 30, 1, "%"),
      ]),
      group("Prix indicatifs (€)", priceControls(), false),
    );
  }

  renderPanel();
  return { refresh: renderPanel };
}
