'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { XIcon } from '@/components/ui/icons'
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
        plain
        panelClassName={`${tab === 'venue' ? 'max-w-3xl' : 'max-w-lg'} rounded-none! p-0 sm:rounded-sm!`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-paper/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs text-accent">{t('board.detailTitle')}</p>
            <h2 className="mt-1 text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
              {lang === 'id' ? event.name : event.nameEn}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('board.close')}
            title={t('board.close')}
            className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <div
            role="tablist"
            aria-label={t('board.detailTitle')}
            className="mt-4 grid grid-cols-2 rounded-sm border border-paper/15"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'event'}
              onClick={() => setTab('event')}
              className={`focus-ring inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium transition-colors ${
                tab === 'event' ? 'bg-accent text-ink' : 'text-paper/70 hover:text-paper'
              }`}
            >
              {t('board.tabEvent')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'venue'}
              onClick={() => setTab('venue')}
              className={`focus-ring inline-flex min-h-11 items-center justify-center border-l border-paper/15 px-3 text-sm font-medium transition-colors ${
                tab === 'venue' ? 'bg-accent text-ink' : 'text-paper/70 hover:text-paper'
              }`}
            >
              {t('board.tabVenue')}
            </button>
          </div>

          {tab === 'event' ? (
            <>
              <dl className="mt-4 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-paper/10 py-3">
                  <dt className="text-xs text-paper/55">{t('hero.dateLabel')}</dt>
                  <dd className="text-right font-medium text-paper">
                    {formatEventDate(event.startsAt, lang)} WIB
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-paper/10 py-3">
                  <dt className="text-xs text-paper/55">{t('hero.venueLabel')}</dt>
                  <dd className="text-right font-medium text-paper">
                    {lang === 'id' ? event.venue : event.venueEn}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-sm leading-relaxed text-paper/65">
                {lang === 'id' ? event.description : event.descriptionEn}
              </p>

              <ul className="mt-5 border-t border-paper/10">
                {categories.map((category) => (
                  <li
                    key={category.key}
                    className="flex items-center justify-between gap-3 border-b border-paper/10 py-3 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: category.colorHex }}
                      />
                      <span className="truncate text-sm font-medium text-paper">
                        {lang === 'id' ? category.name : category.nameEn}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-sm font-medium tabular-nums text-accent">
                        {formatIdr(category.priceIdr, lang)}
                      </span>
                      <span className="text-xs text-paper/50">
                        {category.remaining} {t('cat.available')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <VenueMapCard variant="full" onEnlarge={() => setMapOpen(true)} />
            </div>
          )}
        </div>
      </Dialog>

      <VenueMapDialog open={open && mapOpen} onClose={() => setMapOpen(false)} />
    </>
  )
}
