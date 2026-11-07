import { getDb } from '@/lib/db'
import { payOrder } from '@/services/orders'

const METHODS = ['ewallet', 'va', 'qrpay'] as const

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const method = METHODS.includes(body?.method) ? body.method : 'ewallet'

  const db = await getDb()
  const result = await payOrder(db, code, method)

  switch (result) {
    case 'paid':
      return Response.json({ status: 'paid' })
    case 'NOT_FOUND':
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    case 'HOLD_EXPIRED':
    case 'ORDER_CANCELLED':
      return Response.json({ error: result }, { status: 409 })
  }
}
