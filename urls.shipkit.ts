// where the shed is live: the site on GitHub Pages (README.md) and its repository
import { urls } from 'rvlib-shipkit/src/shipkit-files.ts'

export default urls([
    { id: 'screenplay-site-prod', label: 'the site', env: 'prod', url: 'https://rvion.github.io/screenplay/' },
    { id: 'screenplay-github', label: 'the repository', env: 'prod', url: 'https://github.com/rvion/screenplay' },
])
