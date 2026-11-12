import { describe, expect, it } from 'vitest'
import {
  drawSpacedText,
  fitFontToWidth,
  spacedTextWidth,
} from '@/lib/sawarga/utils/textLayout'

interface Draw {
  text: string
  x: number
  align: CanvasTextAlign
}

function fakeContext(initialAlign: CanvasTextAlign = 'center') {
  const draws: Draw[] = []
  const alignment = { current: initialAlign }
  const ctx = {
    get textAlign() {
      return alignment.current
    },
    set textAlign(value: CanvasTextAlign) {
      alignment.current = value
    },
    measureText: (text: string) => ({ width: text === 'S' ? 100 : 80 }),
    fillText: (text: string, x: number) => {
      draws.push({ text, x, align: alignment.current })
    },
    save: () => {},
    restore: () => {
      alignment.current = initialAlign
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, draws, alignment }
}

describe('spacedTextWidth', () => {
  it('adds glyph widths plus the spacing between glyphs', () => {
    expect(spacedTextWidth([100, 80], 10)).toBe(190)
  })
})

describe('drawSpacedText', () => {
  it('draws glyphs left-aligned from a centered start position', () => {
    const { ctx, draws } = fakeContext()

    drawSpacedText(ctx, 'SU', 1024, 300, 10)

    // total = 100 + 80 + 10 = 190; start = 1024 - 95 = 929
    expect(draws).toEqual([
      { text: 'S', x: 929, align: 'left' },
      { text: 'U', x: 1039, align: 'left' },
    ])
  })

  it('restores the previous text alignment after drawing', () => {
    const { ctx, alignment } = fakeContext('center')

    drawSpacedText(ctx, 'SU', 100, 50, 10)

    expect(alignment.current).toBe('center')
  })
})

describe('fitFontToWidth', () => {
  it('leaves a font that already fits untouched', () => {
    const font = '600 190px "Cormorant Garamond", serif'
    expect(fitFontToWidth(font, 12, 1800, 1843)).toEqual({ font, spacing: 12 })
  })

  it('scales font size and spacing down to the available width', () => {
    const fitted = fitFontToWidth('600 190px "Cormorant Garamond", serif', 12, 2210, 1843.2)
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(fitted.font)?.[1])

    expect(size).toBeCloseTo(158.47, 2)
    expect(fitted.spacing).toBeCloseTo(10.01, 2)
    expect(fitted.font).toContain('"Cormorant Garamond"')
  })

  it('ignores a font string with no pixel size', () => {
    expect(fitFontToWidth('serif', 12, 3000, 1843)).toEqual({ font: 'serif', spacing: 12 })
  })
})
