export const seasons = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof seasons)[number]

/**
 * Meteorological seasons for the northern hemisphere: spring is March–May, summer June–August,
 * autumn September–November, and winter December–February.
 */
export function seasonOf(date: Date): Season {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/** The season to show: `?season=winter` previews one; otherwise it follows the date. */
export function currentSeason(search: string, date: Date): Season {
  const requested = new URLSearchParams(search).get('season')
  return seasons.includes(requested as Season) ? requested as Season : seasonOf(date)
}
