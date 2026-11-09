import type { Seat } from './types'

export type SeatDirection = 'up' | 'down' | 'left' | 'right'

const EPSILON = 1e-6

/**
 * Find the nearest seat in a visual direction on the 2D map plane.
 * The map plots `x` horizontally and `z` vertically; `y` is balcony height.
 */
export function findNextSeat(
  seats: Seat[],
  currentId: string | null,
  direction: SeatDirection,
): Seat | null {
  if (seats.length === 0) return null

  const current = currentId === null ? null : (seats.find((seat) => seat.id === currentId) ?? null)
  if (!current) return seats[0] ?? null

  const horizontal = direction === 'left' || direction === 'right'
  let best: Seat | null = null
  let bestScore = Infinity

  for (const seat of seats) {
    if (seat.id === current.id) continue

    const dx = seat.x - current.x
    const dz = seat.z - current.z
    const inDirection =
      direction === 'left'
        ? dx < -EPSILON
        : direction === 'right'
          ? dx > EPSILON
          : direction === 'up'
            ? dz < -EPSILON
            : dz > EPSILON
    if (!inDirection) continue

    const primary = horizontal ? Math.abs(dx) : Math.abs(dz)
    const secondary = horizontal ? Math.abs(dz) : Math.abs(dx)
    // Prefer the closest seat on the movement axis, penalising drift off that axis.
    const score = primary + secondary * 2
    if (score < bestScore) {
      bestScore = score
      best = seat
    }
  }

  return best
}
