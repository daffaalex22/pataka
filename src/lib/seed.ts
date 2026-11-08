import type { SqlDb } from './db'
import { buildSummabaSeats } from './seatLayout'

const CATEGORIES = [
  { key: 'VIP', name: 'VIP Depan', nameEn: 'VIP Front', priceIdr: 1500000, colorHex: '#f5c542', sortOrder: 1, quota: 48 },
  { key: 'CAT1', name: 'CAT 1', nameEn: 'CAT 1', priceIdr: 900000, colorHex: '#a78bfa', sortOrder: 2, quota: 128 },
  { key: 'TRIB', name: 'Tribun', nameEn: 'Tribune', priceIdr: 600000, colorHex: '#38bdf8', sortOrder: 3, quota: 120 },
  { key: 'REG', name: 'Reguler', nameEn: 'Regular', priceIdr: 350000, colorHex: '#fb7185', sortOrder: 4, quota: 150 },
]

export async function seed(db: SqlDb): Promise<{ seats: number }> {
  const existing = await db.query<{ id: number }>('SELECT id FROM events LIMIT 1')
  if (existing.length > 0) return { seats: 0 }

  const seats = buildSummabaSeats()

  await db.transaction(async (tx) => {
    const [event] = await tx.query<{ id: number }>(
      `INSERT INTO events (name, name_en, venue, venue_en, starts_at, description, description_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        'Bandung Innovation Week 2026 — Closing Night Concert',
        'Bandung Innovation Week 2026 — Closing Night Concert',
        'Sawarga Courtyard, Summarecon Mall Bandung',
        'Sawarga Courtyard, Summarecon Mall Bandung',
        '2026-11-14T19:00:00+07:00',
        'Konser malam terbuka merayakan penutupan Bandung Innovation Week 2026. Pilih kursimu dan lihat langsung pemandangan panggung dari tempat dudukmu.',
        'An open-air night concert closing Bandung Innovation Week 2026. Pick your seat and preview the stage view from where you will be sitting.',
      ],
    )

    const categoryIds = new Map<string, number>()
    for (const category of CATEGORIES) {
      const [inserted] = await tx.query<{ id: number }>(
        `INSERT INTO ticket_categories (event_id, key, name, name_en, price_idr, color_hex, sort_order, quota)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [event.id, category.key, category.name, category.nameEn, category.priceIdr, category.colorHex, category.sortOrder, category.quota],
      )
      categoryIds.set(category.key, inserted.id)
    }

    const BATCH = 60
    for (let start = 0; start < seats.length; start += BATCH) {
      const batch = seats.slice(start, start + BATCH)
      const values: unknown[] = []
      const placeholders = batch.map((seat, index) => {
        const base = index * 9
        values.push(
          seat.id, categoryIds.get(seat.categoryKey), seat.section, seat.row, seat.num,
          seat.x, seat.y, seat.z, 'available',
        )
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`
      })
      await tx.query(
        `INSERT INTO seats (id, category_id, section, row, num, x, y, z, status) VALUES ${placeholders.join(',')}`,
        values,
      )
    }
  })

  return { seats: seats.length }
}
