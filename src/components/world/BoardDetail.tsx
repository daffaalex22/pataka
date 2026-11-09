'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { VenueMapCard } from '@/components/venue/VenueMapCard'
import { VenueMapDialog } from '@/components/venue/VenueMapDialog'
import { useLang, useT } from '@/lib/i18n'
import { formatEventDate, formatIdr, type Category, type EventInfo } from '@/lib/types'

/** Detail panel opened by tapping the in-world announcement board. */
export function BoardDetail({
  open,
  event,
  categories,
  onClose,
}: {
  open: boolean
  event: EventInfo
  categories: Category[]
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const [tab, setTab] = useState<'event' | 'venue'>('event')
  const [mapOpen, setMapOpen] = useState(false)

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        ariaLabel={t('board.detailTitle')}
        panelClassName={`${
          tab === 'venue' ? 'max-w-3xl' : 'max-w-lg'
        } p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent">{t('board.detailTitle')}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {lang === 'id' ? event.name : event.nameEn}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('board.close')}
            title={t('board.close')}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-sm text-muted transition hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div
          role="tablist"
          aria-label={t('board.detailTitle')}
          className="mt-4 flex gap-1 rounded-full border border-line p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'event'}
            onClick={() => setTab('event')}
            className={`flex-1 rounded-full px-3 py-2 font-medium transition ${
              tab === 'event' ? 'bg-accent text-black' : 'text-muted hover:text-foreground'
            }`}
          >
            {t('board.tabEvent')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'venue'}
            onClick={() => setTab('venue')}
            className={`flex-1 rounded-full px-3 py-2 font-medium transition ${
              tab === 'venue' ? 'bg-accent text-black' : 'text-muted hover:text-foreground'
            }`}
          >
            {t('board.tabVenue')}
          </button>
        </div>

        {tab === 'event' ? (
          <>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t('hero.dateLabel')}</dt>
                <dd className="text-right font-medium">{formatEventDate(event.startsAt, lang)} WIB</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t('hero.venueLabel')}</dt>
                <dd className="text-right font-medium">{lang === 'id' ? event.venue : event.venueEn}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm leading-relaxed text-muted">
              {lang === 'id' ? event.description : event.descriptionEn}
            </p>

            <div className="mt-5 grid gap-2">
              {categories.map((category) => (
                <div
                  key={category.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.03] px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.colorHex }}
                    />
                    <span className="truncate text-sm font-medium">
                      {lang === 'id' ? category.name : category.nameEn}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="text-accent">{formatIdr(category.priceIdr, lang)}</span>
                    <span className="text-muted">
                      {category.remaining} {t('cat.available')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <VenueMapCard variant="full" onEnlarge={() => setMapOpen(true)} />
          </div>
        )}
      </Dialog>

      <VenueMapDialog open={open && mapOpen} onClose={() => setMapOpen(false)} />
    </>
  )
}
