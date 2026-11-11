'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

const MIN_SCALE = 1
const MAX_SCALE = 3.2

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function toSvgPoint(element: SVGGraphicsElement, clientX: number, clientY: number) {
  const svg = element.ownerSVGElement ?? (element as SVGSVGElement)
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = element.getScreenCTM()
  if (!ctm) return null
  return point.matrixTransform(ctm.inverse())
}

export function SeatMap2D({
  seats,
  categoryKey,
  selectedId,
  onSelect,
  stageLabel,
  showAllCategories = false,
  focusOnMount = false,
  className = '',
}: {
  seats: Seat[]
  categoryKey: string | null
  selectedId: string | null
  onSelect: (seat: Seat) => void
  stageLabel: string
  showAllCategories?: boolean
  focusOnMount?: boolean
  className?: string
}) {
  const { lang } = useLang()
  const t = useT()
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const hintId = useId()
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hasFocus, setHasFocus] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    x: number
    y: number
    panX: number
    panY: number
    unit: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

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

  const zoomBy = (factor: number) => {
    const next = clampScale(scale * factor)
    setScale(next)
    if (next === MIN_SCALE) setPan({ x: 0, y: 0 })
  }

  const resetView = () => {
    setScale(MIN_SCALE)
    setPan({ x: 0, y: 0 })
  }

  const focusCategory = () => {
    if (!categoryKey) return
    const categorySeats = seats.filter((seat) => seat.categoryKey === categoryKey)
    if (categorySeats.length === 0) {
      resetView()
      return
    }

    const xs = categorySeats.map((seat) => 320 + seat.x * 14)
    const ys = categorySeats.map((seat) => 20 + (seat.z + 24) * 12)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const padding = 28
    const next = clampScale(
      Math.min(
        640 / Math.max(1, maxX - minX + padding * 2),
        620 / Math.max(1, maxY - minY + padding * 2),
      ),
    )

    setScale(next)
    setPan({
      x: 320 - ((minX + maxX) / 2) * next,
      y: 310 - ((minY + maxY) / 2) * next,
    })
  }

  useEffect(() => {
    if (focusOnMount) focusCategory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.moved) {
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    dragRef.current = null
    try {
      svgRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // pointer capture may already be released
    }
  }

  const handleTap = (event: React.MouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) return
    const group = groupRef.current
    if (!group) return
    const point = toSvgPoint(group, event.clientX, event.clientY)
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
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-end gap-1 text-xs">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.35)}
          aria-label={t('seat.zoomOut')}
          className="focus-ring grid size-8 place-items-center rounded-sm text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.35)}
          aria-label={t('seat.zoomIn')}
          className="focus-ring grid size-8 place-items-center rounded-sm text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetView}
          className="focus-ring rounded-sm px-2 py-1.5 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          {t('seat.mapAll')}
        </button>
        {categoryKey && (
          <button
            type="button"
            onClick={focusCategory}
            className="focus-ring rounded-sm px-2 py-1.5 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            {t('seat.mapFocus')}
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 640 620"
        className="h-auto w-full select-none"
        style={{ touchAction: scale > 1 ? 'none' : 'manipulation', cursor: scale > 1 ? 'grab' : 'pointer' }}
        onClick={handleTap}
        onWheel={(event) => {
          event.preventDefault()
          zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12)
        }}
        onPointerDown={(event) => {
          if (scale <= 1 || event.button !== 0) return
          const svg = svgRef.current
          if (!svg) return
          const rect = svg.getBoundingClientRect()
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
            unit: 640 / rect.width,
            moved: false,
          }
          svg.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          const dx = event.clientX - drag.x
          const dy = event.clientY - drag.y
          if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
          setPan({ x: drag.panX + dx * drag.unit, y: drag.panY + dy * drag.unit })
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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

        <g ref={groupRef} transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          <ellipse cx="320" cy="34" rx="240" ry="70" fill="url(#stageGlow)" opacity="0.7" />
          <rect
            x="190"
            y="8"
            width="260"
            height="22"
            rx="11"
            fill="url(#stage)"
            stroke="rgba(245,197,66,0.55)"
          />
          <text x="320" y="23" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#f5c542">
            {stageLabel}
          </text>

          {seats.map((seat) => {
            const x = 320 + seat.x * 14
            const y = 20 + (seat.z + 24) * 12
            const dimmed = categoryKey !== null && seat.categoryKey !== categoryKey
            const selected = seat.id === selectedId
            const tabStop = seat.id === activeFocusId
            const showFocusRing = hasFocus && tabStop
            const label = `${t('seat.rowLabel')} ${seat.row}, ${t('seat.numberLabel')} ${
              seat.num
            }, ${lang === 'id' ? seat.categoryName : seat.categoryNameEn}, ${t(
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
                opacity={
                  selected
                    ? 1
                    : dimmed
                      ? showAllCategories
                        ? 0.35
                        : 0.16
                      : seat.status === 'sold'
                        ? 0.5
                        : 1
                }
                stroke={selected || showFocusRing ? '#f5c542' : 'rgba(0,0,0,0.4)'}
                strokeWidth={selected ? 2.5 : showFocusRing ? 2.2 : 0.75}
                role="button"
                tabIndex={tabStop ? 0 : -1}
                aria-label={label}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation()
                  if (suppressClickRef.current) return
                  onSelect(seat)
                }}
                onFocus={() => setFocusedId(seat.id)}
                onKeyDown={(event) => handleKeyDown(event, seat)}
              />
            )
          })}
        </g>
      </svg>

      <p id={hintId} className="sr-only">
        {t('seat.keyboardHint')}
      </p>
    </div>
  )
}
