'use client'

import { SeatPicker2D } from '@/components/visitor/SeatPicker2D'
import { HoldTimer } from '@/components/visitor/HoldTimer'
import { TicketTierList } from '@/components/visitor/TicketTierList'
import { Dialog } from '@/components/ui/Dialog'
import { useCountdown } from '@/components/ui/useCountdown'
import { ArrowLeftIcon, XIcon } from '@/components/ui/icons'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Category, type Seat } from '@/lib/types'

export type BoothStage = 'categories' | 'seats'

/**
 * In-world ticket booth flow: choose a tier, then pick a seat from the same
 * list the direct booking page uses. Holding hands off to the existing
 * form/summary/payment overlays.
 */
export function BoothOverlay({
  open,
  stage,
  categories,
  categoryKey,
  seats,
  selected,
  busy,
  error,
  holdExpiresAt,
  holdSeatId,
  onChoose,
  onSelect,
  onHold,
  onResume,
  onBack,
  onClose,
}: {
  open: boolean
  stage: BoothStage
  categories: Category[] | null
  categoryKey: string | null
  seats: Seat[]
  selected: Seat | null
  busy: boolean
  error: string | null
  holdExpiresAt: string | null
  holdSeatId: string | null
  onChoose: (category: Category) => void
  onSelect: (seat: Seat) => void
  onHold: () => void
  onResume: () => void
  onBack: () => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const held = Boolean(selected && holdExpiresAt && holdSeatId === selected.id)
  const countdown = useCountdown(held ? holdExpiresAt : null)
  const categoryName = selected
    ? lang === 'id'
      ? selected.categoryName
      : selected.categoryNameEn
    : null
  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={t('board.close')}
      title={t('board.close')}
      className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
    >
      <XIcon className="size-4" />
    </button>
  )

  return (
    <Dialog
      open={open && Boolean(categories)}
      onClose={onClose}
      ariaLabel={stage === 'categories' ? t('home.ticketsTitle') : t('seat.title')}
      plain
      panelClassName={
        stage === 'categories'
          ? 'max-w-lg rounded-none! p-0 sm:rounded-sm!'
          : 'max-w-3xl rounded-none! p-0 sm:rounded-sm!'
      }
    >
      {open &&
        categories &&
        (stage === 'categories' ? (
          <>
            <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-5 sm:pt-5">
              <div className="min-w-0">
                <h2 className="text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
                  {t('home.ticketsTitle')}
                </h2>
                <p className="mt-1 text-sm text-paper/60">{t('home.ticketsSub')}</p>
              </div>
              {closeButton}
            </div>

            <div className="px-4 pb-4 sm:px-5">
              <TicketTierList categories={categories} onChoose={onChoose} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-paper/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={onBack}
                  className="focus-ring -my-2 inline-flex items-center gap-1 py-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  {t('common.back')}
                </button>
                <h2 className="mt-2 text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
                  {t('seat.title')}
                </h2>
                <p className="mt-1 text-sm text-paper/60">{t('seat.subtitle')}</p>
              </div>
              {closeButton}
            </div>

            {error && (
              <div
                role="alert"
                className="mx-4 mt-3 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <div className="px-4 pb-2 pt-4 sm:px-5">
              {seats.length > 0 ? (
                <SeatPicker2D
                  seats={seats}
                  categoryKey={categoryKey}
                  selectedId={selected?.id ?? null}
                  onSelect={onSelect}
                  stageLabel={t('seat.stage')}
                />
              ) : (
                <p className="py-6 text-center text-sm text-paper/55">{t('common.loading')}</p>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-paper/15 bg-ink px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              {selected ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-paper/55">
                      {held ? t('seat.yourSeat') : t('seat.selected')}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-paper">
                      {t('seat.rowLabel')} {selected.row} · {t('seat.numberLabel')} {selected.num}
                    </p>
                    <p className="mt-0.5 text-xs text-paper/55">
                      {categoryName} · {formatIdr(selected.priceIdr, lang)}
                      {selected.autoDiscountIdr > 0 && (
                        <>
                          <span className="ml-1.5 line-through">
                            {formatIdr(selected.listPriceIdr, lang)}
                          </span>
                          <span className="ml-1.5 text-emerald-300">
                            {lang === 'id'
                              ? selected.autoDiscountName
                              : selected.autoDiscountNameEn}{' '}
                            · −{formatIdr(selected.autoDiscountIdr, lang)}
                          </span>
                        </>
                      )}
                      {selected.status !== 'available' && (
                        <span
                          className={
                            selected.status === 'held' ? 'text-amber-300' : 'text-paper/40'
                          }
                        >
                          {' '}
                          · {t(`status.${selected.status}`)}
                        </span>
                      )}
                    </p>
                    {held && <HoldTimer countdown={countdown} className="mt-1.5" />}
                  </div>

                  <div className="flex items-center gap-2">
                    {held ? (
                      <button
                        type="button"
                        onClick={onResume}
                        className="focus-ring flex-1 rounded-sm bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:flex-none"
                      >
                        {t('seat.resume')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || selected.status !== 'available'}
                        onClick={onHold}
                        className="focus-ring flex-1 rounded-sm bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      >
                        {busy ? t('common.loading') : t('seat.choose')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-1 text-center text-xs text-paper/55">{t('seat.selectFirst')}</p>
              )}
            </div>
          </>
        ))}
    </Dialog>
  )
}
