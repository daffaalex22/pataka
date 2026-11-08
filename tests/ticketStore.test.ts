import { describe, expect, it } from 'vitest'
import { listTickets, removeTicket, saveTicket } from '@/lib/ticketStore'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

describe('ticketStore', () => {
  it('saves a ticket and lists it', () => {
    const storage = fakeStorage()
    saveTicket('PTK-ABC123', storage)
    expect(listTickets(storage).map((ticket) => ticket.code)).toEqual(['PTK-ABC123'])
  })

  it('dedupes and keeps the newest save first', () => {
    const storage = fakeStorage()
    saveTicket('PTK-AAA111', storage)
    saveTicket('PTK-BBB222', storage)
    saveTicket('PTK-AAA111', storage)
    expect(listTickets(storage).map((ticket) => ticket.code)).toEqual(['PTK-AAA111', 'PTK-BBB222'])
  })

  it('returns an empty list for corrupt or invalid stored JSON', () => {
    const storage = fakeStorage()
    storage.setItem('pataka.tickets.v1', '{not json')
    expect(listTickets(storage)).toEqual([])
    storage.setItem('pataka.tickets.v1', JSON.stringify({ nope: true }))
    expect(listTickets(storage)).toEqual([])
    storage.setItem('pataka.tickets.v1', JSON.stringify([{ code: 42 }, { code: 'PTK-OK1', savedAt: 1 }]))
    expect(listTickets(storage).map((ticket) => ticket.code)).toEqual(['PTK-OK1'])
  })

  it('removes a saved ticket', () => {
    const storage = fakeStorage()
    saveTicket('PTK-AAA111', storage)
    saveTicket('PTK-BBB222', storage)
    expect(removeTicket('PTK-AAA111', storage).map((ticket) => ticket.code)).toEqual(['PTK-BBB222'])
  })

  it('caps the saved list at 20 entries', () => {
    const storage = fakeStorage()
    for (let i = 0; i < 25; i++) saveTicket(`PTK-${String(i).padStart(4, '0')}`, storage)
    expect(listTickets(storage)).toHaveLength(20)
    expect(listTickets(storage)[0].code).toBe('PTK-0024')
  })

  it('tolerates missing storage (SSR / privacy mode)', () => {
    expect(listTickets(null)).toEqual([])
    expect(saveTicket('PTK-ABC123', null)).toEqual([])
  })
})
