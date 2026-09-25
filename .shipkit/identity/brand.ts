// screenplay brand source: the .shipkit/identity contract. The mark is the
// garden office cabin picked for this repo's icon (icon.png beside this file),
// seeded as the identity-logo pick; a new roll in the studio (#identity-logo)
// re-renders site/logo.png, favicon.png and og.png on pick, and
// `sk assets identity` re-renders from the current pick.
import { comfy, type Brand } from 'rvlib-shipkit'

const brand: Brand = {
    name: 'Bureau de jardin',
    tagline: 'panneaux sandwich · dossier de construction',
    palette: { bg: '#1f1a15', accent: '#d6a785', ink: '#f3ebe0' },
    mark: comfy({ workflow: 'txt2img-cutout' }),
    markPrompt: 'a small modern garden office cabin with a single sloped roof and one wide window, standing on a flat slab, app icon mark, flat vector illustration, one bold simple symbol, thick clean silhouette, wood brown and charcoal gray, few flat colors, high contrast, centered with generous margin, readable at 32 pixels, no text, no letters, no numbers, no frame, no border, no shadow\n\nwhite background, simplified, flat, flat colors, smooth',
}
export default brand
