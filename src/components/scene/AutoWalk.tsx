'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type * as THREE from 'three'
import type { KeysState, MoveVector } from '@/components/scene/Character'
import { standTarget, stepTowards } from '@/components/scene/walkPath'
import { planWalkRoute, type Vec3 } from '@/components/scene/summaba/layout'
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
  const route = useRef<Vec3[] | null>(null)
  const waypoint = useRef(0)

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

    const stand = standTarget(seat)
    if (!route.current) {
      route.current = planWalkRoute(
        { x: character.position.x, y: character.position.y, z: character.position.z },
        stand,
      )
      waypoint.current = 0
    }

    let target: Vec3 = route.current[waypoint.current]
    let distance = Math.hypot(target.x - character.position.x, target.z - character.position.z)

    if (distance < 0.3) {
      if (waypoint.current >= route.current.length - 1) {
        done.current = true
        moveRef.current = { x: 0, y: 0 }
        last.current = { x: 0, y: 0 }
        character.position.set(stand.x, stand.y, stand.z)
        character.rotation.y = Math.PI
        onArrived(seat)
        return
      }
      waypoint.current += 1
      target = route.current[waypoint.current]
      distance = Math.hypot(target.x - character.position.x, target.z - character.position.z)
    }

    const next = stepTowards(
      { x: character.position.x, y: character.position.y, z: character.position.z },
      target,
      Math.min(delta, 0.1),
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
