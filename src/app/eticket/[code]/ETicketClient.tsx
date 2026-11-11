'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { LangToggle } from '@/components/ui/LangToggle'
import { useCountdown } from '@/components/ui/useCountdown'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { VenueMapCard } from '@/components/venue/VenueMapCard'
import { VenueMapDialog } from '@/components/venue/VenueMapDialog'
import { useLang, useT } from '@/lib/i18n'
import { saveTicket } from '@/lib/ticketStore'
import { formatEventDate, formatIdr, type EventInfo } from '@/lib/types'

type Ticket = {
  orderCode: string
  name: string
  status: 'pending' | 'paid' | 'cancelled'
  paymentMethod: string | null
  totalIdr: number
  holdExpiresAt: string | null
  holdActive: boolean
  seatLabel: string
  seatRow: string
  seatNum: number
  categoryKey: string
  categoryName: string
  categoryNameEn: string
  qrPayload: string | null
}

const METHOD_LABELS: Record<string, string> = {
  ewallet: 'E-Wallet',
  va: 'Virtual Account',
  qrpay: 'QRIS',
  manual: 'Manual',
}

export function ETicketClient() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const t = useT()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'not_configured' | 'failed'>('idle')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [holdLost, setHoldLost] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const holdCountdown = useCountdown(ticket?.holdExpiresAt ?? null)

  useEffect(() => {
    if (!code) return
    fetch(`/api/orders/${encodeURIComponent(code)}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setTicket(data as Ticket)
        saveTicket(code)
      })
      .catch(() => setNotFound(true))
    fetch('/api/event')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setEvent(data.event as EventInfo))
      .catch(() => {})
  }, [code])

  const sendEmail = async () => {
    if (!ticket) return
    setEmailState('sending')
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(ticket.orderCode)}/email`, { method: 'POST' })
      const data = res.ok ? ((await res.json()) as { status: 'sent' | 'not_configured' | 'failed' }) : null
      setEmailState(data?.status ?? 'failed')
    } catch {
      setEmailState('failed')
    }
  }

  const refreshTicket = async (orderCode: string) => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`)
      if (res.ok) setTicket((await res.json()) as Ticket)
    } catch {
      // the payment call already told us the outcome; the next visit refetches
    }
  }

  const payPending = async (method: 'ewallet' | 'va' | 'qrpay') => {
    if (!ticket) return
    setPaying(true)
    setPayError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(ticket.orderCode)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      if (res.ok) {
        saveTicket(ticket.orderCode)
        await refreshTicket(ticket.orderCode)
      } else if (res.status === 409) {
        setHoldLost(true)
        setPayError(t('error.holdExpired'))
        await refreshTicket(ticket.orderCode)
      } else {
        setPayError(t('error.generic'))
      }
    } catch {
      setPayError(t('error.generic'))
    } finally {
      setPaying(false)
    }
  }

  const pendingExpired =
    ticket?.status === 'pending' && (holdLost || !ticket.holdActive || holdCountdown.expired)
  const rebookHref = ticket?.categoryKey
    ? `/book?category=${encodeURIComponent(ticket.categoryKey)}`
    : '/book'
  const pendingSeatLabel = ticket
    ? `${t('seat.rowLabel')} ${ticket.seatRow} · ${t('seat.numberLabel')} ${ticket.seatNum}`
    : ''
  const pendingContext = ticket
    ? `${pendingSeatLabel} · ${lang === 'id' ? ticket.categoryName : ticket.categoryNameEn}`
    : ''

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/tickets" className="text-xs text-muted transition hover:text-foreground">
            {t('world.myTickets')}
          </Link>
          <LangToggle />
        </div>
      </header>

      {notFound && (
        <div className="panel mt-10 rounded-2xl p-8 text-center">
          <p className="text-lg font-medium">{t('eticket.notFound')}</p>
          <Link href="/" className="mt-3 inline-block text-sm text-accent hover:underline">
            {t('eticket.backHome')} →
          </Link>
        </div>
      )}

      {!notFound && !ticket && <div className="panel mt-6 h-96 animate-pulse rounded-3xl" />}

      {ticket && ticket.status === 'cancelled' && (
        <div className="panel mt-10 rounded-2xl p-8 text-center">
          <p className="text-sm uppercase tracking-[0.16em] text-red-300">{t('eticket.cancelledTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('eticket.cancelledBody')}</p>
          <p className="mt-2 font-mono text-xs text-muted">{ticket.orderCode}</p>
          <Link href="/" className="mt-3 inline-block text-sm text-accent hover:underline">
            {t('eticket.backHome')} →
          </Link>
        </div>
      )}

      {ticket && ticket.status === 'pending' && !pendingExpired && (
        <div className="mt-4">
          <PaymentStep
            totalIdr={ticket.totalIdr}
            holdExpiresAt={ticket.holdExpiresAt}
            contextLabel={pendingContext}
            paying={paying}
            error={payError}
            onBack={() => router.push('/tickets')}
            onPay={payPending}
          />
          <p className="mt-4 text-center font-mono text-xs text-paper/55">{ticket.orderCode}</p>
        </div>
      )}

      {ticket && ticket.status === 'pending' && pendingExpired && (
        <div className="mt-8 border border-paper/15 bg-paper/[0.02] px-5 py-6 text-center">
          <p className="text-sm font-medium text-amber-200">{t('eticket.expiredTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-paper/60">{t('eticket.expiredBody')}</p>
          <p className="mt-2 text-xs text-paper/55">
            {pendingSeatLabel} · <span className="font-mono">{ticket.orderCode}</span>
          </p>
          <Link
            href={rebookHref}
            className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            {t('eticket.chooseSeat')}
          </Link>
        </div>
      )}

      {ticket && ticket.status === 'paid' && (
        <div>
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
            <span aria-hidden className="grid size-6 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
            {t('eticket.success')}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t('eticket.title')}</h1>
          {event && (
            <p className="mt-1 text-sm text-muted">
              {lang === 'id' ? event.name : event.nameEn} · {formatEventDate(event.startsAt, lang)} WIB
            </p>
          )}
          {event && (
            <p className="text-sm text-muted">{lang === 'id' ? event.venue : event.venueEn}</p>
          )}

          <div className="accent-glow mt-6 overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-white/[0.07] to-white/[0.02]">
            <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{t('eticket.seat')}</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-accent">{ticket.seatLabel}</p>
                  <p className="mt-1 text-sm text-muted">
                    {lang === 'id' ? ticket.categoryName : ticket.categoryNameEn}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('eticket.name')}</dt>
                    <dd className="mt-0.5 font-medium">{ticket.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('eticket.code')}</dt>
                    <dd className="mt-0.5 font-mono font-medium">{ticket.orderCode}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('summary.total')}</dt>
                    <dd className="mt-0.5 font-medium">{formatIdr(ticket.totalIdr, lang)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('eticket.method')}</dt>
                    <dd className="mt-0.5 font-medium">
                      {ticket.paymentMethod ? (METHOD_LABELS[ticket.paymentMethod] ?? ticket.paymentMethod) : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 border-t border-dashed border-line pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                {ticket.qrPayload && (
                  <div className="rounded-2xl bg-white p-3">
                    <QRCodeSVG value={ticket.qrPayload} size={168} level="M" bgColor="#ffffff" fgColor="#07060d" />
                  </div>
                )}
                <p className="max-w-[13rem] text-center text-[11px] leading-relaxed text-muted">
                  {t('eticket.scanNote')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={`/api/orders/${ticket.orderCode}/calendar`}
              className="flex-1 rounded-full border border-line px-5 py-3 text-center text-sm font-medium transition hover:border-white/30"
            >
              📅 {t('eticket.calendar')}
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1800)
                } catch {
                  // clipboard may be unavailable in some browsers
                }
              }}
              className="flex-1 rounded-full border border-line px-5 py-3 text-center text-sm font-medium transition hover:border-white/30"
            >
              {copied ? t('eticket.copied') : `🔗 ${t('eticket.copy')}`}
            </button>
            <Link
              href="/"
              className="flex-1 rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-black transition hover:brightness-110"
            >
              {t('eticket.backHome')}
            </Link>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={sendEmail}
              disabled={emailState === 'sending'}
              className="w-full rounded-full border border-line px-5 py-3 text-sm font-medium transition hover:border-white/30 disabled:cursor-wait disabled:opacity-50"
            >
              ✉️ {emailState === 'sending' ? t('eticket.emailSending') : t('eticket.email')}
            </button>
            {emailState === 'sent' && (
              <p className="mt-2 text-center text-xs text-emerald-300">{t('eticket.emailSent')}</p>
            )}
            {emailState === 'not_configured' && (
              <p className="mt-2 text-center text-xs text-muted">{t('eticket.emailUnavailable')}</p>
            )}
            {emailState === 'failed' && (
              <p className="mt-2 text-center text-xs text-red-300">{t('eticket.emailFailed')}</p>
            )}
          </div>

          <div className="panel mt-4 flex items-start gap-3 rounded-2xl p-4">
            <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
            <div>
              <p className="text-sm font-medium">{t('eticket.reminderTitle')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('eticket.reminderBody')}</p>
            </div>
          </div>

          <div className="mt-4">
            <VenueMapCard variant="full" onEnlarge={() => setMapOpen(true)} />
          </div>
        </div>
      )}

      <VenueMapDialog open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  )
}
