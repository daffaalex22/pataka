'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { STATUS_COLORS } from '@/components/ui/Legend'
import { useLang, useT } from '@/lib/i18n'
import { findNextSeat, type SeatDirection } from '@/lib/seatNavigation'
import { formatIdr, type Seat } from '@/lib/types'
import { BALCONY, SHELL } from '@/lib/sawarga/scene/venue/layout'
import {
  balconyArcPath,
  balconyBandPath,
  createSeatMapProjection,
} from '@/lib/seatMapGeometry'

const MAP_WIDTH = 640
const MAP_HEIGHT = 620
const MAP_PADDING = 24

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
  const projection = useMemo(
    () => createSeatMapProjection(MAP_WIDTH, MAP_HEIGHT, MAP_PADDING),
    [],
  )
  const balconyDecks = useMemo(
    () => [
      balconyBandPath(projection, BALCONY.eastAngleRange),
      balconyBandPath(projection, BALCONY.westAngleRange),
    ],
    [projection],
  )
  const balconyTiers = useMemo(
    () =>
      [2, 4].flatMap((offset) => [
        balconyArcPath(projection, BALCONY.eastAngleRange, offset),
        balconyArcPath(projection, BALCONY.westAngleRange, offset),
      ]),
    [projection],
  )
  const tribuneActive = categoryKey === 'TRIB'

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

    const xs = categorySeats.map((seat) => projection.x(seat.x))
    const ys = categorySeats.map((seat) => projection.y(seat.z))
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const padding = 28
    const next = clampScale(
      Math.min(
        (MAP_WIDTH - MAP_PADDING * 2) / Math.max(1, maxX - minX + padding * 2),
        (MAP_HEIGHT - MAP_PADDING * 2) / Math.max(1, maxY - minY + padding * 2),
      ),
    )

    setScale(next)
    setPan({
      x: MAP_WIDTH / 2 - ((minX + maxX) / 2) * next,
      y: MAP_HEIGHT / 2 - ((minY + maxY) / 2) * next,
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
      const x = projection.x(seat.x)
      const y = projection.y(seat.z)
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = seat
      }
    }
    const hitRadius = Math.max(18, projection.scale * 1.6)
    if (best && bestDistance <= hitRadius ** 2) onSelect(best)
  }

  const stage = {
    x: projection.x(-13),
    y: projection.y(-17.5),
    width: projection.x(13) - projection.x(-13),
    height: projection.y(-8.5) - projection.y(-17.5),
  }
  const seatRadius = Math.max(2.8, projection.scale * 0.36)

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-end gap-1 text-xs">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.35)}
          aria-label={t('seat.zoomOut')}
          className="focus-ring grid size-11 place-items-center rounded-sm text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.35)}
          aria-label={t('seat.zoomIn')}
          className="focus-ring grid size-11 place-items-center rounded-sm text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetView}
          className="focus-ring inline-flex min-h-11 items-center rounded-sm px-3 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          {t('seat.mapAll')}
        </button>
        {categoryKey && (
          <button
            type="button"
            onClick={focusCategory}
            className="focus-ring inline-flex min-h-11 items-center rounded-sm px-3 text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
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
          <ellipse
            cx={projection.x(0)}
            cy={projection.y(0)}
            rx={SHELL.radiusX * projection.scale}
            ry={SHELL.radiusZ * projection.scale}
            fill="rgba(245,197,66,0.025)"
            stroke="rgba(244,241,255,0.14)"
            strokeWidth="1.2"
          />
          {balconyDecks.map((deck, index) => (
            <path
              key={`deck-${index}`}
              d={deck}
              fill={tribuneActive ? 'rgba(56,189,248,0.14)' : 'rgba(244,241,255,0.045)'}
              stroke={tribuneActive ? 'rgba(56,189,248,0.36)' : 'rgba(244,241,255,0.12)'}
              strokeWidth="1"
            />
          ))}
          {balconyTiers.map((tier, index) => (
            <path
              key={`tier-${index}`}
              d={tier}
              fill="none"
              stroke={tribuneActive ? 'rgba(56,189,248,0.22)' : 'rgba(244,241,255,0.07)'}
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
          ))}
          <ellipse
            cx={projection.x(0)}
            cy={stage.y + stage.height / 2}
            rx={stage.width * 0.62}
            ry={stage.height * 1.45}
            fill="url(#stageGlow)"
            opacity="0.7"
          />
          <rect
            x={stage.x}
            y={stage.y}
            width={stage.width}
            height={stage.height}
            rx="11"
            fill="url(#stage)"
            stroke="rgba(245,197,66,0.55)"
          />
          <text
            x={projection.x(0)}
            y={stage.y + stage.height / 2 + 4}
            textAnchor="middle"
            fontSize="12"
            letterSpacing="3"
            fill="#f5c542"
          >
            {stageLabel}
          </text>

          {seats.map((seat) => {
            const x = projection.x(seat.x)
            const y = projection.y(seat.z)
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
                r={selected ? seatRadius * 1.4 : seatRadius}
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
