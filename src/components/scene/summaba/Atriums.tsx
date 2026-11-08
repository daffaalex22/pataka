'use client'

import * as THREE from 'three'
import { WORLD, type Rect } from './layout'
import { useSignage } from './signage'

type AtriumSpec = {
  rect: Rect
  sign: string
  sub?: string
  face: 'north' | 'east' | 'west'
}

const ATRIUMS: AtriumSpec[] = [
  { rect: WORLD.atriums.ciunik, sign: 'ATRIUM CIUNIK', face: 'north' },
  { rect: WORLD.atriums.cibadak, sign: 'ATRIUM CIBADAK', sub: 'LOBBY AGEUNG', face: 'east' },
  { rect: WORLD.atriums.cileutik, sign: 'ATRIUM CILEUTIK', sub: 'LOBBY ALUS', face: 'west' },
]

const HALL_HEIGHT = 9

function AtriumHall({ spec }: { spec: AtriumSpec }) {
  const sign = useSignage(spec.sign, spec.sub)
  const { rect, face } = spec
  const cx = (rect.minX + rect.maxX) / 2
  const cz = (rect.minZ + rect.maxZ) / 2
  const width = rect.maxX - rect.minX
  const depth = rect.maxZ - rect.minZ

  let signPosition: [number, number, number]
  let signRotation = 0
  let glowPosition: [number, number, number]
  let glowRotation = 0

  if (face === 'north') {
    // Clear of the stage backdrop (top y 9.2): mounted above the hall roofline.
    signPosition = [cx, 10.2, rect.maxZ + 1.0]
    glowPosition = [cx, 3.6, rect.maxZ + 0.05]
  } else if (face === 'east') {
    signPosition = [rect.minX - 0.06, 6.9, cz]
    glowPosition = [rect.minX - 0.05, 3.6, cz]
    signRotation = -Math.PI / 2
    glowRotation = -Math.PI / 2
  } else {
    signPosition = [rect.maxX + 0.06, 6.9, cz]
    glowPosition = [rect.maxX + 0.05, 3.6, cz]
    signRotation = Math.PI / 2
    glowRotation = Math.PI / 2
  }

  const faceWidth = face === 'north' ? width : depth

  return (
    <group>
      {/* Hall mass */}
      <mesh position={[cx, HALL_HEIGHT / 2, cz]}>
        <boxGeometry args={[width, HALL_HEIGHT, depth]} />
        <meshStandardMaterial color="#151020" roughness={0.85} metalness={0.12} />
      </mesh>

      {/* Warm lit shopfront band facing the courtyard */}
      <mesh position={glowPosition} rotation-y={glowRotation}>
        <planeGeometry args={[faceWidth * 0.82, 3]} />
        <meshBasicMaterial color="#4a3517" toneMapped={false} transparent opacity={0.85} />
      </mesh>

      {/* Glass roof */}
      <mesh position={[cx, HALL_HEIGHT + 0.15, cz]}>
        <boxGeometry args={[width * 0.92, 0.3, depth * 0.92]} />
        <meshBasicMaterial color="#8ea2ff" transparent opacity={0.32} toneMapped={false} />
      </mesh>
      <mesh position={[cx, HALL_HEIGHT + 0.36, cz]}>
        <boxGeometry args={[width * 0.5, 0.06, depth * 0.5]} />
        <meshBasicMaterial color="#f5c542" transparent opacity={0.45} toneMapped={false} />
      </mesh>

      {/* Lit name */}
      {sign && (
        <group position={signPosition} rotation-y={signRotation}>
          {face === 'north' && (
            <mesh position={[0, 0, -0.12]}>
              <boxGeometry args={[11.6, 3.1, 0.16]} />
              <meshStandardMaterial color="#0b0912" roughness={0.9} metalness={0.1} />
            </mesh>
          )}
          <mesh>
            <planeGeometry args={[11, 2.75]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function LobbyCaang() {
  const sign = useSignage('LOBBY CAANG')
  if (!sign) return null
  return (
    <group position={[WORLD.lobbyCaang.x, 0, WORLD.lobbyCaang.z - 0.4]}>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
          <meshStandardMaterial color="#2a2438" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.7, 0]} rotation-y={Math.PI}>
        <planeGeometry args={[6, 1.5]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Atriums() {
  return (
    <group>
      {ATRIUMS.map((spec) => (
        <AtriumHall key={spec.sign} spec={spec} />
      ))}
      <LobbyCaang />

      {/* Warm spill from each atrium porch */}
      <pointLight position={[0, 3, -16.5]} intensity={12} distance={18} color="#f5c542" />
      <pointLight position={[23.5, 3, 0]} intensity={12} distance={18} color="#f5c542" />
      <pointLight position={[-23.5, 3, 0]} intensity={12} distance={18} color="#f5c542" />
    </group>
  )
}
