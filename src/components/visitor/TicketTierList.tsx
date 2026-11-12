'use client'

import { ChevronRightIcon } from '@/components/ui/icons'
import { SectionMiniMap } from '@/components/visitor/SectionMiniMap'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Category } from '@/lib/types'

export function TicketTierList({
  categories,
  onChoose,
}: {
  categories: Category[]
  onChoose: (category: Category) => void
}) {
  const { lang } = useLang()
  const t = useT()

  return (
    <ul className="mt-6 border-t border-paper/10">
      {categories.map((category) => {
        const name = lang === 'id' ? category.name : category.nameEn
        const soldOut = category.remaining === 0
        const disabled = !category.salesOpen || soldOut
        const price = formatIdr(category.priceIdr, lang)
        const viewNote =
          category.key === 'VIP'
            ? t('cat.viewVip')
            : category.key === 'CAT1'
              ? t('cat.viewCat1')
              : category.key === 'TRIB'
                ? t('cat.viewTrib')
                : category.key === 'REG'
                  ? t('cat.viewReg')
                  : null
        const remainingLabel = soldOut
          ? t('cat.soldOut')
          : !category.salesOpen
            ? t('cat.salesClosed')
            : `${category.remaining} ${t('cat.available')} ${t('cat.of')} ${category.quota}`
        const ariaLabel = [t('cat.choose'), name, viewNote, remainingLabel, price].filter(Boolean).join(', ')

        return (
          <li key={category.key} className="border-b border-paper/10 last:border-b-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(category)}
              aria-label={ariaLabel}
              className="focus-ring group grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 py-4 text-left transition-colors enabled:hover:bg-paper/[0.035] disabled:cursor-not-allowed disabled:opacity-45 sm:grid-cols-[72px_1fr_auto] sm:gap-5 sm:py-5"
            >
              <SectionMiniMap
                categoryKey={category.key}
                colorHex={category.colorHex}
                className="size-14 sm:size-[72px]"
              />

              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.colorHex }}
                  />
                  <span className="text-base font-semibold text-paper">{name}</span>
                </span>
                {viewNote && <span className="mt-0.5 block text-xs text-paper/60">{viewNote}</span>}
                <span className="mt-1 block text-xs text-paper/55">{remainingLabel}</span>
                {category.held > 0 && (
                  <span className="mt-0.5 block text-xs text-amber-300/85">
                    {category.held} {t('cat.onHold')}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-2 sm:gap-3">
                <span className="whitespace-nowrap text-right text-base font-semibold tabular-nums text-paper">
                  {price}
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-paper/35 transition-colors group-hover:text-paper/60" />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
