/**
 * Development-only garden tools. `useGardenExperience` loads this module behind
 * `import.meta.env.DEV`, so none of it reaches the production bundle.
 *
 * Tools that change what you see are opt-in through the URL, e.g. `/?garden=debug`.
 */
import type { gardenPalettes } from '../../data/garden.ts'
import type { GardenScene } from '../scene.ts'
import type { GardenConfig, Palette } from '../types.ts'
import { debugOverlay } from './debug.ts'
import { hotReload } from './hot.ts'
import { configWarnings } from './warnings.ts'

export type Palettes = typeof gardenPalettes

export type GardenHost = {
  scene: GardenScene
  canvas: HTMLCanvasElement
  /** The palette currently on screen. */
  palette(): Palette
  /** Draws a frame now (the animation loop may be paused). */
  requestRender(): void
  /** The config on screen. */
  config(): GardenConfig
  /** Replaces the garden on screen (throws, keeping the old garden, if the config is invalid). */
  setGarden(config: GardenConfig, palettes: Palettes): void
}

/** A tool starts when its name is in `?garden=`; it returns a cleanup function. */
type Tool = (host: GardenHost) => () => void

/** Always on in development. */
const always: Tool[] = [hotReload, configWarnings]
const optional: Record<string, Tool> = { debug: debugOverlay }

export function attachDevTools(host: GardenHost) {
  const requested = new URLSearchParams(location.search).get('garden')?.split(',').map((name) => name.trim()) ?? []
  const cleanups = always.map((tool) => tool(host))
  for (const name of requested) {
    const tool = optional[name]
    if (tool) cleanups.push(tool(host))
    else if (name) console.warn(`[garden] Unknown dev tool "${name}". Available: ${Object.keys(optional).join(', ')}`)
  }
  // Handy from the browser console, e.g. `gardenDev.scene.built.objects`.
  Object.assign(window, { gardenDev: host })
  host.requestRender()
  return () => {
    for (const cleanup of cleanups.reverse()) cleanup()
    if ((window as { gardenDev?: GardenHost }).gardenDev === host) delete (window as { gardenDev?: GardenHost }).gardenDev
    host.requestRender()
  }
}
