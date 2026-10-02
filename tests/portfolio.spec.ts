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
  const project = page.getByRole('button', { name: /Communal Catalogue/ })
  await project.click()
  await expect(page.getByRole('dialog')).toContainText('Communal Catalogue')
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
    const firstLink = (await nav.getByRole('link', { name: 'About', exact: true }).boundingBox())!
    await expect(nav.getByRole('link', { name: 'Experience' })).toBeVisible({ visible: width > 680 })
    await expect(nav.getByRole('button', { name: 'Field notes' })).toBeVisible({ visible: width > 1000 })
    await expect(nav.getByRole('link', { name: 'Hobbies' })).toBeVisible({ visible: width > 1000 })
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

test('experience shows three roles, expands to all, and opens role details', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'Experience' }).click()
  const section = page.locator('#experience')
  await expect(section.getByRole('heading', { name: "Where I've worked" })).toBeVisible()
  await expect(section.getByText('EXPERIENCE / 04 ROLES')).toBeVisible()
  const cards = section.getByRole('button', { name: /·/ })
  await expect(cards).toHaveCount(3)
  await expect(cards).toContainText(['Geotab · Current', 'Sun Life · Fall 2025', 'Code Ninjas · Winter 2025'])
  const toggle = section.locator('button[aria-expanded]')
  await expect(toggle).toHaveAccessibleName('Show all 4 roles')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle).toHaveAccessibleName('Show fewer roles')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(3)).toContainText('Young Engineers · Summer 2024')

  await section.getByRole('button', { name: /Sun Life/ }).click()
  const dialog = page.getByRole('dialog', { name: 'SQL Server/Infrastructure DBA' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('listitem').first()).toContainText('400+ CIS standards')
  await expect(dialog.getByRole('list', { name: 'Skills and tools' })).toContainText('Splunk')
  await expect(dialog.getByRole('link', { name: /Visit Sun Life/ })).toHaveAttribute('href', 'https://www.sunlife.com/')
  await page.keyboard.press('Escape')

  await section.getByRole('button', { name: /Geotab/ }).click()
  await expect(page.getByRole('dialog', { name: 'Software Development Intern' })).toContainText('Role details coming soon.')
  await page.keyboard.press('Escape')
  await toggle.click()
  await expect(cards).toHaveCount(3)
})

test('projects show three at a time, expand to all five, and open project details', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'Work', exact: true }).click()
  const section = page.locator('#work')
  await expect(section.getByText('SELECTED WORK / 01—05')).toBeVisible()
  const cards = section.getByRole('listitem').getByRole('button')
  await expect(cards).toHaveCount(3)
  await expect(cards).toContainText(['Communal Catalogue', 'Snowballistic', 'Competitive Programming'])
  const toggle = section.locator('button[aria-expanded]')
  await expect(toggle).toHaveAccessibleName('Show all 5 projects')
  await toggle.click()
  await expect(toggle).toHaveAccessibleName('Show fewer projects')
  await expect(cards).toContainText(['Communal Catalogue', 'Snowballistic', 'Competitive Programming', 'Gendentify', 'YouTube Channel'])

  await section.getByRole('button', { name: /YouTube Channel/ }).click()
  const dialog = page.getByRole('dialog', { name: 'YouTube Channel' })
  await expect(dialog).toContainText('PROJECT · 2020 – PRESENT')
  await expect(dialog.getByRole('link', { name: /Visit YouTube channel/ })).toHaveAttribute('href', 'https://www.youtube.com/@uselessleaf')
  await page.keyboard.press('Escape')
  await toggle.click()
  await expect(cards).toHaveCount(3)
})

test('hobbies skeleton shows sample stats and opens hobby details', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'Hobbies' }).click()
  const section = page.locator('#hobbies')
  await expect(section.getByRole('heading', { name: 'What I grew up doing' })).toBeVisible()
  await expect(section.getByText('HOBBIES / SAMPLE STATS · OCT 2, 2026')).toBeVisible()
  const tiles = section.getByRole('listitem').getByRole('button')
  await expect(tiles).toHaveCount(4)
  await expect(tiles).toContainText(['TETR.IO', 'MCSR Ranked', 'Table Tennis', 'Speedcubing'])
  await expect(tiles.first()).toContainText('SS')
  await expect(section.getByRole('img', { name: /tetra league tr history/ })).toBeVisible()

  await tiles.first().click()
  const dialog = page.getByRole('dialog', { name: 'TETR.IO' })
  await expect(dialog).toContainText('Started playing tetris')
  await expect(dialog.locator('dt')).toHaveCount(6)
  await expect(dialog.getByRole('img', { name: /tetra league tr history: 14,407 on Aug 17, 2024/ })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /View TETR.IO profile/ })).toHaveAttribute('href', 'https://ch.tetr.io/u/uselessleaf')
  await expect(dialog).toContainText('Sample stats from Oct 2, 2026 · not live')
  await page.keyboard.press('Escape')

  await tiles.nth(3).click()
  const cubing = page.getByRole('dialog', { name: 'Speedcubing' })
  await expect(cubing).toContainText('8.15s')
  await expect(cubing.getByRole('img')).toHaveCount(0)
  await page.keyboard.press('Escape')
})

test('say hello dialog lists email, LinkedIn, and GitHub', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  for (const trigger of [
    page.getByRole('navigation').getByRole('button', { name: /Say hello/ }),
    page.locator('#about').getByRole('button', { name: /Or just say hello/ }),
  ]) {
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Let’s chat!' })
    await expect(dialog).toContainText('Feel free to message me about anything.')
    await expect(dialog.getByRole('link', { name: /Email w22shen@uwaterloo.ca/ })).toHaveAttribute('href', 'mailto:w22shen@uwaterloo.ca')
    await expect(dialog.getByRole('link', { name: /Email/ })).not.toHaveAttribute('target')
    const linkedIn = dialog.getByRole('link', { name: /LinkedIn/ })
    await expect(linkedIn).toHaveAttribute('href', 'https://www.linkedin.com/in/williamrshen/')
    await expect(linkedIn).toHaveAttribute('target', '_blank')
    await expect(dialog.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/williamrshen')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  }
})

test('résumé link downloads the ported PDF', async ({ page, request }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  const link = page.locator('#about').getByRole('link', { name: /Résumé/ })
  await expect(link).toHaveAttribute('href', '/resume.pdf')
  await expect(link).toHaveAttribute('download', 'William Shen - Resume.pdf')
  const response = await request.get('/resume.pdf')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('application/pdf')
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')
  const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
  expect(download.suggestedFilename()).toBe('William Shen - Resume.pdf')
})

test('unknown and retired URLs return the 404 page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  expect((await page.goto('/'))!.status()).toBe(200)
  for (const path of ['/hobbies', '/coding', '/blog', '/not/a/page']) {
    const response = await page.goto(path)
    expect(response!.status(), path).toBe(404)
    await expect(page).toHaveTitle('Page not found · William Shen')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Nothing's grown here yet.")
  }
  await page.getByRole('link', { name: /Back to the garden/ }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('#world')).toBeVisible()
  expect(errors).toEqual([])
})

test('introduction shows identity, portrait, and current focus', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('William Shen · uselessleaf')
  await expect(page.getByText('AKA USELESSLEAF', { exact: true })).toBeVisible()
  await scrollTo(page, await collapseDistance(page))
  const about = page.locator('#about')
  await expect(about.getByText('aka uselessleaf')).toBeVisible()
  await expect(about.getByText('Third-year math student at the University of Waterloo.')).toBeVisible()
  const portrait = about.getByRole('img', { name: /William Shen smiling/ })
  await expect(portrait).toBeVisible()
  expect(await portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(1000)
  await expect(about.getByRole('list', { name: 'Currently' }).getByRole('listitem')).toHaveText([
    'Computational mathematics specialization',
    'Combinatorics & optimization minor',
    'Software Development Intern at Geotab',
    'Reading through the book of Galatians',
  ])
})
