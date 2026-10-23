/**
 * Seasonal effects drawn live over the cached garden: falling leaves, snow, and blooming flowers.
 * Each particle is a pure function of time, so reduced motion simply freezes it at t = 0, and
 * each cycle re-rolls where it appears from a hash of its seed and cycle number.
 */
import { insidePolygon, silhouette, type Project } from './outline.ts'
import { createRandom } from './random.ts'
import type { Bloom, Box, Flake, GardenConfig, Geometry, Leaf, PlacedObject, Point, Tile } from './types.ts'

/** A stable [0, 1) value for cycle `n` of a particle. */
export function cycleRandom(seed: number, n: number, salt = 0) {
  let h = Math.imul(seed ^ Math.imul(n + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35), 0x27d4eb2f)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return (h >>> 0) / 4294967296
}

const fraction = (value: number) => value - Math.floor(value)

/** Leaves fall from oak canopies, weighted toward bigger trees. */
function buildLeaves(config: GardenConfig, objects: PlacedObject[]): Leaf[] {
  const { count = 0, seed = 1 } = config.leaves ?? {}
  const scales = new Map(config.objects.map((object) => [object.id, 'scale' in object ? object.scale ?? 1 : 1]))
  const sources = objects.filter((object) => object.type === 'oak').map((object) => {
    const scale = scales.get(object.id) ?? 1
    return { x: object.x, y: object.y, radius: 2.6 * scale, height: 6.2 * scale }
  })
  if (!sources.length) return []
  const total = sources.reduce((sum, source) => sum + source.radius ** 2, 0), random = createRandom(seed)
  return Array.from({ length: count }, () => {
    let pick = random() * total, source = sources[0]
    for (const candidate of sources) { source = candidate; if ((pick -= candidate.radius ** 2) <= 0) break }
    return { source, seed: Math.floor(random() * 2 ** 32), period: 7 + random() * 6, phase: random(), spin: 1.5 + random() * 2.5, shade: Math.floor(random() * 6) }
  })
}

function buildFlakes(config: GardenConfig): Flake[] {
  if (!config.snow) return []
  const { count, seed, area } = config.snow, random = createRandom(seed)
  return Array.from({ length: count }, () => ({
    x: area.x + random() * area.width, y: area.y + random() * area.depth, z: area.z + random() * area.height,
    seed: Math.floor(random() * 2 ** 32), period: 9 + random() * 8, phase: random(), size: 1.6 + random() * 1.6,
  }))
}

function buildBlooms(config: GardenConfig): Bloom[] {
  if (!config.blooms) return []
  const { count, seed } = config.blooms, random = createRandom(seed)
  return Array.from({ length: count }, () => ({ seed: Math.floor(random() * 2 ** 32), period: 8 + random() * 6, phase: random(), scale: 0.7 + random() * 0.5 }))
}

/** Screen position in tile units, matching the renderer's projection. */
const screen: Project = (x, y, z = 0) => ({ x: x - y, y: (x + y) / 2 - 1.05 * z })

/**
 * Grass tile centers where a flower can grow: well inside an island, not on top of anything, and
 * not hidden behind a shape drawn in front of it (live effects are drawn over the whole scene).
 */
function buildBloomSpots(tiles: Tile[], geometry: Geometry[]): Point[] {
  const bases = geometry.filter((item): item is Box => item.kind === 'box' && item.z < 0.1)
  // A shape can cover a spot if any part of it is nearer the camera: compare against its front corner.
  const shapes = geometry.map((item) => ({
    front: item.kind === 'box' ? item.x + item.width + item.y + item.depth : item.x + item.y + 2 * item.radius,
    outline: silhouette(item, screen),
  }))
  return tiles.filter((tile) => tile.grass && tile.fade > 0.25).map((tile) => ({ x: tile.x + 0.5, y: tile.y + 0.5 })).filter((spot) => {
    if (bases.some((box) => spot.x > box.x - 0.2 && spot.x < box.x + box.width + 0.2 && spot.y > box.y - 0.2 && spot.y < box.y + box.depth + 0.2)) return false
    // The whole flower, from stem base to the top of its head, must be in the clear.
    const points = [0, 0.3, 0.7].map((z) => screen(spot.x, spot.y, z)), depth = spot.x + spot.y
    return !shapes.some((shape) => shape.front > depth && points.some((point) => insidePolygon(point, shape.outline)))
  })
}

export function buildLive(config: GardenConfig, tiles: Tile[], geometry: Geometry[], objects: PlacedObject[]) {
  return { leaves: buildLeaves(config, objects), flakes: buildFlakes(config), blooms: buildBlooms(config), bloomSpots: config.blooms ? buildBloomSpots(tiles, geometry) : [] }
}

/** Where a leaf is at `seconds`: it falls for most of its cycle, then rests on the grass and fades. */
export function leafAt(leaf: Leaf, seconds: number) {
  const cycle = seconds / leaf.period + leaf.phase, n = Math.floor(cycle), f = cycle - n
  const angle = cycleRandom(leaf.seed, n, 1) * Math.PI * 2, distance = Math.sqrt(cycleRandom(leaf.seed, n, 2)) * leaf.source.radius
  const start = { x: leaf.source.x + Math.cos(angle) * distance, y: leaf.source.y + Math.sin(angle) * distance }
  const top = leaf.source.height * (0.55 + cycleRandom(leaf.seed, n, 3) * 0.45), falling = Math.min(1, f / 0.8)
  const sway = Math.sin(seconds * 1.4 + leaf.phase * 9) * 0.35 * (1 - falling * 0.6)
  return {
    x: start.x + falling * 0.9 + sway, y: start.y + falling * 0.5 - sway * 0.6, z: top * (1 - falling),
    alpha: f < 0.8 ? Math.min(1, f / 0.05) : 1 - (f - 0.8) / 0.2,
    tumble: falling < 1 ? seconds * leaf.spin + leaf.phase * 6 : 0,
  }
}

export function flakeAt(flake: Flake, seconds: number) {
  const f = fraction(seconds / flake.period + flake.phase)
  return {
    x: flake.x + Math.sin(seconds * 0.7 + flake.phase * 11) * 0.25 + f * 0.6,
    y: flake.y + Math.cos(seconds * 0.6 + flake.phase * 7) * 0.2 + f * 0.3,
    z: flake.z * (1 - f), alpha: Math.min(1, (1 - f) * 6) * Math.min(1, f * 12),
  }
}

/** A bloom's spot and stage: the stem grows, the head opens, it holds, then fades. */
export function bloomAt(bloom: Bloom, seconds: number, spots: Point[]) {
  if (!spots.length) return null
  const cycle = seconds / bloom.period + bloom.phase, n = Math.floor(cycle), f = cycle - n
  const spot = spots[Math.floor(cycleRandom(bloom.seed, n, 1) * spots.length)]
  const offset = { x: (cycleRandom(bloom.seed, n, 2) - 0.5) * 0.5, y: (cycleRandom(bloom.seed, n, 3) - 0.5) * 0.5 }
  const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
  return {
    x: spot.x + offset.x, y: spot.y + offset.y, scale: bloom.scale,
    stem: ease(f / 0.22), head: ease((f - 0.18) / 0.16), alpha: 1 - ease((f - 0.82) / 0.18),
    flower: Math.floor(cycleRandom(bloom.seed, n, 4) * 2),
  }
}
