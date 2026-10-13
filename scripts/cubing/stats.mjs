// Adapted from the local csTimer API. Windows stay within their source session.
import { personalBestPoints, PROGRESSION_METRICS, validTimestamp } from './progression.mjs'

const parse = value => typeof value === 'string' ? JSON.parse(value) : value

function sessionSetting(properties, options, key, defaultValue) {
  return properties[`sr_${key}`] ? options[key] ?? defaultValue : properties[key] ?? defaultValue
}

export function getSessions(snapshot) {
  const properties = parse(snapshot.properties || {})
  const metadata = parse(properties.sessionData || {})
  const ids = new Set(Object.keys(metadata).filter(id => /^[1-9]\d*$/.test(id)))
  for (const key of Object.keys(snapshot)) {
    const match = /^session([1-9]\d*)$/.exec(key)
    if (match) ids.add(match[1])
  }

  return [...ids].map(id => {
    const info = metadata[id] || {}
    const options = info.opt || {}
    const solves = parse(snapshot[`session${id}`] || [])
    return {
      id,
      name: info.name ?? `session${id}`,
      scrambleType: options.scrType ?? info.scr ?? '333',
      rank: info.rank ?? Number(id),
      solves,
      settings: {
        precisionMs: sessionSetting(properties, options, 'useMilli', false) ? 1 : 10,
        trim: sessionSetting(properties, options, 'trim', 'p5'),
        trimr: sessionSetting(properties, options, 'trimr', 'a'),
      },
    }
  }).sort((a, b) => a.rank - b.rank || Number(a.id) - Number(b.id))
}

function trimCount(size, setting) {
  if (String(setting).startsWith('p')) return Math.ceil(size / 100 * Number(String(setting).slice(1)))
  if (setting === 'm') return Math.floor(size / 2)
  return Number(setting)
}

export function trimCounts(size, settings) {
  let left = trimCount(size, settings.trim)
  let right = trimCount(size, settings.trimr === 'a' ? settings.trim : settings.trimr)
  if (left + right === size) {
    left = Math.max(left - 1, 0)
    right = Math.max(right - 1, 0)
  }
  return [left, right]
}

function insertionIndex(values, target) {
  let left = 0
  let right = values.length
  while (left < right) {
    const middle = Math.floor((left + right) / 2)
    if (values[middle] < target) left = middle + 1
    else right = middle
  }
  return left
}

function* rollingAverages(solves, times, size, settings, mean = false) {
  if (times.length < size) return
  const [left, right] = mean ? [0, 0] : trimCounts(size, settings)
  const end = size - right
  if (left >= end) return
  const sorted = times.slice(0, size).sort((a, b) => a === b ? 0 : a - b)
  let finiteSum = sorted.reduce((sum, time) => sum + (Number.isFinite(time) ? time : 0), 0)

  for (let start = 0; start <= times.length - size; start++) {
    if (Number.isFinite(sorted[end - 1])) {
      let sum = finiteSum
      for (let index = 0; index < left; index++) sum -= sorted[index]
      for (let index = end; index < size; index++) {
        if (Number.isFinite(sorted[index])) sum -= sorted[index]
      }
      const timeMs = sum / (end - left)
      yield {
        timeMs,
        startSolveNumber: start + 1,
        endSolveNumber: start + size,
        startTimestamp: solves[start][3] ?? null,
        endTimestamp: solves[start + size - 1][3] ?? null,
      }
    }
    if (start + size < times.length) {
      const outgoing = times[start]
      const incoming = times[start + size]
      sorted.splice(insertionIndex(sorted, outgoing), 1)
      sorted.splice(insertionIndex(sorted, incoming), 0, incoming)
      if (Number.isFinite(outgoing)) finiteSum -= outgoing
      if (Number.isFinite(incoming)) finiteSum += incoming
    }
  }
}

function effectiveTimes(solves, settings) {
  return solves.map(solve => solve[0][0] === -1
    ? Infinity
    : Math.trunc((solve[0][1] + solve[0][0]) / settings.precisionMs) * settings.precisionMs)
}

export function getSessionTotals({ solves, settings }) {
  let totalMs = 0
  let validSolveCount = 0
  for (const time of effectiveTimes(solves, settings)) {
    if (Number.isFinite(time)) {
      totalMs += time
      validSolveCount++
    }
  }
  return { totalMs, validSolveCount }
}

function bestAverage(solves, times, size, settings, mean = false) {
  let best = null
  for (const result of rollingAverages(solves, times, size, settings, mean)) {
    if (best === null || result.timeMs < best.timeMs) best = result
  }
  return best
}

export function getBests({ solves, settings }) {
  const times = effectiveTimes(solves, settings)
  let single = null
  for (let index = 0; index < times.length; index++) {
    if (Number.isFinite(times[index]) && (single === null || times[index] < single.timeMs)) {
      single = { timeMs: times[index], solveNumber: index + 1, timestamp: solves[index][3] ?? null }
    }
  }
  const bests = { single, mo3: bestAverage(solves, times, 3, settings, true) }
  for (const size of [5, 12, 50, 100, 1000]) bests[`ao${size}`] = bestAverage(solves, times, size, settings)
  return bests
}

function completionDates(dates, size) {
  if (dates.length < size) return []
  const completed = []
  const queue = []
  let head = 0
  let missing = 0
  for (let index = 0; index < dates.length; index++) {
    if (index >= size && dates[index - size] === null) missing--
    while (head < queue.length && queue[head] <= index - size) head++
    const timestamp = dates[index]
    if (timestamp === null) missing++
    else {
      while (queue.length > head && dates[queue.at(-1)] <= timestamp) queue.pop()
      queue.push(index)
    }
    if (index >= size - 1) completed.push(missing ? null : dates[queue[head]])
  }
  return completed
}

export function getProgressionCandidates({ solves, settings }) {
  const times = effectiveTimes(solves, settings)
  const dates = solves.map(solve => validTimestamp(solve[3]) ? solve[3] : null)
  const histories = Object.fromEntries(PROGRESSION_METRICS.map(metric => [metric, { records: [], undatedCount: 0 }]))
  for (let index = 0; index < times.length; index++) {
    if (!Number.isFinite(times[index])) continue
    const timestamp = dates[index]
    if (timestamp !== null) histories.single.records.push({ timeMs: times[index], solveNumber: index + 1, timestamp })
    else histories.single.undatedCount++
  }
  histories.single.records = personalBestPoints(histories.single.records)
  for (const metric of PROGRESSION_METRICS.slice(1)) {
    const size = Number(metric.slice(2))
    const completed = completionDates(dates, size)
    for (const record of rollingAverages(solves, times, size, settings, metric === 'mo3')) {
      const timestamp = completed[record.startSolveNumber - 1]
      if (timestamp !== null) {
        histories[metric].records.push({ ...record, timestamp })
      } else histories[metric].undatedCount++
    }
    // A non-PB within a session cannot become a PB after merging other sessions.
    histories[metric].records = personalBestPoints(histories[metric].records)
  }
  return histories
}
