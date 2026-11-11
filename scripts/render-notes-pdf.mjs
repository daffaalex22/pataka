import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const base = process.env.DECK_BASE_URL ?? 'http://localhost:3000'
const out = 'public/deck/pataka-notes.pdf'

async function main() {
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } })
    await page.goto(`${base}/deck/notes`, { waitUntil: 'networkidle' })
    await fs.mkdir('public/deck', { recursive: true })
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true })
    console.log('wrote', out)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
