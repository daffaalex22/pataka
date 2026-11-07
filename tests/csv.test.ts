import { describe, expect, it } from 'vitest'
import { toCsv } from '../src/lib/csv'

describe('toCsv', () => {
  it('renders a header row and escapes commas, quotes and newlines', () => {
    const csv = toCsv(
      [
        { code: 'PTK-1', name: 'Rina, Contoh', note: 'line1\nline2', quote: 'say "hi"' },
        { code: 'PTK-2', name: 'Budi', note: '', quote: '' },
      ],
      [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'note', label: 'Note' },
        { key: 'quote', label: 'Quote' },
      ],
    )
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Code,Name,Note,Quote')
    expect(lines[1]).toBe('PTK-1,"Rina, Contoh","line1\nline2","say ""hi"""')
    expect(lines[2]).toBe('PTK-2,Budi,,')
  })
})
