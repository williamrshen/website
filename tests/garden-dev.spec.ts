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

test('garden edits swap into the running scene, and invalid ones keep the last good garden', async ({ page }) => {
  await open(page)
  await page.waitForFunction(() => 'gardenDev' in window)
  const original = await pixels(page)
  const result = await page.evaluate(async () => {
    type Host = { setGarden(config: unknown, palettes: unknown): void }
    const host = (window as unknown as { gardenDev: Host }).gardenDev
    const { garden, gardenPalettes } = await import('/src/data/garden.ts')
    const moved = { ...garden, islands: garden.islands.map((island: { id: string; x: number }) => island.id === 'right' ? { ...island, x: island.x + 1 } : island) }
    host.setGarden(moved, gardenPalettes)
    let error = ''
    try { host.setGarden({ ...garden, objects: [...garden.objects, garden.objects[0]] }, gardenPalettes) } catch (caught) { error = String(caught) }
    return { error }
  })
  expect(result.error).toContain('Duplicate garden object id "oak"')
  const moved = await pixels(page)
  expect(moved).not.toBe(original)
  await page.evaluate(async () => {
    const { garden, gardenPalettes } = await import('/src/data/garden.ts')
    ;(window as unknown as { gardenDev: { setGarden(c: unknown, p: unknown): void } }).gardenDev.setGarden(garden, gardenPalettes)
  })
  expect(await pixels(page)).toBe(original)
})
