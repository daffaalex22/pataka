'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

// Trees hug the courtyard edge, clear of the seat field (|x| <= 16, z -7.3..17.7).
const TREES: [number, number][] = [
  [20.5, -13], [20.5, -7], [20.5, -1], [20.5, 5], [20.5, 11], [20.5, 16],
  [-20.5, -13], [-20.5, -7], [-20.5, -1], [-20.5, 5], [-20.5, 11], [-20.5, 16],
  [-18, 18.8], [-12, 18.8], [-6, 18.8], [6, 18.8], [12, 18.8], [18, 18.8],
  [-18, -15], [18, -15],
]

const HEDGES: [number, number][] = [
  [-16, 19.6], [-12, 19.6], [-4, 19.6], [4, 19.6], [12, 19.6], [16, 19.6],
]

/** Sawarga Courtyard greenery: instanced trees and hedges, plus the fountain garden. */
export function Sawarga() {
  const trunksRef = useRef<THREE.InstancedMesh>(null)
  const canopiesRef = useRef<THREE.InstancedMesh>(null)
  const hedgesRef = useRef<THREE.InstancedMesh>(null)

  const treeCount = TREES.length

  useEffect(() => {
    const trunks = trunksRef.current
    const canopies = canopiesRef.current
    if (!trunks || !canopies) return
    const dummy = new THREE.Object3D()
    TREES.forEach(([x, z], index) => {
      const scale = 0.85 + ((index * 37) % 10) / 30
      dummy.position.set(x, 0.85 * scale, z)
      dummy.scale.set(1, scale, 1)
      dummy.rotation.set(0, index * 1.7, 0)
      dummy.updateMatrix()
      trunks.setMatrixAt(index, dummy.matrix)

      dummy.position.set(x, 2.1 * scale, z)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      canopies.setMatrixAt(index, dummy.matrix)
    })
    trunks.instanceMatrix.needsUpdate = true
    canopies.instanceMatrix.needsUpdate = true
  }, [])

  useEffect(() => {
    const hedges = hedgesRef.current
    if (!hedges) return
    const dummy = new THREE.Object3D()
    HEDGES.forEach(([x, z], index) => {
      dummy.position.set(x, 0.3, z)
      dummy.updateMatrix()
      hedges.setMatrixAt(index, dummy.matrix)
    })
    hedges.instanceMatrix.needsUpdate = true
  }, [])

  const benches = useMemo<[number, number, number][]>(
    () => [
      [-6, 0.35, 18.9],
      [6, 0.35, 18.9],
      [-18, 0.35, 6],
    ],
    [],
  )

  return (
    <group>
      {/* Instanced trees: one draw call for trunks, one for canopies */}
      <instancedMesh ref={trunksRef} args={[undefined, undefined, treeCount]}>
        <cylinderGeometry args={[0.12, 0.16, 1.7, 8]} />
        <meshStandardMaterial color="#241a14" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={canopiesRef} args={[undefined, undefined, treeCount]}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#1d3a28" roughness={0.85} metalness={0.05} flatShading />
      </instancedMesh>

      {/* Hedges along the south garden edge */}
      <instancedMesh ref={hedgesRef} args={[undefined, undefined, HEDGES.length]}>
        <boxGeometry args={[2.4, 0.6, 0.7]} />
        <meshStandardMaterial color="#17301f" roughness={0.9} />
      </instancedMesh>

      {/* Fountain garden */}
      <group position={[-14, 0, 16.5]}>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[2.2, 2.35, 0.56, 28]} />
          <meshStandardMaterial color="#1c1729" roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.57, 0]}>
          <circleGeometry args={[1.95, 28]} />
          <meshStandardMaterial color="#123a4a" emissive="#38bdf8" emissiveIntensity={0.35} roughness={0.2} metalness={0.5} />
        </mesh>
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.7, 0.95, Math.sin(angle) * 0.7]}>
              <coneGeometry args={[0.16, 0.85, 8]} />
              <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      {/* Benches */}
      {benches.map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <boxGeometry args={[1.9, 0.16, 0.55]} />
          <meshStandardMaterial color="#2a2438" roughness={0.7} metalness={0.25} />
        </mesh>
      ))}
    </group>
  )
}
