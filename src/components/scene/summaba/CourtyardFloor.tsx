'use client'

import { WORLD } from './layout'

/** Ground plane for the whole world plus the courtyard's lawn patches. */
export function CourtyardFloor() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[96, 80]} />
        <meshStandardMaterial color="#100d1a" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Central lawn under the courtyard's seat field */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 4]}>
        <planeGeometry args={[38, 26]} />
        <meshStandardMaterial color="#15241c" roughness={0.95} metalness={0} />
      </mesh>

      {/* Side garden beds beneath the balcony overhangs */}
      {[-1, 1].map((side) => (
        <mesh key={side} rotation-x={-Math.PI / 2} position={[side * 18, 0.025, 0]}>
          <planeGeometry args={[6, 28]} />
          <meshStandardMaterial color="#132019" roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Rounded garden bed near the south promenade */}
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.03, 17]} scale={[1.3, 0.7, 1]}>
        <circleGeometry args={[5, 40]} />
        <meshStandardMaterial color="#15241c" roughness={0.95} metalness={0} />
      </mesh>

      {/* Subtle paving outline of the courtyard */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1]}>
        <ringGeometry args={[Math.min(WORLD.courtyard.maxX, 22) - 1.2, Math.min(WORLD.courtyard.maxX, 22) - 0.9, 64]} />
        <meshBasicMaterial color="#241f33" toneMapped={false} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
