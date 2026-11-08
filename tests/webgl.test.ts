import { describe, expect, it } from 'vitest'
import { hasWebGL } from '@/lib/webgl'

describe('hasWebGL', () => {
  it('returns false when both context getters return null', () => {
    expect(hasWebGL(() => null)).toBe(false)
  })
  it('returns true when a context is returned', () => {
    expect(hasWebGL(() => ({} as WebGLRenderingContext))).toBe(true)
  })
})
