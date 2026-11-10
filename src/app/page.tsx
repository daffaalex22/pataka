'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EntrySplash } from '@/components/world/EntrySplash'
import { WorldView } from '@/components/world/WorldView'
import type { Category, EventInfo } from '@/lib/types'
import { hasWebGL } from '@/lib/webgl'

type EventResponse = { event: EventInfo; categories: Category[] }

export default function Home() {
  const router = useRouter()
  const [phase, setPhase] = useState<'splash' | 'world'>('splash')
  const [data, setData] = useState<EventResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // No WebGL → direct booking, never a dead page.
    if (!hasWebGL()) {
      router.replace('/book')
      return
    }
    // Warm the scene bundle while the splash is up.
    void import('@/components/scene/PlazaScene')
  }, [router])

  useEffect(() => {
    fetch('/api/event')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload: EventResponse) => setData(payload))
      .catch(() => setFailed(true))
  }, [])

  if (phase === 'world') {
    return <WorldView onExit={() => setPhase('splash')} />
  }

  return (
    <EntrySplash
      event={data?.event ?? null}
      categories={data?.categories ?? []}
      failed={failed}
      onEnter={() => setPhase('world')}
      entering={false}
    />
  )
}
