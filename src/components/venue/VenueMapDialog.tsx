'use client'

import { Dialog } from '@/components/ui/Dialog'
import { XIcon } from '@/components/ui/icons'
import { useT } from '@/lib/i18n'
import { VenueMapCard } from './VenueMapCard'

/** Full-size vector map, shown above the app's dark chrome. */
export function VenueMapDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={t('venue.title')}
      plain
      panelClassName="max-w-3xl rounded-none! p-0 sm:rounded-sm!"
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-paper/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
                {t('venue.title')}
              </h2>
              <p className="mt-1 text-xs text-paper/55">{t('venue.subtitle')}</p>
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
          <div className="p-3 sm:p-4">
            <VenueMapCard variant="full" showHeading={false} />
          </div>
        </>
      )}
    </Dialog>
  )
}
