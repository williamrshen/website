import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import LZString from 'lz-string'
import { fetchBackup, normalizePractice } from './cstimer.mjs'
import { normalizeOfficial } from './wca.mjs'
import { refreshSnapshot, validateConfig, validateSnapshot } from './snapshot.mjs'

const config = JSON.parse(await readFile(new URL('../../config/cubing.json', import.meta.url), 'utf8'))
const now = '2026-10-12T04:17:00.000Z'
const empty = () => ({
  schemaVersion: 1, wcaId: config.wcaId, generatedAt: null,
  sources: {
    official: { fetchedAt: null, exportDate: null, country: null, competitionCount: null, events: {} },
    unofficial: { fetchedAt: null, events: {} },
  },
})
const solves = times => times.map((time, index) => [Array.isArray(time) ? time : [0, time], 'R U', '', 1700000000 + index])
const encode = value => LZString.compressToEncodedURIComponent(JSON.stringify(value))
const response = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

test('csTimer chunks are deduplicated for fetching and reconstructed in session order', async () => {
  const requests = []
  const raw = { session1: ['a', 'b'], session2: ['b'], properties: {} }
  const chunks = { slicea: encode(solves([10000, 20000])), sliceb: encode(solves([30000])) }
  const snapshot = await fetchBackup('TestSecret123', async (_url, options) => {
    requests.push(Object.fromEntries(options.body))
    return response(options.body.has('offset') ? { retcode: 0, data: encode(raw) } : { retcode: 0, datas: chunks })
  })
  assert.deepEqual(snapshot.session1.map(solve => solve[0][1]), [10000, 20000, 30000])
  assert.deepEqual(snapshot.session2.map(solve => solve[0][1]), [30000])
  assert.deepEqual(requests, [{ id: 'TestSecret123', offset: '0' }, { id: 'TestSecret123', ids: 'slicea,sliceb' }])
})

test('legacy inline backups work, while missing chunks and upstream errors fail explicitly', async () => {
  const legacy = { session1: JSON.stringify(solves([12345])), properties: {} }
  const snapshot = await fetchBackup('Test123', async () => response({ retcode: 0, data: encode(legacy) }))
  assert.equal(snapshot.session1[0][0][1], 12345)
  await assert.rejects(fetchBackup('Test123', async (_url, options) => response(options.body.has('offset')
    ? { retcode: 0, data: encode({ session1: ['missing'] }) } : { retcode: 0, datas: {} })), /Missing csTimer/)
  await assert.rejects(fetchBackup('Test123', async () => response({ retcode: 404 })), /csTimer error: 404/)
})

test('practice records aggregate by event without creating averages across sessions', () => {
  const snapshot = {
    session1: solves([10000, 20000]), session2: solves([30000, 40000, 50000]),
    session3: solves([1, 1, 1, 1, 1]),
    properties: { sessionData: JSON.stringify({
      1: { name: 'Morning &amp; evening', opt: { scrType: '333' } },
      2: { name: 'Second session', opt: { scrType: '333' } },
      3: { name: 'OLL drills', opt: { scrType: 'pll' } },
    }) },
  }
  const mapped = { ...config, events: {
    ...config.events,
    '333': { ...config.events['333'], sessionNames: ['Morning & evening', 'Second session'] },
  } }
  const result = normalizePractice(snapshot, mapped, now)
  assert.equal(result.events['333'].solveCount, 5)
  assert.equal(result.events['333'].sessionCount, 2)
  assert.equal(result.events['333'].single.timeMs, 10000)
  assert.equal(result.events['333'].single.sessionName, 'Morning & evening')
  assert.equal(result.events['333'].average, null)
  assert.equal(result.events['333'].extras.mo3.timeMs, 40000)
  assert.equal(result.events['333'].sessionAverage.timeMs, 30000)
  assert.equal(result.events['333'].sessionAverage.validSolveCount, 5)
  assert.ok(!JSON.stringify(result).includes('R U'))
})

test('session average includes penalties and precision, excludes DNFs, and does not treat all-DNF sessions as zero', () => {
  const snapshot = {
    session1: solves([[0, 10005], [2000, 10001], [-1, 50000]]),
    session2: solves([[-1, 10000]]),
    properties: { sessionData: { 1: { name: '3x3' }, 2: { name: '2x2' } } },
  }
  const events = normalizePractice(snapshot, config, now).events
  assert.equal(events['333'].solveCount, 3)
  assert.deepEqual(events['333'].sessionAverage, { timeMs: 11000, precisionMs: 10, validSolveCount: 2 })
  assert.equal(events['222'].sessionAverage, null)
  assert.equal(events['222'].solveCount, 1)
})

test('session inclusion and exclusion use names, and custom averages are labeled explicitly', () => {
  const snapshot = {
    session1: solves([1000, 2000, 3000, 4000, 10000]), session2: solves([1, 1, 1, 1, 1]),
    properties: { sr_trim: true, sr_trimr: true, sessionData: JSON.stringify({
      1: { name: 'Public', opt: { scrType: '333', trim: '0', trimr: '0' } },
      2: { name: 'Private', opt: { scrType: '333' } },
    }) },
  }
  const filtered = {
    ...config,
    practice: { includeSessionNames: [' PUBLIC ', 'private'], excludeSessionNames: [' PRIVATE '] },
    events: { ...config.events, '333': { ...config.events['333'], sessionNames: ['Public', 'Private'] } },
  }
  const result = normalizePractice(snapshot, filtered, now).events['333']
  assert.equal(result.sessionCount, 1)
  assert.equal(result.average.kind, 'custom')
  assert.equal(result.average.timeMs, 4000)
  assert.equal(result.extras.mo3.kind, 'mo3')
  assert.throws(() => normalizePractice(snapshot, {
    ...config, practice: { includeSessionNames: ['Misspelled name'], excludeSessionNames: [] },
  }, now), /was not found/)
})

test('all eight WCA aliases are classified only by name, even when scramble types disagree', () => {
  const mapping = [
    [' 3×3 ', '333'], ['2x2', '222'], ['4x4', '444'], [' OH ', '333oh'],
    ['skewb', 'skewb'], ['clock', 'clock'], ['sq1', 'sq1'], ['BLD', '333bf'],
  ]
  const snapshot = { properties: { sessionData: {} } }
  for (const [index, [name]] of mapping.entries()) {
    snapshot[`session${index + 1}`] = solves([(index + 1) * 10000])
    snapshot.properties.sessionData[index + 1] = { name, opt: { scrType: '333' } }
  }
  for (const [index, name] of ['virtual', 'cycles', '2 ppl', '10.11 333'].entries()) {
    const id = index + 9
    snapshot[`session${id}`] = solves([1])
    snapshot.properties.sessionData[id] = { name, opt: { scrType: '333' } }
  }
  const result = normalizePractice(snapshot, config, now)
  assert.deepEqual(Object.keys(result.events).sort(), mapping.map(([, event]) => event).sort())
  for (const [index, [, eventId]] of mapping.entries()) {
    assert.equal(result.events[eventId].single.timeMs, (index + 1) * 10000)
    assert.equal(result.events[eventId].sessionCount, 1)
    assert.equal(result.events[eventId].solveCount, 1)
  }
})

test('ambiguous normalized session names cannot be mapped to different events', () => {
  const ambiguous = { ...config, events: {
    ...config.events,
    '333': { ...config.events['333'], sessionNames: ['3x3', 'OH'] },
  } }
  assert.throws(() => validateConfig(ambiguous), /Session names must map to exactly one event/)
})

test('official records convert timed centiseconds and retain ranks and competition metadata', () => {
  const result = normalizeOfficial({
    person: { id: config.wcaId, country: 'CA', numberOfCompetitions: 6, rank: {
      singles: [{ eventId: '333', best: 815, rank: { country: 307, world: 8828 } }, { eventId: '333fm', best: 20 }],
      averages: [{ eventId: '333', best: 879, rank: { country: 144, world: 3868 } }],
    } },
    version: { export_date: '2026-10-11T00:00:31Z' },
  }, config, now)
  assert.equal(result.events['333'].single.timeMs, 8150)
  assert.equal(result.events['333'].average.timeMs, 8790)
  assert.equal(result.events['333'].average.kind, 'ao5')
  assert.equal(result.events['333'].single.rank.country, 307)
  assert.equal(result.competitionCount, 6)
  assert.equal(result.events['333'].roundCount, null)
  assert.equal(result.events['333'].attemptCount, null)
  assert.ok(!result.events['333fm'])
})

test('official round and attempt counts are event-specific; DNF attempts count, DNS/unattempted tries do not', () => {
  const round = (best, average = 0, tries = [best]) => ({ best, average, format: 'Average of 5', solves: tries })
  const source = normalizeOfficial({
    person: {
      id: config.wcaId, country: 'CA', numberOfCompetitions: 2,
      rank: { singles: [{ eventId: '333', best: 1000 }, { eventId: '222', best: 500 }], averages: [] },
      results: {
        First: {
          '333': [round(1000, 1200, [1000, 1200, 1300, 1400, 1500])],
          '222': [round(500, 700, [500, 600, 700, 800, 900]), round(-1, 0, [500, 500, -1]),
            round(-2, 0, [-2, -2]), round(0, 0, [500, 0, 0])],
          '333bf': [round(-1, 0, [-1, -1, 25000])],
        },
        Second: { '333': [round(1100, 1300, [1100, 1200, 1300, 1400, 1500]), round(-1, 0, [1000, -1])] },
      },
    },
    version: { export_date: now },
    competitions: {
      First: { name: 'First', date: { from: '2024-01-01', till: '2024-01-01' } },
      Second: { name: 'Second', date: { from: '2025-01-01', till: '2025-01-01' } },
    },
  }, config, now)
  assert.equal(source.events['333'].roundCount, 3)
  assert.equal(source.events['333'].attemptCount, 12)
  assert.equal(source.events['222'].roundCount, 2)
  assert.equal(source.events['222'].attemptCount, 9)
  assert.equal(source.events['333bf'].roundCount, 1)
  assert.equal(source.events['333bf'].attemptCount, 3)
  assert.equal(source.events['333bf'].single, null)
})

test('invalid WCA identity or metadata is rejected', () => {
  assert.throws(() => normalizeOfficial({ person: { id: 'Wrong' }, version: {} }, config, now), /does not match/)
  assert.throws(() => validateConfig({ ...config, practice: { includeSessionNames: 'Public', excludeSessionNames: [] } }), /filters/)
  const invalid = empty()
  invalid.sources.unofficial = { fetchedAt: now, events: { '333': { single: { timeMs: Infinity }, average: null } } }
  assert.throws(() => validateSnapshot(invalid, config), /Invalid personal best/)
})

test('refresh preserves each failed source and its original freshness timestamp', async () => {
  const previous = empty()
  previous.sources.unofficial = { fetchedAt: '2026-10-01T00:00:00Z', events: {} }
  const fresh = { ...previous.sources.official, fetchedAt: now, exportDate: now, country: 'CA', competitionCount: 6 }
  const result = await refreshSnapshot({
    previous, config, now,
    loadOfficial: async () => fresh,
    loadPractice: async () => { throw new Error('Unavailable'); },
  })
  assert.deepEqual(result.snapshot.sources.unofficial, previous.sources.unofficial)
  assert.equal(result.snapshot.sources.official.fetchedAt, now)
  assert.equal(result.snapshot.generatedAt, now)
  assert.deepEqual(result.warnings, ['unofficial: Unavailable'])
  assert.equal(previous.generatedAt, null)
})

test('a total upstream failure does not produce a replacement snapshot', async () => {
  await assert.rejects(refreshSnapshot({
    previous: empty(), config, now,
    loadOfficial: async () => { throw new Error('Unavailable'); }, loadPractice: null,
  }), /No source refreshed/)
})

test('invalid fetched metadata is not allowed to replace the last-good source', async () => {
  const previous = empty()
  const result = await refreshSnapshot({
    previous, config, now,
    loadOfficial: async () => ({ ...previous.sources.official, fetchedAt: now }),
    loadPractice: async () => ({ fetchedAt: now, events: {} }),
  })
  assert.deepEqual(result.snapshot.sources.official, previous.sources.official)
  assert.equal(result.warnings.length, 1)
})
