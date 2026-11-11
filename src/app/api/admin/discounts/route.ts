import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { validateDiscountInput } from '@/lib/discounts'
import { createDiscount, listDiscounts } from '@/services/discounts'

export async function GET(req: Request) {
  await connection()
  if (!isAdmin(req)) return unauthorized()
  const db = await getDb()
  const rows = await listDiscounts(db)
  return Response.json(rows)
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized()
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const error = validateDiscountInput(body)
  if (error) return Response.json({ error }, { status: 400 })

  const db = await getDb()
  const result = await createDiscount(db, body)
  if (result === 'CODE_TAKEN') return Response.json({ error: 'CODE_TAKEN' }, { status: 409 })
  if (result === 'CATEGORY_NOT_FOUND') return Response.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 400 })
  return Response.json(result, { status: 201 })
}
