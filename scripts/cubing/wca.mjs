import { personalBestPoints } from './progression.mjs'

const baseUrl = 'https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/'

export async function fetchOfficial(wcaId, fetcher = fetch) {
  const read = async path => {
    const response = await fetcher(baseUrl + path, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`WCA HTTP error: ${response.status}`)
    return response.json()
  }
  const [person, version] = await Promise.all([read(`persons/${wcaId}.json`), read('version.json')])
  const competitions = Object.fromEntries(await Promise.all(Object.keys(person.results ?? {}).map(async id => [
    id, await read(`competitions/${id}.json`),
  ])))
  return { person, version, competitions }
}

function record(result, kind) {
  if (!Number.isSafeInteger(result.best)) throw new Error('Invalid WCA result')
  if (result.best <= 0) return null
  const rank = Object.fromEntries(['world', 'continent', 'country'].map(key => [
    key, Number.isSafeInteger(result.rank?.[key]) && result.rank[key] > 0 ? result.rank[key] : null,
  ]))
  return { timeMs: result.best * 10, precisionMs: 10, rank, ...(kind ? { kind } : {}) }
}

export function normalizeOfficial({ person, version, competitions = {} }, config, fetchedAt) {
  if (person.id !== config.wcaId || !Array.isArray(person.rank?.singles) || !Array.isArray(person.rank?.averages)) {
    throw new Error('WCA person data does not match the configured profile')
  }
  if (!Number.isSafeInteger(person.numberOfCompetitions) || person.numberOfCompetitions < 0 ||
    !Number.isFinite(Date.parse(version.export_date))) throw new Error('Invalid WCA metadata')

  const events = {}
  for (const result of person.rank.singles) {
    if (!config.events[result.eventId]) continue
    const event = events[result.eventId] ??= { single: null, average: null, roundCount: person.results ? 0 : null, attemptCount: person.results ? 0 : null }
    event.single = record(result)
  }
  for (const result of person.rank.averages) {
    const eventConfig = config.events[result.eventId]
    if (!eventConfig?.averageKind) continue
    const event = events[result.eventId] ??= { single: null, average: null, roundCount: person.results ? 0 : null, attemptCount: person.results ? 0 : null }
    event.average = record(result, eventConfig.averageKind)
  }
  for (const results of Object.values(person.results ?? {})) {
    for (const [eventId, rounds] of Object.entries(results)) {
      if (!config.events[eventId]) continue
      if (!Array.isArray(rounds) || rounds.some(round => !Number.isSafeInteger(round.best) ||
        !Array.isArray(round.solves) || round.solves.some(solve => !Number.isSafeInteger(solve)))) throw new Error('Invalid WCA round results')
      const event = events[eventId] ??= { single: null, average: null, roundCount: 0, attemptCount: 0 }
      // A DNF is an attempted round; DNS/no-result entries were not started.
      event.roundCount += rounds.filter(round => round.best > 0 || round.best === -1).length
      // Positive solve values and DNFs are attempts. 0 means unattempted, -2 means DNS.
      event.attemptCount += rounds.reduce((total, round) => total + round.solves.filter(solve => solve > 0 || solve === -1).length, 0)
    }
  }
  const histories = Object.fromEntries(Object.entries(events).map(([id]) => [id, {
    single: [], ...(config.events[id].averageKind ? { [config.events[id].averageKind]: [] } : {}),
  }]))
  for (const [competitionId, results] of Object.entries(person.results ?? {})) {
    const competition = competitions[competitionId]
    const timestamp = Date.parse(competition?.date?.from) / 1000
    if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(Date.parse(competition?.date?.till)) ||
      competition.date.from > competition.date.till) throw new Error(`Invalid competition dates: ${competitionId}`)
    const origin = {
      timestamp, precisionMs: 10, competitionId, competitionName: competition.name,
      competitionFrom: competition.date.from, competitionTill: competition.date.till,
    }
    for (const [eventId, rounds] of Object.entries(results)) {
      if (!histories[eventId]) continue
      for (const round of rounds) {
        if (round.best > 0) histories[eventId].single.push({ ...origin, timeMs: round.best * 10 })
        if (round.average > 0) {
          const kind = { 'Average of 5': 'ao5', 'Mean of 3': 'mo3' }[round.format]
          if (kind !== config.events[eventId].averageKind) throw new Error(`Unexpected WCA average format: ${eventId}`)
          histories[eventId][kind].push({ ...origin, kind, timeMs: round.average * 10 })
        }
      }
    }
  }
  for (const [id, historiesByMetric] of Object.entries(histories)) {
    events[id].progression = Object.fromEntries(Object.entries(historiesByMetric).map(([metric, records]) => [metric, {
      kind: metric, undatedCount: 0, points: personalBestPoints(records),
    }]))
  }
  return {
    fetchedAt, exportDate: version.export_date, country: person.country,
    competitionCount: person.numberOfCompetitions, events,
  }
}
