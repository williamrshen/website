import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import generated from '../src/data/generated/cubing.json' with { type: 'json' }
import type { CubingSnapshot, ProgressionHistory, ProgressionMetric } from '../src/data/cubing'

function history(kind: ProgressionMetric, values: [string, number][], precisionMs = 10): ProgressionHistory {
  return {
    kind, undatedCount: 0,
    points: values.map(([date, timeMs]) => ({ timestamp: Date.parse(date) / 1000, timeMs, precisionMs })),
  }
}

function snapshot(): CubingSnapshot {
  const data = structuredClone(generated) as CubingSnapshot
  data.sources.official.fetchedAt = '2026-10-12T04:17:00Z'
  data.sources.official.exportDate = '2026-10-11T00:00:31Z'
  data.sources.official.events['333'] = {
    roundCount: 7, attemptCount: 35,
    single: { timeMs: 8150, precisionMs: 10, rank: { country: 307, continent: 2277, world: 8828 } },
    average: { timeMs: 8790, precisionMs: 10, kind: 'ao5', rank: { country: 144, continent: 1042, world: 3868 } },
    progression: {
      single: history('single', [['2016-06-18', 15000], ['2018-03-24', 10000], ['2024-06-08', 8150]]),
      ao5: history('ao5', [['2016-06-18', 18000], ['2018-03-24', 12000], ['2024-06-08', 8790]]),
    },
  }
  data.sources.official.events['222'].roundCount = 2
  data.sources.official.events['222'].attemptCount = 10
  for (const entry of Object.values(data.sources.official.events['333'].progression!)) {
    const last = entry.points.at(-1)!
    Object.assign(last, { competitionName: 'Battle of Waterloo 2024', competitionFrom: '2024-06-08', competitionTill: '2024-06-09' })
  }
  data.sources.unofficial = {
    fetchedAt: '2026-10-10T12:00:00Z',
    events: {
      '333': {
        single: { timeMs: 6543, precisionMs: 1, sessionName: '3×3 practice', timestamp: 1700000000 },
        average: { timeMs: 9876.666, precisionMs: 1, kind: 'ao5', sessionName: '3×3 practice', endTimestamp: 1700000100 },
        solveCount: 1234, sessionCount: 2,
        sessionAverage: { timeMs: 12000, precisionMs: 1, validSolveCount: 1200 },
        extras: {
          mo3: { timeMs: 8000, precisionMs: 1, kind: 'mo3' },
          ao12: { timeMs: 11230, precisionMs: 10, kind: 'ao12' },
          ao50: { timeMs: 12000, precisionMs: 10, kind: 'ao50' },
          ao100: { timeMs: 12500, precisionMs: 10, kind: 'ao100' },
          ao1000: { timeMs: 14000, precisionMs: 10, kind: 'ao1000' },
        },
        progression: {
          single: history('single', [['2023-10-14', 30000], ['2024-05-01', 10000], ['2026-09-01', 6543]], 1),
          mo3: history('mo3', [['2023-10-14', 35000], ['2025-05-01', 12000], ['2026-09-01', 8000]], 1),
          ao5: history('ao5', [['2023-10-14', 37000], ['2025-05-01', 13000], ['2026-09-01', 9876.666]], 1),
          ao12: history('ao12', [['2023-10-14', 38000], ['2025-05-01', 15000], ['2026-09-01', 11230]]),
          ao50: history('ao50', [['2023-10-14', 39000], ['2025-05-01', 16000], ['2026-09-01', 12000]]),
          ao100: history('ao100', [['2023-10-14', 40000], ['2025-05-01', 17000], ['2026-09-01', 12500]]),
          ao1000: history('ao1000', [['2024-01-01', 41000], ['2025-05-01', 18000], ['2026-09-01', 14000]]),
        },
      },
      '222': {
        single: { timeMs: 1800, precisionMs: 10 }, average: { timeMs: 2440, precisionMs: 10, kind: 'ao5' },
        solveCount: 50, sessionCount: 1, extras: {},
        sessionAverage: { timeMs: 3000, precisionMs: 10, validSolveCount: 45 },
      },
      '555': {
        single: { timeMs: 65000, precisionMs: 10 }, average: { timeMs: 66000, precisionMs: 10, kind: 'ao5' },
        solveCount: 5, sessionCount: 1, extras: {},
        sessionAverage: { timeMs: 70000, precisionMs: 10, validSolveCount: 5 },
      },
    },
  }
  return data
}

async function openCubing(page: Page, data = snapshot()) {
  await page.addInitScript(() => localStorage.setItem('theme', 'daylight'))
  // Supply a deterministic build-time module, never a fake published snapshot.
  await page.route(/\/src\/data\/generated\/cubing\.json(?:\?|$)/, route => route.fulfill({
    contentType: 'application/javascript', body: `export default ${JSON.stringify(data)}`,
  }))
  await page.goto('/')
  const section = page.locator('#hobbies')
  const tile = section.locator('li > button').filter({ hasText: 'Speedcubing' })
  await tile.scrollIntoViewIfNeeded()
  await tile.click()
  const panel = section.getByRole('region', { name: 'Speedcubing' })
  await expect(panel).toBeVisible()
  await page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'))
  return { section, tile, panel }
}

async function dragChart(page: Page, inspector: Locator, start: number, end: number, shift = false) {
  await inspector.scrollIntoViewIfNeeded()
  const box = (await inspector.boundingBox())!
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.move(box.x + box.width * start, box.y + 50)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * end, box.y + 50, { steps: 10 })
  await page.mouse.up()
  if (shift) await page.keyboard.up('Shift')
}

async function viewport(chart: Locator) {
  const plot = chart.locator('[data-view-start]')
  return {
    start: Number(await plot.getAttribute('data-view-start')),
    end: Number(await plot.getAttribute('data-view-end')),
  }
}

test('source and event changes update the same panel, with no external browser requests', async ({ page }, testInfo) => {
  const external: string[] = []
  const errors: string[] = []
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url())
  })
  page.on('pageerror', error => errors.push(error.message))
  const { section, tile, panel } = await openCubing(page)
  await expect(panel).toContainText('8.15s')
  await expect(panel).toContainText('Canada #307 · World #8,828')
  await expect(panel).not.toContainText('Sample stats')
  await expect(panel.getByText('Official WCA results · last updated Oct 12, 2026', { exact: true })).toBeVisible()
  await expect(panel).not.toContainText('export Oct 11')
  await expect(panel).not.toContainText('Competition results owned')
  await expect(panel.locator('dt').nth(2)).toHaveText('rounds')
  const thirdStat = panel.locator('dd').nth(2).locator('span')
  await expect(thirdStat.nth(0)).toHaveText('7')
  await expect(thirdStat.nth(1)).toHaveText('35 attempts')
  const officialChart = panel.getByRole('figure', { name: 'PB progression' })
  expect((await officialChart.boundingBox())!.y).toBeGreaterThan((await panel.locator('dl').first().boundingBox())!.y)
  await expect(officialChart.getByLabel('Metric', { exact: true }).locator('option')).toHaveText(['Single', 'Ao5'])
  await panel.screenshot({ path: testInfo.outputPath('cubing-official.png') })
  const original = await panel.elementHandle()

  const unofficial = panel.getByRole('button', { name: 'Unofficial', exact: true })
  await unofficial.click()
  await expect(unofficial).toHaveAttribute('aria-pressed', 'true')
  await expect(unofficial).toBeFocused()
  await expect(panel).toContainText('6.543s')
  await expect(panel).toContainText('9.877s')
  await expect(panel).toContainText('1,234')
  await expect(panel.locator('dt').nth(0)).toHaveText('Single')
  await expect(panel.locator('dt').nth(0)).toHaveText('Single')
  await expect(panel.locator('dt').nth(1)).toHaveText('Ao5')
  await expect(panel.locator('dd').nth(0).locator('span').nth(1)).toHaveText('Nov 14, 2023')
  await expect(panel.locator('dd').nth(1).locator('span').nth(1)).toHaveText('Nov 14, 2023')
  await expect(panel.locator('dt').nth(2)).toHaveText('session average')
  await expect(panel.locator('dd').nth(2).locator('span').nth(0)).toHaveText('12.000s')
  await expect(panel.locator('dd').nth(2).locator('span').nth(1)).toHaveText('1,234 solves')
  await expect(panel.getByText('Unofficial practice results · last updated Oct 10, 2026', { exact: true })).toBeVisible()
  await expect(panel).not.toContainText('— means')
  await expect(panel.getByRole('heading', { name: 'More practice bests' })).toHaveCount(0)
  const unofficialChart = panel.getByRole('figure', { name: 'PB progression' })
  await expect(unofficialChart.getByText('PB: 6.543s', { exact: true })).toBeVisible()
  await expect(unofficialChart).not.toContainText('Solve count:')
  expect((await unofficialChart.boundingBox())!.y).toBeGreaterThan((await panel.locator('dl').last().boundingBox())!.y)
  await expect(panel).not.toContainText('World #')
  await expect(panel.getByRole('status')).toContainText('Unofficial 3×3 results')
  expect(await original!.evaluate(element => element.isConnected)).toBe(true)
  await panel.screenshot({ path: testInfo.outputPath('cubing-unofficial.png') })

  await panel.getByLabel('Event', { exact: true }).selectOption('222')
  await expect(panel).toContainText('1.80s')
  await expect(panel).toContainText('2.44s')
  await expect(panel.locator('dd').nth(2).locator('span').nth(0)).toHaveText('3.00s')
  await expect(panel.locator('dd').nth(2).locator('span').nth(1)).toHaveText('50 solves')
  await expect(panel.getByRole('figure', { name: 'PB progression' })).not.toContainText('Solve count:')
  await panel.getByRole('button', { name: 'Official', exact: true }).click()
  await expect(panel).toContainText('2.82s')
  await expect(panel).toContainText('3.64s')
  await expect(panel.locator('dd').nth(2).locator('span').nth(0)).toHaveText('2')

  await unofficial.click()
  await section.getByRole('button', { name: 'Close details' }).click()
  await expect(tile).toBeFocused()
  await expect(tile).toContainText('6.543s')
  await expect(tile).toContainText('Single · unofficial')
  await tile.click()
  await expect(panel.getByRole('button', { name: 'Unofficial', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByLabel('Event', { exact: true })).toHaveValue('222')
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

test('unavailable practice data never falls back to official times', async ({ page }, testInfo) => {
  const data = snapshot()
  data.sources.unofficial = { fetchedAt: null, events: {} }
  const { tile, panel } = await openCubing(page, data)
  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  await expect(panel).toContainText('Practice results aren’t available yet.')
  await expect(panel).toContainText('waiting for first import')
  await expect(panel).not.toContainText('8.15s')
  await expect(panel).not.toContainText('8.79s')
  await expect(panel.locator('dd > span:first-child')).toHaveText(['—', '—', '—'])
  await expect(panel.getByRole('heading', { name: 'More practice bests' })).toHaveCount(0)
  await panel.screenshot({ path: testInfo.outputPath('cubing-awaiting-practice.png') })
  await page.keyboard.press('Escape')
  await expect(tile).toBeFocused()
})

test('missing averages and source-specific events keep distinct empty states and minute formatting', async ({ page }) => {
  const { panel } = await openCubing(page)
  await panel.getByLabel('Event', { exact: true }).selectOption('333bf')
  await expect(panel).toContainText('4:31.75')
  await expect(panel).toContainText('mean · Mo3')
  await expect(panel.locator('dd > span:first-child').nth(1)).toHaveText('—')
  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  await panel.getByLabel('Event', { exact: true }).selectOption('555')
  await expect(panel).toContainText('1:05.00')
  await panel.getByRole('button', { name: 'Official', exact: true }).click()
  await expect(panel).toContainText('No official 5×5 results recorded.')
  await expect(panel.locator('dd > span:first-child').first()).toHaveText('—')
})

test('custom csTimer trimming is not presented as a standard ao5', async ({ page }) => {
  const data = snapshot()
  data.sources.unofficial.events['333'].average!.kind = 'custom'
  data.sources.unofficial.events['333'].progression!.ao5!.kind = 'custom'
  const { panel } = await openCubing(page, data)
  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  await expect(panel.locator('dt').nth(1)).toHaveText('custom Ao5')
  await expect(panel.getByLabel('Metric', { exact: true }).locator('option[value="ao5"]')).toHaveText('Custom Ao5')
})

test('chart metric dropdown, zoom, and keyboard inspection preserve real record dates', async ({ page }, testInfo) => {
  const { panel } = await openCubing(page)
  const chart = panel.getByRole('figure', { name: 'PB progression' })
  await expect(chart.getByRole('img', { name: /Single personal-best progression/ })).toBeVisible()
  await chart.getByLabel('Metric', { exact: true }).selectOption('ao5')
  await expect(chart.getByRole('img', { name: /Ao5 personal-best progression/ })).toBeVisible()
  const officialInspector = chart.getByRole('button', { name: 'Inspect Ao5 progression' })
  await dragChart(page, officialInspector, 0.8, 0.95)
  await officialInspector.press('End')
  await expect(chart).toContainText('Battle of Waterloo 2024')
  await expect(chart).toContainText('Jun 8, 2024 – Jun 9, 2024')
  await page.keyboard.press('Escape')
  await expect(panel).toBeVisible()

  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  await chart.getByLabel('Metric', { exact: true }).selectOption('mo3')
  await expect(chart.getByRole('img', { name: /Mo3 personal-best progression/ })).toBeVisible()
  const inspector = chart.getByRole('button', { name: 'Inspect Mo3 progression' })
  await inspector.hover({ position: { x: 48, y: 40 } })
  await expect(chart).toContainText('35.000s')
  await inspector.focus()
  await expect(chart).toContainText('35.000s')
  await page.keyboard.press('Home')
  await expect(chart).toContainText('35.000s')
  await page.keyboard.press('ArrowRight')
  await expect(chart).toContainText('12.000s')
  await page.keyboard.press('End')
  await expect(chart).toContainText('8.000s')
  await chart.getByRole('button', { name: 'Zoom in on time axis' }).click()
  await expect(chart.getByRole('img')).toBeVisible()
  const paths = await chart.locator('svg path').evaluateAll(elements => elements.map(element => element.getAttribute('d')))
  expect(paths.every(path => path && !/NaN|Infinity/.test(path))).toBe(true)
  await chart.screenshot({ path: testInfo.outputPath('progression-mo3.png') })
})

test('all practice metrics use one dropdown and x-axis drag, wheel, pan, and reset update the timeframe', async ({ page }) => {
  const { panel } = await openCubing(page)
  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  const chart = panel.getByRole('figure', { name: 'PB progression' })
  const selector = chart.getByLabel('Metric', { exact: true })
  await expect(selector.locator('option')).toHaveText(['Single', 'Mo3', 'Ao5', 'Ao12', 'Ao50', 'Ao100', 'Ao1000'])
  await expect(chart.getByLabel('Range', { exact: true })).toHaveCount(0)
  await expect(chart.getByRole('group', { name: 'Progression metric' })).toHaveCount(0)
  for (const metric of ['ao12', 'ao50', 'ao100', 'ao1000']) {
    await selector.selectOption(metric)
    await expect(chart.getByRole('img', { name: new RegExp(`${metric} personal-best progression`, 'i') })).toBeVisible()
  }
  await selector.selectOption('single')
  const inspector = chart.getByRole('button', { name: 'Inspect Single progression' })
  const full = await viewport(chart)
  const originalAxis = await chart.locator('svg text').allTextContents()
  await dragChart(page, inspector, 0.2, 0.7)
  await expect(chart.getByRole('button', { name: 'Reset zoom', exact: true })).toBeEnabled()
  await expect.poll(async () => { const view = await viewport(chart); return view.end - view.start }).toBeLessThan(full.end - full.start)
  expect(await chart.locator('svg text').allTextContents()).not.toEqual(originalAxis)
  const dragged = await viewport(chart)
  await expect(chart).not.toContainText('Solve count:')
  const box = (await inspector.boundingBox())!
  await inspector.dispatchEvent('wheel', { ctrlKey: true, deltaY: -350, clientX: box.x + box.width * 0.6, clientY: box.y + 60 })
  await expect.poll(async () => { const view = await viewport(chart); return view.end - view.start }).toBeLessThan(dragged.end - dragged.start)
  const wheel = await viewport(chart)
  await inspector.press('Shift+ArrowRight')
  await expect.poll(async () => (await viewport(chart)).start).toBeGreaterThan(wheel.start)
  await dragChart(page, inspector, 0.4, 0.55, true)
  const panned = await viewport(chart)
  expect(panned.end - panned.start).toBeCloseTo(wheel.end - wheel.start, 3)
  await chart.getByRole('button', { name: 'Reset zoom', exact: true }).click()
  await expect.poll(async () => viewport(chart)).toEqual(full)
  await expect(chart.getByRole('button', { name: 'Reset zoom', exact: true })).toBeDisabled()
  await inspector.dispatchEvent('wheel', { deltaY: -100 })
  expect(await viewport(chart)).toEqual(full)
})

test('chart records can be inspected by tapping on a touch device', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    const { panel } = await openCubing(page)
    await panel.getByRole('button', { name: 'Unofficial', exact: true }).tap()
    const chart = panel.getByRole('figure', { name: 'PB progression' })
    await chart.getByLabel('Metric', { exact: true }).selectOption('mo3')
    const inspector = chart.getByRole('button', { name: 'Inspect Mo3 progression' })
    await inspector.tap({ position: { x: 48, y: 40 } })
    await expect(chart).toContainText('35.000s')
    const box = (await inspector.boundingBox())!
    await inspector.tap({ position: { x: box.width - 10, y: 40 } })
    await expect(chart).toContainText('Sep 1, 2026')
    await chart.getByRole('button', { name: 'Zoom in on time axis' }).tap()
    await expect(chart.getByRole('button', { name: 'Reset zoom', exact: true })).toBeEnabled()
    await chart.getByRole('button', { name: 'Reset zoom', exact: true }).tap()
    await expect(chart.getByRole('button', { name: 'Reset zoom', exact: true })).toBeDisabled()
    // Native touch events verify horizontal brushing without disabling vertical page scrolling.
    await inspector.scrollIntoViewIfNeeded()
    const dragBox = (await inspector.boundingBox())!
    const beforeDrag = await viewport(chart)
    const session = await context.newCDPSession(page)
    try {
      const y = dragBox.y + 50
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: dragBox.x + dragBox.width * 0.2, y }] })
      for (let step = 1; step <= 6; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: dragBox.x + dragBox.width * (0.2 + step * 0.07), y }] })
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } finally {
      await session.detach()
    }
    await expect.poll(async () => { const view = await viewport(chart); return view.end - view.start }).toBeLessThan(beforeDrag.end - beforeDrag.start)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally {
    await context.close()
  }
})

for (const width of [320, 390, 768]) {
  test(`cubing controls fit and work by keyboard at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    const { tile, panel } = await openCubing(page)
    const unofficial = panel.getByRole('button', { name: 'Unofficial', exact: true })
    await unofficial.focus()
    await page.keyboard.press('Space')
    await expect(unofficial).toHaveAttribute('aria-pressed', 'true')
    await expect(unofficial).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(panel.getByLabel('Event', { exact: true })).toBeFocused()
    await panel.getByLabel('Event', { exact: true }).selectOption('333oh')
    await expect(panel).toContainText('No 3×3 one-handed practice sessions imported.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await panel.getByLabel('Event', { exact: true }).selectOption('333')
    await panel.screenshot({ path: testInfo.outputPath(`cubing-${width}px.png`) })
    await panel.getByRole('button', { name: 'Official', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(tile).toBeFocused()
    await expect(tile.getByText('View stats')).toBeVisible()
  })
}

test('cubing panel passes scoped axe checks in both themes and sources', async ({ page }) => {
  const { panel } = await openCubing(page)
  for (const evening of [false, true]) {
    if (evening) {
      await page.locator('#mode').click()
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 42, 41)')
    }
    for (const source of ['Official', 'Unofficial']) {
      await panel.getByRole('button', { name: source, exact: true }).click()
      const results = await new AxeBuilder({ page }).include('#hobbies [role="region"]').analyze()
      expect(results.violations).toEqual([])
    }
  }
})

test('source switching remains usable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { panel } = await openCubing(page)
  await panel.getByRole('button', { name: 'Unofficial', exact: true }).click()
  await expect(panel).toHaveCSS('animation-name', 'none')
  await expect(panel).toContainText('6.543s')
})
