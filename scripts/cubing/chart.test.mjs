import assert from 'node:assert/strict'
import test from 'node:test'
import { clampTimeWindow, panTimeWindow, progressionChart, zoomTimeWindow } from '../../src/data/cubing-chart.ts'

test('time-axis zoom preserves the cursor anchor and stays within the data extent', () => {
  const extent = { start: 0, end: 1000 }
  const zoomed = zoomTimeWindow({ start: 200, end: 800 }, extent, 0.5, 0.75)
  assert.deepEqual(zoomed, { start: 425, end: 725 })
  assert.equal(zoomed.start + (zoomed.end - zoomed.start) * 0.75, 650)
  assert.deepEqual(zoomTimeWindow(zoomed, extent, 20), extent)
})

test('dragging either direction produces a bounded window with a stable minimum span', () => {
  const extent = { start: 0, end: 1000 }
  assert.deepEqual(clampTimeWindow({ start: 700, end: 300 }, extent), { start: 300, end: 700 })
  assert.deepEqual(clampTimeWindow({ start: -100, end: 200 }, extent), { start: 0, end: 300 })
  assert.deepEqual(clampTimeWindow({ start: 990, end: 995 }, extent), { start: 940, end: 1000 })
  assert.deepEqual(clampTimeWindow({ start: NaN, end: Infinity }, extent), extent)
})

test('panning does not change the zoom scale or move beyond the history', () => {
  const extent = { start: 0, end: 1000 }
  assert.deepEqual(panTimeWindow({ start: 300, end: 700 }, extent, 100), { start: 400, end: 800 })
  assert.deepEqual(panTimeWindow({ start: 300, end: 700 }, extent, 800), { start: 600, end: 1000 })
  assert.deepEqual(panTimeWindow({ start: 300, end: 700 }, extent, -800), { start: 0, end: 400 })
})

test('zoomed charts carry the previous PB and retain its real achievement date', () => {
  const date = value => Date.parse(value) / 1000
  const points = [
    { timestamp: date('2016-06-18'), timeMs: 15000, precisionMs: 10 },
    { timestamp: date('2024-06-08'), timeMs: 8150, precisionMs: 10 },
  ]
  const view = { start: date('2025-01-01'), end: date('2026-01-01') }
  const model = progressionChart(points, view, '2026-10-12T04:17:00Z', 600)
  assert.equal(model.coordinates.length, 1)
  assert.equal(model.coordinates[0].carried, true)
  assert.equal(model.coordinates[0].date, view.start)
  assert.equal(model.coordinates[0].point.timestamp, date('2024-06-08'))
  assert.equal(model.dateAtX(model.left), view.start)
  assert.equal(model.dateAtX(model.endX), view.end)
  assert.ok(!/NaN|Infinity/.test(model.line + model.fill))
})

test('time-axis labels gain detail for narrow windows and single-point histories remain valid', () => {
  const start = Date.parse('2026-01-01T00:00:00Z') / 1000
  const points = [{ timestamp: start, timeMs: 10000, precisionMs: 10 }]
  const model = progressionChart(points, { start, end: start + 60 }, '2026-01-02T00:00:00Z', 300)
  assert.equal(model.xTicks[0].label, '00:00:00')
  assert.equal(model.xTicks[2].label, '00:01:00')
  assert.equal(model.window.end - model.window.start, 60)
  assert.equal(progressionChart([], null, null, 300), null)
})
