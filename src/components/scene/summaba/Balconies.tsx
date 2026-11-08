'use client'

import { WORLD } from './layout'

const BALCONY_Y = WORLD.balcony.y
const INNER_X = WORLD.balcony.innerX
const OUTER_X = WORLD.balcony.outerX
const MIN_Z = WORLD.balcony.minZ
const MAX_Z = WORLD.balcony.maxZ
const BALCONY_WIDTH = OUTER_X - INNER_X
const BALCONY_DEPTH = MAX_Z - MIN_Z
const MID_Z = (MIN_Z + MAX_Z) / 2

const STAIR_X = (WORLD.stairs.east.minX + WORLD.stairs.east.maxX) / 2
const STAIR_DEPTH = WORLD.stairs.east.maxZ - WORLD.stairs.east.minZ
const STAIR_ANGLE = Math.atan2(BALCONY_Y, STAIR_DEPTH)
const STAIR_LENGTH = Math.hypot(STAIR_DEPTH, BALCONY_Y)
const STAIR_MID_Z = (WORLD.stairs.east.minZ + WORLD.stairs.east.maxZ) / 2

/** L2 balcony decks, railings and the two stairways from the courtyard. */
export function Balconies() {
  return (
    <group>
      {[-1, 1].map((side) => {
        const midX = side * ((INNER_X + OUTER_X) / 2)

        return (
          <group key={side}>
            {/* Deck the Tribune seats stand on */}
            <mesh position={[midX, BALCONY_Y - 0.2, MID_Z]}>
              <boxGeometry args={[BALCONY_WIDTH, 0.4, BALCONY_DEPTH]} />
              <meshStandardMaterial color="#151120" roughness={0.8} metalness={0.15} />
            </mesh>

            {/* Inner railing overlooking the courtyard */}
            <mesh position={[side * INNER_X, BALCONY_Y + 0.55, MID_Z]}>
              <boxGeometry args={[0.14, 1.1, BALCONY_DEPTH]} />
              <meshStandardMaterial color="#2a2438" roughness={0.5} metalness={0.5} />
            </mesh>

            {/* End railings — the south one leaves the stair landing open */}
            <mesh position={[midX, BALCONY_Y + 0.55, MIN_Z]}>
              <boxGeometry args={[BALCONY_WIDTH, 1.1, 0.14]} />
              <meshStandardMaterial color="#2a2438" roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh position={[side * 16, BALCONY_Y + 0.55, MAX_Z]}>
              <boxGeometry args={[4, 1.1, 0.14]} />
              <meshStandardMaterial color="#2a2438" roughness={0.5} metalness={0.5} />
            </mesh>

            {/* Support columns under the overhang */}
            {[-10, 0, 10].map((z) => (
              <mesh key={z} position={[side * INNER_X, BALCONY_Y / 2, z]}>
                <cylinderGeometry args={[0.18, 0.22, BALCONY_Y, 10]} />
                <meshStandardMaterial color="#1c1729" roughness={0.8} metalness={0.2} />
              </mesh>
            ))}

            {/* Stairway ramp (rise matches floorHeightAt: z 20 → 14) */}
            <mesh position={[side * STAIR_X, BALCONY_Y / 2, STAIR_MID_Z]} rotation-x={STAIR_ANGLE}>
              <boxGeometry args={[3, 0.3, STAIR_LENGTH]} />
              <meshStandardMaterial color="#1a1426" roughness={0.6} metalness={0.25} />
            </mesh>

            {/* Stair side rails */}
            {[-1.55, 1.55].map((offset) => (
              <mesh
                key={offset}
                position={[side * STAIR_X + offset, BALCONY_Y / 2 + 0.5, STAIR_MID_Z]}
                rotation-x={STAIR_ANGLE}
              >
                <boxGeometry args={[0.1, 0.5, STAIR_LENGTH]} />
                <meshStandardMaterial color="#2a2438" roughness={0.5} metalness={0.5} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}
