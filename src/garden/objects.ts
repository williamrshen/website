import { buildLive } from './live.ts'
import { createRandom, seedFromId, type Random } from './random.ts'
import type {
  Faces, GardenConfig, GardenLink, GardenObject, Geometry, Island, ObjectParams, ObjectType, Orientation, Paint, PlacedObject, Point, Tile, World,
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
  /**
   * A pine tier centered at (x, y), `height` tall from base to tip. `tier` counts up from the
   * bottom and shifts which greens it uses, so neighboring tiers stand apart.
   */
  pineLayer(x: number, y: number, z: number, radius: number, height: number, tier?: number): void
  /** Places another object type at a local position, sharing this object's random generator. */
  place<K extends ObjectType>(type: K, params: ObjectParams[K] & Partial<Point> & Orientation): void
  /**
   * True if a local point is within `margin` of something another object put on the ground.
   * Scatters are built after every other object, so they see the whole garden.
   */
  occupied(x: number, y: number, margin: number): boolean
}

type ObjectBuilder<K extends ObjectType> = (builder: Builder, params: ObjectParams[K]) => void

/** Number of leaf shades the oak picks between; palettes with fewer entries wrap. */
const leafShades = 6
/** Number of flower colors scattered plants pick between; palettes with fewer entries wrap. */
const flowerShades = 5

/** How far out from an island's center scattered plants grow, as a fraction of its radius. */
export const scatterReach = 0.9

/** Size of one oak canopy voxel, and the height of the lowest voxel layer, at scale 1. */
export const canopyVoxel = 0.66
export const canopyBase = 3.8
/** The canopy: a broad crown with lobes reaching left and toward the camera's right. */
const canopyLobes = [
  { x: 0, y: 0, z: 5.7, rx: 3.4, ry: 3.3, rz: 2 },
  { x: -1.7, y: 1, z: 5, rx: 2.1, ry: 2, rz: 1.4 },
  { x: 1.3, y: -1.5, z: 5.3, rx: 2, ry: 2, rz: 1.4 },
]

/** Registry of object types. Each builder only describes shapes; placement is handled for it. */
export const objectTypes: { [K in ObjectType]: ObjectBuilder<K> } = {
  oak(b, { scale = 1 }) {
    b.box(-0.475 * scale, -0.45 * scale, 0.02, 0.95 * scale, 0.9 * scale, 0.55 * scale, 'trunkBase')
    b.box(-0.33 * scale, -0.31 * scale, 0.04, 0.66 * scale, 0.62 * scale, 4.6 * scale, 'trunk')
    for (const side of [-1, 1]) {
      b.box((side * 0.5 - 0.25) * scale, -0.2 * scale, 3.24 * scale, 0.5 * scale, 0.4 * scale, 0.35 * scale, 'branch')
      b.box(-0.2 * scale, (side * 0.5 - 0.25) * scale, 3.54 * scale, 0.4 * scale, 0.5 * scale, 0.35 * scale, 'branch')
    }

    // Overlapping ellipsoids with slightly ragged edges form the canopy. Only exposed voxel faces are drawn.
    const voxels = new Map<string, { x: number; y: number; z: number }>()
    const voxelSize = canopyVoxel * scale
    for (let ix = -7; ix <= 7; ix++) {
      for (let iy = -7; iy <= 7; iy++) {
        for (let iz = 0; iz <= 6; iz++) {
          const xx = (ix + 0.5) * canopyVoxel, yy = (iy + 0.5) * canopyVoxel, zz = canopyBase + (iz + 0.5) * canopyVoxel
          const reach = Math.min(...canopyLobes.map((lobe) =>
            ((xx - lobe.x) / lobe.rx) ** 2 + ((yy - lobe.y) / lobe.ry) ** 2 + ((zz - lobe.z) / lobe.rz) ** 2))
          if (reach < 1 + (b.random() - 0.5) * 0.12 && b.random() > 0.04) voxels.set(`${ix},${iy},${iz}`, { x: ix, y: iy, z: iz })
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
      b.box(ix * voxelSize, iy * voxelSize, (canopyBase + iz * canopyVoxel) * scale,
        voxelSize, voxelSize, voxelSize, { swatch: 'leaves', index: Math.floor(b.random() * leafShades) }, faces)
    }
  },

  pine(b, { scale }) {
    b.box(-0.11 * scale, -0.11 * scale, 0, 0.22 * scale, 0.22 * scale, scale, 'pineTrunk')
    // Tiers narrow and shorten toward the top: [radius, base height, height].
    const tiers = [[1.05, 0.6, 1.5], [0.85, 1.3, 1.35], [0.64, 1.95, 1.15], [0.42, 2.55, 0.95]]
    tiers.forEach(([radius, z, height], tier) => b.pineLayer(0, 0, z * scale, radius * scale, height * scale, tier))
  },

  plant(b, { scale = 1, flower = false }) {
    b.box(-0.035 * scale, -0.035 * scale, 0, 0.07 * scale, 0.07 * scale, 0.34 * scale, 'stem')
    b.box(0.01 * scale, -0.035 * scale, 0.12 * scale, 0.14 * scale, 0.07 * scale, 0.07 * scale, 'plantLeaf')
    b.box(-0.035 * scale, -0.15 * scale, 0.2 * scale, 0.07 * scale, 0.14 * scale, 0.07 * scale, 'plantLeafDark')
    if (flower) {
      b.box(-0.07 * scale, -0.07 * scale, 0.34 * scale, 0.14 * scale, 0.14 * scale, 0.08 * scale,
        { swatch: 'flowers', index: Math.floor(b.random() * flowerShades) })
    }
  },

  rock(b, { scale }) {
    b.box(0, 0, 0.01, scale, scale * 0.72, scale * 0.51, 'rock')
    b.box(scale * 0.18, scale * 0.08, scale * 0.51, scale * 0.64, scale * 0.55, scale * 0.12, 'rockTop')
  },

  path(b, { stones, step, sway = { x: 0, y: 0 } }) {
    for (let i = 0; i < stones; i++) {
      const side = i % 2 ? 1 : -1
      b.box(i * step.x + side * sway.x - 0.22, i * step.y + side * sway.y - 0.24, 0, 0.44, 0.48, 0.07, { swatch: 'path', index: i % 2 })
    }
  },

  bench(b) {
    b.box(0.1, 0.15, 0.03, 0.14, 0.18, 0.45, 'benchLeg')
    b.box(1.1, 0.15, 0.03, 0.14, 0.18, 0.45, 'benchLeg')
    b.box(0, 0, 0.48, 1.32, 0.46, 0.14, 'benchSeat')
    b.box(0, 0.38, 0.65, 1.32, 0.1, 0.35, 'benchBack')
  },

  creek(b, { length, width, meander = 0.2, pebbles = 6 }) {
    const step = 0.2, segments = Math.round(length / step), bank = 0.09
    const centerAt = (t: number) => Math.sin(t * Math.PI * 2) * meander
    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments, x = -length / 2 + i * step
      // Tapers to a trickle at both ends; the bank is a darker rim just below the water.
      const w = Math.max(0.12, width * Math.sqrt(Math.sin(t * Math.PI))), center = centerAt(t)
      b.box(x, center - w / 2 - bank, -0.025, step, w + bank * 2, 0.04, 'creekBank')
      b.box(x, center - w / 2, -0.02, step, w, 0.04, 'water')
    }
    for (let i = 0; i < pebbles; i++) {
      const t = 0.12 + b.random() * 0.76, side = b.random() > 0.5 ? 1 : -1, size = 0.08 + b.random() * 0.07
      const w = width * Math.sqrt(Math.sin(t * Math.PI))
      b.box(-length / 2 + t * length - size / 2, centerAt(t) + side * (w / 2 + bank) - size / 2, 0, size, size * 0.8, size * 0.55, 'rock')
    }
  },

  bridge(b, { length = 1.8, width = 0.62, rise = 0.3 }) {
    const planks = 11, step = length / planks, deck = (t: number) => 0.09 + rise * Math.sin(Math.PI * t)
    // Stone footings on the banks carry the ends of the deck.
    for (const end of [-1, 1]) b.box(end < 0 ? -length / 2 - 0.12 : length / 2 - 0.18, -width / 2 - 0.05, 0, 0.3, width + 0.1, 0.13, 'rock')
    for (let i = 0; i < planks; i++) {
      const t = (i + 0.5) / planks, x = -length / 2 + i * step, z = deck(t)
      b.box(x + 0.01, -width / 2, z, step - 0.02, width, 0.06, 'bridgeDeck')
      // Handrails follow the arch in short pieces so they sort correctly against the planks.
      for (const y of [-width / 2, width / 2 - 0.05]) b.box(x, y, z + 0.3, step, 0.05, 0.045, 'bridgeRail')
    }
    for (const t of [0.04, 0.5, 0.96]) {
      const x = -length / 2 + t * length - 0.035
      for (const y of [-width / 2, width / 2 - 0.06]) b.box(x, y, deck(t) + 0.04, 0.07, 0.06, 0.3, 'bridgeRail')
    }
  },

  specimen(b, { species, scale = 1 }) {
    /** A box centered on (x, y), sized by `scale`. */
    const at = (x: number, y: number, z: number, width: number, depth: number, height: number, paint: Paint) =>
      b.box((x - width / 2) * scale, (y - depth / 2) * scale, z * scale, width * scale, depth * scale, height * scale, paint)
    const jitter = (amount: number) => (b.random() - 0.5) * 2 * amount
    if (species === 'sunflower') {
      // A tall stem with two leaves and a broad yellow head with a dark center.
      at(0, 0, 0, 0.07, 0.07, 0.84, 'stem')
      at(0.13, 0, 0.3, 0.19, 0.08, 0.06, 'plantLeaf')
      at(0, 0.13, 0.48, 0.08, 0.19, 0.06, 'plantLeafDark')
      at(0, 0, 0.84, 0.34, 0.34, 0.07, 'sunflowerPetal')
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) at(dx * 0.22, dy * 0.22, 0.85, dx ? 0.1 : 0.16, dy ? 0.1 : 0.16, 0.05, 'sunflowerPetal')
      at(0, 0, 0.91, 0.17, 0.17, 0.04, 'sunflowerCenter')
    } else if (species === 'tulips') {
      // Three cups of different heights, each crowned with four petal tips.
      for (const [x, y, height] of [[0, 0, 0.56], [0.17, 0.12, 0.42], [-0.12, 0.16, 0.34]]) {
        const h = height + jitter(0.04)
        at(x, y, 0, 0.05, 0.05, h, 'stem')
        at(x + 0.05, y, 0, 0.05, 0.04, h * 0.45, 'plantLeaf')
        at(x, y, h, 0.15, 0.15, 0.12, 'tulip')
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(x + dx * 0.05, y + dy * 0.05, h + 0.12, 0.05, 0.05, 0.05, 'tulip')
      }
    } else if (species === 'lavender') {
      // A low tuft with spikes of purple buds.
      at(0, 0, 0, 0.32, 0.32, 0.09, 'plantLeafDark')
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + jitter(0.3), radius = i ? 0.1 + b.random() * 0.04 : 0
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius, h = 0.36 + b.random() * 0.2
        at(x, y, 0.09, 0.035, 0.035, h - 0.09, 'stem')
        for (let bud = 0; bud < 3; bud++) at(x, y, h + bud * 0.065, 0.065, 0.065, 0.05, 'lavender')
      }
    } else if (species === 'snowball') {
      // A rounded shrub with round white flower heads on top and around its sides.
      at(0, 0, 0, 0.46, 0.46, 0.3, 'plantLeafDark')
      at(0, 0, 0.3, 0.32, 0.32, 0.12, 'plantLeaf')
      at(0, 0, 0.42, 0.14, 0.14, 0.1, 'snowball')
      for (const [x, y, z] of [[0.26, 0.05, 0.12], [0.02, 0.26, 0.16], [0.21, 0.21, 0.31], [-0.2, 0.08, 0.31], [0.08, -0.2, 0.31]]) {
        at(x + jitter(0.02), y + jitter(0.02), z, 0.12, 0.12, 0.11, 'snowball')
      }
    } else {
      // A big toadstool with a smaller one beside it.
      for (const [x, y, size] of [[0, 0, 1], [0.24, 0.14, 0.62]]) {
        at(x, y, 0, 0.1 * size, 0.1 * size, 0.24 * size, 'mushroomStem')
        at(x, y, 0.24 * size, 0.32 * size, 0.32 * size, 0.08 * size, 'mushroomCap')
        at(x, y, 0.32 * size, 0.18 * size, 0.18 * size, 0.05 * size, 'mushroomCap')
        // White spots on the lower ring of the cap.
        for (const [dx, dy] of [[0.12, 0.02], [-0.02, 0.12], [-0.11, -0.06]]) at(x + dx * size, y + dy * size, 0.32 * size, 0.05 * size, 0.05 * size, 0.012, 'mushroomStem')
      }
    }
  },

  scatter(b, { count, flowerEvery, clearRadius, keepOut = 0.12 }) {
    const islands = b.islands.filter((island) => island.plants !== false)
    // Bigger islands get proportionally more plants, spread evenly out to near their edge.
    const total = islands.reduce((sum, island) => sum + island.radius ** 2, 0)
    for (let i = 0; i < count; i++) {
      let pick = b.random() * total, island = islands[0]
      for (const candidate of islands) { island = candidate; if ((pick -= candidate.radius ** 2) <= 0) break }
      const angle = b.random() * Math.PI * 2, radius = Math.sqrt(b.random()) * island.radius * scatterReach
      const x = island.x + Math.cos(angle) * radius, y = island.y + Math.sin(angle) * radius
      if (Math.hypot(x, y) < clearRadius) continue
      const scale = 0.8 + b.random() * 0.4, flower = i % flowerEvery === 0
      if (b.occupied(x, y, keepOut)) {
        // Burn the flower's color draw too, so every later plant is unchanged.
        if (flower) b.random()
        continue
      }
      b.place('plant', { x, y, scale, flower })
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
    pineLayer(x, y, z, radius, height, tier = 0) {
      const center = apply(m, { x, y }), wx = origin.x + center.x, wy = origin.y + center.y
      geometry.push({ kind: 'pine', owner, x: wx, y: wy, z, radius, height, tip: apply(m, pineLean), tier, order: wx + wy + z * 0.8 })
    },
    place(type, { x = 0, y = 0, rotate, mirror, ...params }) {
      const offset = apply(m, { x, y })
      const child = createBuilder(owner, { x: origin.x + offset.x, y: origin.y + offset.y },
        multiply(m, orientation(owner, { rotate, mirror })), random, islands, geometry)
      ;(objectTypes[type] as ObjectBuilder<typeof type>)(child, params as ObjectParams[typeof type])
    },
    occupied(x, y, margin) {
      const at = apply(m, { x, y }), wx = origin.x + at.x, wy = origin.y + at.y
      return geometry.some((item) => item.kind === 'box' && item.owner !== owner && item.z < 0.1 &&
        wx > item.x - margin && wx < item.x + item.width + margin && wy > item.y - margin && wy < item.y + item.depth + margin)
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
      // Every tile whose center lies inside an island is grass, so islands read as solid patches.
      const variation = random()
      tiles.push({ x, y, fade: influence ** 1.45, gridFade: gridInfluence ** 1.8, variation, grass: influence > 0 })
    }
  }
  return tiles
}

/**
 * The config's objects and links with the `bed` planted: one specimen and one link per plant.
 * Fails if there are more plants than spots.
 */
export function expandBed(config: GardenConfig): { objects: GardenObject[]; links: Record<string, GardenLink> } {
  const { bed } = config, links = config.links ?? {}
  if (!bed) return { objects: config.objects, links }
  if (bed.plants.length > bed.spots.length) {
    throw new Error(`The garden bed has ${bed.plants.length} plants but only ${bed.spots.length} spots; add spots to it`)
  }
  const plants: GardenObject[] = bed.plants.map((plant, index) => {
    // A little variety, fixed by the id: up to 8% smaller or 4% bigger, and maybe mirrored.
    const variety = seedFromId(`${plant.id}:look`)
    const scale = Math.round((bed.scale ?? 1) * (0.92 + (variety % 1000) / 1000 * 0.12) * 100) / 100
    return {
      id: plant.id, type: 'specimen', island: bed.island, ...bed.spots[index], species: plant.species, scale,
      ...(variety & 0x10000 ? { mirror: true } : {}), link: plant.id,
    }
  })
  const own = Object.fromEntries(bed.plants.map(({ id, label, href }) => [id, { label, href }]))
  const entries = Object.entries(links), after = bed.section === undefined ? -1 : entries.findIndex(([id]) => id === bed.section)
  const at = after < 0 ? entries.length : after + 1
  return {
    objects: [...config.objects, ...plants],
    links: Object.fromEntries([...entries.slice(0, at), ...Object.entries(own), ...entries.slice(at)]),
  }
}

/** Builds the world geometry from a config. Pure and deterministic, so it can run anywhere. */
export function buildWorld(config: GardenConfig): World {
  const islands = new Map<string, Island>()
  for (const island of config.islands) {
    if (islands.has(island.id)) throw new Error(`Duplicate garden island id "${island.id}"`)
    islands.set(island.id, island)
  }
  const ids = new Set<string>(), { objects, links } = expandBed(config)
  const geometry: Geometry[] = [], placed: PlacedObject[] = [], scatters: (() => void)[] = []
  for (const object of objects) {
    if (ids.has(object.id)) throw new Error(`Duplicate garden object id "${object.id}"`)
    ids.add(object.id)
    const { type, id, island: _island, x: _x, y: _y, seed, rotate, mirror, link, ...params } = object
    if (link !== undefined && !links[link]) throw new Error(`Garden object "${id}" links to unknown link "${link}"`)
    const at = position(object, islands)
    placed.push({ ...at, id, type, island: object.island, rotate: rotate ?? 0, mirror: mirror ?? false, link })
    const build = () => {
      const builder = createBuilder(id, at, orientation(id, { rotate, mirror }),
        createRandom(seed ?? seedFromId(id)), config.islands, geometry)
      ;(objectTypes[type] as ObjectBuilder<typeof type>)(builder, params as ObjectParams[typeof type])
    }
    // Scatters go last so their plants can stay out of everything else.
    if (type === 'scatter') scatters.push(build)
    else build()
  }
  for (const build of scatters) build()
  // Painter's algorithm: back to front. Array.sort is stable, so ties keep config order.
  geometry.sort((a, b) => a.order - b.order)

  const { count, seed, area } = config.fireflies, random = createRandom(seed)
  const fireflies = Array.from({ length: count }, () => ({
    x: area.x + random() * area.width, y: area.y + random() * area.depth,
    z: area.z + random() * area.height, phase: random() * Math.PI * 2,
  }))
  const tiles = buildGround(config)
  return { tiles, geometry, fireflies, islands: config.islands, objects: placed, links, ...buildLive(config, tiles, geometry, placed) }
}
