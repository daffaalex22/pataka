import { describe, expect, it } from 'vitest'
import {
  assetQualityFor,
  effectiveQuality,
  isSceneQuality,
  maxDprForQuality,
} from '@/lib/sceneQuality'

describe('scene quality presets', () => {
  it('resolves auto by viewport', () => {
    expect(effectiveQuality('auto', true)).toBe('low')
    expect(effectiveQuality('auto', false)).toBe('medium')
    expect(effectiveQuality('high', true)).toBe('high')
  })

  it('caps DPR per preset', () => {
    expect(maxDprForQuality('low', false)).toBe(1)
    expect(maxDprForQuality('medium', false)).toBe(1.25)
    expect(maxDprForQuality('medium', true)).toBe(1.15)
    expect(maxDprForQuality('high', false, 1)).toBe(1.5)
    expect(maxDprForQuality('high', true, 3)).toBe(2)
    expect(maxDprForQuality('auto', true)).toBe(1.25)
    expect(maxDprForQuality('auto', false)).toBe(1.5)
  })

  it('chooses low-resolution assets only for the low preset', () => {
    expect(assetQualityFor('auto', true)).toBe('low')
    expect(assetQualityFor('auto', false)).toBe('medium')
    expect(assetQualityFor('low', false)).toBe('low')
    expect(assetQualityFor('high', true)).toBe('medium')
  })

  it('validates stored values', () => {
    expect(isSceneQuality('auto')).toBe(true)
    expect(isSceneQuality('high')).toBe(true)
    expect(isSceneQuality('ultra')).toBe(false)
    expect(isSceneQuality(null)).toBe(false)
  })
})
