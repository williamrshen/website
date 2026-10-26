import { lintGarden, missingSections, type GardenWarning } from '../lint.ts'
import type { GardenConfig } from '../types.ts'
import type { GardenHost } from './index.ts'

let latest: GardenWarning[] = []

/** The warnings for the garden on screen, for overlays. */
export const currentWarnings = () => latest

/** Logs likely mistakes in the config to the console; returns them. */
export function reportWarnings(config: GardenConfig) {
  latest = [...lintGarden(config), ...missingSections(config, (id) => document.getElementById(id) !== null)]
  if (latest.length) {
    console.groupCollapsed(`[garden] ${latest.length} config warning${latest.length === 1 ? '' : 's'} in src/data/garden.ts`)
    for (const warning of latest) console.warn(`"${warning.object}" ${warning.message}`)
    console.groupEnd()
  }
  return latest
}

/** Always on: checks the config when the garden starts. Hot reloads check again. */
export function configWarnings(host: GardenHost) {
  reportWarnings(host.config())
  return () => { latest = [] }
}
