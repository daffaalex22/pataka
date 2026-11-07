/** Gate admin API routes with the demo admin key. */
export function isAdmin(req: Request): boolean {
  const key = process.env.ADMIN_KEY
  if (!key) return false
  return req.headers.get('x-admin-key') === key
}

export function unauthorized() {
  return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
}
