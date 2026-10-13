import assert from 'node:assert/strict'
import test from 'node:test'
import { getBests, getSessions } from './stats.mjs'

function session(times, properties = {}, options = {}) {
  return getSessions({
    session1: times.map((time, index) => [Array.isArray(time) ? time : [0, time], '', '', 1700000000 + index]),
    properties: { ...properties, sessionData: JSON.stringify({ 1: { name: 'Practice', opt: options } }) },
  })[0]
}

test('penalties, DNF, precision, and ties affect the selected single correctly', () => {
  const times = [[2000, 8009], [0, 10005], [-1, 1]]
  assert.deepEqual(getBests(session(times)).single, { timeMs: 10000, solveNumber: 1, timestamp: 1700000000 })
  assert.equal(getBests(session(times, { useMilli: true })).single.solveNumber, 2)
  assert.equal(getBests(session(times, { useMilli: true })).single.timeMs, 10005)
})

test('rolling means retain chronology, with no DNF filtering across windows', () => {
  assert.equal(getBests(session([10000, [-1, 1], 10000, 10000])).mo3, null)
  const result = getBests(session([30000, 40000, 10000, 10000, 10000])).mo3
  assert.equal(result.timeMs, 10000)
  assert.equal(result.startSolveNumber, 3)
  assert.equal(result.endSolveNumber, 5)
})

test('ao5 can discard one DNF but not two', () => {
  assert.equal(getBests(session([10000, 20000, 30000, 40000, [-1, 1]])).ao5.timeMs, 30000)
  assert.equal(getBests(session([10000, 20000, 30000, [-1, 1], [-1, 1]])).ao5, null)
})

test('rolling averages handle repeated values and select the first tied record', () => {
  const result = getBests(session([90000, 80000, 10000, 10000, 10000, 10000, 10000])).ao5
  assert.equal(result.timeMs, 10000)
  assert.equal(result.startSolveNumber, 2)
})

test('percentage trimming is rounded up for larger averages', () => {
  for (const [size, trim] of [[50, 3], [100, 5], [1000, 50]]) {
    const times = [...Array(trim).fill(1000), ...Array(size - 2 * trim).fill(10000), ...Array(trim).fill(100000)]
    assert.equal(getBests(session(times))[`ao${size}`].timeMs, 10000)
  }
})

test('session-specific settings and asymmetric or median trimming are honored', () => {
  const custom = session([1001, 2002, 3003, 4004, 10005],
    { sr_useMilli: true, sr_trim: true, sr_trimr: true }, { useMilli: true, trim: '0', trimr: '0' })
  assert.equal(getBests(custom).ao5.timeMs, 4003)
  assert.equal(getBests(session([1000, 2000, 3000, 4000, 5000], { trimr: '0' })).ao5.timeMs, 3500)
  assert.equal(getBests(session(Array.from({ length: 12 }, (_, index) => (index + 1) * 1000), { trim: 'm' })).ao12.timeMs, 6500)
  assert.equal(session([], { useMilli: true, sr_useMilli: true }).settings.precisionMs, 10)
})

test('empty and all-DNF sessions have no valid records', () => {
  for (const times of [[], Array(12).fill([-1, 10000])]) {
    assert.ok(Object.values(getBests(session(times))).every(result => result === null))
  }
})
