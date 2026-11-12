import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
page.on('pageerror', (error) => console.log('[pageerror]', error.message))
await page.goto('http://localhost:3010/book?category=TRIB', { waitUntil: 'domcontentloaded' })
const venue3d = page.getByRole('button', { name: /3D Venue|Venue 3D/ })
await venue3d.waitFor({ timeout: 90000 })
await venue3d.click()
await page.waitForFunction(
  () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
  undefined,
  { timeout: 120000 },
)
await page.waitForTimeout(1000)
await page.getByRole('button', { name: /Explore|Jelajahi/ }).click()
await page.waitForTimeout(2500)
await page.screenshot({ path: 'artifacts/venue-pass/desktop-walk.png', timeout: 90000 })
console.log('captured walk')
await browser.close()
