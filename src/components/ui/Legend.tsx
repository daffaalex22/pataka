'use client'

import { useT } from '@/lib/i18n'
import type { SeatStatus } from '@/lib/types'

export const STATUS_COLORS: Record<SeatStatus, string> = {
  available: '#34d399',
  held: '#fbbf24',
  sold: '#5b5a6b',
}

const ICONS: Record<SeatStatus, string> = {
  available: '✓',
  held: '◔',
  sold: '✕',
}

export function Legend({ className = '' }: { className?: string }) {
  const t = useT()
  const labels: Record<SeatStatus, string> = {
    available: t('seat.legendAvailable'),
    held: t('seat.legendHeld'),
    sold: t('seat.legendSold'),
  }
  return (
    <div className={`flex items-center gap-4 text-xs text-muted ${className}`}>
      {(Object.keys(STATUS_COLORS) as SeatStatus[]).map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="grid size-4 place-items-center rounded-full text-[9px] font-bold text-black/70"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          >
            {ICONS[status]}
          </span>
          {labels[status]}
        </span>
      ))}
    </div>
  )
}
