'use client'

import { useT } from '@/lib/i18n'

export function CheckIn({ adminKey }: { adminKey: string }) {
  const t = useT()
  return (
    <div className="panel rounded-2xl p-6 text-sm text-muted">
      {t('admin.checkin.sub')} — {t('common.loading')}
    </div>
  )
}
