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

async function openGarden(page: Page, theme: 'daylight' | 'evening') {
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
  await page.goto('/')
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
