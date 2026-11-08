import { describe, expect, it } from 'vitest'
import { defaultSeatView, hasWebGL } from '@/lib/webgl'

describe('hasWebGL', () => {
  it('returns false when both context getters return null', () => {
    expect(hasWebGL(() => null)).toBe(false)
  })
  it('returns true when a context is returned', () => {
    expect(hasWebGL(() => ({} as WebGLRenderingContext))).toBe(true)
  })
})

describe('defaultSeatView', () => {
  it('defaults to the 2D map when WebGL is unavailable', () => {
    expect(defaultSeatView(false)).toBe('map')
    expect(defaultSeatView(true)).toBe('3d')
  })
})
