import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { personalBestPoints } from './progression.mjs'
import { getProgressionCandidates } from './stats.mjs'
import { normalizePractice } from './cstimer.mjs'
import { fetchOfficial, normalizeOfficial } from './wca.mjs'
import { validateSnapshot } from './snapshot.mjs'

const config = JSON.parse(await readFile(new URL('../../config/cubing.json', import.meta.url), 'utf8'))
const now = '2026-10-12T04:17:00Z'
const base = 1700000000
const point = (timeMs, offset) => ({ timeMs, timestamp: base + offset, precisionMs: 10 })

test('PB history sorts edited dates, coalesces equal timestamps, and excludes slower results', () => {
  const points = personalBestPoints([point(30000, 3), point(20000, 1), point(10000, 2), point(9000, 2), point(11000, 4)])
  assert.deepEqual(points, [point(20000, 1), point(9000, 2)])
  assert.deepEqual(personalBestPoints([{ ...point(1000, 1), timestamp: 0 }]), [])
})

test('average progression retains DNFs and dates a window when all its attempts have happened', () => {
  const session = {
    settings: { precisionMs: 10, trim: 'p5', trimr: 'a' },
    solves: [
      [[0, 10000], '', '', base + 1], [[-1, 50000], '', '', base + 5],
      [[0, 20000], '', '', base + 2], [[0, 30000], '', '', base + 3], [[0, 40000], '', '', base + 4],
    ],
  }
  const history = getProgressionCandidates(session)
  assert.equal(history.ao5.records[0].timeMs, 30000)
  assert.equal(history.ao5.records[0].timestamp, base + 5)
  assert.equal(history.mo3.records.length, 1)
  assert.equal(history.mo3.records[0].timeMs, 30000)
})

test('undated solves do not receive invented historical dates', () => {
  const session = {
    settings: { precisionMs: 10, trim: 'p5', trimr: 'a' },
    solves: [10000, 20000, 30000].map((time, index) => [[0, time], '', '', index ? base + index : 0]),
  }
  const history = getProgressionCandidates(session)
  assert.equal(history.single.undatedCount, 1)
  assert.equal(history.mo3.undatedCount, 1)
  assert.equal(history.mo3.records.length, 0)
})

test('practice histories are chronological, session-bound, and agree with the current PBs', () => {
  const snapshot = {
    session1: [30000, 10000, 20000, 9000, 8000].map((time, index) => [[0, time], '', '', base + [3, 1, 2, 5, 4][index]]),
    session2: [[[0, 7000], '', '', base + 6]],
    properties: { sessionData: { 1: { name: '3x3' }, 2: { name: '3x3' } } },
  }
  const event = normalizePractice(snapshot, config, now).events['333']
  assert.deepEqual(event.progression.single.points.map(p => [p.timeMs, p.timestamp]), [
    [10000, base + 1], [8000, base + 4], [7000, base + 6],
  ])
  assert.equal(event.progression.single.points.at(-1).timeMs, event.single.timeMs)
  assert.equal(event.progression.mo3.points.at(-1).timeMs, event.extras.mo3.timeMs)
  assert.equal(event.progression.ao5.points.at(-1).timeMs, event.average.timeMs)
  assert.equal(event.progression.ao5.points.length, 1)
  assert.equal(event.progression.mo3.points.at(-1).endSolveNumber, 5)
})

test('all larger average histories agree with current records and date complete windows efficiently', () => {
  for (const size of [12, 50, 100, 1000]) {
    const snapshot = {
      session1: Array.from({ length: size }, (_, index) => [[0, 10000], '', '', base + index]),
      properties: { sessionData: { 1: { name: '3x3' } } },
    }
    // An edited date in the middle must still determine when the entire window completed.
    snapshot.session1[3][3] = base + size + 100
    const event = normalizePractice(snapshot, config, now).events['333']
    const metric = `ao${size}`
    assert.equal(event.progression[metric].points.length, 1)
    assert.equal(event.progression[metric].points[0].timeMs, event.extras[metric].timeMs)
    assert.equal(event.progression[metric].points[0].timestamp, base + size + 100)
  }
})

test('official histories use competition dates, best round records, and official average formats', () => {
  const person = {
    id: config.wcaId, country: 'CA', numberOfCompetitions: 3,
    rank: { singles: [{ eventId: '333', best: 800 }], averages: [{ eventId: '333', best: 1000 }] },
    results: {
      Recent: { '333': [
        { best: 850, average: 1100, format: 'Average of 5', solves: [850, 900, 1000, 1100, 1200] },
        { best: 800, average: 1000, format: 'Average of 5', solves: [800, 900, 1000, 1100, 1200] },
      ] },
      First: { '333': [{ best: 1500, average: 1800, format: 'Average of 5', solves: [1500, 1600, 1700, 1800, 1900] }] },
      Middle: { '333': [{ best: 1200, average: 1400, format: 'Average of 5', solves: [1200, 1300, 1400, 1500, 1600] }] },
    },
  }
  const competitions = Object.fromEntries([
    ['Recent', '2024-06-08', '2024-06-09'], ['First', '2016-06-18', '2016-06-18'], ['Middle', '2018-03-24', '2018-03-24'],
  ].map(([id, from, till]) => [id, { name: id, date: { from, till } }]))
  const source = normalizeOfficial({ person, version: { export_date: now }, competitions }, config, now)
  const event = source.events['333']
  assert.deepEqual(Object.keys(event.progression), ['single', 'ao5'])
  assert.deepEqual(event.progression.single.points.map(p => p.timeMs), [15000, 12000, 8000])
  assert.deepEqual(event.progression.ao5.points.map(p => p.timeMs), [18000, 14000, 10000])
  assert.equal(event.progression.single.points.at(-1).competitionTill, '2024-06-09')
  assert.equal(event.progression.single.points.at(-1).timeMs, event.single.timeMs)
  assert.throws(() => normalizeOfficial({ person, version: { export_date: now } }, config, now), /competition dates/)
})

test('official refresh fetches each competition date from the static API', async () => {
  const requests = []
  const data = await fetchOfficial(config.wcaId, async url => {
    requests.push(url)
    const value = url.endsWith('version.json') ? { export_date: now }
      : url.includes('/persons/') ? { results: { First: {}, Second: {} } }
        : { name: url.includes('First') ? 'First' : 'Second', date: { from: '2016-01-01', till: '2016-01-01' } }
    return new Response(JSON.stringify(value))
  })
  assert.equal(requests.length, 4)
  assert.deepEqual(Object.keys(data.competitions), ['First', 'Second'])
})

test('snapshot validation rejects non-PB or unsupported official chart data', () => {
  const snapshot = {
    schemaVersion: 1, wcaId: config.wcaId, generatedAt: now,
    sources: {
      official: { fetchedAt: now, exportDate: now, country: 'CA', competitionCount: 1, events: {
        '333': { single: point(10000, 1), average: null, progression: {
          single: { kind: 'single', undatedCount: 0, points: [point(10000, 1), point(11000, 2)] },
        } },
      } },
      unofficial: { fetchedAt: null, events: {} },
    },
  }
  assert.throws(() => validateSnapshot(snapshot, config), /personal-best improvements/)
  snapshot.sources.official.events['333'].progression = { mo3: { kind: 'mo3', undatedCount: 0, points: [] } }
  assert.throws(() => validateSnapshot(snapshot, config), /Unsupported official/)
})
