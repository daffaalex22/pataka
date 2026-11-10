'use client'

import Link from 'next/link'
import { Legend } from '@/components/ui/Legend'
import { LangToggle } from '@/components/ui/LangToggle'
import { useT } from '@/lib/i18n'

export function WorldHud({
  mode,
  onMode,
  mapEnabled,
  mapOpen,
  onToggleMap,
  hint,
  onExit,
}: {
  mode: 'walk' | 'orbit'
  onMode: (mode: 'walk' | 'orbit') => void
  mapEnabled: boolean
  mapOpen: boolean
  onToggleMap: () => void
  hint: string | null
  onExit: () => void
}) {
  const t = useT()

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
              event.preventDefault()
              onExit()
            }}
            className="focus-ring -my-3 flex items-center gap-2 py-3 text-sm font-semibold tracking-[0.22em] transition-colors hover:text-accent"
          >
            PATAKA
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          </Link>
          <Link href="/deck" className="hidden text-xs text-white/50 transition hover:text-white sm:block">
            {t('common.deck')}
          </Link>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/book"
              className="rounded-full border border-white/15 bg-black/40 px-3 py-2.5 text-[11px] font-medium text-white/70 backdrop-blur transition hover:text-white"
            >
              {t('splash.direct')}
            </Link>
            <LangToggle />
          </div>

          <div className="flex rounded-full border border-white/15 bg-black/40 p-0.5 text-[11px] font-medium backdrop-blur">
            <button
              type="button"
              onClick={() => onMode('orbit')}
              className={`rounded-full px-3 py-2.5 transition ${mode === 'orbit' ? 'bg-accent text-black' : 'text-white/70'}`}
            >
              ⟲ {t('seat.orbit')}
            </button>
            <button
              type="button"
              onClick={() => onMode('walk')}
              className={`rounded-full px-3 py-2.5 transition ${mode === 'walk' ? 'bg-accent text-black' : 'text-white/70'}`}
            >
              ⌂ {t('seat.walk')}
            </button>
            <button
              type="button"
              disabled={!mapEnabled}
              onClick={onToggleMap}
              aria-pressed={mapOpen}
              className={`rounded-full px-3 py-2.5 transition disabled:opacity-40 ${
                mapOpen ? 'bg-accent text-black' : 'text-white/70'
              }`}
            >
              {t('seat.viewMap')}
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur">
            <Legend />
          </div>
        </div>
      </div>

      {hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center px-4">
          <p className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-center text-xs text-white/80 backdrop-blur">
            {hint}
          </p>
        </div>
      )}
    </>
  )
}
