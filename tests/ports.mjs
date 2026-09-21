// Garde : les serveurs locaux du depot ecoutent sur des ports qui lui sont propres, jamais sur un
// port par defaut que d'autres projets de la machine prennent (8000 a ete perdu contre un autre depot).
//   node tests/ports.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let fails = 0;
const ok = (cond, label) => { console.log((cond ? "✓ " : "✗ ") + label); if (!cond) fails++; };

const BANALS = [3000, 3001, 4200, 5000, 5173, 8000, 8080, 8888, 9000];
// un port banal = ce nombre seul (pas 58000, pas 8000 dans 18000), hors commentaires
const sans_commentaires = (txt) => txt.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const ports_banals = (txt) => BANALS.filter((p) => new RegExp(`(^|[^0-9])${p}([^0-9]|$)`).test(sans_commentaires(txt)));

// la garde sur des echantillons : la forme fautive, puis ses sosies legitimes
ok(ports_banals('"args": ["-m", "http.server", "-d", "site", "8000"]').join() === "8000", "echantillon fautif : http.server 8000 est refuse");
ok(ports_banals('"dev": "vite --port 5173"').join() === "5173", "echantillon fautif : vite 5173 est refuse");
ok(ports_banals('"site": "python3 -m http.server -d site 5885"').length === 0, "sosie legitime : 5885 passe");
ok(ports_banals('"max": 58000, "ms": 18000').length === 0, "sosie legitime : 58000 et 18000 ne sont pas le port 8000");
ok(ports_banals("   // jamais 8000, 8080 : ports des autres projets").length === 0, "sosie legitime : un commentaire qui nomme les ports interdits passe");

// les vrais fichiers
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const taches = readFileSync(join(ROOT, ".vscode/tasks.json"), "utf8");
const scripts = Object.entries(pkg.scripts).map(([k, v]) => `${k}: ${v}`).join("\n");
ok(ports_banals(scripts).length === 0, "package.json : aucun script sur un port banal" + (ports_banals(scripts).length ? " (" + ports_banals(scripts).join() + ")" : ""));
ok(ports_banals(taches).length === 0, ".vscode/tasks.json : aucune tache sur un port banal" + (ports_banals(taches).length ? " (" + ports_banals(taches).join() + ")" : ""));

// le port du site vit a un seul endroit : le script "site" ; la tache l'appelle sans le recopier
const port = (/http\.server\b.*?(\d{4,5})\s*$/.exec(pkg.scripts.site || "") || [])[1];
ok(!!port, 'package.json : script "site" avec son port (' + port + ")");
const bloc = taches.slice(taches.indexOf('"🌐  site"'));
ok(/"command":\s*"npm"/.test(bloc) && /"args":\s*\["run",\s*"site"\]/.test(bloc), 'tasks.json : la tache du site lance "npm run site", sans port en dur');
ok(sans_commentaires(bloc).includes(`localhost:${port}`), "tasks.json : l'adresse affichee est celle du script (" + port + ")");
for (const f of ["README.md", "agent/index.md", "agent/05-pipeline.md", ".claude/skills/verify/SKILL.md"]) {
  const txt = readFileSync(join(ROOT, f), "utf8");
  ok(!/localhost:(8000|8080|3000|5173)\b/.test(txt) && txt.includes(String(port)), `${f} : donne le bon port (${port})`);
}

console.log(fails ? `\n${fails} echec(s) ports.` : "\nPorts locaux OK ✓");
process.exit(fails ? 1 : 0);
