'use client'

import * as THREE from 'three'
import { WORLD } from './layout'

/** Night-concert stage at the courtyard's north end, facing south toward Downtown Walk. */
export function Stage() {
  return (
    <group position={[WORLD.stage.x, 0, WORLD.stage.z]}>
      {/* Backdrop wall against the north ring face */}
      <mesh position={[0, 4.6, -4.8]}>
        <boxGeometry args={[28, 9.2, 0.4]} />
        <meshStandardMaterial color="#0c0a14" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Platform */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[26, 1.4, WORLD.stage.depth]} />
        <meshStandardMaterial color="#1a1426" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* LED panels */}
      {[
        { x: -6, color: '#f5c542' },
        { x: 0, color: '#7c5cff' },
        { x: 6, color: '#38bdf8' },
      ].map((panel) => (
        <mesh key={panel.x} position={[panel.x, 4.4, -4.3]}>
          <planeGeometry args={[4.6, 6.4]} />
          <meshBasicMaterial color={panel.color} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Truss */}
      <mesh position={[0, 8.6, 1.5]}>
        <boxGeometry args={[28, 0.35, 0.35]} />
        <meshStandardMaterial color="#2a2438" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-13, 13].map((x) => (
        <mesh key={x} position={[x, 4.3, 1.5]}>
          <cylinderGeometry args={[0.14, 0.14, 8.6, 8]} />
          <meshStandardMaterial color="#2a2438" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Spotlight cans + beams */}
      {[-9, -3, 3, 9].map((x) => (
        <group key={x}>
          <mesh position={[x, 8.1, 1.2]}>
            <cylinderGeometry args={[0.28, 0.34, 0.7, 10]} />
            <meshStandardMaterial color="#1c1826" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[x, 4.4, -0.8]} rotation-x={0.42}>
            <coneGeometry args={[1.15, 8, 12, 1, true]} />
            <meshBasicMaterial
              color={x % 2 === 0 ? '#f5c542' : '#9b7bff'}
              transparent
              opacity={0.055}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <pointLight position={[0, 5, 2]} intensity={40} distance={46} color="#f5c542" />
      <pointLight position={[-8, 3, 2]} intensity={22} distance={30} color="#9b7bff" />
    </group>
  )
}
