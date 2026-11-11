import type { DictKey } from '@/lib/i18n'
import type { Lang } from '@/lib/types'

const SEAT_ID = /^(.+)-([A-Z]+)(\d+)$/

/** Turn a seat id such as VIP-A7 into "Baris A · Kursi 7". */
export function formatSeatLabel(seatLabel: string, t: (key: DictKey) => string) {
  const match = SEAT_ID.exec(seatLabel)
  if (!match) return seatLabel
  return `${t('seat.rowLabel')} ${match[2]} · ${t('seat.numberLabel')} ${match[3]}`
}

export function formatAdminDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}
