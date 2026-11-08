import { getDb } from '@/lib/db'
import { createCooldown, sendTicketEmail } from '@/services/email'
import { loadTicketEmail, resolveTicketOrigin } from '@/services/ticketEmail'

const cooldown = createCooldown(60_000)

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  if (!cooldown.allow(code)) return Response.json({ error: 'RATE_LIMITED' }, { status: 429 })

  const db = await getDb()
  const loaded = await loadTicketEmail(db, code, resolveTicketOrigin(req.url))
  if (!loaded) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (loaded.status !== 'paid') return Response.json({ error: 'NOT_PAID' }, { status: 409 })

  const status = await sendTicketEmail(loaded.ticket)
  return Response.json({ status })
}
