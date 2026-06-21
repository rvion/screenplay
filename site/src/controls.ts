// Panneau de controles interactifs. Mute l'objet `params` (par reference) puis
// appelle onChange() -> main.ts recalcule tout (KPIs, debit, plans, budget, 3D).
import type { Params } from "./compute";

const FACES: [string, string][] = [["A", "A · avant"], ["D", "D · droite"], ["C", "C · coupe"], ["B", "B · arrière"], ["G", "G · gauche"]];
const POSITIONS: [string, string][] = [["gauche", "gauche"], ["centre", "centre"], ["droite", "droite"]];
const TYPES: [string, string][] = [["porte", "porte"], ["fenetre", "fenêtre"]];

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

  function selectStruct(obj: any, key: string, options: [string, string][]): HTMLSelectElement {
    const sel = h("select", {
      onchange: () => { obj[key] = sel.value; renderOpenings(); onChange(); },
    }, options.map(([v, l]) => {
      const o = h("option", { value: v }, [l]) as HTMLOptionElement;
      if (String(obj[key]) === v) o.selected = true;
      return o;
    })) as HTMLSelectElement;
    return sel;
  }

  function onum(o: any, key: string, label: string): HTMLElement {
    const input = h("input", { type: "number", step: 1, value: o[key] ?? 0, style: "width:4.5em" }) as HTMLInputElement;
    input.addEventListener("input", () => { o[key] = input.value === "" ? 0 : Number(input.value); onChange(); });
    return h("label", { class: "ctl-inline" }, [label, input]);
  }

  let openingsBody: HTMLElement;
  function renderOpenings() {
    openingsBody.innerHTML = "";
    const list = params.ouvertures || (params.ouvertures = []);
    list.forEach((o: any, i: number) => {
      const row = h("div", { class: "opening-row" }, [
        selectStruct(o, "type", TYPES),
        selectStruct(o, "face", FACES),
        onum(o, "largeur_cm", "l"),
        onum(o, "hauteur_cm", "h"),
        onum(o, "allege_cm", "all."),
        selectStruct(o, "position", POSITIONS),
        h("button", { class: "btn-mini", title: "Supprimer", onclick: () => { list.splice(i, 1); renderOpenings(); onChange(); } }, ["✕"]),
      ]);
      openingsBody.append(row);
    });
    const add = h("button", { class: "btn btn-ghost btn-add", onclick: () => {
      list.push({ type: "fenetre", face: "G", largeur_cm: 80, hauteur_cm: 80, allege_cm: 100, position: "centre" });
      renderOpenings(); onChange();
    } }, ["+ Ajouter une ouverture"]);
    openingsBody.append(add);
  }

  function priceControls(): HTMLElement[] {
    const pr = params.prix_indicatifs_eur || {};
    return Object.keys(pr).filter((k) => !k.startsWith("_") && typeof pr[k] === "number")
      .map((k) => num(k.replace(/_/g, " "), pr, k, 1, "5.5em"));
  }

  function renderPanel() {
    container.innerHTML = "";
    const e = params.emprise_cm;
    openingsBody = h("div", { class: "openings" });
    renderOpenings();

    container.append(
      group("Dimensions au sol (cm)", [
        slider("Gauche (G)", e, "gauche_G", 100, 400),
        slider("Avant (A)", e, "avant_A", 100, 400),
        slider("Droite → coupe (D)", e, "droite_D_jusqu_coupe", 80, 360),
        slider("Arrière → coupe (B)", e, "arriere_B_jusqu_coupe", 80, 360),
      ]),
      group("Toit & murs", [
        slider("Hauteur avant (égout)", params.murs, "hauteur_avant_cm", 200, 320),
        slider("Pente — chute", params.toit, "pente_chute_cm", 5, 60),
        h("div", { class: "ctl-row" }, [
          h("span", { class: "ctl-lbl ctl-lbl-wide" }, ["Débords (cm)"]),
          onum(params.toit.debord_cm, "avant", "av."), onum(params.toit.debord_cm, "arriere", "arr."),
          onum(params.toit.debord_cm, "gauche", "g."), onum(params.toit.debord_cm, "droite", "d."),
          onum(params.toit.debord_cm, "coupe", "coupe"),
        ]),
      ]),
      group("Panneaux", [
        select("Épaisseur (mm)", params.panneau, "epaisseur_mm", [["40", "40"], ["60", "60"], ["80", "80"], ["100", "100"]]),
        slider("Largeur utile", params.panneau, "largeur_utile_cm", 80, 120),
        slider("Chute / pertes", params.divers, "facteur_chute_pct", 0, 30, 1, "%"),
      ]),
      group("Ouvertures (porte + fenêtres)", [openingsBody]),
      group("Prix indicatifs (€)", priceControls(), false),
    );
  }

  renderPanel();
  return { refresh: renderPanel };
}
