import { describe, expect, it } from 'vitest'
import { DRAG_THRESHOLD_PX, LOOK_SENSITIVITY, recenterLookYaw, updateLookYaw } from '@/components/scene/lookYaw'

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
    expect(DRAG_THRESHOLD_PX).toBe(8)
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
