'use client'

import { TicketTierList } from '@/components/visitor/TicketTierList'
import { Dialog } from '@/components/ui/Dialog'
import { XIcon } from '@/components/ui/icons'
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

  return (
    <Dialog
      open={open && Boolean(categories)}
      onClose={onClose}
      ariaLabel={t('home.ticketsTitle')}
      plain
      panelClassName="max-w-lg rounded-none! p-0 sm:rounded-sm!"
    >
      {categories && (
        <>
          <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="min-w-0">
              <h2 className="text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
                {t('home.ticketsTitle')}
              </h2>
              <p className="mt-1 text-sm text-paper/60">{t('home.ticketsSub')}</p>
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
            <TicketTierList categories={categories} onChoose={onChoose} />
          </div>
        </>
      )}
    </Dialog>
  )
}
