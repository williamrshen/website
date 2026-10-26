import { buildWorld } from '../objects.ts'
import { GardenScene } from '../scene.ts'
import type { GardenConfig, GardenObject } from '../types.ts'
import type { GardenHost } from './index.ts'

const css = `
.garden-seeds { position: fixed; inset: 0; z-index: 1001; display: grid; place-items: center; background: #1d2b1f66; cursor: auto; }
.garden-seeds * { cursor: auto; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; color: #1d2b1f; }
.garden-seeds .dialog { background: #fffff8; border-radius: 10px; padding: 14px; box-shadow: 0 12px 40px #0004; max-width: min(94vw, 900px); max-height: 92vh; overflow: auto; }
.garden-seeds header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
.garden-seeds h2 { margin: 0; font-weight: 700; }
.garden-seeds .grid { display: grid; grid-template-columns: repeat(4, 210px); gap: 8px; }
.garden-seeds button { border: 1px solid #c9cfb8; border-radius: 6px; background: #f6f6ee; padding: 4px; cursor: pointer; }
.garden-seeds button * { cursor: pointer; }
.garden-seeds .seed:hover, .garden-seeds .seed:focus-visible { border-color: #2563eb; background: #eef3ff; }
.garden-seeds .seed[data-current=true] { border-color: #b45309; }
.garden-seeds canvas { display: block; width: 200px; height: 200px; }
.garden-seeds .caption { display: block; text-align: center; padding-top: 2px; }
@media (max-width: 900px) { .garden-seeds .grid { grid-template-columns: repeat(2, 210px); } }
`

const randomSeed = () => Math.floor(Math.random() * 2 ** 32)

/**
 * A view that fits everything an object drew. Works in screen units (one tile step): across is
 * x - y, down is (x + y) / 2 - 1.05 z, matching the renderer's projection.
 */
function framing(config: GardenConfig, id: string) {
  const items = buildWorld(config).geometry.filter((item) => item.owner === id)
  const across: number[] = [], down: number[] = []
  for (const item of items) {
    const [x0, x1, y0, y1] = item.kind === 'box'
      ? [item.x, item.x + item.width, item.y, item.y + item.depth]
      : [item.x - item.radius, item.x + item.radius, item.y - item.radius, item.y + item.radius]
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [item.z, item.z + item.height]) {
      across.push(x - y)
      down.push((x + y) / 2 - 1.05 * z)
    }
  }
  const u = (Math.min(...across) + Math.max(...across)) / 2, v = (Math.min(...down) + Math.max(...down)) / 2
  const span = Math.max(2, Math.max(...across) - Math.min(...across), Math.max(...down) - Math.min(...down)) * 1.15
  // The ground point that projects to the middle of the object's outline.
  return { center: { x: v + u / 2, y: v - u / 2 }, span }
}

/**
 * Shows the same object under different seeds, on its own over the garden's islands, and calls
 * `pick` with the chosen one. Returns a function that closes the explorer.
 */
export function openSeedExplorer(host: GardenHost, config: GardenConfig, id: string, pick: (seed: number) => void) {
  const object = config.objects.find((item) => item.id === id)
  if (!object) throw new Error(`No garden object "${id}"`)
  const style = document.createElement('style')
  style.textContent = css
  const root = document.createElement('div')
  root.className = 'garden-seeds'
  root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="Seeds for ${id}">
    <header><h2>Seeds for ${id} (${object.type})</h2><span><button data-action="more">more seeds</button> <button data-action="close">close</button></span></header>
    <div class="grid"></div><p>Click a variation to use its seed. Esc closes.</p></div>`
  document.head.append(style)
  document.body.append(root)
  const grid = root.querySelector('.grid')!
  const view = framing({ ...config, objects: [object] }, id)

  function draw() {
    grid.replaceChildren()
    const seeds = [object!.seed, ...Array.from({ length: 11 }, randomSeed)]
    for (const [index, seed] of seeds.entries()) {
      const button = document.createElement('button')
      button.className = 'seed'
      button.dataset.seed = String(seed ?? '')
      button.dataset.current = String(index === 0)
      const canvas = document.createElement('canvas')
      const caption = document.createElement('span')
      caption.className = 'caption'
      caption.textContent = index === 0 ? `current${seed === undefined ? ' (from id)' : `: ${seed}`}` : String(seed)
      button.append(canvas, caption)
      grid.append(button)
      // Only the object itself (on its islands), so nothing else hides the differences.
      const variant = { ...config, objects: [{ ...object!, seed } as GardenObject], fireflies: { ...config.fireflies, count: 0 } }
      const scene = new GardenScene(canvas, canvas.getContext('2d')!, variant)
      scene.setView(view)
      scene.render(0, host.palette(), true)
    }
  }

  function close() {
    window.removeEventListener('keydown', onKey, true)
    root.remove()
    style.remove()
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); close() }
  }
  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button')
    if (event.target === root || button?.dataset.action === 'close') close()
    else if (button?.dataset.action === 'more') draw()
    else if (button?.dataset.seed) { pick(Number(button.dataset.seed)); close() }
  })
  window.addEventListener('keydown', onKey, true)
  draw()
  ;(root.querySelector('.seed') as HTMLElement | null)?.focus()
  return close
}

/** `?garden=seeds&object=<id>`: the explorer on its own; the pick is applied and logged. */
export function seedExplorer(host: GardenHost) {
  const config = host.config()
  const requested = new URLSearchParams(location.search).get('object')
  const randomized = config.objects.filter((object) => ['oak', 'scatter', 'plant', 'creek'].includes(object.type))
  const id = requested ?? randomized[0]?.id
  if (!id || !config.objects.some((object) => object.id === id)) {
    console.warn(`[garden] seeds: no object "${requested}". Try ?garden=seeds&object=${randomized.map((object) => object.id).join('|')}`)
    return () => {}
  }
  return openSeedExplorer(host, config, id, (seed) => {
    const next = host.config()
    host.setGarden({ ...next, objects: next.objects.map((object) => object.id === id ? { ...object, seed } as GardenObject : object) }, host.palettes())
    void navigator.clipboard?.writeText(`seed: ${seed}`).catch(() => {})
    console.info(`[garden] "${id}" now uses seed: ${seed} (copied). Set it in src/data/garden.ts to keep it.`)
  })
}
