/** Horizontal drag-to-look tuning and pure yaw math (Three.js-free for tests). */

export const LOOK_SENSITIVITY = 0.0035
export const DRAG_THRESHOLD_PX = 8

/** Dragging right pans the view right; result wrapped to (-pi, pi]. */
export function updateLookYaw(yaw: number, dxPixels: number): number {
  let next = yaw - dxPixels * LOOK_SENSITIVITY
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

/** While the character walks, ease the look angle back behind them; idle holds it. */
export function recenterLookYaw(yaw: number, delta: number, moving: boolean): number {
  return moving ? yaw * Math.exp(-2 * delta) : yaw
}
