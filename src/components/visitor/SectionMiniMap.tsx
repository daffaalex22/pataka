const MUTED_ZONE = 'rgba(244, 234, 216, 0.07)'
const OUTLINE = 'rgba(244, 234, 216, 0.14)'
const STAGE = 'rgba(244, 234, 216, 0.35)'

/** A tiny schematic of Sawarga Courtyard with the chosen ticket section lit. */
export function SectionMiniMap({
  categoryKey,
  colorHex,
  className = '',
}: {
  categoryKey: string
  colorHex: string
  className?: string
}) {
  const zone = (key: string) => (categoryKey === key ? colorHex : MUTED_ZONE)

  return (
    <span aria-hidden className={`block shrink-0 ${className}`}>
      <svg viewBox="0 0 72 72" className="h-full w-full">
        <rect x="0.5" y="0.5" width="71" height="71" rx="6" fill="none" stroke={OUTLINE} />
        <rect x="20" y="6" width="32" height="5" rx="2.5" fill={STAGE} />

        <rect x="18" y="15" width="36" height="8" rx="1.5" fill={zone('VIP')} />
        <rect x="16" y="26" width="40" height="14" rx="1.5" fill={zone('CAT1')} />
        <rect x="16" y="43" width="40" height="15" rx="1.5" fill={zone('REG')} />

        <rect x="4" y="20" width="8" height="34" rx="2" fill={zone('TRIB')} />
        <rect x="60" y="20" width="8" height="34" rx="2" fill={zone('TRIB')} />
      </svg>
    </span>
  )
}
