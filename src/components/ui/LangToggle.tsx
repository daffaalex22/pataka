'use client'

import { useLang } from '@/lib/i18n'

export function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center rounded-full border border-line p-0.5 text-xs font-medium">
      {(['id', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition ${
            lang === code ? 'bg-accent text-black' : 'text-muted hover:text-foreground'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
