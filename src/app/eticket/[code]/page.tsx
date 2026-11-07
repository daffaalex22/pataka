import { Suspense } from 'react'
import { ETicketClient } from './ETicketClient'

export default function ETicketPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 sm:px-6">
          <div className="panel mt-6 h-96 animate-pulse rounded-3xl" />
        </div>
      }
    >
      <ETicketClient />
    </Suspense>
  )
}
