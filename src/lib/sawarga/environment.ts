import * as THREE from 'three'
import { Materials } from './scene/materials'
import { buildPaving } from './scene/paving'
import { buildFacades, type FacadeAnchors } from './scene/facades'
import { buildLandscape } from './scene/landscape'
import { buildContext } from './scene/context'
import { buildBranding } from './scene/branding'
import { buildCurvedBalconies } from './scene/venue/balconies'
import { BOARD_FOOTPRINT, BOOTH_FOOTPRINT, VENUE_WORLD } from './scene/venue/layout'

export interface SawargaEnvironmentOptions {
  /** Renderer used for anisotropy limits only; no render state is changed. */
  renderer: THREE.WebGLRenderer
  quality?: 'low' | 'medium' | 'high'
  onProgress?: (loaded: number, total: number) => void
}

export interface SawargaEnvironment {
  /** Authored at the origin, Y-up, meters. */
  group: THREE.Group
  anchors: FacadeAnchors
  /** Static collision hints for the ticketing walkability layer. */
  colliders: {
    boxes: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>
    circles: Array<{ x: number; z: number; radius: number }>
  }
  dispose: () => void
}

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry) geometries.add(mesh.geometry)
    if (mesh.material) {
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of list) materials.add(material)
    }
  })

  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) value.dispose()
    }
    material.dispose()
  }
}

/**
 * Builds the Sawarga Courtyard shell used by the ticketing venue.
 *
 * Includes only permanent architecture and landscaping: paving, facades,
 * atria, landscape, roof/context, branding, and the curved shell-attached
 * balconies/access. It deliberately excludes lighting, sky/HDRI, event
 * proxies, layout overlays, controls, and UI so the ticketing scene keeps its
 * own night mood and interactions.
 */
export async function createSawargaEnvironment(
  options: SawargaEnvironmentOptions,
): Promise<SawargaEnvironment> {
  const { renderer, quality = 'medium', onProgress } = options
  const manager = new THREE.LoadingManager()
  manager.onProgress = (_url, loaded, total) => onProgress?.(loaded, total)

  const materials = await Materials.load(renderer, manager, (progress) =>
    onProgress?.(progress.loaded, progress.total),
  )

  const group = new THREE.Group()
  group.name = 'sawarga-environment'

  const paving = buildPaving(materials, quality)
  group.add(paving.group)

  const facades = buildFacades(materials)
  group.add(facades.group)

  const circles: Array<{ x: number; z: number; radius: number }> = []
  const boxes: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = []
  const collisionSink = {
    addCircle: (x: number, z: number, radius: number) => circles.push({ x, z, radius }),
    addBox: (minX: number, maxX: number, minZ: number, maxZ: number) =>
      boxes.push({ minX, maxX, minZ, maxZ }),
  }

  const landscape = buildLandscape(materials, collisionSink)
  group.add(landscape.group)

  group.add(buildContext(materials))
  group.add(buildBranding(materials, facades.anchors))

  for (const column of facades.portalColumns) {
    circles.push({ x: column.x, z: column.z, radius: column.radius })
  }

  const balconies = buildCurvedBalconies(materials)
  group.add(balconies.group)
  circles.push(...balconies.collisions)

  // Event obstacles the character must walk around, mirroring the ticketing
  // world contract.
  boxes.push({ ...VENUE_WORLD.stageObstacle })
  boxes.push({ ...BOARD_FOOTPRINT })
  boxes.push({ ...BOOTH_FOOTPRINT })

  group.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.frustumCulled = true
    }
  })

  let disposed = false
  return {
    group,
    anchors: facades.anchors,
    colliders: { boxes, circles },
    dispose: () => {
      if (disposed) return
      disposed = true
      group.removeFromParent()
      disposeTree(group)
      group.clear()
    },
  }
}
