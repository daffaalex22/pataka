'use client'

import { Legend } from '@/components/ui/Legend'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

export function SeatStep({
  seats,
  categoryKey,
  selected,
  onSelect,
  onHold,
  holding,
  holdExpiresAt,
  onBack,
  onResume,
  error,
}: {
  seats: Seat[]
  categoryKey: string | null
  selected: Seat | null
  onSelect: (seat: Seat) => void
  onHold: () => void
  holding: boolean
  holdExpiresAt: string | null
  onBack: () => void
  onResume: () => void
  error: string | null
}) {
  const { lang } = useLang()
  const t = useT()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="text-xs text-muted transition hover:text-foreground">
            ← {t('common.back')}
          </button>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('seat.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('seat.subtitle')}</p>
        </div>
        <Legend />
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="panel mt-4 rounded-2xl p-2 sm:p-4">
        <SeatMap2D
          seats={seats}
          categoryKey={categoryKey}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          stageLabel={t('seat.stage')}
        />
      </div>

      <div className="sticky bottom-3 mt-3">
        {selected ? (
          <div className="panel flex items-center justify-between gap-4 rounded-2xl border-white/15 px-4 py-3 shadow-2xl">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('seat.yourSeat')}</p>
              <p className="truncate text-sm font-semibold">
                {selected.id} · {lang === 'id' ? selected.categoryName : selected.categoryNameEn}
              </p>
              <p className="text-xs text-muted">{formatIdr(selected.priceIdr, lang)}</p>
            </div>
            {holdExpiresAt ? (
              <button
                type="button"
                onClick={onResume}
                className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {t('seat.resume')} →
              </button>
            ) : (
              <button
                type="button"
                disabled={holding || selected.status !== 'available'}
                onClick={onHold}
                className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {holding ? t('common.loading') : t('seat.choose')}
              </button>
            )}
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-muted">{t('seat.selectFirst')}</p>
        )}
      </div>
    </div>
  )
}
