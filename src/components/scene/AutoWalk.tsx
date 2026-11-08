'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type * as THREE from 'three'
import type { KeysState, MoveVector } from '@/components/scene/Character'
import { standTarget, stepTowards } from '@/components/scene/walkPath'
import type { Seat } from '@/lib/types'

const CHARACTER_SPEED = 7

/**
 * Scripted walk toward a chosen seat. Steers the existing Character through
 * `moveRef` so the walk animation keeps playing; elevation comes from
 * stepTowards (full height one unit before the target) so tribunes are
 * climbed before entering the solid platform boxes. Any keyboard or joystick
 * input cancels back to manual control.
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

  useEffect(
    () => () => {
      moveRef.current = { x: 0, y: 0 }
    },
    [moveRef],
  )

  useFrame((_, delta) => {
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

    const target = standTarget(seat)
    const dx = target.x - character.position.x
    const dz = target.z - character.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < 0.3) {
      done.current = true
      moveRef.current = { x: 0, y: 0 }
      last.current = { x: 0, y: 0 }
      character.position.set(target.x, target.y, target.z)
      character.rotation.y = Math.PI
      onArrived(seat)
      return
    }

    const next = stepTowards(
      { x: character.position.x, y: character.position.y, z: character.position.z },
      target,
      delta,
      CHARACTER_SPEED,
    )
    const stepX = next.x - character.position.x
    const stepZ = next.z - character.position.z
    const stepLength = Math.hypot(stepX, stepZ)
    if (stepLength > 0.0001) {
      const direction = { x: stepX / stepLength, y: -stepZ / stepLength }
      moveRef.current = direction
      last.current = direction
    }
    character.position.y = next.y
  })

  return null
}
