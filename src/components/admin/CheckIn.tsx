'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { adminFetch } from '@/lib/adminApi'
import { useT } from '@/lib/i18n'

type Outcome = {
  result: 'valid' | 'already_used' | 'invalid'
  orderCode?: string
  seatLabel?: string
  name?: string
}

type RecentScan = Outcome & { payload: string; at: Date }

const RESULT_STYLES: Record<Outcome['result'], { wrap: string; text: string; icon: string }> = {
  valid: { wrap: 'border-emerald-400/40 bg-emerald-400/10', text: 'text-emerald-300', icon: '✓' },
  already_used: { wrap: 'border-amber-400/40 bg-amber-400/10', text: 'text-amber-300', icon: '◔' },
  invalid: { wrap: 'border-red-400/40 bg-red-400/10', text: 'text-red-300', icon: '✕' },
}

export function CheckIn({ adminKey }: { adminKey: string }) {
  const t = useT()
  const [cameraActive, setCameraActive] = useState(false)
  const [outcome, setOutcome] = useState<(Outcome & { payload: string }) | null>(null)
  const [manual, setManual] = useState('')
  const [recent, setRecent] = useState<RecentScan[]>([])
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lockRef = useRef(false)

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

  const validate = useCallback(
    async (payload: string) => {
      if (!payload || lockRef.current) return
      lockRef.current = true
      setError(null)
      try {
        const data = await adminFetch<Outcome>(adminKey, '/api/checkin', {
          method: 'POST',
          body: JSON.stringify({ payload }),
        })
        setOutcome({ ...data, payload })
        setRecent((current) => [{ ...data, payload, at: new Date() }, ...current].slice(0, 10))
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(data.result === 'valid' ? 80 : [60, 60, 60])
        }
        // Freeze the scanner on the result so the same QR is not re-scanned as ALREADY USED.
        await stopCamera()
      } catch {
        setError(t('error.generic'))
      } finally {
        window.setTimeout(() => {
          lockRef.current = false
        }, 800)
      }
    },
    [adminKey, t, stopCamera],
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
      setCameraActive(false)
      setError(t('admin.checkin.cameraError'))
    }
  }, [t, validate])

  useEffect(() => {
    return () => {
      void stopCamera()
    }
  }, [stopCamera])

  const resultLabels: Record<Outcome['result'], string> = {
    valid: t('admin.checkin.valid'),
    already_used: t('admin.checkin.already'),
    invalid: t('admin.checkin.invalid'),
  }

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-lg font-semibold tracking-tight">{t('admin.checkin.title')}</h2>
      <p className="mt-1 text-sm text-muted">{t('admin.checkin.sub')}</p>

      {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}

      {outcome && (
        <div className={`mt-4 rounded-2xl border p-5 text-center ${RESULT_STYLES[outcome.result].wrap}`}>
          <p className={`text-2xl font-bold tracking-tight ${RESULT_STYLES[outcome.result].text}`}>
            <span aria-hidden className="mr-2">{RESULT_STYLES[outcome.result].icon}</span>
            {resultLabels[outcome.result]}
          </p>
          {outcome.name && <p className="mt-2 text-sm font-medium">{outcome.name}</p>}
          {outcome.seatLabel && (
            <p className="mt-1 text-sm text-muted">
              {t('admin.checkin.seat')}: <span className="font-mono">{outcome.seatLabel}</span>
              {outcome.orderCode ? ` · ${outcome.orderCode}` : ''}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setOutcome(null)
              if (!cameraActive) void startCamera()
            }}
            className="mt-4 rounded-full border border-line px-5 py-2 text-xs font-medium transition hover:border-white/30"
          >
            {t('admin.checkin.next')}
          </button>
        </div>
      )}

      <div className="panel mt-4 overflow-hidden rounded-2xl">
        <div id="checkin-reader" className="mx-auto w-full max-w-sm [&_video]:w-full" />
        {!cameraActive ? (
          <button
            type="button"
            onClick={startCamera}
            className="m-4 w-[calc(100%-2rem)] rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
          >
            ◉ {t('admin.checkin.start')}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="m-4 w-[calc(100%-2rem)] rounded-full border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-white/30 hover:text-foreground"
          >
            {t('admin.checkin.stop')}
          </button>
        )}
      </div>

      <form
        className="panel mt-4 rounded-2xl p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void validate(manual.trim())
        }}
      >
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{t('admin.checkin.manual')}</span>
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="PTK|PTK-XXXXXX|…"
            className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-4 py-3 font-mono text-base outline-none transition focus:border-accent/60"
          />
        </label>
        <button
          type="submit"
          disabled={!manual.trim()}
          className="mt-3 w-full rounded-full border border-accent/50 px-5 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-40"
        >
          {t('admin.checkin.check')}
        </button>
      </form>

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.checkin.recent')}</h3>
          <div className="mt-2 space-y-1.5">
            {recent.map((item, index) => (
              <div key={`${item.at.getTime()}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={RESULT_STYLES[item.result].text}>{RESULT_STYLES[item.result].icon}</span>
                  <span className="font-mono">{item.orderCode ?? item.payload.slice(0, 18)}</span>
                  {item.seatLabel && <span className="text-muted">{item.seatLabel}</span>}
                </span>
                <span className="text-muted">{item.at.toLocaleTimeString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
