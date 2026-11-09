const PINK = '#f2b3c4'
const PURPLE = '#a98dc0'
const PURPLE_LIGHT = '#b9a3cd'
const CYAN = '#86c7d6'
const LIME = '#c8d67e'
const ORANGE = '#f2a25c'
const RED = '#e06470'
const INK = '#2f2f2f'
const MUTED = '#6b6b6b'
const LINE = '#dedbd6'
const SURFACE = '#f7f5f0'

export const FULL_VIEWBOX = '0 0 1000 640'
export const COMPACT_VIEWBOX = '120 215 860 425'

const NORTH_BLOCKS = [
  { x: 260, w: 36, color: PINK },
  { x: 300, w: 30, color: PURPLE },
  { x: 334, w: 38, color: PURPLE },
  { x: 376, w: 28, color: CYAN },
  { x: 408, w: 42, color: PINK },
  { x: 454, w: 32, color: PURPLE },
  { x: 490, w: 40, color: PURPLE },
  { x: 534, w: 28, color: CYAN },
  { x: 566, w: 38, color: PINK },
  { x: 608, w: 34, color: PURPLE },
  { x: 646, w: 42, color: PINK },
  { x: 692, w: 30, color: CYAN },
]

const RIGHT_BLOCKS = [
  { x: 726, y: 226, w: 82, h: 48, color: CYAN },
  { x: 814, y: 226, w: 82, h: 48, color: LIME },
  { x: 726, y: 282, w: 72, h: 44, color: PINK },
  { x: 804, y: 282, w: 92, h: 44, color: RED },
  { x: 726, y: 334, w: 82, h: 42, color: PURPLE },
  { x: 814, y: 334, w: 82, h: 42, color: PINK },
]

const BOTTOM_ROW_ONE = [
  { x: 270, w: 60, color: PURPLE },
  { x: 334, w: 40, color: LIME },
  { x: 378, w: 54, color: PURPLE },
  { x: 436, w: 36, color: RED },
  { x: 476, w: 54, color: PURPLE },
  { x: 534, w: 42, color: LIME },
  { x: 580, w: 50, color: PURPLE },
  { x: 634, w: 40, color: LIME },
  { x: 678, w: 38, color: PURPLE },
]

const BOTTOM_ROW_TWO = [
  { x: 300, w: 80, color: PURPLE },
  { x: 384, w: 60, color: LIME },
  { x: 448, w: 70, color: PURPLE },
  { x: 522, w: 50, color: RED },
  { x: 576, w: 80, color: PURPLE },
  { x: 660, w: 40, color: LIME },
]

function ParkingMark({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill="#fff" stroke="#b9b5ae" strokeWidth={1.2} />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#666"
        fontFamily="system-ui, sans-serif"
      >
        P
      </text>
    </g>
  )
}

function AtriumLabel({
  x,
  y,
  name,
  size = 8.5,
  compact = false,
}: {
  x: number
  y: number
  name: string
  size?: number
  compact?: boolean
}) {
  const [first, ...rest] = name.split(' ')
  const shortName = rest.join(' ')

  if (compact) {
    return (
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        letterSpacing={0.4}
        fill={MUTED}
        fontFamily="system-ui, sans-serif"
      >
        {shortName}
      </text>
    )
  }

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      letterSpacing={0.6}
      fill={MUTED}
      fontFamily="system-ui, sans-serif"
    >
      <tspan x={x} dy={-4}>
        {first}
      </tspan>
      <tspan x={x} dy={size + 3}>
        {shortName}
      </tspan>
    </text>
  )
}

export function VenueMapSvg({
  variant = 'full',
  title,
  description,
  eventLabel = 'Acara di sini',
  className = '',
}: {
  variant?: 'full' | 'compact'
  title: string
  description: string
  eventLabel?: string
  className?: string
}) {
  const compact = variant === 'compact'

  return (
    <svg
      viewBox={compact ? COMPACT_VIEWBOX : FULL_VIEWBOX}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title}</title>
      <desc>{description}</desc>

      <rect x={0} y={0} width={1000} height={640} fill={SURFACE} />

      {/* Mall footprint */}
      <path
        d="M 92 168 C 96 104 148 74 232 70 L 700 70 C 800 72 860 110 888 178 L 936 356 C 952 430 934 520 872 560 L 760 610 C 690 636 610 642 520 640 C 430 642 340 636 278 616 L 160 574 C 96 550 66 486 72 412 Z"
        fill="#ececea"
        stroke={LINE}
        strokeWidth={2}
      />

      {/* Walkways */}
      <rect x={250} y={492} width={460} height={34} rx={17} fill="#fff" stroke="#e3e0da" />
      <rect x={482} y={420} width={36} height={100} fill="#fff" />
      <path d="M 300 490 Q 330 430 390 408" stroke="#fff" strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d="M 650 490 Q 640 430 610 408" stroke="#fff" strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d="M 660 286 L 660 318" stroke="#fff" strokeWidth={26} fill="none" strokeLinecap="round" />

      {/* North retail row */}
      {NORTH_BLOCKS.map((block) => (
        <rect key={`north-${block.x}`} x={block.x} y={82} width={block.w} height={30} rx={3} fill={block.color} />
      ))}

      {/* Concentric tenant bands around the courtyard */}
      <path
        d="M 232 332 A 285 285 0 0 1 768 332"
        stroke={PINK}
        strokeWidth={40}
        strokeDasharray="32 6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 275 255 A 285 285 0 0 1 358 183"
        stroke={LIME}
        strokeWidth={40}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 643 183 A 285 285 0 0 1 725 255"
        stroke={CYAN}
        strokeWidth={40}
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 268 368 A 240 240 0 0 1 732 368"
        stroke={PURPLE}
        strokeWidth={38}
        strokeDasharray="28 5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 708 310 A 240 240 0 0 1 736 388"
        stroke={RED}
        strokeWidth={38}
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 303 395 A 200 200 0 0 1 697 395"
        stroke={PURPLE_LIGHT}
        strokeWidth={34}
        strokeDasharray="24 5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 312 362 A 200 200 0 0 1 347 301"
        stroke={CYAN}
        strokeWidth={34}
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 341 416 A 160 160 0 0 1 659 416"
        stroke={RED}
        strokeWidth={16}
        strokeDasharray="20 6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Downtownwalk */}
      <path
        d="M 120 200 Q 92 330 170 460"
        stroke={PINK}
        strokeWidth={28}
        strokeDasharray="26 7"
        fill="none"
        opacity={0.85}
      />
      <rect x={164} y={214} width={34} height={64} rx={6} fill={PINK} transform="rotate(-26 181 246)" />
      <rect x={158} y={292} width={34} height={70} rx={6} fill={PURPLE} transform="rotate(-22 175 327)" />
      <rect x={164} y={372} width={34} height={64} rx={6} fill={PINK} transform="rotate(-16 181 404)" />
      <rect x={182} y={444} width={34} height={52} rx={6} fill={PURPLE} transform="rotate(-8 199 470)" />
      {!compact && (
        <text
          x={186}
          y={198}
          textAnchor="middle"
          fontSize={11}
          letterSpacing={1}
          fill="#b04a68"
          stroke="#f7f5f0"
          strokeWidth={3}
          paintOrder="stroke"
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          downtownwalk
        </text>
      )}

      {/* Right-side blocks and anchors */}
      {RIGHT_BLOCKS.map((block) => (
        <rect
          key={`right-${block.x}-${block.y}`}
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          rx={3}
          fill={block.color}
        />
      ))}

      <rect x={720} y={86} width={200} height={118} rx={8} fill={ORANGE} />
      <text
        x={820}
        y={152}
        textAnchor="middle"
        fontSize={22}
        fontWeight={600}
        fill="#fff"
        fontFamily="system-ui, sans-serif"
      >
        happy harvest
      </text>

      <rect x={740} y={438} width={190} height={160} rx={6} fill={ORANGE} />
      <text
        x={835}
        y={532}
        textAnchor="middle"
        fontSize={34}
        fontWeight={700}
        letterSpacing={1}
        fill="#fff"
        fontFamily="system-ui, sans-serif"
      >
        STAR
      </text>

      {/* Courtyard */}
      <ellipse cx={500} cy={350} rx={150} ry={78} fill="#fbfaf7" />
      <text
        x={500}
        y={359}
        textAnchor="middle"
        fontSize={26}
        fill="#4c7a5a"
        letterSpacing={0.5}
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        Sawarga Courtyard
      </text>

      {/* Courtyard edge blocks */}
      {[
        { x: 410, w: 30, color: RED },
        { x: 444, w: 36, color: LIME },
        { x: 484, w: 28, color: RED },
        { x: 516, w: 38, color: LIME },
        { x: 558, w: 30, color: RED },
      ].map((block) => (
        <rect key={`court-${block.x}`} x={block.x} y={408} width={block.w} height={16} rx={2} fill={block.color} />
      ))}

      {/* Atriums */}
      <circle cx={285} cy={520} r={44} fill="#fff" stroke="#d7d4cf" strokeWidth={2} />
      <circle cx={675} cy={520} r={44} fill="#fff" stroke="#d7d4cf" strokeWidth={2} />
      <circle cx={660} cy={250} r={38} fill="#fff" stroke="#d7d4cf" strokeWidth={2} />
      <AtriumLabel x={285} y={520} name="ATRIUM CIUNIK" compact={compact} />
      <AtriumLabel x={675} y={520} name="ATRIUM CIBADAK" compact={compact} />
      <AtriumLabel x={660} y={250} name="ATRIUM CILEUTIK" size={8.5} compact={compact} />

      {/* Bottom retail rows */}
      {BOTTOM_ROW_ONE.map((block) => (
        <rect key={`bottom-a-${block.x}`} x={block.x} y={574} width={block.w} height={26} rx={3} fill={block.color} />
      ))}
      {BOTTOM_ROW_TWO.map((block) => (
        <rect key={`bottom-b-${block.x}`} x={block.x} y={608} width={block.w} height={20} rx={3} fill={block.color} />
      ))}

      {/* Event pin */}
      <g>
        <rect x={442} y={262} width={116} height={22} rx={11} fill={INK} opacity={0.92} />
        <text
          x={500}
          y={277}
          textAnchor="middle"
          fontSize={9.5}
          letterSpacing={0.8}
          fill="#f5c542"
          fontFamily="system-ui, sans-serif"
        >
          {eventLabel.toUpperCase()}
        </text>
        <circle cx={500} cy={326} r={15} fill="none" stroke="#f5c542" strokeWidth={3} opacity={0.4} />
        <path
          d="M500 288 c-8 0 -14 6 -14 14 c0 11 14 24 14 24 s14 -13 14 -24 c0 -8 -6 -14 -14 -14z"
          fill="#f5c542"
          stroke="#8a6a10"
          strokeWidth={1.2}
        />
        <circle cx={500} cy={302} r={4.2} fill="#fff" />
      </g>

      {/* Perimeter markers */}
      {!compact && (
        <>
          <ParkingMark x={88} y={200} />
          <ParkingMark x={105} y={560} />
          <ParkingMark x={946} y={330} />
          <path d="M 82 338 l 14 8 l -14 8" stroke="#777" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M 930 292 l -14 8 l 14 8" stroke="#777" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M 492 76 l 8 14 l 8 -14" stroke="#777" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M 492 632 l 8 -14 l 8 14" stroke="#777" strokeWidth={3} fill="none" strokeLinecap="round" />
          <rect x={40} y={36} width={120} height={28} rx={14} fill="#fff" stroke={LINE} />
          <text
            x={100}
            y={54}
            textAnchor="middle"
            fontSize={9.5}
            letterSpacing={1.2}
            fill={MUTED}
            fontFamily="system-ui, sans-serif"
          >
            GROUND FLOOR
          </text>
        </>
      )}
    </svg>
  )
}
