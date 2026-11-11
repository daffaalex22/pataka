import type { SeatStatus } from '@/lib/types'

export const STATUS_COLORS: Record<SeatStatus, string> = {
  available: '#34d399',
  held: '#fbbf24',
  sold: '#5b5a6b',
}
