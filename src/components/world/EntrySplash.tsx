'use client'

import Link from 'next/link'
import { LangToggle } from '@/components/ui/LangToggle'
import { useLang, useT } from '@/lib/i18n'
import { formatEventDate, type EventInfo } from '@/lib/types'

export function EntrySplash({
  event,
  failed,
  onEnter,
  entering,
}: {
  event: EventInfo | null
  failed: boolean
  onEnter: () => void
  entering: boolean
}) {
  const { lang } = useLang()
  const t = useT()

  const title = event ? (lang === 'id' ? event.name : event.nameEn) : ''
  const venue = event ? (lang === 'id' ? event.venue : event.venueEn) : ''
  const description = event ? (lang === 'id' ? event.description : event.descriptionEn) : ''
  const shortName = title.includes('—') ? title.split('—').pop()!.trim() : title
  const titleWords = shortName.split(' ').filter(Boolean)
  const titleLead = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords.slice(-1).join(' ')

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 pb-10 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </span>
        <div className="flex items-center gap-3">
          <Link href="/deck" className="hidden text-xs text-muted transition hover:text-foreground sm:block">
            {t('common.deck')}
          </Link>
          <Link href="/admin" className="hidden text-xs text-muted transition hover:text-foreground sm:block">
            {t('common.admin')}
          </Link>
          <LangToggle />
        </div>
      </header>

      <main className="relative mt-4 flex flex-1 flex-col justify-center overflow-hidden rounded-3xl border border-line px-5 py-14 sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #f5c542, #7c5cff 60%, transparent)' }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            {t('hero.badge')}
          </span>

          <h1 className="text-balance mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {shortName ? (
              <>
                {titleLead}{' '}
                <span className="bg-gradient-to-r from-accent via-amber-200 to-accent bg-clip-text text-transparent">
                  {titleAccent}
                </span>
              </>
            ) : failed ? (
              'Pataka'
            ) : (
              <span className="block h-14 w-2/3 animate-pulse rounded-xl bg-white/10 sm:h-20" />
            )}
          </h1>

          <p className="text-balance mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {failed ? t('error.generic') : description || t('common.loading')}
          </p>

          {event && (
            <dl className="mt-7 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
              <div className="flex items-center gap-2">
                <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('hero.dateLabel')}</dt>
                <dd className="font-medium">{formatEventDate(event.startsAt, lang)} WIB</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('hero.venueLabel')}</dt>
                <dd className="font-medium">{venue}</dd>
              </div>
            </dl>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={entering}
              onClick={onEnter}
              className="accent-glow rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
            >
              {t('splash.enter')} →
            </button>
            <Link
              href="/book"
              className="rounded-full border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-white/30 hover:text-foreground"
            >
              {t('splash.classic')}
            </Link>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            {t('home.assumption')}
            <span className="mt-1 block">Pataka · Bandung Build Challenge 2026</span>
          </p>
        </div>
      </main>
    </div>
  )
}
