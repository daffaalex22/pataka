import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { refreshInstancedBounds } from '../src/lib/instancedBounds'

function place(mesh: THREE.InstancedMesh, x: number) {
  const dummy = new THREE.Object3D()
  dummy.position.set(x, 0, 0)
  dummy.updateMatrix()
  mesh.setMatrixAt(0, dummy.matrix)
  mesh.instanceMatrix.needsUpdate = true
}

function raycastAt(mesh: THREE.InstancedMesh, x: number) {
  const raycaster = new THREE.Raycaster()
  raycaster.set(new THREE.Vector3(x, 0, 5), new THREE.Vector3(0, 0, -1))
  const hits: THREE.Intersection[] = []
  mesh.raycast(raycaster, hits)
  return hits
}

describe('refreshInstancedBounds', () => {
  it('restores raycasting after an instance moves outside the cached bounds', () => {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1,
    )

    place(mesh, 0)
    refreshInstancedBounds(mesh)
    expect(raycastAt(mesh, 0).length).toBeGreaterThan(0)

    // Moving the instance alone leaves the cached sphere at the origin.
    place(mesh, 40)
    expect(raycastAt(mesh, 40)).toHaveLength(0)

    refreshInstancedBounds(mesh)
    expect(raycastAt(mesh, 40).length).toBeGreaterThan(0)
  })
})
