export type Lang = 'id' | 'en'
export type SeatStatus = 'available' | 'held' | 'sold'

export interface Category {
  id: number
  key: string
  name: string
  nameEn: string
  priceIdr: number
  colorHex: string
  sortOrder: number
  quota: number
  salesOpen: boolean
  available: number
  held: number
  sold: number
  remaining: number
}

export interface EventInfo {
  id: number
  name: string
  nameEn: string
  venue: string
  venueEn: string
  startsAt: string
  description: string
  descriptionEn: string
}

export interface Seat {
  id: string
  section: string
  row: string
  num: number
  x: number
  y: number
  z: number
  status: SeatStatus
  holdExpiresAt: string | null
  categoryKey: string
  categoryName: string
  categoryNameEn: string
  priceIdr: number
  colorHex: string
}

export function formatIdr(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatEventDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}

export interface AdminCategory {
  id: number
  key: string
  name: string
  nameEn: string
  priceIdr: number
  quota: number
  salesOpen: boolean
  colorHex: string
  available: number
  held: number
  sold: number
}

export interface AdminStats {
  orders: { total: number; pending: number; paid: number; cancelled: number; checkedIn: number; revenueIdr: number }
  seats: { available: number; held: number; sold: number }
  categories: AdminCategory[]
}

export interface AdminOrder {
  code: string
  name: string
  email: string
  phone: string
  status: 'pending' | 'paid' | 'cancelled'
  paymentMethod: string | null
  totalIdr: number
  createdAt: string
  paidAt: string | null
  checkedInAt: string | null
  seatLabel: string
  categoryKey: string
  categoryName: string
  categoryNameEn: string
}

