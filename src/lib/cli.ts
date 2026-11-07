import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createNeonDb } from './db'
import { migrate } from './migrate'
import { seed } from './seed'

async function main() {
  const command = process.argv[2]
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const db = createNeonDb(url)

  switch (command) {
    case 'migrate': {
      await migrate(db)
      console.log('migrate: schema applied')
      break
    }
    case 'seed': {
      await migrate(db)
      const result = await seed(db)
      console.log(`seed: ${result.seats} seats inserted${result.seats === 0 ? ' (already seeded)' : ''}`)
      break
    }
    case 'reset': {
      await db.query('DROP TABLE IF EXISTS scans')
      await db.query('DROP TABLE IF EXISTS orders')
      await db.query('DROP TABLE IF EXISTS seats')
      await db.query('DROP TABLE IF EXISTS ticket_categories')
      await db.query('DROP TABLE IF EXISTS events')
      await migrate(db)
      const result = await seed(db)
      console.log(`reset: schema recreated, ${result.seats} seats inserted`)
      break
    }
    default:
      console.error('usage: tsx src/lib/cli.ts <migrate|seed|reset>')
      process.exitCode = 1
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
