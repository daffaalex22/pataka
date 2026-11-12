import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3010'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

async function chooseQuality(label) {
  const button = page.getByRole('button', { name: /quality|grafik/i }).first()
  await button.click()
  await page.getByRole('option', { name: new RegExp(`^(${label})`, 'i') }).click()
}

try {
  await page.goto(`${base}/book?category=TRIB`, { waitUntil: 'domcontentloaded' })
  const venue3d = page.getByRole('button', { name: /3D Venue|Venue 3D/ })
  await venue3d.waitFor({ timeout: 90000 })
  await venue3d.click()
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
    undefined,
    { timeout: 120000 },
  )

  await chooseQuality('Rendah|Low')
  const saved = await page.evaluate(() => window.localStorage.getItem('pataka.scene-quality'))
  if (saved !== 'low') throw new Error(`expected low, got ${saved}`)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /3D Venue|Venue 3D/ }).click()
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
    undefined,
    { timeout: 120000 },
  )
  const label = await page.getByRole('button', { name: /quality|grafik/i }).first().innerText()
  if (!/Low|Rendah/i.test(label)) throw new Error(`quality did not persist: ${label}`)

  console.log('PASS graphics presets persist')
} finally {
  await browser.close()
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
