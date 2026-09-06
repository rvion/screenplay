import { defineRepo } from 'rvlib-shipkit/src/repo-config.ts'

export default defineRepo({
    name: 'screenplay-shed',
    visibility: 'public', // github rvion/screenplay is public (GitHub Pages)
    venues: [], // e.g. ['itch', 'steam'], selects which .rv-<venue>/ contracts are REQUIRED
    social: [], // e.g. ['x', 'discord'], the .rv-social/<channel>/ post folders (+ .rv-discord/)
    tasks: [],  // repo commit-gate tasks; deps double as race guards
    // .comfy-ts/ holds schema dumps naming a private model collection.
    // gitignore (SK004) is advisory, this pre-commit gate is not
    hooks: { blockedPaths: ['.comfy-ts/'] },
    // the mandated reviewer agent type (rule SK008). Uncomment with YOUR
    // standing brief, then `shipkit check --fix SK008` writes the agent file:
    // reviewer: { name: 'my-reviewer', brief: '~/path/to/reviewer-brief.md' },
    // health checks need no config. Drop a <name>.check.ts file anywhere,
    // `shipkit check` auto-discovers and runs it (wire output, exit code)
})
