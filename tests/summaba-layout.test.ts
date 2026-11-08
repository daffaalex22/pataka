import { describe, expect, it } from 'vitest'
import {
  clearCameraPosition,
  floorHeightAt,
  planWalkRoute,
  resolveWalkable,
  targetFloorHeight,
} from '@/components/scene/summaba/layout'

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
  it('blocks the east ring at the atrium face', () => {
    const face = { x: 21.5, y: 0, z: 0 }
    resolveWalkable(face)
    expect(face.x).toBe(21.5)
    const wall = { x: 23, y: 0, z: 0 }
    resolveWalkable(wall)
    expect(wall.x).toBeLessThanOrEqual(22)
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
  it('routes to a west balcony seat via the west stairs from spawn', () => {
    const route = planWalkRoute({ x: 0, y: 0, z: 19 }, { x: -17.5, y: 5.75, z: 0 })
    expect(route).toHaveLength(3)
    expect(route[0].x).toBeLessThan(0)
    expect(route[1].x).toBeLessThan(0)
  })
  it('routes to an east balcony seat via the east stairs from the west side', () => {
    const route = planWalkRoute({ x: -5, y: 0, z: 19 }, { x: 17.5, y: 5.75, z: 0 })
    expect(route[0].x).toBeGreaterThan(0)
  })
  it('crosses balconies by descending and re-ascending', () => {
    const route = planWalkRoute({ x: -17.5, y: 5.75, z: 0 }, { x: 17.5, y: 5.75, z: 0 })
    expect(route).toHaveLength(5)
    expect(route[0].x).toBeLessThan(0)
    expect(route[1].x).toBeLessThan(0)
    expect(route[2].x).toBeGreaterThan(0)
    expect(route[3].x).toBeGreaterThan(0)
  })
  it('goes direct on the same balcony', () => {
    const route = planWalkRoute({ x: -17.5, y: 5.75, z: 0 }, { x: -15.5, y: 5.75, z: 5 })
    expect(route).toEqual([{ x: -15.5, y: 5.75, z: 5 }])
  })
})

describe('targetFloorHeight', () => {
  it('keeps a grounded character grounded under the balcony', () => {
    expect(targetFloorHeight(0, 5.2)).toBe(0)
  })
  it('keeps a grounded character grounded under mid-ramp', () => {
    expect(targetFloorHeight(0, 3.47)).toBe(0)
  })
  it('lets a grounded character take the ramp foot', () => {
    expect(targetFloorHeight(0, 0.87)).toBeCloseTo(0.87, 5)
  })
  it('follows the surface while elevated', () => {
    expect(targetFloorHeight(4.9, 5.2)).toBe(5.2)
  })
  it('descends to ground at the ramp foot', () => {
    expect(targetFloorHeight(5.2, 0)).toBe(0)
  })
})

describe('clearCameraPosition', () => {
  it('leaves a clear position untouched', () => {
    const to = { x: 0, y: 3.6, z: 16.6 }
    expect(clearCameraPosition({ x: 0, y: 1.6, z: 10 }, to)).toEqual(to)
  })
  it('pulls the camera out of the north ring', () => {
    const result = clearCameraPosition({ x: 0, y: 1.6, z: -8 }, { x: 0, y: 3.6, z: -30 })
    expect(result.z).toBeGreaterThanOrEqual(-18)
  })
  it('pulls the camera out of the east ring', () => {
    const result = clearCameraPosition({ x: 17, y: 1.6, z: 0 }, { x: 26, y: 3.6, z: 0 })
    expect(result.x).toBeLessThanOrEqual(22)
  })
  it('keeps the camera above the floor', () => {
    const result = clearCameraPosition({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 0.1, z: 6.6 })
    expect(result.y).toBeGreaterThanOrEqual(0.35)
  })
  it('allows a ground-level camera under the balcony overhang', () => {
    const from = { x: 15, y: 1.6, z: 0 }
    const to = { x: 15, y: 3.6, z: 6.6 }
    expect(clearCameraPosition(from, to)).toEqual(to)
  })
  it('keeps an elevated camera above the balcony deck', () => {
    const result = clearCameraPosition({ x: 17, y: 6.8, z: 0 }, { x: 17, y: 2.0, z: 0 })
    expect(result.y).toBeGreaterThanOrEqual(5.55)
  })
})
