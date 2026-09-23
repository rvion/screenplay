import { defineRepo } from 'rvlib-shipkit/src/repo-config.ts'

export default defineRepo({
    // >>> shipkit gate — managed block, the hub writes it, edit outside the markers
    when: {
        SK009: 'off:history is kept as is: old commits carry assistant trailers, new ones are refused by the commit-msg hook',
    },
    // <<< shipkit gate
    name: 'screenplay-shed',
    visibility: 'public', // github rvion/screenplay is public (GitHub Pages)
    venues: [], // e.g. ['itch', 'steam'], selects which .shipkit/<venue>/ contracts are REQUIRED
    social: [], // e.g. ['x', 'discord'], the .shipkit/social/<channel>/ post folders (+ .shipkit/discord/)
    tasks: [],  // repo commit-gate tasks; deps double as race guards
    // .comfy-ts/ holds schema dumps naming a private model collection.
    // gitignore (SK004) is advisory, this pre-commit gate is not
    hooks: {
        blockedPaths: ['.comfy-ts/'],
        // a French project: commits may be French. Dash and attribution checks stay on
        disable: ['commit-language'],
        // an ask file name ("ask-the-town-hall-…") reads as an api key to the sk- pattern
        leakAllow: [{ reason: 'ask slug, not a key', paths: ['.shipkit/asks/'], patterns: ['fp:98d9ad612426'] }],
    },
    // the mandated reviewer agent type (rule SK008). Uncomment with YOUR
    // standing brief, then `shipkit check --fix SK008` writes the agent file:
    // reviewer: { name: 'my-reviewer', brief: '~/path/to/reviewer-brief.md' },
    // health checks need no config. Drop a <name>.check.ts file anywhere,
    // `shipkit check` auto-discovers and runs it (wire output, exit code)
})
