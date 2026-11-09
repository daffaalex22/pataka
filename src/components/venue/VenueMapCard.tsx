'use client'

import { useT } from '@/lib/i18n'
import { VenueMapImage } from './VenueMapImage'

/** Light map surface used inside the dark app. */
export function VenueMapCard({
  variant = 'full',
  onEnlarge,
  className = '',
}: {
  variant?: 'full' | 'compact'
  onEnlarge?: () => void
  className?: string
}) {
  const t = useT()
  const compact = variant === 'compact'

  return (
    <div
      data-venue-card={variant}
      className={`overflow-hidden rounded-2xl border border-black/10 bg-[#f7f5f0] text-[#2f2f2f] ${className}`}
    >
      {compact ? (
        <div className="flex items-center justify-between gap-3 px-3 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5c5c]">
            {t('venue.subtitle')}
          </p>
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#f5c542]" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-sm font-semibold">{t('venue.title')}</p>
            <p className="mt-0.5 text-[11px] text-[#6b6b6b]">{t('venue.subtitle')}</p>
          </div>
          {onEnlarge && (
            <button
              type="button"
              onClick={onEnlarge}
              className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#4d4d4d] transition hover:border-black/30 hover:bg-black/5"
            >
              {t('venue.enlarge')}
            </button>
          )}
        </div>
      )}

      <div className={compact ? 'px-2 pb-2 pt-1.5' : 'px-3 pt-2'}>
        <VenueMapImage
          variant={variant}
          title={t('venue.title')}
          description={t('venue.caption')}
          eventLabel={t('venue.eventHere')}
        />
      </div>

      {!compact && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-[11px] leading-relaxed text-[#6b6b6b]">{t('venue.caption')}</p>
          <p className="mt-1 text-[10px] text-[#8a8a8a]">{t('venue.source')}</p>
        </div>
      )}
    </div>
  )
}
