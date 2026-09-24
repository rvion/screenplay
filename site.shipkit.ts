// the static site/ preview as a global process of the machine: started,
// stopped and opened as its own window from the shipkit home page. the port
// lives in ONE place, the "site" script of package.json.
import { globalProcess } from 'rvlib-shipkit/src/shipkit-files.ts'

export default globalProcess({
    id: 'screenplay-site',
    label: 'screenplay site',
    description: 'local preview of site/, documents under /docs/',
    cmd: ['npm', 'run', 'site'],
    url: 'http://localhost:5885',
    app: true,
})
