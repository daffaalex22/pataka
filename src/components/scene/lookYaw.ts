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

/** Speed-based movement check, frame-rate independent (>= 0.5 units/s). */
export function hasMoved(prevX: number, prevZ: number, x: number, z: number, delta: number): boolean {
  if (Number.isNaN(prevX)) return false
  return Math.hypot(x - prevX, z - prevZ) > 0.5 * delta
}

/**
 * Pointer-id-aware drag tracking: a second touch (e.g. the joystick thumb)
 * must not corrupt the look drag or end it. Pure so the two-pointer behavior
 * is unit-testable.
 */
export type DragTracker = {
  pointerId: number | null
  lastX: number
  travelled: number
  dragging: boolean
}

export function dragStart(pointerId: number, clientX: number): DragTracker {
  return { pointerId, lastX: clientX, travelled: 0, dragging: false }
}

export function dragMove(
  tracker: DragTracker,
  pointerId: number,
  clientX: number,
): { tracker: DragTracker; yawDeltaPx: number } {
  if (pointerId !== tracker.pointerId) return { tracker, yawDeltaPx: 0 }
  const deltaPx = clientX - tracker.lastX
  const travelled = tracker.travelled + Math.abs(deltaPx)
  const dragging = tracker.dragging || travelled > DRAG_THRESHOLD_PX
  return {
    tracker: { pointerId, lastX: clientX, travelled, dragging },
    yawDeltaPx: dragging ? deltaPx : 0,
  }
}

export function dragEnd(tracker: DragTracker, pointerId: number): { tracker: DragTracker; suppressClick: boolean } {
  if (pointerId !== tracker.pointerId) return { tracker, suppressClick: false }
  return {
    tracker: { pointerId: null, lastX: 0, travelled: 0, dragging: false },
    suppressClick: tracker.dragging,
  }
}
