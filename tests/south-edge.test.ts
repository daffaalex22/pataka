import { describe, expect, it } from 'vitest'
import { TREES, WORLD } from '@/components/scene/summaba/layout'
import { ACCESS_STAIRS } from '@/lib/sawarga/scene/venue/layout'
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

  it('keeps trees clear of the stage-side switchback stairs', () => {
    for (const [x, z] of TREES) {
      for (const side of ['east', 'west'] as const) {
        const stair = ACCESS_STAIRS[side]
        const points = [stair.bottom, stair.lowerTop, stair.landing, stair.upperStart, stair.upperTop, stair.bridgeEnd]
        const margin = stair.width / 2 + 0.7
        const minX = Math.min(...points.map((point) => point.x)) - margin
        const maxX = Math.max(...points.map((point) => point.x)) + margin
        const minZ = Math.min(...points.map((point) => point.z)) - margin
        const maxZ = Math.max(...points.map((point) => point.z)) + margin
        const inside = x >= minX && x <= maxX && z >= minZ && z <= maxZ
        expect(inside, `tree at ${x}, ${z} on ${side} stair`).toBe(false)
      }
    }
  })
})
