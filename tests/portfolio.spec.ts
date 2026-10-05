import { expect, test, type Page } from '@playwright/test'

async function collapseDistance(page: Page) {
  return page.locator('#garden').evaluate((garden) =>
    garden.clientHeight - parseFloat(getComputedStyle(garden).getPropertyValue('--nav-height')),
  )
}

async function scrollTo(page: Page, top: number) {
  // Programmatic scrolls during a card/panel view transition can land a few pixels off.
  await page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'))
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
  await expect(brand).toHaveText('william shen.')
  expect((initialBrand.x + initialMode.x + initialMode.width) / 2).toBeCloseTo(720, 0)
  expect(initialMode.x - initialBrand.x - initialBrand.width).toBeCloseTo(18, 0)
  await page.screenshot({ path: testInfo.outputPath('landing.png') })

  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'evening')
  await expect(mode).toHaveText('evening')
  await expect(mode).toHaveAccessibleName('switch to daytime')
  await expect(brand).toHaveText('uselessleaf.')
  const eveningBrand = (await brand.boundingBox())!
  const eveningMode = (await mode.boundingBox())!
  expect((eveningBrand.x + eveningMode.x + eveningMode.width) / 2).toBeCloseTo(720, 0)
  expect(eveningMode.x - eveningBrand.x - eveningBrand.width).toBeCloseTo(18, 0)
  await page.screenshot({ path: testInfo.outputPath('landing-evening.png') })
  await mode.click()
  await expect(brand).toHaveText('william shen.')
  await expect(mode).toHaveText('daytime')
  await expect(mode).toHaveAccessibleName('switch to evening')
  await scrollTo(page, (await collapseDistance(page)) / 2)
  const midMode = (await mode.boundingBox())!
  expect(midMode.x).toBeGreaterThan(initialMode.x)
  await page.screenshot({ path: testInfo.outputPath('mid-scroll.png') })
  await scrollTo(page, await collapseDistance(page))
  await expect(navigation).toHaveJSProperty('inert', false)
  await expect(navigation.locator(':scope > a, :scope > button')).toHaveText([
    'about', 'work', 'projects', 'for fun', 'contact',
  ])
  const finalBrand = (await brand.boundingBox())!
  const finalMode = (await mode.boundingBox())!
  expect(finalBrand.x).toBeCloseTo(1440 * 0.07, 0)
  expect(finalMode.x + finalMode.width).toBeCloseTo(1440 * 0.93, 0)
  expect((await page.locator('[data-garden-surface]').boundingBox())!.height).toBe(76)
  expect((await page.locator('#about').boundingBox())!.y).toBe(76)
  const portrait = (await page.locator('#about figure').boundingBox())!
  const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!
  expect(portrait.x + portrait.width).toBeLessThan(heading.x)
  await page.screenshot({ path: testInfo.outputPath('hero.png') })

  await mode.click()
  await expect(mode).toHaveAccessibleName('switch to daytime')
  await expect(mode).toHaveText('evening')
  await expect(navigation.getByRole('button', { name: 'Field notes' })).toHaveCount(0)
  const contactButton = navigation.getByRole('button', { name: 'contact', exact: true })
  await contactButton.click()
  await expect(contactButton).toHaveText('contact')
  await expect(contactButton.locator('span')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Let’s chat!')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(navigation.getByRole('button', { name: 'contact', exact: true })).toBeFocused()

  await navigation.getByRole('link', { name: 'projects', exact: true }).click()
  const projects = page.locator('#work')
  const project = projects.getByRole('button', { name: /Communal Catalogue/ })
  await project.click()
  await expect(projects.getByRole('region', { name: 'Communal Catalogue' })).toBeVisible()
  await projects.getByRole('button', { name: 'Close details' }).click()
  await expect(projects.getByRole('region')).toHaveCount(0)
  await expect(project).toBeFocused()
  await scrollTo(page, 0)
  await expect(navigation).toHaveJSProperty('inert', true)
  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'false')
  expect((await brand.boundingBox())!.x).toBeCloseTo(initialBrand.x, 0)
  expect((await mode.boundingBox())!.x).toBeCloseTo(initialMode.x, 0)
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
    const firstLink = (await nav.getByRole('link', { name: 'about', exact: true }).boundingBox())!
    await expect(nav.getByRole('link', { name: 'work', exact: true })).toBeVisible({ visible: width > 680 })
    await expect(nav.getByRole('link', { name: 'for fun', exact: true })).toBeVisible({ visible: width > 1000 })
    const lastLink = (await nav.getByRole('button', { name: 'contact', exact: true }).boundingBox())!
    const toggle = (await page.locator('#mode').boundingBox())!
    expect(brand.x + brand.width + 8).toBeLessThan(firstLink.x)
    expect(lastLink.x + lastLink.width + 7).toBeLessThan(toggle.x)
    expect(brand.y + brand.height / 2).toBeCloseTo(firstLink.y + firstLink.height / 2, 0)
    expect(toggle.x + toggle.width).toBeCloseTo(width * (width <= 680 ? 0.94 : 0.93), 0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 390) {
      expect((await page.getByRole('heading', { level: 1 }).boundingBox())!.y).toBeGreaterThan((await page.locator('#about figure').boundingBox())!.y)
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

test('experience shows three roles, expands to all, and shows role details in a side panel', async ({ page }, testInfo) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'work', exact: true }).click()
  const section = page.locator('#experience')
  await expect(section.getByRole('heading', { name: "Where I've worked" })).toBeVisible()
  await expect(section.getByText('EXPERIENCE /', { exact: true })).toBeVisible()
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
  await toggle.click()
  await expect(cards).toHaveCount(3)

  // Selecting a role collapses the cards into one column and opens the panel on the right.
  const sunLife = section.getByRole('button', { name: /Sun Life/ })
  await sunLife.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const panel = section.getByRole('region', { name: 'SQL Server/Infrastructure DBA' })
  await expect(panel).toBeVisible()
  await expect(sunLife).toHaveAttribute('aria-current', 'true')
  await expect(toggle).toHaveCount(0)
  await expect(cards).toHaveCount(4)
  const boxes = await Promise.all([0, 1, 2, 3].map(async (index) => (await cards.nth(index).boundingBox())!))
  for (const box of boxes) expect(box.x).toBeCloseTo(boxes[0].x, 0)
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y)
  expect(boxes[0].x + boxes[0].width).toBeLessThan((await panel.boundingBox())!.x)
  await expect(panel.getByRole('listitem').first()).toContainText('400+ CIS standards')
  await expect(panel.getByRole('list', { name: 'Skills and tools' })).toContainText('Splunk')
  await expect(panel.getByRole('link', { name: /Visit Sun Life/ })).toHaveAttribute('href', 'https://www.sunlife.com/')
  await page.screenshot({ path: testInfo.outputPath('experience-panel.png') })

  // Choosing another role swaps the panel content in place.
  await section.getByRole('button', { name: /Geotab/ }).click()
  const geotab = section.getByRole('region', { name: 'Software Development Intern' })
  await expect(geotab).toContainText('Role details coming soon.')
  await expect(sunLife).not.toHaveAttribute('aria-current')
  await section.getByRole('button', { name: /Young Engineers/ }).click()
  await expect(section.getByRole('region')).toContainText('Young Engineers')

  // Escape closes the panel, restores the grid, and returns focus to the selected card.
  await page.keyboard.press('Escape')
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(section.getByRole('button', { name: /Young Engineers/ })).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await sunLife.click()
  await section.getByRole('button', { name: 'Close details' }).click()
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(sunLife).toBeFocused()

  // Clicking the selected card again also closes the panel.
  await sunLife.click()
  await expect(panel).toBeVisible()
  await sunLife.click()
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(sunLife).toBeFocused()
})

test('projects show three at a time, expand to all five, and show project details in a side panel', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'projects', exact: true }).click()
  const section = page.locator('#work')
  const meta = section.getByText('PROJECTS /', { exact: true })
  await expect(meta).toBeVisible()
  // Projects mirror the experience section: title on the right, meta on the left.
  const heading = (await section.getByRole('heading', { name: "A few things I've grown" }).boundingBox())!
  expect((await meta.boundingBox())!.x).toBeLessThan(heading.x)
  const cards = section.getByRole('listitem').getByRole('button')
  await expect(cards).toHaveCount(3)
  await expect(cards).toContainText(['Communal Catalogue', 'Snowballistic', 'Competitive Programming'])
  const toggle = section.locator('button[aria-expanded]')
  await expect(toggle).toHaveAccessibleName('Show all 5 projects')
  await toggle.click()
  await expect(toggle).toHaveAccessibleName('Show fewer projects')
  await expect(cards).toContainText(['Communal Catalogue', 'Snowballistic', 'Competitive Programming', 'Gendentify', 'YouTube Channel'])

  await toggle.click()
  await expect(cards).toHaveCount(3)

  // Selecting a project lists every project in one column on the right, with the details panel on the left.
  const snowballistic = section.getByRole('button', { name: /Snowballistic/ })
  await snowballistic.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const panel = section.getByRole('region', { name: 'Snowballistic' })
  await expect(panel).toBeVisible()
  await expect(snowballistic).toHaveAttribute('aria-current', 'true')
  await expect(toggle).toHaveCount(0)
  await expect(cards).toHaveCount(5)
  const boxes = await Promise.all([0, 1, 2, 3, 4].map(async (index) => (await cards.nth(index).boundingBox())!))
  for (const box of boxes) expect(box.x).toBeCloseTo(boxes[0].x, 0)
  const panelBox = (await panel.boundingBox())!
  expect(panelBox.x + panelBox.width).toBeLessThan(boxes[0].x)

  // Switching projects swaps the panel; a hidden-by-default project can be chosen from the list.
  const youtube = section.getByRole('button', { name: /YouTube Channel/ })
  await youtube.click()
  const youtubePanel = section.getByRole('region', { name: 'YouTube Channel' })
  await expect(youtubePanel).toContainText('PROJECT · 2020 – PRESENT')
  await expect(youtubePanel.getByRole('link', { name: /Visit YouTube channel/ })).toHaveAttribute('href', 'https://www.youtube.com/@uselessleaf')
  await expect(snowballistic).not.toHaveAttribute('aria-current')

  // Clicking the selected project again closes the panel; its card stays visible and focused.
  await youtube.click()
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(youtube).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await snowballistic.click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(snowballistic).toBeFocused()
})

test('hobbies show sample stats and open hobby details in a side panel', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  await page.getByRole('navigation').getByRole('link', { name: 'for fun', exact: true }).click()
  const section = page.locator('#hobbies')
  await expect(section.getByRole('heading', { name: 'What I grew up doing' })).toBeVisible()
  await expect(section.getByText('HOBBIES /', { exact: true })).toBeVisible()
  const tiles = section.getByRole('listitem').getByRole('button')
  await expect(tiles).toHaveCount(4)
  await expect(tiles).toContainText(['TETR.IO', 'MCSR Ranked', 'Table Tennis', 'Speedcubing'])
  await expect(tiles.first()).toContainText('SS')
  await expect(section.getByRole('img', { name: /tetra league tr history/ })).toBeVisible()

  // Selecting a hobby collapses the tiles to header-only rows in a column beside the panel.
  const tetris = tiles.first()
  await tetris.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const panel = section.getByRole('region', { name: 'TETR.IO' })
  await expect(panel).toBeVisible()
  await expect(tetris).toHaveAttribute('aria-current', 'true')
  await expect(tetris).toHaveAccessibleName('Competitive Tetris TETR.IO')
  await expect(tetris.getByText('View stats')).toBeHidden()
  const boxes = await Promise.all([0, 1, 2, 3].map(async (index) => (await tiles.nth(index).boundingBox())!))
  for (const box of boxes) expect(box.x).toBeCloseTo(boxes[0].x, 0)
  expect(boxes[0].x + boxes[0].width).toBeLessThan((await panel.boundingBox())!.x)
  await expect(panel).toContainText('Started playing tetris')
  await expect(panel.locator('dt')).toHaveCount(6)
  await expect(panel.getByRole('img', { name: /tetra league tr history: 14,407 on Aug 17, 2024/ })).toBeVisible()
  await expect(panel.getByRole('link', { name: /View TETR.IO profile/ })).toHaveAttribute('href', 'https://ch.tetr.io/u/uselessleaf')
  await expect(panel).toContainText('Sample stats from Oct 2, 2026 · not live')

  // Switching hobbies swaps the panel in place.
  const cubingTile = tiles.nth(3)
  await cubingTile.click()
  const cubing = section.getByRole('region', { name: 'Speedcubing' })
  await expect(cubing).toContainText('8.15s')
  await expect(cubing.getByRole('img')).toHaveCount(0)

  // Clicking the selected hobby again closes the panel and restores the full tiles.
  await cubingTile.click()
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(cubingTile).toBeFocused()
  await expect(cubingTile.getByText('View stats')).toBeVisible()

  await tetris.click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(section.getByRole('region')).toHaveCount(0)
  await expect(tetris).toBeFocused()
})

test('contact dialog lists email, LinkedIn, and GitHub', async ({ page }) => {
  await page.goto('/')
  await scrollTo(page, await collapseDistance(page))
  for (const trigger of [
    page.getByRole('navigation').getByRole('button', { name: 'contact', exact: true }),
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

test('footer shows the motto on the left and the verse on the right', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await footer.scrollIntoViewIfNeeded()
  await expect(footer.getByText('soli deo gloria')).toBeVisible()
  await expect(footer.getByRole('blockquote')).toContainText('“My grace is sufficient for you, for my power is made perfect in weakness.”')
  await expect(footer.getByText('2 Corinthians 12:9')).toBeVisible()
  await expect(footer).not.toContainText('Made with intention')
  const bounds = (await footer.boundingBox())!
  const motto = (await footer.getByText('soli deo gloria').boundingBox())!
  const verse = (await footer.locator('figure').boundingBox())!
  expect(motto.x).toBeCloseTo(bounds.x, 0)
  expect(verse.x + verse.width).toBeCloseTo(bounds.x + bounds.width, 0)
  expect(motto.x + motto.width).toBeLessThan(verse.x)
})

test('introduction shows identity, portrait, and current focus', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('William Shen · uselessleaf')
  const garden = page.locator('#garden')
  const arrow = garden.getByRole('link', { name: 'Scroll to introduction' })
  await expect(arrow).toBeVisible()
  await expect(arrow).toHaveAttribute('href', '#about')
  for (const text of ['AKA USELESSLEAF', "There's more beneath the canopy", 'ROOTED IN CURIOSITY']) {
    await expect(garden.getByText(text)).toHaveCount(0)
  }
  await scrollTo(page, await collapseDistance(page))
  const about = page.locator('#about')
  await expect(about.getByText('aka uselessleaf')).toBeVisible()
  await expect(about.getByText('Third-year math student at the University of Waterloo.')).toBeVisible()
  const portrait = about.getByRole('img', { name: /William Shen smiling/ })
  await expect(portrait).toBeVisible()
  expect(await portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(1000)
  await expect(about.locator('figcaption')).toHaveText('01 / me in halifax with a lobster')
  await expect(about).not.toContainText('HELLO, WORLD')
  await expect(about.getByRole('list', { name: 'Currently' }).getByRole('listitem')).toHaveText([
    'Computational mathematics specialization',
    'Combinatorics & optimization minor',
    'Software Development Intern at Geotab',
    'Reading through the book of Galatians',
  ])
})
