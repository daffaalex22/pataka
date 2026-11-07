'use client'

import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Category } from '@/lib/types'

export function CategoryCards({
  categories,
  onChoose,
  compact = false,
}: {
  categories: Category[]
  onChoose: (category: Category) => void
  compact?: boolean
}) {
  const { lang } = useLang()
  const t = useT()

  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {categories.map((category) => {
        const name = lang === 'id' ? category.name : category.nameEn
        const soldOut = category.remaining === 0
        const disabled = !category.salesOpen || soldOut
        const pct = Math.round((category.remaining / Math.max(category.quota, 1)) * 100)

        return (
          <button
            key={category.key}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(category)}
            className="panel group relative overflow-hidden rounded-2xl p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 opacity-80"
              style={{ backgroundColor: category.colorHex }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{name}</span>
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: category.colorHex, boxShadow: `0 0 12px ${category.colorHex}` }}
              />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">{formatIdr(category.priceIdr, lang)}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: category.colorHex }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {!category.salesOpen
                ? t('cat.salesClosed')
                : soldOut
                  ? t('cat.soldOut')
                  : `${category.remaining} ${t('cat.available')} ${t('cat.of')} ${category.quota}`}
            </p>
            {category.held > 0 && (
              <p className="mt-0.5 text-[11px] text-amber-300/80">{category.held} {t('status.held').toLowerCase()}</p>
            )}
            <p className="mt-4 text-xs font-medium text-accent opacity-80 transition group-enabled:group-hover:opacity-100">
              {t('cat.choose')} →
            </p>
          </button>
        )
      })}
    </div>
  )
}
