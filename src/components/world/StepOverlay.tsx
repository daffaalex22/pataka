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
      plain
      panelClassName="max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      {open && children}
    </Dialog>
  )
}
