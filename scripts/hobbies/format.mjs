export const integer = value => Math.round(value).toLocaleString('en-US')

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** Keeps the first and last points and spreads the rest evenly, so a long history stays chartable. */
export function downsample(points, limit = 36) {
  if (points.length <= limit) return points
  return Array.from({ length: limit }, (_, index) => points[Math.round(index * (points.length - 1) / (limit - 1))])
}

export async function getJson(url, fetcher = fetch, headers = {}) {
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`HTTP error ${response.status} from ${new URL(url).host}`)
  return response.json()
}
