export type SceneQuality = 'auto' | 'low' | 'medium' | 'high'
export type EffectiveQuality = 'low' | 'medium' | 'high'

export const SCENE_QUALITY_STORAGE_KEY = 'pataka.scene-quality'
export const SCENE_QUALITY_OPTIONS: SceneQuality[] = ['auto', 'low', 'medium', 'high']

export const SCENE_PRESETS: Record<
  EffectiveQuality,
  {
    envIntensity: number
    ambient: number
    hemisphere: number
    directional: number
    stageWash: number
    balconyPractical: number
  }
> = {
  low: {
    envIntensity: 0.08,
    ambient: 0.12,
    hemisphere: 0.22,
    directional: 0.5,
    stageWash: 32,
    balconyPractical: 0,
  },
  medium: {
    envIntensity: 0.14,
    ambient: 0.16,
    hemisphere: 0.28,
    directional: 0.65,
    stageWash: 55,
    balconyPractical: 18,
  },
  high: {
    envIntensity: 0.2,
    ambient: 0.18,
    hemisphere: 0.32,
    directional: 0.75,
    stageWash: 65,
    balconyPractical: 22,
  },
}

export function isSceneQuality(value: string | null | undefined): value is SceneQuality {
  return value === 'auto' || value === 'low' || value === 'medium' || value === 'high'
}

export function readSceneQuality(): SceneQuality {
  if (typeof window === 'undefined') return 'auto'
  try {
    const stored = window.localStorage.getItem(SCENE_QUALITY_STORAGE_KEY)
    return isSceneQuality(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

export function writeSceneQuality(quality: SceneQuality): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCENE_QUALITY_STORAGE_KEY, quality)
  } catch {
    // Storage can be unavailable in private browsing; the in-memory state still works.
  }
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export function effectiveQuality(quality: SceneQuality, mobile: boolean): EffectiveQuality {
  if (quality === 'auto') return mobile ? 'low' : 'medium'
  return quality
}

export function maxDprForQuality(
  quality: SceneQuality,
  mobile: boolean,
  devicePixelRatio = 1,
): number {
  switch (quality) {
    case 'low':
      return 1
    case 'medium':
      return mobile ? 1.15 : 1.25
    case 'high':
      return Math.min(2, Math.max(1.5, devicePixelRatio || 1))
    default:
      return mobile ? 1.25 : 1.5
  }
}

/** Asset resolution is chosen once per mount; changing presets must not rebuild the venue. */
export function assetQualityFor(quality: SceneQuality, mobile: boolean): 'low' | 'medium' {
  return effectiveQuality(quality, mobile) === 'low' ? 'low' : 'medium'
}
