'use client'

import { create } from 'zustand'
import type { Seat } from './types'

export type BookingStep = 'category' | 'seat' | 'form' | 'summary' | 'payment'

type BookingState = {
  step: BookingStep
  categoryKey: string | null
  seat: Seat | null
  holdToken: string | null
  holdExpiresAt: string | null
  orderCode: string | null
  totalIdr: number | null
  setStep: (step: BookingStep) => void
  setCategory: (key: string | null) => void
  setSeat: (seat: Seat | null) => void
  setHold: (holdToken: string | null, holdExpiresAt: string | null) => void
  setOrder: (orderCode: string, totalIdr: number) => void
  reset: () => void
}

export const useBooking = create<BookingState>((set) => ({
  step: 'category',
  categoryKey: null,
  seat: null,
  holdToken: null,
  holdExpiresAt: null,
  orderCode: null,
  totalIdr: null,
  setStep: (step) => set({ step }),
  setCategory: (categoryKey) => set({ categoryKey }),
  setSeat: (seat) => set({ seat }),
  setHold: (holdToken, holdExpiresAt) => set({ holdToken, holdExpiresAt }),
  setOrder: (orderCode, totalIdr) => set({ orderCode, totalIdr }),
  reset: () =>
    set({
      step: 'category',
      categoryKey: null,
      seat: null,
      holdToken: null,
      holdExpiresAt: null,
      orderCode: null,
      totalIdr: null,
    }),
}))
