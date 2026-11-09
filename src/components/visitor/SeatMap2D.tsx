'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { STATUS_COLORS } from '@/components/ui/Legend'
import { useLang, useT } from '@/lib/i18n'
import { findNextSeat, type SeatDirection } from '@/lib/seatNavigation'
import { formatIdr, type Seat } from '@/lib/types'

const KEY_DIRECTIONS: Partial<Record<string, SeatDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  return point.matrixTransform(ctm.inverse())
}

export function SeatMap2D({
  seats,
  categoryKey,
  selectedId,
  onSelect,
  stageLabel,
}: {
  seats: Seat[]
  categoryKey: string | null
  selectedId: string | null
  onSelect: (seat: Seat) => void
  stageLabel: string
}) {
  const { lang } = useLang()
  const t = useT()
  const svgRef = useRef<SVGSVGElement>(null)
  const hintId = useId()
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hasFocus, setHasFocus] = useState(false)

  const tabStopId = useMemo(() => {
    if (selectedId && seats.some((seat) => seat.id === selectedId)) return selectedId
    const preferred = seats.find(
      (seat) =>
        seat.status === 'available' && (categoryKey === null || seat.categoryKey === categoryKey),
    )
    return (
      preferred?.id ??
      seats.find((seat) => seat.status === 'available')?.id ??
      seats[0]?.id ??
      null
    )
  }, [seats, selectedId, categoryKey])

  const activeFocusId =
    focusedId && seats.some((seat) => seat.id === focusedId) ? focusedId : tabStopId

  const focusSeat = (id: string) => {
    setFocusedId(id)
    svgRef.current?.querySelector<SVGCircleElement>(`[data-seat-id="${id}"]`)?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<SVGCircleElement>, seat: Seat) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onSelect(seat)
      return
    }

    const direction = KEY_DIRECTIONS[event.key]
    if (!direction) return
    event.preventDefault()
    event.stopPropagation()
    const next = findNextSeat(seats, seat.id, direction)
    if (next) focusSeat(next.id)
  }

  const handleTap = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const point = toSvgPoint(svg, event.clientX, event.clientY)
    if (!point) return

    let best: Seat | null = null
    let bestDistance = Infinity
    for (const seat of seats) {
      const x = 320 + seat.x * 14
      const y = 20 + (seat.z + 24) * 12
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = seat
      }
    }
    if (best && bestDistance <= 24 ** 2) onSelect(best)
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox="0 0 640 620"
        className="h-auto w-full touch-manipulation select-none"
        onClick={handleTap}
        role="group"
        aria-label={t('seat.mapLabel')}
        aria-describedby={hintId}
        onFocus={() => setHasFocus(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false)
        }}
      >
        <defs>
          <linearGradient id="stage" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f5c542" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#f5c542" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f5c542" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5c542" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f5c542" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="320" cy="34" rx="240" ry="70" fill="url(#stageGlow)" opacity="0.7" />
        <rect x="190" y="8" width="260" height="22" rx="11" fill="url(#stage)" stroke="rgba(245,197,66,0.55)" />
        <text x="320" y="23" textAnchor="middle" fontSize="10" letterSpacing="4" fill="#f5c542">
          {stageLabel}
        </text>

        {seats.map((seat) => {
          const x = 320 + seat.x * 14
          const y = 20 + (seat.z + 24) * 12
          const dimmed = categoryKey !== null && seat.categoryKey !== categoryKey
          const selected = seat.id === selectedId
          const tabStop = seat.id === activeFocusId
          const showFocusRing = hasFocus && tabStop
          const label = `${seat.id}, ${lang === 'id' ? seat.categoryName : seat.categoryNameEn}, ${t(
            `status.${seat.status}`,
          )}, ${formatIdr(seat.priceIdr, lang)}`

          return (
            <circle
              key={seat.id}
              data-seat-id={seat.id}
              cx={x}
              cy={y}
              r={selected ? 7.5 : 5.4}
              fill={selected ? '#ffffff' : STATUS_COLORS[seat.status]}
              opacity={dimmed ? 0.16 : seat.status === 'sold' ? 0.5 : 1}
              stroke={selected || showFocusRing ? '#f5c542' : 'rgba(0,0,0,0.4)'}
              strokeWidth={selected ? 2.5 : showFocusRing ? 2.2 : 0.75}
              style={selected || showFocusRing ? { filter: 'drop-shadow(0 0 9px #f5c542)' } : undefined}
              role="button"
              tabIndex={tabStop ? 0 : -1}
              aria-label={label}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(seat)
              }}
              onFocus={() => setFocusedId(seat.id)}
              onKeyDown={(event) => handleKeyDown(event, seat)}
            />
          )
        })}
      </svg>
      <p id={hintId} className="sr-only">
        {t('seat.keyboardHint')}
      </p>
    </div>
  )
}
