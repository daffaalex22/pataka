'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Seat } from '@/lib/types'
import { Character, FollowCamera, useKeyboard, type KeysState, type MoveVector } from '@/components/scene/Character'
import { PreviewCamera } from '@/components/scene/PreviewCamera'

const STATUS_3D: Record<string, string> = {
  available: '#2dd4bf',
  held: '#fbbf24',
  sold: '#3a3949',
}

function useFacadeTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const sky = ctx.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#07060d')
    sky.addColorStop(0.55, '#141024')
    sky.addColorStop(1, '#0b0912')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1024, 512)

    // mall silhouette
    ctx.fillStyle = '#0e0b17'
    ctx.fillRect(40, 60, 944, 452)
    ctx.fillStyle = '#120e1d'
    ctx.fillRect(0, 30, 140, 482)
    ctx.fillRect(884, 12, 140, 500)

    // glowing windows
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 40; col++) {
        if (Math.random() > 0.62) continue
        const warm = Math.random() > 0.55
        const alpha = 0.25 + Math.random() * 0.6
        ctx.fillStyle = warm ? `rgba(245, 197, 66, ${alpha})` : `rgba(140, 150, 255, ${alpha * 0.8})`
        ctx.fillRect(60 + col * 23, 80 + row * 33, 8, 14)
      }
    }

    // neon sign strip
    const neon = ctx.createLinearGradient(200, 0, 824, 0)
    neon.addColorStop(0, 'rgba(245,197,66,0)')
    neon.addColorStop(0.5, 'rgba(245,197,66,0.9)')
    neon.addColorStop(1, 'rgba(245,197,66,0)')
    ctx.fillStyle = neon
    ctx.fillRect(200, 470, 624, 4)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
}

function Venue() {
  const facade = useFacadeTexture()

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

  const tribunes = useMemo(() => {
    const boxes: { x: number; height: number }[] = []
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        boxes.push({ x: side * (13 + r * 2), height: 1.2 + r * 1.2 })
      }
    }
    return boxes
  }, [])

  return (
    <group>
      <color attach="background" args={['#07060d']} />
      <fog attach="fog" args={['#07060d', 38, 95]} />

      {/* plaza floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[90, 80]} />
        <meshStandardMaterial color="#100d1a" roughness={0.92} metalness={0.05} />
      </mesh>
      <gridHelper args={[90, 90, '#241f33', '#161222']} position={[0, 0.02, 2]} />

      {/* mall facade backdrop */}
      {facade && (
        <mesh position={[0, 13, -46]}>
          <planeGeometry args={[76, 38]} />
          <meshBasicMaterial map={facade} toneMapped={false} />
        </mesh>
      )}

      {/* stage */}
      <group position={[0, 0, -27]}>
        <mesh position={[0, 4.6, -5.7]}>
          <boxGeometry args={[28, 9.2, 0.4]} />
          <meshStandardMaterial color="#0c0a14" roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[26, 1.4, 11]} />
          <meshStandardMaterial color="#1a1426" roughness={0.45} metalness={0.35} />
        </mesh>
        {/* LED panels */}
        {[
          { x: -6, color: '#f5c542' },
          { x: 0, color: '#7c5cff' },
          { x: 6, color: '#38bdf8' },
        ].map((panel) => (
          <mesh key={panel.x} position={[panel.x, 4.4, -4.6]}>
            <planeGeometry args={[4.6, 6.4]} />
            <meshBasicMaterial color={panel.color} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        ))}
        {/* truss */}
        <mesh position={[0, 8.6, 1.5]}>
          <boxGeometry args={[28, 0.35, 0.35]} />
          <meshStandardMaterial color="#2a2438" metalness={0.8} roughness={0.3} />
        </mesh>
        {[-13, 13].map((x) => (
          <mesh key={x} position={[x, 4.3, 1.5]}>
            <cylinderGeometry args={[0.14, 0.14, 8.6, 8]} />
            <meshStandardMaterial color="#2a2438" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        {/* spotlight cans + beams */}
        {[-9, -3, 3, 9].map((x) => (
          <group key={x}>
            <mesh position={[x, 8.1, 1.2]}>
              <cylinderGeometry args={[0.28, 0.34, 0.7, 10]} />
              <meshStandardMaterial color="#1c1826" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[x, 4.4, -0.8]} rotation-x={0.42}>
              <coneGeometry args={[1.15, 8, 12, 1, true]} />
              <meshBasicMaterial color={x % 2 === 0 ? '#f5c542' : '#9b7bff'} transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        ))}
        <pointLight position={[0, 5, 2]} intensity={40} distance={46} color="#f5c542" />
        <pointLight position={[-8, 3, 2]} intensity={22} distance={30} color="#9b7bff" />
      </group>

      {/* tribune platforms */}
      {tribunes.map((tribune) => (
        <mesh key={`${tribune.x}-${tribune.height}`} position={[tribune.x, tribune.height / 2, 9]}>
          <boxGeometry args={[2.2, tribune.height, 31]} />
          <meshStandardMaterial color="#151120" roughness={0.8} metalness={0.15} />
        </mesh>
      ))}

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
}: {
  seats: Seat[]
  selectedId: string | null
  onSelect: (seat: Seat) => void
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
      const lift = isSelected ? 0.18 : isHovered ? 0.08 : 0
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
      pads.setColorAt(index, color)
      backs.setColorAt(index, color)
    })

    pads.instanceMatrix.needsUpdate = true
    backs.instanceMatrix.needsUpdate = true
    if (pads.instanceColor) pads.instanceColor.needsUpdate = true
    if (backs.instanceColor) backs.instanceColor.needsUpdate = true
  }, [seats, selectedId, hovered, dummy, color])

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
}: {
  moveRef: React.RefObject<MoveVector>
  paused: boolean
  characterRef: React.RefObject<THREE.Group | null>
}) {
  const keysRef = useRef<KeysState>({})
  useKeyboard(keysRef)
  return (
    <>
      <Character moveRef={moveRef} keysRef={keysRef} characterRef={characterRef} paused={paused} />
      {!paused && <FollowCamera characterRef={characterRef} />}
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
  characterRef: externalCharacterRef,
}: {
  seats: Seat[]
  selectedId: string | null
  onSelect: (seat: Seat) => void
  mode?: 'orbit' | 'walk'
  moveRef?: React.RefObject<MoveVector>
  previewSeat?: Seat | null
  maxDpr?: number
  characterRef?: React.RefObject<THREE.Group | null>
}) {
  const [dpr, setDpr] = useState(maxDpr)
  const internalCharacterRef = useRef<THREE.Group | null>(null)
  const characterRef = externalCharacterRef ?? internalCharacterRef

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
        <Seats seats={seats} selectedId={selectedId} onSelect={onSelect} />
        {mode === 'walk' && moveRef && (
          <WalkRig moveRef={moveRef} paused={Boolean(previewSeat)} characterRef={characterRef} />
        )}
      </Suspense>
      {mode === 'orbit' && (
        <OrbitControls
          makeDefault
          enabled={!previewSeat}
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
