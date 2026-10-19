import { downsample, formatDate, getJson, integer } from './format.mjs'

const base = 'https://ch.tetr.io/api/'

/** Reads the TETRA CHANNEL API politely: one session ID, sequential requests, and an identifying user agent. */
export async function fetchTetrio(username, fetcher = fetch) {
  const user = encodeURIComponent(username.toLowerCase())
  const headers = { 'X-Session-ID': `williamrshen-com-${Date.now()}`, 'User-Agent': 'williamrshen.com weekly stats refresh' }
  const read = async path => {
    const body = await getJson(base + path, fetcher, headers)
    if (!body.success) throw new Error(`TETR.IO API error for ${path}: ${body.error?.msg ?? 'unknown'}`)
    return body.data
  }
  const raw = {}
  for (const [key, path] of Object.entries({
    user: `users/${user}`, league: `users/${user}/summaries/league`,
    sprint: `users/${user}/summaries/40l`, blitz: `users/${user}/summaries/blitz`,
    flow: `labs/leagueflow/${user}`,
  })) raw[key] = await read(path)
  return raw
}

const ranked = value => Number.isFinite(value) && value >= 0
const place = (record, country) => ranked(record.rank) || ranked(record.rank_local)
  ? [ranked(record.rank_local) && `#${integer(record.rank_local)} ${country}`, ranked(record.rank) && `#${integer(record.rank)} global`]
    .filter(Boolean).join(' · ')
  : undefined

export function normalizeTetrio({ user, league, sprint, blitz, flow }, config, fetchedAt) {
  if (user.username?.toLowerCase() !== config.username.toLowerCase()) throw new Error('TETR.IO user does not match the configured profile')
  if (![league.tr, league.apm, league.pps, league.vs].every(Number.isFinite) || league.tr < 0 || typeof league.rank !== 'string') {
    throw new Error('TETR.IO league data is unranked or incomplete')
  }
  if (!Array.isArray(flow.points) || !Number.isFinite(flow.startTime)) throw new Error('Invalid TETR.IO league history')
  const country = user.country ? new Intl.DisplayNames('en', { type: 'region' }).of(user.country) : 'local'
  const upper = rank => rank.toUpperCase()

  const sprintMs = sprint.record?.results?.stats?.finaltime
  const blitzScore = blitz.record?.results?.stats?.score
  const played = user.gamesplayed, won = user.gameswon
  const hasGames = played > 0 && won >= 0
  const hours = user.gametime >= 0 ? `${integer(user.gametime / 3600)}h time played` : null

  const stats = [
    { label: 'league rank', value: upper(league.rank), detail: place({ rank: league.standing, rank_local: league.standing_local }, country) },
    { label: 'TR', value: String(Math.round(league.tr)), detail: league.bestrank ? `best rank ${upper(league.bestrank)}` : undefined },
    { label: 'APM / PPS / VS', value: `${league.apm.toFixed(1)} / ${league.pps.toFixed(2)} / ${league.vs.toFixed(1)}`, detail: 'last 10 games stats' },
    { label: '40L PB', value: Number.isFinite(sprintMs) ? `${(sprintMs / 1000).toFixed(3)}s` : '—', detail: place(sprint, country) },
    { label: 'Blitz PB', value: Number.isFinite(blitzScore) ? integer(blitzScore) : '—', detail: place(blitz, country) },
    {
      label: 'win rate', value: hasGames ? `${(won / played * 100).toFixed(1)}%` : '—',
      detail: hasGames ? [`${integer(won)} / ${integer(played)} games played`, hours].filter(Boolean).join(' · ') : undefined,
    },
  ].map(stat => stat.detail === undefined ? { label: stat.label, value: stat.value } : stat)

  const history = flow.points.filter(point => Number.isFinite(point[0]) && Number.isFinite(point[2]) && point[2] > 0)
    .map(point => ({ label: formatDate(flow.startTime + point[0]), value: point[2] }))
  return { schemaVersion: 1, username: config.username, fetchedAt, stats, history: { label: 'tetra league tr history', points: downsample(history) } }
}
