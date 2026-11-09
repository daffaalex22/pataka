import Image from 'next/image'

const MAP_SRC = '/venue/summarecon-ground-floor.jpg'
const MAP_WIDTH = 2606
const MAP_HEIGHT = 1600

/** Official Summarecon ground-floor map with the event pin over Sawarga Courtyard. */
export function VenueMapImage({
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
    <div
      className={`relative overflow-hidden rounded-xl bg-white ${
        compact ? 'aspect-[2/1]' : ''
      } ${className}`}
    >
      <Image
        src={MAP_SRC}
        alt={`${title}. ${description}`}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        sizes={compact ? '(min-width: 640px) 34rem, 100vw' : '(min-width: 768px) 48rem, 100vw'}
        className={compact ? 'h-full w-full object-cover' : 'h-auto w-full'}
        style={compact ? { objectPosition: '50% 52%' } : undefined}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: '50%', top: '44%' }}
      >
        <div className="flex flex-col items-center">
          {!compact && (
            <span className="rounded-full bg-[#2f2f2f]/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#f5c542] shadow-sm">
              {eventLabel}
            </span>
          )}
          <span
            className={`grid place-items-center rounded-full bg-[#f5c542] shadow-[0_0_0_5px_rgba(245,197,66,0.25)] ${
              compact ? 'mt-0 size-4' : 'mt-1.5 size-5'
            }`}
          >
            <span className="size-1.5 rounded-full bg-[#2f2f2f]" />
          </span>
        </div>
      </div>
    </div>
  )
}
