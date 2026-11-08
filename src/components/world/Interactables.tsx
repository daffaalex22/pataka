'use client'

import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useT } from '@/lib/i18n'
import { formatEventDate, type Category, type EventInfo, type Lang } from '@/lib/types'

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = '600',
) {
  let current = size
  ctx.font = `${weight} ${current}px system-ui, sans-serif`
  while (current > 18 && ctx.measureText(text).width > maxWidth) {
    current -= 2
    ctx.font = `${weight} ${current}px system-ui, sans-serif`
  }
  let output = text
  if (ctx.measureText(output).width > maxWidth) {
    while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) output = output.slice(0, -1)
    output = `${output}…`
  }
  ctx.fillText(output, x, y)
}

/** Freestanding LED board near the spawn: live event info and per-category availability. */
export function Board({ event, categories, lang }: { event: EventInfo; categories: Category[]; lang: Lang }) {
  const t = useT()

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#0b0912'
    ctx.fillRect(0, 0, 1024, 512)
    ctx.strokeStyle = 'rgba(245,197,66,0.5)'
    ctx.lineWidth = 6
    ctx.strokeRect(8, 8, 1008, 496)

    ctx.fillStyle = '#f5c542'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.fillText('PATAKA · LIVE', 40, 56)

    ctx.fillStyle = '#f4f1ff'
    const eventName = lang === 'id' ? event.name : event.nameEn
    drawFittedText(ctx, eventName, 40, 112, 944, 42)

    ctx.fillStyle = 'rgba(244,241,255,0.6)'
    const venue = lang === 'id' ? event.venue : event.venueEn
    drawFittedText(ctx, `${formatEventDate(event.startsAt, lang)} WIB · ${venue}`, 40, 156, 944, 22, '400')

    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(40, 182, 944, 2)

    categories.forEach((category, index) => {
      const y = 234 + index * 60
      ctx.fillStyle = category.colorHex
      ctx.beginPath()
      ctx.arc(54, y - 9, 9, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#f4f1ff'
      ctx.font = '600 26px system-ui, sans-serif'
      ctx.fillText(lang === 'id' ? category.name : category.nameEn, 82, y)

      ctx.fillStyle = category.remaining === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.78)'
      ctx.textAlign = 'right'
      ctx.font = '500 24px system-ui, sans-serif'
      ctx.fillText(`${category.remaining} ${t('cat.available')}`, 984, y)
      ctx.textAlign = 'left'
    })

    const next = new THREE.CanvasTexture(canvas)
    next.colorSpace = THREE.SRGBColorSpace
    next.anisotropy = 4
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, categories, lang])

  useEffect(() => () => texture?.dispose(), [texture])

  if (!texture) return null

  return (
    <group position={[-9, 0, 11]} rotation-y={1.25}>
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} position={[x, 0.6, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
          <meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 2.0, -0.06]}>
        <boxGeometry args={[5.6, 3.0, 0.12]} />
        <meshStandardMaterial color="#0c0a14" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 2.0, 0.02]}>
        <planeGeometry args={[5.2, 2.7]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Ticket booth kiosk near the spawn; tapping it opens the category picker. */
export function Booth({ onTap }: { onTap: () => void }) {
  const [hovered, setHovered] = useState(false)

  const sign = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 160
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#0b0912'
    ctx.fillRect(0, 0, 512, 160)
    ctx.strokeStyle = 'rgba(245,197,66,0.7)'
    ctx.lineWidth = 6
    ctx.strokeRect(6, 6, 500, 148)
    ctx.fillStyle = '#f5c542'
    ctx.textAlign = 'center'
    ctx.font = '700 52px system-ui, sans-serif'
    ctx.fillText('TIKET · TICKETS', 256, 98)
    ctx.textAlign = 'left'
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }, [])

  useEffect(() => () => sign?.dispose(), [sign])
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  return (
    <group
      position={[9, 0, 12]}
      rotation-y={-1.35}
      scale={hovered ? 1.05 : 1}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        setHovered(false)
        document.body.style.cursor = ''
      }}
      onClick={(event) => {
        event.stopPropagation()
        onTap()
      }}
    >
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[3, 1.1, 1]} />
        <meshStandardMaterial color="#1a1426" roughness={0.5} metalness={0.3} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.15, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.3, 8]} />
          <meshStandardMaterial color="#2a2438" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[3.6, 0.18, 1.8]} />
        <meshStandardMaterial color="#1a1426" roughness={0.55} metalness={0.3} />
      </mesh>
      {sign && (
        <mesh position={[0, 2.3, 0.92]}>
          <planeGeometry args={[2.8, 0.62]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, 0.62, 0.52]}>
        <planeGeometry args={[2.6, 0.16]} />
        <meshBasicMaterial color="#f5c542" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, 1.9, 1.1]} intensity={10} distance={10} color="#f5c542" />
    </group>
  )
}
