import { Suspense } from 'react'
import { ETicketClient } from './ETicketClient'

export default function ETicketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh flex-col bg-ink text-paper">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-16 sm:px-6">
            <header className="flex items-center justify-between border-b border-paper/10 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper">
                PATAKA
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              </span>
              <span aria-hidden className="h-9 w-24 rounded-sm border border-paper/15" />
            </header>
            <div aria-hidden className="mx-auto mt-8 w-full max-w-3xl space-y-3">
              <div className="h-3 w-36 rounded-sm bg-paper/10" />
              <div className="h-12 w-72 max-w-full rounded-sm bg-paper/10" />
              <div className="mt-7 grid border border-paper/10 p-5 sm:grid-cols-[1fr_220px] sm:gap-6">
                <div className="space-y-3">
                  <div className="h-6 w-24 rounded-sm bg-paper/10" />
                  <div className="h-10 w-64 max-w-full rounded-sm bg-paper/10" />
                  <div className="h-3 w-40 rounded-sm bg-paper/10" />
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="h-4 w-full rounded-sm bg-paper/10" />
                    <div className="h-4 w-full rounded-sm bg-paper/10" />
                    <div className="h-4 w-3/4 rounded-sm bg-paper/10" />
                    <div className="h-4 w-2/3 rounded-sm bg-paper/10" />
                  </div>
                </div>
                <div className="mt-6 h-48 rounded-sm bg-paper/10 sm:mt-0" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ETicketClient />
    </Suspense>
  )
}
