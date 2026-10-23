import { buildWorld } from './objects.ts'
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

type Layer = { canvas: HTMLCanvasElement; palette: Palette }

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
  private layers: { ground?: Layer; objects?: Layer } = {}
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
    if (faces.top) this.polygon([a, b, c, d], shade(palette.snow ? mix(color, palette.snow.color, palette.snow.cover) : color, 1.09 * dim))
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
    this.cullTiles()
    this.invalidate()
  }

  /** Drops the cached layers, e.g. after a palette was edited in place. */
  invalidate() { this.layers = {} }

  setPointer(point: Point | null) { this.pointer = point }

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

  /** Island shadows, then every object back to front. */
  private drawObjects(palette: Palette) {
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
    for (const item of this.world.geometry) {
      if (item.kind === 'pine') this.drawPine(item, palette)
      else this.box(item.x, item.y, item.z, item.width, item.depth, item.height, item.paint, palette, item.faces)
    }
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

  render(time: number, palette: Palette, reducedMotion: boolean) {
    const ctx = this.context, unit = this.unit, layers = this.layers
    ctx.clearRect(0, 0, this.width, this.height)
    if (layers.ground?.palette !== palette) layers.ground = this.layer(palette, () => this.drawGround(palette, null))
    if (layers.objects?.palette !== palette) layers.objects = this.layer(palette, () => this.drawObjects(palette))
    this.blit(layers.ground)
    if (this.pointer) this.relight(palette, this.pointer)
    this.blit(layers.objects)

    // Pollen in daylight; palettes with a glow turn it into fireflies.
    const firefly = palette.firefly
    for (const fly of this.world.fireflies) {
      const t = reducedMotion ? 0 : time * 0.00025
      const point = this.project(fly.x + Math.sin(t + fly.phase) * 0.3, fly.y + Math.cos(t + fly.phase) * 0.25, fly.z + Math.sin(t * 1.8 + fly.phase) * 0.25)
      ctx.globalAlpha = 0.2 + (Math.sin(t * 3 + fly.phase) + 1) * 0.22
      ctx.fillStyle = firefly.color
      if (firefly.glow) { ctx.shadowBlur = firefly.glow.blur; ctx.shadowColor = firefly.glow.color }
      ctx.fillRect(point.x, point.y, firefly.size, firefly.size)
      ctx.shadowBlur = 0
    }
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
