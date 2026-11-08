'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LangToggle } from '@/components/ui/LangToggle'
import { useLang, useT } from '@/lib/i18n'
import { listTickets, removeTicket, type SavedTicket } from '@/lib/ticketStore'
import { formatIdr } from '@/lib/types'

type TicketSummary = {
  orderCode: string
  name: string
  status: 'pending' | 'paid' | 'cancelled'
  totalIdr: number
  seatLabel: string
  categoryName: string
  categoryNameEn: string
}

type SummaryEntry = TicketSummary | 'error'

export default function TicketsPage() {
  const { lang } = useLang()
  const t = useT()
  const [tickets, setTickets] = useState<SavedTicket[]>([])
  const [summaries, setSummaries] = useState<Record<string, SummaryEntry>>({})

  useEffect(() => {
    const saved = listTickets()
    setTickets(saved)
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

  const statusClass = (status: TicketSummary['status']) =>
    status === 'paid'
      ? 'bg-emerald-400/15 text-emerald-300'
      : status === 'cancelled'
        ? 'bg-red-400/15 text-red-300'
        : 'bg-amber-400/15 text-amber-300'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </Link>
        <LangToggle />
      </header>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t('tickets.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('tickets.subtitle')}</p>

      {tickets.length === 0 && (
        <div className="panel mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted">{t('tickets.empty')}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            {t('tickets.emptyCta')} →
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {tickets.map((ticket) => {
          const summary = summaries[ticket.code]
          return (
            <li key={ticket.code} className="panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">{ticket.code}</p>
                {summary === 'error' ? (
                  <p className="mt-1 text-sm text-muted">{t('tickets.error')}</p>
                ) : summary ? (
                  <>
                    <p className="mt-1 font-semibold">
                      {summary.seatLabel} · {lang === 'id' ? summary.categoryName : summary.categoryNameEn}
                    </p>
                    <p className="text-xs text-muted">{formatIdr(summary.totalIdr, lang)}</p>
                  </>
                ) : (
                  <div className="mt-2 h-4 w-40 animate-pulse rounded bg-white/10" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {summary && summary !== 'error' && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(summary.status)}`}>
                    {statusLabel(summary.status)}
                  </span>
                )}
                <Link
                  href={`/eticket/${encodeURIComponent(ticket.code)}`}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {t('tickets.view')} →
                </Link>
                <button
                  type="button"
                  onClick={() => setTickets(removeTicket(ticket.code))}
                  aria-label={t('tickets.remove')}
                  title={t('tickets.remove')}
                  className="grid size-8 place-items-center rounded-full border border-line text-sm text-muted transition hover:border-red-400/40 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
