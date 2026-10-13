import type { ProgressionPoint } from './cubing'

export type TimeWindow = { start: number; end: number }
export const CHART_HEIGHT = 220
const LEFT = 44
const RIGHT = 12
const TOP = 16
const BOTTOM = 34

export function clampTimeWindow(requested: TimeWindow, extent: TimeWindow): TimeWindow {
  if (!Number.isFinite(requested.start) || !Number.isFinite(requested.end)) return { ...extent }
  const minimumSpan = Math.min(60, extent.end - extent.start)
  const lower = Math.min(requested.start, requested.end)
  const span = Math.min(extent.end - extent.start, Math.max(minimumSpan, Math.abs(requested.end - requested.start)))
  const start = Math.min(extent.end - span, Math.max(extent.start, lower))
  return { start, end: start + span }
}

export function zoomTimeWindow(current: TimeWindow, extent: TimeWindow, factor: number, anchor = 0.5) {
  const position = Math.max(0, Math.min(1, anchor))
  const span = Math.min(extent.end - extent.start, Math.max(Math.min(60, extent.end - extent.start), (current.end - current.start) * factor))
  const date = current.start + (current.end - current.start) * position
  return clampTimeWindow({ start: date - span * position, end: date + span * (1 - position) }, extent)
}

export function panTimeWindow(current: TimeWindow, extent: TimeWindow, seconds: number) {
  return clampTimeWindow({ start: current.start + seconds, end: current.end + seconds }, extent)
}

export function progressionChart(points: ProgressionPoint[], requested: TimeWindow | null, updatedAt: string | null, width: number) {
  if (!points.length) return null
  const first = points[0]
  const last = points[points.length - 1]
  const fetchedAt = updatedAt ? Date.parse(updatedAt) / 1000 : last.timestamp
  const fullEnd = Math.max(last.timestamp, Number.isFinite(fetchedAt) ? fetchedAt : last.timestamp)
  const extent = { start: first.timestamp === fullEnd ? fullEnd - 86400 : first.timestamp, end: fullEnd }
  const window = requested ? clampTimeWindow(requested, extent) : extent
  const { start, end } = window
  const previous = points.findLast(point => point.timestamp < start)
  const visible = [
    ...(previous ? [{ point: previous, date: start, carried: true }] : []),
    ...points.filter(point => point.timestamp >= start && point.timestamp <= end)
      .map(point => ({ point, date: point.timestamp, carried: false })),
  ]
  if (!visible.length) return null

  const min = Math.min(...visible.map(({ point }) => point.timeMs))
  const max = Math.max(...visible.map(({ point }) => point.timeMs))
  const margin = Math.max((max - min) * 0.08, max * 0.03, 100)
  const lower = Math.max(0, min - margin)
  const upper = max + margin
  const bottom = CHART_HEIGHT - BOTTOM
  const x = (date: number) => LEFT + (date - start) / (end - start) * (width - LEFT - RIGHT)
  const y = (timeMs: number) => bottom - (timeMs - lower) / (upper - lower) * (bottom - TOP)
  const coordinates = visible.map(item => ({ ...item, x: x(item.date), y: y(item.point.timeMs) }))
  let line = `M ${coordinates[0].x} ${coordinates[0].y}`
  for (const coordinate of coordinates.slice(1)) line += ` H ${coordinate.x} V ${coordinate.y}`
  line += ` H ${x(end)}`
  const fill = `${line} L ${x(end)} ${bottom} L ${coordinates[0].x} ${bottom} Z`
  const span = end - start
  const dateFormat = new Intl.DateTimeFormat('en-CA', span >= 2 * 365 * 86400 ? { year: 'numeric', timeZone: 'UTC' }
    : span >= 180 * 86400 ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : span >= 86400 ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
        : { hour: '2-digit', minute: '2-digit', ...(span < 3600 ? { second: '2-digit' } : {}), hourCycle: 'h23', timeZone: 'UTC' })

  return {
    coordinates, line, fill, bottom, endX: x(end), left: LEFT, width, window, extent,
    zoomed: start > extent.start || end < extent.end,
    minimumSpan: Math.min(60, extent.end - extent.start),
    dateAtX: (position: number) => start + Math.max(0, Math.min(1, (position - LEFT) / (width - LEFT - RIGHT))) * span,
    yTicks: [upper, (upper + lower) / 2, lower].map(timeMs => ({
      y: y(timeMs), label: (timeMs / 1000).toLocaleString('en-CA', { maximumFractionDigits: 1 }),
    })),
    xTicks: [start, (start + end) / 2, end].map(date => ({ x: x(date), label: dateFormat.format(new Date(date * 1000)) })),
  }
}
