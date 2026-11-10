'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { PortfolioResponse, PortfolioStage } from '@/lib/types'
import { formatIdr } from '@/lib/types'

const STAGE_TONE: Record<PortfolioStage, string> = {
  draft: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300',
  on_sale: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  check_in: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  completed: 'border-white/15 bg-white/5 text-muted',
  settled: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
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

  if (error) return <p className="text-sm text-red-300">{t('error.generic')}</p>
  if (!portfolio) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="panel h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }
  if (portfolio.events.length === 0) return <p className="text-sm text-muted">{t('admin.mall.empty')}</p>

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
    { label: t('admin.mall.kpiRevenue'), value: formatIdr(portfolio.totals.revenueIdr, lang) },
    { label: t('admin.mall.kpiCheckins'), value: String(portfolio.totals.checkedIn) },
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
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">PATAKA · OPERATIONS</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{t('admin.mall.title')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('admin.mall.sub')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="rounded-full border border-line px-3 py-1">Nov 2026</span>
          <span className="rounded-full border border-line px-3 py-1">{t('admin.mall.legend')}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="panel rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {t('admin.mall.totalsScope')}{' '}
        <span className="font-medium text-foreground">{portfolio.totals.sampleCount}</span>
      </p>

      <div className="panel mt-5 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('admin.mall.lifecycleTitle')}</h3>
          {live && <span className="text-[11px] text-accent">{t('admin.mall.live')}</span>}
        </div>
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {lifecycle.map((step, index) => (
            <li key={step.stage} className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 ${
                  index === liveStageIndex ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line'
                }`}
              >
                {step.label}
              </span>
              {index < lifecycle.length - 1 && (
                <span aria-hidden className="text-muted/60">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          {t('admin.mall.tableTitle')}
        </h3>
        <Link href="/pilot" className="text-xs text-accent hover:underline">
          {t('admin.mall.pilot')}
        </Link>
      </div>

      <div className="panel mt-2 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">{t('admin.mall.tableTitle')}</caption>
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colEvent')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colSpace')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colDate')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colStage')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colSold')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colRevenue')}</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{t('admin.mall.colCheckins')}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t('admin.mall.colSource')}</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.events.map((event) => (
              <tr
                key={event.id}
                className={
                  event.source === 'live'
                    ? 'border-b border-line/60 bg-accent/[0.04] last:border-0'
                    : 'border-b border-line/60 last:border-0'
                }
              >
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    {event.source === 'live' && <span aria-hidden className="size-2 rounded-full bg-accent" />}
                    <span className={event.source === 'live' ? 'font-semibold' : 'text-muted'}>
                      {lang === 'id' ? event.name : event.nameEn}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{lang === 'id' ? event.space : event.spaceEn}</td>
                <td className="px-4 py-3 text-muted">{formatShortDate(event.startsAt, lang)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${STAGE_TONE[event.stage]} ${
                      event.source === 'sample' ? 'opacity-70' : ''
                    }`}
                  >
                    {stageLabels[event.stage]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {event.sold}/{event.capacity}
                </td>
                <td className={`px-4 py-3 ${event.source === 'sample' ? 'text-muted' : ''}`}>
                  {event.revenueIdr === 0 ? '—' : formatIdr(event.revenueIdr, lang)}
                </td>
                <td className="px-4 py-3 text-muted">{event.checkedIn}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      event.source === 'live'
                        ? 'border-accent/30 bg-accent/15 text-accent'
                        : 'border-line bg-white/5 text-muted'
                    }`}
                  >
                    {t(event.source === 'live' ? 'admin.mall.live' : 'admin.mall.sampleBadge')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="panel rounded-2xl p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">{t('admin.mall.rolesTitle')}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {roles.map((role) => (
              <div key={role.title} className="rounded-xl border border-line p-3">
                <p className="text-sm font-medium">{role.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{role.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">{t('admin.mall.rolesNote')}</p>
        </div>

        <div className="panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold">{t('admin.mall.settlementTitle')}</h3>
          <p className="mt-1 text-[11px] text-muted">{t('admin.mall.settlementScope')}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t('admin.mall.gross')}</dt>
              <dd>{formatIdr(portfolio.settlement.grossIdr, lang)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t('admin.mall.fee')}</dt>
              <dd>{formatIdr(portfolio.settlement.platformFeeIdr, lang)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-2 font-semibold">
              <dt>{t('admin.mall.net')}</dt>
              <dd>{formatIdr(portfolio.settlement.netIdr, lang)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted">{t('admin.mall.settlementNote')}</p>
        </div>
      </div>
    </div>
  )
}
