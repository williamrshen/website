import { bloomAt, flakeAt, leafAt } from './live.ts'
import { buildWorld } from './objects.ts'
import { convexHull, insidePolygon, silhouette } from './outline.ts'
import type { Faces, GardenConfig, Paint, Palette, PineLayer, Point, Tile, World } from './types.ts'

const allFaces: Faces = { top: true, left: true, right: true }

/** Mixes two #rrggbb colors; `amount` 0 keeps `from`, 1 gives `to`. */
function mix(from: string, to: string, amount: number) {
  const a = parseInt(from.slice(1, 7), 16), b = parseInt(to.slice(1, 7), 16)
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount)
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`
}

function shade(hex: string, factor = 1) {
  const color = parseInt(hex.slice(1), 16)
  const channel = (value: number) => Math.min(255, value * factor) | 0
  return `rgb(${channel(color >> 16)},${channel((color >> 8) & 255)},${channel(color & 255)})`
}

type Layer = { canvas: HTMLCanvasElement; palette: Palette; highlight?: string }
/** A shape's on-screen outline and its bounding box, for hit testing. */
type Shape = { owner: string; outline: Point[]; left: number; top: number; right: number; bottom: number }

/**
 * Canvas renderer for a garden built from config; no event listeners or React state.
 *
 * Only the fireflies and the pointer light change between frames, so the rest is drawn once into
 * two cached layers, `ground` (grass and grid) and `objects` (island shadows and everything on
 * them), and copied each frame. While the pointer lights the grid, just the ground around it is
 * redrawn, clipped to whole device pixels, between the two layers. Layers are rebuilt lazily
 * after a resize or palette change.
 */
export class GardenScene {
  private context: CanvasRenderingContext2D
  /** Where drawing helpers paint: the visible canvas, or a layer being cached. */
  private target: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private world: World
  private layers: { ground?: Layer; objects?: Layer; highlighted?: Layer } = {}
  private shapes: Shape[] | null = null
  private highlight: { link: string; ring: boolean } | null = null
  /** Turned off by tools that use clicks for something else (the dev editor). */
  linksEnabled = true
  private dpr = 1
  private view: { center: Point; span: number } | null = null
  /** Development tools draw on top of each frame here, in CSS pixels. */
  afterRender?: (context: CanvasRenderingContext2D) => void
  private visibleTiles: Tile[] = []
  private width = 0
  private height = 0
  private unit = 1
  private origin: Point = { x: 0, y: 0 }
  private pointer: Point | null = null

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, config: GardenConfig) {
    this.canvas = canvas
    this.context = context
    this.target = context
    this.world = buildWorld(config)
  }

  /** The built world, for tooling. */
  get built(): World { return this.world }
  /** Screen size of one ground tile step, in CSS pixels. */
  get tileSize() { return this.unit }

  /** Canvas CSS pixels to the ground-plane (z = 0) point under them. */
  unproject(point: Point): Point {
    const across = (point.x - this.origin.x) / this.unit, down = 2 * (point.y - this.origin.y) / this.unit
    return { x: (across + down) / 2, y: (down - across) / 2 }
  }

  /** World coordinates (z = height) to canvas CSS pixels. */
  project(x: number, y: number, z = 0): Point {
    return {
      x: this.origin.x + (x - y) * this.unit,
      y: this.origin.y + (x + y) * this.unit * 0.5 - z * this.unit * 1.05,
    }
  }

  private polygon(points: Point[], fill?: string, stroke?: string) {
    const ctx = this.target
    ctx.beginPath()
    points.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y)
      else ctx.moveTo(point.x, point.y)
    })
    ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.65; ctx.stroke() }
  }

  private paint(paint: Paint, palette: Palette) {
    if (typeof paint === 'string') return palette.colors[paint]
    const swatch = palette.swatches[paint.swatch]
    return swatch[paint.index % swatch.length]
  }

  private box(
    x: number, y: number, z: number,
    width: number, depth: number, height: number,
    paint: Paint, palette: Palette, faces = allFaces,
  ) {
    const a = this.project(x, y, z + height)
    const b = this.project(x + width, y, z + height)
    const c = this.project(x + width, y + depth, z + height)
    const d = this.project(x, y + depth, z + height)
    const b0 = this.project(x + width, y, z)
    const c0 = this.project(x + width, y + depth, z)
    const d0 = this.project(x, y + depth, z)
    const color = this.paint(paint, palette), dim = palette.light.box
    if (faces.left) this.polygon([d, c, c0, d0], shade(color, 0.73 * dim))
    if (faces.right) this.polygon([b, c, c0, b0], shade(color, 0.88 * dim))
    // Snow covers top faces; water only frosts over.
    const snow = palette.snow && mix(color, palette.snow.color, palette.snow.cover * (paint === 'water' ? 0.35 : 1))
    if (faces.top) this.polygon([a, b, c, d], shade(snow || color, 1.09 * dim))
  }

  private drawPine(layer: PineLayer, palette: Palette) {
    const { x, y, z, radius, height, tip: lean } = layer
    const a = this.project(x - radius, y - radius, z)
    const b = this.project(x + radius, y - radius, z)
    const c = this.project(x + radius, y + radius, z)
    const d = this.project(x - radius, y + radius, z)
    const tip = this.project(x + lean.x, y + lean.y, z + height)
    const dim = palette.light.pine, snow = palette.snow
    // Sloped faces hold less snow than flat tops, so pines are frosted evenly rather than capped.
    const [upperRight, frontRight, frontLeft, upperLeft] = palette.swatches.pine
      .map((color) => snow ? mix(color, snow.color, snow.cover * 0.35) : color)
    this.polygon([a, b, tip], shade(upperRight, dim))
    this.polygon([b, c, tip], shade(frontRight, dim))
    this.polygon([c, d, tip], shade(frontLeft, dim))
    this.polygon([d, a, tip], shade(upperLeft, dim))
  }

  resize() {
    // CSS layout dimensions are independent of the scroll-driven transform.
    this.width = this.canvas.clientWidth
    this.height = this.canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dpr = dpr
    this.layers = {}
    this.shapes = null
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.view) {
      // Fit `span` tiles across the smaller side, with the ground point `center` in the middle.
      const { center, span } = this.view
      this.unit = Math.min(this.width, this.height) / span
      this.origin = { x: this.width / 2 - (center.x - center.y) * this.unit, y: this.height / 2 - (center.x + center.y) * this.unit * 0.5 }
    } else {
      this.unit = Math.min(this.width / (this.width <= 680 ? 22.5 : 26), this.height / 20, 56)
      this.origin = { x: this.width * 0.48, y: this.height * 0.59 + this.unit * 0.3 }
    }
    this.cullTiles()
  }

  /** Frames a part of the world instead of the default hero framing (used by dev thumbnails). */
  setView(view: { center: Point; span: number } | null) {
    this.view = view
    this.resize()
  }

  private cullTiles() {
    this.visibleTiles = this.world.tiles.filter((tile) => {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      return point.x >= -this.unit && point.x <= this.width + this.unit && point.y >= -this.unit && point.y <= this.height + this.unit
    })
  }

  /** Rebuilds the world from a new config (throws, keeping the old one, if it is invalid). */
  setConfig(config: GardenConfig) {
    this.world = buildWorld(config)
    this.shapes = null
    if (this.highlight && !this.world.links[this.highlight.link]) this.highlight = null
    this.cullTiles()
    this.invalidate()
  }

  /** Drops the cached layers, e.g. after a palette was edited in place. */
  invalidate() { this.layers = {} }

  setPointer(point: Point | null) { this.pointer = point }

  /** Screen outlines of every shape in draw order, rebuilt after a resize or config change. */
  private outlines(): Shape[] {
    this.shapes ??= this.world.geometry.map((item) => {
      const outline = silhouette(item, (x, y, z) => this.project(x, y, z))
      const xs = outline.map((point) => point.x), ys = outline.map((point) => point.y)
      return { owner: item.owner, outline, left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
    })
    return this.shapes
  }

  /** The link of the frontmost object under a canvas point (CSS pixels), if it has one. */
  linkAt(point: Point): string | undefined {
    if (!this.linksEnabled) return undefined
    const shapes = this.outlines()
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i]
      if (point.x < shape.left || point.x > shape.right || point.y < shape.top || point.y > shape.bottom) continue
      if (insidePolygon(point, shape.outline)) return this.world.objects.find((object) => object.id === shape.owner)?.link
    }
    return undefined
  }

  /** Links that at least one object uses, in config order. */
  get activeLinks() {
    const used = new Set(this.world.objects.map((object) => object.link))
    return Object.entries(this.world.links).filter(([id]) => used.has(id)).map(([id, link]) => ({ id, ...link }))
  }

  /** Outline around everything that uses a link, and where its label goes (centered below it). */
  linkOutline(link: string) {
    const owners = new Set(this.world.objects.filter((object) => object.link === link).map((object) => object.id))
    const outline = convexHull(this.outlines().filter((shape) => owners.has(shape.owner)).flatMap((shape) => shape.outline))
    if (!outline.length) return null
    const xs = outline.map((point) => point.x), ys = outline.map((point) => point.y)
    const bounds = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
    return { outline, bounds, label: { x: (bounds.left + bounds.right) / 2, y: bounds.bottom } }
  }

  /** Brightens everything using `link`; `ring` also draws the keyboard focus ring around it. */
  setHighlight(link: string | null, ring = false) {
    this.highlight = link && this.world.links[link] ? { link, ring } : null
  }

  /** Draws into a cached layer the same size as the visible canvas, with the same transform. */
  private layer(palette: Palette, draw: () => void): Layer {
    const canvas = this.canvas.ownerDocument.createElement('canvas')
    canvas.width = this.canvas.width
    canvas.height = this.canvas.height
    const context = canvas.getContext('2d')!
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.target = context
    try { draw() } finally { this.target = this.context }
    return { canvas, palette }
  }

  /** Copies a cached layer onto the visible canvas pixel for pixel. */
  private blit(layer: Layer) {
    const ctx = this.context
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(layer.canvas, 0, 0)
    ctx.restore()
  }

  /** Grass and grid lines; `pointer` brightens the tiles around it. */
  private drawGround(palette: Palette, pointer: Point | null, tiles = this.visibleTiles) {
    const ctx = this.target, unit = this.unit, ground = palette.ground
    for (const tile of tiles) {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      const light = pointer ? Math.max(0, 1 - Math.hypot(point.x - pointer.x, point.y - pointer.y) / (unit * 3.9)) : 0
      const alpha = Math.max(tile.gridFade * 0.85, light * 0.9)
      if (alpha < 0.008) continue
      if (tile.grass) {
        ctx.globalAlpha = Math.min(1, tile.fade * 2.5)
        this.box(tile.x + 0.045, tile.y + 0.045, -0.15, 0.91, 0.91, 0.145, tile.variation > 0.65 ? 'grassLight' : 'grass', palette)
        if (tile.variation > 0.8) {
          ctx.globalAlpha = tile.fade * 0.55
          this.box(tile.x + 0.14, tile.y + 0.14, 0.001, 0.15, 0.18, 0.04, 'grassTuft', palette)
        }
      }
      ctx.globalAlpha = 1
      const fill = `rgba(${ground.fill},${tile.gridFade * ground.fillGrid + light * ground.fillLight})`
      const stroke = `rgba(${ground.stroke},${alpha * ground.strokeAlpha})`
      this.polygon([
        this.project(tile.x, tile.y), this.project(tile.x + 1, tile.y),
        this.project(tile.x + 1, tile.y + 1), this.project(tile.x, tile.y + 1),
      ], fill, stroke)
    }
  }

  /** Island shadows, then every object back to front; objects using `highlight` are lit up. */
  private drawObjects(palette: Palette, highlight?: string) {
    const ctx = this.target, unit = this.unit
    for (const island of this.world.islands) {
      const point = this.project(island.x, island.y), radius = island.radius * unit * 0.72
      ctx.save()
      ctx.translate(point.x + unit * 0.5, point.y + unit * 0.15)
      ctx.scale(1, 0.48)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      gradient.addColorStop(0, palette.shadow.center)
      gradient.addColorStop(1, palette.shadow.edge)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    const lit = highlight ? new Set(this.world.objects.filter((object) => object.link === highlight).map((object) => object.id)) : null
    const bright = { ...palette, light: { box: palette.light.box * 1.13, pine: palette.light.pine * 1.13 } }
    for (const item of this.world.geometry) {
      const paint = lit?.has(item.owner) ? bright : palette
      if (item.kind === 'pine') this.drawPine(item, paint)
      else this.box(item.x, item.y, item.z, item.width, item.depth, item.height, item.paint, paint, item.faces)
    }
  }

  private drawFocusRing(palette: Palette, link: string) {
    const shape = this.linkOutline(link)
    if (!shape) return
    const ctx = this.context, pad = 6, { outline } = shape
    // Push the hull outward a little so the ring clears the object's edges.
    const cx = outline.reduce((sum, point) => sum + point.x, 0) / outline.length
    const cy = outline.reduce((sum, point) => sum + point.y, 0) / outline.length
    ctx.save()
    ctx.beginPath()
    outline.forEach((point, index) => {
      const length = Math.hypot(point.x - cx, point.y - cy) || 1
      const x = point.x + (point.x - cx) / length * pad, y = point.y + (point.y - cy) / length * pad
      if (index) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    })
    ctx.closePath()
    ctx.lineJoin = 'round'
    ctx.lineWidth = 5
    ctx.strokeStyle = palette.focusRing.halo
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = palette.focusRing.color
    ctx.stroke()
    ctx.restore()
  }

  /**
   * Redraws the ground within reach of the pointer light. Tiles farther away are unlit, so they
   * match the cached ground; inside the clip every tile touching it is repainted in order.
   */
  private relight(palette: Palette, pointer: Point) {
    const ctx = this.context, unit = this.unit, dpr = this.dpr
    // Lit tiles have centers within 3.9 units of the pointer and extend about one unit beyond.
    const reach = unit * 5
    const left = Math.floor((pointer.x - reach) * dpr) / dpr, top = Math.floor((pointer.y - reach) * dpr) / dpr
    const right = Math.ceil((pointer.x + reach) * dpr) / dpr, bottom = Math.ceil((pointer.y + reach) * dpr) / dpr
    const margin = unit * 1.25
    const tiles = this.visibleTiles.filter((tile) => {
      const center = this.project(tile.x + 0.5, tile.y + 0.5)
      return center.x > left - margin && center.x < right + margin && center.y > top - margin && center.y < bottom + margin
    })
    ctx.save()
    ctx.beginPath()
    ctx.rect(left, top, right - left, bottom - top)
    ctx.clip()
    ctx.clearRect(left, top, right - left, bottom - top)
    this.drawGround(palette, pointer, tiles)
    ctx.restore()
  }

  /** Pollen in daylight; palettes with a glow turn it into fireflies. */
  private drawFireflies(palette: Palette, seconds: number) {
    const ctx = this.context, firefly = palette.firefly, t = seconds * 0.25
    for (const fly of this.world.fireflies) {
      const point = this.project(fly.x + Math.sin(t + fly.phase) * 0.3, fly.y + Math.cos(t + fly.phase) * 0.25, fly.z + Math.sin(t * 1.8 + fly.phase) * 0.25)
      ctx.globalAlpha = 0.2 + (Math.sin(t * 3 + fly.phase) + 1) * 0.22
      ctx.fillStyle = firefly.color
      if (firefly.glow) { ctx.shadowBlur = firefly.glow.blur; ctx.shadowColor = firefly.glow.color }
      ctx.fillRect(point.x, point.y, firefly.size, firefly.size)
      ctx.shadowBlur = 0
    }
  }

  /** Leaves tumble down from the oaks, settle on the grass, and fade. */
  private drawLeaves(palette: Palette, seconds: number) {
    const ctx = this.context, leaves = palette.swatches.leaves, size = Math.max(2.2, this.unit * 0.13)
    for (const leaf of this.world.leaves) {
      const at = leafAt(leaf, seconds), point = this.project(at.x, at.y, at.z)
      // Tumbling: the leaf narrows as it turns edge-on, and darkens on its underside.
      const turn = Math.cos(at.tumble), width = size * Math.max(0.25, Math.abs(turn)), height = size * 0.62
      const tilt = Math.sin(at.tumble * 0.5) * 0.6, cos = Math.cos(tilt), sin = Math.sin(tilt)
      const corner = (dx: number, dy: number) => ({ x: point.x + dx * cos - dy * sin, y: point.y + dx * sin + dy * cos })
      ctx.globalAlpha = Math.max(0, at.alpha)
      this.polygon([corner(-width, 0), corner(0, -height), corner(width, 0), corner(0, height)],
        shade(leaves[leaf.shade % leaves.length], palette.light.box * (turn > 0 ? 1.05 : 0.8)))
    }
  }

  /** Snow drifts down and melts away at the ground. */
  private drawSnow(palette: Palette, seconds: number) {
    // Flakes use the particle color: white vanishes against a pale daylight background.
    const ctx = this.context
    ctx.fillStyle = palette.firefly.color
    for (const flake of this.world.flakes) {
      const at = flakeAt(flake, seconds), point = this.project(at.x, at.y, at.z)
      ctx.globalAlpha = 0.85 * at.alpha
      ctx.fillRect(point.x - flake.size / 2, point.y - flake.size / 2, flake.size, flake.size)
    }
  }

  /** Flowers spring up on open grass, bloom, and fade before sprouting somewhere else. */
  private drawBlooms(palette: Palette, seconds: number) {
    const ctx = this.context
    for (const bloom of this.world.blooms) {
      const at = bloomAt(bloom, seconds, this.world.bloomSpots)
      if (!at || at.alpha <= 0) continue
      const s = at.scale, stem = 0.5 * s * at.stem
      ctx.globalAlpha = at.alpha
      if (stem > 0.01) this.box(at.x, at.y, 0.02, 0.07, 0.07, stem, 'stem', palette)
      if (at.stem > 0.6) this.box(at.x - 0.15 * s, at.y, 0.16 * s, 0.18 * s * at.stem, 0.1 * s, 0.1 * s, 'plantLeaf', palette)
      if (at.head > 0) {
        const head = 0.24 * s * at.head
        this.box(at.x + 0.035 - head / 2, at.y + 0.035 - head / 2, stem, head, head, head * 0.7, { swatch: 'flowers', index: at.flower }, palette)
      }
    }
  }

  render(time: number, palette: Palette, reducedMotion: boolean) {
    const ctx = this.context, unit = this.unit, layers = this.layers
    ctx.clearRect(0, 0, this.width, this.height)
    if (layers.ground?.palette !== palette) layers.ground = this.layer(palette, () => this.drawGround(palette, null))
    this.blit(layers.ground)
    if (this.pointer) this.relight(palette, this.pointer)
    const highlight = this.highlight
    if (highlight) {
      // A second cached copy of the objects with the linked ones lit, rebuilt only when that changes.
      if (layers.highlighted?.palette !== palette || layers.highlighted.highlight !== highlight.link) {
        layers.highlighted = { ...this.layer(palette, () => this.drawObjects(palette, highlight.link)), highlight: highlight.link }
      }
      this.blit(layers.highlighted)
      if (highlight.ring) this.drawFocusRing(palette, highlight.link)
    } else {
      if (layers.objects?.palette !== palette) layers.objects = this.layer(palette, () => this.drawObjects(palette))
      this.blit(layers.objects)
    }

    // Seasonal effect over everything; reduced motion freezes it at t = 0.
    const seconds = reducedMotion ? 0 : time / 1000
    const live = palette.live ?? 'fireflies'
    if (live === 'fireflies') this.drawFireflies(palette, seconds)
    else if (live === 'leaves') this.drawLeaves(palette, seconds)
    else if (live === 'snow') this.drawSnow(palette, seconds)
    else this.drawBlooms(palette, seconds)
    ctx.globalAlpha = 1
    if (this.pointer) {
      const { x, y } = this.pointer
      const radius = unit * 2.2
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, palette.pointerGlow.center)
      gradient.addColorStop(1, palette.pointerGlow.edge)
      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    this.afterRender?.(ctx)
  }
}
