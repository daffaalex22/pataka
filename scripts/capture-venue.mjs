import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3010'
const output = 'artifacts/venue-pass'
mkdirSync(output, { recursive: true })

async function waitForVenue(page) {
  await page.waitForSelector('canvas', { timeout: 90000 })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
    undefined,
    { timeout: 90000 },
  )
  await page.waitForTimeout(1200)
}

async function openSeatStep(page) {
  await page.goto(`${base}/book?category=TRIB`, { waitUntil: 'domcontentloaded' })
  const venue3d = page.getByRole('button', { name: /3D Venue|Venue 3D/ })
  await venue3d.waitFor({ timeout: 90000 })
  await venue3d.click()
  await waitForVenue(page)
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const errors = []

const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
const page = await desktop.newPage()
page.on('pageerror', (error) => errors.push(`desktop pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`desktop console: ${message.text()}`)
})

await openSeatStep(page)
await page.screenshot({ path: `${output}/desktop-orbit.png`, fullPage: true, timeout: 90000 })

// Open the 2D venue map and select a curved tribune seat.
await page.getByRole('button', { name: /List|Daftar/ }).click()
await page.getByRole('button', { name: /Venue map|Peta venue/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${output}/desktop-seat-map.png`, fullPage: true, timeout: 90000 })
const tribuneSeat = page.locator('[data-seat-id="TRIBR-B10"]')
if (await tribuneSeat.count()) {
  await tribuneSeat.click({ force: true })
  await page.getByRole('button', { name: /Use this seat|Gunakan kursi ini/ }).click()
  await page.waitForTimeout(2500)

  await page.getByRole('button', { name: /3D Venue|Venue 3D/ }).click()
  await waitForVenue(page)
  await page.getByRole('button', { name: /Preview from seat|Lihat dari kursi/ }).click()
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${output}/desktop-seat-preview.png`, fullPage: true, timeout: 90000 })
}

await desktop.close()

const mobile = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
const mobilePage = await mobile.newPage()
mobilePage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`))
mobilePage.on('console', (message) => {
  if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`)
})
await mobilePage.goto(`${base}/book?category=TRIB`, { waitUntil: 'domcontentloaded' })
await mobilePage.waitForTimeout(1200)
// On touch the booking page defaults to the 2D list; switch to the 3D venue.
await mobilePage.getByRole('button', { name: /3D Venue|Venue 3D/ }).click()
await waitForVenue(mobilePage)
await mobilePage.screenshot({ path: `${output}/mobile-orbit.png`, fullPage: true, timeout: 90000 })

await mobilePage.getByRole('button', { name: /List|Daftar/ }).click()
await mobilePage.getByRole('button', { name: /Venue map|Peta venue/ }).click()
await mobilePage.waitForTimeout(500)
await mobilePage.screenshot({ path: `${output}/mobile-seat-map.png`, fullPage: true, timeout: 90000 })
await mobile.close()
await browser.close()

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Captured venue pass to ${output}`)
