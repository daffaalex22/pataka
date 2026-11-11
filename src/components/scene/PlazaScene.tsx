'use client'

import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { Category, EventInfo, Lang, Seat } from '@/lib/types'
import { Character, FollowCamera, useKeyboard, type KeysState, type MoveVector } from '@/components/scene/Character'
import { AutoWalk } from '@/components/scene/AutoWalk'
import { PreviewCamera } from '@/components/scene/PreviewCamera'
import { Board, Booth } from '@/components/world/Interactables'
import { LookDrag } from '@/components/scene/LookDrag'
import { SawargaEnvironment } from '@/components/scene/SawargaEnvironment'
import { Stage } from '@/components/scene/summaba/Stage'

const STATUS_3D: Record<string, string> = {
  available: '#2dd4bf',
  held: '#fbbf24',
  sold: '#3a3949',
}

/**
 * Small procedural night environment so glass, metal, and the paving pick up
 * believable reflections without loading a sky HDRI into the ticketing scene.
 */
function NightEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const texture = pmrem.fromScene(room, 0.04).texture
    // R3F's scene is an imperative Three.js object; these assignments are the
    // supported way to attach image-based lighting.
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = texture
    scene.environmentIntensity = 0.14
    return () => {
      scene.environment = null
      scene.environmentIntensity = 1
      texture.dispose()
      pmrem.dispose()
      room.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const material of materials) material.dispose()
        }
      })
    }
  }, [gl, scene])

  return null
}


function Venue() {
  const lightPoints = useMemo(() => {
    const points: [number, number, number][] = []
    for (let line = 0; line < 3; line++) {
      const z = -6 + line * 8
      for (let i = 0; i < 26; i++) {
        const t = i / 25
        const x = -22 + t * 44
        const y = 6.4 + Math.sin(t * Math.PI) * 1.4 + Math.sin(i * 1.7) * 0.08
        points.push([x, y, z + Math.sin(i * 2.3) * 0.15])
      }
    }
    return points
  }, [])
  const bulbsRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = bulbsRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    lightPoints.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [lightPoints])

  return (
    <group>
      <color attach="background" args={['#07060d']} />
      <fog attach="fog" args={['#07060d', 55, 130]} />

      <SawargaEnvironment />
      <Stage />

      {/* string lights */}
      <instancedMesh ref={bulbsRef} args={[undefined, undefined, lightPoints.length]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshBasicMaterial color="#ffd88a" toneMapped={false} />
      </instancedMesh>

      {/* moon light */}
      <ambientLight intensity={0.16} color="#8b83ff" />
      <hemisphereLight args={['#9fb4ff', '#1a1426', 0.28]} />
      <directionalLight position={[10, 24, 8]} intensity={0.65} color="#aab8ff" />
      {/* warm practicals: stage wash + the two balcony access ends */}
      <pointLight position={[0, 8, -11]} intensity={55} distance={55} decay={2} color="#ffd9a2" />
      <pointLight position={[27, 7.2, 11]} intensity={18} distance={22} decay={2} color="#ffc98a" />
      <pointLight position={[-27, 7.2, 11]} intensity={18} distance={22} decay={2} color="#ffc98a" />
    </group>
  )
}

function Seats({
  seats,
  selectedId,
  onSelect,
  highlightCategory = null,
  dragStateRef,
}: {
  seats: Seat[]
  selectedId: string | null
  onSelect: (seat: Seat) => void
  highlightCategory?: string | null
  dragStateRef?: React.RefObject<{ dragging: boolean }>
}) {
  const padsRef = useRef<THREE.InstancedMesh>(null)
  const backsRef = useRef<THREE.InstancedMesh>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const pads = padsRef.current
    const backs = backsRef.current
    if (!pads || !backs) return

    seats.forEach((seat, index) => {
      const isSelected = seat.id === selectedId
      const isHovered = index === hovered
      const isHighlighted = !isSelected && !isHovered && highlightCategory === seat.categoryKey
      const lift = isSelected ? 0.18 : isHovered ? 0.08 : isHighlighted ? 0.1 : 0
      const scale = isSelected ? 1.45 : isHovered ? 1.18 : 1
      // Tribune seats follow the curved shell and face the stage; the floor
      // seats keep their original axis-aligned pads.
      const rotationY =
        seat.categoryKey === 'TRIB'
          ? Math.atan2(seat.x, seat.z + 13)
          : 0

      dummy.position.set(seat.x, seat.y + 0.55 + lift, seat.z)
      dummy.rotation.set(0, rotationY, 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      pads.setMatrixAt(index, dummy.matrix)

      dummy.position.set(
        seat.x + Math.sin(rotationY) * 0.42,
        seat.y + 0.78 + lift,
        seat.z + Math.cos(rotationY) * 0.42,
      )
      dummy.updateMatrix()
      backs.setMatrixAt(index, dummy.matrix)

      const base = STATUS_3D[seat.status] ?? STATUS_3D.available
      color.set(isSelected ? '#f5c542' : base)
      if (isHovered && !isSelected) color.offsetHSL(0, 0.15, 0.12)
      if (isHighlighted) color.offsetHSL(0, 0.1, 0.1)
      pads.setColorAt(index, color)
      backs.setColorAt(index, color)
    })

    pads.instanceMatrix.needsUpdate = true
    backs.instanceMatrix.needsUpdate = true
    if (pads.instanceColor) pads.instanceColor.needsUpdate = true
    if (backs.instanceColor) backs.instanceColor.needsUpdate = true
  }, [seats, selectedId, hovered, highlightCategory, dummy, color])

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (event.instanceId !== undefined && event.instanceId !== hovered) setHovered(event.instanceId)
  }
  const handlePointerOut = () => setHovered(null)
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (dragStateRef?.current.dragging) return
    if (event.instanceId !== undefined) onSelect(seats[event.instanceId])
  }

  return (
    <group>
      <instancedMesh
        ref={padsRef}
        args={[undefined, undefined, seats.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[0.78, 0.24, 0.78]} />
        <meshStandardMaterial roughness={0.5} metalness={0.15} />
      </instancedMesh>

      <instancedMesh
        ref={backsRef}
        args={[undefined, undefined, seats.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[0.78, 0.4, 0.14]} />
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>
    </group>
  )
}

function WalkRig({
  moveRef,
  paused,
  characterRef,
  lookYawRef,
  pitchRef,
  dragStateRef,
  autoWalkSeat,
  onAutoWalkArrived,
  onAutoWalkCancel,
}: {
  moveRef: React.RefObject<MoveVector>
  paused: boolean
  characterRef: React.RefObject<THREE.Group | null>
  lookYawRef: React.RefObject<number>
  pitchRef: React.RefObject<number>
  dragStateRef: React.RefObject<{ dragging: boolean }>
  autoWalkSeat?: Seat | null
  onAutoWalkArrived?: (seat: Seat) => void
  onAutoWalkCancel?: () => void
}) {
  const keysRef = useRef<KeysState>({})
  useKeyboard(keysRef)
  return (
    <>
      <Character
        moveRef={moveRef}
        keysRef={keysRef}
        characterRef={characterRef}
        paused={paused}
        scripted={Boolean(autoWalkSeat)}
      />
      {!paused && (
        <FollowCamera
          characterRef={characterRef}
          lookYawRef={lookYawRef}
          pitchRef={pitchRef}
          scripted={Boolean(autoWalkSeat)}
        />
      )}
      {!paused && <LookDrag yawRef={lookYawRef} pitchRef={pitchRef} dragStateRef={dragStateRef} />}
      {autoWalkSeat && (
        <AutoWalk
          characterRef={characterRef}
          moveRef={moveRef}
          keysRef={keysRef}
          seat={autoWalkSeat}
          onArrived={(seat) => onAutoWalkArrived?.(seat)}
          onCancel={() => onAutoWalkCancel?.()}
        />
      )}
    </>
  )
}

function CameraReset({ mode }: { mode: 'orbit' | 'walk' }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as unknown as
    | { target: THREE.Vector3; update?: () => void }
    | null
  useEffect(() => {
    if (mode === 'walk') return
    camera.position.set(20, 17, 20)
    if (controls) {
      controls.target.set(-2, 3, -7)
      controls.update?.()
    }
  }, [mode, camera, controls])
  return null
}

export default function PlazaScene({
  seats,
  selectedId,
  onSelect,
  mode = 'orbit',
  moveRef,
  previewSeat = null,
  maxDpr = 1.5,
  paused = false,
  showInteractables = false,
  boardData,
  onBoothTap,
  onBoardTap,
  highlightCategory = null,
  autoWalkSeat = null,
  onAutoWalkArrived,
  onAutoWalkCancel,
  characterRef: externalCharacterRef,
}: {
  seats: Seat[]
  selectedId: string | null
  onSelect: (seat: Seat) => void
  mode?: 'orbit' | 'walk'
  moveRef?: React.RefObject<MoveVector>
  previewSeat?: Seat | null
  maxDpr?: number
  paused?: boolean
  showInteractables?: boolean
  boardData?: { event: EventInfo; categories: Category[]; lang: Lang }
  onBoothTap?: () => void
  onBoardTap?: () => void
  highlightCategory?: string | null
  autoWalkSeat?: Seat | null
  onAutoWalkArrived?: (seat: Seat) => void
  onAutoWalkCancel?: () => void
  characterRef?: React.RefObject<THREE.Group | null>
}) {
  const [dpr, setDpr] = useState(maxDpr)
  const internalCharacterRef = useRef<THREE.Group | null>(null)
  const characterRef = externalCharacterRef ?? internalCharacterRef
  const lookYawRef = useRef(0)
  const pitchRef = useRef(0)
  const dragStateRef = useRef({ dragging: false })

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [20, 17, 20], fov: 55 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(maxDpr)}
        onFallback={() => setDpr(1)}
      />
      <CameraReset mode={mode} />
      <NightEnvironment />
      <Suspense fallback={null}>
        <Venue />
        <Seats
          seats={seats}
          selectedId={selectedId}
          onSelect={onSelect}
          highlightCategory={highlightCategory}
          dragStateRef={dragStateRef}
        />
        {showInteractables && boardData && (
          <Board
            event={boardData.event}
            categories={boardData.categories}
            lang={boardData.lang}
            onTap={onBoardTap}
            dragStateRef={dragStateRef}
          />
        )}
        {showInteractables && onBoothTap && <Booth onTap={onBoothTap} dragStateRef={dragStateRef} />}
        {mode === 'walk' && moveRef && (
          <WalkRig
            moveRef={moveRef}
            paused={paused || Boolean(previewSeat)}
            characterRef={characterRef}
            lookYawRef={lookYawRef}
            pitchRef={pitchRef}
            dragStateRef={dragStateRef}
            autoWalkSeat={autoWalkSeat}
            onAutoWalkArrived={onAutoWalkArrived}
            onAutoWalkCancel={onAutoWalkCancel}
          />
        )}
      </Suspense>
      {mode === 'orbit' && (
        <OrbitControls
          makeDefault
          enabled={!previewSeat && !paused}
          target={[-2, 3, -7]}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={15}
          maxDistance={80}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.05}
        />
      )}
      {previewSeat && <PreviewCamera seat={previewSeat} />}
    </Canvas>
  )
}
