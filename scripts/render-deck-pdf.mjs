import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const base = process.env.DECK_BASE_URL ?? 'http://localhost:3000'
const out = 'public/deck/pataka-pitch.pdf'

async function main() {
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${base}/deck`, { waitUntil: 'networkidle' })

    await fs.mkdir('public/deck', { recursive: true })
    await page.pdf({
      path: out,
      width: '13.333in',
      height: '7.5in',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const bytes = await fs.readFile(out)
    if (bytes.includes('localhost') || bytes.includes('127.0.0.1')) {
      await fs.unlink(out)
      throw new Error('PDF contains a localhost or 127.0.0.1 link/text')
    }

    console.log('wrote', out)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
