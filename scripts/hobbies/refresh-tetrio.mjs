import { refreshHobby } from './refresh.mjs'
import { fetchTetrio, normalizeTetrio } from './tetrio.mjs'

await refreshHobby({
  name: 'TETR.IO', file: 'tetrio.json',
  load: (config, now) => fetchTetrio(config.tetrio.username).then(raw => normalizeTetrio(raw, config.tetrio, now)),
})
