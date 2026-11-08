'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { MoveVector } from '@/components/scene/Character'
import { Joystick } from '@/components/scene/Joystick'
import { WorldHud } from '@/components/world/WorldHud'
import { useT } from '@/lib/i18n'
import { useBookingFlow } from '@/lib/useBookingFlow'

function WorldLoading() {
  const t = useT()
  return <div className="grid h-full place-items-center text-xs text-muted">{t('splash.loading')}</div>
}

const PlazaScene = dynamic(() => import('@/components/scene/PlazaScene'), {
  ssr: false,
  loading: () => <WorldLoading />,
})

export function WorldView() {
  const t = useT()
  const { seats, loadSeats } = useBookingFlow()

  const [mode, setMode] = useState<'walk' | 'orbit'>('walk')
  const [mapOpen, setMapOpen] = useState(false)
  const [maxDpr] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1.25 : 1.5,
  )
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })

  useEffect(() => {
    loadSeats()
    const timer = window.setInterval(loadSeats, 5000)
    return () => window.clearInterval(timer)
  }, [loadSeats])

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#07060d]">
      <div className="absolute inset-0">
        <PlazaScene
          seats={seats}
          selectedId={null}
          onSelect={() => {}}
          mode={mode}
          moveRef={moveRef}
          maxDpr={maxDpr}
        />
      </div>

      <WorldHud
        mode={mode}
        onMode={setMode}
        mapEnabled={false}
        mapOpen={mapOpen}
        onToggleMap={() => setMapOpen((open) => !open)}
      />

      {mode === 'walk' && <Joystick moveRef={moveRef} />}

      <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[10px] text-white/45">
        {mode === 'walk' ? t('seat.walkHint') : t('seat.dragHint')}
      </p>
    </div>
  )
}
