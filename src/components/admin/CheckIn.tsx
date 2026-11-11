'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { CheckIcon, ClockIcon, QrIcon, XIcon } from '@/components/ui/icons'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import { formatSeatLabel } from './format'

type Outcome = {
  result: 'valid' | 'already_used' | 'invalid'
  orderCode?: string
  seatLabel?: string
  name?: string
}

type RecentScan = Outcome & { payload: string; at: Date }

const DUPLICATE_WINDOW_MS = 9000
const BANNER_MS = 4000
const REQUEST_LOCK_MS = 800

const RESULT_TONES: Record<
  Outcome['result'],
  { frame: string; iconBox: string; text: string; icon: typeof CheckIcon }
> = {
  valid: {
    frame: 'border-emerald-400/45 bg-emerald-400/[0.06]',
    iconBox: 'border-emerald-400/50',
    text: 'text-emerald-300',
    icon: CheckIcon,
  },
  already_used: {
    frame: 'border-amber-400/45 bg-amber-400/[0.06]',
    iconBox: 'border-amber-400/50',
    text: 'text-amber-300',
    icon: ClockIcon,
  },
  invalid: {
    frame: 'border-red-400/45 bg-red-400/[0.06]',
    iconBox: 'border-red-400/50',
    text: 'text-red-300',
    icon: XIcon,
  },
}

export function CheckIn({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [cameraActive, setCameraActive] = useState(false)
  const [outcome, setOutcome] = useState<(Outcome & { payload: string }) | null>(null)
  const [manual, setManual] = useState('')
  const [recent, setRecent] = useState<RecentScan[]>([])
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lockRef = useRef(false)
  const unlockTimerRef = useRef<number | null>(null)
  const bannerTimerRef = useRef<number | null>(null)
  const lastScanRef = useRef<{ payload: string; at: number } | null>(null)

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    setCameraActive(false)
    if (scanner) {
      try {
        await scanner.stop()
        scanner.clear()
      } catch {
        // already stopped
      }
    }
  }, [])

  const showOutcome = useCallback((next: Outcome & { payload: string }) => {
    setOutcome(next)
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = window.setTimeout(() => {
      bannerTimerRef.current = null
      setOutcome(null)
    }, BANNER_MS)
  }, [])

  const validate = useCallback(
    async (raw: string) => {
      const payload = raw.trim()
      if (!payload || lockRef.current) return

      const now = Date.now()
      const last = lastScanRef.current
      if (last && last.payload === payload && now - last.at < DUPLICATE_WINDOW_MS) return

      lastScanRef.current = { payload, at: now }
      lockRef.current = true
      setError(null)
      try {
        const data = await adminFetch<Outcome>(adminKey, '/api/checkin', {
          method: 'POST',
          body: JSON.stringify({ payload }),
        })
        showOutcome({ ...data, payload })
        setRecent((current) => [{ ...data, payload, at: new Date() }, ...current].slice(0, 10))
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(data.result === 'valid' ? 80 : [60, 60, 60])
        }
      } catch {
        lastScanRef.current = null
        setError(t('error.generic'))
      } finally {
        if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current)
        unlockTimerRef.current = window.setTimeout(() => {
          lockRef.current = false
          unlockTimerRef.current = null
        }, REQUEST_LOCK_MS)
      }
    },
    [adminKey, showOutcome, t],
  )

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('checkin-reader')
      scannerRef.current = scanner
      setCameraActive(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          void validate(decodedText)
        },
        () => {},
      )
    } catch {
      scannerRef.current = null
      setCameraActive(false)
      setError(t('admin.checkin.cameraError'))
    }
  }, [t, validate])

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current)
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current)
      void stopCamera()
    }
  }, [stopCamera])

  const resultLabels: Record<Outcome['result'], string> = {
    valid: t('admin.checkin.valid'),
    already_used: t('admin.checkin.already'),
    invalid: t('admin.checkin.invalid'),
  }

  const ResultIcon = outcome ? RESULT_TONES[outcome.result].icon : null
  const tone = outcome ? RESULT_TONES[outcome.result] : null

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm leading-relaxed text-paper/60">{t('admin.checkin.sub')}</p>

      <div role="status" aria-live="assertive" className="mt-4">
        {outcome && tone && ResultIcon && (
          <div className={`flex gap-3 border p-4 ${tone.frame}`}>
            <span
              aria-hidden
              className={`grid size-10 shrink-0 place-items-center border ${tone.iconBox} ${tone.text}`}
            >
              <ResultIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${tone.text}`}>{resultLabels[outcome.result]}</p>
              {outcome.name && <p className="mt-1 break-words text-base font-medium">{outcome.name}</p>}
              {(outcome.seatLabel || outcome.orderCode) && (
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-paper/60">
                  {outcome.seatLabel && <span>{formatSeatLabel(outcome.seatLabel, t)}</span>}
                  {outcome.orderCode && (
                    <span className="font-mono text-xs tabular-nums text-paper/55">{outcome.orderCode}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 border border-red-400/35 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200"
        >
          <XIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4 border border-paper/15">
        <div className="flex items-center justify-between gap-3 border-b border-paper/10 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-xs text-paper/55">
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-paper/30'}`}
            />
            {cameraActive ? t('admin.checkin.active') : t('admin.checkin.off')}
          </span>
          <QrIcon className="size-4 text-paper/30" />
        </div>

        <div id="checkin-reader" className="mx-auto w-full max-w-sm [&_video]:w-full" />

        <div className="p-3">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              <QrIcon className="size-4" />
              {t('admin.checkin.start')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopCamera()}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-paper/15 px-4 text-sm font-medium text-paper/75 transition-colors hover:border-paper/30 hover:text-paper"
            >
              <XIcon className="size-4" />
              {t('admin.checkin.stop')}
            </button>
          )}
        </div>
      </div>

      <form
        className="mt-4 border border-paper/15 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          const payload = manual.trim()
          if (!payload) return
          void validate(payload).then(() => setManual(''))
        }}
      >
        <label className="block">
          <span className="text-xs font-medium text-paper/65">{t('admin.checkin.manual')}</span>
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="PTK|PTK-XXXXXX|…"
            autoComplete="off"
            spellCheck={false}
            className="focus-ring mt-2 min-h-11 w-full rounded-sm border border-paper/15 bg-paper/[0.04] px-3 font-mono text-sm text-paper outline-none transition-colors placeholder:text-paper/55 focus:border-accent/70"
          />
        </label>
        <button
          type="submit"
          disabled={!manual.trim()}
          className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-accent/50 px-4 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('admin.checkin.check')}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="mt-6" aria-labelledby="recent-scans-heading">
          <h2 id="recent-scans-heading" className="text-xs font-medium text-paper/55">
            {t('admin.checkin.recent')}
          </h2>
          <ul className="mt-2 border-t border-paper/10">
            {recent.map((item, index) => {
              const itemTone = RESULT_TONES[item.result]
              const ItemIcon = itemTone.icon
              const meta = [item.name, item.seatLabel ? formatSeatLabel(item.seatLabel, t) : null]
                .filter(Boolean)
                .join(' · ')
              return (
                <li
                  key={`${item.at.getTime()}-${index}`}
                  className="flex items-center gap-3 border-b border-paper/10 py-2.5 text-xs"
                >
                  <span aria-hidden className={`shrink-0 ${itemTone.text}`}>
                    <ItemIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono tabular-nums text-paper/75">
                      {item.orderCode ?? item.payload.slice(0, 18)}
                    </span>
                    {meta && <span className="mt-0.5 block truncate text-paper/55">{meta}</span>}
                  </span>
                  <time
                    className="shrink-0 tabular-nums text-paper/55"
                    dateTime={item.at.toISOString()}
                  >
                    {item.at.toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </time>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
