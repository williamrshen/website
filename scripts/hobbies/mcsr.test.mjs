import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMcsr, normalizeMcsr } from './mcsr.mjs'

const config = { username: 'uselessleaf' }
const me = '18bf'
const match = (date, eloRate, change) => ({ date, changes: [{ uuid: 'other', change: -change, eloRate: 1 }, { uuid: me, change, eloRate }] })
const raw = () => ({
  profile: {
    uuid: me, nickname: 'UselessLeaf', eloRate: 1178, eloRank: 4494,
    statistics: { total: { wins: { ranked: 374 }, loses: { ranked: 346 }, bestTime: { ranked: 815658 } } },
  },
  // Newest first; `eloRate` is the rating before the match.
  matches: [match(1792274618, 1157, 21), match(1791752716, 1177, -20), { date: 1791000000, changes: [{ uuid: me, change: null, eloRate: null }] }],
})

test('MCSR Ranked responses become formatted stats and an Elo history', () => {
  const snapshot = normalizeMcsr(raw(), config, '2026-10-19T04:00:00.000Z')
  assert.deepEqual(snapshot.stats.map(stat => [stat.label, stat.value, stat.detail]), [
    ['current elo', '1,178', 'rank #4,494'],
    ['all-time best', '13:35.658', 'ranked RSG'],
    ['ranked record', '374–346', '51.9% win rate'],
  ])
  // Oldest first, using the rating after each match; placement matches are skipped.
  assert.deepEqual(snapshot.history.points.map(point => point.value), [1157, 1178])
  assert.equal(snapshot.history.points[1].label, 'Oct 17, 2026')
})

test('best times pad seconds and unrated or mismatched profiles are rejected', () => {
  const data = raw()
  data.profile.statistics.total.bestTime.ranked = 601_005
  assert.equal(normalizeMcsr(data, config, 'now').stats[1].value, '10:01.005')
  data.profile.statistics.total.bestTime.ranked = null
  assert.equal(normalizeMcsr(data, config, 'now').stats[1].value, '—')
  assert.throws(() => normalizeMcsr({ ...raw(), profile: { ...raw().profile, eloRate: null } }, config, 'now'), /placement/)
  assert.throws(() => normalizeMcsr(raw(), { username: 'someone' }, 'now'), /does not match/)
})

test('MCSR Ranked requests the profile and ranked matches, and surfaces API failures', async () => {
  const urls = []
  await fetchMcsr('UselessLeaf', async url => { urls.push(url); return Response.json({ status: 'success', data: [] }) })
  assert.deepEqual(urls, [
    'https://api.mcsrranked.com/users/UselessLeaf',
    'https://api.mcsrranked.com/users/UselessLeaf/matches?type=2&count=100&excludedecay=true',
  ])
  await assert.rejects(fetchMcsr('x', async () => Response.json({ status: 'error', data: 'Rate limited' })), /Rate limited/)
  await assert.rejects(fetchMcsr('x', async () => new Response('', { status: 429 })), /429/)
})
