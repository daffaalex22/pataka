'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  isSceneQuality,
  readSceneQuality,
  SCENE_QUALITY_STORAGE_KEY,
  writeSceneQuality,
  type SceneQuality,
} from '@/lib/sceneQuality'

/** Reads the saved render preset synchronously on the client, then persists changes. */
export function useSceneQuality(): [SceneQuality, (quality: SceneQuality) => void] {
  const [quality, setQuality] = useState<SceneQuality>(() => readSceneQuality())

  const update = useCallback((next: SceneQuality) => {
    setQuality(next)
    writeSceneQuality(next)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SCENE_QUALITY_STORAGE_KEY) return
      if (isSceneQuality(event.newValue)) setQuality(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [quality, update]
}
