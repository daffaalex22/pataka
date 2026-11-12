import { describe, expect, it } from 'vitest'
import { BALCONY, SHELL } from '@/lib/sawarga/scene/venue/layout'
import {
  BALCONY_DECK_OUTER_OFFSET,
  type MapPoint,
  arcPoints,
  balconyArcPath,
  balconyBandPath,
  createSeatMapProjection,
} from '@/lib/seatMapGeometry'

const normalized = (point: MapPoint) =>
  (point.x / SHELL.radiusX) ** 2 + (point.z / SHELL.radiusZ) ** 2

describe('createSeatMapProjection', () => {
  it('centres the venue in the viewBox', () => {
    const projection = createSeatMapProjection(640, 400, 28)
    expect(projection.x(0)).toBe(320)
    expect(projection.y(0)).toBe(200)
  })

  it('uses one scale for both axes and fits the shell', () => {
    const projection = createSeatMapProjection(640, 400, 28)
    expect(projection.x(1) - projection.x(0)).toBeCloseTo(
      projection.y(1) - projection.y(0),
      10,
    )
    expect(SHELL.radiusX * projection.scale).toBeLessThanOrEqual(292)
    expect(SHELL.radiusZ * projection.scale).toBeLessThanOrEqual(172)
  })
})

describe('arcPoints', () => {
  it('puts the east balcony on the right and the west on the left', () => {
    expect(arcPoints(BALCONY.eastAngleRange, 3).every((point) => point.x > 0)).toBe(true)
    expect(arcPoints(BALCONY.westAngleRange, 3).every((point) => point.x < 0)).toBe(true)
  })

  it('moves the arc inward as the offset grows', () => {
    const outer = arcPoints(BALCONY.eastAngleRange, BALCONY_DECK_OUTER_OFFSET)
    const inner = arcPoints(BALCONY.eastAngleRange, BALCONY.depth)
    for (let index = 0; index < outer.length; index += 1) {
      expect(normalized(inner[index])).toBeLessThan(normalized(outer[index]))
    }
  })
})

describe('balcony paths', () => {
  it('closes the deck path with both edges', () => {
    const projection = createSeatMapProjection(640, 400, 28)
    const path = balconyBandPath(projection, BALCONY.eastAngleRange)
    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith(' Z')).toBe(true)
    expect(path.match(/L/g)?.length).toBe(67)
  })

  it('leaves the tier contour open', () => {
    const projection = createSeatMapProjection(640, 400, 28)
    const path = balconyArcPath(projection, BALCONY.westAngleRange, 3)
    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith('Z')).toBe(false)
    expect(path.match(/L/g)?.length).toBe(33)
  })
})
