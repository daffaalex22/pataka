'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LangToggle } from '@/components/ui/LangToggle'
import { ChevronRightIcon, XIcon } from '@/components/ui/icons'
import { useLang, useT } from '@/lib/i18n'
import { listTickets, removeTicket, type SavedTicket } from '@/lib/ticketStore'
import { formatIdr } from '@/lib/types'

type TicketSummary = {
  orderCode: string
  name: string
  status: 'pending' | 'paid' | 'cancelled'
  totalIdr: number
  seatLabel: string
  seatRow: string
  seatNum: number
  categoryName: string
  categoryNameEn: string
}

type SummaryEntry = TicketSummary | 'error'

export default function TicketsPage() {
  const { lang } = useLang()
  const t = useT()
  const [tickets, setTickets] = useState<SavedTicket[]>([])
  const [summaries, setSummaries] = useState<Record<string, SummaryEntry>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = listTickets()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saved tickets live in localStorage, readable only after mount
    setTickets(saved)
    setReady(true)
    if (saved.length === 0) return

    let cancelled = false
    Promise.all(
      saved.map(async (ticket): Promise<[string, SummaryEntry]> => {
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(ticket.code)}`)
          if (!res.ok) return [ticket.code, 'error']
          return [ticket.code, (await res.json()) as TicketSummary]
        } catch {
          return [ticket.code, 'error']
        }
      }),
    ).then((entries) => {
      if (!cancelled) setSummaries(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const statusLabel = (status: TicketSummary['status']) =>
    status === 'paid'
      ? t('admin.statusPaid')
      : status === 'cancelled'
        ? t('admin.statusCancelled')
        : t('summary.statusPending')

  const statusDotClass = (status: TicketSummary['status']) =>
    status === 'paid'
      ? 'bg-emerald-700'
      : status === 'cancelled'
        ? 'bg-red-700'
        : 'bg-amber-600'

  const seatLabel = (summary: TicketSummary) =>
    `${t('seat.rowLabel')} ${summary.seatRow} · ${t('seat.numberLabel')} ${summary.seatNum}`

  const loadingSome = ready && tickets.length > 0 && Object.keys(summaries).length < tickets.length

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-16 sm:px-6">
        <header className="flex items-center justify-between border-b border-paper/10 py-5">
          <Link
            href="/"
            className="focus-ring flex min-h-11 items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper"
          >
            PATAKA
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          </Link>
          <LangToggle />
        </header>

        <main className="flex-1">
          <div className="pt-8 sm:pt-10">
            <h1 className="text-balance font-display text-[clamp(2.75rem,8vw,4.25rem)] uppercase leading-[0.88] tracking-[0.01em]">
              {t('tickets.title')}
            </h1>
            <p className="mt-2 text-sm text-paper/60">{t('tickets.subtitle')}</p>
          </div>

          {ready && tickets.length === 0 && (
            <div className="mt-8 max-w-2xl border-y border-paper/10 py-10">
              <p className="font-display text-3xl uppercase leading-none tracking-[0.01em]">
                {t('tickets.emptyTitle')}
              </p>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-paper/60">{t('tickets.empty')}</p>
              <Link
                href="/"
                className="focus-ring mt-6 inline-flex min-h-12 items-center rounded-sm bg-accent px-6 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                {t('tickets.emptyCta')}
              </Link>
            </div>
          )}

          {loadingSome && (
            <p role="status" aria-live="polite" className="sr-only">
              {t('tickets.loading')}
            </p>
          )}

          <ul className="mt-7 max-w-3xl space-y-3">
            {tickets.map((ticket) => {
              const summary = summaries[ticket.code]
              return (
                <li
                  key={ticket.code}
                  className="bg-paper text-ink shadow-[0_18px_44px_-28px_rgba(0,0,0,0.85)]"
                >
                  {summary === 'error' ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                      <div className="min-w-0">
                        <p className="font-mono text-xs tabular-nums text-ink/65">{ticket.code}</p>
                        <p className="mt-1 text-sm text-ink/75">{t('tickets.error')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/eticket/${encodeURIComponent(ticket.code)}`}
                          className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-sm border border-ink/20 px-3 text-xs font-semibold text-ink transition-colors hover:border-ink/40"
                        >
                          {t('tickets.view')}
                          <ChevronRightIcon className="size-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTickets(removeTicket(ticket.code))}
                          aria-label={t('tickets.remove')}
                          title={t('tickets.remove')}
                          className="focus-ring grid size-11 place-items-center rounded-sm border border-ink/15 text-ink/60 transition-colors hover:border-red-700/40 hover:text-red-800"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : summary ? (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                        <div className="min-w-0">
                          <p className="text-xs text-ink/65">
                            {lang === 'id' ? summary.categoryName : summary.categoryNameEn}
                          </p>
                          <p className="mt-1 font-display text-[clamp(1.7rem,4vw,2.25rem)] uppercase leading-[0.95] tracking-[0.01em]">
                            {seatLabel(summary)}
                          </p>
                          <p className="mt-1.5 text-sm tabular-nums text-ink/75">
                            {formatIdr(summary.totalIdr, lang)}
                          </p>
                        </div>
                        <p className="inline-flex items-center gap-1.5 pt-0.5 text-xs font-medium text-ink/75 sm:pt-0">
                          <span
                            aria-hidden
                            className={`size-1.5 rounded-full ${statusDotClass(summary.status)}`}
                          />
                          {statusLabel(summary.status)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-ink/25 px-4 py-2.5 sm:px-5">
                        <p className="font-mono text-xs tabular-nums text-ink/65">{ticket.code}</p>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/eticket/${encodeURIComponent(ticket.code)}`}
                            className={`focus-ring inline-flex min-h-11 items-center gap-1 rounded-sm px-3 text-xs font-semibold transition-colors ${
                              summary.status === 'pending'
                                ? 'bg-accent text-ink hover:brightness-110'
                                : 'border border-ink/20 text-ink hover:border-ink/40'
                            }`}
                          >
                            {summary.status === 'pending'
                              ? t('tickets.continuePay')
                              : t('tickets.view')}
                            <ChevronRightIcon className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTickets(removeTicket(ticket.code))}
                            aria-label={t('tickets.remove')}
                            title={t('tickets.remove')}
                            className="focus-ring grid size-11 place-items-center rounded-sm border border-ink/15 text-ink/60 transition-colors hover:border-red-700/40 hover:text-red-800"
                          >
                            <XIcon className="size-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div aria-hidden className="p-4 sm:p-5">
                      <div className="h-3 w-16 rounded-sm bg-ink/10" />
                      <div className="mt-2 h-7 w-52 max-w-full rounded-sm bg-ink/10" />
                      <div className="mt-2 h-3 w-32 rounded-sm bg-ink/10" />
                      <div className="mt-5 flex items-center justify-between border-t border-dashed border-ink/20 pt-3">
                        <div className="h-3 w-24 rounded-sm bg-ink/10" />
                        <div className="h-8 w-20 rounded-sm bg-ink/10" />
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </main>
      </div>
    </div>
  )
}
