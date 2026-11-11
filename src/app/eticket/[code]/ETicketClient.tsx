'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Dialog } from '@/components/ui/Dialog'
import { LangToggle } from '@/components/ui/LangToggle'
import { useCountdown } from '@/components/ui/useCountdown'
import {
  CalendarIcon,
  CheckIcon,
  CompassIcon,
  LinkIcon,
  MailIcon,
  QrIcon,
  XIcon,
} from '@/components/ui/icons'
import { PaymentStep } from '@/components/visitor/PaymentStep'
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
  const [qrOpen, setQrOpen] = useState(false)
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard may be unavailable in some browsers
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
  const paidSeatLabel = ticket
    ? `${t('seat.rowLabel')} ${ticket.seatRow} · ${t('seat.numberLabel')} ${ticket.seatNum}`
    : ''
  const eventName = event ? (lang === 'id' ? event.name : event.nameEn) : null
  const eventVenue = event ? (lang === 'id' ? event.venue : event.venueEn) : null
  const emailMessage =
    emailState === 'sent'
      ? t('eticket.emailSent')
      : emailState === 'not_configured'
        ? t('eticket.emailUnavailable')
        : emailState === 'failed'
          ? t('eticket.emailFailed')
          : ''

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
          <div className="flex items-center gap-4">
            <Link
              href="/tickets"
              className="focus-ring -mx-2 inline-flex min-h-11 items-center px-2 text-xs font-medium text-paper/60 transition-colors hover:text-paper"
            >
              {t('world.myTickets')}
            </Link>
            <LangToggle />
          </div>
        </header>

        <main className="flex-1">
          {notFound && (
            <div className="mx-auto max-w-xl pt-12 sm:pt-16">
              <span
                aria-hidden
                className="grid size-5 place-items-center border border-paper/25 text-paper/45"
              >
                <XIcon className="size-3" />
              </span>
              <h1 className="mt-3 text-balance font-display text-[clamp(2.5rem,7vw,3.5rem)] uppercase leading-[0.9] tracking-[0.01em]">
                {t('eticket.notFound')}
              </h1>
              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-paper/60">
                {t('eticket.notFoundBody')}
              </p>
              <Link
                href="/"
                className="focus-ring mt-7 inline-flex min-h-11 items-center text-sm text-paper/60 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper"
              >
                {t('eticket.backHome')}
              </Link>
            </div>
          )}

          {!notFound && !ticket && (
            <div role="status" aria-live="polite" className="mx-auto max-w-3xl pt-8 sm:pt-10">
              <span className="sr-only">{t('common.loading')}</span>
              <div aria-hidden className="space-y-3">
                <div className="h-3 w-36 rounded-sm bg-paper/10" />
                <div className="h-12 w-72 max-w-full rounded-sm bg-paper/10" />
                <div className="mt-7 grid border border-paper/10 p-5 sm:grid-cols-[1fr_220px] sm:gap-6">
                  <div className="space-y-3">
                    <div className="h-6 w-24 rounded-sm bg-paper/10" />
                    <div className="h-10 w-64 max-w-full rounded-sm bg-paper/10" />
                    <div className="h-3 w-40 rounded-sm bg-paper/10" />
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="h-4 w-full rounded-sm bg-paper/10" />
                      <div className="h-4 w-full rounded-sm bg-paper/10" />
                      <div className="h-4 w-3/4 rounded-sm bg-paper/10" />
                      <div className="h-4 w-2/3 rounded-sm bg-paper/10" />
                    </div>
                  </div>
                  <div className="mt-6 h-48 rounded-sm bg-paper/10 sm:mt-0" />
                </div>
              </div>
            </div>
          )}

          {ticket && ticket.status === 'cancelled' && (
            <div className="mx-auto max-w-xl pt-12 sm:pt-16">
              <span
                aria-hidden
                className="grid size-5 place-items-center border border-paper/25 text-paper/45"
              >
                <XIcon className="size-3" />
              </span>
              <h1 className="mt-3 text-balance font-display text-[clamp(2.5rem,7vw,3.5rem)] uppercase leading-[0.9] tracking-[0.01em]">
                {t('eticket.cancelledTitle')}
              </h1>
              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-paper/60">
                {t('eticket.cancelledBody')}
              </p>
              <p className="mt-4 font-mono text-xs tabular-nums text-paper/55">{ticket.orderCode}</p>
              <Link
                href="/"
                className="focus-ring mt-7 inline-flex min-h-11 items-center text-sm text-paper/60 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper"
              >
                {t('eticket.backHome')}
              </Link>
            </div>
          )}

          {ticket && ticket.status === 'pending' && !pendingExpired && (
            <div className="pt-6 sm:pt-8">
              <PaymentStep
                totalIdr={ticket.totalIdr}
                holdExpiresAt={ticket.holdExpiresAt}
                contextLabel={pendingContext}
                paying={paying}
                error={payError}
                onBack={() => router.push('/tickets')}
                onPay={payPending}
              />
              <p className="mt-4 text-center font-mono text-xs tabular-nums text-paper/55">
                {ticket.orderCode}
              </p>
            </div>
          )}

          {ticket && ticket.status === 'pending' && pendingExpired && (
            <div className="mx-auto max-w-xl pt-10 sm:pt-14">
              <h1 className="text-balance font-display text-[clamp(2.5rem,7vw,3.5rem)] uppercase leading-[0.9] tracking-[0.01em]">
                {t('eticket.expiredTitle')}
              </h1>
              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-paper/60">
                {t('eticket.expiredBody')}
              </p>
              <p className="mt-4 text-xs text-paper/55">
                {pendingSeatLabel} · <span className="font-mono tabular-nums">{ticket.orderCode}</span>
              </p>
              <Link
                href={rebookHref}
                className="focus-ring mt-6 inline-flex min-h-12 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                {t('eticket.chooseSeat')}
              </Link>
            </div>
          )}

          {ticket && ticket.status === 'paid' && (
            <div className="mx-auto max-w-3xl">
              <div className="pt-8 sm:pt-10">
                <p className="flex items-center gap-2 text-sm text-paper/70">
                  <span
                    aria-hidden
                    className="grid size-5 place-items-center border border-accent/45 text-accent"
                  >
                    <CheckIcon className="size-3" />
                  </span>
                  {t('eticket.success')}
                </p>
                <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,8vw,4.5rem)] uppercase leading-[0.88] tracking-[0.01em]">
                  {t('eticket.title')}
                </h1>
                {event && (
                  <div className="mt-3 max-w-xl text-sm leading-relaxed text-paper/60">
                    <p className="text-base font-medium text-paper">{eventName}</p>
                    <p className="mt-1">{formatEventDate(event.startsAt, lang)} WIB</p>
                    <p>{eventVenue}</p>
                  </div>
                )}
              </div>

              <article className="relative mt-7 bg-paper text-ink shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
                <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(220px,250px)]">
                  <div className="p-5 sm:p-6 lg:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl uppercase leading-none tracking-[0.04em]">
                          PATAKA
                        </p>
                        <p className="mt-1 text-xs text-ink/65">{t('eticket.ticketLabel')}</p>
                      </div>
                      <div className="text-right">
                        <p className="inline-flex border border-ink/25 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em]">
                          {t('admin.statusPaid')}
                        </p>
                        <p className="mt-1.5 font-mono text-xs tabular-nums text-ink/65">
                          {ticket.orderCode}
                        </p>
                      </div>
                    </div>

                    {event && (
                      <div className="mt-5 border-t border-ink/15 pt-4">
                        <p className="text-sm font-semibold leading-snug">{eventName}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink/65">
                          {formatEventDate(event.startsAt, lang)} WIB
                        </p>
                        <p className="text-xs leading-relaxed text-ink/65">{eventVenue}</p>
                      </div>
                    )}

                    <div className="mt-4 border-t border-ink/15 pt-4">
                      <p className="text-xs text-ink/65">{t('eticket.seat')}</p>
                      <p className="mt-1 font-display text-[clamp(2rem,5.4vw,3.25rem)] uppercase leading-[0.9] tracking-[0.01em]">
                        {paidSeatLabel}
                      </p>
                      <p className="mt-1.5 text-sm text-ink/70">
                        {lang === 'id' ? ticket.categoryName : ticket.categoryNameEn}
                      </p>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-ink/15 pt-4">
                      <div className="col-span-2">
                        <dt className="text-xs text-ink/65">{t('eticket.name')}</dt>
                        <dd className="mt-1 break-words text-sm font-medium leading-snug">{ticket.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink/65">{t('summary.total')}</dt>
                        <dd className="mt-1 text-sm font-semibold tabular-nums">
                          {formatIdr(ticket.totalIdr, lang)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink/65">{t('eticket.method')}</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {ticket.paymentMethod
                            ? (METHOD_LABELS[ticket.paymentMethod] ?? ticket.paymentMethod)
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="relative flex flex-col items-center justify-center gap-4 border-t border-dashed border-ink/30 p-5 sm:border-l sm:border-t-0 sm:p-6">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-2.5 -top-2.5 size-5 rounded-full bg-ink sm:hidden"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2.5 -top-2.5 size-5 rounded-full bg-ink sm:hidden"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-2.5 -top-2.5 hidden size-5 rounded-full bg-ink sm:block"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -bottom-2.5 -left-2.5 hidden size-5 rounded-full bg-ink sm:block"
                    />

                    <div className="w-full max-w-[220px]">
                      {ticket.qrPayload && (
                        <div className="bg-white p-3" role="img" aria-label={t('eticket.scanNote')}>
                          <QRCodeSVG
                            value={ticket.qrPayload}
                            size={172}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#07060d"
                            className="h-auto w-full"
                            title={t('eticket.scanNote')}
                          />
                        </div>
                      )}
                      <p className="mt-3 text-pretty text-center text-xs leading-relaxed text-ink/65">
                        {t('eticket.scanNote')}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-sm bg-accent px-6 text-sm font-semibold text-ink transition hover:brightness-110 sm:min-w-52"
                >
                  <QrIcon className="size-5" />
                  {t('eticket.showQr')}
                </button>
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                  <a
                    href={`/api/orders/${ticket.orderCode}/calendar`}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-paper/15 px-3 py-2.5 text-sm font-medium text-paper/85 transition-colors hover:border-paper/30 hover:text-paper"
                  >
                    <CalendarIcon className="size-4 shrink-0" />
                    {t('eticket.calendar')}
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-paper/15 px-3 py-2.5 text-sm font-medium text-paper/85 transition-colors hover:border-paper/30 hover:text-paper"
                  >
                    <LinkIcon className="size-4 shrink-0" />
                    {copied ? t('eticket.copied') : t('eticket.copy')}
                  </button>
                  <button
                    type="button"
                    onClick={sendEmail}
                    disabled={emailState === 'sending'}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-paper/15 px-3 py-2.5 text-sm font-medium text-paper/85 transition-colors hover:border-paper/30 hover:text-paper disabled:cursor-wait disabled:opacity-50"
                  >
                    <MailIcon className="size-4 shrink-0" />
                    {emailState === 'sending' ? t('eticket.emailSending') : t('eticket.email')}
                  </button>
                </div>
              </div>

              <p className="sr-only" role="status" aria-live="polite">
                {copied ? t('eticket.copied') : ''}
              </p>
              <p
                role="status"
                aria-live="polite"
                className={`mt-2 min-h-5 text-xs leading-relaxed ${
                  emailState === 'failed' ? 'text-red-300' : 'text-paper/60'
                }`}
              >
                {emailMessage}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-medium text-paper/70 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper"
                >
                  <CompassIcon className="size-4" />
                  {t('summary.gettingThere')}
                </button>
                <span className="text-xs text-paper/55">{t('venue.subtitle')}</span>
              </div>

              <div className="mt-3 flex items-start gap-2 border-t border-paper/10 pt-4 text-xs leading-relaxed text-paper/55">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent/80" />
                <div>
                  <p className="text-paper/75">{t('eticket.reminderTitle')}</p>
                  <p className="mt-0.5 text-pretty">{t('eticket.reminderBody')}</p>
                </div>
              </div>

              <Link
                href="/"
                className="focus-ring mt-4 inline-flex min-h-11 items-center text-sm text-paper/60 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper"
              >
                {t('eticket.backHome')}
              </Link>
            </div>
          )}
        </main>
      </div>

      <VenueMapDialog open={mapOpen} onClose={() => setMapOpen(false)} />

      {ticket?.status === 'paid' && ticket.qrPayload && (
        <Dialog
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          ariaLabel={t('eticket.qrTitle')}
          plain
          panelClassName="h-[calc(100svh-1.5rem)] max-h-none max-w-lg rounded-none! bg-paper! p-0 text-ink! sm:h-auto sm:max-h-[92svh] sm:rounded-sm!"
        >
          {qrOpen && (
            <div className="flex h-full flex-col text-ink">
              <div className="flex items-center justify-between gap-4 border-b border-ink/15 px-5 py-4">
                <h2 className="font-display text-2xl uppercase leading-none tracking-[0.02em] text-ink">
                  {t('eticket.qrTitle')}
                </h2>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  aria-label={t('eticket.qrClose')}
                  title={t('eticket.qrClose')}
                  className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-ink/20 text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-6 text-center">
                <div className="w-full max-w-[320px] bg-white p-4">
                  <QRCodeSVG
                    value={ticket.qrPayload}
                    size={256}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#07060d"
                    className="h-auto w-full"
                    title={t('eticket.scanNote')}
                  />
                </div>
                <div>
                  <p className="font-display text-[clamp(2rem,7vw,3rem)] uppercase leading-[0.9] tracking-[0.01em] text-ink">
                    {paidSeatLabel}
                  </p>
                  <p className="mt-2 font-mono text-sm tabular-nums text-ink/65">{ticket.orderCode}</p>
                </div>
                <p className="max-w-xs text-pretty text-sm leading-relaxed text-ink/65">
                  {t('eticket.scanNote')}
                </p>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </div>
  )
}
