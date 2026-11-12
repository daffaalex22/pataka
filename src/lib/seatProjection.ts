import * as THREE from 'three'
import type { Seat } from './types'

export type ScreenRect = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Pick the seat whose projected center is closest to a screen point.
 *
 * The coarse-pointer hit boxes deliberately overlap neighbouring rows, so a
 * raycast can land on the row behind the seat the user actually tapped. This
 * screen-space picker uses the visible seat center instead, which keeps touch
 * selection aligned with what is under the finger.
 */
export function nearestSeatAtScreenPoint(
  seats: Seat[],
  camera: THREE.Camera,
  rect: ScreenRect,
  clientX: number,
  clientY: number,
  radiusPx: number,
): Seat | null {
  camera.updateMatrixWorld()
  const viewMatrix = camera.matrixWorldInverse
  const point = new THREE.Vector3()
  const cameraSpace = new THREE.Vector3()
  let best: Seat | null = null
  let bestDistanceSq = Infinity
  const radiusSq = radiusPx * radiusPx

  for (const seat of seats) {
    // Pad/back midpoint: the point a finger naturally covers when tapping a
    // seat in the 3D scene.
    point.set(seat.x, seat.y + 0.65, seat.z)
    cameraSpace.copy(point).applyMatrix4(viewMatrix)
    if (cameraSpace.z >= 0) continue

    point.project(camera)
    if (point.z < -1 || point.z > 1) continue

    const screenX = rect.left + (point.x * 0.5 + 0.5) * rect.width
    const screenY = rect.top + (-point.y * 0.5 + 0.5) * rect.height
    const dx = screenX - clientX
    const dy = screenY - clientY
    const distanceSq = dx * dx + dy * dy
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq
      best = seat
    }
  }

  return best && bestDistanceSq <= radiusSq ? best : null
}
