'use client'

import { useEffect, useState } from 'react'

export function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) return { remaining: 0, formatted: '—', expired: false }
  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return {
    remaining,
    formatted: `${minutes}:${String(seconds).padStart(2, '0')}`,
    expired: remaining <= 0,
  }
}
