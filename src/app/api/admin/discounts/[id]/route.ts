import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { validateDiscountPatch } from '@/lib/discounts'
import { getDiscount, updateDiscount } from '@/services/discounts'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return unauthorized()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const existing = await getDiscount(db, Number(id))
  if (!existing) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const check = validateDiscountPatch(existing, body)
  if (check === 'IMMUTABLE') return Response.json({ error: 'IMMUTABLE' }, { status: 400 })
  if (check === 'VALIDATION') return Response.json({ error: 'VALIDATION' }, { status: 400 })

  // kind/code/type are immutable — drop them before writing.
  const patch = { ...body }
  delete patch.kind
  delete patch.code
  delete patch.type
  const result = await updateDiscount(db, Number(id), patch)
  if (result === null) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (result === 'CATEGORY_NOT_FOUND') return Response.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 400 })
  if (result === 'CODE_TAKEN') return Response.json({ error: 'CODE_TAKEN' }, { status: 409 })
  return Response.json(result)
}
