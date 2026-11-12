import type * as THREE from 'three'

/**
 * Invalidate and recompute an InstancedMesh's cached bounds after its instance
 * matrices change. Three.js uses the bounds for raycasting and frustum culling;
 * leaving them stale makes visible seats unclickable or culls the whole mesh.
 */
export function refreshInstancedBounds(
  mesh: THREE.InstancedMesh | null | undefined,
): void {
  if (!mesh || mesh.count === 0) return
  mesh.boundingBox = null
  mesh.boundingSphere = null
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
}
