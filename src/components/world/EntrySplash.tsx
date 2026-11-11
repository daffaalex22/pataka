'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LangToggle } from '@/components/ui/LangToggle'
import { useLang, useT } from '@/lib/i18n'
import { formatEventDate, formatIdr, type Category, type EventInfo } from '@/lib/types'

export function EntrySplash({
  event,
  categories,
  failed,
  onEnter,
  entering,
}: {
  event: EventInfo | null
  categories: Category[]
  failed: boolean
  onEnter: () => void
  entering: boolean
}) {
  const { lang } = useLang()
  const t = useT()

  const title = event ? (lang === 'id' ? event.name : event.nameEn) : ''
  const venue = event ? (lang === 'id' ? event.venue : event.venueEn) : ''
  const description = event ? (lang === 'id' ? event.description : event.descriptionEn) : ''
  const firstSentence = description.split('. ')[0]
  const tagline = firstSentence ? (/[.!?]$/.test(firstSentence) ? firstSentence : `${firstSentence}.`) : ''
  const shortName = title.split(/[—–]/).pop()?.trim() || title
  const titleWords = shortName.split(' ').filter(Boolean)
  const titleLead = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords.slice(-1).join(' ')
  const bookable = categories.filter((category) => category.salesOpen && category.remaining > 0)
  const fromPrice = bookable.length > 0 ? Math.min(...bookable.map((category) => category.priceIdr)) : null

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-ink text-paper">
      <Image
        src="/home/venue-night.png"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[50%_34%]"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,7,11,0.94) 0%, rgba(8,7,11,0.64) 42%, rgba(8,7,11,0.12) 78%, rgba(8,7,11,0.35) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,7,11,0.68) 0%, rgba(8,7,11,0.16) 32%, rgba(8,7,11,0.74) 68%, rgba(8,7,11,0.97) 100%)',
        }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper"
        >
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </Link>

        <nav className="flex items-center gap-4 text-xs text-paper/65">
          <Link
            href="/tickets"
            className="focus-ring inline-flex min-h-11 items-center transition hover:text-paper"
          >
            {t('world.myTickets')}
          </Link>
          <Link
            href="/deck"
            className="focus-ring hidden min-h-11 min-w-11 items-center justify-center transition hover:text-paper sm:inline-flex"
          >
            {t('common.deck')}
          </Link>
          <Link
            href="/admin"
            className="focus-ring hidden min-h-11 min-w-11 items-center justify-center transition hover:text-paper sm:inline-flex"
          >
            {t('common.admin')}
          </Link>
          <LangToggle />
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-8 pt-24 sm:px-8 sm:pb-12 lg:justify-center lg:pb-20">
        <div className="max-w-3xl">
          <h1 className="font-display text-[clamp(3rem,7vw,6rem)] uppercase leading-[0.82] tracking-[0.01em]">
            {shortName ? (
              titleWords.length > 1 ? (
                <>
                  <span className="block">{titleLead}</span>
                  <span className="block text-accent">{titleAccent}</span>
                </>
              ) : (
                <span className="block">{shortName}</span>
              )
            ) : (
              <span className="block">Pataka</span>
            )}
          </h1>

          {tagline && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-paper/70 sm:text-base">
              {tagline}
            </p>
          )}

          {failed && <p className="mt-4 text-sm text-red-300">{t('error.generic')}</p>}
          {!event && !failed && <p className="mt-5 text-sm text-paper/60">{t('common.loading')}</p>}

          {event && (
            <>
              <span aria-hidden className="poster-rule mt-8 block h-px w-full bg-paper/20" />
              <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.16em] text-paper/65">
                    {t('hero.dateLabel')}
                  </dt>
                  <dd className="mt-1 font-medium text-paper">
                    {formatEventDate(event.startsAt, lang)} WIB
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.16em] text-paper/65">
                    {t('hero.venueLabel')}
                  </dt>
                  <dd className="mt-1 font-medium text-paper">{venue}</dd>
                </div>
                {fromPrice !== null && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.16em] text-paper/65">
                      {t('hero.fromLabel')}
                    </dt>
                    <dd className="mt-1 font-medium text-paper">{formatIdr(fromPrice, lang)}</dd>
                  </div>
                )}
              </dl>
            </>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <button
              type="button"
              disabled={entering}
              onClick={onEnter}
              className="group inline-flex items-center gap-3 rounded-sm bg-accent px-6 py-4 text-sm font-semibold tracking-wide text-ink transition hover:brightness-110 active:translate-y-px focus-ring disabled:cursor-wait disabled:opacity-70"
            >
              {entering ? t('splash.loading') : t('splash.enter')}
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="size-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 10h13M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Link
              href="/book"
              className="focus-ring inline-flex min-h-11 items-center text-sm font-medium text-paper/65 underline decoration-paper/30 underline-offset-4 transition hover:text-paper hover:decoration-paper/60"
            >
              {t('splash.direct')}
            </Link>
          </div>

          <p className="mt-10 max-w-xl text-xs leading-relaxed text-paper/55">
            {t('home.assumption')}
            <span className="mt-1 block">Pataka · Bandung Build Challenge 2026</span>
          </p>
        </div>
      </main>
    </div>
  )
}
