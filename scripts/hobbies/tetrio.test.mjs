import assert from 'node:assert/strict'
import test from 'node:test'
import { downsample } from './format.mjs'
import { fetchTetrio, normalizeTetrio } from './tetrio.mjs'

const config = { username: 'uselessleaf' }
const raw = () => ({
  user: { username: 'uselessleaf', country: 'CA', gamesplayed: 200, gameswon: 101, gametime: 7200 },
  league: { tr: 20693.4, apm: 82.54, pps: 2.019, vs: 169.01, rank: 'u', bestrank: 'ss', standing: 1566, standing_local: 90 },
  sprint: { record: { results: { stats: { finaltime: 32950 } } }, rank: 6477, rank_local: 405 },
  blitz: { record: { results: { stats: { score: 587087 } } }, rank: -1, rank_local: -1 },
  flow: { startTime: Date.UTC(2024, 7, 17), points: [[0, 1, 14407, 1], [86_400_000, 2, 14300, 1], [172_800_000, 1, -1, 1]] },
})

test('TETR.IO responses become formatted stats and a TR history', () => {
  const snapshot = normalizeTetrio(raw(), config, '2026-10-19T04:00:00.000Z')
  assert.deepEqual(snapshot.stats.map(stat => [stat.label, stat.value, stat.detail]), [
    ['league rank', 'U', '#90 Canada · #1,566 global'],
    ['TR', '20693', 'best rank SS'],
    ['APM / PPS / VS', '82.5 / 2.02 / 169.0', 'last 10 games stats'],
    ['40L PB', '32.950s', '#405 Canada · #6,477 global'],
    ['Blitz PB', '587,087', undefined],
    ['win rate', '50.5%', '101 / 200 games played · 2h time played'],
  ])
  assert.ok(!('detail' in snapshot.stats[4]))
  assert.deepEqual(snapshot.history.points, [{ label: 'Aug 17, 2024', value: 14407 }, { label: 'Aug 18, 2024', value: 14300 }])
})

test('missing records show a dash and unranked or mismatched profiles are rejected', () => {
  const data = raw()
  data.sprint = { record: null, rank: -1, rank_local: -1 }
  assert.equal(normalizeTetrio(data, config, 'now').stats[3].value, '—')
  assert.throws(() => normalizeTetrio({ ...raw(), league: { ...raw().league, tr: -1 } }, config, 'now'), /unranked/)
  assert.throws(() => normalizeTetrio(raw(), { username: 'someone' }, 'now'), /does not match/)
})

test('downsampling keeps the first and last points', () => {
  const points = Array.from({ length: 100 }, (_, index) => index)
  const sampled = downsample(points, 36)
  assert.equal(sampled.length, 36)
  assert.deepEqual([sampled[0], sampled.at(-1)], [0, 99])
  assert.equal(downsample([1, 2], 36).length, 2)
})

test('TETR.IO requests share a session ID and surface API failures', async () => {
  const seen = []
  const ok = async (url, options) => { seen.push([url, options.headers['X-Session-ID']]); return Response.json({ success: true, data: {} }) }
  await fetchTetrio('UselessLeaf', ok)
  assert.equal(seen.length, 5)
  assert.equal(new Set(seen.map(entry => entry[1])).size, 1)
  assert.ok(seen.every(([url]) => url.includes('uselessleaf')))
  await assert.rejects(fetchTetrio('x', async () => Response.json({ success: false, error: { msg: 'nope' } })), /nope/)
  await assert.rejects(fetchTetrio('x', async () => new Response('', { status: 503 })), /503/)
})
