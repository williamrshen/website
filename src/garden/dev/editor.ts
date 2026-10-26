import type { GardenConfig, GardenObject, Island, ObjectParams, ObjectType, Palette } from '../types.ts'
import type { GardenHost, Palettes } from './index.ts'
import { addOverlay, labeller } from './overlay.ts'
import { objectOutline, pickObject } from '../outline.ts'
import { openSeedExplorer } from './seeds.ts'
import { round, serializeGarden, serializePalette } from './serialize.ts'

type Selection = { kind: 'object' | 'island'; id: string } | null
type Draft = { config: GardenConfig; palettes: Palettes }

const defaults: { [K in ObjectType]: ObjectParams[K] } = {
  oak: { scale: 0.4 }, pine: { scale: 0.6 }, plant: { scale: 0.8, flower: true }, rock: { scale: 0.4 },
  path: { stones: 3, step: { x: 0.35, y: 0.48 } }, bench: {}, creek: { length: 2, width: 0.5 }, bridge: {},
  scatter: { count: 10, flowerEvery: 3, clearRadius: 0 },
}
const turns = [0, 90, 180, 270] as const
const clone = <T>(value: T): T => structuredClone(value)
const randomSeed = () => Math.floor(Math.random() * 2 ** 32)

const help = `click: select object or island · drag: move
←/→: x · ↑/↓: y (shift: ×5) · [ ]: scale or radius
r / shift+r: rotate · m: mirror · s: new seed · e: explore seeds
d: duplicate · delete: remove · esc: deselect · ctrl+z: undo`

const css = `
.garden-editor { position: fixed; top: 12px; right: 12px; z-index: 1000; width: 300px; max-height: calc(100vh - 24px); overflow: auto;
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; color: #1d2b1f; background: #fffff8f2; border: 1px solid #c9cfb8;
  border-radius: 8px; box-shadow: 0 8px 30px #0002; padding: 10px; cursor: auto; }
.garden-editor * { cursor: auto; font: inherit; }
.garden-editor h2 { margin: 0 0 6px; font-weight: 700; display: flex; justify-content: space-between; gap: 8px; }
.garden-editor section { border-top: 1px solid #e3e6d6; padding-top: 8px; margin-top: 8px; }
.garden-editor label { display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 6px; margin: 3px 0; }
.garden-editor input, .garden-editor select { width: 100%; box-sizing: border-box; padding: 2px 4px; border: 1px solid #c9cfb8; border-radius: 4px; background: #fff; }
.garden-editor input[type=checkbox] { width: auto; justify-self: start; }
.garden-editor input[type=color] { padding: 0; height: 22px; }
.garden-editor button { padding: 3px 8px; border: 1px solid #b7c09d; border-radius: 4px; background: #eef2e1; cursor: pointer; }
.garden-editor button:hover { background: #e1e9c8; }
.garden-editor .row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.garden-editor .muted { color: #6b7363; white-space: pre-wrap; }
.garden-editor .badge { font-weight: 400; color: #6b7363; }
.garden-editor .badge[data-dirty=true] { color: #b45309; }
.garden-editor .notice { color: #1d4f73; white-space: pre-wrap; }
.garden-editor .notice[data-error=true] { color: #dc2626; }
.garden-editor textarea { width: 100%; box-sizing: border-box; height: 140px; font-size: 11px; margin-top: 6px; }
.garden-editor .swatches { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
`

/**
 * `?garden=edit`: select and move objects and islands, change their settings, edit palette
 * colors, and copy the result back into `src/data/garden.ts`. Edits apply to a working copy that
 * is swapped into the running garden; nothing is written to disk.
 */
export function editor(host: GardenHost) {
  const { scene, canvas } = host
  let base: Draft = { config: host.config(), palettes: host.palettes() }
  let draft: Draft = clone(base)
  let selection: Selection = null
  let history: Draft[] = []
  let applying = false
  let notice = { text: 'Click something in the garden to select it.', error: false }
  let output = ''

  // Detect external swaps (a saved file during hot reload) so the editor follows the file.
  const setGarden = host.setGarden
  host.setGarden = (config, palettes) => {
    setGarden(config, palettes)
    if (applying) return
    base = { config, palettes }
    draft = clone(base)
    history = []
    if (selection && !find(selection)) selection = null
    say('src/data/garden.ts changed on disk; the editor now matches it.')
  }

  function apply() {
    applying = true
    try {
      setGarden(draft.config, draft.palettes)
      return true
    } catch (error) {
      say(String(error), true)
      return false
    } finally {
      applying = false
    }
  }

  /** Records an undo step, changes the draft, and shows the result. */
  function edit(change: () => void, record = true) {
    const before = clone(draft)
    change()
    if (!apply()) { draft = before; apply(); render(); return }
    if (record) history = [...history.slice(-99), before]
    render()
  }

  function say(text: string, error = false) { notice = { text, error }; render() }

  const islandById = (id?: string) => draft.config.islands.find((island) => island.id === id)
  const objectById = (id: string) => draft.config.objects.find((object) => object.id === id)
  function find(target: NonNullable<Selection>): GardenObject | Island | undefined {
    return target.kind === 'object' ? objectById(target.id) : islandById(target.id)
  }
  function uniqueId(prefix: string, taken: { id: string }[]) {
    for (let n = 2; ; n++) if (!taken.some((item) => item.id === `${prefix}-${n}`)) return `${prefix}-${n}`
  }

  // --- Pointer: select and drag ----------------------------------------------------------------
  const local = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * canvas.clientWidth / rect.width, y: (event.clientY - rect.top) * canvas.clientHeight / rect.height }
  }
  let drag: { start: { x: number; y: number }; from: { x: number; y: number }; moved: boolean } | null = null
  let pending = 0

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    const point = local(event), ground = scene.unproject(point)
    const object = pickObject(scene.built, scene.project.bind(scene), point)
    if (object) selection = { kind: 'object', id: object }
    else {
      // The smallest island under the cursor, so small islands inside big ones stay reachable.
      const island = [...draft.config.islands].sort((a, b) => a.radius - b.radius)
        .find((candidate) => Math.hypot(ground.x - candidate.x, ground.y - candidate.y) <= candidate.radius)
      selection = island ? { kind: 'island', id: island.id } : null
    }
    const target = selection && find(selection)
    drag = target ? { start: ground, from: { x: target.x ?? 0, y: target.y ?? 0 }, moved: false } : null
    if (drag) canvas.setPointerCapture(event.pointerId)
    render()
    host.requestRender()
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || !selection) return
    const ground = scene.unproject(local(event)), current = drag
    const x = round(current.from.x + ground.x - current.start.x), y = round(current.from.y + ground.y - current.start.y)
    if (!current.moved) { history = [...history.slice(-99), clone(draft)]; current.moved = true }
    const target = find(selection)
    if (!target) return
    target.x = x
    target.y = y
    // Rebuild at most once per frame while dragging.
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; edit(() => {}, false) })
  }

  function onPointerUp(event: PointerEvent) {
    if (drag && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    drag = null
  }

  // --- Keyboard ---------------------------------------------------------------------------------
  function onKeyDown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select')
    if (typing) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return }
    if (!selection) return
    const target = find(selection)
    if (!target) return
    const step = event.shiftKey ? 0.25 : 0.05
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const object = selection.kind === 'object' ? target as GardenObject : null
    let handled = true
    if (event.key in moves) {
      const [dx, dy] = moves[event.key]
      edit(() => { target.x = round((target.x ?? 0) + dx); target.y = round((target.y ?? 0) + dy) })
    } else if (event.key === '[' || event.key === ']') {
      const delta = event.key === ']' ? 0.05 : -0.05
      if (object && 'scale' in object || object && ['oak', 'plant'].includes(object.type)) {
        edit(() => { const scaled = object as { scale?: number }; scaled.scale = Math.max(0.05, round((scaled.scale ?? 1) + delta)) })
      } else if (!object) edit(() => { (target as Island).radius = Math.max(0.2, round((target as Island).radius + delta * 2)) })
    } else if (object && event.key.toLowerCase() === 'r') {
      const index = turns.indexOf(object.rotate ?? 0)
      edit(() => { object.rotate = turns[(index + (event.shiftKey ? 3 : 1)) % 4] || undefined })
    } else if (object && event.key === 'm') edit(() => { object.mirror = object.mirror ? undefined : true })
    else if (object && event.key === 's') edit(() => { object.seed = randomSeed() })
    else if (object && event.key === 'e') explore()
    else if (event.key === 'd') duplicate()
    else if (event.key === 'Delete' || event.key === 'Backspace') remove()
    else if (event.key === 'Escape') { selection = null; render(); host.requestRender() }
    else handled = false
    if (handled) event.preventDefault()
  }

  /** Opens the seed explorer for the selected object; the pick becomes an undoable edit. */
  function explore() {
    if (selection?.kind !== 'object') return
    const id = selection.id
    openSeedExplorer(host, draft.config, id, (seed) => {
      const object = objectById(id)
      if (object) edit(() => { object.seed = seed })
    })
  }

  function undo() {
    const previous = history.pop()
    if (!previous) { say('Nothing to undo.'); return }
    draft = previous
    if (selection && !find(selection)) selection = null
    apply()
    render()
  }

  function duplicate() {
    if (!selection) return
    if (selection.kind === 'object') {
      const object = objectById(selection.id)
      if (!object) return
      const copy = { ...clone(object), id: uniqueId(object.id, draft.config.objects), x: round((object.x ?? 0) + 0.5) }
      edit(() => { draft.config.objects.push(copy) })
      selection = { kind: 'object', id: copy.id }
    } else {
      const island = islandById(selection.id)
      if (!island) return
      const copy = { ...island, id: uniqueId(island.id, draft.config.islands), x: round(island.x + island.radius) }
      edit(() => { draft.config.islands.push(copy) })
      selection = { kind: 'island', id: copy.id }
    }
    render()
  }

  function remove() {
    if (!selection) return
    const { kind, id } = selection
    if (kind === 'island' && draft.config.objects.some((object) => object.island === id)) {
      say(`Island "${id}" still has objects on it; move or remove them first.`, true)
      return
    }
    edit(() => {
      if (kind === 'object') draft.config.objects = draft.config.objects.filter((object) => object.id !== id)
      else draft.config.islands = draft.config.islands.filter((island) => island.id !== id)
    })
    selection = null
    render()
  }

  function add(type: ObjectType) {
    const island = selection?.kind === 'island' ? selection.id
      : selection ? objectById(selection.id)?.island ?? draft.config.islands[0]?.id : draft.config.islands[0]?.id
    const object = { id: uniqueId(type, draft.config.objects), type, island, ...clone(defaults[type]) } as GardenObject
    edit(() => { draft.config.objects.push(object) })
    selection = { kind: 'object', id: object.id }
    render()
  }

  /** Moves an object to another island (or none) without moving it on screen. */
  function reparent(object: GardenObject, islandId: string) {
    const from = islandById(object.island), to = islandById(islandId || undefined)
    const worldX = (from?.x ?? 0) + (object.x ?? 0), worldY = (from?.y ?? 0) + (object.y ?? 0)
    edit(() => {
      object.island = to?.id
      object.x = round(worldX - (to?.x ?? 0))
      object.y = round(worldY - (to?.y ?? 0))
    })
  }

  // --- Copying ---------------------------------------------------------------------------------
  function copy(text: string, what: string) {
    output = text
    void navigator.clipboard?.writeText(text).catch(() => {})
    say(`${what} copied (also below). ${what === 'Config' ? 'Paste it over `export const garden` in src/data/garden.ts; comments in that block are not kept.' : 'Paste it over the matching palette in src/data/garden.ts.'}`)
  }
  const activePaletteName = () => (Object.keys(draft.palettes) as (keyof Palettes)[]).find((name) => draft.palettes[name] === host.palette()) ?? 'daylight'

  // --- Panel -----------------------------------------------------------------------------------
  const style = document.createElement('style')
  style.textContent = css
  const panel = document.createElement('aside')
  panel.className = 'garden-editor'
  panel.setAttribute('aria-label', 'Garden editor')
  document.head.append(style)
  document.body.append(panel)

  const escape = (text: string) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
  const field = (name: string, label: string, value: unknown, attributes = '') =>
    `<label>${label}<input name="${name}" value="${escape(String(value ?? ''))}" ${attributes}></label>`

  function selectionFields() {
    if (!selection) return '<p class="muted">No selection.</p>'
    const target = find(selection)
    if (!target) return ''
    if (selection.kind === 'island') {
      const island = target as Island
      return `<p><b>island</b> ${escape(island.id)}</p>${field('x', 'x', island.x, 'type=number step=0.05')}${field('y', 'y', island.y, 'type=number step=0.05')}${field('radius', 'radius', island.radius, 'type=number step=0.1 min=0.2')}`
    }
    const object = target as GardenObject & Record<string, unknown>
    const islands = ['', ...draft.config.islands.map((island) => island.id)]
      .map((id) => `<option value="${escape(id)}" ${id === (object.island ?? '') ? 'selected' : ''}>${id || '(world origin)'}</option>`).join('')
    const extras = Object.entries(object)
      .filter(([key, value]) => typeof value === 'number' && !['x', 'y', 'seed', 'rotate'].includes(key))
      .map(([key, value]) => field(`param:${key}`, key, value, 'type=number step=0.05')).join('')
    return `<p><b>${escape(object.type)}</b> ${escape(object.id)}</p>
      <label>island<select name="island">${islands}</select></label>
      ${field('x', 'x', object.x ?? 0, 'type=number step=0.05')}${field('y', 'y', object.y ?? 0, 'type=number step=0.05')}
      <label>rotate<select name="rotate">${turns.map((turn) => `<option ${turn === (object.rotate ?? 0) ? 'selected' : ''}>${turn}</option>`).join('')}</select></label>
      <label>mirror<input type="checkbox" name="mirror" ${object.mirror ? 'checked' : ''}></label>
      ${extras}
      <label>seed<span class="row" style="margin:0;flex-wrap:nowrap"><input name="seed" type="number" value="${object.seed ?? ''}" placeholder="from id"><button data-action="reseed" title="random seed (s)">new</button><button data-action="explore" title="compare seeds (e)">explore</button></span></label>`
  }

  function paletteFields() {
    const name = activePaletteName(), palette = draft.palettes[name] as Palette
    const colors = Object.entries(palette.colors)
      .map(([key, value]) => `<label>${key}<input type="color" name="color:${key}" value="${value}"></label>`).join('')
    const swatches = Object.entries(palette.swatches).map(([key, values]) => `<label>${key}<span class="swatches">${values
      .map((value, index) => `<input type="color" name="swatch:${key}:${index}" value="${value}" title="${key}[${index}]">`).join('')}</span></label>`).join('')
    return `<details><summary>${name} palette colors</summary>${colors}${swatches}
      <p class="muted">evening shares daylight's colors unless it overrides them.</p></details>`
  }

  function render() {
    const dirty = JSON.stringify(draft) !== JSON.stringify(base)
    panel.innerHTML = `
      <h2>Garden editor <span class="badge" data-dirty="${dirty}">${dirty ? 'unsaved changes' : 'matches file'}</span></h2>
      <p class="notice" data-error="${notice.error}" role="status">${escape(notice.text)}</p>
      <section>${selectionFields()}
        <div class="row">${selection ? '<button data-action="duplicate">duplicate</button><button data-action="remove">delete</button>' : ''}</div>
      </section>
      <section><div class="row" style="margin:0"><select name="add-type">${Object.keys(defaults).map((type) => `<option>${type}</option>`).join('')}</select><button data-action="add">add object</button></div></section>
      <section>${paletteFields()}</section>
      <section><div class="row" style="margin:0">
        <button data-action="undo" ${history.length ? '' : 'disabled'}>undo</button>
        <button data-action="reset" ${dirty ? '' : 'disabled'}>reset to file</button>
        <button data-action="copy-config">copy config</button>
        <button data-action="copy-palette">copy palette</button>
      </div>${output ? `<textarea readonly aria-label="Copied text">${escape(output)}</textarea>` : ''}</section>
      <section><p class="muted">${help}</p></section>`
  }

  panel.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest('button')?.dataset.action
    if (!action) return
    if (action === 'duplicate') duplicate()
    else if (action === 'remove') remove()
    else if (action === 'undo') undo()
    else if (action === 'add') add((panel.querySelector('[name=add-type]') as HTMLSelectElement).value as ObjectType)
    else if (action === 'reset') { history = [...history, clone(draft)]; draft = clone(base); selection = null; apply(); say('Reset to src/data/garden.ts.') }
    else if (action === 'copy-config') copy(serializeGarden(draft.config), 'Config')
    else if (action === 'copy-palette') copy(serializePalette(activePaletteName(), draft.palettes[activePaletteName()]), 'Palette')
    else if (action === 'reseed' && selection?.kind === 'object') { const object = objectById(selection.id); if (object) edit(() => { object.seed = randomSeed() }) }
    else if (action === 'explore') explore()
  })

  // Colors update live while dragging the picker; one undo step per pick.
  let colorStep = false
  panel.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement
    const [kind, key, index] = input.name.split(':')
    if (kind !== 'color' && kind !== 'swatch') return
    const palette = draft.palettes[activePaletteName()] as Palette
    edit(() => {
      if (kind === 'color') palette.colors[key as keyof Palette['colors']] = input.value
      else palette.swatches[key as keyof Palette['swatches']][Number(index)] = input.value
    }, !colorStep)
    colorStep = true
  })

  panel.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement
    if (input.name.startsWith('color:') || input.name.startsWith('swatch:')) { colorStep = false; return }
    if (!selection || input.name === 'add-type') return
    const target = find(selection)
    if (!target) return
    const number = Number(input.value)
    if (input.name === 'island') { reparent(target as GardenObject, input.value); return }
    edit(() => {
      const object = target as unknown as Record<string, unknown>
      if (input.name === 'mirror') object.mirror = (input as HTMLInputElement).checked || undefined
      else if (input.name === 'rotate') object.rotate = number || undefined
      else if (input.name === 'seed') object.seed = input.value === '' ? undefined : number >>> 0
      else if (input.name.startsWith('param:')) object[input.name.slice(6)] = number
      else if (input.value !== '' && Number.isFinite(number)) object[input.name] = number
    })
  })

  // --- Selection overlay ------------------------------------------------------------------------
  const removeOverlay = addOverlay(scene, (ctx) => {
    if (!selection) return
    const project = scene.project.bind(scene), label = labeller(ctx)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#2563eb'
    ctx.setLineDash([6, 4])
    if (selection.kind === 'object') {
      const outline = objectOutline(scene.built, project, selection.id)
      if (!outline.length) return
      ctx.beginPath()
      outline.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y))
      ctx.closePath()
      ctx.stroke()
      const top = outline.reduce((best, point) => point.y < best.y ? point : best)
      label(selection.id, top.x - 20, top.y - 8, '#1d4ed8')
    } else {
      const island = islandById(selection.id)
      if (!island) return
      ctx.beginPath()
      for (let i = 0; i <= 48; i++) {
        const angle = (i / 48) * Math.PI * 2, point = project(island.x + Math.cos(angle) * island.radius, island.y + Math.sin(angle) * island.radius)
        if (i) ctx.lineTo(point.x, point.y)
        else ctx.moveTo(point.x, point.y)
      }
      ctx.stroke()
      const center = project(island.x, island.y)
      label(`${island.id} r${island.radius}`, center.x, center.y, '#1d4ed8')
    }
  })

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onKeyDown)
  apply()
  render()

  return () => {
    cancelAnimationFrame(pending)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('keydown', onKeyDown)
    removeOverlay()
    panel.remove()
    style.remove()
    host.setGarden = setGarden
  }
}
