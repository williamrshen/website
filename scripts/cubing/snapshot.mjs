import { sessionNameKey } from './session-names.mjs'
import { PROGRESSION_METRICS } from './progression.mjs'

export function validateConfig(config) {
  if (!/^[0-9]{4}[A-Z]{4}[0-9]{2}$/.test(config.wcaId) || !config.events?.[config.featuredEvent]) {
    throw new Error('Invalid cubing profile or featured event configuration')
  }
  const { includeSessionNames, excludeSessionNames } = config.practice ?? {}
  if (!(includeSessionNames === null || Array.isArray(includeSessionNames)) || !Array.isArray(excludeSessionNames)) {
    throw new Error('Practice session filters must be arrays of names (or null for all included sessions)')
  }
  for (const names of [includeSessionNames ?? [], excludeSessionNames]) {
    if (names.some(name => typeof name !== 'string')) throw new Error('Session names must be strings')
  }
  const sessionNames = new Set()
  for (const event of Object.values(config.events)) {
    if (typeof event.label !== 'string' || !event.label || !Array.isArray(event.sessionNames) ||
      ![null, 'ao5', 'mo3'].includes(event.averageKind)) throw new Error('Invalid event configuration')
    for (const name of event.sessionNames) {
      if (typeof name !== 'string' || !sessionNameKey(name) || sessionNames.has(sessionNameKey(name))) {
        throw new Error('Session names must map to exactly one event')
      }
      sessionNames.add(sessionNameKey(name))
    }
  }
}

export function validateSnapshot(snapshot, config) {
  if (snapshot.schemaVersion !== 1 || snapshot.wcaId !== config.wcaId || !snapshot.sources ||
    (snapshot.generatedAt !== null && !Number.isFinite(Date.parse(snapshot.generatedAt)))) {
    throw new Error('Snapshot does not match the configured cubing profile')
  }
  for (const sourceName of ['official', 'unofficial']) {
    const source = snapshot.sources[sourceName]
    if (!source || !source.events || typeof source.events !== 'object' || Array.isArray(source.events) ||
      (source.fetchedAt !== null && !Number.isFinite(Date.parse(source.fetchedAt)))) {
      throw new Error(`Invalid ${sourceName} snapshot`)
    }
    if (source.fetchedAt === null && Object.keys(source.events).length) throw new Error('Results need a source refresh timestamp')
    if (sourceName === 'official' && source.fetchedAt !== null &&
      (!Number.isFinite(Date.parse(source.exportDate)) || typeof source.country !== 'string' ||
      !Number.isSafeInteger(source.competitionCount) || source.competitionCount < 0)) throw new Error('Invalid official snapshot metadata')
    for (const [eventId, event] of Object.entries(source.events)) {
      if (!config.events[eventId]) throw new Error(`Unknown event in snapshot: ${eventId}`)
      for (const result of [event.single, event.average, event.sessionAverage ?? null, ...Object.values(event.extras ?? {})]) {
        if (result !== null && (!result || !Number.isFinite(result.timeMs) || result.timeMs < 0)) {
          throw new Error('Invalid personal best in snapshot')
        }
        if (result && ![1, 10].includes(result.precisionMs)) throw new Error('Invalid result precision')
        for (const timestamp of [result?.timestamp, result?.startTimestamp, result?.endTimestamp]) {
          if (timestamp !== undefined && timestamp !== null && (!Number.isFinite(timestamp) || timestamp < 0)) {
            throw new Error('Invalid solve timestamp')
          }
        }
      }
      if (event.average && ![config.events[eventId].averageKind, 'custom'].includes(event.average.kind)) {
        throw new Error('Invalid average method')
      }
      if (sourceName === 'official' && event.average && event.average.kind !== config.events[eventId].averageKind) {
        throw new Error('Official averages must use the event’s standard method')
      }
      if (sourceName === 'unofficial' && (!Number.isSafeInteger(event.solveCount) || event.solveCount < 0 ||
        !Number.isSafeInteger(event.sessionCount) || event.sessionCount < 0)) throw new Error('Invalid practice counts')
      if (event.sessionAverage && (!Number.isSafeInteger(event.sessionAverage.validSolveCount) ||
        event.sessionAverage.validSolveCount < 1 || event.sessionAverage.validSolveCount > event.solveCount)) {
        throw new Error('Invalid session average count')
      }
      if (event.roundCount !== undefined && event.roundCount !== null &&
        (!Number.isSafeInteger(event.roundCount) || event.roundCount < 0)) throw new Error('Invalid event round count')
      if (event.attemptCount !== undefined && event.attemptCount !== null &&
        (!Number.isSafeInteger(event.attemptCount) || event.attemptCount < 0)) throw new Error('Invalid event attempt count')
      for (const [metric, history] of Object.entries(event.progression ?? {})) {
        if (!PROGRESSION_METRICS.includes(metric) || ![metric, ...(metric.startsWith('ao') ? ['custom'] : [])].includes(history.kind) ||
          !Array.isArray(history.points) || !Number.isSafeInteger(history.undatedCount) || history.undatedCount < 0) {
          throw new Error('Invalid progression metric')
        }
        if (sourceName === 'official' && (history.kind !== metric || (metric !== 'single' && metric !== config.events[eventId].averageKind))) {
          throw new Error('Unsupported official progression metric')
        }
        let previousTime = Infinity
        let previousDate = 0
        for (const point of history.points) {
          if (!Number.isFinite(point.timeMs) || point.timeMs < 0 || point.timeMs >= previousTime ||
            !Number.isFinite(point.timestamp) || point.timestamp <= previousDate || ![1, 10].includes(point.precisionMs)) {
            throw new Error('Progression points must be dated, chronological personal-best improvements')
          }
          previousDate = point.timestamp
          previousTime = point.timeMs
        }
      }
    }
  }
  return snapshot
}

export async function refreshSnapshot({ previous, config, loadOfficial, loadPractice, now }) {
  validateConfig(config)
  validateSnapshot(previous, config)
  const snapshot = structuredClone(previous)
  const warnings = []
  let refreshed = 0
  await Promise.all([
    ['official', loadOfficial], ['unofficial', loadPractice],
  ].map(async ([source, load]) => {
    if (!load) return
    try {
      const data = await load()
      validateSnapshot({ ...previous, sources: { ...previous.sources, [source]: data } }, config)
      snapshot.sources[source] = data
      refreshed++
    } catch (error) {
      warnings.push(`${source}: ${error.message}`)
    }
  }))
  if (!refreshed) throw new Error(`No source refreshed; keeping the published snapshot. ${warnings.join('; ')}`)
  snapshot.generatedAt = now
  return { snapshot: validateSnapshot(snapshot, config), warnings }
}
