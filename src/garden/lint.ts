import { buildWorld } from './objects.ts'
import type { Box, GardenConfig, GardenObject, World } from './types.ts'

export type GardenWarning = { object: string; message: string }

type Rect = { x: number; y: number; width: number; depth: number }
const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y))

/** Boxes that rest on the ground: trunks, stems, rocks, legs, stones. */
const footprints = (world: World) => world.geometry.filter((item): item is Box => item.kind === 'box' && item.z < 0.1)

/** True if the object's random generator changes its shape. */
function usesRandom(config: GardenConfig, object: GardenObject) {
  const alone = (seed: number) => JSON.stringify(buildWorld({
    ...config, objects: [{ ...object, seed }], fireflies: { ...config.fireflies, count: 0 },
  }).geometry)
  return alone(1) !== alone(2)
}

/**
 * Likely mistakes in a valid garden config: things that build fine but look wrong. Invalid
 * configs (unknown islands, duplicate ids) throw from `buildWorld` instead.
 */
export function lintGarden(config: GardenConfig, world = buildWorld(config)): GardenWarning[] {
  const warnings: GardenWarning[] = []
  const islands = new Map(config.islands.map((island) => [island.id, island]))
  const types = new Map(config.objects.map((object) => [object.id, object.type]))
  const order = new Map(config.objects.map((object, index) => [object.id, index]))

  for (const placed of world.objects) {
    const island = placed.island === undefined ? undefined : islands.get(placed.island)
    if (placed.type === 'scatter') continue
    if (island && Math.hypot(placed.x - island.x, placed.y - island.y) > island.radius) {
      warnings.push({ object: placed.id, message: `sits off its island "${island.id}" (${Math.hypot(placed.x - island.x, placed.y - island.y).toFixed(2)} from the center, radius ${island.radius})` })
    }
    if (!island && !config.islands.some((other) => Math.hypot(placed.x - other.x, placed.y - other.y) <= other.radius)) {
      warnings.push({ object: placed.id, message: 'is not on any island, so it floats over bare grid' })
    }
    if (Math.max(Math.abs(placed.x), Math.abs(placed.y)) > config.ground.extent - 1) {
      warnings.push({ object: placed.id, message: `is at the edge of the ground (extent ${config.ground.extent})` })
    }
  }

  // Ground contact between different objects, e.g. a rock through a bench leg.
  const bases = footprints(world), reported = new Set<string>(), inside = new Map<string, Map<string, number>>()
  for (let i = 0; i < bases.length; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      const a = bases[i], b = bases[j]
      if (a.owner === b.owner || overlapArea(a, b) < 1e-4) continue
      const aScatter = types.get(a.owner) === 'scatter', bScatter = types.get(b.owner) === 'scatter'
      if (aScatter && bScatter) continue
      // Rocks are piled on purpose (a pebble against a boulder).
      if (types.get(a.owner) === 'rock' && types.get(b.owner) === 'rock') continue
      if (aScatter || bScatter) {
        // Tally scattered plants growing out of other objects, reported once per scatter.
        const [scatter, host] = aScatter ? [a.owner, b.owner] : [b.owner, a.owner]
        const counts = inside.get(scatter) ?? new Map<string, number>()
        counts.set(host, (counts.get(host) ?? 0) + 1)
        inside.set(scatter, counts)
        continue
      }
      // Name the pair in config order so the message is stable.
      const [first, second] = [a.owner, b.owner].sort((p, q) => order.get(p)! - order.get(q)!)
      if (reported.has(`${first} ${second}`)) continue
      reported.add(`${first} ${second}`)
      warnings.push({ object: first, message: `overlaps "${second}" where they touch the ground` })
    }
  }
  for (const [scatter, counts] of inside) {
    const list = [...counts].map(([host, count]) => `${host} (${count})`).join(', ')
    warnings.push({ object: scatter, message: `has plant parts growing inside ${list}; try another seed or a larger clearRadius` })
  }

  for (const object of config.objects) {
    if (object.seed !== undefined && !usesRandom(config, object)) {
      warnings.push({ object: object.id, message: `sets a seed, but ${object.type} objects don't use randomness` })
    }
  }
  for (const id of Object.keys(config.links ?? {})) {
    if (!config.objects.some((object) => object.link === id)) {
      warnings.push({ object: `links.${id}`, message: 'is not used by any object, so it is not shown' })
    }
  }
  return warnings
}

/** Links to `#id` where `hasId` says the page has no such element (a renamed section, a typo). */
export function missingSections(config: GardenConfig, hasId: (id: string) => boolean): GardenWarning[] {
  return Object.entries(config.links ?? {})
    .filter(([, link]) => link.href.startsWith('#') && !hasId(decodeURIComponent(link.href.slice(1))))
    .map(([id, link]) => ({ object: `links.${id}`, message: `goes to "${link.href}", but the page has no element with that id` }))
}
