import assert from 'node:assert/strict'
import { test } from 'node:test'
import { garden } from '../data/garden.ts'
import { lintGarden, missingSections } from './lint.ts'
import type { GardenConfig, GardenObject } from './types.ts'

const config = (objects: GardenObject[]): GardenConfig => ({
  ground: { extent: 10, seed: 1 },
  islands: [{ id: 'a', x: 0, y: 0, radius: 3 }],
  objects,
  fireflies: { count: 0, seed: 1, area: { x: 0, y: 0, z: 0, width: 1, depth: 1, height: 1 } },
})
const messages = (objects: GardenObject[]) => lintGarden(config(objects)).map((warning) => `${warning.object} ${warning.message}`)

test('the site garden has no warnings', () => {
  assert.deepEqual(lintGarden(garden), [])
})

test('objects off their island or floating over bare grid', () => {
  assert.match(messages([{ id: 'r', type: 'rock', island: 'a', x: 4, scale: 0.5 }]).join(), /r sits off its island "a"/)
  assert.match(messages([{ id: 'r', type: 'rock', x: 6, scale: 0.5 }]).join(), /r is not on any island/)
  assert.match(messages([{ id: 'r', type: 'rock', x: 9.5, scale: 0.2 }]).join(), /edge of the ground/)
})

test('objects that overlap at the ground', () => {
  assert.deepEqual(messages([
    { id: 'bench', type: 'bench', island: 'a' },
    { id: 'pine', type: 'pine', island: 'a', x: 0.2, y: 0.2, scale: 1 },
  ]), ['bench overlaps "pine" where they touch the ground'])
  // Piled rocks are intentional.
  assert.deepEqual(messages([
    { id: 'rock', type: 'rock', island: 'a', scale: 0.6 },
    { id: 'pebble', type: 'rock', island: 'a', x: 0.5, scale: 0.3 },
  ]), [])
})

test('scattered plants growing inside other objects are tallied per scatter', () => {
  const warnings = messages([
    { id: 'boulder', type: 'rock', island: 'a', x: -2, y: -2, scale: 4 },
    // keepOut below zero turns avoidance off, so plants can land in the boulder.
    { id: 'plants', type: 'scatter', count: 30, flowerEvery: 3, clearRadius: 0, keepOut: -10 },
  ])
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /^plants has plant parts growing inside boulder \(\d+\); try another seed/)
})

test('seeds on objects that never use randomness', () => {
  assert.deepEqual(messages([{ id: 'rock', type: 'rock', island: 'a', scale: 1, seed: 4 }]), ["rock sets a seed, but rock objects don't use randomness"])
  assert.deepEqual(messages([{ id: 'oak', type: 'oak', island: 'a', scale: 0.4, seed: 4 }]), [])
})

test('links no object uses', () => {
  const links = { home: { label: 'home', href: '#home' }, away: { label: 'away', href: '#away' } }
  const warnings = lintGarden({ ...config([{ id: 'r', type: 'rock', island: 'a', scale: 0.5, link: 'home' }]), links })
  assert.deepEqual(warnings.map((warning) => `${warning.object} ${warning.message}`), ['links.away is not used by any object, so it is not shown'])
})

test('links to sections the page lacks', () => {
  const page = (...ids: string[]) => (id: string) => ids.includes(id)
  assert.deepEqual(missingSections(garden, page('about', 'experience', 'work', 'hobbies')), [])
  assert.deepEqual(missingSections(garden, page('about', 'experience', 'hobbies')), [
    { object: 'links.projects', message: 'goes to "#work", but the page has no element with that id' },
  ])
  // Only in-page links are checked.
  assert.deepEqual(missingSections({ ...garden, links: { cv: { label: 'cv', href: '/resume.pdf' } } }, page()), [])
})
