'use client'

import { useLang, useT } from '@/lib/i18n'

type MapCategory = {
  key: string
  name: string
  nameEn: string
  colorHex: string
}

const MUTED = 'rgba(244, 234, 216, 0.05)'
const OUTLINE = 'rgba(244, 234, 216, 0.12)'
const MUTED_TEXT = 'rgba(244, 234, 216, 0.55)'
const INK = '#08070b'

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
      <svg viewBox="0 0 640 230" className="h-auto w-full" role="img" aria-label={mapLabel}>
        <rect x="74" y="44" width="492" height="172" rx="10" fill="none" stroke={OUTLINE} />

        <rect x="200" y="12" width="240" height="18" rx="4" fill="var(--accent)" />
        <text
          x="320"
          y="25"
          textAnchor="middle"
          fontSize="15"
          fontWeight="600"
          fill={INK}
          letterSpacing="2"
        >
          {stageLabel}
        </text>

        <rect
          x="185"
          y="52"
          width="270"
          height="38"
          rx="6"
          fill={fill('VIP')}
          stroke={stroke('VIP')}
        />
        <text
          x="320"
          y="76"
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill={textFill(activeCategoryKey === 'VIP')}
        >
          {label(vip, 'VIP Depan')}
        </text>

        <rect
          x="185"
          y="96"
          width="270"
          height="46"
          rx="6"
          fill={fill('CAT1')}
          stroke={stroke('CAT1')}
        />
        <text
          x="320"
          y="124"
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill={textFill(activeCategoryKey === 'CAT1')}
        >
          {label(cat1, 'CAT 1')}
        </text>

        <rect
          x="185"
          y="148"
          width="270"
          height="52"
          rx="6"
          fill={fill('REG')}
          stroke={stroke('REG')}
        />
        <text
          x="320"
          y="179"
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill={textFill(activeCategoryKey === 'REG')}
        >
          {label(reg, 'Reguler')}
        </text>

        <path
          d="M 150 56 C 102 68 84 96 84 127 C 84 158 102 186 150 198"
          fill="none"
          stroke={OUTLINE}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M 150 56 C 102 68 84 96 84 127 C 84 158 102 186 150 198"
          fill="none"
          stroke={activeTribLeft ? (trib?.colorHex ?? 'var(--accent)') : MUTED}
          strokeWidth="24"
          strokeLinecap="round"
        />
        <text
          x="124"
          y="127"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={textFill(activeTribLeft)}
        >
          {t('seat.left')}
        </text>

        <path
          d="M 490 56 C 538 68 556 96 556 127 C 556 158 538 186 490 198"
          fill="none"
          stroke={OUTLINE}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M 490 56 C 538 68 556 96 556 127 C 556 158 538 186 490 198"
          fill="none"
          stroke={activeTribRight ? (trib?.colorHex ?? 'var(--accent)') : MUTED}
          strokeWidth="24"
          strokeLinecap="round"
        />
        <text
          x="516"
          y="127"
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
