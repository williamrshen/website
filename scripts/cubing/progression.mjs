export const PROGRESSION_METRICS = ['single', 'mo3', 'ao5', 'ao12', 'ao50', 'ao100', 'ao1000']

export function validTimestamp(timestamp) {
  return Number.isFinite(timestamp) && timestamp > 0 && Number.isFinite(new Date(timestamp * 1000).getTime())
}

// Sort before selecting records: imports or edited dates can be out of order.
// Equal timestamps retain their best result, avoiding multiple points at one instant.
export function personalBestPoints(records) {
  const sorted = records.filter(record => validTimestamp(record.timestamp) && Number.isFinite(record.timeMs))
    .sort((a, b) => a.timestamp - b.timestamp || a.timeMs - b.timeMs)
  const points = []
  let best = Infinity
  for (const record of sorted) {
    if (record.timeMs < best) {
      points.push(record)
      best = record.timeMs
    }
  }
  return points
}
