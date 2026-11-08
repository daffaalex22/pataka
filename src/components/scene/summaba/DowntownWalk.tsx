'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { WORLD } from './layout'
import { useSignage } from './signage'

const CANOPY_X = [-24, -12, 0, 12, 24]
const BULB_ROWS = [24.5, 38.5]

/** The Downtown Walk: alfresco dining strip, koi pond and the live-music corner. */
export function DowntownWalk() {
  const bulbsRef = useRef<THREE.InstancedMesh>(null)

  const bulbPoints = useMemo(() => {
    const points: [number, number, number][] = []
    for (const z of BULB_ROWS) {
      for (let x = -30; x <= 34; x += 3.2) {
        points.push([x, 3.5 + Math.sin(x * 0.7) * 0.18, z])
      }
    }
    return points
  }, [])

  useEffect(() => {
    const mesh = bulbsRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    bulbPoints.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [bulbPoints])

  const sign = useSignage('THE DOWNTOWN WALK')
  const pond = WORLD.koiPond

  return (
    <group>
      {/* Paving */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 31]}>
        <planeGeometry args={[76, 18]} />
        <meshStandardMaterial color="#141020" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Warm shopfront wall along the south edge */}
      <mesh position={[0, 1.6, 39.6]}>
        <planeGeometry args={[72, 3.2]} />
        <meshBasicMaterial color="#5a4420" toneMapped={false} transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.95, 39.45]}>
        <planeGeometry args={[72, 0.22]} />
        <meshBasicMaterial color="#f5c542" toneMapped={false} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.35, 39.5]}>
        <boxGeometry args={[72, 0.7, 0.4]} />
        <meshStandardMaterial color="#1a1426" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Dining canopies */}
      {CANOPY_X.map((x) => (
        <group key={x} position={[x, 0, 33]}>
          <mesh position={[0, 3.6, 0]}>
            <boxGeometry args={[10, 0.25, 5.2]} />
            <meshStandardMaterial color="#1c1729" roughness={0.75} metalness={0.2} />
          </mesh>
          <mesh position={[0, 3.46, 0]}>
            <planeGeometry args={[9.4, 4.6]} />
            <meshBasicMaterial color="#6b4f1e" toneMapped={false} transparent opacity={0.95} side={THREE.DoubleSide} />
          </mesh>
          {[-4.4, 4.4].map((px) => (
            <mesh key={px} position={[px, 1.75, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 3.5, 8]} />
              <meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tables under the canopies */}
      {CANOPY_X.flatMap((x) =>
        [-2.6, 0, 2.6].map((dz) => (
          <mesh key={`${x}-${dz}`} position={[x, 0.38, 33 + dz]}>
            <cylinderGeometry args={[0.7, 0.7, 0.75, 12]} />
            <meshStandardMaterial color="#221c33" roughness={0.6} metalness={0.3} />
          </mesh>
        )),
      )}

      {/* Sagalawarna koi pond */}
      <group position={[pond.x, 0, pond.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} scale={[pond.rx / pond.rz, 1, 1]}>
          <circleGeometry args={[pond.rz, 40]} />
          <meshStandardMaterial color="#16324a" roughness={0.25} metalness={0.55} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.08, 0]} scale={[pond.rx / pond.rz, 1, 1]}>
          <ringGeometry args={[pond.rz - 0.22, pond.rz, 40]} />
          <meshStandardMaterial color="#2a2438" roughness={0.6} metalness={0.4} />
        </mesh>
        {[
          [-2.4, 0.7],
          [1.6, -1.1],
          [2.6, 1.2],
          [-0.6, -1.8],
        ].map(([x, z], index) => (
          <mesh key={index} rotation-x={-Math.PI / 2} position={[x, 0.1, z]}>
            <circleGeometry args={[0.22, 10]} />
            <meshBasicMaterial color="#ff8a4c" toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Live-music corner */}
      <group position={[WORLD.liveMusic.x, 0, WORLD.liveMusic.z]}>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[4.6, 0.44, 3]} />
          <meshStandardMaterial color="#1a1426" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.7, -1.2]}>
          <planeGeometry args={[2.6, 1.5]} />
          <meshBasicMaterial color="#7c5cff" toneMapped={false} transparent opacity={0.75} />
        </mesh>
        {/* one soft beam, no new light */}
        <mesh position={[0, 2.9, 0.6]} rotation-x={0.5}>
          <coneGeometry args={[1.1, 4.6, 10, 1, true]} />
          <meshBasicMaterial color="#f5c542" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* Strip sign, facing the courtyard */}
      {sign && (
        <group position={[0, 2.9, 39]} rotation-y={Math.PI}>
          <mesh>
            <planeGeometry args={[9, 2.1]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* String lights */}
      <instancedMesh ref={bulbsRef} args={[undefined, undefined, bulbPoints.length]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#ffd88a" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
