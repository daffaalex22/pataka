import { describe, expect, it } from 'vitest'
import {
  DRAG_THRESHOLD_PX,
  LOOK_PITCH_SENSITIVITY,
  LOOK_SENSITIVITY,
  PITCH_MAX,
  PITCH_MIN,
  dragEnd,
  dragMove,
  dragStart,
  hasMoved,
  recenterLookYaw,
  updateLookYaw,
  updatePitch,
} from '@/components/scene/lookYaw'

describe('updateLookYaw', () => {
  it('turns the view right when the pointer drags right', () => {
    expect(updateLookYaw(0, 200)).toBeCloseTo(-0.7, 5)
    expect(updateLookYaw(0, -200)).toBeCloseTo(0.7, 5)
  })

  it('wraps into (-pi, pi]', () => {
    const wrapped = updateLookYaw(-3.13, 200)
    expect(wrapped).toBeGreaterThan(-Math.PI)
    expect(wrapped).toBeLessThanOrEqual(Math.PI)
    expect(wrapped).toBeCloseTo(2.4532, 3)
  })

  it('pins the tunable constants', () => {
    expect(LOOK_SENSITIVITY).toBe(0.0035)
    expect(LOOK_PITCH_SENSITIVITY).toBe(0.0025)
    expect(DRAG_THRESHOLD_PX).toBe(12)
    expect(PITCH_MIN).toBe(-0.35)
    expect(PITCH_MAX).toBe(0.45)
  })
})

describe('updatePitch', () => {
  it('tilts down on drag down and up on drag up', () => {
    expect(updatePitch(0, 100)).toBeCloseTo(0.25, 5)
    expect(updatePitch(0, -100)).toBeCloseTo(-0.25, 5)
  })

  it('clamps to the pitch range', () => {
    expect(updatePitch(0.4, 100)).toBe(0.45)
    expect(updatePitch(-0.3, -100)).toBe(-0.35)
  })
})

describe('recenterLookYaw', () => {
  it('eases toward zero while moving', () => {
    expect(recenterLookYaw(1.2, 0.016, true)).toBeCloseTo(1.2 * Math.exp(-0.032), 6)
  })

  it('holds the look direction while idle', () => {
    expect(recenterLookYaw(1.2, 0.016, false)).toBe(1.2)
  })
})

describe('hasMoved', () => {
  it('detects walking at 144Hz', () => {
    expect(hasMoved(0, 0, 0.0486, 0, 1 / 144)).toBe(true)
  })

  it('ignores idle drift', () => {
    expect(hasMoved(0, 0, 0.0005, 0, 1 / 144)).toBe(false)
  })

  it('treats the first frame as not moving', () => {
    expect(hasMoved(Number.NaN, 0, 0, 0, 1 / 60)).toBe(false)
  })
})

describe('drag tracker', () => {
  it('ignores moves from other pointers on both axes', () => {
    const tracker = dragStart(5, 100, 200)
    const result = dragMove(tracker, 7, 300, 400)
    expect(result.yawDeltaPx).toBe(0)
    expect(result.pitchDeltaPx).toBe(0)
    expect(result.tracker).toBe(tracker)
  })

  it('accumulates both axes from the tracked pointer and arms suppression', () => {
    let tracker = dragStart(5, 100, 200)
    let yaw = 0
    let pitch = 0
    for (let step = 1; step <= 3; step++) {
      const result = dragMove(tracker, 5, 100 + step * 5, 200 - step * 4)
      tracker = result.tracker
      yaw += result.yawDeltaPx
      pitch += result.pitchDeltaPx
    }
    expect(yaw).toBe(10)
    expect(pitch).toBe(-8)
    expect(tracker.dragging).toBe(true)
  })

  it('a tap does not suppress clicks', () => {
    const result = dragEnd(dragStart(5, 100, 200), 5)
    expect(result.suppressClick).toBe(false)
    expect(result.tracker.pointerId).toBeNull()
  })

  it('other pointers cannot end the active drag', () => {
    const result = dragEnd(dragStart(5, 100, 200), 7)
    expect(result.tracker.pointerId).toBe(5)
  })
})
