'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { WORLD } from './layout'

/** Deterministic window pattern so re-renders never reshuffle the facade. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Two-storey window texture for the courtyard-facing facades. */
function useRingFacadeTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const rand = seededRandom(7)

    ctx.fillStyle = '#0e0b17'
    ctx.fillRect(0, 0, 1024, 512)

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 40; col++) {
        if (rand() > 0.62) continue
        const warm = rand() > 0.55
        const alpha = 0.25 + rand() * 0.6
        ctx.fillStyle = warm ? `rgba(245, 197, 66, ${alpha})` : `rgba(140, 150, 255, ${alpha * 0.8})`
        ctx.fillRect(30 + col * 24, 26 + row * 44, 10, 18)
      }
    }

    // L1 slab band between the two storeys (y 5.2 of 11 → mid texture)
    ctx.fillStyle = 'rgba(42, 36, 56, 0.95)'
    ctx.fillRect(0, 244, 1024, 14)
    // parapet shadow line at the top
    ctx.fillStyle = 'rgba(26, 20, 38, 1)'
    ctx.fillRect(0, 0, 1024, 18)

    const next = new THREE.CanvasTexture(canvas)
    next.colorSpace = THREE.SRGBColorSpace
    next.wrapS = THREE.RepeatWrapping
    next.wrapT = THREE.ClampToEdgeWrapping
    next.repeat.set(6, 1)
    next.anisotropy = 4
    return next
  }, [])

  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

function FacadePlane({ position, rotationY, size }: { position: [number, number, number]; rotationY: number; size: [number, number] }) {
  const texture = useRingFacadeTexture()
  if (!texture) return null
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export function MallRing() {
  const colonnadeRef = useRef<THREE.InstancedMesh>(null)

  // Ground-level arcade pillars along the courtyard-facing faces, skipping atrium entrances.
  const colonnadePoints = useMemo(() => {
    const points: [number, number][] = []
    const skipNorth = (x: number) => x > WORLD.atriums.ciunik.minX - 2 && x < WORLD.atriums.ciunik.maxX + 2
    const skipEast = (z: number) => z > WORLD.atriums.cibadak.minZ - 2 && z < WORLD.atriums.cibadak.maxZ + 2
    const skipWest = (z: number) => z > WORLD.atriums.cileutik.minZ - 2 && z < WORLD.atriums.cileutik.maxZ + 2

    for (let x = -46; x <= 46; x += 4) {
      if (!skipNorth(x)) points.push([x, WORLD.ringNorth.maxZ + 0.3])
    }
    for (let z = -38; z <= 18; z += 4) {
      if (!skipEast(z)) points.push([WORLD.ringEast.minX - 0.3, z])
      if (!skipWest(z)) points.push([WORLD.ringWest.maxX + 0.3, z])
    }
    return points
  }, [])

  useEffect(() => {
    const mesh = colonnadeRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    colonnadePoints.forEach(([x, z], index) => {
      dummy.position.set(x, 2.6, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [colonnadePoints])

  const massColor = '#120e1d'

  return (
    <group>
      {/* Two-storey masses wrapping the courtyard on N/E/W */}
      <mesh position={[0, WORLD.ringNorth.height / 2, (WORLD.ringNorth.minZ + WORLD.ringNorth.maxZ) / 2]}>
        <boxGeometry args={[96, WORLD.ringNorth.height, 22]} />
        <meshStandardMaterial color={massColor} roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[(WORLD.ringEast.minX + WORLD.ringEast.maxX) / 2, 5.5, (WORLD.ringEast.minZ + WORLD.ringEast.maxZ) / 2]}>
        <boxGeometry args={[26, 11, 60]} />
        <meshStandardMaterial color={massColor} roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[(WORLD.ringWest.minX + WORLD.ringWest.maxX) / 2, 5.5, (WORLD.ringWest.minZ + WORLD.ringWest.maxZ) / 2]}>
        <boxGeometry args={[26, 11, 60]} />
        <meshStandardMaterial color={massColor} roughness={0.9} metalness={0.08} />
      </mesh>

      {/* Anchor massing cue: taller plain block on the north ring's east end */}
      <mesh position={[30, 14.5 / 2, -29]}>
        <boxGeometry args={[26, 14.5, 16]} />
        <meshStandardMaterial color="#151020" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Lit facades on the courtyard-facing inner faces */}
      <FacadePlane position={[0, 5.5, WORLD.ringNorth.maxZ + 0.05]} rotationY={0} size={[96, 11]} />
      <FacadePlane position={[WORLD.ringEast.minX - 0.05, 5.5, -10]} rotationY={-Math.PI / 2} size={[60, 11]} />
      <FacadePlane position={[WORLD.ringWest.maxX + 0.05, 5.5, -10]} rotationY={Math.PI / 2} size={[60, 11]} />

      {/* L1 slab band over the east/west inner edges where the balconies will sit */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 21.6, 5.05, 0.5]}>
          <boxGeometry args={[0.8, 0.3, 58]} />
          <meshStandardMaterial color="#2a2438" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* Ground arcade pillars */}
      <instancedMesh ref={colonnadeRef} args={[undefined, undefined, colonnadePoints.length]}>
        <boxGeometry args={[0.45, 5.2, 0.45]} />
        <meshStandardMaterial color="#1c1729" roughness={0.8} metalness={0.15} />
      </instancedMesh>

      {/* Warm glow spilling from the arcade */}
      <pointLight position={[0, 4, -14]} intensity={18} distance={30} color="#f5c542" />
      <pointLight position={[18, 4, 4]} intensity={10} distance={22} color="#9b7bff" />
    </group>
  )
}
