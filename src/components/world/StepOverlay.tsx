'use client'

import type { ReactNode } from 'react'
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="panel max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-3xl border-white/15 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
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
      </div>
    </div>
  )
}
