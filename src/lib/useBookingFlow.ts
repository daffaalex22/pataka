'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { useBooking } from '@/lib/store'
import { saveTicket } from '@/lib/ticketStore'
import type { Category, EventInfo, Seat } from '@/lib/types'

type EventResponse = { event: EventInfo; categories: Category[] }

/**
 * Shared booking flow wiring used by both `/book` (direct booking) and the world
 * entry page. Reads and writes the `useBooking` store; callers own the seats
 * polling interval and the live-seat-sync effect.
 */
export function useBookingFlow(options: { eventPollMs?: number } = {}) {
  const router = useRouter()
  const t = useT()
  const { seat, holdToken, orderCode, setStep, setSeat, setHold, setOrder, reset } = useBooking((state) => state)

  const [data, setData] = useState<EventResponse | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/event')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setData)
      .catch(() => setError(t('error.generic')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshEvent = useCallback(async () => {
    try {
      const res = await fetch('/api/event')
      if (res.ok) setData((await res.json()) as EventResponse)
    } catch {
      // transient network errors are fine; next poll retries
    }
  }, [])

  useEffect(() => {
    if (!options.eventPollMs) return
    const timer = window.setInterval(refreshEvent, options.eventPollMs)
    return () => window.clearInterval(timer)
  }, [refreshEvent, options.eventPollMs])

  const loadSeats = useCallback(async () => {
    try {
      const res = await fetch('/api/seats')
      if (res.ok) setSeats((await res.json()) as Seat[])
    } catch {
      // transient network errors are fine; next poll retries
    }
  }, [])

  const handleHold = async () => {
    if (!seat) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/seats/${encodeURIComponent(seat.id)}/hold`, { method: 'POST' })
      if (res.ok) {
        const held = (await res.json()) as { holdToken: string; expiresAt: string }
        setHold(held.holdToken, held.expiresAt, seat.id)
        setStep('form')
      } else if (res.status === 409) {
        setError(t('error.seatTaken'))
        setSeat(null)
        loadSeats()
      } else {
        setError(t('error.generic'))
      }
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const handleOrder = async (details: { name: string; email: string; phone: string }) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdToken, ...details }),
      })
      if (res.status === 201) {
        const order = (await res.json()) as { orderCode: string; totalIdr: number }
        saveTicket(order.orderCode)
        setOrder(order.orderCode, order.totalIdr)
        setStep('summary')
      } else if (res.status === 409) {
        setError(t('error.holdExpired'))
        setHold(null, null, null)
        setStep('seat')
        loadSeats()
      } else if (res.status === 400) {
        setError(t('error.validation'))
      } else {
        setError(t('error.generic'))
      }
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const handlePay = async (method: 'ewallet' | 'va' | 'qrpay') => {
    if (!orderCode) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      if (res.ok) {
        saveTicket(orderCode)
        reset()
        router.push(`/eticket/${orderCode}`)
      } else if (res.status === 409) {
        setError(t('error.holdExpired'))
        setHold(null, null, null)
        setStep('seat')
        loadSeats()
      } else {
        setError(t('error.generic'))
      }
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return { data, seats, busy, error, loadSeats, setError, handleHold, handleOrder, handlePay }
}
