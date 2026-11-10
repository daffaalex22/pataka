import type {
  MallSpace,
  PortfolioEvent,
  PortfolioResponse,
  PortfolioSettlement,
  PortfolioTotals,
} from './types'

export const MALL_SPACES: MallSpace[] = [
  { id: 'sawarga', name: 'Sawarga Courtyard', nameEn: 'Sawarga Courtyard' },
  { id: 'ciunik', name: 'Atrium Ciunik', nameEn: 'Atrium Ciunik' },
  { id: 'cibadak', name: 'Atrium Cibadak', nameEn: 'Atrium Cibadak' },
  { id: 'cileutik', name: 'Atrium Cileutik', nameEn: 'Atrium Cileutik' },
  { id: 'downtown', name: 'Downtown Walk', nameEn: 'Downtown Walk' },
]

export const PLATFORM_FEE_PCT = 0.05

/** Demo fixtures only. The UI labels every row as SAMPLE; Task 6 of C replaces these with DB queries. */
export const SAMPLE_EVENTS: PortfolioEvent[] = [
  {
    id: 'sample-jazz',
    name: 'Jazz Night at Sawarga',
    nameEn: 'Jazz Night at Sawarga',
    spaceId: 'sawarga',
    space: 'Sawarga Courtyard',
    spaceEn: 'Sawarga Courtyard',
    startsAt: '2026-11-21T19:00:00+07:00',
    stage: 'on_sale',
    capacity: 600,
    sold: 320,
    revenueIdr: 210_000_000,
    checkedIn: 0,
    source: 'sample',
  },
  {
    id: 'sample-market',
    name: 'Weekend Market',
    nameEn: 'Weekend Market',
    spaceId: 'downtown',
    space: 'Downtown Walk',
    spaceEn: 'Downtown Walk',
    startsAt: '2026-11-23T10:00:00+07:00',
    stage: 'check_in',
    capacity: 300,
    sold: 273,
    revenueIdr: 0,
    checkedIn: 240,
    source: 'sample',
  },
  {
    id: 'sample-launch',
    name: 'Brand Launch',
    nameEn: 'Brand Launch',
    spaceId: 'ciunik',
    space: 'Atrium Ciunik',
    spaceEn: 'Atrium Ciunik',
    startsAt: '2026-11-28T13:00:00+07:00',
    stage: 'draft',
    capacity: 180,
    sold: 0,
    revenueIdr: 0,
    checkedIn: 0,
    source: 'sample',
  },
]

export function occupancyPct(sold: number, capacity: number): number {
  return capacity === 0 ? 0 : Math.round((sold / capacity) * 100)
}

export function buildPortfolio(live: PortfolioEvent): PortfolioResponse {
  const samples = [...SAMPLE_EVENTS].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const events = [live, ...samples]

  const totals: PortfolioTotals = {
    events: events.length,
    capacity: events.reduce((sum, event) => sum + event.capacity, 0),
    sold: events.reduce((sum, event) => sum + event.sold, 0),
    occupancyPct: 0,
    revenueIdr: events.reduce((sum, event) => sum + event.revenueIdr, 0),
    checkedIn: events.reduce((sum, event) => sum + event.checkedIn, 0),
  }
  totals.occupancyPct = occupancyPct(totals.sold, totals.capacity)

  const grossIdr = live.revenueIdr
  const platformFeeIdr = Math.round(grossIdr * PLATFORM_FEE_PCT)
  const settlement: PortfolioSettlement = {
    grossIdr,
    platformFeePct: 5,
    platformFeeIdr,
    netIdr: grossIdr - platformFeeIdr,
  }

  return { events, totals, spaces: MALL_SPACES, settlement }
}
