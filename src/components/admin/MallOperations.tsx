'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRightIcon } from '@/components/ui/icons'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { PortfolioResponse, PortfolioStage } from '@/lib/types'
import { formatIdr } from '@/lib/types'

const STAGE_TONES: Record<PortfolioStage, { dot: string; text: string }> = {
  draft: { dot: 'bg-paper/35', text: 'text-paper/60' },
  on_sale: { dot: 'bg-accent', text: 'text-paper/80' },
  check_in: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  completed: { dot: 'bg-paper/50', text: 'text-paper/65' },
  settled: { dot: 'bg-amber-300', text: 'text-amber-300' },
}

function formatShortDate(iso: string, lang: 'id' | 'en') {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}

export function MallOperations({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = () =>
      adminFetch<PortfolioResponse>(adminKey, '/api/admin/portfolio')
        .then((data) => {
          if (!active) return
          setPortfolio(data)
          setError(false)
        })
        .catch(() => active && setError(true))
    load()
    const timer = window.setInterval(load, 10000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [adminKey])

  if (error) return <p role="alert" className="text-sm text-red-300">{t('error.generic')}</p>
  if (!portfolio) return <p role="status" className="text-sm text-paper/55">{t('common.loading')}</p>
  if (portfolio.events.length === 0) return <p className="text-sm text-paper/55">{t('admin.mall.empty')}</p>

  const stageLabels: Record<PortfolioStage, string> = {
    draft: t('admin.mall.stageDraft'),
    on_sale: t('admin.mall.stageOnSale'),
    check_in: t('admin.mall.stageCheckIn'),
    completed: t('admin.mall.stageCompleted'),
    settled: t('admin.mall.stageSettled'),
  }

  const lifecycle: { stage: PortfolioStage; label: string }[] = [
    { stage: 'draft', label: t('admin.mall.lifecycleSetup') },
    { stage: 'on_sale', label: t('admin.mall.lifecycleOnSale') },
    { stage: 'check_in', label: t('admin.mall.lifecycleCheckIn') },
    { stage: 'completed', label: t('admin.mall.lifecycleReport') },
    { stage: 'settled', label: t('admin.mall.lifecycleSettle') },
  ]

  const live = portfolio.events.find((event) => event.source === 'live')
  const liveStageIndex = live ? lifecycle.findIndex((step) => step.stage === live.stage) : -1

  const kpis = [
    { label: t('admin.mall.kpiEvents'), value: String(portfolio.totals.events) },
    { label: t('admin.mall.kpiSold'), value: String(portfolio.totals.sold) },
    { label: t('admin.mall.kpiOccupancy'), value: `${portfolio.totals.occupancyPct}%` },
    { label: t('admin.mall.kpiCheckins'), value: String(portfolio.totals.checkedIn) },
    { label: t('admin.mall.kpiRevenue'), value: formatIdr(portfolio.totals.revenueIdr, lang) },
  ]

  const roles = [
    { title: t('admin.mall.roleMall'), body: t('admin.mall.roleMallBody') },
    { title: t('admin.mall.roleOrganizer'), body: t('admin.mall.roleOrganizerBody') },
    { title: t('admin.mall.roleGate'), body: t('admin.mall.roleGateBody') },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="max-w-2xl text-lg font-medium leading-snug">{t('admin.mall.title')}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-paper/60">{t('admin.mall.sub')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-paper/55">
          <span className="inline-flex min-h-8 items-center border border-paper/15 px-2">Nov 2026</span>
          <span className="inline-block max-w-full border border-paper/15 px-2 py-1 leading-snug">
            {t('admin.mall.legend')}
          </span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px border border-paper/10 bg-paper/10 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={`bg-ink p-4 ${index === kpis.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <dt className="text-xs leading-snug text-paper/55">{kpi.label}</dt>
            <dd className="mt-2 text-lg font-semibold tabular-nums tracking-tight">{kpi.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-paper/55">
        {t('admin.mall.totalsScope')}{' '}
        <span className="font-medium tabular-nums text-paper/80">{portfolio.totals.sampleCount}</span>
      </p>

      <div className="mt-5 border border-paper/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('admin.mall.lifecycleTitle')}</h3>
          {live && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              {t('admin.mall.live')}
            </span>
          )}
        </div>
        <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
          {lifecycle.map((step, index) => (
            <li key={step.stage} className="flex items-center gap-1">
              <span
                className={`inline-flex min-h-8 items-center border px-2.5 ${
                  index === liveStageIndex
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-paper/15 text-paper/55'
                }`}
              >
                {step.label}
              </span>
              {index < lifecycle.length - 1 && (
                <ChevronRightIcon className="size-4 shrink-0 text-paper/25" />
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t('admin.mall.tableTitle')}</h3>
        <Link
          href="/pilot"
          className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-sm font-medium text-accent transition-colors hover:text-paper"
        >
          {t('admin.mall.pilot')}
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-2 overflow-x-auto border border-paper/10">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">{t('admin.mall.tableTitle')}</caption>
          <thead>
            <tr className="border-b border-paper/10 text-left text-xs text-paper/55">
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colEvent')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colSpace')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colDate')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colStage')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colSold')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colRevenue')}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 font-medium">{t('admin.mall.colCheckins')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{t('admin.mall.colSource')}</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.events.map((event) => {
              const stage = STAGE_TONES[event.stage]
              return (
                <tr
                  key={event.id}
                  className={`border-b border-paper/10 last:border-0 ${
                    event.source === 'live' ? 'bg-accent/[0.04]' : ''
                  }`}
                >
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      {event.source === 'live' && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
                      <span className={event.source === 'live' ? 'font-semibold' : 'text-paper/75'}>
                        {lang === 'id' ? event.name : event.nameEn}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-paper/55">{lang === 'id' ? event.space : event.spaceEn}</td>
                  <td className="px-3 py-3 tabular-nums text-paper/55">{formatShortDate(event.startsAt, lang)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap border border-paper/15 px-2 py-0.5 text-xs ${
                        stage.text
                      } ${event.source === 'sample' ? 'opacity-70' : ''}`}
                    >
                      <span aria-hidden className={`size-1.5 rounded-full ${stage.dot}`} />
                      {stageLabels[event.stage]}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-paper/65">
                    {event.sold}/{event.capacity}
                  </td>
                  <td className={`px-3 py-3 tabular-nums ${event.source === 'sample' ? 'text-paper/55' : 'text-paper/85'}`}>
                    {event.revenueIdr === 0 ? '—' : formatIdr(event.revenueIdr, lang)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-paper/60">{event.checkedIn}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-xs ${
                        event.source === 'live'
                          ? 'border-accent/35 text-accent'
                          : 'border-paper/15 text-paper/55'
                      }`}
                    >
                      {t(event.source === 'live' ? 'admin.mall.live' : 'admin.mall.sampleBadge')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <section className="border border-paper/10 p-4 lg:col-span-2">
          <h3 className="text-sm font-medium">{t('admin.mall.rolesTitle')}</h3>
          <div className="mt-3 grid divide-y divide-paper/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {roles.map((role) => (
              <div key={role.title} className="py-3 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <p className="text-sm font-medium">{role.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-paper/55">{role.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-paper/55">{t('admin.mall.rolesNote')}</p>
        </section>

        <section className="border border-paper/10 p-4">
          <h3 className="text-sm font-medium">{t('admin.mall.settlementTitle')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-paper/55">{t('admin.mall.settlementScope')}</p>
          <dl className="mt-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-paper/10 py-2">
              <dt className="text-paper/55">{t('admin.mall.gross')}</dt>
              <dd className="tabular-nums">{formatIdr(portfolio.settlement.grossIdr, lang)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-paper/10 py-2">
              <dt className="text-paper/55">{t('admin.mall.fee')}</dt>
              <dd className="tabular-nums">{formatIdr(portfolio.settlement.platformFeeIdr, lang)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 font-semibold">
              <dt>{t('admin.mall.net')}</dt>
              <dd className="tabular-nums">{formatIdr(portfolio.settlement.netIdr, lang)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-paper/55">{t('admin.mall.settlementNote')}</p>
        </section>
      </div>
    </div>
  )
}
