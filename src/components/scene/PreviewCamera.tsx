'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Seat } from '@/lib/types'

const STAGE_LOOK_AT = new THREE.Vector3(0, 3.2, -13)

/** Smoothly flies the camera to a seated eye-level view of the stage, then restores on exit. */
export function PreviewCamera({ seat }: { seat: Seat }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as unknown as
    | { enabled: boolean; target: THREE.Vector3; update?: () => void }
    | null

  const targetPosition = useMemo(() => {
    const toStageX = -seat.x
    const toStageZ = -13 - seat.z
    const length = Math.hypot(toStageX, toStageZ) || 1
    return new THREE.Vector3(
      seat.x + (toStageX / length) * 0.55,
      seat.y + 1.7,
      seat.z + (toStageZ / length) * 0.55,
    )
  }, [seat.x, seat.y, seat.z])
  const saved = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const wasEnabled = useRef(true)
  const restored = useRef(false)

  useEffect(() => {
    saved.current = {
      position: camera.position.clone(),
      target: controls?.target.clone() ?? new THREE.Vector3(0, 1.5, -4),
    }
    wasEnabled.current = controls?.enabled ?? true
    if (controls) controls.enabled = false

    return () => {
      if (!saved.current) return
      camera.position.copy(saved.current.position)
      if (controls) {
        controls.target.copy(saved.current.target)
        controls.enabled = wasEnabled.current
        controls.update?.()
      }
      restored.current = true
      saved.current = null
    }
  }, [camera, controls])

  useFrame((_, delta) => {
    camera.position.lerp(targetPosition, 1 - Math.exp(-7 * delta))
    camera.lookAt(STAGE_LOOK_AT)
  })

  return null
}
