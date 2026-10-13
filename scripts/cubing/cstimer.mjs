import LZString from 'lz-string'
import { getBests, getProgressionCandidates, getSessions, getSessionTotals, trimCounts } from './stats.mjs'
import { decodeSessionName, sessionNameKey } from './session-names.mjs'
import { personalBestPoints, PROGRESSION_METRICS } from './progression.mjs'

function decode(value) {
  if (typeof value !== 'string') throw new Error('Missing csTimer backup data')
  const json = LZString.decompressFromEncodedURIComponent(value)
  if (!json) throw new Error('Invalid compressed csTimer backup')
  return JSON.parse(json)
}

export async function fetchBackup(id, fetcher = fetch) {
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) throw new Error('CSTIMER_ID must contain only letters and digits')
  const read = async parameters => {
    const response = await fetcher('https://cstimer.net/userdata2.php', {
      method: 'POST',
      body: new URLSearchParams({ id, ...parameters }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`csTimer HTTP error: ${response.status}`)
    const result = await response.json()
    if (result.retcode !== 0) throw new Error(`csTimer error: ${result.retcode}; check your ID and export`)
    return result
  }

  const snapshot = decode((await read({ offset: '0' })).data)
  const sessions = Object.entries(snapshot)
    .filter(([key]) => /^session\d+$/.test(key))
    .map(([key, value]) => [key, typeof value === 'string' ? JSON.parse(value) : value])
  const ids = [...new Set(sessions.flatMap(([, rows]) =>
    typeof rows[0] === 'string' ? rows.map(hash => `slice${hash}`) : []))]
  const chunks = ids.length ? (await read({ ids: ids.join(',') })).datas : {}
  for (const [key, rows] of sessions) {
    snapshot[key] = typeof rows[0] === 'string' ? rows.flatMap(hash => decode(chunks[`slice${hash}`])) : rows
  }
  return snapshot
}

function publicRecord(record, session, metric) {
  if (!record) return null
  const result = { ...record, sessionName: session.name, precisionMs: session.settings.precisionMs }
  if (metric) {
    const size = Number(metric.slice(2))
    const trims = trimCounts(size, session.settings)
    result.kind = metric === 'mo3' || trims.every(trim => trim === Math.ceil(size * 0.05)) ? metric : 'custom'
  }
  return result
}

function chooseBest(current, candidate) {
  return candidate && (!current || candidate.timeMs < current.timeMs) ? candidate : current
}

export function normalizePractice(snapshot, config, fetchedAt) {
  const events = {}
  const histories = {}
  const sessionTotals = {}
  const { includeSessionNames, excludeSessionNames } = config.practice
  const sessions = getSessions(snapshot)
  const importedNames = new Set(sessions.map(session => sessionNameKey(session.name)))
  const included = includeSessionNames === null ? null : new Set(includeSessionNames.map(sessionNameKey))
  const excluded = new Set(excludeSessionNames.map(sessionNameKey))
  const mappings = new Map(Object.entries(config.events).flatMap(([id, event]) =>
    event.sessionNames.map(name => [sessionNameKey(name), [id, event]])))
  if (includeSessionNames?.some(name => !importedNames.has(sessionNameKey(name)))) {
    throw new Error('An included practice session name was not found; check config/cubing.json')
  }

  for (const original of sessions) {
    const session = { ...original, name: decodeSessionName(original.name) }
    const name = sessionNameKey(session.name)
    if (included !== null && !included.has(name)) continue
    if (excluded.has(name)) continue
    const match = mappings.get(name)
    if (!match) continue
    if (!Array.isArray(session.solves) || session.solves.some(solve =>
      !Array.isArray(solve) || !Array.isArray(solve[0]) ||
      !Number.isSafeInteger(solve[0][0]) || solve[0][0] < -1 ||
      !Number.isSafeInteger(solve[0][1]) || solve[0][1] < 0)) {
      throw new Error(`Invalid solve data in session ${session.id}`)
    }
    const [eventId, event] = match
    const bests = getBests(session)
    const candidates = getProgressionCandidates(session)
    const totals = getSessionTotals(session)
    const combined = sessionTotals[eventId] ??= { totalMs: 0, validSolveCount: 0, precisionMs: 10 }
    combined.totalMs += totals.totalMs
    combined.validSolveCount += totals.validSolveCount
    if (totals.validSolveCount) combined.precisionMs = Math.min(combined.precisionMs, session.settings.precisionMs)
    const summary = events[eventId] ??= {
      single: null, average: null, solveCount: 0, sessionCount: 0,
      extras: { mo3: null, ao12: null, ao50: null, ao100: null, ao1000: null },
    }
    summary.solveCount += session.solves.length
    summary.sessionCount++
    summary.single = chooseBest(summary.single, publicRecord(bests.single, session))
    if (event.averageKind) {
      summary.average = chooseBest(summary.average, publicRecord(bests[event.averageKind], session, event.averageKind))
    }
    for (const metric of Object.keys(summary.extras)) {
      summary.extras[metric] = chooseBest(summary.extras[metric], publicRecord(bests[metric], session, metric))
    }
    const eventHistory = histories[eventId] ??= Object.fromEntries(PROGRESSION_METRICS.map(metric =>
      [metric, { records: [], undatedCount: 0, kind: metric }]))
    for (const [metric, history] of Object.entries(candidates)) {
      eventHistory[metric].undatedCount += history.undatedCount
      for (const record of history.records) {
        const published = publicRecord(record, session, metric === 'single' ? undefined : metric)
        if (published.kind === 'custom') eventHistory[metric].kind = 'custom'
        eventHistory[metric].records.push(published)
      }
    }
  }
  for (const [eventId, history] of Object.entries(histories)) {
    const totals = sessionTotals[eventId]
    events[eventId].sessionAverage = totals.validSolveCount ? {
      timeMs: totals.totalMs / totals.validSolveCount,
      precisionMs: totals.precisionMs,
      validSolveCount: totals.validSolveCount,
    } : null
    events[eventId].progression = Object.fromEntries(Object.entries(history).map(([metric, data]) => [metric, {
      kind: data.kind, undatedCount: data.undatedCount, points: personalBestPoints(data.records),
    }]))
  }
  return { fetchedAt, events }
}
