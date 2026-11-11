import { describe, expect, it } from 'vitest'
import { floorHeightAt, planWalkRoute, resolveWalkable, type Vec3 } from '@/components/scene/summaba/layout'
import { standTarget, stepTowards } from '@/components/scene/walkPath'
import { buildSummabaSeats } from '@/lib/seatLayout'

/** Simulates the scripted walk against the pure walkability contract. */
function simulate(start: Vec3, seat: { x: number; y: number; z: number }) {
  const target = standTarget(seat)
  const route = planWalkRoute(start, target)
  const position: Vec3 = { ...start }
  let waypoint = 0
  let frames = 0
  const trail: Vec3[] = []

  while (waypoint < route.length && frames < 60 * 90) {
    const next = route[waypoint]
    const distance = Math.hypot(next.x - position.x, next.z - position.z)
    if (distance < 0.3) {
      waypoint += 1
      continue
    }
    const step = stepTowards({ x: position.x, y: position.y, z: position.z }, next, 1 / 60, 7)
    position.x = step.x
    position.y = step.y
    position.z = step.z
    resolveWalkable(position)
    const surface = floorHeightAt(position.x, position.z)
    position.y += (surface - position.y) * (1 - Math.exp(-10 / 60))
    if (frames % 30 === 0) trail.push({ ...position })
    frames += 1
  }

  return { position, route, waypoint, frames, trail }
}

describe('scripted walk to the curved tribune', () => {
  const seats = buildSummabaSeats()
  for (const id of ['TRIBR-A10', 'TRIBR-B10', 'TRIBR-C10', 'TRIBL-B10']) {
    it(`reaches ${id}`, () => {
      const seat = seats.find((entry) => entry.id === id)
      expect(seat).toBeTruthy()
      if (!seat) return
      const result = simulate({ x: 0, y: 0, z: 19 }, seat)
      const target = standTarget(seat)
      expect(result.waypoint).toBe(result.route.length)
      expect(Math.hypot(result.position.x - target.x, result.position.z - target.z)).toBeLessThan(0.35)
      expect(result.position.y).toBeCloseTo(seat.y, 0)
    })
  }
})
