import { chromium } from 'playwright'

/**
 * End-to-end venue smoke test: load the 3D world, pick a curved tribune seat
 * from the 2D map, walk to it, and confirm the seat-view panel opens.
 *
 * Run headed so the browser uses the real GPU; software WebGL is far too slow
 * for the scripted walk to finish in a reasonable time.
 */
const base = process.argv[2] ?? 'http://localhost:3010'
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

try {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  const enter = page.getByRole('button', { name: /Enter the Plaza|Masuk ke Plaza/ })
  await enter.waitFor({ timeout: 90000 })
  await page.waitForTimeout(1200)
  await enter.click()
  await page.waitForSelector('canvas', { timeout: 90000 })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
    undefined,
    { timeout: 120000 },
  )

  await page.getByRole('button', { name: /^(Peta|Map)$/ }).click()
  const seat = page.locator('[data-seat-id="TRIBR-B10"]').first()
  await seat.waitFor({ timeout: 30000 })
  await seat.click({ force: true })
  await page.waitForTimeout(600)

  await page.getByRole('button', { name: /Walk to seat|Jalan ke kursi/ }).click()
  await page.getByText(/Ini pemandangan dari kursi|This is your view from your seat/i).waitFor({
    timeout: 60000,
  })
  await page.screenshot({ path: 'artifacts/venue-pass/desktop-walk-to-trib.png', timeout: 90000 })
  console.log('PASS walk to curved tribune + seat view')
} finally {
  await browser.close()
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
