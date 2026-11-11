import * as THREE from 'three';
import { GeometryBatch } from '../batch';
import type { Materials } from '../materials';
import {
  ACCESS_STAIRS,
  BALCONY,
  VENUE_WORLD,
  shellInwardNormal,
  shellOffsetPoint,
  shellPoint,
} from './layout';

export interface BalconyCollision {
  x: number;
  z: number;
  radius: number;
}

export interface BalconyResult {
  group: THREE.Group;
  collisions: BalconyCollision[];
  deckAngles: { east: [number, number]; west: [number, number] };
}

const TAU = Math.PI * 2;

function samples(start: number, end: number, count = 28): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) out.push(start + ((end - start) * i) / (count - 1));
  return out;
}

/**
 * Curved horizontal slab between two inward offsets. Builds top, bottom,
 * outer/inner vertical sides and end caps as one geometry.
 */
function curvedSlabGeometry(
  angles: number[],
  innerOffset: number,
  outerOffset: number,
  topY: number,
  thickness: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = angles.length;

  for (let i = 0; i < n; i += 1) {
    const angle = angles[i];
    const inner = shellOffsetPoint(angle, innerOffset);
    const outer = shellOffsetPoint(angle, outerOffset);
    const yBottom = topY - thickness;
    const u = i / (n - 1);
    // 0 inner top, 1 outer top, 2 inner bottom, 3 outer bottom
    positions.push(inner.x, topY, inner.z);
    positions.push(outer.x, topY, outer.z);
    positions.push(inner.x, yBottom, inner.z);
    positions.push(outer.x, yBottom, outer.z);
    uvs.push(u, 0, u, 1, u, 0, u, 1);
  }

  for (let i = 0; i < n - 1; i += 1) {
    const a = i * 4;
    const b = (i + 1) * 4;
    // Top: inner_i -> inner_next -> outer_next -> outer_i (faces +Y).
    indices.push(a, b, b + 1, a, b + 1, a + 1);
    // Bottom: reversed.
    indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    // Outer side.
    indices.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3);
    // Inner side.
    indices.push(a, a + 2, b + 2, a, b + 2, b);
  }
  // End caps.
  const last = (n - 1) * 4;
  indices.push(0, 1, 3, 0, 3, 2);
  indices.push(last, last + 2, last + 3, last, last + 3, last + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addOrientedBox(
  batch: GeometryBatch,
  key: string,
  width: number,
  height: number,
  depth: number,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
): void {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  batch.add(key, geometry, matrix);
}

function addSegmentBox(
  batch: GeometryBatch,
  key: string,
  from: { x: number; z: number },
  to: { x: number; z: number },
  y: number,
  height: number,
  thickness: number,
): void {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  const yaw = Math.atan2(dx, dz);
  const position = new THREE.Vector3((from.x + to.x) / 2, y + height / 2, (from.z + to.z) / 2);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  addOrientedBox(batch, key, thickness, height, length, position, quaternion);
}

function addGlassPanel(
  batch: GeometryBatch,
  from: { x: number; z: number },
  to: { x: number; z: number },
  y: number,
  height: number,
): void {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  const yaw = Math.atan2(dx, dz);
  const geometry = new THREE.PlaneGeometry(length, height);
  const position = new THREE.Vector3((from.x + to.x) / 2, y + height / 2, (from.z + to.z) / 2);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  batch.add('venueGlass', geometry, matrix);
}

function addRailing(
  batch: GeometryBatch,
  angles: number[],
  offset: number,
  baseY = BALCONY.rowY[0],
  glassHeight = 0.95,
): void {
  const points = angles.map((angle) => shellOffsetPoint(angle, offset));
  for (let i = 0; i < points.length - 1; i += 1) {
    addGlassPanel(batch, points[i], points[i + 1], baseY + 0.06, glassHeight);
  }
  // Frameless glass balustrade: no posts or top rail across the seated
  // sightline. A slim metal shoe at the base is implied by the deck fascia.
  // End caps and the access bridges still carry the structural rails.
}

function addBridge(
  batch: GeometryBatch,
  from: THREE.Vector3,
  to: THREE.Vector3,
  width = 2.6,
): void {
  const direction = to.clone().sub(from);
  const length = direction.length();
  if (length < 0.1) return;
  const yaw = Math.atan2(direction.x, direction.z);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const mid = from.clone().add(to).multiplyScalar(0.5);
  // `from`/`to` describe the walking surface; the slab hangs below it.
  addOrientedBox(batch, 'venueStone', width, 0.24, length, mid.clone().add(new THREE.Vector3(0, -0.12, 0)), quaternion);
  addOrientedBox(batch, 'venueMetal', width + 0.12, 0.06, 0.06, mid.clone().add(new THREE.Vector3(0, 0.02, 0)), quaternion);
  const perp = direction.clone().normalize().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(width / 2);
  for (const side of [-1, 1]) {
    const railMid = mid.clone().addScaledVector(perp, side).add(new THREE.Vector3(0, 0.5, 0));
    addOrientedBox(batch, 'venueGlass', 0.035, 1.0, length, railMid, quaternion);
    const topMid = mid.clone().addScaledVector(perp, side).add(new THREE.Vector3(0, 1.08, 0));
    addOrientedBox(batch, 'venueMetal', 0.07, 0.07, length, topMid, quaternion);
  }
}

function addSlopedBox(
  batch: GeometryBatch,
  key: string,
  from: THREE.Vector3,
  to: THREE.Vector3,
  width: number,
  height: number,
  lateralOffset = 0,
  verticalOffset = 0,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const run = Math.hypot(dx, dz);
  if (run < 0.02) return;
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.atan2(dy, run);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  const horizontal = new THREE.Vector3(dx, 0, dz).normalize();
  const perp = new THREE.Vector3(-horizontal.z, 0, horizontal.x);
  const mid = from
    .clone()
    .add(to)
    .multiplyScalar(0.5)
    .addScaledVector(perp, lateralOffset)
    .add(new THREE.Vector3(0, verticalOffset, 0));
  addOrientedBox(batch, key, width, height, Math.hypot(run, dy), mid, quaternion);
}

/** Solid stepped flight with a soffit, side stringers and handrails. */
function addStairFlight(
  batch: GeometryBatch,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  width: number,
  steps: number,
): void {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const run = Math.hypot(dx, dz);
  const rise = to.y - from.y;
  if (run < 0.1 || steps < 1) return;

  const horizontal = new THREE.Vector3(dx, 0, dz).normalize();
  const perp = new THREE.Vector3(-horizontal.z, 0, horizontal.x);
  const yaw = Math.atan2(dx, dz);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const tread = run / steps;
  const stepRise = rise / steps;

  // Solid stepped mass: each tread is a box rising one step above the last.
  for (let i = 0; i < steps; i += 1) {
    const topY = from.y + stepRise * (i + 1);
    const height = stepRise + 0.06;
    const position = new THREE.Vector3(
      from.x + horizontal.x * tread * (i + 0.5),
      topY - height / 2,
      from.z + horizontal.z * tread * (i + 0.5),
    );
    addOrientedBox(batch, 'venueStone', width, height, tread + 0.02, position, quaternion);
  }

  // Soffit and side stringers close the underside of the flight.
  const soffitStart = new THREE.Vector3(from.x, from.y - 0.06, from.z);
  const soffitEnd = new THREE.Vector3(to.x, to.y - 0.06, to.z);
  addSlopedBox(batch, 'venueConcrete', soffitStart, soffitEnd, width - 0.2, 0.2);
  for (const sign of [-1, 1]) {
    addSlopedBox(
      batch,
      'venueMetal',
      soffitStart,
      soffitEnd,
      0.18,
      0.38,
      sign * (width / 2 - 0.09),
      -0.16,
    );
  }

  // Handrails follow the stair pitch.
  const railStart = new THREE.Vector3(from.x, from.y + 0.95, from.z);
  const railEnd = new THREE.Vector3(to.x, to.y + 0.95, to.z);
  for (const sign of [-1, 1]) {
    addSlopedBox(batch, 'venueMetal', railStart, railEnd, 0.06, 0.06, sign * (width / 2 + 0.06));
  }

  for (let i = 1; i < steps; i += 4) {
    const t = i / steps;
    const x = from.x + dx * t;
    const z = from.z + dz * t;
    const topY = from.y + rise * t;
    for (const sign of [-1, 1]) {
      const post = new THREE.CylinderGeometry(0.035, 0.045, 0.95, 6);
      post.translate(x + perp.x * sign * (width / 2 + 0.06), topY + 0.475, z + perp.z * sign * (width / 2 + 0.06));
      batch.add('venueMetal', post);
    }
  }
}

function addStairLanding(
  batch: GeometryBatch,
  stair: (typeof ACCESS_STAIRS)['east'],
  sign: 1 | -1,
): void {
  const { landing, landingSize } = stair;
  const platform = new THREE.BoxGeometry(landingSize, 0.26, landingSize);
  platform.translate(landing.x, landing.y - 0.13, landing.z);
  batch.add('venueStone', platform);

  // Two columns ground the cantilevered landing.
  const columnHeight = landing.y - 0.26;
  if (columnHeight > 0.5) {
    for (const offset of [-0.8, 0.8]) {
      const column = new THREE.CylinderGeometry(0.13, 0.17, columnHeight, 10);
      column.translate(landing.x + offset, columnHeight / 2, landing.z - landingSize / 2 + 0.35);
      batch.add('venueMetal', column);
    }
  }

  const half = landingSize / 2;
  const railY = landing.y + 0.06;
  const topY = landing.y + 1.01;
  // North edge, the outer side edge, and the unused part of the inner edge.
  // The south edge and the upper-flight opening stay clear.
  const edges: Array<[{ x: number; z: number }, { x: number; z: number }]> = [
    [
      { x: landing.x - half, z: landing.z - half },
      { x: landing.x + half, z: landing.z - half },
    ],
    [
      { x: landing.x - sign * half, z: landing.z - half },
      { x: landing.x - sign * half, z: landing.z + half },
    ],
    [
      { x: landing.x + sign * half, z: landing.z - half },
      { x: landing.x + sign * half, z: stair.upperStart.z },
    ],
  ];
  for (const [from, to] of edges) {
    addSegmentBox(batch, 'venueGlass', from, to, railY, 0.95, 0.035);
    addSegmentBox(batch, 'venueMetal', from, to, topY, 0.05, 0.05);
  }
}

function addStairTower(
  batch: GeometryBatch,
  side: 'east' | 'west',
  sign: 1 | -1,
): void {
  const stair = ACCESS_STAIRS[side];
  addStairFlight(batch, stair.bottom, stair.lowerTop, stair.width, stair.lowerSteps);
  addStairLanding(batch, stair, sign);
  addStairFlight(batch, stair.upperStart, stair.upperTop, stair.width, stair.upperSteps);
  addBridge(
    batch,
    new THREE.Vector3(stair.upperTop.x, stair.upperTop.y, stair.upperTop.z),
    new THREE.Vector3(stair.bridgeEnd.x, stair.bridgeEnd.y, stair.bridgeEnd.z),
    stair.width,
  );
}

function addPortal(
  batch: GeometryBatch,
  surface: THREE.Vector3,
  direction: THREE.Vector3,
  width = 2.7,
  height = 3.2,
): void {
  const yaw = Math.atan2(direction.x, direction.z);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const tangent = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  for (const sign of [-1, 1]) {
    addOrientedBox(
      batch,
      'venueMetal',
      0.16,
      height,
      0.22,
      surface.clone().addScaledVector(tangent, sign * (width / 2 + 0.08)).add(new THREE.Vector3(0, height / 2, 0)),
      quaternion,
    );
  }
  addOrientedBox(
    batch,
    'venueMetal',
    width + 0.32,
    0.16,
    0.22,
    surface.clone().add(new THREE.Vector3(0, height, 0)),
    quaternion,
  );
}

function atriumCenter(spec: { angle: number; radius: number; offset: number }): THREE.Vector3 {
  const point = shellPoint(spec.angle * Math.PI);
  const inward = shellInwardNormal(spec.angle * Math.PI);
  return new THREE.Vector3(
    point.x - inward.x * spec.offset,
    0,
    point.z - inward.z * spec.offset,
  );
}

function connectAtrium(
  batch: GeometryBatch,
  endAngle: number,
  spec: { angle: number; radius: number; offset: number },
): void {
  const deckEnd = shellOffsetPoint(endAngle, 3);
  const center = atriumCenter(spec);
  const direction = new THREE.Vector3(deckEnd.x - center.x, 0, deckEnd.z - center.z);
  const distance = direction.length();
  if (distance <= spec.radius) return;
  direction.normalize();
  const surface = center.clone().addScaledVector(direction, spec.radius);
  const top = new THREE.Vector3(deckEnd.x, BALCONY.rowY[0], deckEnd.z);
  const surfaceTop = new THREE.Vector3(surface.x, BALCONY.rowY[0], surface.z);
  addBridge(batch, surfaceTop, top, 2.7);
  addPortal(batch, surfaceTop, direction, 2.8, 3.2);
}

export function buildCurvedBalconies(materials: Materials): BalconyResult {
  const batch = new GeometryBatch();
  const collisions: BalconyCollision[] = [];
  const eastAngles = samples(BALCONY.eastAngleRange[0] * Math.PI, BALCONY.eastAngleRange[1] * Math.PI, 34);
  const westAngles = samples(BALCONY.westAngleRange[0] * Math.PI, BALCONY.westAngleRange[1] * Math.PI, 34);

  for (const angles of [eastAngles, westAngles]) {
    // Three stepped terraces, outer/high to inner/low.
    batch.add('venueStone', curvedSlabGeometry(angles, 0.18, 2.0, BALCONY.rowY[2], 0.55));
    batch.add('venueStone', curvedSlabGeometry(angles, 2.0, 4.0, BALCONY.rowY[1], 0.5));
    batch.add('venueStone', curvedSlabGeometry(angles, 4.0, 6.0, BALCONY.rowY[0], 0.5));
    // Soffit and inner fascia.
    batch.add('venueConcrete', curvedSlabGeometry(angles, 0.18, 6.0, 4.72, 0.2));
    addRailing(batch, angles, 6.0, BALCONY.rowY[0], 1.0);

    // End railings.
    const first = angles[0];
    const last = angles[angles.length - 1];
    for (const angle of [first, last]) {
      const inner = shellOffsetPoint(angle, 0.18);
      const outer = shellOffsetPoint(angle, 6.0);
      addSegmentBox(batch, 'venueGlass', inner, outer, BALCONY.rowY[0] + 0.08, 1.0, 0.035);
      addSegmentBox(batch, 'venueMetal', inner, outer, BALCONY.rowY[0] + 1.08, 0.07, 0.07);
    }

    // Support columns under the outer (shell-side) edge, behind the seats so
    // they never cross a seated visitor's sightline to the stage.
    for (let i = 2; i < angles.length - 1; i += 5) {
      const angle = angles[i];
      const point = shellOffsetPoint(angle, 0.8);
      const column = new THREE.CylinderGeometry(0.18, 0.22, 4.8, 10);
      column.translate(point.x, 2.4, point.z);
      batch.add('venueMetal', column);
      collisions.push({ x: point.x, z: point.z, radius: 0.35 });
    }
  }

  // Atria portals / bridges. East south -> Cibadak, east north -> Cileutik,
  // west south -> Ciunik. West north has the new stair tower.
  connectAtrium(batch, BALCONY.eastAngleRange[1] * Math.PI, BALCONY.atria.cibadak);
  connectAtrium(batch, BALCONY.eastAngleRange[0] * Math.PI, BALCONY.atria.cileutik);
  connectAtrium(batch, BALCONY.westAngleRange[0] * Math.PI, BALCONY.atria.ciunik);

  // Two switchback stairs beside the stage, with a short bridge onto the
  // inner terrace at the north end of each tribune band.
  addStairTower(batch, 'east', 1);
  addStairTower(batch, 'west', -1);

  // Clone materials double-sided for the custom curved slabs.
  const venueStone = materials.stone.clone();
  venueStone.side = THREE.DoubleSide;
  const venueConcrete = materials.concrete.clone();
  venueConcrete.side = THREE.DoubleSide;
  const venueMetal = materials.metal.clone();
  venueMetal.side = THREE.DoubleSide;
  const venueGlass = materials.glass.clone();
  venueGlass.side = THREE.DoubleSide;
  venueGlass.opacity = 0.16;

  const group = batch.build(
    {
      venueStone,
      venueConcrete,
      venueMetal,
      venueGlass,
    },
    {
      venueStone: { castShadow: true, receiveShadow: true },
      venueConcrete: { castShadow: true, receiveShadow: true },
      venueMetal: { castShadow: true, receiveShadow: true },
      venueGlass: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    },
  );
  group.name = 'curved-venue-balconies';
  group.userData.permanent = true;

  return {
    group,
    collisions,
    deckAngles: {
      east: [BALCONY.eastAngleRange[0] * Math.PI, BALCONY.eastAngleRange[1] * Math.PI],
      west: [BALCONY.westAngleRange[0] * Math.PI, BALCONY.westAngleRange[1] * Math.PI],
    },
  };
}

void TAU;
void VENUE_WORLD;
