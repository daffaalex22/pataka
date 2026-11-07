function icsDate(iso: string | Date) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export function buildIcs(input: {
  code: string
  name: string
  seatLabel: string
  startsAt: string
  venue: string
  title: string
}): string {
  const startMs = new Date(input.startsAt).getTime()
  const endMs = startMs + 3 * 60 * 60 * 1000

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pataka//Event Ticketing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.code}@pataka`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(input.startsAt)}`,
    `DTEND:${icsDate(new Date(endMs))}`,
    `SUMMARY:${escapeText(input.title)}`,
    `LOCATION:${escapeText(input.venue)}`,
    `DESCRIPTION:${escapeText(`E-ticket ${input.code} · ${input.name} · Seat ${input.seatLabel}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
