---
name: verify
description: Prove a change in THIS project actually works — drive the real flow end to end, never trust green checks or self-reports. Use before committing any nontrivial change.
---

# verify — how to PROVE a change works here

## The rules (house-wide)
- Failing repro test BEFORE the fix. Green checks ≠ verification.
- Logic → fast headless tests: `npm test` (snapshots golden of `compute.ts` + jsdom smoke).
  A WANTED calculation change updates the snapshots on purpose: `npm run snapshot:update`,
  then read the diff of `tests/snapshots/*.json` — an unexplained delta is a bug, not noise.
- Look & feel → NEVER screenshot-self-verify; the repo owner playtests it.
- Verify as the end user would: drive the real flow, observe the real signal.

## This project
- Full gate: `npm run typecheck && npm run build && npm run emit && npm test`. After any
  `site/src/compute.ts` edit, `build` + `emit` are mandatory and the regenerated files
  (`site/app.js`, `site/params.js`, `site/assets/*.svg`, `site/data/derived.json`) are committed —
  `git status` clean after emit = nothing drifted.
- Local preview: `python3 -m http.server -d site 8000` (check first:
  `curl -s localhost:8000 >/dev/null && echo up`) → http://localhost:8000. Also open
  `site/index.html` as `file://` — it MUST work with no server (params.js, no fetch).
- Live URL after the Pages workflow: https://rvion.github.io/screenplay/ (curl 200 + drive the
  sliders: KPIs, plans SVG, tables and 3D all recompute).
- Geometry sanity: values on the site must match the table in `agent/04-geometrie.md`
  (C ≈ 124,5 cm, aire ≈ 5,27 m², pente ≈ 10,2 %).

## Browser verification (only when a browser is truly needed)
Playwright with explicit `executablePath`, `deviceScaleFactor: 2`, localStorage
reset between runs, `page.evaluate` probes for state, collect `pageerror`
("none" is evidence). The 3D must degrade cleanly with WebGL disabled (message shown, plans
still visible). Screenshots are for LOOKS, never for "does it fit".

## Gotchas discovered in this repo
<!-- append as found — this list is the reason this file exists -->
- `compute.ts` must stay pure (no DOM / Three import): it runs in Node for `npm run emit` and
  the snapshot tests. An accidental import breaks emit silently only at CLI time.
