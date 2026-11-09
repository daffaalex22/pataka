import { describe, expect, it } from 'vitest'
import { TREES, WORLD } from '@/components/scene/summaba/layout'
import { buildSummabaSeats } from '@/lib/seatLayout'

type Placement = {
  x: number
  z: number
  rotationY: number
  halfWidth: number
  halfDepth: number
}

const seats = buildSummabaSeats()
// Last seat pad (z 17.7) + back offset (+0.42) + half pad depth (+0.2).
const seatFieldMaxZ = Math.max(...seats.map((seat) => seat.z)) + 0.42 + 0.2

function footprintMinZ({ z, rotationY, halfWidth, halfDepth }: Placement) {
  return z - Math.abs(halfWidth * Math.sin(rotationY)) - Math.abs(halfDepth * Math.cos(rotationY))
}

describe('south edge', () => {
  it('extends the courtyard past the booth and board', () => {
    for (const placement of [WORLD.southEdge.board, WORLD.southEdge.booth]) {
      expect(placement.z).toBeLessThanOrEqual(WORLD.courtyard.maxZ - 1)
      expect(placement.x).toBeGreaterThanOrEqual(WORLD.courtyard.minX + placement.halfWidth)
      expect(placement.x).toBeLessThanOrEqual(WORLD.courtyard.maxX - placement.halfWidth)
    }
  })

  it('keeps booth and board footprints clear of the seat field', () => {
    for (const placement of [WORLD.southEdge.board, WORLD.southEdge.booth]) {
      expect(footprintMinZ(placement) - seatFieldMaxZ).toBeGreaterThanOrEqual(1.5)
    }
  })

  it('keeps trees out of the plaza-to-booth sightline', () => {
    for (const [x, z] of TREES) {
      const inCorridor = Math.abs(x) <= 13 && z >= 17.5 && z <= 21.5
      expect(inCorridor, `tree at ${x}, ${z}`).toBe(false)
    }
  })

  it('keeps trees off the stair ramps', () => {
    for (const [x, z] of TREES) {
      const onEast = x >= 18 && x <= 21 && z >= 14 && z <= 20
      const onWest = x >= -21 && x <= -18 && z >= 14 && z <= 20
      expect(onEast || onWest, `tree at ${x}, ${z}`).toBe(false)
    }
  })
})
