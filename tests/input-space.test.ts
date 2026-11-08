import { describe, expect, it } from 'vitest'
import {
  FOLLOW_YAW_EASE,
  REALIGN_CONE,
  isMovingAway,
  nextFollowYaw,
  resolveMoveInput,
  screenToWorldInput,
} from '@/components/scene/inputSpace'

describe('screenToWorldInput', () => {
  // toBeCloseTo, not toEqual: Math.sin(Math.PI) is ~1.22e-16, never exactly 0.
  it('is the identity for the spawn camera (yaw pi): down is +Z, right is +X', () => {
    const down = screenToWorldInput(0, 1, Math.PI)
    expect(down.x).toBeCloseTo(0, 5)
    expect(down.z).toBeCloseTo(1, 5)
    const right = screenToWorldInput(1, 0, Math.PI)
    expect(right.x).toBeCloseTo(1, 5)
    expect(right.z).toBeCloseTo(0, 5)
  })

  it('flips with the camera: looking +Z, down is -Z and left is +X', () => {
    const down = screenToWorldInput(0, 1, 0)
    expect(down.x).toBeCloseTo(0, 5)
    expect(down.z).toBeCloseTo(-1, 5)
    const left = screenToWorldInput(-1, 0, 0)
    expect(left.x).toBeCloseTo(1, 5)
    expect(left.z).toBeCloseTo(0, 5)
  })

  it('preserves magnitude (rotation only, no scaling)', () => {
    const world = screenToWorldInput(0.6, 0.8, 1.1)
    expect(Math.hypot(world.x, world.z)).toBeCloseTo(1, 5)
  })
})

describe('resolveMoveInput', () => {
  it('passes scripted input through untouched (AutoWalk writes world space)', () => {
    expect(resolveMoveInput(0, 1, 0, true)).toEqual({ x: 0, z: 1 })
  })

  it('rotates manual input by the camera yaw', () => {
    expect(resolveMoveInput(0, 1, 0, false)).toEqual({ x: 0, z: -1 })
  })
})

describe('isMovingAway', () => {
  it('is true along the view direction and false toward the camera', () => {
    expect(isMovingAway(0, -1, Math.PI)).toBe(true)
    expect(isMovingAway(0, 1, Math.PI)).toBe(false)
  })

  it('realigns on a perpendicular strafe (90 deg is inside the 100 deg cone)', () => {
    expect(isMovingAway(1, 0, Math.PI)).toBe(true)
  })

  it('holds when moving 126 deg off the view (outside the cone)', () => {
    expect(isMovingAway(Math.sin(2.2), Math.cos(2.2), 0)).toBe(false)
  })

  it('treats a zero vector as not moving away', () => {
    expect(isMovingAway(0, 0, 1)).toBe(false)
  })
})

describe('nextFollowYaw', () => {
  it('holds the current yaw when not moving away', () => {
    expect(nextFollowYaw(1.2, 0.1, false, 0.016)).toBe(1.2)
  })

  it('eases toward the heading when moving away', () => {
    expect(nextFollowYaw(0, Math.PI / 2, true, 0.016)).toBeCloseTo(
      (Math.PI / 2) * (1 - Math.exp(-1.5 * 0.016)),
      6,
    )
  })

  it('eases the short way across the +/-pi wrap', () => {
    expect(nextFollowYaw(3.1, -3.1, true, 0.016)).toBeCloseTo(
      3.1 + (Math.PI * 2 - 6.2) * (1 - Math.exp(-1.5 * 0.016)),
      6,
    )
  })

  it('pins the tunables', () => {
    expect(REALIGN_CONE).toBeCloseTo((100 * Math.PI) / 180, 10)
    expect(FOLLOW_YAW_EASE).toBe(1.5)
  })
})
