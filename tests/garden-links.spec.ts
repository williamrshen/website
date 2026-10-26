import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The oak, pines, and creek link to sections of the page. Points on objects come from the dev
 * server's `window.gardenDev` hook, so the checks follow the garden if its layout changes.
 */
test.use({ reducedMotion: 'reduce' })

type Dev = { scene: { built: { objects: { id: string; x: number; y: number }[] }; project(x: number, y: number, z: number): { x: number; y: number } } }

async function openGarden(page: Page, query = '') {
  await page.addInitScript(() => localStorage.setItem('theme', 'daylight'))
  await page.goto(`/?season=summer${query}`)
  await page.waitForFunction(() => 'gardenDev' in window)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

/** A page point on an object, `z` world units above its base. */
function pointOn(page: Page, id: string, z: number) {
  return page.evaluate(([id, z]) => {
    const { scene } = (window as unknown as { gardenDev: Dev }).gardenDev
    const object = scene.built.objects.find((item) => item.id === id)
    if (!object) throw new Error(`no object ${id}`)
    const point = scene.project(object.x, object.y, z), rect = document.querySelector('#world')!.getBoundingClientRect()
    return { x: point.x + rect.left, y: point.y + rect.top }
  }, [id, z] as const)
}

const canvasPixels = (page: Page) => page.locator('#world').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png'))
const label = (page: Page) => page.locator('[data-garden-link] ~ span')

const destinations = [
  { id: 'oak', z: 6, label: 'about me', hash: '#about' },
  { id: 'left-pine', z: 1, label: 'work experience', hash: '#experience' },
  { id: 'tall-pine', z: 1.5, label: 'projects', hash: '#work' },
  { id: 'short-pine', z: 0.6, label: 'projects', hash: '#work' },
  { id: 'creek', z: 0.05, label: 'hobbies', hash: '#hobbies' },
  { id: 'bridge', z: 0.3, label: 'hobbies', hash: '#hobbies' },
]

for (const destination of destinations) {
  test(`clicking the ${destination.id} goes to ${destination.hash}`, async ({ page }) => {
    await openGarden(page)
    const before = await canvasPixels(page)
    const point = await pointOn(page, destination.id, destination.z)
    await page.mouse.move(point.x, point.y)
    await expect(label(page)).toHaveAttribute('data-visible', 'true')
    await expect(label(page)).toHaveText(`${destination.label} →`)
    // The hovered object is drawn highlighted.
    expect(await canvasPixels(page)).not.toEqual(before)
    await page.mouse.click(point.x, point.y)
    await expect(page).toHaveURL(new RegExp(`${destination.hash}$`))
    await expect(page.locator(destination.hash)).toBeInViewport()
  })
}

test('objects without a link do nothing', async ({ page }) => {
  await openGarden(page)
  const bench = await pointOn(page, 'bench', 0.3)
  await page.mouse.move(bench.x, bench.y)
  await expect(label(page)).toHaveAttribute('data-visible', 'false')
  await page.mouse.click(bench.x, bench.y)
  await expect(page).not.toHaveURL(/#/)
})

test('moving off an object removes the highlight', async ({ page }) => {
  await openGarden(page)
  const before = await canvasPixels(page)
  const oak = await pointOn(page, 'oak', 6)
  await page.mouse.move(oak.x, oak.y)
  await expect(label(page)).toHaveAttribute('data-visible', 'true')
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave')))
  await expect(label(page)).toHaveAttribute('data-visible', 'false')
  expect(await canvasPixels(page)).toEqual(before)
})

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('the first tap highlights an object and the second follows its link', async ({ page }) => {
    await openGarden(page)
    const oak = await pointOn(page, 'oak', 6)
    await page.touchscreen.tap(oak.x, oak.y)
    await expect(label(page)).toHaveText('about me →')
    await expect(label(page)).toHaveAttribute('data-visible', 'true')
    await expect(page).not.toHaveURL(/#/)
    // Tapping something else moves the highlight instead of navigating.
    const creek = await pointOn(page, 'creek', 0.05)
    await page.touchscreen.tap(creek.x, creek.y)
    await expect(label(page)).toHaveText('hobbies →')
    await expect(page).not.toHaveURL(/#/)
    await page.touchscreen.tap(creek.x, creek.y)
    await expect(page).toHaveURL(/#hobbies$/)
  })
})

test('keyboard users tab to each destination once, in order, and follow it with Enter', async ({ page }) => {
  await openGarden(page)
  const links = page.locator('[data-garden-link]')
  await expect(links).toHaveText(['about me', 'work experience', 'projects', 'hobbies'])
  expect(await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')))).toEqual(['#about', '#experience', '#work', '#hobbies'])
  const before = await canvasPixels(page)
  await links.first().focus()
  await page.keyboard.press('Tab')
  await expect(links.nth(1)).toBeFocused()
  await expect(label(page)).toHaveText('work experience →')
  // A focus ring is drawn around the focused destination.
  expect(await canvasPixels(page)).not.toEqual(before)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#experience$/)
  // Once the garden has shrunk into the header, its links are out of the tab order.
  await expect(page.locator('[data-garden-link]').first().locator('..')).toHaveJSProperty('inert', true)
})

test('the garden with its links passes axe checks', async ({ page }) => {
  await openGarden(page)
  const results = await new AxeBuilder({ page }).include('#world').include('[data-garden-link]').analyze()
  expect(results.violations).toEqual([])
})

test('the editor selects objects instead of following their links', async ({ page }) => {
  await openGarden(page, '&garden=edit')
  const oak = await pointOn(page, 'oak', 6)
  await page.mouse.move(oak.x, oak.y)
  await expect(label(page)).toHaveAttribute('data-visible', 'false')
  await page.mouse.click(oak.x, oak.y)
  await expect(page).not.toHaveURL(/#/)
})
