import { describe, expect, it } from 'vitest'
import { RAMP_DISTANCE, WALK_SPEED, stepTowards } from '@/components/scene/walkPath'

describe('stepTowards', () => {
  it('steps toward the target at speed * delta', () => {
    const result = stepTowards({ x: 0, y: 0, z: 14 }, { x: 0, y: 0, z: -10 }, 1)
    expect(result.z).toBeCloseTo(8)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
    expect(result.arrived).toBe(false)
    expect(result.heading).toBeCloseTo(Math.PI)
    expect(WALK_SPEED).toBe(6)
  })

  it('reports arrival when already at the target', () => {
    const result = stepTowards({ x: 0, y: 0, z: 14 }, { x: 0, y: 0, z: 14 }, 0.016)
    expect(result).toEqual({ x: 0, y: 0, z: 14, heading: 0, arrived: true })
  })

  it('clamps the final step so it never overshoots', () => {
    const result = stepTowards({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, 10)
    expect(result.z).toBe(0)
    expect(result.arrived).toBe(true)
  })

  it('keeps y flat at exactly the ramp boundary', () => {
    const result = stepTowards({ x: 0, y: 0, z: 8 }, { x: 0, y: 1.2, z: 5 }, 0.016)
    expect(RAMP_DISTANCE).toBe(3)
    expect(result.y).toBe(0)
    expect(result.arrived).toBe(false)
  })

  it('ramps y proportionally inside the ramp zone', () => {
    const result = stepTowards({ x: 0, y: 0, z: 7 }, { x: 0, y: 1.2, z: 5 }, 0.016)
    expect(result.y).toBeCloseTo(1.2 * (1 / 3))
    expect(result.arrived).toBe(false)
  })
})
