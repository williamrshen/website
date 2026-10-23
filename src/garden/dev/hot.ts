import type { GardenConfig } from '../types.ts'
import type { GardenHost, Palettes } from './index.ts'
import { reportWarnings } from './warnings.ts'

let current: GardenHost | null = null

/** Always on: remembers the running garden so saved edits can be swapped into it. */
export function hotReload(host: GardenHost) {
  current = host
  return () => { if (current === host) current = null }
}

/**
 * Called with the latest `src/data/garden.ts` exports. `useGardenExperience` re-runs on every
 * save (React Fast Refresh re-executes it because it imports the data file), so the new layout
 * and palettes swap into the running garden without a reload; scroll position and tool state are
 * kept. An invalid config is reported and the last good garden stays on screen.
 */
export function applyGardenModule(config: GardenConfig, palettes: Palettes) {
  if (!current || current.config() === config) return
  try {
    current.setGarden(config, palettes)
    console.info('[garden] Reloaded src/data/garden.ts')
    reportWarnings(config)
  } catch (error) {
    console.error('[garden] Kept the previous garden; src/data/garden.ts is invalid:', error)
  }
}
