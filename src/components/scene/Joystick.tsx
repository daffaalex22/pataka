'use client'

import { useRef, useState } from 'react'
import type { MoveVector } from '@/components/scene/Character'

/** Touch joystick; writes a normalized vector (x right, y forward) into the shared ref. */
export function Joystick({ moveRef }: { moveRef: React.RefObject<MoveVector> }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const radius = rect.width / 2
    const dx = clientX - (rect.left + radius)
    const dy = clientY - (rect.top + radius)
    const distance = Math.hypot(dx, dy)
    const clamped = Math.min(distance, radius * 0.62)
    const nx = distance === 0 ? 0 : (dx / distance) * clamped
    const ny = distance === 0 ? 0 : (dy / distance) * clamped
    setKnob({ x: nx, y: ny })
    moveRef.current = {
      x: distance === 0 ? 0 : (dx / distance) * (clamped / (radius * 0.62)),
      y: distance === 0 ? 0 : (-dy / distance) * (clamped / (radius * 0.62)),
    }
  }

  const reset = () => {
    setActive(false)
    setKnob({ x: 0, y: 0 })
    moveRef.current = { x: 0, y: 0 }
  }

  return (
    <div
      ref={baseRef}
      role="group"
      aria-label="Movement joystick"
      className="pointer-events-auto absolute bottom-24 left-5 size-28 touch-none select-none rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setActive(true)
        update(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (active) update(event.clientX, event.clientY)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={() => {
        if (active) reset()
      }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/80 shadow-[0_0_18px_rgba(245,197,66,0.5)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}
