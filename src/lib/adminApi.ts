export function adminHeaders(key: string): Record<string, string> {
  return { 'x-admin-key': key }
}

export async function adminFetch<T>(key: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...adminHeaders(key), 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? String(res.status))
  }
  return (await res.json()) as T
}

export async function downloadWithAuth(key: string, url: string) {
  const res = await fetch(url, { headers: adminHeaders(key) })
  if (!res.ok) throw new Error(String(res.status))
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = url.includes('transactions') ? 'pataka-transactions.csv' : 'pataka-participants.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
