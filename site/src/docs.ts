// Pages HTML des documents markdown du depot, publiees sous site/docs/ avec un index.
// Cote Node seulement (marked) : jamais importe par main.ts, le bundle navigateur n'en depend pas.
import { Marked } from "marked";

export interface DocSource { chemin: string; md: string }      // chemin depuis la racine du depot : "abri-v2.md", "agent/04-geometrie.md"
export interface DocPage { chemin: string; sortie: string; titre: string; resume: string; html: string }

const posix = (segs: string[]) => { const out: string[] = []; for (const s of segs) { if (s === "" || s === ".") continue; if (s === "..") out.pop(); else out.push(s); } return out.join("/"); };
const dossier = (chemin: string) => chemin.split("/").slice(0, -1);
const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// README.md -> readme.html, agent/04-geometrie.md -> agent/04-geometrie.html
export function sortie_de(chemin: string): string {
  return chemin.replace(/\.md$/i, ".html").split("/").map((s, i, a) => (i === a.length - 1 ? s.toLowerCase() : s)).join("/");
}

// un .md est publie s'il est suivi par git (ou vient d'etre genere), hors fichiers d'agent a la racine
export function est_publie(chemin: string): boolean {
  if (!/\.md$/i.test(chemin)) return false;
  const segs = chemin.split("/");
  if (segs.some((s) => s.startsWith(".")) || segs[0] === "node_modules" || segs[0] === "site") return false;
  return !/^(CLAUDE(\..*)?|STATUS(\..*)?)\.md$/i.test(segs[segs.length - 1]);
}

// ancre facon GitHub, pour que les liens #option-1 des documents marchent aussi sur le site
export function ancre(texte: string): string {
  return texte.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");
}

function vers(depuis: string, cible: string): string {
  const a = dossier(depuis), b = cible.split("/");
  let k = 0;
  while (k < a.length && k < b.length - 1 && a[k] === b[k]) k++;
  return [...a.slice(k).map(() => ".."), ...b.slice(k)].join("/") || ".";
}

// lien ou image relatifs : fichier du site -> chemin du site ; .md publie -> sa page ; le reste -> le depot
function reecrit(href: string, page: DocSource, publies: Set<string>, depot: string): string {
  if (!href || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href;
  const [chemin, diese] = href.split("#"), suffixe = diese ? "#" + diese : "";
  const cible = posix([...dossier(page.chemin), ...chemin.split("/")]);
  const ici = "docs/" + sortie_de(page.chemin);
  if (cible.startsWith("site/")) return vers(ici, cible.slice(5)) + suffixe;
  if (publies.has(cible)) return vers(ici, "docs/" + sortie_de(cible)) + suffixe;
  return `${depot.replace(/\/$/, "")}/blob/main/${cible}${suffixe}`;
}

function titre_et_resume(md: string, defaut: string): { titre: string; resume: string } {
  const nu = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_>#]/g, "").replace(/\s+/g, " ").trim();
  const lignes = md.split("\n");
  const h1 = lignes.find((l) => /^#\s+/.test(l));
  // resume = premier vrai paragraphe (ni titre, ni image, ni tableau, ni citation, ni liste, ni code, ni HTML)
  const special = (l: string) => /^(#|!\[|\||>|[-*]\s|\d+\.\s|```|<|@)/.test(l.trim());
  const corps = md.split(/\n\s*\n/).map((bloc) => bloc.split("\n").filter((l) => l.trim())).filter((bloc) => bloc.length && !bloc.some(special))
    .map((bloc) => nu(bloc.join(" "))).find((l) => l.length > 20) || "";
  return { titre: h1 ? nu(h1) : defaut, resume: corps.length > 170 ? corps.slice(0, 167).replace(/\s\S*$/, "") + "…" : corps };
}

function gabarit(titre: string, racine_site: string, racine_docs: string, barre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echappe(titre)}</title>
<link rel="stylesheet" href="${racine_site}style.css">
<link rel="stylesheet" href="${racine_site}docs.css">
</head>
<body class="doc">
<nav class="doc-bar"><a href="${racine_docs}index.html">Tous les documents</a><a href="${racine_site}index.html">Le site interactif</a>${barre}</nav>
<main class="doc-main">
${corps}</main>
</body>
</html>
`;
}

export function page_html(page: DocSource, publies: Set<string>, depot: string): DocPage {
  let corps = new Marked({ gfm: true }).parse(page.md, { async: false }) as string;
  // une seule passe sur le HTML : liens et images du markdown comme ceux ecrits en HTML brut (README)
  corps = corps.replace(/(<(?:img|a)\b[^>]*?\s(?:src|href)=")([^"]+)(")/g, (_m, a, href, z) => a + echappe(reecrit(href.replace(/&amp;/g, "&"), page, publies, depot)) + z);
  const vues = new Map<string, number>();
  corps = corps.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, n, interieur) => {
    const base = ancre(interieur), k = vues.get(base) || 0;
    vues.set(base, k + 1);
    return `<h${n} id="${k ? `${base}-${k}` : base}">${interieur}</h${n}>`;
  });
  corps = corps.replace(/<table>/g, '<div class="doc-table"><table>').replace(/<\/table>/g, "</table></div>");
  const sortie = sortie_de(page.chemin), profondeur = sortie.split("/").length - 1;
  const racine_docs = "../".repeat(profondeur), racine_site = "../".repeat(profondeur + 1);
  const { titre, resume } = titre_et_resume(page.md, page.chemin);
  const barre = `<a href="${depot.replace(/\/$/, "")}/blob/main/${page.chemin}">Source : ${echappe(page.chemin)}</a>`;
  return { chemin: page.chemin, sortie, titre, resume, html: gabarit(titre, racine_site, racine_docs, barre, corps) };
}

// ordre : README d'abord, puis tri naturel (abri, abri-v2, abri-v10, variantes)
const sans_ext = (c: string) => c.replace(/\.md$/i, "");
const naturel = (a: string, b: string) => sans_ext(a).localeCompare(sans_ext(b), "fr", { numeric: true, sensitivity: "base" });

export function index_html(pages: DocPage[], depot: string): string {
  const groupes: [string, string, DocPage[]][] = [
    ["Documents", "Les pages du projet, générées depuis les paramètres.", pages.filter((p) => !p.chemin.includes("/"))],
    ["Spécification", "Le dossier agent/ : besoins, décisions, géométrie, pipeline, questions ouvertes.", pages.filter((p) => p.chemin.includes("/"))],
  ];
  let corps = `<h1 id="documents-du-projet">Documents du projet</h1>\n<p>Chaque fichier Markdown du dépôt a ici sa page, à une adresse stable à partager. La liste se refait à chaque <code>npm run emit</code> : une nouvelle version (<code>abri-v3.md</code>…) y apparaît toute seule.</p>\n`;
  for (const [nom, note, liste] of groupes) {
    if (!liste.length) continue;
    const tri = [...liste].sort((a, b) => (/^readme\.md$/i.test(a.chemin) ? -1 : /^readme\.md$/i.test(b.chemin) ? 1 : naturel(a.chemin, b.chemin)));
    corps += `<h2 id="${ancre(nom)}">${nom}</h2>\n<p class="doc-note">${note}</p>\n<ul class="doc-index">\n`;
    for (const p of tri) corps += `<li><a href="${p.sortie}">${echappe(p.titre)}</a><span class="doc-file">${echappe(p.chemin)}</span>${p.resume ? `<span class="doc-resume">${echappe(p.resume)}</span>` : ""}</li>\n`;
    corps += `</ul>\n`;
  }
  return gabarit("Documents du projet", "../", "", `<a href="${depot.replace(/\/$/, "")}">Le dépôt</a>`, corps);
}

// tout le dossier site/docs/ : { "abri-v2.html": "...", "agent/04-geometrie.html": "...", "index.html": "..." }
export function construit_docs(sources: DocSource[], depot: string): Record<string, string> {
  const retenues = sources.filter((s) => est_publie(s.chemin));
  const publies = new Set(retenues.map((s) => s.chemin));
  const pages = retenues.map((s) => page_html(s, publies, depot));
  const out: Record<string, string> = {};
  for (const p of pages) out[p.sortie] = p.html;
  out["index.html"] = index_html(pages, depot);
  return out;
}
