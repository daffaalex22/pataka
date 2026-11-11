export const WALK_SPEED = 6
export const RAMP_DISTANCE = 4
const RAMP_COMPLETE_DISTANCE = 1
const ARRIVE_DISTANCE = 0.06

export type WalkPoint = { x: number; y: number; z: number }

/** Where the character stands when it arrives: just behind the seat pad, inside the walkable bounds. */
export function standTarget(seat: WalkPoint): WalkPoint {
  if (seat.y > 1) {
    // Tribune seats follow the curved shell: step outward from the stage so
    // the visitor stands behind the pad rather than in the row in front.
    const dx = seat.x
    const dz = seat.z + 13
    const length = Math.hypot(dx, dz) || 1
    return {
      x: seat.x + (dx / length) * 0.25,
      y: seat.y,
      z: seat.z + (dz / length) * 0.25,
    }
  }
  return {
    x: Math.max(-24, Math.min(24, seat.x)),
    y: seat.y,
    z: Math.min(seat.z + 0.8, 21.5),
  }
}

/**
 * One frame of a scripted walk: horizontal step toward the target (never
 * overshooting), elevation ramps from RAMP_DISTANCE down to
 * RAMP_COMPLETE_DISTANCE (so tribunes are climbed before entering the solid
 * platform boxes), and a heading suitable for the character's rotation.
 */
export function stepTowards(
  current: WalkPoint,
  target: WalkPoint,
  delta: number,
  speed = WALK_SPEED,
): { x: number; y: number; z: number; heading: number; arrived: boolean } {
  const dx = target.x - current.x
  const dz = target.z - current.z
  const distance = Math.hypot(dx, dz)

  if (distance < ARRIVE_DISTANCE) {
    return { x: current.x, y: target.y, z: current.z, heading: 0, arrived: true }
  }

  const step = Math.min(distance, speed * delta)
  const x = current.x + (dx / distance) * step
  const z = current.z + (dz / distance) * step

  const progress =
    distance < RAMP_DISTANCE
      ? Math.min(1, (RAMP_DISTANCE - distance) / (RAMP_DISTANCE - RAMP_COMPLETE_DISTANCE))
      : 0
  const y = current.y + (target.y - current.y) * progress

  const arrived = distance - step < ARRIVE_DISTANCE

  return {
    x,
    y: arrived ? target.y : y,
    z,
    heading: Math.atan2(dx, dz),
    arrived,
  }
}
