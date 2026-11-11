'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '@/components/ui/icons'
import { useT } from '@/lib/i18n'
import { SCENE_QUALITY_OPTIONS, type SceneQuality } from '@/lib/sceneQuality'

export function QualityMenu({
  quality,
  onChange,
  align = 'right',
  className = '',
}: {
  quality: SceneQuality
  onChange: (quality: SceneQuality) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('quality.select')}
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-sm border border-paper/15 bg-ink/80 px-3 text-xs text-paper/70 transition-colors hover:border-paper/30 hover:text-paper"
      >
        <span className="hidden text-paper/45 sm:inline">{t('quality.label')}</span>
        <span className="font-medium text-paper">{t(`quality.${quality}`)}</span>
        <span aria-hidden className="text-paper/35">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('quality.select')}
          className={`absolute top-full z-30 mt-1 w-52 rounded-sm border border-paper/15 bg-ink p-1 text-paper shadow-2xl ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {SCENE_QUALITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === quality}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={`focus-ring flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-paper/10 ${
                option === quality ? 'bg-paper/10' : ''
              }`}
            >
              <span>
                <span className="block text-xs font-medium">{t(`quality.${option}`)}</span>
                <span className="block text-[10px] text-paper/45">{t(`quality.${option}Hint`)}</span>
              </span>
              {option === quality && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
