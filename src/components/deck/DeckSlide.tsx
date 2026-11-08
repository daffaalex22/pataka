import type { DeckSlide as DeckSlideMeta } from '@/lib/deck'

export function DeckSlide({
  slide,
  children,
  variant = 'default',
  background,
}: {
  slide: DeckSlideMeta
  children: React.ReactNode
  variant?: 'default' | 'cover' | 'closing'
  background?: React.ReactNode
}) {
  const titleClass =
    variant === 'cover'
      ? 'text-5xl sm:text-7xl'
      : variant === 'closing'
        ? 'text-4xl sm:text-6xl'
        : 'text-3xl sm:text-5xl'

  return (
    <section
      id={slide.id}
      data-deck-slide={slide.id}
      className="deck-slide relative flex min-h-[100dvh] snap-start flex-col justify-center overflow-hidden px-5 py-14 sm:px-8"
    >
      {background && <div className="pointer-events-none absolute inset-0">{background}</div>}
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <p className="font-mono text-xs tracking-[0.3em] text-accent">
          {slide.number} — {slide.kicker}
        </p>
        <h2 className={`mt-2 font-semibold tracking-tight ${titleClass}`}>{slide.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{slide.subtitle}</p>
        <div className="relative z-10 mt-8">{children}</div>
      </div>
    </section>
  )
}
