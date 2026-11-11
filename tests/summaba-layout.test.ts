import { describe, expect, it } from 'vitest'
import { BALCONY, shellInwardNormal, shellOffsetPoint, shellPoint } from '@/lib/sawarga/scene/venue/layout'
import {
  clearCameraPosition,
  floorHeightAt,
  planWalkRoute,
  resolveWalkable,
  targetFloorHeight,
} from '@/components/scene/summaba/layout'

describe('floorHeightAt', () => {
  it('is 0 on the courtyard floor', () => expect(floorHeightAt(0, 0)).toBe(0))
  it('is balcony height on both curved terraces', () => {
    expect(floorHeightAt(30, 0)).toBe(5.2)
    expect(floorHeightAt(-30, 0)).toBe(5.2)
  })
  it('steps up to the outer row', () => {
    expect(floorHeightAt(34, 0)).toBe(6.3)
  })
  it('ramps halfway up the lower flight', () => {
    expect(floorHeightAt(20, -12.75)).toBeCloseTo(1.3, 1)
    expect(floorHeightAt(-20, -12.75)).toBeCloseTo(1.3, 1)
  })
  it('reaches the switchback landing', () => {
    expect(floorHeightAt(20, -16.2)).toBeCloseTo(2.6, 1)
    expect(floorHeightAt(-20, -16.2)).toBeCloseTo(2.6, 1)
  })
  it('ramps up the upper flight to the bridge', () => {
    expect(floorHeightAt(22.15, -13)).toBeCloseTo(3.9, 1)
    expect(floorHeightAt(23.5, -11)).toBeCloseTo(5.2, 1)
  })
  it('keeps the landing bridge walkable', () => {
    expect(floorHeightAt(24.9, -9.9)).toBeCloseTo(5.2, 1)
  })
})

describe('resolveWalkable', () => {
  it('clamps to the elliptical shell', () => {
    const pos = { x: 20, y: 0, z: -30 }
    resolveWalkable(pos)
    expect(Math.hypot(pos.x / 34.5, pos.z / 24.5)).toBeLessThanOrEqual(1.001)
  })
  it('keeps the character inside the east shell edge', () => {
    const pos = { x: 40, y: 0, z: 0 }
    resolveWalkable(pos)
    expect(pos.x).toBeLessThanOrEqual(34.5)
  })
  it('keeps the character out of the atria drums', () => {
    const atrium = BALCONY.atria.cibadak
    const angle = atrium.angle * Math.PI
    const point = shellPoint(angle)
    const inward = shellInwardNormal(angle)
    const center = {
      x: point.x - inward.x * atrium.offset,
      z: point.z - inward.z * atrium.offset,
    }
    const shell = shellOffsetPoint(angle, 1)
    const pos = { x: shell.x, y: 0, z: shell.z }
    resolveWalkable(pos)
    expect(Math.hypot(pos.x - center.x, pos.z - center.z)).toBeGreaterThan(atrium.radius)
  })
  it('railing stops an upper-level walk off the curved balcony', () => {
    const pos = { x: 12, y: 5.2, z: 0 }
    resolveWalkable(pos)
    expect(pos.x).toBeGreaterThanOrEqual(28.5)
  })
  it('keeps the character off the stage platform', () => {
    const pos = { x: 0, y: 0, z: -12 }
    resolveWalkable(pos)
    expect(pos.z).toBeGreaterThanOrEqual(-8.5)
  })
  it('keeps the character out of the board and booth', () => {
    const board = { x: -9, y: 0, z: 22 }
    resolveWalkable(board)
    expect(board.x !== -9 || board.z !== 22).toBe(true)
    const booth = { x: 9, y: 0, z: 22 }
    resolveWalkable(booth)
    expect(booth.x !== 9 || booth.z !== 22).toBe(true)
  })
})

describe('planWalkRoute', () => {
  it('goes direct between ground points', () => {
    expect(planWalkRoute({ x: 0, y: 0, z: 19 }, { x: 5, y: 0, z: -5 })).toEqual([{ x: 5, y: 0, z: -5 }])
  })
  it('routes a balcony target through the stage-side switchback', () => {
    const route = planWalkRoute({ x: 5, y: 0, z: 19 }, { x: 30, y: 5.2, z: 0 })
    expect(route[0].y).toBe(0)
    expect(route[0].x).toBeGreaterThan(0)
    expect(route[0].z).toBeLessThan(-9)
    expect(route[1].y).toBeCloseTo(2.6, 1)
    expect(route[2].y).toBeCloseTo(2.6, 1)
    expect(route.some((point) => point.y === 5.2)).toBe(true)
    expect(route.at(-1)).toEqual({ x: 30, y: 5.2, z: 0 })
    expect(route.length).toBeGreaterThan(6)
  })
  it('descends via the switchback when leaving the balcony', () => {
    const route = planWalkRoute({ x: 30, y: 5.2, z: 0 }, { x: 0, y: 0, z: 19 })
    expect(route.at(-1)?.y).toBe(0)
    expect(route.some((point) => point.y > 4)).toBe(true)
    expect(route.some((point) => point.x > 19 && point.y < 0.1)).toBe(true)
  })
  it('routes to the west balcony via the west switchback from spawn', () => {
    const route = planWalkRoute({ x: 0, y: 0, z: 19 }, { x: -30, y: 5.2, z: 0 })
    expect(route[0].x).toBeLessThan(-19)
    expect(route[0].z).toBeLessThan(-9)
    expect(route.at(-1)?.x).toBe(-30)
  })
  it('crosses balconies by descending and re-ascending', () => {
    const route = planWalkRoute({ x: -30, y: 5.2, z: 0 }, { x: 30, y: 5.2, z: 0 })
    const westBottom = route.findIndex((point) => point.x < -19.9 && point.y < 0.1)
    const eastBottom = route.findIndex((point) => point.x > 19.9 && point.y < 0.1)
    expect(westBottom).toBeGreaterThanOrEqual(0)
    expect(eastBottom).toBeGreaterThan(westBottom)
    expect(route.at(-1)?.x).toBe(30)
  })
  it('follows the curved terrace on the same balcony', () => {
    const route = planWalkRoute({ x: 30, y: 5.2, z: -8 }, { x: 30, y: 5.2, z: 8 })
    expect(route.length).toBeGreaterThan(2)
    expect(route.at(-1)).toEqual({ x: 30, y: 5.2, z: 8 })
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
  it('pulls the camera back inside the north shell', () => {
    const result = clearCameraPosition({ x: 0, y: 1.6, z: -8 }, { x: 0, y: 3.6, z: -30 })
    expect(result.z).toBeGreaterThan(-25)
  })
  it('pulls the camera back inside the east shell', () => {
    const result = clearCameraPosition({ x: 17, y: 1.6, z: 0 }, { x: 40, y: 3.6, z: 0 })
    expect(result.x).toBeLessThanOrEqual(35.5)
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
    const result = clearCameraPosition({ x: 30, y: 6.8, z: 0 }, { x: 30, y: 2.0, z: 0 })
    expect(result.y).toBeGreaterThanOrEqual(5.55)
  })
})
