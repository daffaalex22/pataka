import { getDb } from '@/lib/db'
import { applyPromoToOrder, clearPromoFromOrder } from '@/services/discounts'

function errorStatus(error: string): number {
  if (error === 'ORDER_NOT_FOUND' || error === 'CODE_NOT_FOUND') return 404
  if (error === 'ORDER_NOT_EDITABLE' || error === 'HOLD_EXPIRED') return 409
  return 422
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => null)
  const rawCode = (body as { code?: unknown } | null)?.code
  if (typeof rawCode !== 'string' || rawCode.length < 1 || rawCode.length > 40) {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const result = await applyPromoToOrder(db, code, rawCode)
  if (!result.ok) return Response.json({ error: result.error }, { status: errorStatus(result.error) })
  return Response.json({ ok: true, ...result.breakdown })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params

  const db = await getDb()
  const result = await clearPromoFromOrder(db, code)
  if (!result.ok) return Response.json({ error: result.error }, { status: errorStatus(result.error) })
  return Response.json({ ok: true, ...result.breakdown })
}
