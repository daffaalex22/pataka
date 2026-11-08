'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { nextSlideIndex, parseDeckHash } from '@/lib/deck'

const pad = (value: number) => String(value).padStart(2, '0')

export function DeckChrome({ count }: { count: number }) {
  const [active, setActive] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const slidesRef = useRef<HTMLElement[]>([])

  const goTo = useCallback((index: number) => {
    const slides = slidesRef.current
    if (!slides.length) return
    const target = nextSlideIndex(index, 0, slides.length)
    slides[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(target)
  }, [])

  useEffect(() => {
    const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-deck-slide]'))
    const scroller = document.querySelector<HTMLElement>('.deck-scroll')
    slidesRef.current = slides

    if (!slides.length) return

    const initial = parseDeckHash(window.location.hash, slides.length)
    if (initial !== null) slides[initial]?.scrollIntoView({ block: 'start' })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = slides.indexOf(entry.target as HTMLElement)
          if (index >= 0) setActive(index)
        }
      },
      { root: scroller, threshold: 0.55 },
    )
    for (const slide of slides) observer.observe(slide)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (count > 0) history.replaceState(null, '', `#/${active + 1}`)
  }, [active, count])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'Home') {
        event.preventDefault()
        goTo(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        goTo(slidesRef.current.length - 1)
        return
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        toggleFullscreen()
        return
      }

      let delta = 0
      if (['ArrowRight', 'ArrowDown', 'Space', 'PageDown'].includes(event.key)) delta = 1
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) delta = -1
      else return

      event.preventDefault()
      goTo(nextSlideIndex(active, delta, slidesRef.current.length))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, goTo, toggleFullscreen])

  if (count === 0) return null

  const progress = ((active + 1) / count) * 100

  return (
    <div className="deck-chrome print:hidden">
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[#07060d]/90 backdrop-blur">
        <div className="h-0.5 w-full bg-white/5">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-muted sm:px-6">
          <span className="font-mono tracking-[0.16em]">
            {pad(active + 1)} / {pad(count)}
          </span>
          <div className="flex items-center gap-3">
            <a href="/deck/notes" target="_blank" rel="noreferrer" className="transition hover:text-foreground">
              Notes
            </a>
            <button type="button" onClick={toggleFullscreen} className="transition hover:text-foreground">
              {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
