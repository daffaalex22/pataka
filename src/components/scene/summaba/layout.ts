/**
 * Pure world geometry for the Sawarga venue.
 *
 * Every coordinate, walkability rule and multi-level height lives here so the
 * scene components render from it, the character/autowalk consume it, and the
 * tests pin it. Three.js-free on purpose.
 */

import {
  ACCESS_STAIRS,
  BALCONY,
  SHELL,
  shellInwardNormal,
  shellOffsetPoint,
  shellPoint,
} from '@/lib/sawarga/scene/venue/layout'

export type Vec3 = { x: number; y: number; z: number }
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }

export const WORLD = {
  bounds: { minX: -48, maxX: 48, minZ: -40, maxZ: 40 },
  courtyard: { minX: -22, maxX: 22, minZ: -18, maxZ: 23 },
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
  /**
   * Walkway behind the last seat row (row Q pads at z 17.7, backs at 18.3).
   * Both structures face the plaza centre (0, 0, 2) and stay clear of seats.
   */
  southEdge: {
    board: { x: -9, z: 22, rotationY: 2.72, halfWidth: 2.8, halfDepth: 0.3 },
    booth: { x: 9, z: 22, rotationY: -2.72, halfWidth: 1.8, halfDepth: 0.9 },
  },
} as const

/**
 * Sawarga shell walkability. The paving fills the ellipse; the facades sit on
 * its edge, so the character stays just inside it. The old rectangular
 * courtyard rects are retained only as the event-floor contract.
 */
export const SHELL_WORLD = {
  radiusX: SHELL.radiusX,
  radiusZ: SHELL.radiusZ,
  walkMargin: 0.5,
} as const

/** Curved balcony band, measured as an elliptical radius fraction. */
const BALCONY_BAND = {
  minQ: 0.82,
  maxQ: 0.995,
  outerBreak: 0.943,
  middleBreak: 0.886,
  deckOffset: 3,
} as const

/**
 * Legacy courtyard tree anchors. The venue-side rows were removed when the
 * stage-side stairs were rebuilt; only the south walkway row remains.
 */
export const TREES: [number, number][] = [
  [-18, 24.8], [-15, 24.8], [-2.5, 24.8], [2.5, 24.8], [15, 24.8], [18, 24.8],
]

const ATRIA_CIRCLES = Object.values(BALCONY.atria).map((spec) => {
  const angle = spec.angle * Math.PI
  const point = shellPoint(angle)
  const inward = shellInwardNormal(angle)
  return {
    x: point.x - inward.x * spec.offset,
    z: point.z - inward.z * spec.offset,
    radius: spec.radius,
  }
})

/** Six low planters added by the Sawarga landscape. */
const VENUE_TREES: Array<[number, number]> = []

function insideRect(rect: Rect, x: number, z: number) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ
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

function shellAngleAt(x: number, z: number) {
  const angle = Math.atan2(z / SHELL.radiusZ, x / SHELL.radiusX)
  return angle < 0 ? angle + Math.PI * 2 : angle
}

function shellRadiusAt(x: number, z: number) {
  return Math.hypot(x / SHELL.radiusX, z / SHELL.radiusZ)
}

function balconySideAt(angle: number): 'east' | 'west' | null {
  const eastHalf = BALCONY.eastAngleRange[1] * Math.PI
  if (angle <= eastHalf || angle >= Math.PI * 2 - eastHalf) return 'east'
  if (
    angle >= BALCONY.westAngleRange[0] * Math.PI &&
    angle <= BALCONY.westAngleRange[1] * Math.PI
  ) {
    return 'west'
  }
  return null
}

/** Stepped balcony surface at (x, z), or null when outside the curved band. */
function balconyHeightAt(x: number, z: number): number | null {
  const q = shellRadiusAt(x, z)
  if (q < BALCONY_BAND.minQ || q > BALCONY_BAND.maxQ) return null
  if (!balconySideAt(shellAngleAt(x, z))) return null
  if (q > BALCONY_BAND.outerBreak) return BALCONY.rowY[2]
  if (q > BALCONY_BAND.middleBreak) return BALCONY.rowY[1]
  return BALCONY.rowY[0]
}

function segmentHeightAt(from: Vec3, to: Vec3, x: number, z: number, halfWidth: number): number | null {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const lengthSq = dx * dx + dz * dz
  if (lengthSq < 1e-6) return null
  const t = ((x - from.x) * dx + (z - from.z) * dz) / lengthSq
  if (t < 0 || t > 1) return null
  const px = from.x + dx * t
  const pz = from.z + dz * t
  if (Math.hypot(x - px, z - pz) > halfWidth) return null
  return from.y + (to.y - from.y) * t
}

/** Angle of the north end of each tribune band, where the access bridge lands. */
function accessDeckAngle(side: 'east' | 'west'): number {
  return side === 'east'
    ? BALCONY.eastAngleRange[0] * Math.PI
    : BALCONY.westAngleRange[1] * Math.PI
}

function accessDeckPoint(side: 'east' | 'west'): Vec3 {
  const point = shellOffsetPoint(accessDeckAngle(side), BALCONY_BAND.deckOffset)
  return { x: point.x, y: BALCONY.rowY[0], z: point.z }
}

function accessHeightAt(side: 'east' | 'west', x: number, z: number): number | null {
  const stair = ACCESS_STAIRS[side]
  const half = stair.width / 2

  const lower = segmentHeightAt(stair.bottom, stair.lowerTop, x, z, half)
  if (lower !== null) return lower

  if (
    Math.abs(x - stair.landing.x) <= stair.landingSize / 2 &&
    Math.abs(z - stair.landing.z) <= stair.landingSize / 2
  ) {
    return stair.landing.y
  }

  const upper = segmentHeightAt(stair.upperStart, stair.upperTop, x, z, half)
  if (upper !== null) return upper

  return segmentHeightAt(stair.upperTop, stair.bridgeEnd, x, z, half)
}

function accessHeightAtAny(x: number, z: number): number | null {
  for (const side of ['east', 'west'] as const) {
    const height = accessHeightAt(side, x, z)
    if (height !== null) return height
  }
  return null
}

interface AccessProjection {
  x: number
  z: number
  height: number
  distance: number
  corridor: number
  insideSpan: boolean
}

function projectToSegment(from: Vec3, to: Vec3, x: number, z: number): AccessProjection {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const lengthSq = dx * dx + dz * dz
  const rawT = lengthSq > 1e-6
    ? ((x - from.x) * dx + (z - from.z) * dz) / lengthSq
    : 0
  const t = Math.min(1, Math.max(0, rawT))
  const px = from.x + dx * t
  const pz = from.z + dz * t
  return {
    x: px,
    z: pz,
    height: from.y + (to.y - from.y) * t,
    distance: Math.hypot(x - px, z - pz),
    corridor: 0,
    insideSpan: rawT >= 0 && rawT <= 1,
  }
}

function projectToLanding(
  stair: (typeof ACCESS_STAIRS)['east'],
  x: number,
  z: number,
): AccessProjection {
  const half = stair.landingSize / 2
  const px = Math.min(stair.landing.x + half, Math.max(stair.landing.x - half, x))
  const pz = Math.min(stair.landing.z + half, Math.max(stair.landing.z - half, z))
  return {
    x: px,
    z: pz,
    height: stair.landing.y,
    distance: Math.hypot(x - px, z - pz),
    corridor: 0,
    insideSpan: true,
  }
}

/**
 * Keep an elevated character on the access structure they are using. If they
 * graze a stair side, overshoot the landing, or drift off the bridge, this
 * pushes them back to the nearest access edge instead of letting the balcony
 * fallback teleport them across the venue.
 */
function clampToAccess(pos: Vec3, capture = 1.0): boolean {
  const candidates: AccessProjection[] = []

  const consider = (projection: AccessProjection, corridor: number) => {
    if (!projection.insideSpan) return
    // Do not latch onto an overhead flight when the character is on the
    // lower flight or the courtyard below.
    if (Math.abs(projection.height - pos.y) > 1.3) return
    if (projection.distance > corridor + capture) return
    candidates.push({ ...projection, corridor })
  }

  for (const side of ['east', 'west'] as const) {
    const stair = ACCESS_STAIRS[side]
    const half = stair.width / 2
    consider(projectToSegment(stair.bottom, stair.lowerTop, pos.x, pos.z), half)
    consider(projectToLanding(stair, pos.x, pos.z), 0)
    consider(projectToSegment(stair.upperStart, stair.upperTop, pos.x, pos.z), half)
    consider(projectToSegment(stair.upperTop, stair.bridgeEnd, pos.x, pos.z), half)
  }

  if (candidates.length === 0) return false
  // If the point is inside any access corridor, let it move freely. This is
  // what lets the walker step from the landing onto the upper flight; picking
  // only the nearest piece would otherwise clamp them to the landing edge.
  if (candidates.some((candidate) => candidate.distance <= candidate.corridor + 0.001)) {
    return true
  }

  const best = candidates.reduce((a, b) => (a.distance <= b.distance ? a : b))
  const dx = pos.x - best.x
  const dz = pos.z - best.z
  const length = Math.hypot(dx, dz) || 1
  pos.x = best.x + (dx / length) * best.corridor
  pos.z = best.z + (dz / length) * best.corridor
  return true
}

function nearBalconyBand(x: number, z: number): boolean {
  const q = shellRadiusAt(x, z)
  if (q < BALCONY_BAND.minQ - 0.12 || q > BALCONY_BAND.maxQ + 0.12) return false
  return balconySideAt(shellAngleAt(x, z)) !== null
}

/** Full route through one switchback stair, from the ground to the terrace. */
function ascentWaypoints(side: 'east' | 'west'): Vec3[] {
  const stair = ACCESS_STAIRS[side]
  return [
    { ...stair.bottom },
    { ...stair.lowerTop },
    { ...stair.landing },
    { ...stair.upperStart },
    { ...stair.upperTop },
    { ...stair.bridgeEnd },
    accessDeckPoint(side),
  ]
}

function descentWaypoints(side: 'east' | 'west'): Vec3[] {
  return [...ascentWaypoints(side)].reverse()
}

function pushOutOfCircle(pos: Vec3, cx: number, cz: number, radius: number, clearance = 0.4) {
  const dx = pos.x - cx
  const dz = pos.z - cz
  const distance = Math.hypot(dx, dz)
  const limit = radius + clearance
  if (distance >= limit) return
  if (distance < 1e-6) {
    pos.z = cz + limit
    return
  }
  pos.x = cx + (dx / distance) * limit
  pos.z = cz + (dz / distance) * limit
}

/** Atria sit outside the shell: push the intruding sliver back toward the courtyard. */
function pushInwardFromCircle(pos: Vec3, cx: number, cz: number, radius: number, clearance = 0.15) {
  const limit = radius + clearance
  const dx = pos.x - cx
  const dz = pos.z - cz
  if (Math.hypot(dx, dz) >= limit) return
  const centerLength = Math.hypot(cx, cz) || 1
  pos.x = cx - (cx / centerLength) * limit
  pos.z = cz - (cz / centerLength) * limit
}

function pushOutOfFootprint(
  pos: Vec3,
  placement: { x: number; z: number; rotationY: number; halfWidth: number; halfDepth: number },
) {
  const dx = pos.x - placement.x
  const dz = pos.z - placement.z
  const cos = Math.cos(placement.rotationY)
  const sin = Math.sin(placement.rotationY)
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos
  const halfWidth = placement.halfWidth + 0.45
  const halfDepth = placement.halfDepth + 0.45
  if (Math.abs(localX) >= halfWidth || Math.abs(localZ) >= halfDepth) return
  const pushX = halfWidth - Math.abs(localX)
  const pushZ = halfDepth - Math.abs(localZ)
  let nextX = localX
  let nextZ = localZ
  if (pushX < pushZ) nextX = Math.sign(localX || 1) * halfWidth
  else nextZ = Math.sign(localZ || 1) * halfDepth
  pos.x = placement.x + nextX * cos + nextZ * sin
  pos.z = placement.z - nextX * sin + nextZ * cos
}

/** Clamp onto the elliptical paving (or the curved balcony). */
function clampToShell(pos: Vec3, margin = SHELL_WORLD.walkMargin) {
  const rx = SHELL.radiusX - margin
  const rz = SHELL.radiusZ - margin
  const q = Math.hypot(pos.x / rx, pos.z / rz)
  if (q > 1) {
    pos.x /= q
    pos.z /= q
  }
}

function clampToBalcony(pos: Vec3) {
  const angle = shellAngleAt(pos.x, pos.z)
  const q = Math.min(BALCONY_BAND.maxQ - 0.002, Math.max(BALCONY_BAND.minQ + 0.002, shellRadiusAt(pos.x, pos.z)))
  let nextAngle = angle
  const eastHalf = BALCONY.eastAngleRange[1] * Math.PI
  const westStart = BALCONY.westAngleRange[0] * Math.PI
  const westEnd = BALCONY.westAngleRange[1] * Math.PI
  if (!(angle <= eastHalf || angle >= Math.PI * 2 - eastHalf || (angle >= westStart && angle <= westEnd))) {
    // Snap to the nearest side: west when the point is on the left half.
    nextAngle = pos.x >= 0 ? eastHalf : westStart
  }
  pos.x = Math.cos(nextAngle) * SHELL.radiusX * q
  pos.z = Math.sin(nextAngle) * SHELL.radiusZ * q
}

/**
 * Height of the walkable surface at (x, z): curved balcony terraces, the
 * stage-side switchback stairs/bridges, or the courtyard ground. Region-based,
 * not level-aware: Character keeps a grounded visitor grounded under the
 * balcony overhang by only climbing when already elevated or on a stair.
 */
export function floorHeightAt(x: number, z: number): number {
  const access = accessHeightAtAny(x, z)
  if (access !== null) return access
  const balcony = balconyHeightAt(x, z)
  if (balcony !== null) return balcony
  return 0
}

/**
 * Height the character should ease toward. A grounded character only takes a
 * surface it can step onto (the stair foot); it stays grounded under the
 * balcony deck and under mid-flight instead of popping up through geometry.
 */
export function targetFloorHeight(currentY: number, surface: number): number {
  if (currentY > 1) return surface
  if (surface > 0 && surface - currentY < 1.2) return surface
  return currentY > 0 ? currentY : 0
}

const CAMERA_BLOCKERS: Rect[] = [WORLD.stageObstacle, WORLD.ringNorth]

function isCameraBlocked(point: Vec3, levelY: number): boolean {
  if (CAMERA_BLOCKERS.some((rect) => insideRect(rect, point.x, point.z))) return true
  if (point.y < 0.35) return true
  // Keep the follow camera inside the Sawarga shell so it never leaves the
  // facades; allow a small tolerance at the eaves.
  if (shellRadiusAt(point.x, point.z) > 1.01) return true
  // The surface floor only applies to a camera whose character is elevated;
  // from is the character's head, so ground level sits at y = 1.6.
  if (levelY > 2.6) return point.y < floorHeightAt(point.x, point.z) + 0.35
  return false
}

/**
 * Keep the follow camera out of the mall masses, the stage and the floor:
 * if the desired point is blocked, step from it toward the character's head
 * and return the closest clear point.
 */
export function clearCameraPosition(from: Vec3, to: Vec3): Vec3 {
  if (!isCameraBlocked(to, from.y)) return to
  for (let t = 0.85; t >= 0.1; t -= 0.15) {
    const candidate: Vec3 = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
    }
    if (!isCameraBlocked(candidate, from.y)) return candidate
  }
  return { ...from }
}

function stairSideForX(x: number): 'east' | 'west' {
  return x >= 0 ? 'east' : 'west'
}

function sideAngle(side: 'east' | 'west', x: number, z: number): number {
  let angle = Math.atan2(z / SHELL.radiusZ, x / SHELL.radiusX)
  if (side === 'east') {
    if (angle > Math.PI) angle -= Math.PI * 2
    const start = BALCONY.eastAngleRange[0] * Math.PI
    const end = BALCONY.eastAngleRange[1] * Math.PI
    return Math.min(end, Math.max(start, angle))
  }
  if (angle < 0) angle += Math.PI * 2
  const start = BALCONY.westAngleRange[0] * Math.PI
  const end = BALCONY.westAngleRange[1] * Math.PI
  return Math.min(end, Math.max(start, angle))
}

/** Arc waypoints along the inner terrace, ending at the target angle. */
function balconyArcPoints(side: 'east' | 'west', fromAngle: number, toAngle: number): Vec3[] {
  const start = sideAngle(
    side,
    Math.cos(fromAngle) * SHELL.radiusX,
    Math.sin(fromAngle) * SHELL.radiusZ,
  )
  const end = sideAngle(
    side,
    Math.cos(toAngle) * SHELL.radiusX,
    Math.sin(toAngle) * SHELL.radiusZ,
  )
  const steps = Math.max(1, Math.ceil(Math.abs(end - start) / 0.06))
  const points: Vec3[] = []
  for (let i = 1; i <= steps; i += 1) {
    const angle = start + ((end - start) * i) / steps
    const point = shellOffsetPoint(angle, BALCONY_BAND.deckOffset)
    points.push({ x: point.x, y: BALCONY.rowY[0], z: point.z })
  }
  return points
}

/**
 * Waypoints a scripted walk should follow. Ground → balcony goes up the
 * stage-side switchback stair, across the short bridge, then follows the
 * curved terrace to the seat. Crossing between balconies descends, crosses
 * the courtyard and re-ascends the other stair.
 */
export function planWalkRoute(from: Vec3, to: Vec3): Vec3[] {
  const fromUpper = from.y > 1
  const toUpper = to.y > 1

  if (!fromUpper && !toUpper) return [to]

  const toSide = stairSideForX(to.x)
  const toAngle = sideAngle(toSide, to.x, to.z)

  if (!fromUpper && toUpper) {
    return [
      ...ascentWaypoints(toSide),
      ...balconyArcPoints(toSide, accessDeckAngle(toSide), toAngle),
      to,
    ]
  }

  const fromSide = stairSideForX(from.x)
  const fromAngle = sideAngle(fromSide, from.x, from.z)

  if (fromUpper && !toUpper) {
    return [
      ...balconyArcPoints(fromSide, fromAngle, accessDeckAngle(fromSide)),
      ...descentWaypoints(fromSide).slice(1),
      to,
    ]
  }

  if (fromSide === toSide) {
    return [...balconyArcPoints(fromSide, fromAngle, toAngle), to]
  }

  return [
    ...balconyArcPoints(fromSide, fromAngle, accessDeckAngle(fromSide)),
    ...descentWaypoints(fromSide).slice(1),
    ...ascentWaypoints(toSide),
    ...balconyArcPoints(toSide, accessDeckAngle(toSide), toAngle),
    to,
  ]
}

/**
 * Clamp a position into the walkable world. Mutates in place.
 * Upper level (y > 1): the curved balcony band plus the switchback stairs and
 * bridges are walkable. Leaving an access structure is clamped back to its
 * edge; leaving the balcony is clamped to the local band edge; a true fall
 * drops to the courtyard instead of snapping across the venue.
 * Ground: the Sawarga ellipse inside the facades; the stage, board, booth,
 * atria drums, and venue planters push the character out.
 */
export function resolveWalkable(pos: Vec3): void {
  if (pos.y > 1) {
    if (clampToAccess(pos)) return
    if (balconyHeightAt(pos.x, pos.z) !== null) return
    if (nearBalconyBand(pos.x, pos.z)) {
      clampToBalcony(pos)
      return
    }
    // No local balcony or access surface: fall to the courtyard at this XZ
    // rather than teleporting to the nearest balcony end.
    pos.y = 0
    resolveGround(pos)
    return
  }

  resolveGround(pos)
}

function resolveGround(pos: Vec3): void {
  clampToShell(pos)

  // The stage backdrop/hero wall closes the north end of the event floor.
  if (pos.z < WORLD.courtyard.minZ) pos.z = WORLD.courtyard.minZ

  if (insideRect(WORLD.stageObstacle, pos.x, pos.z)) {
    pushOutOfRect(WORLD.stageObstacle, pos)
    clampToShell(pos)
  }

  pushOutOfFootprint(pos, WORLD.southEdge.board)
  pushOutOfFootprint(pos, WORLD.southEdge.booth)

  for (const atrium of ATRIA_CIRCLES) {
    pushInwardFromCircle(pos, atrium.x, atrium.z, atrium.radius)
  }
  for (const [x, z] of VENUE_TREES) {
    pushOutOfCircle(pos, x, z, 2.2, 0.15)
  }

  clampToShell(pos)
}
