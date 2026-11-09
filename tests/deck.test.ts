import { describe, expect, it } from 'vitest'
import {
  DECK_SLIDES,
  DECK_SLIDE_COUNT,
  nextSlideIndex,
  parseDeckHash,
  resolveDeckUrl,
} from '@/lib/deck'

describe('DECK_SLIDES', () => {
  it('has 11 slides with unique ids', () => {
    expect(DECK_SLIDE_COUNT).toBe(11)
    expect(DECK_SLIDES).toHaveLength(11)
    expect(new Set(DECK_SLIDES.map((slide) => slide.id)).size).toBe(11)
  })

  it('starts at the cover and ends at the close', () => {
    expect(DECK_SLIDES[0].id).toBe('cover')
    expect(DECK_SLIDES[10].id).toBe('close')
  })

  it('has a title, subtitle, and notes for every slide', () => {
    for (const slide of DECK_SLIDES) {
      expect(slide.title.trim().length).toBeGreaterThan(0)
      expect(slide.subtitle.trim().length).toBeGreaterThan(0)
      expect(slide.notes.trim().length).toBeGreaterThan(30)
    }
  })
})

describe('resolveDeckUrl', () => {
  it('uses a configured production URL and trims trailing slashes', () => {
    expect(resolveDeckUrl('https://pataka-ruby.vercel.app/', 'http://localhost:3000')).toBe(
      'https://pataka-ruby.vercel.app',
    )
  })

  it('falls back to the current origin when unset', () => {
    expect(resolveDeckUrl(undefined, 'http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('falls back to the current origin when blank', () => {
    expect(resolveDeckUrl('   ', 'http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('parseDeckHash', () => {
  it('parses 1-based hashes into 0-based indexes', () => {
    expect(parseDeckHash('#/1', 10)).toBe(0)
    expect(parseDeckHash('#/10', 10)).toBe(9)
  })

  it('rejects out-of-range and malformed hashes', () => {
    expect(parseDeckHash('#/0', 10)).toBeNull()
    expect(parseDeckHash('#/11', 10)).toBeNull()
    expect(parseDeckHash('#cover', 10)).toBeNull()
    expect(parseDeckHash('', 10)).toBeNull()
  })
})

describe('nextSlideIndex', () => {
  it('moves within bounds', () => {
    expect(nextSlideIndex(0, 1, 10)).toBe(1)
    expect(nextSlideIndex(9, -1, 10)).toBe(8)
  })

  it('clamps at both ends', () => {
    expect(nextSlideIndex(0, -1, 10)).toBe(0)
    expect(nextSlideIndex(9, 1, 10)).toBe(9)
  })

  it('returns 0 for an empty deck', () => {
    expect(nextSlideIndex(0, 1, 0)).toBe(0)
  })
})
