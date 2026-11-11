'use client'

import { create } from 'zustand'
import type { PriceBreakdown } from './discounts'
import type { Seat } from './types'

export type BookingStep = 'category' | 'seat' | 'form' | 'summary' | 'payment'

export type Participant = { name: string; email: string; phone: string }

type BookingState = {
  step: BookingStep
  categoryKey: string | null
  seat: Seat | null
  holdToken: string | null
  holdExpiresAt: string | null
  holdSeatId: string | null
  orderCode: string | null
  totalIdr: number | null
  breakdown: PriceBreakdown | null
  participant: Participant | null
  setStep: (step: BookingStep) => void
  setCategory: (key: string | null) => void
  setSeat: (seat: Seat | null) => void
  setHold: (holdToken: string | null, holdExpiresAt: string | null, holdSeatId: string | null) => void
  setOrder: (orderCode: string | null, totalIdr: number | null) => void
  setBreakdown: (breakdown: PriceBreakdown | null) => void
  setParticipant: (participant: Participant | null) => void
  reset: () => void
}

const initial = {
  step: 'category' as BookingStep,
  categoryKey: null,
  seat: null,
  holdToken: null,
  holdExpiresAt: null,
  holdSeatId: null,
  orderCode: null,
  totalIdr: null,
  breakdown: null,
  participant: null,
}

export const useBooking = create<BookingState>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setCategory: (categoryKey) => set({ categoryKey }),
  setSeat: (seat) => set({ seat }),
  setHold: (holdToken, holdExpiresAt, holdSeatId) => set({ holdToken, holdExpiresAt, holdSeatId }),
  setOrder: (orderCode, totalIdr) => set({ orderCode, totalIdr }),
  setBreakdown: (breakdown) => set({ breakdown }),
  setParticipant: (participant) => set({ participant }),
  reset: () => set(initial),
}))
