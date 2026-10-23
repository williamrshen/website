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

const orientations = [0, 90, 180, 270].flatMap((rotate) => [false, true].map((mirror) => ({ rotate: rotate as 0 | 90 | 180 | 270, mirror })))
const boxes = (geometry: Geometry[]) => geometry.filter((item) => item.kind === 'box')

test('rotating 180° turns boxes around the object position', () => {
  const at = (rotate: 0 | 180) => boxes(buildWorld(minimal([{ id: 'bench', type: 'bench', x: 2, y: 1, rotate }])).geometry)
  const turned = at(0).map((box) => ({ ...box, x: 4 - box.x - box.width, y: 2 - box.y - box.depth }))
  assert.deepEqual(canonical(at(180)), canonical(turned.map((box) => ({ ...box, order: box.x + box.y + box.z * 0.8 }))))
})

test('mirroring swaps the axes, flipping the object left-right on screen', () => {
  const at = (mirror: boolean) => boxes(buildWorld(minimal([{ id: 'bench', type: 'bench', mirror }])).geometry)
  const flipped = at(false).map((box) => ({ ...box, x: box.y, y: box.x, width: box.depth, depth: box.width }))
  assert.deepEqual(canonical(at(true)), canonical(flipped))
})

test('quarter turns clockwise on screen: local +x ends up facing +y', () => {
  const [first, second] = boxes(buildWorld(minimal([{ id: 'p', type: 'path', stones: 2, step: { x: 1, y: 0 }, rotate: 90 }])).geometry)
    .sort((a, b) => a.y - b.y)
  assert.equal(second.y - first.y, 1)
  assert.equal(second.x, first.x)
})

test('pine tiers lean with the object', () => {
  const tips = (rotate: 0 | 180) => buildWorld(minimal([{ id: 'p', type: 'pine', scale: 1, rotate }])).geometry
    .flatMap((item) => item.kind === 'pine' ? [item.tip] : [])
  assert.deepEqual(tips(0)[0], { x: -0.07, y: -0.07 })
  assert.deepEqual(tips(180)[0], { x: 0.07, y: 0.07 })
})

test('canopy faces stay culled correctly in every orientation', () => {
  for (const orientation of orientations) {
    const scale = 1, size = 0.66 * scale
    const leaves = boxes(buildWorld(minimal([{ id: 'oak', type: 'oak', scale, ...orientation }])).geometry)
      .filter((box) => typeof box.paint === 'object' && box.paint.swatch === 'leaves')
    const cell = (box: (typeof leaves)[number]) => [Math.round(box.x / size), Math.round(box.y / size), Math.round((box.z / scale - 4.1) / 0.66)]
    const occupied = new Set(leaves.map((box) => cell(box).join()))
    assert.ok(leaves.length > 100)
    for (const box of leaves) {
      const [x, y, z] = cell(box)
      // A drawn face must never be pressed against another drawn voxel.
      if (box.faces.right) assert.ok(!occupied.has([x + 1, y, z].join()), `${JSON.stringify(orientation)} right face of ${[x, y, z]}`)
      if (box.faces.left) assert.ok(!occupied.has([x, y + 1, z].join()), `${JSON.stringify(orientation)} left face of ${[x, y, z]}`)
      if (box.faces.top) assert.ok(!occupied.has([x, y, z + 1].join()), `${JSON.stringify(orientation)} top face of ${[x, y, z]}`)
    }
  }
})

test('scattered plants stay around their islands however the scatter is turned', () => {
  for (const orientation of orientations) {
    const islands = [{ id: 'a', x: 3, y: -2, radius: 2 }]
    const plants = boxes(buildWorld(minimal([{ id: 's', type: 'scatter', x: 1, y: 1, count: 30, flowerEvery: 2, clearRadius: 0, ...orientation }], islands)).geometry)
    for (const box of plants) assert.ok(Math.hypot(box.x - 3, box.y + 2) < 0.8 + 2 * 0.48 + 0.5, JSON.stringify(orientation))
  }
})

test('invalid rotations are rejected', () => {
  assert.throws(() => buildWorld(minimal([{ id: 'r', type: 'rock', scale: 1, rotate: 45 as 90 }])), /Garden object "r" has rotate 45/)
})
