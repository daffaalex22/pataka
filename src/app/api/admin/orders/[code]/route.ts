import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { cancelOrder, confirmPayment } from '@/services/orders'

export async function PATCH(req: Request, ctx: { params: Promise<{ code: string }> }) {
  if (!isAdmin(req)) return unauthorized()
  const { code } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'INVALID_BODY' }, { status: 400 })

  const db = await getDb()
  const action = body.action as string

  if (action === 'confirm') {
    const result = await confirmPayment(db, code)
    if (result === 'paid') return Response.json({ ok: true, status: 'paid' })
    if (result === 'NOT_FOUND') return Response.json({ error: result }, { status: 404 })
    return Response.json({ error: result }, { status: 409 })
  }

  if (action === 'cancel') {
    const ok = await cancelOrder(db, code)
    return ok ? Response.json({ ok: true, status: 'cancelled' }) : Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  if (action === 'update') {
    const { name, email, phone } = body as Record<string, unknown>
    if (
      typeof name !== 'string' || name.trim().length < 2 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof phone !== 'string' || phone.trim().length < 6
    ) {
      return Response.json({ error: 'VALIDATION' }, { status: 400 })
    }
    const rows = await db.query(
      'UPDATE orders SET name = $1, email = $2, phone = $3 WHERE code = $4 RETURNING code',
      [name.trim(), email.trim(), phone.trim(), code],
    )
    return rows.length > 0 ? Response.json({ ok: true }) : Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ error: 'UNKNOWN_ACTION' }, { status: 400 })
}
