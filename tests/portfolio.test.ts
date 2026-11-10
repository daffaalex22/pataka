import { describe, expect, it } from 'vitest'
import { buildPortfolio, MALL_SPACES, PLATFORM_FEE_PCT, SAMPLE_EVENTS, occupancyPct, type PortfolioEvent } from '@/lib/portfolio'

const live: PortfolioEvent = {
  id: 'live-1',
  name: 'Closing Night Concert',
  nameEn: 'Closing Night Concert',
  spaceId: 'sawarga',
  space: 'Sawarga Courtyard',
  spaceEn: 'Sawarga Courtyard',
  startsAt: '2026-11-14T19:00:00+07:00',
  stage: 'check_in',
  capacity: 446,
  sold: 366,
  revenueIdr: 256_000_000,
  checkedIn: 300,
  source: 'live',
}

describe('buildPortfolio', () => {
  it('puts the live event first and sorts samples by date', () => {
    const result = buildPortfolio(live)
    expect(result.events[0]).toBe(live)
    const sampleDates = result.events.slice(1).map((event) => event.startsAt)
    expect(sampleDates).toEqual([...sampleDates].sort())
  })

  it('sums totals across live and sample events', () => {
    const result = buildPortfolio(live)
    const all = result.events
    expect(result.totals.events).toBe(all.length)
    expect(result.totals.capacity).toBe(all.reduce((sum, event) => sum + event.capacity, 0))
    expect(result.totals.sold).toBe(all.reduce((sum, event) => sum + event.sold, 0))
    expect(result.totals.revenueIdr).toBe(all.reduce((sum, event) => sum + event.revenueIdr, 0))
    expect(result.totals.checkedIn).toBe(all.reduce((sum, event) => sum + event.checkedIn, 0))
  })

  it('computes occupancy and handles zero capacity', () => {
    const result = buildPortfolio(live)
    expect(result.totals.occupancyPct).toBe(Math.round((result.totals.sold / result.totals.capacity) * 100))
    expect(occupancyPct(0, 0)).toBe(0)
    expect(occupancyPct(1, 3)).toBe(33)
  })

  it('settles only the live event', () => {
    const result = buildPortfolio(live)
    expect(result.settlement.grossIdr).toBe(live.revenueIdr)
    expect(result.settlement.platformFeePct).toBe(5)
    expect(result.settlement.platformFeeIdr).toBe(Math.round(live.revenueIdr * PLATFORM_FEE_PCT))
    expect(result.settlement.netIdr).toBe(live.revenueIdr - result.settlement.platformFeeIdr)
  })

  it('labels sources and does not mutate inputs', () => {
    const sampleCount = SAMPLE_EVENTS.length
    const result = buildPortfolio(live)
    expect(result.events).toHaveLength(sampleCount + 1)
    expect(result.events.filter((event) => event.source === 'sample')).toHaveLength(sampleCount)
    expect(SAMPLE_EVENTS).toHaveLength(sampleCount)
    expect(live.sold).toBe(366)
    expect(result.spaces).toBe(MALL_SPACES)
  })
})
