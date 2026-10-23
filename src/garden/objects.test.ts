import assert from 'node:assert/strict'
import { test } from 'node:test'
import { garden } from '../data/garden.ts'
import { buildWorld, objectTypes } from './objects.ts'
import type { GardenConfig, GardenObject, Geometry } from './types.ts'

const minimal = (objects: GardenObject[], islands = [{ id: 'a', x: 0, y: 0, radius: 2 }]): GardenConfig => ({
  ground: { extent: 3, seed: 1 },
  islands,
  objects,
  fireflies: { count: 2, seed: 1, area: { x: 0, y: 0, z: 0, width: 1, depth: 1, height: 1 } },
})
const shift = (items: Geometry[], dx: number, dy: number) => items.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy, order: item.order + dx + dy }))
/** Geometry as a sorted list of rounded JSON strings, so near-tied draw order doesn't matter. */
const canonical = (items: Geometry[]) => items.map((item) => JSON.stringify(item, (_key, value) => typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value)).sort()

test('the site garden builds deterministically', () => {
  const a = buildWorld(garden), b = buildWorld(garden)
  assert.deepEqual(a, b)
  assert.equal(a.tiles.length, (garden.ground.extent * 2 + 1) ** 2)
  assert.equal(a.fireflies.length, garden.fireflies.count)
  assert.ok(a.geometry.length > 400)
})

test('geometry is sorted back to front', () => {
  const { geometry } = buildWorld(garden)
  for (let i = 1; i < geometry.length; i++) assert.ok(geometry[i - 1].order <= geometry[i].order)
})

test('every registered object type builds', () => {
  const params: { [K in keyof typeof objectTypes]: Omit<Extract<GardenObject, { type: K }>, 'id' | 'type'> } = {
    oak: { scale: 0.5 }, pine: { scale: 1 }, plant: { flower: true }, rock: { scale: 1 },
    path: { stones: 3, step: { x: 0.3, y: 0.3 } }, bench: {}, scatter: { count: 10, flowerEvery: 2, clearRadius: 0 },
  }
  for (const [type, value] of Object.entries(params)) {
    const world = buildWorld(minimal([{ id: type, type, ...value } as GardenObject]))
    assert.ok(world.geometry.length > 0, type)
  }
})

test('objects on an island move with it', () => {
  const objects: GardenObject[] = [{ id: 'tree', type: 'oak', island: 'a', x: 0.5, scale: 0.3 }, { id: 'rock', type: 'rock', island: 'a', y: -1, scale: 1 }]
  const before = buildWorld(minimal(objects)).geometry
  const after = buildWorld(minimal(objects, [{ id: 'a', x: 4, y: -2, radius: 2 }])).geometry
  assert.deepEqual(canonical(after), canonical(shift(before, 4, -2)))
})

test("changing one object's seed leaves the others untouched", () => {
  const objects = (seed: number): GardenObject[] => [
    { id: 'first', type: 'oak', x: -5, scale: 0.3, seed },
    { id: 'second', type: 'oak', x: 5, scale: 0.3 },
    { id: 'plants', type: 'scatter', count: 20, flowerEvery: 2, clearRadius: 0 },
  ]
  const second = (seed: number) => buildWorld(minimal(objects(seed))).geometry.filter((item) => item.x > 2)
  assert.notDeepEqual(buildWorld(minimal(objects(1))).geometry, buildWorld(minimal(objects(2))).geometry)
  assert.deepEqual(second(1), second(2))
})

test('objects without a seed derive one from their id', () => {
  const build = (id: string) => buildWorld(minimal([{ id, type: 'oak', scale: 0.3 }])).geometry
  assert.deepEqual(build('tree'), build('tree'))
  assert.notDeepEqual(build('tree'), build('other-tree'))
})

test('invalid configs fail loudly', () => {
  assert.throws(() => buildWorld(minimal([{ id: 'x', type: 'rock', island: 'missing', scale: 1 }])), /unknown island "missing"/)
  assert.throws(() => buildWorld(minimal([{ id: 'x', type: 'rock', scale: 1 }, { id: 'x', type: 'rock', scale: 1 }])), /Duplicate garden object id "x"/)
  assert.throws(() => buildWorld(minimal([], [{ id: 'a', x: 0, y: 0, radius: 1 }, { id: 'a', x: 1, y: 1, radius: 1 }])), /Duplicate garden island id "a"/)
})
