// screenplay asset kit: its identity only (favicon, logo, og under site/).
import { defineKit, identityKinds } from 'rvlib-shipkit'
import brand from '../identity/brand.ts'

export default defineKit({
    workspace: '.shipkit/assets/out',
    comfy: { workflows: '.shipkit/comfy/workflows' },
    kinds: [...identityKinds(brand)],
})
