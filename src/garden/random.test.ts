import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRandom, seedFromId } from './random.ts'

test('createRandom is deterministic and in [0, 1)', () => {
  const a = createRandom(51), b = createRandom(51)
  for (let i = 0; i < 1000; i++) {
    const value = a()
    assert.equal(value, b())
    assert.ok(value >= 0 && value < 1)
  }
})

test('createRandom continues the original shared sequence from a captured state', () => {
  // The garden's per-object seeds are states captured from the old single generator, so a
  // generator seeded with the state after n draws must continue that sequence exactly.
  const shared = createRandom(51)
  let state = 51
  for (let i = 0; i < 100; i++) {
    shared()
    state = (state * 1664525 + 1013904223) >>> 0
  }
  const resumed = createRandom(state)
  for (let i = 0; i < 100; i++) assert.equal(resumed(), shared())
})

test('generators are independent', () => {
  const a = createRandom(1), b = createRandom(1)
  const other = createRandom(2)
  for (let i = 0; i < 10; i++) other()
  for (let i = 0; i < 10; i++) assert.equal(a(), b())
})

test('seedFromId is a stable unsigned 32-bit hash', () => {
  assert.equal(seedFromId('oak'), seedFromId('oak'))
  assert.notEqual(seedFromId('oak'), seedFromId('pine'))
  for (const id of ['', 'a', 'main-oak', 'a much longer identifier']) {
    const seed = seedFromId(id)
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32, id)
  }
  assert.equal(seedFromId(''), 2166136261)
})
