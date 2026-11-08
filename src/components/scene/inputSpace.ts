/** Camera-relative movement math (Three.js-free for tests). */

/** Hysteresis half-angle: the camera only realigns behind headings within this angle of the view. */
export const REALIGN_CONE = (100 * Math.PI) / 180

/** Ease rate of the follow camera's yaw toward the character's heading (1/s). */
export const FOLLOW_YAW_EASE = 1.5

export type WorldInput = { x: number; z: number }

/** Wrap an angle into (-pi, pi]. */
function wrapAngle(angle: number): number {
  let next = angle
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

/**
 * Rotate screen-space input (x = right, z = down) into world XZ by the camera
 * yaw. Screen-down moves toward the camera; the spawn camera looks along -Z
 * (yaw pi), where this is the identity, so the first frame matches the old
 * world-fixed controls exactly.
 */
export function screenToWorldInput(x: number, z: number, camYaw: number): WorldInput {
  const sin = Math.sin(camYaw)
  const cos = Math.cos(camYaw)
  // Camera forward f = (sin, cos); camera right r = (-cos, sin); world = x*r - z*f.
  // `|| 0` normalizes negative zero so objects compare equal in tests.
  return { x: -x * cos - z * sin || 0, z: x * sin - z * cos || 0 }
}

/** Manual input is screen space; scripted (AutoWalk) input already is world space. */
export function resolveMoveInput(
  x: number,
  z: number,
  camYaw: number,
  scripted: boolean,
): WorldInput {
  return scripted ? { x, z } : screenToWorldInput(x, z, camYaw)
}

/** True when the movement direction is within the realign cone of the view direction. */
export function isMovingAway(moveX: number, moveZ: number, viewYaw: number): boolean {
  const length = Math.hypot(moveX, moveZ)
  if (length < 1e-6) return false
  const dot = moveX * Math.sin(viewYaw) + moveZ * Math.cos(viewYaw)
  return dot / length >= Math.cos(REALIGN_CONE)
}

/** Ease the follow-camera yaw toward the heading only while moving away from the camera. */
export function nextFollowYaw(
  current: number,
  heading: number,
  movingAway: boolean,
  delta: number,
): number {
  if (!movingAway || delta <= 0) return wrapAngle(current)
  const diff = wrapAngle(heading - current)
  return wrapAngle(current + diff * (1 - Math.exp(-FOLLOW_YAW_EASE * delta)))
}
