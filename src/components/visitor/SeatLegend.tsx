'use client'

import { STATUS_COLORS } from '@/components/ui/Legend'
import { useT } from '@/lib/i18n'

const STATUSES = ['available', 'held', 'sold'] as const
const LABELS = {
  available: 'status.available',
  held: 'status.held',
  sold: 'status.sold',
} as const

export function SeatLegend({ className = '' }: { className?: string }) {
  const t = useT()

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper/55 ${className}`}>
      {STATUSES.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          {t(LABELS[status])}
        </span>
      ))}
    </div>
  )
}
