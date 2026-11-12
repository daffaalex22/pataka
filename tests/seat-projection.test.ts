import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Seat } from '../src/lib/types'
import { nearestSeatAtScreenPoint } from '../src/lib/seatProjection'

function seat(id: string, x: number, z: number): Seat {
  return { id, x, y: 0, z } as Seat
}

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
camera.position.set(0, 6, 12)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

const rect = { left: 0, top: 0, width: 400, height: 400 }
const seats = [
  seat('front-left', -1.2, 0),
  seat('front-center', 0, 0),
  seat('front-right', 1.2, 0),
  seat('row-behind-center', 0, 2),
  seat('behind-camera', 0, 20),
]

function screenPoint(target: Seat) {
  const point = new THREE.Vector3(target.x, target.y + 0.65, target.z).project(camera)
  return {
    x: rect.left + (point.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-point.y * 0.5 + 0.5) * rect.height,
  }
}

describe('nearestSeatAtScreenPoint', () => {
  it('picks the seat under the tap, not the overlapping row behind it', () => {
    const target = seats[1]
    const point = screenPoint(target)

    const picked = nearestSeatAtScreenPoint(seats, camera, rect, point.x, point.y, 28)
    expect(picked?.id).toBe('front-center')
  })

  it('picks the nearest projected seat center', () => {
    const point = screenPoint(seats[0])
    const picked = nearestSeatAtScreenPoint(seats, camera, rect, point.x + 4, point.y, 28)
    expect(picked?.id).toBe('front-left')
  })

  it('ignores seats behind the camera', () => {
    const point = screenPoint(seats[4])
    const picked = nearestSeatAtScreenPoint(seats, camera, rect, point.x, point.y, 100)
    expect(picked?.id).not.toBe('behind-camera')
  })

  it('returns null when the tap is outside the radius', () => {
    const picked = nearestSeatAtScreenPoint(seats, camera, rect, 0, 0, 4)
    expect(picked).toBeNull()
  })
})
