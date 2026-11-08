'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { floorHeightAt, resolveWalkable, WORLD } from '@/components/scene/summaba/layout'
import { recenterLookYaw } from '@/components/scene/lookYaw'

export type MoveVector = { x: number; y: number }
export type KeysState = Record<string, boolean>

export function useMovementInputs() {
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })
  const keysRef = useRef<KeysState>({})
  return { moveRef, keysRef }
}

export function Character({
  moveRef,
  keysRef,
  characterRef,
  paused = false,
}: {
  moveRef: React.RefObject<MoveVector>
  keysRef: React.RefObject<KeysState>
  characterRef: React.RefObject<THREE.Group | null>
  paused?: boolean
}) {
  const bodyRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  const velocity = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const walkTime = useRef(0)

  useFrame((_, delta) => {
    const group = characterRef.current
    if (!group) return

    // Cap the integration step: a stalled frame (shader compile, tab wake)
    // must not teleport the character through a collider.
    const dt = Math.min(delta, 0.1)
    const keys = keysRef.current ?? {}
    const stick = paused ? { x: 0, y: 0 } : (moveRef.current ?? { x: 0, y: 0 })
    const inputX = paused ? 0 : stick.x + (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0)
    const inputZ = paused ? 0 : -stick.y + (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0)

    target.set(inputX, 0, inputZ)
    if (target.lengthSq() > 1) target.normalize()
    const speed = 7
    target.multiplyScalar(speed)

    velocity.lerp(target, 1 - Math.exp(-8 * dt))
    group.position.addScaledVector(velocity, dt)

    resolveWalkable(group.position)
    const surface = floorHeightAt(group.position.x, group.position.z)
    const elevated = group.position.y > 1 || surface < WORLD.balcony.y - 0.05
    const targetHeight = elevated ? surface : 0
    group.position.y += (targetHeight - group.position.y) * (1 - Math.exp(-10 * dt))

    const moving = velocity.length() > 0.4
    if (moving) {
      const desired = Math.atan2(velocity.x, velocity.z)
      let difference = desired - group.rotation.y
      while (difference > Math.PI) difference -= Math.PI * 2
      while (difference < -Math.PI) difference += Math.PI * 2
      group.rotation.y += difference * Math.min(1, dt * 12)
      walkTime.current += dt * 9
    } else {
      walkTime.current += dt * 2
    }

    if (bodyRef.current) {
      bodyRef.current.position.y = 1.05 + (moving ? Math.abs(Math.sin(walkTime.current)) * 0.06 : Math.sin(walkTime.current) * 0.012)
    }
    const swing = moving ? Math.sin(walkTime.current) * 0.6 : 0
    if (armL.current) armL.current.rotation.x = swing
    if (armR.current) armR.current.rotation.x = -swing
    if (legL.current) legL.current.rotation.x = -swing
    if (legR.current) legR.current.rotation.x = swing
  })

  return (
    <group ref={characterRef} position={[0, 0, 14]}>
      <group ref={bodyRef} position={[0, 1.05, 0]}>
        {/* hoodie */}
        <mesh castShadow={false}>
          <capsuleGeometry args={[0.34, 0.55, 6, 14]} />
          <meshStandardMaterial color="#454064" roughness={0.6} />
        </mesh>
        {/* scarf accent */}
        <mesh position={[0, 0.34, 0.02]}>
          <torusGeometry args={[0.27, 0.06, 8, 20]} />
          <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* head */}
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.25, 20, 16]} />
          <meshStandardMaterial color="#e8b89b" roughness={0.65} />
        </mesh>
        {/* hood */}
        <mesh position={[0, 0.66, -0.06]}>
          <sphereGeometry args={[0.28, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial color="#221c33" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
        {/* arms */}
        <mesh ref={armL} position={[-0.4, 0.08, 0]}>
          <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
          <meshStandardMaterial color="#454064" roughness={0.6} />
        </mesh>
        <mesh ref={armR} position={[0.4, 0.08, 0]}>
          <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
          <meshStandardMaterial color="#454064" roughness={0.6} />
        </mesh>
        {/* legs */}
        <mesh ref={legL} position={[-0.15, -0.62, 0]}>
          <capsuleGeometry args={[0.11, 0.5, 4, 10]} />
          <meshStandardMaterial color="#151226" roughness={0.8} />
        </mesh>
        <mesh ref={legR} position={[0.15, -0.62, 0]}>
          <capsuleGeometry args={[0.11, 0.5, 4, 10]} />
          <meshStandardMaterial color="#151226" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

/** Third-person follow camera used while walking. */
export function FollowCamera({
  characterRef,
  lookYawRef,
}: {
  characterRef: React.RefObject<THREE.Group | null>
  lookYawRef: React.RefObject<number>
}) {
  const camera = useThree((state) => state.camera)
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const lastPosition = useMemo(() => new THREE.Vector3(Number.NaN, 0, 0), [])

  useFrame((_, delta) => {
    const character = characterRef.current
    if (!character) return

    const dt = Math.min(delta, 0.1)
    const moved =
      !Number.isNaN(lastPosition.x) &&
      Math.hypot(character.position.x - lastPosition.x, character.position.z - lastPosition.z) > 0.05
    lastPosition.set(character.position.x, 0, character.position.z)

    const yaw = recenterLookYaw(lookYawRef.current, dt, moved)
    lookYawRef.current = yaw

    const sin = Math.sin(yaw)
    const cos = Math.cos(yaw)

    desired.set(character.position.x + sin * 6.6, character.position.y + 3.6, character.position.z + cos * 6.6)
    camera.position.lerp(desired, 1 - Math.exp(-4 * delta))

    lookAt.set(character.position.x - sin * 2.2, character.position.y + 1.25, character.position.z - cos * 2.2)
    camera.lookAt(lookAt)
  })

  return null
}

/** Keyboard listeners active only while walking. */
export function useKeyboard(keysRef: React.RefObject<KeysState>) {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true
    }
    const up = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keysRef])
}
