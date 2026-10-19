import type { HistorySeries } from './types'

/** A viewport over a series, in (fractional) point indices rather than dates. */
export type IndexWindow = { start: number; end: number }
export const HISTORY_HEIGHT = 190
const LEFT = 48
const RIGHT = 12
const TOP = 16
const BOTTOM = 30

const minimumSpan = (count: number) => Math.min(3, count - 1)

export function clampWindow(requested: IndexWindow, count: number): IndexWindow {
  const full = count - 1
  if (!Number.isFinite(requested.start) || !Number.isFinite(requested.end)) return { start: 0, end: full }
  const span = Math.min(full, Math.max(minimumSpan(count), Math.abs(requested.end - requested.start)))
  const start = Math.min(full - span, Math.max(0, Math.min(requested.start, requested.end)))
  return { start, end: start + span }
}

export function zoomWindow(current: IndexWindow, count: number, factor: number, anchor = 0.5): IndexWindow {
  const position = Math.max(0, Math.min(1, anchor))
  const span = Math.min(count - 1, Math.max(minimumSpan(count), (current.end - current.start) * factor))
  const index = current.start + (current.end - current.start) * position
  return clampWindow({ start: index - span * position, end: index + span * (1 - position) }, count)
}

export function panWindow(current: IndexWindow, count: number, delta: number) {
  return clampWindow({ start: current.start + delta, end: current.end + delta }, count)
}

export function historyChart(series: HistorySeries, requested: IndexWindow | null, width: number) {
  const { points } = series
  if (points.length < 2) return null
  const count = points.length
  const window = requested ? clampWindow(requested, count) : { start: 0, end: count - 1 }
  const { start, end } = window
  const first = Math.ceil(start - 1e-9)
  const last = Math.floor(end + 1e-9)
  const inView = points.slice(first, last + 1).map(point => point.value)
  const min = Math.min(...inView)
  const max = Math.max(...inView)
  const margin = (max - min) * 0.12 || Math.abs(max) * 0.01 || 1
  const lower = min - margin
  const upper = max + margin
  const bottom = HISTORY_HEIGHT - BOTTOM
  const endX = width - RIGHT
  const x = (index: number) => LEFT + (index - start) / (end - start) * (endX - LEFT)
  const y = (value: number) => bottom - (value - lower) / (upper - lower) * (bottom - TOP)
  // Draw one neighbour beyond each edge so the line runs off the plot; the SVG clips it.
  const drawn = Array.from({ length: Math.min(count - 1, Math.ceil(end)) - Math.max(0, Math.floor(start)) + 1 }, (_, offset) => {
    const index = Math.max(0, Math.floor(start)) + offset
    return { index, x: x(index), y: y(points[index].value), point: points[index] }
  })
  const line = drawn.map((item, position) => `${position ? 'L' : 'M'} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(' ')
  const fill = `${line} L ${drawn.at(-1)!.x.toFixed(1)} ${bottom} L ${drawn[0].x.toFixed(1)} ${bottom} Z`
  const tickIndex = (fraction: number) => Math.round(start + (end - start) * fraction)
  const format = (value: number) => Math.round(value).toLocaleString('en-US')

  return {
    window, count, first, last, drawn, line, fill, bottom, left: LEFT, endX, width,
    zoomed: start > 1e-9 || end < count - 1 - 1e-9,
    minimumSpan: minimumSpan(count),
    indexAtX: (position: number) => start + Math.max(0, Math.min(1, (position - LEFT) / (endX - LEFT))) * (end - start),
    yTicks: [upper, (upper + lower) / 2, lower].map(value => ({ y: y(value), label: format(value) })),
    xTicks: [0, 0.5, 1].map(fraction => ({ x: x(tickIndex(fraction)), label: points[tickIndex(fraction)].label })),
  }
}
