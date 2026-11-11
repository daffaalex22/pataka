'use client'

import { useT } from '@/lib/i18n'
import { VenueMapImage } from './VenueMapImage'

/** Light map surface used inside the dark app. */
export function VenueMapCard({
  variant = 'full',
  onEnlarge,
  showHeading = true,
  className = '',
}: {
  variant?: 'full' | 'compact'
  onEnlarge?: () => void
  showHeading?: boolean
  className?: string
}) {
  const t = useT()
  const compact = variant === 'compact'

  return (
    <div
      data-venue-card={variant}
      className={`overflow-hidden rounded-2xl border border-black/10 bg-[#f7f5f0] text-[#2f2f2f] ${className}`}
    >
      {showHeading &&
        (compact ? (
          <div className="flex items-center justify-between gap-3 px-3 pt-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c5c5c]">
              {t('venue.subtitle')}
            </p>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#f5c542]" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <p className="text-sm font-semibold">{t('venue.title')}</p>
              <p className="mt-0.5 text-xs text-[#5c5c5c]">{t('venue.subtitle')}</p>
            </div>
            {onEnlarge && (
              <button
                type="button"
                onClick={onEnlarge}
                className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm border border-black/15 px-3 text-xs font-medium text-[#4d4d4d] transition hover:border-black/30 hover:bg-black/5"
              >
                {t('venue.enlarge')}
              </button>
            )}
          </div>
        ))}

      <div className={compact ? 'px-2 pb-2 pt-1.5' : showHeading ? 'px-3 pt-2' : 'px-3 pt-3'}>
        <VenueMapImage
          variant={variant}
          title={t('venue.title')}
          description={t('venue.caption')}
          eventLabel={t('venue.eventHere')}
        />
      </div>

      {!compact && (
        <div className="px-4 pb-4 pt-1.5">
          <p className="text-xs leading-relaxed text-[#5c5c5c]">{t('venue.caption')}</p>
          <p className="mt-1.5 text-xs text-[#5c5c5c]">{t('venue.source')}</p>
        </div>
      )}
    </div>
  )
}
