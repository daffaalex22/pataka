'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckIn } from '@/components/admin/CheckIn'
import { Dashboard } from '@/components/admin/Dashboard'
import { Discounts } from '@/components/admin/Discounts'
import { MallOperations } from '@/components/admin/MallOperations'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { SeatInventory } from '@/components/admin/SeatInventory'
import { Settings } from '@/components/admin/Settings'
import { XIcon } from '@/components/ui/icons'
import { LangToggle } from '@/components/ui/LangToggle'
import { adminFetch } from '@/lib/adminApi'
import { useT } from '@/lib/i18n'

type Tab = 'dashboard' | 'mall' | 'orders' | 'inventory' | 'settings' | 'discounts' | 'checkin'

export default function AdminPage() {
  const t = useT()
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const [checking, setChecking] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')

  useEffect(() => {
    const stored = window.sessionStorage.getItem('pataka-admin-key')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the session after mount to avoid an SSR mismatch
    if (stored) setAdminKey(stored)
  }, [])

  const signIn = async () => {
    setChecking(true)
    try {
      await adminFetch(keyInput, '/api/admin/stats')
      window.sessionStorage.setItem('pataka-admin-key', keyInput)
      setAdminKey(keyInput)
      setWrong(false)
    } catch {
      setWrong(true)
    } finally {
      setChecking(false)
    }
  }

  const logout = () => {
    window.sessionStorage.removeItem('pataka-admin-key')
    setAdminKey(null)
    setKeyInput('')
  }

  if (!adminKey) {
    return (
      <div className="flex min-h-svh flex-col bg-ink text-paper">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16 sm:px-6">
          <header className="flex items-center justify-between border-b border-paper/10 py-5">
            <Link
              href="/"
              className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper"
            >
              PATAKA
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            </Link>
            <LangToggle />
          </header>

          <main className="flex flex-1 flex-col justify-center py-10">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                signIn()
              }}
              className="border border-paper/15 p-6 sm:p-8"
            >
              <h1 className="font-display text-[clamp(2.5rem,8vw,3rem)] uppercase leading-[0.9] tracking-[0.01em]">
                {t('admin.loginTitle')}
              </h1>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-paper/60">{t('admin.loginSub')}</p>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-paper/80">{t('admin.key')}</span>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(event) => {
                    setKeyInput(event.target.value)
                    setWrong(false)
                  }}
                  aria-invalid={wrong}
                  aria-describedby={wrong ? 'admin-key-error' : undefined}
                  className={`focus-ring mt-2 min-h-11 w-full rounded-sm border bg-paper/[0.04] px-3 text-base text-paper outline-none transition-colors placeholder:text-paper/55 ${
                    wrong ? 'border-red-400/60' : 'border-paper/15 focus:border-accent/70'
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>

              {wrong && (
                <p id="admin-key-error" role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-300">
                  <XIcon className="mt-0.5 size-4 shrink-0" />
                  {t('admin.wrongKey')}
                </p>
              )}

              <button
                type="submit"
                disabled={checking || !keyInput}
                className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-accent px-5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? t('common.loading') : t('admin.enter')}
              </button>

              {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') && (
                <p className="mt-4 text-xs leading-relaxed text-paper/55">{t('admin.demoHint')}</p>
              )}
            </form>
          </main>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('admin.tabDashboard') },
    { key: 'mall', label: t('admin.tabMall') },
    { key: 'orders', label: t('admin.tabOrders') },
    { key: 'inventory', label: t('admin.tabInventory') },
    { key: 'settings', label: t('admin.tabSettings') },
    { key: 'discounts', label: t('admin.tabDiscounts') },
    { key: 'checkin', label: t('admin.tabCheckin') },
  ]
  const activeTab = tabs.find((item) => item.key === tab) ?? tabs[0]

  return (
    <div className="min-h-svh bg-ink text-paper">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 pb-16 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-paper/10 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper"
            >
              PATAKA
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            </Link>
            <span className="inline-flex min-h-7 items-center border border-paper/15 px-2 text-xs text-paper/65">
              {t('common.admin')}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <button
              type="button"
              onClick={logout}
              className="focus-ring inline-flex min-h-11 items-center rounded-sm px-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
            >
              {t('admin.logout')}
            </button>
          </div>
        </header>

        <div className="pt-6">
          <h1 className="font-display text-[clamp(2.5rem,6vw,3rem)] uppercase leading-[0.9] tracking-[0.01em]">
            {activeTab.label}
          </h1>
        </div>

        <nav
          aria-label={t('admin.tabsLabel')}
          className="mt-4 grid grid-cols-3 gap-px border border-paper/15 bg-paper/15 sm:grid-cols-7"
        >
          {tabs.map((item) => {
            const active = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring flex min-h-12 items-center justify-center px-2 py-2 text-center text-xs font-medium leading-snug transition-colors ${
                  active
                    ? 'bg-accent text-ink'
                    : 'bg-ink text-paper/60 hover:bg-paper/[0.06] hover:text-paper'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <main className="flex-1 py-6">
          {tab === 'dashboard' && <Dashboard adminKey={adminKey} onOpenOrders={() => setTab('orders')} />}
          {tab === 'mall' && <MallOperations adminKey={adminKey} />}
          {tab === 'orders' && <OrdersTable adminKey={adminKey} />}
          {tab === 'inventory' && <SeatInventory />}
          {tab === 'settings' && <Settings adminKey={adminKey} />}
          {tab === 'discounts' && <Discounts adminKey={adminKey} />}
          {tab === 'checkin' && <CheckIn adminKey={adminKey} />}
        </main>
      </div>
    </div>
  )
}
