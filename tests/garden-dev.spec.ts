import { expect, test, type Page } from '@playwright/test'

/** Development-only garden tools. The e2e server runs Vite in dev mode, so they are available. */
test.use({ reducedMotion: 'reduce' })

async function open(page: Page, query = '') {
  const messages: string[] = []
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') messages.push(message.text()) })
  page.on('pageerror', (error) => messages.push(error.message))
  await page.addInitScript(() => localStorage.setItem('theme', 'daylight'))
  await page.goto(`/${query}`)
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 300)))
  return messages
}

const pixels = (page: Page) => page.locator('#world').evaluate(async (canvas: HTMLCanvasElement) => {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)).slice(0, 8)).join()
})

test('?garden=debug draws the overlay on top of the garden', async ({ page }) => {
  await open(page)
  const plain = await pixels(page)
  const messages = await open(page, '?garden=debug')
  expect(await pixels(page)).not.toBe(plain)
  expect(messages).toEqual([])
})

test('unknown dev tools are reported, not silently ignored', async ({ page }) => {
  const messages = await open(page, '?garden=nope')
  expect(messages.some((text) => text.includes('Unknown dev tool "nope"'))).toBe(true)
})
