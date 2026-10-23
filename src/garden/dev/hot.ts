// Imported so Vite treats the data file as a dependency this module can accept updates for.
import * as data from '../../data/garden.ts'
import type { GardenHost } from './index.ts'

let current: GardenHost | null = null

/**
 * Swaps edits to `src/data/garden.ts` into the running garden without reloading the page, so
 * scroll position and dev tool state survive. An invalid config is reported and the last good
 * garden stays on screen.
 */
export function hotReload(host: GardenHost) {
  current = host
  return () => { if (current === host) current = null }
}

import.meta.hot?.accept('../../data/garden.ts', (next) => {
  if (!next || !current) return
  const { garden, gardenPalettes } = next as unknown as typeof data
  try {
    current.setGarden(garden, gardenPalettes)
    console.info('[garden] Reloaded src/data/garden.ts')
  } catch (error) {
    console.error('[garden] Kept the previous garden; src/data/garden.ts is invalid:', error)
  }
})
