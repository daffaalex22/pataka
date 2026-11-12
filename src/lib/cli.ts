import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { getDb } from './db'
import { migrate } from './migrate'
import { seed } from './seed'
import { seedDemo } from './demo'
import { syncSeatLayout } from './seatSync'

async function main() {
  const command = process.argv[2]
  const db = await getDb()

  switch (command) {
    case 'migrate': {
      await migrate(db)
      const sync = await syncSeatLayout(db)
      console.log('migrate: schema applied')
      if (sync.totalSeats === 0) {
        console.log('migrate: no seats yet; seat layout sync skipped')
      } else {
        const positionResult =
          sync.seatsUpdated === 0 ? 'already current' : `${sync.seatsUpdated} positions updated`
        console.log(
          `migrate: seat layout ${positionResult}${sync.venueUpdated ? ', event venue updated' : ''}`,
        )
      }
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
      await db.query('DROP TABLE IF EXISTS discounts')
      await db.query('DROP TABLE IF EXISTS seats')
      await db.query('DROP TABLE IF EXISTS ticket_categories')
      await db.query('DROP TABLE IF EXISTS events')
      await migrate(db)
      const result = await seed(db)
      console.log(`reset: schema recreated, ${result.seats} seats inserted`)
      break
    }
    case 'demo': {
      await migrate(db)
      const base = await seed(db)
      if (base.seats === 0) await db.query("UPDATE orders SET checked_in_at = NULL")
      const result = await seedDemo(db)
      console.log(`demo: ${result.paid} paid orders, ${result.pending} pending`)
      break
    }
    default:
      console.error('usage: tsx src/lib/cli.ts <migrate|seed|reset|demo>')
      process.exitCode = 1
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
