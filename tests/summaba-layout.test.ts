import { describe, expect, it } from 'vitest'
import { floorHeightAt, planWalkRoute, resolveWalkable } from '@/components/scene/summaba/layout'

describe('floorHeightAt', () => {
  it('is 0 on the courtyard floor', () => expect(floorHeightAt(0, 0)).toBe(0))
  it('is balcony height on both balconies', () => {
    expect(floorHeightAt(17, 0)).toBe(5.2)
    expect(floorHeightAt(-17, 0)).toBe(5.2)
  })
  it('ramps halfway up the stairs at the midpoint', () => {
    expect(floorHeightAt(19.5, 17)).toBeCloseTo(2.6, 1)
    expect(floorHeightAt(-19.5, 17)).toBeCloseTo(2.6, 1)
  })
  it('reaches balcony height at the top of the ramp', () => {
    expect(floorHeightAt(19.5, 14)).toBeCloseTo(5.2, 1)
  })
})

describe('resolveWalkable', () => {
  it('blocks the north ring wall', () => {
    const pos = { x: 20, y: 0, z: -19 }
    resolveWalkable(pos)
    expect(pos.z).toBeGreaterThanOrEqual(-18)
  })
  it('blocks the east ring but allows the atrium porch', () => {
    const porch = { x: 23, y: 0, z: 0 }
    resolveWalkable(porch)
    expect(porch.x).toBe(23)
    const wall = { x: 30, y: 0, z: 0 }
    resolveWalkable(wall)
    expect(wall.x).toBeLessThanOrEqual(25)
  })
  it('keeps the character out of the koi pond', () => {
    const pos = { x: -12, y: 0, z: 31 }
    resolveWalkable(pos)
    expect(Math.hypot(pos.x + 12, (pos.z - 31) / 0.57)).toBeGreaterThanOrEqual(7)
  })
  it('railing stops an upper-level walk off the balcony', () => {
    const pos = { x: 12, y: 5.2, z: 0 }
    resolveWalkable(pos)
    expect(pos.x).toBeGreaterThanOrEqual(14)
  })
  it('keeps the character off the stage platform', () => {
    const pos = { x: 0, y: 0, z: -12 }
    resolveWalkable(pos)
    expect(pos.z).toBeGreaterThanOrEqual(-8.5)
  })
})

describe('planWalkRoute', () => {
  it('goes direct between ground points', () => {
    expect(planWalkRoute({ x: 0, y: 0, z: 19 }, { x: 5, y: 0, z: -5 })).toEqual([{ x: 5, y: 0, z: -5 }])
  })
  it('routes a balcony target through the east stairs', () => {
    const route = planWalkRoute({ x: 5, y: 0, z: 19 }, { x: 17.5, y: 5.75, z: 0 })
    expect(route).toHaveLength(3)
    expect(route[0].y).toBe(0)
    expect(route[0].x).toBeGreaterThan(0)
    expect(route[1].y).toBeCloseTo(5.2, 1)
    expect(route[2]).toEqual({ x: 17.5, y: 5.75, z: 0 })
  })
  it('descends via stairs when leaving the balcony', () => {
    const route = planWalkRoute({ x: -17.5, y: 5.75, z: 0 }, { x: 0, y: 0, z: 19 })
    expect(route).toHaveLength(3)
    expect(route[0].x).toBeLessThan(0)
    expect(route[2].y).toBe(0)
  })
})
