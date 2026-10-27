import assert from 'node:assert/strict'
import { test } from 'node:test'
import { garden } from '../data/garden.ts'
import { projectEntries } from '../data/projectEntries.ts'
import { buildWorld, expandBed, objectTypes } from './objects.ts'
import { species, type GardenConfig, type GardenObject, type Geometry, type Island } from './types.ts'

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
  assert.ok(a.geometry.length > 300)
})

test('geometry is sorted back to front', () => {
  const { geometry } = buildWorld(garden)
  for (let i = 1; i < geometry.length; i++) assert.ok(geometry[i - 1].order <= geometry[i].order)
})

test('every registered object type builds', () => {
  const params: { [K in keyof typeof objectTypes]: Omit<Extract<GardenObject, { type: K }>, 'id' | 'type'> } = {
    oak: { scale: 0.5 }, pine: { scale: 1 }, plant: { flower: true }, rock: { scale: 1 },
    path: { stones: 3, step: { x: 0.3, y: 0.3 } }, bench: {}, creek: { length: 2, width: 0.5 }, bridge: {},
    specimen: { species: 'sunflower' }, scatter: { count: 10, flowerEvery: 2, clearRadius: 0 },
  }
  for (const [type, value] of Object.entries(params)) {
    const world = buildWorld(minimal([{ id: type, type, ...value } as GardenObject]))
    assert.ok(world.geometry.length > 0, type)
  }
})

test('every specimen species builds', () => {
  for (const kind of species) {
    const { geometry } = buildWorld(minimal([{ id: kind, type: 'specimen', species: kind }]))
    assert.ok(geometry.length >= 6, kind)
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
  assert.throws(() => buildWorld(minimal([{ id: 'x', type: 'rock', scale: 1, link: 'nowhere' }])), /Garden object "x" links to unknown link "nowhere"/)
})

test('linked objects keep their link', () => {
  const config = { ...minimal([{ id: 'r', type: 'rock', scale: 1, link: 'home' }, { id: 's', type: 'rock', x: 1, scale: 1 }]), links: { home: { label: 'home', href: '#home' } } }
  const world = buildWorld(config)
  assert.deepEqual(world.links, config.links)
  assert.deepEqual(world.objects.map((object) => object.link), ['home', undefined])
  // The site's links all point at sections, and every one is used by some object.
  const site = buildWorld(garden)
  for (const [id, link] of Object.entries(site.links)) {
    assert.match(link.href, /^#[\w-]+(\/[\w-]+)?$/)
    assert.ok(site.objects.some((object) => object.link === id), `link "${id}" is unused`)
  }
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

test('the creek and bridge build, and the bridge only touches the ground on its footings', () => {
  const world = buildWorld(minimal([
    { id: 'creek', type: 'creek', island: 'a', length: 3, width: 0.7 },
    { id: 'bridge', type: 'bridge', island: 'a', rotate: 90 },
  ], [{ id: 'a', x: 0, y: 0, radius: 3 }]))
  const water = boxes(world.geometry).filter((box) => box.paint === 'water')
  assert.ok(water.length >= 10)
  // The water runs along x and is widest in the middle.
  const widths = water.map((box) => box.depth)
  assert.ok(Math.max(...widths) > widths[0] && Math.max(...widths) > widths.at(-1)!)
  const footings = boxes(world.geometry).filter((box) => box.owner === 'bridge' && box.z < 0.1)
  assert.equal(footings.length, 2)
  for (const footing of footings) {
    for (const box of water) {
      const overlapX = Math.min(footing.x + footing.width, box.x + box.width) - Math.max(footing.x, box.x)
      const overlapY = Math.min(footing.y + footing.depth, box.y + box.depth) - Math.max(footing.y, box.y)
      assert.ok(overlapX <= 0 || overlapY <= 0, 'footings stay on the banks')
    }
  }
})

test('scattered plants stay out of other objects without moving the plants that remain', () => {
  const islands = [{ id: 'a', x: 0, y: 0, radius: 3 }]
  const scatter: GardenObject = { id: 'plants', type: 'scatter', count: 60, flowerEvery: 3, clearRadius: 0 }
  const plants = (objects: GardenObject[]) => canonical(buildWorld(minimal(objects, islands)).geometry.filter((item) => item.owner === 'plants'))
  const alone = plants([scatter])
  // Listed before the creek, the scatter is still built after it.
  const withCreek = plants([scatter, { id: 'creek', type: 'creek', island: 'a', length: 4, width: 1 }])
  assert.ok(withCreek.length < alone.length, 'some plants were kept out of the water')
  assert.ok(withCreek.every((box) => alone.includes(box)), 'every remaining plant is exactly where it was')
})

test('islands with plants: false widen the grass but get no scattered plants', () => {
  const scatter: GardenObject = { id: 'plants', type: 'scatter', count: 40, flowerEvery: 3, clearRadius: 0 }
  const islands: Island[] = [{ id: 'a', x: 0, y: 0, radius: 2 }, { id: 'b', x: 6, y: 0, radius: 2 }]
  const world = (extra: Island[]) =>
    buildWorld({ ...minimal([scatter], [...islands, ...extra]), ground: { extent: 10, seed: 1 } })
  const plain = world([]), widened = world([{ id: 'bare', x: 3, y: 0, radius: 2, plants: false }])
  // The scatter is unchanged, wherever the bare island sits in the list...
  assert.deepEqual(canonical(widened.geometry), canonical(plain.geometry))
  assert.deepEqual(canonical(buildWorld({ ...minimal([scatter], [islands[0], { id: 'bare', x: 3, y: 0, radius: 2, plants: false }, islands[1]]), ground: { extent: 10, seed: 1 } }).geometry), canonical(plain.geometry))
  // ...but the ground between the islands turns to grass.
  const grass = (tiles: { x: number; y: number; grass: boolean }[]) => tiles.filter((tile) => tile.grass && tile.x >= 2 && tile.x <= 3 && Math.abs(tile.y) <= 1).length
  assert.ok(grass(widened.tiles) > grass(plain.tiles))
})

test('a bed plants one linked specimen per plant, its links right after the section link', () => {
  const plant = (id: string) => ({ id, label: id, href: `#work/${id}`, species: 'tulips' as const })
  const config = (plants: ReturnType<typeof plant>[]): GardenConfig => ({
    ...minimal([{ id: 'r', type: 'rock', scale: 0.3, link: 'work' }]),
    links: { about: { label: 'about', href: '#about' }, work: { label: 'work', href: '#work' }, fun: { label: 'fun', href: '#fun' } },
    bed: { island: 'a', section: 'work', spots: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }], plants },
  })
  const world = buildWorld(config([plant('one'), plant('two')]))
  assert.deepEqual(Object.keys(world.links), ['about', 'work', 'one', 'two', 'fun'])
  assert.deepEqual(world.objects.filter((object) => object.type === 'specimen').map(({ id, x, link }) => ({ id, x, link })),
    [{ id: 'one', x: -1, link: 'one' }, { id: 'two', x: 0, link: 'two' }])
  // Adding a plant grows just that one; the others keep their shapes.
  const shapes = (items: Geometry[], owner: string) => canonical(items.filter((item) => item.owner === owner))
  const grown = buildWorld(config([plant('one'), plant('two'), plant('three')]))
  assert.deepEqual(shapes(grown.geometry, 'one'), shapes(world.geometry, 'one'))
  assert.deepEqual(shapes(grown.geometry, 'two'), shapes(world.geometry, 'two'))
  assert.throws(() => buildWorld(config(['a', 'b', 'c', 'd'].map(plant))), /4 plants but only 3 spots/)
  // Each plant's size varies a little around the bed's scale, the same on every build.
  const scaled = { ...config([plant('one'), plant('two')]), bed: { ...config([]).bed!, scale: 2, plants: [plant('one'), plant('two')] } }
  for (const object of expandBed(scaled).objects.filter((item) => item.type === 'specimen')) {
    const { scale } = object as { scale: number }
    assert.ok(scale >= 1.84 && scale <= 2.08, `${object.id} ${scale}`)
  }
  assert.deepEqual(expandBed(scaled), expandBed(scaled))
})

test('every project grows in the site garden and links to its card', () => {
  const world = buildWorld(garden)
  for (const project of projectEntries) {
    const object = world.objects.find((item) => item.id === `project-${project.id}`)
    assert.ok(object, project.id)
    assert.equal(world.links[object.link!].href, `#work/${project.id}`)
  }
})
