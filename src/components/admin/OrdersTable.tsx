'use client'

import { useEffect, useState } from 'react'
import { adminFetch, downloadWithAuth } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { AdminOrder } from '@/lib/types'
import { formatIdr } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  paid: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  cancelled: 'border-red-300/30 bg-red-300/10 text-red-200',
}

export function OrdersTable({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [query, setQuery] = useState('')
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminOrder | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    adminFetch<AdminOrder[]>(adminKey, '/api/admin/orders')
      .then(setOrders)
      .catch(() => setError(t('error.generic')))

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  const act = async (code: string, action: 'confirm' | 'cancel') => {
    setBusyCode(code)
    setError(null)
    try {
      await adminFetch(adminKey, `/api/admin/orders/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      await load()
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusyCode(null)
    }
  }

  const startEdit = (order: AdminOrder) => {
    setEditing(order)
    setEditName(order.name)
    setEditEmail(order.email)
    setEditPhone(order.phone)
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusyCode(editing.code)
    setError(null)
    try {
      await adminFetch(adminKey, `/api/admin/orders/${encodeURIComponent(editing.code)}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update', name: editName, email: editEmail, phone: editPhone }),
      })
      setEditing(null)
      await load()
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusyCode(null)
    }
  }

  const statusLabel: Record<string, string> = {
    pending: t('summary.statusPending'),
    paid: t('admin.statusPaid'),
    cancelled: t('admin.statusCancelled'),
  }

  const filtered = orders.filter((order) => {
    if (!query) return true
    const haystack = `${order.code} ${order.name} ${order.email} ${order.seatLabel}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.orders.search')}
          className="w-full max-w-xs rounded-full border border-line bg-white/5 px-4 py-2 text-base outline-none transition focus:border-accent/60 sm:text-sm"
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => downloadWithAuth(adminKey, '/api/admin/export?type=participants').catch(() => setError(t('error.generic')))}
            className="rounded-full border border-line px-3 py-2 text-xs font-medium transition hover:border-white/30"
          >
            ↓ {t('admin.orders.exportParticipants')}
          </button>
          <button
            type="button"
            onClick={() => downloadWithAuth(adminKey, '/api/admin/export?type=transactions').catch(() => setError(t('error.generic')))}
            className="rounded-full border border-line px-3 py-2 text-xs font-medium transition hover:border-white/30"
          >
            ↓ {t('admin.orders.exportTransactions')}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted">{t('admin.orders.empty')}</p>}
        {filtered.map((order) => (
          <div key={order.code} className="panel rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="font-mono text-xs text-muted">{order.code}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[order.status]}`}>
                    {statusLabel[order.status]}
                  </span>
                  {order.checkedInAt && <span className="text-[10px] text-emerald-300">✓ {t('admin.stats.checkedIn')}</span>}
                </p>
                <p className="mt-1 truncate text-sm">
                  {order.name} · <span className="text-muted">{order.email} · {order.phone}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {order.seatLabel} · {lang === 'id' ? order.categoryName : order.categoryNameEn} ·{' '}
                  {formatIdr(order.totalIdr, lang)} · {order.paymentMethod ?? '—'} ·{' '}
                  {new Date(order.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <button
                    type="button"
                    disabled={busyCode === order.code}
                    onClick={() => act(order.code, 'confirm')}
                    className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-50"
                  >
                    {t('admin.orders.confirm')}
                  </button>
                )}
                {order.status !== 'cancelled' && (
                  <button
                    type="button"
                    disabled={busyCode === order.code}
                    onClick={() => setConfirmCancel(order.code)}
                    className="rounded-full bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
                  >
                    {t('admin.orders.cancel')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (editing?.code === order.code ? setEditing(null) : startEdit(order))}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
                >
                  {t('admin.orders.edit')}
                </button>
              </div>
            </div>

            {confirmCancel === order.code && (
              <div
                role="alert"
                className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100"
              >
                <span className="mr-auto">{t('admin.orders.cancelConfirm')}</span>
                <button
                  type="button"
                  disabled={busyCode === order.code}
                  onClick={() => {
                    setConfirmCancel(null)
                    act(order.code, 'cancel')
                  }}
                  className="rounded-full bg-red-400/20 px-3 py-1.5 font-medium text-red-100 transition hover:bg-red-400/30 disabled:opacity-50"
                >
                  {t('admin.orders.cancelYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(null)}
                  className="rounded-full border border-line px-3 py-1.5 font-medium text-muted transition hover:border-white/30 hover:text-foreground"
                >
                  {t('admin.orders.cancelNo')}
                </button>
              </div>
            )}

            {editing?.code === order.code && (
              <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('form.name')} className="rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none focus:border-accent/60 sm:text-sm" />
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder={t('form.email')} className="rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none focus:border-accent/60 sm:text-sm" />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder={t('form.phone')} className="rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none focus:border-accent/60 sm:text-sm" />
                <div className="flex gap-2">
                  <button type="button" disabled={busyCode === order.code} onClick={saveEdit} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">
                    {t('admin.orders.save')}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-line px-3 py-2 text-xs text-muted">
                    {t('admin.orders.cancelEdit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
