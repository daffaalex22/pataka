const STORAGE_KEY = 'pataka.tickets.v1'
const MAX_TICKETS = 20

export type SavedTicket = { code: string; savedAt: number }

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isSavedTicket(value: unknown): value is SavedTicket {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.code === 'string' && candidate.code.length > 0 && typeof candidate.savedAt === 'number'
}

/** Saved order codes for this browser, newest first. Tolerates corrupt storage. */
export function listTickets(storage: StorageLike | null = defaultStorage()): SavedTicket[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedTicket).slice(0, MAX_TICKETS)
  } catch {
    return []
  }
}

/** Adds (or refreshes) a ticket in the saved list, newest first. */
export function saveTicket(code: string, storage: StorageLike | null = defaultStorage()): SavedTicket[] {
  if (!storage) return []
  const next = [
    { code, savedAt: Date.now() },
    ...listTickets(storage).filter((ticket) => ticket.code !== code),
  ].slice(0, MAX_TICKETS)
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage may be full or blocked; the in-memory list is still returned
  }
  return next
}

export function removeTicket(code: string, storage: StorageLike | null = defaultStorage()): SavedTicket[] {
  if (!storage) return []
  const next = listTickets(storage).filter((ticket) => ticket.code !== code)
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage write failures
  }
  return next
}
