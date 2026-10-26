import { expect, test, type Page } from '@playwright/test'

/** Development-only garden tools. The e2e server runs Vite in dev mode, so they are available. */
test.use({ reducedMotion: 'reduce' })

async function open(page: Page, query = '') {
  const messages: string[] = []
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') messages.push(message.text()) })
  page.on('pageerror', (error) => messages.push(error.message))
  await page.addInitScript(() => localStorage.setItem('theme', 'daylight'))
  // Pin the season so palette names and pixels don't depend on the date.
  await page.goto(`/${query}${query ? '&' : '?'}season=summer`)
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

test.describe('?garden=edit', () => {
  type Config = { objects: { id: string; x?: number; y?: number; rotate?: number; mirror?: boolean; seed?: number }[]; islands: { id: string; x: number; radius: number }[] }
  const config = (page: Page) => page.evaluate(() => (window as unknown as { gardenDev: { config(): unknown } }).gardenDev.config()) as Promise<Config>
  const object = async (page: Page, id: string) => (await config(page)).objects.find((item) => item.id === id)!
  /** Page coordinates of a world point. */
  const at = (page: Page, x: number, y: number, z = 0) => page.evaluate(([x, y, z]) => {
    const point = (window as unknown as { gardenDev: { scene: { project(x: number, y: number, z: number): { x: number; y: number } } } }).gardenDev.scene.project(x, y, z)
    const rect = document.querySelector('#world')!.getBoundingClientRect()
    return { x: point.x + rect.left, y: point.y + rect.top }
  }, [x, y, z])

  test.beforeEach(async ({ page }) => {
    const messages = await open(page, '?garden=edit')
    await page.waitForFunction(() => 'gardenDev' in window)
    expect(messages).toEqual([])
  })

  test('select, rotate, mirror, nudge, and undo', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Garden editor' })
    const trunk = await at(page, 0, 0, 2)
    await page.mouse.click(trunk.x, trunk.y)
    await expect(panel).toContainText('oak oak')
    await page.keyboard.press('r')
    await page.keyboard.press('m')
    await page.keyboard.press('Shift+ArrowRight')
    expect(await object(page, 'oak')).toMatchObject({ rotate: 90, mirror: true, x: 0.25 })
    await expect(panel).toContainText('unsaved changes')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z')
    expect(await object(page, 'oak')).toEqual({ id: 'oak', type: 'oak', island: 'main', seed: 2198020462, link: 'about' })
    await expect(panel).toContainText('matches file')
  })

  test('drag an object along the ground', async ({ page }) => {
    const from = await at(page, -1.4, 2.2, 0.55), to = await at(page, -0.4, 2.2, 0.55)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()
    await expect.poll(async () => (await object(page, 'bench')).x).toBeCloseTo(-1, 1)
    expect((await object(page, 'bench')).y).toBeCloseTo(1.95, 1)
  })

  test('islands can be selected and resized; edits that break the config are refused', async ({ page }) => {
    const count = (await config(page)).islands.length
    // Open grass on the right island, clear of its pines and rock.
    const island = await at(page, 7.8, -2.1)
    await page.mouse.click(island.x, island.y)
    await page.keyboard.press(']')
    expect((await config(page)).islands.find((item) => item.id === 'right')!.radius).toBe(2.6)
    // An island with objects on it can't be deleted.
    await page.keyboard.press('Delete')
    await expect(page.getByRole('status')).toContainText('still has objects on it')
    expect((await config(page)).islands).toHaveLength(count)
  })

  test('add, duplicate, and copy the config as TypeScript', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Garden editor' })
    await panel.getByRole('combobox').last().selectOption('rock')
    await panel.getByRole('button', { name: 'add object' }).click()
    await expect(panel).toContainText('rock rock-2')
    await page.keyboard.press('d')
    await expect(panel).toContainText('rock rock-2-2')
    await panel.getByRole('button', { name: 'copy config' }).click()
    const text = await panel.getByRole('textbox', { name: 'Copied text' }).inputValue()
    expect(text).toMatch(/^export const garden: GardenConfig = \{/)
    expect(text).toContain("{ id: 'rock-2', type: 'rock', island: 'main', scale: 0.4 },")
    expect(text).toContain("{ id: 'rock-2-2', type: 'rock', island: 'main', scale: 0.4, x: 0.5 },")
  })

  test("an object's link can be changed or removed", async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Garden editor' })
    const trunk = await at(page, 0, 0, 2)
    await page.mouse.click(trunk.x, trunk.y)
    const link = panel.getByRole('combobox', { name: 'link' })
    await expect(link).toHaveValue('about')
    await link.selectOption('hobbies')
    expect((await object(page, 'oak') as { link?: string }).link).toBe('hobbies')
    await link.selectOption('')
    expect((await object(page, 'oak') as { link?: string }).link).toBeUndefined()
    await page.keyboard.press('Control+z')
    expect((await object(page, 'oak') as { link?: string }).link).toBe('hobbies')
  })

  test('palette colors edit live', async ({ page }) => {
    const before = await pixels(page)
    const panel = page.getByRole('complementary', { name: 'Garden editor' })
    await panel.getByText('daylight palette colors').click()
    await panel.locator('input[name="color:trunk"]').fill('#ff0000')
    await expect.poll(() => pixels(page)).not.toBe(before)
    await panel.getByRole('button', { name: 'copy palette' }).click()
    expect(await panel.getByRole('textbox', { name: 'Copied text' }).inputValue()).toContain("trunk: '#ff0000'")
  })
})

test.describe('seed explorer', () => {
  test('from the editor: compare variations and pick one as an undoable edit', async ({ page }) => {
    await open(page, '?garden=edit')
    await page.waitForFunction(() => 'gardenDev' in window)
    const trunk = await page.evaluate(() => {
      const point = (window as unknown as { gardenDev: { scene: { project(x: number, y: number, z: number): { x: number; y: number } } } }).gardenDev.scene.project(0, 0, 2)
      const rect = document.querySelector('#world')!.getBoundingClientRect()
      return { x: point.x + rect.left, y: point.y + rect.top }
    })
    await page.mouse.click(trunk.x, trunk.y)
    await page.keyboard.press('e')
    const dialog = page.getByRole('dialog', { name: 'Seeds for oak' })
    await expect(dialog.locator('canvas')).toHaveCount(12)
    await expect(dialog.getByRole('button').filter({ hasText: 'current: 2198020462' })).toBeVisible()
    // Thumbnails render something (not blank).
    const blank = await dialog.locator('canvas').nth(3).evaluate((canvas: HTMLCanvasElement) =>
      canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.every((value) => value === 0))
    expect(blank).toBe(false)
    const choice = dialog.locator('button.seed').nth(5)
    const seed = Number(await choice.getAttribute('data-seed'))
    await choice.click()
    await expect(dialog).toHaveCount(0)
    const oak = () => page.evaluate(() => (window as unknown as { gardenDev: { config(): { objects: { id: string; seed?: number }[] } } }).gardenDev.config().objects.find((item) => item.id === 'oak')!.seed)
    expect(await oak()).toBe(seed)
    await page.keyboard.press('Control+z')
    expect(await oak()).toBe(2198020462)
  })

  test('on its own: ?garden=seeds&object=creek, closed with Escape', async ({ page }) => {
    await open(page, '?garden=seeds&object=creek')
    const dialog = page.getByRole('dialog', { name: 'Seeds for creek' })
    await expect(dialog.locator('canvas')).toHaveCount(12)
    await dialog.getByRole('button', { name: 'more seeds' }).click()
    await expect(dialog.locator('canvas')).toHaveCount(12)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
})
