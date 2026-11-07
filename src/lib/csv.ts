type Column = { key: string; label: string }

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/** RFC 4180-style CSV with CRLF line endings. */
export function toCsv(rows: Record<string, unknown>[], columns: Column[]): string {
  const header = columns.map((column) => escapeCell(column.label)).join(',')
  const body = rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(','))
  return [header, ...body].join('\r\n')
}
