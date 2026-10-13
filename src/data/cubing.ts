import configuration from '../../config/cubing.json'
import generated from './generated/cubing.json'
import type { Stat } from './types'

export type CubingSource = 'official' | 'unofficial'
export type CubingRecord = {
  timeMs: number
  precisionMs?: number
  kind?: string
  rank?: { country: number | null; continent: number | null; world: number | null }
  sessionName?: string
  timestamp?: number | null
  startTimestamp?: number | null
  endTimestamp?: number | null
}

export type ProgressionMetric = 'single' | 'mo3' | 'ao5' | 'ao12' | 'ao50' | 'ao100' | 'ao1000'
export const unofficialProgressionMetrics: ProgressionMetric[] = ['single', 'mo3', 'ao5', 'ao12', 'ao50', 'ao100', 'ao1000']
export type ProgressionPoint = CubingRecord & {
  timestamp: number
  competitionId?: string
  competitionName?: string
  competitionFrom?: string
  competitionTill?: string
}
export type ProgressionHistory = {
  kind: ProgressionMetric | 'custom'
  undatedCount: number
  points: ProgressionPoint[]
}

type EventBests = {
  single: CubingRecord | null
  average: CubingRecord | null
  solveCount?: number
  sessionCount?: number
  sessionAverage?: (CubingRecord & { validSolveCount: number }) | null
  roundCount?: number | null
  attemptCount?: number | null
  extras?: Record<string, CubingRecord | null>
  progression?: Partial<Record<ProgressionMetric, ProgressionHistory>>
}

export type CubingSnapshot = {
  schemaVersion: number
  wcaId: string
  generatedAt: string | null
  sources: {
    official: {
      fetchedAt: string | null
      exportDate: string | null
      country: string | null
      competitionCount: number | null
      events: Record<string, EventBests>
    }
    unofficial: { fetchedAt: string | null; events: Record<string, EventBests> }
  }
}

type EventConfig = { label: string; averageKind: 'ao5' | 'mo3' | null; sessionNames: string[] }
const events = configuration.events as Record<string, EventConfig>
export const featuredCubingEvent = configuration.featuredEvent
export const cubingSnapshot = generated as CubingSnapshot
export const cubingProfileUrl = `https://www.worldcubeassociation.org/persons/${configuration.wcaId}`
const numbers = new Intl.NumberFormat('en-CA')
const dates = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function formatCubingTime(record: CubingRecord | null | undefined) {
  if (!record) return '—'
  const decimals = record.precisionMs === 1 ? 3 : 2
  const ticksPerSecond = decimals === 3 ? 1000 : 100
  const ticks = Math.round(record.timeMs / (1000 / ticksPerSecond))
  const minutes = Math.floor(ticks / (60 * ticksPerSecond))
  const seconds = (ticks % (60 * ticksPerSecond)) / ticksPerSecond
  return minutes
    ? `${minutes}:${seconds.toFixed(decimals).padStart(decimals + 3, '0')}`
    : `${seconds.toFixed(decimals)}s`
}

export function formatCubingDate(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isFinite(date.getTime()) ? dates.format(date) : null
}

export function getCubingEvents(snapshot: CubingSnapshot = cubingSnapshot) {
  const available = new Set([
    featuredCubingEvent,
    ...Object.keys(snapshot.sources.official.events),
    ...Object.keys(snapshot.sources.unofficial.events),
  ])
  return [featuredCubingEvent, ...Object.keys(events).filter(id => id !== featuredCubingEvent)]
    .filter(id => available.has(id))
    .map(id => ({ id, label: events[id].label }))
}

function rankDetail(record: CubingRecord | null, country: string | null) {
  if (!record) return 'No official result recorded'
  const region = country && /^[A-Z]{2}$/.test(country)
    ? new Intl.DisplayNames('en', { type: 'region' }).of(country) : 'National'
  return [
    record.rank?.country ? `${region} #${numbers.format(record.rank.country)}` : null,
    record.rank?.world ? `World #${numbers.format(record.rank.world)}` : null,
  ].filter(Boolean).join(' · ')
}

function practiceDetail(record: CubingRecord | null) {
  if (!record) return 'No valid record yet'
  return formatCubingDate(record.timestamp ?? record.endTimestamp) ?? ''
}

export function getCubingView(source: CubingSource, eventId: string, snapshot: CubingSnapshot = cubingSnapshot) {
  const event = events[eventId] ?? events[featuredCubingEvent]
  const data = snapshot.sources[source]
  const bests = data.events[eventId]
  const single = bests?.single ?? null
  const average = bests?.average ?? null
  const averageKind = average?.kind ?? event.averageKind
  const averageLabel = averageKind === 'custom' ? 'custom Ao5'
    : averageKind === 'mo3' ? (source === 'official' ? 'mean · Mo3' : 'Mo3')
      : averageKind === 'ao5' ? (source === 'official' ? 'average · Ao5' : 'Ao5') : 'average'
  let emptyMessage: string | null = null
  if (!data.fetchedAt) emptyMessage = source === 'official'
    ? 'Official results aren’t available yet.' : 'Practice results aren’t available yet.'
  else if (!bests) emptyMessage = source === 'official'
    ? `No official ${event.label} results recorded.` : `No ${event.label} practice sessions imported.`

  const stats: Stat[] = [
    {
      label: 'Single', value: formatCubingTime(single),
      detail: source === 'official' ? rankDetail(single, snapshot.sources.official.country) : practiceDetail(single),
    },
    {
      label: averageLabel, value: formatCubingTime(average),
      detail: source === 'official' ? rankDetail(average, snapshot.sources.official.country)
        : average ? practiceDetail(average) : event.averageKind ? 'Not enough solves or no valid average' : 'No standard average for this event',
    },
    source === 'official'
      ? {
          label: 'rounds',
          value: !data.fetchedAt ? '—' : !bests ? '0'
            : bests.roundCount === undefined || bests.roundCount === null ? '—' : numbers.format(bests.roundCount),
          detail: bests?.attemptCount === undefined || bests.attemptCount === null
            ? undefined : `${numbers.format(bests.attemptCount)} attempts`,
        }
      : {
          label: 'session average', value: formatCubingTime(bests?.sessionAverage),
          detail: bests ? `${numbers.format(bests.solveCount ?? 0)} solves` : data.fetchedAt ? '0 solves' : undefined,
        },
  ]
  const extraStats: Stat[] = source === 'unofficial' && bests && (bests.solveCount ?? 0) > 0
    ? Object.entries(bests.extras ?? {}).filter(([metric]) => metric !== event.averageKind).map(([metric, record]) => ({
        label: `${record?.kind === 'custom' ? 'custom ' : ''}${metric}`,
        value: formatCubingTime(record),
        detail: record?.sessionName,
      })) : []
  const updated = formatCubingDate(data.fetchedAt)
  const note = [
    source === 'official' ? 'Official WCA results' : 'Unofficial practice results',
    updated ? `last updated ${updated}` : 'waiting for first import',
  ].join(' · ')

  return {
    stats, extraStats, emptyMessage, note,
    progression: bests?.progression ?? {},
    progressionMetrics: (source === 'unofficial' ? unofficialProgressionMetrics
      : ['single', ...(event.averageKind ? [event.averageKind] : [])]) as ProgressionMetric[],
    updatedAt: data.fetchedAt,
    announcement: `${source === 'official' ? 'Official' : 'Unofficial'} ${event.label} results. ${emptyMessage ?? `Single ${stats[0].value}. Average ${stats[1].value}.`}`,
  }
}
