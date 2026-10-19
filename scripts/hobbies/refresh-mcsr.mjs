import { fetchMcsr, normalizeMcsr } from './mcsr.mjs'
import { refreshHobby } from './refresh.mjs'

await refreshHobby({
  name: 'MCSR Ranked', file: 'mcsr.json',
  load: (config, now) => fetchMcsr(config.mcsr.username).then(raw => normalizeMcsr(raw, config.mcsr, now)),
})
