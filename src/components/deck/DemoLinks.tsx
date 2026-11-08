'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { resolveDeckUrl } from '@/lib/deck'

const subscribe = () => () => {}

export function DemoLinks() {
  const url = useSyncExternalStore(
    subscribe,
    () => resolveDeckUrl(process.env.NEXT_PUBLIC_DECK_URL, window.location.origin),
    () => '',
  )

  return (
    <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="accent-glow rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Buka Prototype →
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-line px-6 py-3 text-sm font-medium text-muted transition hover:border-white/30 hover:text-foreground"
        >
          Panel Panitia (demo: panitia2026)
        </Link>
      </div>
      {url && (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={url} size={84} level="M" bgColor="#ffffff" fgColor="#07060d" />
          </div>
          <div className="max-w-[12rem]">
            <p className="text-[11px] leading-relaxed text-muted">Scan untuk membuka prototype di ponsel.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-[11px] text-muted underline-offset-4 hover:underline"
            >
              {url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
