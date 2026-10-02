import { expect, test, type Page } from '@playwright/test'

async function collapseDistance(page: Page) {
  return page.locator('#garden').evaluate((garden) =>
    garden.clientHeight - parseFloat(getComputedStyle(garden).getPropertyValue('--nav-height')),
  )
}

async function scrollTo(page: Page, top: number) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top)
  await expect.poll(() => page.locator('[data-garden-surface]').evaluate((surface) => {
    const navHeight = parseFloat(getComputedStyle(surface).getPropertyValue('--nav-height'))
    const garden = document.getElementById('garden')!
    return Math.abs(surface.clientHeight - Math.max(navHeight, garden.clientHeight - window.scrollY))
  })).toBeLessThan(1)
}

test('landing, scroll morph, moving theme toggle, dialogs, and local-only assets', async ({ page }, testInfo) => {
  const errors: string[] = []
  const externalRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url())
  })
  await page.goto('/')
  const brand = page.getByRole('link', { name: 'William Shen home' })
  const mode = page.locator('#mode')
  const navigation = page.getByRole('navigation', { includeHidden: true })
  await expect(page).toHaveTitle(/William Shen/)
  await expect(navigation).toHaveJSProperty('inert', true)
  expect((await page.locator('#about').boundingBox())!.y).toBeGreaterThanOrEqual(1000)
  const initialBrand = (await brand.boundingBox())!
  const initialMode = (await mode.boundingBox())!
  expect(initialBrand.x + initialBrand.width / 2).toBeCloseTo(720, 0)
  expect(initialMode.x - initialBrand.x - initialBrand.width).toBeCloseTo(18, 0)
  await page.screenshot({ path: testInfo.outputPath('landing.png') })

  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'evening')
  await mode.click()
  await scrollTo(page, (await collapseDistance(page)) / 2)
  const midMode = (await mode.boundingBox())!
  expect(midMode.x).toBeGreaterThan(initialMode.x)
  await page.screenshot({ path: testInfo.outputPath('mid-scroll.png') })
  await scrollTo(page, await collapseDistance(page))
  await expect(navigation).toHaveJSProperty('inert', false)
  const finalBrand = (await brand.boundingBox())!
  const finalMode = (await mode.boundingBox())!
  expect(finalBrand.x).toBeCloseTo(1440 * 0.07, 0)
  expect(finalMode.x + finalMode.width).toBeCloseTo(1440 * 0.93, 0)
  expect((await page.locator('[data-garden-surface]').boundingBox())!.height).toBe(76)
  expect((await page.locator('#about').boundingBox())!.y).toBe(76)
  const portrait = (await page.locator('figure').boundingBox())!
  const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!
  expect(portrait.x + portrait.width).toBeLessThan(heading.x)
  await page.screenshot({ path: testInfo.outputPath('hero.png') })

  await mode.click()
  await expect(mode).toHaveAccessibleName('Switch to daylight')
  await navigation.getByRole('button', { name: 'Field notes' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Leave room for wandering.')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(navigation.getByRole('button', { name: 'Field notes' })).toBeFocused()

  await navigation.getByRole('link', { name: 'Work', exact: true }).click()
  const project = page.getByRole('button', { name: /Terrarium/ })
  await project.click()
  await expect(page.getByRole('dialog')).toContainText('Terrarium')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(project).toBeFocused()
  await scrollTo(page, 0)
  await expect(navigation).toHaveJSProperty('inert', true)
  expect((await brand.boundingBox())!.x).toBeCloseTo(initialBrand.x, 0)
  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'false')
  expect(errors).toEqual([])
  expect(externalRequests).toEqual([])
})

for (const width of [320, 390, 680, 768]) {
  test(`responsive header stays on one row without overlaps at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await scrollTo(page, await collapseDistance(page))
    const brand = (await page.getByRole('link', { name: 'William Shen home' }).boundingBox())!
    const nav = page.getByRole('navigation')
    const firstLink = (await nav.getByRole('link', { name: 'Work', exact: true }).boundingBox())!
    const lastLink = (await nav.getByRole('button', { name: /Say hello/ }).boundingBox())!
    const toggle = (await page.locator('#mode').boundingBox())!
    expect(brand.x + brand.width + 8).toBeLessThan(firstLink.x)
    expect(lastLink.x + lastLink.width + 7).toBeLessThan(toggle.x)
    expect(brand.y + brand.height / 2).toBeCloseTo(firstLink.y + firstLink.height / 2, 0)
    expect(toggle.x + toggle.width).toBeCloseTo(width * (width <= 680 ? 0.94 : 0.93), 0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 390) {
      expect((await page.getByRole('heading', { level: 1 }).boundingBox())!.y).toBeGreaterThan((await page.locator('figure').boundingBox())!.y)
      await page.screenshot({ path: testInfo.outputPath('mobile-hero.png') })
      await scrollTo(page, 0)
      await page.screenshot({ path: testInfo.outputPath('mobile-landing.png') })
    }
  })
}

test('grid glow stays local and reduced motion works without a reload', async ({ page }) => {
  await page.goto('/')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('#world')).toHaveCSS('transform', 'none')
  const sample = () => page.locator('#world').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    return {
      near: Array.from(ctx.getImageData(20, 20, 140, 140).data).reduce((sum, value) => sum + value, 0),
      far: Array.from(ctx.getImageData(1200, 20, 140, 140).data).reduce((sum, value) => sum + value, 0),
    }
  })
  await page.mouse.move(1100, 500)
  const unlit = await sample()
  await page.mouse.move(90, 90)
  const lit = await sample()
  expect(lit.near).not.toBe(unlit.near)
  expect(lit.far).toBe(unlit.far)
  await expect(page.locator('body')).toHaveAttribute('data-garden-cursor', 'true')
  await scrollTo(page, await collapseDistance(page))
  await page.mouse.move(700, 300)
  await expect(page.locator('body')).not.toHaveAttribute('data-garden-cursor')
  await expect(page.getByRole('navigation')).toHaveJSProperty('inert', false)
})

test('photo picker previews locally and resets after reload', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') externalRequests.push(request.url())
  })
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.locator('#portrait-file').setInputFiles({
    name: 'local-portrait.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#78905c"/></svg>'),
  })
  await expect(page.locator('#portrait-image')).toBeVisible()
  await expect(page.locator('#portrait-image')).toHaveAttribute('src', /^blob:/)
  await expect(page.getByRole('status')).toContainText('Local preview only')
  await expect(page.getByAltText(/Portrait placeholder/)).not.toBeVisible()
  await page.reload()
  await expect(page.locator('#portrait-image')).toHaveCount(0)
  await expect(page.getByAltText(/Portrait placeholder/)).toBeVisible()
  expect(externalRequests).toEqual([])
})
