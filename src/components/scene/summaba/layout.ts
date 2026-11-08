/**
 * Pure world geometry for the Summaba approximation.
 *
 * Every coordinate, walkability rule and multi-level height lives here so the
 * scene components render from it, the character/autowalk consume it, and the
 * tests pin it. Three.js-free on purpose.
 */

export type Vec3 = { x: number; y: number; z: number }
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }

export const WORLD = {
  bounds: { minX: -48, maxX: 48, minZ: -40, maxZ: 40 },
  courtyard: { minX: -22, maxX: 22, minZ: -18, maxZ: 20 },
  stage: { x: 0, z: -13, width: 24, depth: 9 },
  stageObstacle: { minX: -15, maxX: 15, minZ: -18, maxZ: -8.5 },
  ringNorth: { minX: -48, maxX: 48, minZ: -40, maxZ: -18, height: 11 },
  ringEast: { minX: 22, maxX: 48, minZ: -40, maxZ: 20 },
  ringWest: { minX: -48, maxX: -22, minZ: -40, maxZ: 20 },
  atriums: {
    ciunik: { minX: -15, maxX: 15, minZ: -34, maxZ: -18 },
    cibadak: { minX: 22, maxX: 36, minZ: -15, maxZ: 15 },
    cileutik: { minX: -36, maxX: -22, minZ: -15, maxZ: 15 },
  },
  porchDepth: 3,
  balcony: { y: 5.2, innerX: 14, outerX: 20, minZ: -14, maxZ: 15 },
  stairs: {
    east: { minX: 18, maxX: 21, minZ: 14, maxZ: 20 },
    west: { minX: -21, maxX: -18, minZ: 14, maxZ: 20 },
  },
  downtown: { minX: -40, maxX: 40, minZ: 20, maxZ: 40 },
  koiPond: { x: -12, z: 31, rx: 7, rz: 4 },
  liveMusic: { x: 16, z: 27 },
  lobbyCaang: { x: 26, z: 22 },
  spawn: { x: 0, z: 19 },
} as const

const BALCONIES: Rect[] = [
  {
    minX: WORLD.balcony.innerX,
    maxX: WORLD.balcony.outerX,
    minZ: WORLD.balcony.minZ,
    maxZ: WORLD.balcony.maxZ,
  },
  {
    minX: -WORLD.balcony.outerX,
    maxX: -WORLD.balcony.innerX,
    minZ: WORLD.balcony.minZ,
    maxZ: WORLD.balcony.maxZ,
  },
]

const STAIRS: Rect[] = [WORLD.stairs.east, WORLD.stairs.west]

const GROUND_RECTS: Rect[] = [WORLD.courtyard, WORLD.downtown, ...STAIRS]
const UPPER_RECTS: Rect[] = [...BALCONIES, ...STAIRS]

function insideRect(rect: Rect, x: number, z: number) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ
}

function clampIntoRect(rect: Rect, pos: Vec3) {
  pos.x = Math.min(rect.maxX, Math.max(rect.minX, pos.x))
  pos.z = Math.min(rect.maxZ, Math.max(rect.minZ, pos.z))
}

function distanceToRect(rect: Rect, x: number, z: number) {
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX)
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ)
  return Math.hypot(dx, dz)
}

function pushOutOfRect(rect: Rect, pos: Vec3) {
  const dxMin = pos.x - rect.minX
  const dxMax = rect.maxX - pos.x
  const dzMin = pos.z - rect.minZ
  const dzMax = rect.maxZ - pos.z
  const min = Math.min(dxMin, dxMax, dzMin, dzMax)
  if (min === dxMin) pos.x = rect.minX
  else if (min === dxMax) pos.x = rect.maxX
  else if (min === dzMin) pos.z = rect.minZ
  else pos.z = rect.maxZ
}

/**
 * Height of the walkable surface at (x, z): balcony decks, the stair ramps
 * (0 → 5.2 as z goes 20 → 14), or the courtyard ground. Region-based, not
 * level-aware: Character keeps a grounded visitor grounded under the balcony
 * overhang by only climbing when already elevated or on the ramp.
 */
export function floorHeightAt(x: number, z: number): number {
  for (const balcony of BALCONIES) {
    if (insideRect(balcony, x, z)) return WORLD.balcony.y
  }
  for (const stair of STAIRS) {
    if (!insideRect(stair, x, z)) continue
    const t = (stair.maxZ - z) / (stair.maxZ - stair.minZ)
    return t * WORLD.balcony.y
  }
  return 0
}

export function stairBottom(side: 'east' | 'west'): Vec3 {
  return side === 'east' ? { x: 19.5, y: 0, z: 20 } : { x: -19.5, y: 0, z: 20 }
}

export function stairTop(side: 'east' | 'west'): Vec3 {
  return side === 'east' ? { x: 19.5, y: WORLD.balcony.y, z: 14 } : { x: -19.5, y: WORLD.balcony.y, z: 14 }
}

/**
 * Height the character should ease toward. A grounded character only takes a
 * surface it can step onto (the ramp foot); it stays grounded under the
 * balcony deck and under mid-ramp instead of popping up through geometry.
 */
export function targetFloorHeight(currentY: number, surface: number): number {
  if (currentY > 1) return surface
  if (surface > 0 && surface - currentY < 1.2) return surface
  return currentY > 0 ? currentY : 0
}

function stairSideForX(x: number): 'east' | 'west' {
  return x >= 0 ? 'east' : 'west'
}

/**
 * Waypoints a scripted walk should follow. Ground → balcony goes up via the
 * stairs on the target balcony's side; balcony → ground comes down the
 * starting balcony's side; crossing between balconies descends, crosses the
 * courtyard and re-ascends.
 */
export function planWalkRoute(from: Vec3, to: Vec3): Vec3[] {
  const fromUpper = from.y > 1
  const toUpper = to.y > 1

  if (!fromUpper && !toUpper) return [to]

  if (!fromUpper && toUpper) {
    const side = stairSideForX(to.x)
    return [stairBottom(side), stairTop(side), to]
  }

  if (fromUpper && !toUpper) {
    const side = stairSideForX(from.x)
    return [stairTop(side), stairBottom(side), to]
  }

  const fromSide = stairSideForX(from.x)
  const toSide = stairSideForX(to.x)
  if (fromSide === toSide) return [to]
  return [stairTop(fromSide), stairBottom(fromSide), stairBottom(toSide), stairTop(toSide), to]
}

/**
 * Clamp a position into the walkable world. Mutates in place.
 * Upper level (y > 1): only balconies and stair ramps are walkable — the
 * courtyard edge acts as a railing. Ground: courtyard, downtown strip,
 * porch recesses and ramps are walkable; ring masses and the koi pond push
 * the character out along the nearest edge.
 */
export function resolveWalkable(pos: Vec3): void {
  pos.x = Math.min(WORLD.bounds.maxX, Math.max(WORLD.bounds.minX, pos.x))
  pos.z = Math.min(WORLD.bounds.maxZ, Math.max(WORLD.bounds.minZ, pos.z))

  if (pos.y > 1) {
    if (UPPER_RECTS.some((rect) => insideRect(rect, pos.x, pos.z))) return
    let nearest = UPPER_RECTS[0]
    let best = Infinity
    for (const rect of UPPER_RECTS) {
      const distance = distanceToRect(rect, pos.x, pos.z)
      if (distance < best) {
        best = distance
        nearest = rect
      }
    }
    clampIntoRect(nearest, pos)
    return
  }

  // The stage platform and its backdrop wall sit inside the courtyard rect.
  if (insideRect(WORLD.stageObstacle, pos.x, pos.z)) {
    pushOutOfRect(WORLD.stageObstacle, pos)
    return
  }

  if (GROUND_RECTS.some((rect) => insideRect(rect, pos.x, pos.z))) {
    // The koi pond sits inside the walkable downtown strip.
    const koi = WORLD.koiPond
    const dx = (pos.x - koi.x) / koi.rx
    const dz = (pos.z - koi.z) / koi.rz
    const t = Math.hypot(dx, dz)
    if (t < 1) {
      const scale = 1.04 / Math.max(t, 1e-6)
      if (t < 1e-6) {
        pos.x = koi.x
        pos.z = koi.z + koi.rz * 1.04
      } else {
        pos.x = koi.x + dx * koi.rx * scale
        pos.z = koi.z + dz * koi.rz * scale
      }
    }
    return
  }

  const rings: Rect[] = [WORLD.ringNorth, WORLD.ringEast, WORLD.ringWest]
  for (const ring of rings) {
    if (insideRect(ring, pos.x, pos.z)) {
      pushOutOfRect(ring, pos)
      return
    }
  }

  // Outside every known region (e.g. beyond the south strip): pull back to
  // the closest walkable ground rect.
  let nearest = GROUND_RECTS[0]
  let best = Infinity
  for (const rect of GROUND_RECTS) {
    const distance = distanceToRect(rect, pos.x, pos.z)
    if (distance < best) {
      best = distance
      nearest = rect
    }
  }
  clampIntoRect(nearest, pos)
}
