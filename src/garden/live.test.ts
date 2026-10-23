import assert from 'node:assert/strict'
import { test } from 'node:test'
import { garden } from '../data/garden.ts'
import { bloomAt, cycleRandom, flakeAt, leafAt } from './live.ts'
import { buildWorld } from './objects.ts'
import type { GardenConfig } from './types.ts'

const world = buildWorld(garden)

test('cycleRandom is stable, in [0, 1), and varies by cycle and salt', () => {
  assert.equal(cycleRandom(7, 3, 1), cycleRandom(7, 3, 1))
  const values = new Set<number>()
  for (let n = 0; n < 200; n++) {
    const value = cycleRandom(7, n, 1)
    assert.ok(value >= 0 && value < 1)
    values.add(value)
  }
  assert.ok(values.size > 195)
  assert.notEqual(cycleRandom(7, 3, 1), cycleRandom(7, 3, 2))
})

test('leaves fall from under an oak canopy, land, and fade', () => {
  assert.equal(world.leaves.length, garden.leaves!.count)
  for (const leaf of world.leaves) {
    let previous = Infinity, landed = false
    for (let t = 0; t < leaf.period; t += leaf.period / 60) {
      const at = leafAt(leaf, t)
      assert.ok(at.z >= 0 && at.z <= leaf.source.height)
      assert.ok(at.alpha >= -1e-9 && at.alpha <= 1)
      // Within a cycle the leaf only falls (a new cycle restarts it higher).
      if (at.z <= previous || at.z > previous + 1) previous = at.z
      if (at.z === 0) landed = true
      assert.ok(Math.hypot(at.x - leaf.source.x, at.y - leaf.source.y) < leaf.source.radius + 1.5)
    }
    assert.ok(landed)
  }
})

test('without oaks there are no leaves', () => {
  const config: GardenConfig = { ...garden, objects: garden.objects.filter((object) => object.type !== 'oak') }
  assert.deepEqual(buildWorld(config).leaves, [])
})

test('snowflakes stay in their area and melt at the ground', () => {
  const { area } = garden.snow!
  for (const flake of world.flakes) {
    for (let t = 0; t < 30; t += 0.7) {
      const at = flakeAt(flake, t)
      assert.ok(at.z >= 0 && at.z <= area.z + area.height)
      assert.ok(at.x > area.x - 1 && at.x < area.x + area.width + 1.5)
      assert.ok(at.alpha >= 0 && at.alpha <= 1)
    }
  }
})

test('blooms grow on open grass that nothing in front hides', () => {
  assert.ok(world.bloomSpots.length >= 20, `${world.bloomSpots.length} spots`)
  // Right behind the big oak's trunk (screen-wise) is hidden, so never a spot.
  assert.ok(!world.bloomSpots.some((spot) => Math.hypot(spot.x + 0.5, spot.y + 0.5) < 0.8))
  for (const spot of world.bloomSpots) {
    assert.ok(garden.islands.some((island) => Math.hypot(spot.x - island.x, spot.y - island.y) < island.radius), JSON.stringify(spot))
  }
  for (const bloom of world.blooms) {
    for (let t = 0; t < bloom.period * 3; t += 0.5) {
      const at = bloomAt(bloom, t, world.bloomSpots)!
      for (const stage of [at.stem, at.head, at.alpha]) assert.ok(stage >= 0 && stage <= 1)
      // The head opens only once the stem has mostly grown.
      if (at.head > 0) assert.ok(at.stem > 0.5)
    }
  }
  assert.equal(bloomAt(world.blooms[0], 1, []), null)
})
