import { expect, test, type Page } from '@playwright/test'

/**
 * Visual regression checks for the garden canvas. Reduced motion freezes the fireflies at t = 0,
 * so every render is deterministic. Only the canvas pixels are compared (not a page screenshot),
 * which keeps fonts and the header out of the baseline.
 *
 * After an intentional garden change, review the diff and refresh the baselines with:
 *   npx playwright test tests/garden.spec.ts --update-snapshots
 */
test.use({ reducedMotion: 'reduce' })

/** Seasons follow the date, so every check pins one (`?season=`). */
async function openGarden(page: Page, theme: 'daylight' | 'evening', season = 'summer') {
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
  await page.goto(`/?season=${season}`)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await settle(page)
}

/** Waits for pending resize/render work to flush. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function canvasPixels(page: Page) {
  const url = await page.locator('#world').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png'))
  return Buffer.from(url.split(',')[1], 'base64')
}

for (const theme of ['daylight', 'evening'] as const) {
  test(`garden renders unchanged in ${theme}`, async ({ page }) => {
    await openGarden(page, theme)
    expect(await canvasPixels(page)).toMatchSnapshot(`garden-${theme}.png`)
  })
}

for (const [season, theme] of [['autumn', 'daylight'], ['winter', 'daylight'], ['spring', 'daylight'], ['winter', 'evening']] as const) {
  test(`garden renders unchanged in ${season} (${theme})`, async ({ page }) => {
    await openGarden(page, theme, season)
    expect(await canvasPixels(page)).toMatchSnapshot(`garden-${season}-${theme}.png`)
  })
}

test('the season follows the date unless ?season= picks one', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-15T12:00:00'))
  await page.addInitScript(() => localStorage.setItem('theme', 'daylight'))
  await page.goto('/')
  await settle(page)
  const january = await canvasPixels(page)
  await openGarden(page, 'daylight', 'winter')
  expect(await canvasPixels(page)).toEqual(january)
  await page.goto('/?season=nonsense')
  await settle(page)
  expect(await canvasPixels(page)).toEqual(january)
})

test('garden renders unchanged on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openGarden(page, 'daylight')
  expect(await canvasPixels(page)).toMatchSnapshot('garden-phone.png')
})

test('pointer lights the grid around the cursor', async ({ page }) => {
  await openGarden(page, 'daylight')
  await page.mouse.move(980, 640)
  await settle(page)
  expect(await canvasPixels(page)).toMatchSnapshot('garden-pointer.png')
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave')))
  await settle(page)
  // Leaving the garden removes the light again.
  expect(await canvasPixels(page)).toMatchSnapshot('garden-daylight.png')
})

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('animation frames copy the cached layers instead of redrawing the scene', async ({ page }) => {
    await page.addInitScript(() => {
      const counts = { fill: 0, stroke: 0, drawImage: 0, frames: 0 }
      Object.assign(window, { gardenDrawCounts: counts })
      for (const method of ['fill', 'stroke', 'drawImage'] as const) {
        const original = CanvasRenderingContext2D.prototype[method] as (...args: unknown[]) => void
        Object.defineProperty(CanvasRenderingContext2D.prototype, method, {
          value(this: CanvasRenderingContext2D, ...args: unknown[]) {
            if ((this.canvas as HTMLCanvasElement).id === 'world') counts[method]++
            return original.apply(this, args)
          },
        })
      }
      const tick = () => { counts.frames++; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await page.goto('/?season=summer')
    const measure = () => page.evaluate(async () => {
      const counts = (window as unknown as { gardenDrawCounts: Record<string, number> }).gardenDrawCounts
      for (const key of Object.keys(counts)) counts[key] = 0
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { ...counts }
    })
    await page.waitForTimeout(300)
    const idle = await measure()
    expect(idle.frames).toBeGreaterThan(5)
    // Two layer copies per frame; no polygons (fireflies are rectangles).
    expect(idle.fill).toBe(0)
    expect(idle.stroke).toBe(0)
    expect(idle.drawImage).toBeGreaterThanOrEqual(idle.frames)

    await page.mouse.move(980, 640)
    const lit = await measure()
    // Only the ground near the pointer is repainted: far fewer polygons than the whole scene.
    const perFrame = lit.stroke / Math.max(1, lit.drawImage / 2)
    expect(perFrame).toBeGreaterThan(0)
    expect(perFrame).toBeLessThan(200)
  })
})
