'use client'

import { CategoryCards } from '@/components/visitor/CategoryCards'
import { useT } from '@/lib/i18n'
import type { Category } from '@/lib/types'

/** Category picker opened by tapping the in-world ticket booth. */
export function BoothOverlay({
  open,
  categories,
  onChoose,
  onClose,
}: {
  open: boolean
  categories: Category[] | null
  onChoose: (category: Category) => void
  onClose: () => void
}) {
  const t = useT()
  if (!open || !categories) return null

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="panel max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-white/15 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t('home.ticketsTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('home.ticketsSub')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.back')}
            title={t('common.back')}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-sm text-muted transition hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <CategoryCards categories={categories} compact onChoose={onChoose} />
        </div>
      </div>
    </div>
  )
}
