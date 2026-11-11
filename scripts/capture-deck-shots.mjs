import { chromium } from 'playwright'
import { config } from 'dotenv'
import fs from 'node:fs/promises'
import path from 'node:path'

config({ path: '.env.local' })

const base = process.env.DECK_BASE_URL ?? 'http://localhost:3000'
const adminKey = process.env.ADMIN_KEY ?? 'panitia2026'
const outDir = path.resolve('public/deck')
const homeDir = path.resolve('public/home')

async function clickFirstEnabled(page, name) {
  const buttons = page.getByRole('button', { name })
  const count = await buttons.count()
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    if (await button.isEnabled()) {
      await button.click({ force: true, timeout: 60000 })
      return
    }
  }
  throw new Error(`No enabled button matched ${name}`)
}

async function waitForVenue(page) {
  await page.waitForSelector('canvas', { timeout: 120000 })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.sawargaReady === '1',
    undefined,
    { timeout: 120000 },
  )
}

async function enterWorld(page) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await clickFirstEnabled(page, /Masuk ke Plaza|Enter the Plaza/)
  await waitForVenue(page)
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(homeDir, { recursive: true })
  const browser = await chromium.launch({ headless: false })

  try {
    // Clean full-bleed hero for the home splash: canvas only, no HUD.
    const hero = await browser.newPage({ viewport: { width: 1920, height: 1200 } })
    await enterWorld(hero)
    await clickFirstEnabled(hero, /Putar|Orbit/)
    await hero.waitForTimeout(6000)
    // Hide the HUD/joystick/hint so the hero is a clean canvas frame.
    await hero.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const root = canvas?.closest('.fixed')
      if (!root || !canvas) return
      for (const child of Array.from(root.children)) {
        if (!child.contains(canvas)) child.style.visibility = 'hidden'
      }
    })
    await hero.waitForTimeout(300)
    await hero.locator('canvas').screenshot({
      path: path.join(homeDir, 'venue-night-sawarga.png'),
      timeout: 90000,
    })
    console.log('wrote', path.join(homeDir, 'venue-night-sawarga.png'))
    await hero.close()

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await enterWorld(desktop)
    // Compose the venue from the orbit camera instead of the player's eye.
    await clickFirstEnabled(desktop, /Putar|Orbit/)
    // Let the camera reset finish and the intro hint fade before capturing.
    await desktop.waitForTimeout(6000)
    await desktop.screenshot({ path: path.join(outDir, 'venue-sawarga.png') })
    console.log('wrote', path.join(outDir, 'venue-sawarga.png'))

    // Curved tribune seat proof: open the map, pick a TRIB seat near the
    // centre line, then switch to the eye-level preview.
    await desktop.getByRole('button', { name: /Peta|Map/ }).click({ force: true })
    await desktop.locator('[data-seat-id]').first().waitFor({ timeout: 10000 })
    const seat = await desktop.evaluate(async () => {
      const seats = await (await fetch('/api/seats')).json()
      const available = seats.filter((item) => item.status === 'available')
      const trib = available.filter((item) => item.categoryKey === 'TRIB')
      const preferred = trib.find((item) => item.id === 'TRIBR-B10')
      if (preferred) return preferred
      const pool = trib.length > 0 ? trib : available
      const target = { x: 30, z: 0 }
      return (
        pool
          .slice()
          .sort((a, b) => {
            const da = (a.x - target.x) ** 2 + (a.z - target.z) ** 2
            const db = (b.x - target.x) ** 2 + (b.z - target.z) ** 2
            return da - db
          })[0] ?? null
      )
    })
    if (!seat) throw new Error('No available seat found; run npm run db:demo first')
    await desktop.locator(`[data-seat-id="${seat.id}"]`).click({ force: true })
    await desktop.getByRole('button', { name: /Lihat dari kursi|Preview from seat/ }).click({ force: true, timeout: 60000 })
    await desktop.waitForTimeout(5000)
    await desktop.screenshot({ path: path.join(outDir, 'seat-view-tribune.png') })
    console.log('wrote', path.join(outDir, 'seat-view-tribune.png'), `(${seat.id})`)

    await desktop.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
    await desktop.waitForTimeout(500)
    await desktop.locator('input[type="password"]').fill(adminKey)
    await desktop.getByRole('button', { name: /Masuk|Sign in/ }).click()
    await desktop.getByRole('button', { name: /Dasbor|Dashboard/ }).waitFor({ timeout: 20000 })
    await desktop.getByText(/pendaftar|tiket terjual|registrants|tickets sold/i).first().waitFor({ timeout: 20000 })
    await desktop.waitForTimeout(1000)
    await desktop.screenshot({ path: path.join(outDir, 'admin-2026.png') })
    console.log('wrote', path.join(outDir, 'admin-2026.png'))

    await desktop.getByRole('button', { name: /Operasi Mall|Mall operations/ }).click()
    await desktop.getByText(/Portofolio acara|Event portfolio/).first().waitFor({ timeout: 20000 })
    await desktop.waitForTimeout(1000)
    await desktop.screenshot({ path: path.join(outDir, 'mall-operations-2026.png') })
    console.log('wrote', path.join(outDir, 'mall-operations-2026.png'))

    const ticket = await browser.newPage({ viewport: { width: 900, height: 900 } })
    await ticket.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
    await ticket.waitForTimeout(500)
    await ticket.locator('input[type="password"]').fill(adminKey)
    await ticket.getByRole('button', { name: /Masuk|Sign in/ }).click()
    const order = await ticket.evaluate(async (key) => {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-key': key } })
      if (!res.ok) throw new Error(`admin orders ${res.status}`)
      const orders = await res.json()
      return orders.find((item) => item.status === 'paid') ?? null
    }, adminKey)
    if (!order) throw new Error('No paid order found; run npm run db:demo first')
    await ticket.goto(`${base}/eticket/${encodeURIComponent(order.code)}`, { waitUntil: 'domcontentloaded' })
    await ticket.getByText(order.code).first().waitFor({ timeout: 20000 })
    await ticket.waitForTimeout(1000)
    await ticket.screenshot({ path: path.join(outDir, 'eticket-2026.png') })
    console.log('wrote', path.join(outDir, 'eticket-2026.png'))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})


