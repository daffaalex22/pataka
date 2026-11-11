'use client'

import { useT } from '@/lib/i18n'
import type { BookingStep } from '@/lib/store'

export function BookingStepper({
  steps,
  activeIndex,
}: {
  steps: { key: BookingStep; label: string }[]
  activeIndex: number
}) {
  const t = useT()

  if (steps.length === 0) return null
  const index = Math.min(Math.max(activeIndex, 0), steps.length - 1)
  const current = steps[index]
  const progress = ((index + 1) / steps.length) * 100

  return (
    <>
      <ol aria-label={t('flow.stepsLabel')} className="hidden items-center gap-2 sm:flex">
        {steps.map((step, stepIndex) => {
          const done = stepIndex < index
          const active = stepIndex === index
          return (
            <li
              key={step.key}
              aria-current={active ? 'step' : undefined}
              className="flex flex-1 items-center gap-2"
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium ${
                  active
                    ? 'border-accent bg-accent text-ink'
                    : done
                      ? 'border-accent/40 text-accent'
                      : 'border-paper/15 text-paper/50'
                }`}
              >
                {stepIndex + 1}
              </span>
              <span
                className={`whitespace-nowrap text-xs ${
                  active ? 'text-paper' : done ? 'text-paper/70' : 'text-paper/50'
                }`}
              >
                {step.label}
              </span>
              {stepIndex < steps.length - 1 && <span aria-hidden className="h-px flex-1 bg-paper/15" />}
            </li>
          )
        })}
      </ol>

      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-paper/55">
            {t('flow.step')} {index + 1} {t('flow.of')} {steps.length}
          </span>
          <span className="font-medium text-paper">{current.label}</span>
        </div>
        <div aria-hidden className="mt-2 h-px w-full bg-paper/15">
          <div
            className="h-px bg-accent transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </>
  )
}
