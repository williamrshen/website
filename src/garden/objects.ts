import { buildLive } from './live.ts'
import { createRandom, seedFromId, type Random } from './random.ts'
import type {
  Faces, GardenConfig, GardenObject, Geometry, Island, ObjectParams, ObjectType, Orientation, Paint, PlacedObject, Point, Tile, World,
} from './types.ts'

const allFaces: Faces = { top: true, left: true, right: true }

/** Row-major 2×2 signed permutation matrix mapping local (x, y) to world (x, y). */
type Matrix = readonly [number, number, number, number]
const identity: Matrix = [1, 0, 0, 1]
const quarterTurns: Record<number, Matrix> = {
  0: identity,
  // Clockwise on screen: local +x (lower right) turns toward +y (lower left).
  90: [0, -1, 1, 0],
  180: [-1, 0, 0, -1],
  270: [0, 1, -1, 0],
}
/** Swapping x and y flips the scene left↔right on screen. */
const mirrored: Matrix = [0, 1, 1, 0]

const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
]
const apply = (m: Matrix, p: Point): Point => ({ x: m[0] * p.x + m[1] * p.y, y: m[2] * p.x + m[3] * p.y })

function orientation(owner: string, { rotate = 0, mirror = false }: Orientation): Matrix {
  const turn = quarterTurns[rotate]
  if (!turn) throw new Error(`Garden object "${owner}" has rotate ${rotate}; use 0, 90, 180, or 270`)
  return mirror ? multiply(turn, mirrored) : turn
}

/**
 * One world axis of a transformed box. Exactly one of `along`/`across` is ±1, selecting which
 * local axis maps onto this world axis and whether it is reversed.
 */
function span(along: number, across: number, x: number, width: number, y: number, depth: number) {
  if (along) return along > 0 ? { min: x, size: width } : { min: -(x + width), size: width }
  return across > 0 ? { min: y, size: depth } : { min: -(y + depth), size: depth }
}

/**
 * What an object builder draws with. Coordinates are local to the object's position, in world
 * units (one ground tile = 1); z is height above the ground.
 */
export type Builder = {
  /** This object's own random generator. */
  random: Random
  /** Island centers in this object's local coordinates. */
  islands: readonly Island[]
  /**
   * Local directions that end up facing the camera's right (+x) and left (+y) sides. Use them
   * when hiding covered faces, so culling stays correct after rotating or mirroring.
   */
  facing: { right: Point; left: Point }
  box(x: number, y: number, z: number, width: number, depth: number, height: number, paint: Paint, faces?: Faces): void
  /** A pine tier centered at (x, y), `height` tall from base to tip. */
  pineLayer(x: number, y: number, z: number, radius: number, height: number): void
  /** Places another object type at a local position, sharing this object's random generator. */
  place<K extends ObjectType>(type: K, params: ObjectParams[K] & Partial<Point> & Orientation): void
}

type ObjectBuilder<K extends ObjectType> = (builder: Builder, params: ObjectParams[K]) => void

/** Number of leaf shades the oak picks between; palettes with fewer entries wrap. */
const leafShades = 6

/** Registry of object types. Each builder only describes shapes; placement is handled for it. */
export const objectTypes: { [K in ObjectType]: ObjectBuilder<K> } = {
  oak(b, { scale = 1 }) {
    b.box(-0.33 * scale, -0.3 * scale, 0.04, 0.66 * scale, 0.6 * scale, 4.45 * scale, 'trunk')
    b.box(-0.62 * scale, -0.49 * scale, 0.02, 1.1 * scale, 0.9 * scale, 0.35 * scale, 'trunkBase')
    for (let i = 0; i < 3; i++) {
      b.box(-(0.58 + i * 0.43) * scale, -0.1 * scale, (2.2 + i * 0.55) * scale, 0.6 * scale, 0.46 * scale, 0.7 * scale, 'trunk')
      b.box(0.2 * scale, -(0.5 + i * 0.4) * scale, (2.65 + i * 0.5) * scale, 0.5 * scale, 0.62 * scale, 0.7 * scale, 'branch')
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
          if ((main || left || right) && b.random() > 0.045) voxels.set(`${ix},${iy},${iz}`, { x: ix, y: iy, z: iz })
        }
      }
    }
    const { left, right } = b.facing
    for (const { x: ix, y: iy, z: iz } of voxels.values()) {
      const faces = {
        top: !voxels.has(`${ix},${iy},${iz + 1}`),
        left: !voxels.has(`${ix + left.x},${iy + left.y},${iz}`),
        right: !voxels.has(`${ix + right.x},${iy + right.y},${iz}`),
      }
      if (!faces.top && !faces.left && !faces.right) continue
      b.box(ix * voxelSize, iy * voxelSize, (4.1 + iz * 0.66) * scale,
        voxelSize, voxelSize, voxelSize, { swatch: 'leaves', index: Math.floor(b.random() * leafShades) }, faces)
    }
  },

  pine(b, { scale }) {
    b.box(-0.12, -0.12, 0, 0.24, 0.24, scale, 'pineTrunk')
    for (let i = 0; i < 4; i++) b.pineLayer(0, 0, (0.65 + i * 0.6) * scale, (1.2 - i * 0.23) * scale, 1.6 * scale)
  },

  plant(b, { scale = 1, flower = false }) {
    b.box(0, 0, 0.04, 0.075, 0.075, 0.55 * scale, 'stem')
    b.box(-0.18 * scale, 0, 0.17 * scale, 0.22 * scale, 0.12 * scale, 0.12 * scale, 'plantLeaf')
    b.box(0.03, -0.14 * scale, 0.28 * scale, 0.15 * scale, 0.23 * scale, 0.13 * scale, 'plantLeafDark')
    if (flower) b.box(-0.08, -0.07, 0.52 * scale, 0.23 * scale, 0.23 * scale, 0.17 * scale, { swatch: 'flowers', index: b.random() > 0.5 ? 0 : 1 })
  },

  rock(b, { scale }) {
    b.box(0, 0, 0.01, scale, scale * 0.72, scale * 0.51, 'rock')
    b.box(scale * 0.18, scale * 0.08, scale * 0.51, scale * 0.64, scale * 0.55, scale * 0.12, 'rockTop')
  },

  path(b, { stones, step }) {
    for (let i = 0; i < stones; i++) b.box(i * step.x, i * step.y, 0.035, 0.57, 0.48, 0.055, { swatch: 'path', index: i % 2 })
  },

  bench(b) {
    b.box(0.1, 0.15, 0.03, 0.14, 0.18, 0.45, 'benchLeg')
    b.box(1.1, 0.15, 0.03, 0.14, 0.18, 0.45, 'benchLeg')
    b.box(0, 0, 0.48, 1.32, 0.46, 0.14, 'benchSeat')
    b.box(0, 0.38, 0.65, 1.32, 0.1, 0.35, 'benchBack')
  },

  scatter(b, { count, flowerEvery, clearRadius }) {
    for (let i = 0; i < count; i++) {
      const island = b.islands[Math.floor(b.random() * b.islands.length)]
      const angle = b.random() * Math.PI * 2, radius = 0.8 + b.random() * island.radius * 0.48
      const x = island.x + Math.cos(angle) * radius, y = island.y + Math.sin(angle) * radius
      if (Math.hypot(x, y) >= clearRadius) b.place('plant', { x, y, scale: 0.5 + b.random() * 0.5, flower: i % flowerEvery === 0 })
    }
  },
}

/** Pine tiers lean slightly toward the back of an unrotated object. */
const pineLean: Point = { x: -0.07, y: -0.07 }

function createBuilder(
  owner: string, origin: Point, m: Matrix, random: Random, islands: Island[], geometry: Geometry[],
): Builder {
  // The inverse of a signed permutation is its transpose.
  const inverse: Matrix = [m[0], m[2], m[1], m[3]]
  return {
    random,
    islands: islands.map((island) => ({ ...island, ...apply(inverse, { x: island.x - origin.x, y: island.y - origin.y }) })),
    facing: { right: { x: m[0], y: m[1] }, left: { x: m[2], y: m[3] } },
    box(x, y, z, width, depth, height, paint, faces = allFaces) {
      const sx = span(m[0], m[1], x, width, y, depth), sy = span(m[2], m[3], x, width, y, depth)
      const wx = origin.x + sx.min, wy = origin.y + sy.min
      geometry.push({ kind: 'box', owner, x: wx, y: wy, z, width: sx.size, depth: sy.size, height, paint, faces, order: wx + wy + z * 0.8 })
    },
    pineLayer(x, y, z, radius, height) {
      const center = apply(m, { x, y }), wx = origin.x + center.x, wy = origin.y + center.y
      geometry.push({ kind: 'pine', owner, x: wx, y: wy, z, radius, height, tip: apply(m, pineLean), order: wx + wy + z * 0.8 })
    },
    place(type, { x = 0, y = 0, rotate, mirror, ...params }) {
      const offset = apply(m, { x, y })
      const child = createBuilder(owner, { x: origin.x + offset.x, y: origin.y + offset.y },
        multiply(m, orientation(owner, { rotate, mirror })), random, islands, geometry)
      ;(objectTypes[type] as ObjectBuilder<typeof type>)(child, params as ObjectParams[typeof type])
    },
  }
}

function position(object: GardenObject, islands: Map<string, Island>): Point {
  const x = object.x ?? 0, y = object.y ?? 0
  if (object.island === undefined) return { x, y }
  const island = islands.get(object.island)
  if (!island) throw new Error(`Garden object "${object.id}" is on unknown island "${object.island}"`)
  return { x: island.x + x, y: island.y + y }
}

function buildGround({ ground, islands }: GardenConfig): Tile[] {
  const random = createRandom(ground.seed), tiles: Tile[] = []
  for (let x = -ground.extent; x <= ground.extent; x++) {
    for (let y = -ground.extent; y <= ground.extent; y++) {
      let influence = 0, gridInfluence = 0
      for (const island of islands) {
        const dx = x + 0.5 - island.x, dy = y + 0.5 - island.y
        influence = Math.max(influence, Math.max(0, 1 - Math.hypot(dx, dy) / island.radius))
        // Measure in screen space so each grid fade is circular, not an isometric ellipse.
        gridInfluence = Math.max(gridInfluence, Math.max(0, 1 - Math.hypot(dx - dy, (dx + dy) * 0.5) / (island.radius * 1.4)))
      }
      const variation = random()
      tiles.push({ x, y, fade: influence ** 1.45, gridFade: gridInfluence ** 1.8, variation, grass: influence > 0.38 && variation > 0.13 })
    }
  }
  return tiles
}

/** Builds the world geometry from a config. Pure and deterministic, so it can run anywhere. */
export function buildWorld(config: GardenConfig): World {
  const islands = new Map<string, Island>()
  for (const island of config.islands) {
    if (islands.has(island.id)) throw new Error(`Duplicate garden island id "${island.id}"`)
    islands.set(island.id, island)
  }
  const ids = new Set<string>()
  const geometry: Geometry[] = [], placed: PlacedObject[] = []
  for (const object of config.objects) {
    if (ids.has(object.id)) throw new Error(`Duplicate garden object id "${object.id}"`)
    ids.add(object.id)
    const { type, id, island: _island, x: _x, y: _y, seed, rotate, mirror, ...params } = object
    const at = position(object, islands)
    placed.push({ ...at, id, type, island: object.island, rotate: rotate ?? 0, mirror: mirror ?? false })
    const builder = createBuilder(id, at, orientation(id, { rotate, mirror }),
      createRandom(seed ?? seedFromId(id)), config.islands, geometry)
    ;(objectTypes[type] as ObjectBuilder<typeof type>)(builder, params as ObjectParams[typeof type])
  }
  // Painter's algorithm: back to front. Array.sort is stable, so ties keep config order.
  geometry.sort((a, b) => a.order - b.order)

  const { count, seed, area } = config.fireflies, random = createRandom(seed)
  const fireflies = Array.from({ length: count }, () => ({
    x: area.x + random() * area.width, y: area.y + random() * area.depth,
    z: area.z + random() * area.height, phase: random() * Math.PI * 2,
  }))
  const tiles = buildGround(config)
  return { tiles, geometry, fireflies, islands: config.islands, objects: placed, ...buildLive(config, tiles, geometry, placed) }
}
