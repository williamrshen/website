import assert from 'node:assert/strict'
import { test } from 'node:test'
import { garden, gardenPalettes, projectPlants } from '../../data/garden.ts'
import { buildWorld } from '../objects.ts'
import type { GardenConfig, Point } from '../types.ts'
import { convexHull, insidePolygon, objectOutline, pickObject } from '../outline.ts'
import { literal, serializeGarden, serializePalette } from './serialize.ts'

/** Evaluates exported TypeScript from the serializers (type annotations stripped), with `projectPlants` in scope. */
const evaluate = (source: string) => new Function('projectPlants', source.replace(/^(export )?const \w+(: \w+)? =/, 'return'))(projectPlants)

test('serialized garden config round-trips', () => {
  const text = serializeGarden(garden)
  assert.match(text, /^export const garden: GardenConfig = \{/)
  assert.deepEqual(evaluate(text), garden)
  // The bed refers to the generated plants instead of copying them.
  assert.match(text, /plants: projectPlants,/)
  assert.doesNotMatch(text, /project-snowballistic/)
  // One island or object per line keeps diffs readable.
  assert.equal(text.split('\n').filter((line) => line.includes("{ id: '")).length, garden.islands.length + garden.objects.length)
  // Links serialize too, quoting ids that aren't identifiers.
  const linked = { ...garden, links: { 'my-page': { label: "it's", href: '#x' } } }
  assert.deepEqual(evaluate(serializeGarden(linked)).links, linked.links)
})

test('serialized palettes round-trip', () => {
  assert.deepEqual(evaluate(serializePalette('daylight', gardenPalettes.daylight)), gardenPalettes.daylight)
})

test('literals quote what they must', () => {
  assert.equal(literal({ a: "it's", 'b-c': [1, true, null], d: undefined }), "{ a: 'it\\'s', 'b-c': [1, true, null] }")
})

test('convex hull and point-in-polygon', () => {
  const square = convexHull([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }])
  assert.equal(square.length, 4)
  assert.ok(insidePolygon({ x: 1, y: 1 }, square))
  assert.ok(!insidePolygon({ x: 3, y: 1 }, square))
})

test('picking finds the frontmost object under a point', () => {
  const config: GardenConfig = {
    ground: { extent: 3, seed: 1 },
    islands: [{ id: 'a', x: 0, y: 0, radius: 3 }],
    objects: [
      { id: 'back', type: 'rock', x: 0, y: 0, scale: 1 },
      { id: 'front', type: 'rock', x: 0.5, y: 0.5, scale: 1 },
    ],
    fireflies: { count: 0, seed: 1, area: { x: 0, y: 0, z: 0, width: 1, depth: 1, height: 1 } },
  }
  const world = buildWorld(config)
  const project = (x: number, y: number, z = 0): Point => ({ x: (x - y) * 10, y: (x + y) * 5 - z * 10.5 })
  // The rocks overlap on screen around (0, 10); the front one is drawn later, so it wins.
  assert.equal(pickObject(world, project, project(0.75, 0.75)), 'front')
  assert.equal(pickObject(world, project, project(0.1, 0.1, 0.2)), 'back')
  assert.equal(pickObject(world, project, { x: 500, y: 500 }), undefined)
  assert.ok(objectOutline(world, project, 'front').length >= 4)
})
