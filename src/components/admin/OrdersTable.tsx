'use client'

import { useEffect, useState } from 'react'
import { CalendarIcon, CheckIcon, DownloadIcon, XIcon } from '@/components/ui/icons'
import { adminFetch, downloadWithAuth } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { AdminOrder } from '@/lib/types'
import { formatIdr } from '@/lib/types'
import { formatAdminDate, formatSeatLabel } from './format'

const STATUS_STYLES: Record<AdminOrder['status'], { dot: string; text: string }> = {
  pending: { dot: 'bg-amber-300', text: 'text-amber-300' },
  paid: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  cancelled: { dot: 'bg-red-400', text: 'text-red-300' },
}

const fieldClass =
  'focus-ring min-h-11 w-full rounded-sm border border-paper/15 bg-paper/[0.04] px-3 text-sm text-paper outline-none transition-colors placeholder:text-paper/55 focus:border-accent/70'

const actionClass =
  'focus-ring inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function OrdersTable({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loaded, setLoaded] = useState(false)
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
      .finally(() => setLoaded(true))

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

  const statusLabel: Record<AdminOrder['status'], string> = {
    pending: t('summary.statusPending'),
    paid: t('admin.statusPaid'),
    cancelled: t('admin.statusCancelled'),
  }

  const filtered = orders.filter((order) => {
    if (!query) return true
    const haystack = `${order.code} ${order.name} ${order.email} ${order.phone} ${order.seatLabel}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="block w-full sm:max-w-sm">
          <span className="sr-only">{t('admin.orders.search')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.orders.search')}
            className="focus-ring min-h-11 w-full rounded-sm border border-paper/15 bg-paper/[0.04] px-3 text-sm text-paper outline-none transition-colors placeholder:text-paper/55 focus:border-accent/70"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() =>
              downloadWithAuth(adminKey, '/api/admin/export?type=participants').catch(() =>
                setError(t('error.generic')),
              )
            }
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-paper/15 px-3 text-xs font-medium text-paper/75 transition-colors hover:border-paper/30 hover:text-paper"
          >
            <DownloadIcon className="size-4 shrink-0" />
            <span className="truncate">{t('admin.orders.exportParticipants')}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadWithAuth(adminKey, '/api/admin/export?type=transactions').catch(() =>
                setError(t('error.generic')),
              )
            }
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-paper/15 px-3 text-xs font-medium text-paper/75 transition-colors hover:border-paper/30 hover:text-paper"
          >
            <DownloadIcon className="size-4 shrink-0" />
            <span className="truncate">{t('admin.orders.exportTransactions')}</span>
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 border border-red-400/35 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200"
        >
          <XIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-paper/10">
        {!loaded && <p role="status" className="py-8 text-center text-sm text-paper/55">{t('common.loading')}</p>}
        {loaded && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-paper/55">{t('admin.orders.empty')}</p>
        )}

        <ul>
          {filtered.map((order) => {
            const status = STATUS_STYLES[order.status]
            return (
              <li key={order.code} className="border-b border-paper/10 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-xs tabular-nums text-paper/55">{order.code}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                    <span aria-hidden className={`size-1.5 rounded-full ${status.dot}`} />
                    {statusLabel[order.status]}
                  </span>
                  {order.checkedInAt && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                      <CheckIcon className="size-3.5" />
                      {t('admin.stats.checkedIn')}
                    </span>
                  )}
                  <span className="inline-flex basis-full items-center gap-1.5 text-xs tabular-nums text-paper/55 sm:ml-auto sm:basis-auto">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span className="sr-only">{t('admin.orders.created')}: </span>
                    {formatAdminDate(order.createdAt, lang)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="min-w-0 break-words text-base font-medium">{order.name}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatIdr(order.totalIdr, lang)}</p>
                </div>

                <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 break-words text-sm text-paper/55">
                  <span>{order.email}</span>
                  <span aria-hidden>·</span>
                  <span>{order.phone}</span>
                </p>

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-paper/55">
                  <span className="text-paper/75">{formatSeatLabel(order.seatLabel, t)}</span>
                  <span aria-hidden>·</span>
                  <span>{lang === 'id' ? order.categoryName : order.categoryNameEn}</span>
                  <span aria-hidden>·</span>
                  <span>{order.paymentMethod ?? '—'}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={busyCode === order.code}
                      onClick={() => act(order.code, 'confirm')}
                      className={`${actionClass} border-emerald-400/35 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-400/[0.06]`}
                    >
                      {t('admin.orders.confirm')}
                    </button>
                  )}
                  {order.status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={busyCode === order.code}
                      onClick={() => setConfirmCancel(order.code)}
                      className={`${actionClass} border-red-400/35 text-red-200 hover:border-red-400/60 hover:bg-red-400/[0.06]`}
                    >
                      {t('admin.orders.cancel')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (editing?.code === order.code ? setEditing(null) : startEdit(order))}
                    className={`${actionClass} border-paper/15 text-paper/70 hover:border-paper/30 hover:text-paper`}
                  >
                    {t('admin.orders.edit')}
                  </button>
                </div>

                {confirmCancel === order.code && (
                  <div
                    role="alert"
                    className="mt-3 flex flex-wrap items-center gap-2 border border-red-400/35 bg-red-400/[0.06] p-3 text-sm text-red-100"
                  >
                    <span className="min-w-0 flex-1 basis-full sm:basis-0">{t('admin.orders.cancelConfirm')}</span>
                    <button
                      type="button"
                      disabled={busyCode === order.code}
                      onClick={() => {
                        setConfirmCancel(null)
                        act(order.code, 'cancel')
                      }}
                      className="focus-ring inline-flex min-h-11 items-center justify-center rounded-sm border border-red-400/45 px-3 text-sm font-medium text-red-100 transition-colors hover:bg-red-400/15 disabled:opacity-50"
                    >
                      {t('admin.orders.cancelYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(null)}
                      className="focus-ring inline-flex min-h-11 items-center justify-center rounded-sm border border-paper/15 px-3 text-sm font-medium text-paper/70 transition-colors hover:border-paper/30 hover:text-paper"
                    >
                      {t('admin.orders.cancelNo')}
                    </button>
                  </div>
                )}

                {editing?.code === order.code && (
                  <div className="mt-3 grid gap-2 border-t border-paper/10 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder={t('form.name')}
                      aria-label={t('form.name')}
                      className={fieldClass}
                    />
                    <input
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                      placeholder={t('form.email')}
                      aria-label={t('form.email')}
                      className={fieldClass}
                    />
                    <input
                      value={editPhone}
                      onChange={(event) => setEditPhone(event.target.value)}
                      placeholder={t('form.phone')}
                      aria-label={t('form.phone')}
                      className={fieldClass}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyCode === order.code}
                        onClick={saveEdit}
                        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
                      >
                        {t('admin.orders.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-sm border border-paper/15 px-4 text-sm font-medium text-paper/70 transition-colors hover:border-paper/30 hover:text-paper"
                      >
                        {t('admin.orders.cancelEdit')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
