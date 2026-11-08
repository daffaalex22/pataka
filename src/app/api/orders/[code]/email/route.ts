import { getDb } from '@/lib/db'
import { sendTicketEmail } from '@/services/email'
import { loadTicketEmail } from '@/services/ticketEmail'

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const db = await getDb()

  const loaded = await loadTicketEmail(db, code, new URL(req.url).origin)
  if (!loaded) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (loaded.status !== 'paid') return Response.json({ error: 'NOT_PAID' }, { status: 409 })

  const status = await sendTicketEmail(loaded.ticket)
  return Response.json({ status })
}
