import { getDb } from '@/lib/db'
import { createOrder } from '@/services/orders'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'INVALID_BODY' }, { status: 400 })

  const { holdToken, name, email, phone } = body as Record<string, unknown>
  if (
    typeof holdToken !== 'string' || !holdToken ||
    typeof name !== 'string' || name.trim().length < 2 ||
    typeof email !== 'string' || !isValidEmail(email) ||
    typeof phone !== 'string' || phone.trim().length < 6
  ) {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const result = await createOrder(db, {
    holdToken,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
  })

  if (result === 'HOLD_EXPIRED') return Response.json({ error: 'HOLD_EXPIRED' }, { status: 409 })
  if (result === 'SALES_CLOSED') return Response.json({ error: 'SALES_CLOSED' }, { status: 403 })
  return Response.json(result, { status: 201 })
}
