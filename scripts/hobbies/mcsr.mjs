import { downsample, formatDate, getJson, integer } from './format.mjs'

const base = 'https://api.mcsrranked.com/'

export async function fetchMcsr(username, fetcher = fetch) {
  const user = encodeURIComponent(username)
  const headers = { 'User-Agent': 'williamrshen.com weekly stats refresh' }
  const read = async path => {
    const body = await getJson(base + path, fetcher, headers)
    if (body.status !== 'success') throw new Error(`MCSR Ranked API error for ${path}: ${body.data ?? 'unknown'}`)
    return body.data
  }
  // Sequential, like the other hobby clients, and well under the 500 requests / 10 minutes limit.
  const profile = await read(`users/${user}`)
  const matches = await read(`users/${user}/matches?type=2&count=100&excludedecay=true`)
  return { profile, matches }
}

// Elo cut-offs for each tier's divisions, mirrored from mcsrranked.com (the API has no tier field).
const tiers = [
  ['Coal', [0, 400, 500]], ['Iron', [600, 700, 800]], ['Gold', [900, 1000, 1100]],
  ['Emerald', [1200, 1300, 1400]], ['Diamond', [1500, 1650, 1800]], ['Netherite', [2000]],
]

/** e.g. 1178 -> "Gold III". Divisions count up from I at the tier's lowest cut-off. */
export function rankName(elo) {
  const [name, cutoffs] = tiers.findLast(([, cutoffs]) => elo >= cutoffs[0]) ?? tiers[0]
  if (cutoffs.length === 1) return name
  return `${name} ${'I'.repeat(cutoffs.findLastIndex(cutoff => elo >= cutoff) + 1)}`
}

/** m:ss.mmm for times over a minute, matching how runs are quoted. */
function formatRun(ms) {
  const minutes = Math.floor(ms / 60_000)
  return `${minutes}:${((ms - minutes * 60_000) / 1000).toFixed(3).padStart(6, '0')}`
}

export function normalizeMcsr({ profile, matches }, config, fetchedAt) {
  if (profile.nickname?.toLowerCase() !== config.username.toLowerCase()) throw new Error('MCSR Ranked user does not match the configured profile')
  if (!Number.isFinite(profile.eloRate) || !Number.isFinite(profile.eloRank)) throw new Error('MCSR Ranked user has not finished placement matches')
  if (!Array.isArray(matches)) throw new Error('Invalid MCSR Ranked match list')
  const total = profile.statistics?.total
  const wins = total?.wins?.ranked, losses = total?.loses?.ranked, best = total?.bestTime?.ranked
  if (![wins, losses].every(Number.isSafeInteger)) throw new Error('Invalid MCSR Ranked statistics')

  const decided = wins + losses
  const stats = [
    { label: 'current elo', value: integer(profile.eloRate), detail: `rank #${integer(profile.eloRank)} · ${rankName(profile.eloRate)}` },
    { label: 'all-time best', value: Number.isFinite(best) && best > 0 ? formatRun(best) : '—', detail: 'ranked PB' },
    { label: 'ranked record', value: `${integer(wins)}–${integer(losses)}`, ...(decided ? { detail: `${(wins / decided * 100).toFixed(1)}% win rate` } : {}) },
  ]
  // Matches arrive newest first. A change's `eloRate` is the rating before the match, so the
  // rating afterwards is `eloRate + change`. Placement matches carry neither.
  const points = matches.flatMap(match => {
    const mine = match.changes?.find(change => change.uuid === profile.uuid)
    return Number.isFinite(mine?.eloRate) && Number.isFinite(mine?.change) && Number.isFinite(match.date)
      ? [{ label: formatDate(match.date * 1000), value: mine.eloRate + mine.change }] : []
  }).reverse()
  return { schemaVersion: 1, username: config.username, fetchedAt, stats, history: { label: 'ranked elo history', points: downsample(points) } }
}
