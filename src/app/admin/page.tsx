'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckIn } from '@/components/admin/CheckIn'
import { Dashboard } from '@/components/admin/Dashboard'
import { Discounts } from '@/components/admin/Discounts'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { SeatInventory } from '@/components/admin/SeatInventory'
import { Settings } from '@/components/admin/Settings'
import { LangToggle } from '@/components/ui/LangToggle'
import { adminFetch } from '@/lib/adminApi'
import { useT } from '@/lib/i18n'

type Tab = 'dashboard' | 'orders' | 'inventory' | 'settings' | 'discounts' | 'checkin'

export default function AdminPage() {
  const t = useT()
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const [checking, setChecking] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')

  useEffect(() => {
    const stored = window.sessionStorage.getItem('pataka-admin-key')
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
            PATAKA
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          </Link>
          <LangToggle />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            signIn()
          }}
          className="panel rounded-3xl p-6"
        >
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.loginTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('admin.loginSub')}</p>
          <label className="mt-5 block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{t('admin.key')}</span>
            <input
              type="password"
              value={keyInput}
              onChange={(event) => {
                setKeyInput(event.target.value)
                setWrong(false)
              }}
              className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-base outline-none transition focus:border-accent/60"
              placeholder="••••••••"
            />
          </label>
          {wrong && <p className="mt-2 text-sm text-red-300">{t('admin.wrongKey')}</p>}
          <button
            type="submit"
            disabled={checking || !keyInput}
            className="mt-4 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {checking ? t('common.loading') : t('admin.enter')}
          </button>
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') && (
            <p className="mt-4 text-center text-[11px] text-muted">{t('admin.demoHint')}</p>
          )}
        </form>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('admin.tabDashboard') },
    { key: 'orders', label: t('admin.tabOrders') },
    { key: 'inventory', label: t('admin.tabInventory') },
    { key: 'settings', label: t('admin.tabSettings') },
    { key: 'discounts', label: t('admin.tabDiscounts') },
    { key: 'checkin', label: t('admin.tabCheckin') },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
            PATAKA
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          </Link>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
            {t('common.admin')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <button type="button" onClick={logout} className="text-xs text-muted transition hover:text-foreground">
            {t('admin.logout')}
          </button>
        </div>
      </header>

      <nav className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
              tab === item.key ? 'bg-accent text-black' : 'text-muted hover:bg-white/5 hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <Dashboard adminKey={adminKey} onOpenOrders={() => setTab('orders')} />}
      {tab === 'orders' && <OrdersTable adminKey={adminKey} />}
      {tab === 'inventory' && <SeatInventory />}
      {tab === 'settings' && <Settings adminKey={adminKey} />}
      {tab === 'discounts' && <Discounts adminKey={adminKey} />}
      {tab === 'checkin' && <CheckIn adminKey={adminKey} />}
    </div>
  )
}
