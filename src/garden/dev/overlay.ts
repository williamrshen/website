import type { GardenScene } from '../scene.ts'

type Draw = (context: CanvasRenderingContext2D) => void
const draws = new WeakMap<GardenScene, Set<Draw>>()

/** Adds a drawing pass on top of each garden frame; returns a function that removes it. */
export function addOverlay(scene: GardenScene, draw: Draw) {
  let set = draws.get(scene)
  if (!set) {
    const passes = new Set<Draw>()
    draws.set(scene, set = passes)
    scene.afterRender = (context) => {
      for (const pass of passes) {
        context.save()
        pass(context)
        context.restore()
      }
    }
  }
  set.add(draw)
  return () => { set.delete(draw) }
}

type Rect = { x: number; y: number; width: number; height: number }

/**
 * Draws labels with a soft backing so they stay readable over the garden, nudging each one down
 * until it doesn't cover a label already drawn this frame.
 */
export function labeller(context: CanvasRenderingContext2D) {
  const taken: Rect[] = []
  const overlaps = (a: Rect) => taken.some((b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height)
  return (text: string, x: number, y: number, color = '#1d2b1f') => {
    context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
    const rect = { x: x - 3, y: y - 10, width: context.measureText(text).width + 6, height: 14 }
    while (overlaps(rect)) rect.y += 15
    taken.push(rect)
    context.fillStyle = 'rgba(255, 255, 250, 0.82)'
    context.fillRect(rect.x, rect.y, rect.width, rect.height)
    context.fillStyle = color
    context.fillText(text, x, rect.y + 10)
  }
}
