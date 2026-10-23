import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gardenPalettes, gardenSeasons } from '../data/garden.ts'
import { currentSeason, seasonOf, seasons } from './seasons.ts'

test('meteorological seasons by month', () => {
  const months = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']
  for (let month = 0; month < 12; month++) assert.equal(seasonOf(new Date(2026, month, 15)), months[month], `month ${month + 1}`)
  assert.equal(seasonOf(new Date(2026, 2, 1, 0, 0)), 'spring')
  assert.equal(seasonOf(new Date(2026, 1, 28, 23, 59)), 'winter')
})

test('?season= previews a season; anything else follows the date', () => {
  const october = new Date(2026, 9, 23)
  assert.equal(currentSeason('', october), 'autumn')
  assert.equal(currentSeason('?season=winter', october), 'winter')
  assert.equal(currentSeason('?garden=edit&season=spring', october), 'spring')
  assert.equal(currentSeason('?season=monsoon', october), 'autumn')
})

test('every season has a daylight and an evening palette', () => {
  for (const season of seasons) {
    const { daylight, evening } = gardenSeasons[season]
    assert.ok(gardenPalettes[daylight] && gardenPalettes[evening], season)
    assert.notEqual(daylight, evening)
    assert.ok(gardenPalettes[evening].light.box < gardenPalettes[daylight].light.box, `${season} evening is dimmer`)
  }
  // Summer is the original garden.
  assert.equal(gardenSeasons.summer.daylight, 'daylight')
  assert.equal(gardenSeasons.summer.evening, 'evening')
})

test('palette colors are valid #rrggbb', () => {
  for (const [name, palette] of Object.entries(gardenPalettes)) {
    for (const color of [...Object.values(palette.colors), ...Object.values(palette.swatches).flat()]) {
      assert.match(color, /^#[0-9a-f]{6}$/i, `${name}: ${color}`)
    }
  }
})
