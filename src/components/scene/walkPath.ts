export const WALK_SPEED = 6
export const RAMP_DISTANCE = 3
const ARRIVE_DISTANCE = 0.06

export type WalkPoint = { x: number; y: number; z: number }

/**
 * One frame of a scripted walk: horizontal step toward the target (never
 * overshooting), elevation only ramps inside RAMP_DISTANCE of the target,
 * and a heading suitable for the character's shortest-angle rotation.
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

  const y =
    distance < RAMP_DISTANCE
      ? current.y + (target.y - current.y) * (1 - distance / RAMP_DISTANCE)
      : current.y

  const arrived = distance - step < ARRIVE_DISTANCE

  return {
    x,
    y: arrived ? target.y : y,
    z,
    heading: Math.atan2(dx, dz),
    arrived,
  }
}
