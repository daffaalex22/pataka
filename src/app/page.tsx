'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LangToggle } from '@/components/ui/LangToggle'
import { CategoryCards } from '@/components/visitor/CategoryCards'
import { useLang, useT } from '@/lib/i18n'
import { useBooking } from '@/lib/store'
import { formatEventDate, type Category, type EventInfo } from '@/lib/types'
type EventResponse = { event: EventInfo; categories: Category[] }

export default function Home() {
  const router = useRouter()
  const { lang } = useLang()
  const t = useT()
  const setCategory = useBooking((s) => s.setCategory)
  const resetBooking = useBooking((s) => s.reset)
  const [data, setData] = useState<EventResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/event')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setData)
      .catch(() => setFailed(true))
  }, [])

  const choose = (category: Category) => {
    resetBooking()
    setCategory(category.key)
    router.push('/book')
  }

  const event = data?.event
  const title = event ? (lang === 'id' ? event.name : event.nameEn) : ''
  const venue = event ? (lang === 'id' ? event.venue : event.venueEn) : ''
  const description = event ? (lang === 'id' ? event.description : event.descriptionEn) : ''
  const shortName = title.includes('—') ? title.split('—').pop()!.trim() : title
  const titleWords = shortName.split(' ').filter(Boolean)
  const titleLead = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords.slice(-1).join(' ')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </Link>
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

      <main className="flex flex-1 flex-col">
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-line px-5 py-12 sm:px-10 sm:py-16">
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
              {failed
                ? t('error.generic')
                : description || t('common.loading')}
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

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetBooking()
                  router.push('/book')
                }}
                className="accent-glow rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.99]"
              >
                {t('hero.cta')} →
              </button>
              <a
                href="#tickets"
                className="rounded-full border border-line px-6 py-3 text-sm font-medium text-muted transition hover:border-white/30 hover:text-foreground"
              >
                {t('hero.secondary')}
              </a>
            </div>
          </div>
        </section>

        <section id="tickets" className="mt-12 scroll-mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('home.ticketsTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{t('home.ticketsSub')}</p>
            </div>
          </div>
          <div className="mt-5">
            {data ? (
              <CategoryCards categories={data.categories} onChoose={choose} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="panel h-40 animate-pulse rounded-2xl" />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { n: '01', title: t('home.how1Title'), body: t('home.how1Body') },
            { n: '02', title: t('home.how2Title'), body: t('home.how2Body') },
            { n: '03', title: t('home.how3Title'), body: t('home.how3Body') },
          ].map((item) => (
            <div key={item.n} className="panel rounded-2xl p-5">
              <span className="font-mono text-xs text-accent">{item.n}</span>
              <p className="mt-2 font-medium">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
          <p>{t('home.assumption')}</p>
          <p className="mt-1">Pataka · Bandung Build Challenge 2026</p>
        </footer>
      </main>
    </div>
  )
}
