/**
 * Shared top-down geometry for the venue's 2D maps. Both the booking overview
 * and the full seat sheet use the same shell, curved balcony decks and tier
 * contours so the maps keep following the 3D venue.
 */

import { BALCONY, SHELL, shellOffsetPoint } from '@/lib/sawarga/scene/venue/layout'

export type SeatMapProjection = {
  scale: number
  x: (x: number) => number
  y: (z: number) => number
}

export type MapPoint = { x: number; z: number }

/** The shell-side edge of the balcony deck; BALCONY.depth is the courtyard side. */
export const BALCONY_DECK_OUTER_OFFSET = 0.18

/** Uniform projection of the 70 x 50 m shell into an SVG viewBox. */
export function createSeatMapProjection(
  width: number,
  height: number,
  padding: number,
): SeatMapProjection {
  const scale = Math.min(
    (width - padding * 2) / (SHELL.radiusX * 2),
    (height - padding * 2) / (SHELL.radiusZ * 2),
  )
  return {
    scale,
    x: (x: number) => width / 2 + x * scale,
    y: (z: number) => height / 2 + z * scale,
  }
}

/**
 * World-space samples along a shell-parallel arc. `angleRange` is in units of
 * PI to match BALCONY.eastAngleRange / BALCONY.westAngleRange.
 */
export function arcPoints(
  angleRange: readonly [number, number],
  inwardOffset: number,
  steps = 34,
): MapPoint[] {
  const points: MapPoint[] = []
  const count = Math.max(2, steps)
  for (let i = 0; i < count; i += 1) {
    const angle =
      angleRange[0] * Math.PI +
      ((angleRange[1] - angleRange[0]) * Math.PI * i) / (count - 1)
    points.push(shellOffsetPoint(angle, inwardOffset))
  }
  return points
}

function toPath(points: MapPoint[], projection: SeatMapProjection): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${projection.x(point.x).toFixed(1)} ${projection.y(point.z).toFixed(1)}`,
    )
    .join(' ')
}

/** Closed SVG path for the full curved balcony deck between two inward offsets. */
export function balconyBandPath(
  projection: SeatMapProjection,
  angleRange: readonly [number, number],
  outerOffset = BALCONY_DECK_OUTER_OFFSET,
  innerOffset = BALCONY.depth,
  steps = 34,
): string {
  const outer = arcPoints(angleRange, outerOffset, steps)
  const inner = arcPoints(angleRange, innerOffset, steps).reverse()
  return `${toPath([...outer, ...inner], projection)} Z`
}

/** Open SVG path along one step edge of the curved balcony. */
export function balconyArcPath(
  projection: SeatMapProjection,
  angleRange: readonly [number, number],
  inwardOffset: number,
  steps = 34,
): string {
  return toPath(arcPoints(angleRange, inwardOffset, steps), projection)
}
