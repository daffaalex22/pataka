import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return unauthorized()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'INVALID_BODY' }, { status: 400 })

  const priceIdr = body.priceIdr === undefined ? null : Number(body.priceIdr)
  const quota = body.quota === undefined ? null : Number(body.quota)
  const salesOpen = body.salesOpen === undefined ? null : Boolean(body.salesOpen)

  if (
    (priceIdr !== null && (!Number.isFinite(priceIdr) || priceIdr < 0)) ||
    (quota !== null && (!Number.isFinite(quota) || quota < 0))
  ) {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const rows = await db.query(
    `UPDATE ticket_categories
     SET price_idr = COALESCE($2, price_idr),
         quota = COALESCE($3, quota),
         sales_open = COALESCE($4, sales_open)
     WHERE id = $1
     RETURNING id`,
    [Number(id), priceIdr, quota === null ? null : Math.floor(quota), salesOpen],
  )

  return rows.length > 0 ? Response.json({ ok: true }) : Response.json({ error: 'NOT_FOUND' }, { status: 404 })
}
