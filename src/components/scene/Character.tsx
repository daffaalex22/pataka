'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { floorHeightAt, resolveWalkable, targetFloorHeight, clearCameraPosition } from '@/components/scene/summaba/layout'
import { hasMoved, recenterLookYaw } from '@/components/scene/lookYaw'
import { resolveMoveInput } from '@/components/scene/inputSpace'

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
  scripted = false,
}: {
  moveRef: React.RefObject<MoveVector>
  keysRef: React.RefObject<KeysState>
  characterRef: React.RefObject<THREE.Group | null>
  paused?: boolean
  /** AutoWalk drives `moveRef` in world space; manual input is screen space. */
  scripted?: boolean
}) {
  const bodyRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  const velocity = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const camDir = useMemo(() => new THREE.Vector3(), [])
  const walkTime = useRef(0)

  useFrame((state, delta) => {
    const group = characterRef.current
    if (!group) return

    // Cap the integration step: a stalled frame (shader compile, tab wake)
    // must not teleport the character through a collider.
    const dt = Math.min(delta, 0.1)
    const keys = keysRef.current ?? {}
    const stick = paused ? { x: 0, y: 0 } : (moveRef.current ?? { x: 0, y: 0 })
    const inputX = paused ? 0 : stick.x + (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0)
    const inputZ = paused ? 0 : -stick.y + (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0)

    // Arrows/joystick are screen space: rotate by the camera yaw so "down"
    // always walks toward the viewer, whatever way the camera faces.
    state.camera.getWorldDirection(camDir)
    const camYaw = Math.atan2(camDir.x, camDir.z)
    const world = resolveMoveInput(inputX, inputZ, camYaw, scripted)
    target.set(world.x, 0, world.z)
    if (target.lengthSq() > 1) target.normalize()
    const speed = 7
    target.multiplyScalar(speed)

    velocity.lerp(target, 1 - Math.exp(-8 * dt))
    group.position.addScaledVector(velocity, dt)

    resolveWalkable(group.position)
    const surface = floorHeightAt(group.position.x, group.position.z)
    const targetHeight = targetFloorHeight(group.position.y, surface)
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
    <group ref={characterRef} position={[0, 0, 19]} rotation-y={Math.PI}>
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

/** Third-person follow camera used while walking: trails behind the character's heading. */
export function FollowCamera({
  characterRef,
  lookYawRef,
  pitchRef,
}: {
  characterRef: React.RefObject<THREE.Group | null>
  lookYawRef: React.RefObject<number>
  pitchRef: React.RefObject<number>
}) {
  const camera = useThree((state) => state.camera)
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const lastPosition = useMemo(() => new THREE.Vector3(Number.NaN, 0, 0), [])

  useFrame((_, delta) => {
    const character = characterRef.current
    if (!character) return

    const dt = Math.min(delta, 0.1)
    const moved = hasMoved(lastPosition.x, lastPosition.z, character.position.x, character.position.z, dt)
    lastPosition.set(character.position.x, 0, character.position.z)

    const yaw = recenterLookYaw(lookYawRef.current, dt, moved)
    const pitch = recenterLookYaw(pitchRef.current, dt, moved)
    lookYawRef.current = yaw
    pitchRef.current = pitch

    const facing = character.rotation.y + yaw
    const sin = Math.sin(facing)
    const cos = Math.cos(facing)
    const horiz = 6.6 * Math.cos(pitch)

    const clear = clearCameraPosition(
      { x: character.position.x, y: character.position.y + 1.6, z: character.position.z },
      {
        x: character.position.x - sin * horiz,
        y: character.position.y + 3.6 + Math.sin(pitch) * 5.5,
        z: character.position.z - cos * horiz,
      },
    )
    desired.set(clear.x, clear.y, clear.z)
    camera.position.lerp(desired, 1 - Math.exp(-4 * delta))

    lookAt.set(
      character.position.x + sin * 2.2,
      character.position.y + 1.25 - Math.sin(pitch) * 4,
      character.position.z + cos * 2.2,
    )
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
