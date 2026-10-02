type Point = { x: number; y: number }
type Anchor = Point & { radius: number }
type Faces = { top: boolean; left: boolean; right: boolean }
type Tile = Point & { fade: number; gridFade: number; variation: number; grass: boolean }
type Box = Point & {
  kind: 'box'
  z: number
  width: number
  depth: number
  height: number
  color: string
  faces: Faces
  order: number
}
type PineLayer = Point & { kind: 'pine'; z: number; radius: number; scale: number; order: number }
type Firefly = Point & { z: number; phase: number }

const allFaces: Faces = { top: true, left: true, right: true }
const leafColors = ['#819b4d', '#8ba352', '#91a957', '#789648', '#9ab15c', '#88a04c']
const anchors: Anchor[] = [
  { x: 0, y: 0, radius: 5.1 },
  { x: 5.9, y: -2.1, radius: 2.5 },
  { x: -4.9, y: 2.9, radius: 2.2 },
  { x: 3.3, y: 5.4, radius: 2.1 },
  { x: -5.2, y: -3.5, radius: 1.6 },
]

function shade(hex: string, factor = 1) {
  const color = parseInt(hex.slice(1), 16)
  const channel = (value: number) => Math.min(255, value * factor) | 0
  return `rgb(${channel(color >> 16)},${channel((color >> 8) & 255)},${channel(color & 255)})`
}

/** Pure canvas drawing and deterministic world generation; no event listeners or React state. */
export class GardenScene {
  private context: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private tiles: Tile[] = []
  private visibleTiles: Tile[] = []
  private geometry: (Box | PineLayer)[] = []
  private fireflies: Firefly[] = []
  private seed = 51
  private width = 0
  private height = 0
  private unit = 1
  private origin: Point = { x: 0, y: 0 }
  private pointer: Point | null = null

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.context = context
    this.build()
  }

  private random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 4294967296
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

  private box(
    x: number, y: number, z: number,
    width: number, depth: number, height: number,
    color: string, evening: boolean, faces = allFaces,
  ) {
    const a = this.project(x, y, z + height)
    const b = this.project(x + width, y, z + height)
    const c = this.project(x + width, y + depth, z + height)
    const d = this.project(x, y + depth, z + height)
    const b0 = this.project(x + width, y, z)
    const c0 = this.project(x + width, y + depth, z)
    const d0 = this.project(x, y + depth, z)
    const dim = evening ? 0.61 : 1
    if (faces.left) this.polygon([d, c, c0, d0], shade(color, 0.73 * dim))
    if (faces.right) this.polygon([b, c, c0, b0], shade(color, 0.88 * dim))
    if (faces.top) this.polygon([a, b, c, d], shade(color, 1.09 * dim))
  }

  private addBox(
    x: number, y: number, z: number,
    width: number, depth: number, height: number, color: string, faces = allFaces,
  ) {
    this.geometry.push({ kind: 'box', x, y, z, width, depth, height, color, faces, order: x + y + z * 0.8 })
  }

  private oak(x: number, y: number, scale = 1) {
    const trunk = '#96704b'
    this.addBox(x - 0.33 * scale, y - 0.3 * scale, 0.04, 0.66 * scale, 0.6 * scale, 4.45 * scale, trunk)
    this.addBox(x - 0.62 * scale, y - 0.49 * scale, 0.02, 1.1 * scale, 0.9 * scale, 0.35 * scale, '#896844')
    for (let i = 0; i < 3; i++) {
      this.addBox(x - (0.58 + i * 0.43) * scale, y - 0.1 * scale, (2.2 + i * 0.55) * scale, 0.6 * scale, 0.46 * scale, 0.7 * scale, trunk)
      this.addBox(x + 0.2 * scale, y - (0.5 + i * 0.4) * scale, (2.65 + i * 0.5) * scale, 0.5 * scale, 0.62 * scale, 0.7 * scale, '#9e7951')
    }

    // Overlapping ellipsoids form a broad oak canopy. Only exposed voxel faces are drawn.
    const voxels = new Map<string, { x: number; y: number; z: number }>()
    const voxelSize = 0.66 * scale
    for (let ix = -5; ix <= 5; ix++) {
      for (let iy = -5; iy <= 5; iy++) {
        for (let iz = 0; iz < 6; iz++) {
          const xx = ix * 0.66, yy = iy * 0.66, zz = iz * 0.66
          const main = xx ** 2 / 9 + yy ** 2 / 7.9 + (zz - 1.65) ** 2 / 4.3 < 1
          const left = (xx + 2.05) ** 2 / 3.2 + (yy - 0.2) ** 2 / 4 + (zz - 1.05) ** 2 / 2.1 < 1
          const right = (xx - 1.9) ** 2 / 2.8 + (yy + 0.5) ** 2 / 3.3 + (zz - 1.25) ** 2 / 2.6 < 1
          if ((main || left || right) && this.random() > 0.045) voxels.set(`${ix},${iy},${iz}`, { x: ix, y: iy, z: iz })
        }
      }
    }
    for (const { x: ix, y: iy, z: iz } of voxels.values()) {
      const faces = {
        top: !voxels.has(`${ix},${iy},${iz + 1}`),
        left: !voxels.has(`${ix},${iy + 1},${iz}`),
        right: !voxels.has(`${ix + 1},${iy},${iz}`),
      }
      if (!faces.top && !faces.left && !faces.right) continue
      this.addBox(x + ix * voxelSize, y + iy * voxelSize, (4.1 + iz * 0.66) * scale,
        voxelSize, voxelSize, voxelSize, leafColors[Math.floor(this.random() * leafColors.length)], faces)
    }
  }

  private pine(x: number, y: number, scale: number) {
    this.addBox(x - 0.12, y - 0.12, 0, 0.24, 0.24, scale, '#967652')
    for (let i = 0; i < 4; i++) {
      const z = (0.65 + i * 0.6) * scale
      this.geometry.push({ kind: 'pine', x, y, z, scale, radius: (1.2 - i * 0.23) * scale, order: x + y + z * 0.8 })
    }
  }

  private drawPine(layer: PineLayer, evening: boolean) {
    const { x, y, z, radius, scale } = layer
    const a = this.project(x - radius, y - radius, z)
    const b = this.project(x + radius, y - radius, z)
    const c = this.project(x + radius, y + radius, z)
    const d = this.project(x - radius, y + radius, z)
    const tip = this.project(x - 0.07, y - 0.07, z + 1.6 * scale)
    const dim = evening ? 0.64 : 1
    this.polygon([a, b, tip], shade('#819d6a', dim))
    this.polygon([b, c, tip], shade('#668650', dim))
    this.polygon([c, d, tip], shade('#527446', dim))
    this.polygon([d, a, tip], shade('#72975d', dim))
  }

  private plant(x: number, y: number, scale: number, flower: boolean) {
    this.addBox(x, y, 0.04, 0.075, 0.075, 0.55 * scale, '#698250')
    this.addBox(x - 0.18 * scale, y, 0.17 * scale, 0.22 * scale, 0.12 * scale, 0.12 * scale, '#8eaa66')
    this.addBox(x + 0.03, y - 0.14 * scale, 0.28 * scale, 0.15 * scale, 0.23 * scale, 0.13 * scale, '#779858')
    if (flower) this.addBox(x - 0.08, y - 0.07, 0.52 * scale, 0.23 * scale, 0.23 * scale, 0.17 * scale, this.random() > 0.5 ? '#dfc17a' : '#ece2b7')
  }

  private rock(x: number, y: number, scale: number) {
    this.addBox(x, y, 0.01, scale, scale * 0.72, scale * 0.51, '#b2b5a1')
    this.addBox(x + scale * 0.18, y + scale * 0.08, scale * 0.51, scale * 0.64, scale * 0.55, scale * 0.12, '#c0c2af')
  }

  private build() {
    for (let x = -45; x <= 45; x++) {
      for (let y = -45; y <= 45; y++) {
        let influence = 0, gridInfluence = 0
        for (const anchor of anchors) {
          const dx = x + 0.5 - anchor.x, dy = y + 0.5 - anchor.y
          influence = Math.max(influence, Math.max(0, 1 - Math.hypot(dx, dy) / anchor.radius))
          // Measure in screen space so each grid fade is circular, not an isometric ellipse.
          gridInfluence = Math.max(gridInfluence, Math.max(0, 1 - Math.hypot(dx - dy, (dx + dy) * 0.5) / (anchor.radius * 1.4)))
        }
        const variation = this.random()
        this.tiles.push({ x, y, fade: influence ** 1.45, gridFade: gridInfluence ** 1.8, variation, grass: influence > 0.38 && variation > 0.13 })
      }
    }
    this.oak(0, 0)
    this.pine(5.9, -2.1, 0.86)
    this.pine(7, -1.4, 0.49)
    this.pine(-4.9, 2.9, 0.66)
    this.oak(3.6, 5.4, 0.24)
    for (let i = 0; i < 44; i++) {
      const anchor = anchors[Math.floor(this.random() * anchors.length)]
      const angle = this.random() * Math.PI * 2, radius = 0.8 + this.random() * anchor.radius * 0.48
      const x = anchor.x + Math.cos(angle) * radius, y = anchor.y + Math.sin(angle) * radius
      if (Math.hypot(x, y) >= 1.1) this.plant(x, y, 0.5 + this.random() * 0.5, i % 3 === 0)
    }
    this.rock(-2, 1.7, 0.46)
    this.rock(-2.3, 1.95, 0.27)
    this.rock(4.4, -2.2, 0.4)
    this.rock(-5, -3.5, 0.6)
    this.rock(-4.45, -3.4, 0.32)
    // Stepping stones and a bench beneath the oak.
    for (let i = 0; i < 5; i++) this.addBox(1.3 + i * 0.35, 1.5 + i * 0.48, 0.035, 0.57, 0.48, 0.055, i % 2 ? '#c5bf9e' : '#d1c8a7')
    this.addBox(-1.9, 2.1, 0.03, 0.14, 0.18, 0.45, '#8b7050')
    this.addBox(-0.9, 2.1, 0.03, 0.14, 0.18, 0.45, '#8b7050')
    this.addBox(-2, 1.95, 0.48, 1.32, 0.46, 0.14, '#b69869')
    this.addBox(-2, 2.33, 0.65, 1.32, 0.1, 0.35, '#a78c61')
    this.geometry.sort((a, b) => a.order - b.order)
    for (let i = 0; i < 18; i++) this.fireflies.push({ x: this.random() * 13 - 6.5, y: this.random() * 10 - 4, z: 0.4 + this.random() * 4, phase: this.random() * Math.PI * 2 })
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
    this.visibleTiles = this.tiles.filter((tile) => {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      return point.x >= -this.unit && point.x <= this.width + this.unit && point.y >= -this.unit && point.y <= this.height + this.unit
    })
  }

  setPointer(point: Point | null) { this.pointer = point }

  render(time: number, evening: boolean, reducedMotion: boolean) {
    const ctx = this.context, unit = this.unit
    ctx.clearRect(0, 0, this.width, this.height)
    for (const tile of this.visibleTiles) {
      const point = this.project(tile.x + 0.5, tile.y + 0.5)
      const light = this.pointer ? Math.max(0, 1 - Math.hypot(point.x - this.pointer.x, point.y - this.pointer.y) / (unit * 3.9)) : 0
      const alpha = Math.max(tile.gridFade * 0.85, light * 0.9)
      if (alpha < 0.008) continue
      if (tile.grass) {
        ctx.globalAlpha = Math.min(1, tile.fade * 2.5)
        this.box(tile.x + 0.045, tile.y + 0.045, -0.15, 0.91, 0.91, 0.145, tile.variation > 0.65 ? '#b3c391' : '#a6ba83', evening)
        if (tile.variation > 0.8) {
          ctx.globalAlpha = tile.fade * 0.55
          this.box(tile.x + 0.14, tile.y + 0.14, 0.001, 0.15, 0.18, 0.04, '#c8d3a4', evening)
        }
      }
      ctx.globalAlpha = 1
      const fill = evening ? `rgba(167,204,114,${tile.gridFade * 0.055 + light * 0.1})` : `rgba(148,175,109,${tile.gridFade * 0.06 + light * 0.11})`
      const stroke = evening ? `rgba(195,224,145,${alpha * 0.45})` : `rgba(123,151,87,${alpha * 0.43})`
      this.polygon([
        this.project(tile.x, tile.y), this.project(tile.x + 1, tile.y),
        this.project(tile.x + 1, tile.y + 1), this.project(tile.x, tile.y + 1),
      ], fill, stroke)
    }

    for (const anchor of anchors) {
      const point = this.project(anchor.x, anchor.y), radius = anchor.radius * unit * 0.72
      ctx.save()
      ctx.translate(point.x + unit * 0.5, point.y + unit * 0.15)
      ctx.scale(1, 0.48)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      gradient.addColorStop(0, evening ? '#071b2459' : '#4a643630')
      gradient.addColorStop(1, '#4a643600')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    for (const item of this.geometry) {
      if (item.kind === 'pine') this.drawPine(item, evening)
      else this.box(item.x, item.y, item.z, item.width, item.depth, item.height, item.color, evening, item.faces)
    }

    // Pollen becomes softly glowing fireflies in evening mode.
    for (const fly of this.fireflies) {
      const t = reducedMotion ? 0 : time * 0.00025
      const point = this.project(fly.x + Math.sin(t + fly.phase) * 0.3, fly.y + Math.cos(t + fly.phase) * 0.25, fly.z + Math.sin(t * 1.8 + fly.phase) * 0.25)
      ctx.globalAlpha = 0.2 + (Math.sin(t * 3 + fly.phase) + 1) * 0.22
      ctx.fillStyle = evening ? '#e7efb0' : '#a4b576'
      if (evening) { ctx.shadowBlur = 9; ctx.shadowColor = '#e4f7a6' }
      ctx.fillRect(point.x, point.y, evening ? 2.3 : 1.7, evening ? 2.3 : 1.7)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1
    if (this.pointer) {
      const { x, y } = this.pointer
      const radius = unit * 2.2
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, evening ? '#dff9a816' : '#dce9aa14')
      gradient.addColorStop(1, '#dce9aa00')
      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
  }
}
