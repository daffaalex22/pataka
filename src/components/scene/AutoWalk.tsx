'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import type { KeysState, MoveVector } from '@/components/scene/Character'
import { RAMP_DISTANCE } from '@/components/scene/walkPath'
import type { Seat } from '@/lib/types'

/**
 * Scripted walk toward a chosen seat. Steers the existing Character through
 * `moveRef` so the walk animation keeps playing; elevation is written after
 * Character's own frame (mount order) so tribune seats ramp correctly.
 * Any keyboard or joystick input cancels back to manual control.
 */
export function AutoWalk({
  characterRef,
  moveRef,
  keysRef,
  seat,
  onArrived,
  onCancel,
}: {
  characterRef: React.RefObject<THREE.Group | null>
  moveRef: React.RefObject<MoveVector>
  keysRef: React.RefObject<KeysState>
  seat: Seat
  onArrived: (seat: Seat) => void
  onCancel: () => void
}) {
  const done = useRef(false)
  const last = useRef<MoveVector>({ x: 0, y: 0 })

  useFrame(() => {
    const character = characterRef.current
    if (!character || done.current) return

    const keys = keysRef.current ?? {}
    if (Object.values(keys).some(Boolean)) {
      done.current = true
      moveRef.current = { x: 0, y: 0 }
      last.current = { x: 0, y: 0 }
      onCancel()
      return
    }

    const input = moveRef.current ?? { x: 0, y: 0 }
    if (Math.abs(input.x - last.current.x) > 0.08 || Math.abs(input.y - last.current.y) > 0.08) {
      done.current = true
      onCancel()
      return
    }

    const targetX = seat.x
    const targetZ = seat.z + 0.8
    const dx = targetX - character.position.x
    const dz = targetZ - character.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < 0.3) {
      done.current = true
      moveRef.current = { x: 0, y: 0 }
      last.current = { x: 0, y: 0 }
      character.position.set(targetX, seat.y, targetZ)
      character.rotation.y = Math.PI
      onArrived(seat)
      return
    }

    const direction = { x: dx / distance, y: -dz / distance }
    moveRef.current = direction
    last.current = direction

    character.position.y = distance < RAMP_DISTANCE ? seat.y * (1 - distance / RAMP_DISTANCE) : 0
  })

  return null
}
