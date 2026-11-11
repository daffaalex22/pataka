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
      panelClassName="max-w-3xl p-3 sm:p-4"
    >
      {open && (
        <>
          <div className="flex items-center justify-end pb-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
            >
              <XIcon className="size-3.5" />
              {t('common.back')}
            </button>
          </div>
          <VenueMapCard variant="full" />
        </>
      )}
    </Dialog>
  )
}
