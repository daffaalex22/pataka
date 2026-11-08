'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Category, EventInfo, Lang, Seat } from '@/lib/types'
import { Character, FollowCamera, useKeyboard, type KeysState, type MoveVector } from '@/components/scene/Character'
import { AutoWalk } from '@/components/scene/AutoWalk'
import { PreviewCamera } from '@/components/scene/PreviewCamera'
import { Board, Booth } from '@/components/world/Interactables'
import { CourtyardFloor } from '@/components/scene/summaba/CourtyardFloor'
import { LookDrag } from '@/components/scene/LookDrag'
import { MallRing } from '@/components/scene/summaba/MallRing'
import { Atriums } from '@/components/scene/summaba/Atriums'
import { Stage } from '@/components/scene/summaba/Stage'
import { Balconies } from '@/components/scene/summaba/Balconies'
import { DowntownWalk } from '@/components/scene/summaba/DowntownWalk'
import { Sawarga } from '@/components/scene/summaba/Sawarga'

const STATUS_3D: Record<string, string> = {
  available: '#2dd4bf',
  held: '#fbbf24',
  sold: '#3a3949',
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

      <CourtyardFloor />
      <MallRing />
      <Atriums />
      <Stage />
      <Balconies />
      <Sawarga />
      <DowntownWalk />

      {/* string lights */}
      <instancedMesh ref={bulbsRef} args={[undefined, undefined, lightPoints.length]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshBasicMaterial color="#ffd88a" toneMapped={false} />
      </instancedMesh>

      {/* moon light */}
      <ambientLight intensity={0.32} color="#8b83ff" />
      <hemisphereLight args={['#9fb4ff', '#1a1426', 0.5]} />
      <directionalLight position={[10, 24, 8]} intensity={1.1} color="#aab8ff" />
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

      dummy.position.set(seat.x, seat.y + 0.55 + lift, seat.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      pads.setMatrixAt(index, dummy.matrix)

      dummy.position.set(seat.x, seat.y + 0.95 + lift, seat.z + 0.42)
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

  return (
    <group>
      <instancedMesh
        ref={padsRef}
        args={[undefined, undefined, seats.length]}
        onPointerMove={(event) => {
          event.stopPropagation()
          if (event.instanceId !== undefined && event.instanceId !== hovered) setHovered(event.instanceId)
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(event) => {
          event.stopPropagation()
          if (dragStateRef?.current.dragging) return
          if (event.instanceId !== undefined) onSelect(seats[event.instanceId])
        }}
      >
        <boxGeometry args={[0.78, 0.24, 0.78]} />
        <meshStandardMaterial roughness={0.5} metalness={0.15} />
      </instancedMesh>

      <instancedMesh ref={backsRef} args={[undefined, undefined, seats.length]} raycast={() => null}>
        <boxGeometry args={[0.78, 0.52, 0.14]} />
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
  dragStateRef,
  autoWalkSeat,
  onAutoWalkArrived,
  onAutoWalkCancel,
}: {
  moveRef: React.RefObject<MoveVector>
  paused: boolean
  characterRef: React.RefObject<THREE.Group | null>
  lookYawRef: React.RefObject<number>
  dragStateRef: React.RefObject<{ dragging: boolean }>
  autoWalkSeat?: Seat | null
  onAutoWalkArrived?: (seat: Seat) => void
  onAutoWalkCancel?: () => void
}) {
  const keysRef = useRef<KeysState>({})
  useKeyboard(keysRef)
  return (
    <>
      <Character moveRef={moveRef} keysRef={keysRef} characterRef={characterRef} paused={paused} />
      {!paused && <FollowCamera characterRef={characterRef} lookYawRef={lookYawRef} />}
      {!paused && <LookDrag yawRef={lookYawRef} dragStateRef={dragStateRef} />}
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
    camera.position.set(0, 20, 34)
    if (controls) {
      controls.target.set(0, 1.5, -4)
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
  const dragStateRef = useRef({ dragging: false })

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 20, 34], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(maxDpr)}
        onFallback={() => setDpr(1)}
      />
      <CameraReset mode={mode} />
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
          <Board event={boardData.event} categories={boardData.categories} lang={boardData.lang} />
        )}
        {showInteractables && onBoothTap && <Booth onTap={onBoothTap} dragStateRef={dragStateRef} />}
        {mode === 'walk' && moveRef && (
          <WalkRig
            moveRef={moveRef}
            paused={paused || Boolean(previewSeat)}
            characterRef={characterRef}
            lookYawRef={lookYawRef}
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
          target={[0, 1.5, -4]}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={12}
          maxDistance={60}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.05}
        />
      )}
      {previewSeat && <PreviewCamera seat={previewSeat} />}
    </Canvas>
  )
}
