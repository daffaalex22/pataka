import { getDb } from '@/lib/db'
import { sendTicketEmail } from '@/services/email'
import { payOrder } from '@/services/orders'
import { loadTicketEmail, resolveTicketOrigin } from '@/services/ticketEmail'

const METHODS = ['ewallet', 'va', 'qrpay'] as const

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const method = METHODS.includes(body?.method) ? body.method : 'ewallet'

  const db = await getDb()
  const result = await payOrder(db, code, method)

  switch (result) {
    case 'paid': {
      const loaded = await loadTicketEmail(db, code, resolveTicketOrigin(req.url))
      const email = loaded ? await sendTicketEmail(loaded.ticket) : 'failed'
      return Response.json({ status: 'paid', email })
    }
    case 'NOT_FOUND':
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    case 'HOLD_EXPIRED':
    case 'ORDER_CANCELLED':
    case 'DISCOUNT_UNAVAILABLE':
      return Response.json({ error: result }, { status: 409 })
  }
}
