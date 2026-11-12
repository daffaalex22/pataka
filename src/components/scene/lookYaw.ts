/** Horizontal drag-to-look tuning and pure yaw math (Three.js-free for tests). */

export const LOOK_SENSITIVITY = 0.0035
export const LOOK_PITCH_SENSITIVITY = 0.0025
export const DRAG_THRESHOLD_PX = 12
/** Fingers wobble during a tap; touch drags start later than mouse drags. */
export const TOUCH_DRAG_THRESHOLD_PX = 16
/** A drag only disarms seat clicks past this travel, so small taps still select. */
export const CLICK_SUPPRESSION_PX = 24
export const PITCH_MIN = -0.35
export const PITCH_MAX = 0.45

/** Dragging right pans the view right; result wrapped to (-pi, pi]. */
export function updateLookYaw(yaw: number, dxPixels: number): number {
  let next = yaw - dxPixels * LOOK_SENSITIVITY
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

/** Dragging down tilts the view down (positive pitch); clamped. */
export function updatePitch(pitch: number, dyPixels: number): number {
  const next = pitch + dyPixels * LOOK_PITCH_SENSITIVITY
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, next))
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
  pointerType: string
  lastX: number
  lastY: number
  travelled: number
  dragging: boolean
}

export function dragStart(
  pointerId: number,
  clientX: number,
  clientY: number,
  pointerType = 'mouse',
): DragTracker {
  return { pointerId, pointerType, lastX: clientX, lastY: clientY, travelled: 0, dragging: false }
}

export function dragMove(
  tracker: DragTracker,
  pointerId: number,
  clientX: number,
  clientY: number,
): { tracker: DragTracker; yawDeltaPx: number; pitchDeltaPx: number } {
  if (pointerId !== tracker.pointerId) return { tracker, yawDeltaPx: 0, pitchDeltaPx: 0 }
  const dx = clientX - tracker.lastX
  const dy = clientY - tracker.lastY
  const travelled = tracker.travelled + Math.hypot(dx, dy)
  const threshold = tracker.pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD_PX : DRAG_THRESHOLD_PX
  const dragging = tracker.dragging || travelled > threshold
  return {
    tracker: { ...tracker, pointerId, lastX: clientX, lastY: clientY, travelled, dragging },
    yawDeltaPx: dragging ? dx : 0,
    pitchDeltaPx: dragging ? dy : 0,
  }
}

export function dragEnd(tracker: DragTracker, pointerId: number): { tracker: DragTracker; suppressClick: boolean } {
  if (pointerId !== tracker.pointerId) return { tracker, suppressClick: false }
  return {
    tracker: { pointerId: null, pointerType: '', lastX: 0, lastY: 0, travelled: 0, dragging: false },
    suppressClick: tracker.travelled > CLICK_SUPPRESSION_PX,
  }
}
