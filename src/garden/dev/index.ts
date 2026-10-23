/**
 * Development-only garden tools. `useGardenExperience` loads this module behind
 * `import.meta.env.DEV`, so none of it reaches the production bundle.
 *
 * Tools that change what you see are opt-in through the URL, e.g. `/?garden=debug`.
 */
import type { GardenScene } from '../scene.ts'
import type { Palette } from '../types.ts'
import { debugOverlay } from './debug.ts'

export type GardenHost = {
  scene: GardenScene
  canvas: HTMLCanvasElement
  /** The palette currently on screen. */
  palette(): Palette
  /** Draws a frame now (the animation loop may be paused). */
  requestRender(): void
}

/** A tool starts when its name is in `?garden=`; it returns a cleanup function. */
type Tool = (host: GardenHost) => () => void

const optional: Record<string, Tool> = { debug: debugOverlay }

export function attachDevTools(host: GardenHost) {
  const requested = new URLSearchParams(location.search).get('garden')?.split(',').map((name) => name.trim()) ?? []
  const cleanups: (() => void)[] = []
  for (const name of requested) {
    const tool = optional[name]
    if (tool) cleanups.push(tool(host))
    else if (name) console.warn(`[garden] Unknown dev tool "${name}". Available: ${Object.keys(optional).join(', ')}`)
  }
  host.requestRender()
  return () => { for (const cleanup of cleanups.reverse()) cleanup(); host.requestRender() }
}
