import { buildWorld } from './objects.ts'
import type { Faces, GardenConfig, Paint, Palette, PineLayer, Point, Tile, World } from './types.ts'

const allFaces: Faces = { top: true, left: true, right: true }

function shade(hex: string, factor = 1) {
  const color = parseInt(hex.slice(1), 16)
  const channel = (value: number) => Math.min(255, value * factor) | 0
  return `rgb(${channel(color >> 16)},${channel((color >> 8) & 255)},${channel(color & 255)})`
}

/** Canvas renderer for a garden built from config; no event listeners or React state. */
export class GardenScene {
  private context: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private world: World
  private visibleTiles: Tile[] = []
  private width = 0
  private height = 0
  private unit = 1
  private origin: Point = { x: 0, y: 0 }
  private pointer: Point | null = null

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, config: GardenConfig) {
    this.canvas = canvas
    this.context = context
    this.world = buildWorld(config)
  }

  private project(x: number, y: number, z = 0): Point {
    return {
      x: this.origin.x + (x - y) * this.unit,
      y: this.origin.y + (x + y) * this.unit * 0.5 - z * this.unit * 1.05,
    }
  }

  private polygon(points: Point[], fill?: string, stroke?: string) {
    const ctx = this.context
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
    if (faces.top) this.polygon([a, b, c, d], shade(color, 1.09 * dim))
  }

  private drawPine(layer: PineLayer, palette: Palette) {
    const { x, y, z, radius, height, tip: lean } = layer
    const a = this.project(x - radius, y - radius, z)
    const b = this.project(x + radius, y - radius, z)
    const c = this.project(x + radius, y + radius, z)
    const d = this.project(x - radius, y + radius, z)
    const tip = this.project(x + lean.x, y + lean.y, z + height)
    const dim = palette.light.pine, [backLeft, backRight, frontRight, frontLeft] = palette.swatches.pine
    this.polygon([a, b, tip], shade(backLeft, dim))
    this.polygon([b, c, tip], shade(backRight, dim))
    this.polygon([c, d, tip], shade(frontRight, dim))
    this.polygon([d, a, tip], shade(frontLeft, dim))
  }

  resize() {
    // CSS layout dimensions are independent of the scroll-driven transform.
    this.width = this.canvas.clientWidth
    this.height = this.canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.unit = Math.min(this.width / (this.width <= 680 ? 22.5 : 26), this.height / 20, 56)
    this.origin = { x: this.width * 0.48, y: this.height * 0.59 + this.unit * 0.3 }
    this.visibleTiles = this.world.tiles.filter((tile) => {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      return point.x >= -this.unit && point.x <= this.width + this.unit && point.y >= -this.unit && point.y <= this.height + this.unit
    })
  }

  setPointer(point: Point | null) { this.pointer = point }

  render(time: number, palette: Palette, reducedMotion: boolean) {
    const ctx = this.context, unit = this.unit, ground = palette.ground
    ctx.clearRect(0, 0, this.width, this.height)
    for (const tile of this.visibleTiles) {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      const light = this.pointer ? Math.max(0, 1 - Math.hypot(point.x - this.pointer.x, point.y - this.pointer.y) / (unit * 3.9)) : 0
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
  }
}
