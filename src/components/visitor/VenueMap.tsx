'use client'

import { useLang, useT } from '@/lib/i18n'
import { balconyBandPath, createSeatMapProjection } from '@/lib/seatMapGeometry'
import {
  BALCONY,
  SHELL,
  VENUE_SEATS,
  VENUE_WORLD,
  shellOffsetPoint,
} from '@/lib/sawarga/scene/venue/layout'

type MapCategory = {
  key: string
  name: string
  nameEn: string
  colorHex: string
}

const MUTED = 'rgba(244, 234, 216, 0.055)'
const OUTLINE = 'rgba(244, 234, 216, 0.12)'
const MUTED_TEXT = 'rgba(244, 234, 216, 0.55)'
const INK = '#08070b'

const MAP_WIDTH = 640
const MAP_HEIGHT = 400
const MAP_PADDING = 28
const projection = createSeatMapProjection(MAP_WIDTH, MAP_HEIGHT, MAP_PADDING)

/** Actual floor-seat extents, so the overview stays in sync with the venue. */
const CATEGORY_ZONES = (['VIP', 'CAT1', 'REG'] as const).map((key) => {
  const seats = VENUE_SEATS.filter((seat) => seat.categoryKey === key)
  const minX = Math.min(...seats.map((seat) => seat.x)) - 0.45
  const maxX = Math.max(...seats.map((seat) => seat.x)) + 0.45
  const minZ = Math.min(...seats.map((seat) => seat.z)) - 0.45
  const maxZ = Math.max(...seats.map((seat) => seat.z)) + 0.45
  return { key, minX, maxX, minZ, maxZ }
})

const STAGE = VENUE_WORLD.stage
const STAGE_LEFT = STAGE.x - STAGE.width / 2
const STAGE_TOP = STAGE.z - STAGE.depth / 2

const BALCONY_DECKS = {
  west: balconyBandPath(projection, BALCONY.westAngleRange),
  east: balconyBandPath(projection, BALCONY.eastAngleRange),
}

function bandLabel(angle: number) {
  const point = shellOffsetPoint(angle * Math.PI, BALCONY.depth / 2)
  return { x: projection.x(point.x), y: projection.y(point.z) }
}

const WEST_LABEL = bandLabel(1)
const EAST_LABEL = bandLabel(0)

export function VenueMap({
  categories,
  activeCategoryKey,
  activeSection,
  stageLabel,
  className = '',
}: {
  categories: MapCategory[]
  activeCategoryKey: string
  activeSection: string
  stageLabel: string
  className?: string
}) {
  const { lang } = useLang()
  const t = useT()
  const byKey = new Map(categories.map((category) => [category.key, category]))
  const vip = byKey.get('VIP')
  const cat1 = byKey.get('CAT1')
  const reg = byKey.get('REG')
  const trib = byKey.get('TRIB')

  const label = (category: MapCategory | undefined, fallback: string) =>
    category ? (lang === 'id' ? category.name : category.nameEn) : fallback
  const fill = (key: string) =>
    activeCategoryKey === key ? (byKey.get(key)?.colorHex ?? 'var(--accent)') : MUTED
  const stroke = (key: string) =>
    activeCategoryKey === key ? (byKey.get(key)?.colorHex ?? 'var(--accent)') : OUTLINE
  const textFill = (active: boolean) => (active ? INK : MUTED_TEXT)
  const tribColor = trib?.colorHex ?? 'var(--accent)'

  const activeTribLeft = activeCategoryKey === 'TRIB' && activeSection === 'TRIBL'
  const activeTribRight = activeCategoryKey === 'TRIB' && activeSection === 'TRIBR'
  const activeName =
    activeCategoryKey === 'TRIB'
      ? activeSection === 'TRIBR'
        ? t('seat.tribuneRight')
        : t('seat.tribuneLeft')
      : label(byKey.get(activeCategoryKey), activeCategoryKey)

  const mapLabel = `${t('seat.mapLabel')}. ${stageLabel}. ${label(vip, 'VIP')}, ${label(
    cat1,
    'CAT 1',
  )}, ${label(reg, 'Reguler')}. ${t('seat.tribuneLeft')}, ${t('seat.tribuneRight')}. ${t(
    'seat.categoryLabel',
  )}: ${activeName}.`

  return (
    <div className={`rounded-md border border-paper/15 bg-paper/[0.02] p-3 ${className}`}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={mapLabel}
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

        <ellipse
          cx={MAP_WIDTH / 2}
          cy={MAP_HEIGHT / 2}
          rx={SHELL.radiusX * projection.scale}
          ry={SHELL.radiusZ * projection.scale}
          fill="rgba(245,197,66,0.025)"
          stroke={OUTLINE}
          strokeWidth="1.2"
        />

        <path
          d={BALCONY_DECKS.west}
          fill={activeTribLeft ? tribColor : MUTED}
          stroke={activeTribLeft ? tribColor : OUTLINE}
          strokeWidth="1"
        />
        <path
          d={BALCONY_DECKS.east}
          fill={activeTribRight ? tribColor : MUTED}
          stroke={activeTribRight ? tribColor : OUTLINE}
          strokeWidth="1"
        />

        <ellipse
          cx={projection.x(0)}
          cy={projection.y(STAGE.z)}
          rx={STAGE.width * projection.scale * 0.62}
          ry={STAGE.depth * projection.scale * 1.2}
          fill="url(#stageGlow)"
          opacity="0.7"
        />
        <rect
          x={projection.x(STAGE_LEFT)}
          y={projection.y(STAGE_TOP)}
          width={STAGE.width * projection.scale}
          height={STAGE.depth * projection.scale}
          rx="8"
          fill="url(#stage)"
          stroke="rgba(245,197,66,0.55)"
        />
        <text
          x={projection.x(0)}
          y={projection.y(STAGE.z) + 5}
          textAnchor="middle"
          fontSize="15"
          fontWeight="600"
          letterSpacing="2"
          fill="#f5c542"
        >
          {stageLabel}
        </text>

        {CATEGORY_ZONES.map((zone) => {
          const active = activeCategoryKey === zone.key
          const x = projection.x(zone.minX)
          const y = projection.y(zone.minZ)
          const width = projection.x(zone.maxX) - x
          const height = projection.y(zone.maxZ) - y
          return (
            <g key={zone.key}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="6"
                fill={fill(zone.key)}
                stroke={stroke(zone.key)}
              />
              <text
                x={x + width / 2}
                y={y + height / 2 + 5}
                textAnchor="middle"
                fontSize="17"
                fontWeight="600"
                fill={textFill(active)}
              >
                {label(byKey.get(zone.key), zone.key)}
              </text>
            </g>
          )
        })}

        <text
          x={WEST_LABEL.x}
          y={WEST_LABEL.y + 5}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={textFill(activeTribLeft)}
        >
          {t('seat.left')}
        </text>
        <text
          x={EAST_LABEL.x}
          y={EAST_LABEL.y + 5}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={textFill(activeTribRight)}
        >
          {t('seat.right')}
        </text>
      </svg>
    </div>
  )
}
