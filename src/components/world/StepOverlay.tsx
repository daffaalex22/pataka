'use client'

import type { ReactNode } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { useT } from '@/lib/i18n'

/** Dimmed panel above the (paused) scene for form/summary/payment steps. */
export function StepOverlay({
  open,
  onBack,
  children,
}: {
  open: boolean
  onBack: () => void
  children: ReactNode
}) {
  const t = useT()

  return (
    <Dialog
      open={open}
      onClose={onBack}
      ariaLabel={t('world.checkout')}
      panelClassName="max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          title={t('common.back')}
          className="grid size-11 place-items-center rounded-full border border-line text-sm text-muted transition hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {children}
    </Dialog>
  )
}
