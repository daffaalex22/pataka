'use client'

/* eslint-disable react-hooks/immutability -- imperative Three.js canvas ownership */

import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import {
  createSawargaEnvironment,
  type SawargaEnvironment as Environment,
} from '@/lib/sawarga/environment'

/**
 * Builds the Sawarga shell once per renderer and hangs it in the ticketing
 * scene. The ticketing app keeps its own lights, stage, board, booth, seats,
 * camera, collision and booking UI.
 */
export function SawargaEnvironment({ quality = 'medium' }: { quality?: 'low' | 'medium' | 'high' }) {
  const gl = useThree((state) => state.gl)
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const environmentRef = useRef<Environment | null>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = gl.domElement
    const previousOpacity = canvas.style.opacity
    const previousTransition = canvas.style.transition
    canvas.style.transition = 'opacity 500ms ease'
    canvas.style.opacity = '0'
    delete canvas.dataset.sawargaReady

    createSawargaEnvironment({ renderer: gl, quality })
      .then((next) => {
        if (cancelled) {
          next.dispose()
          return
        }
        environmentRef.current = next
        setEnvironment(next)
        canvas.style.opacity = '1'
        canvas.dataset.sawargaReady = '1'
      })
      .catch((error) => {
        console.error('Sawarga environment failed to build', error)
        if (!cancelled) canvas.style.opacity = previousOpacity || '1'
      })

    return () => {
      cancelled = true
      canvas.style.opacity = previousOpacity
      canvas.style.transition = previousTransition
      delete canvas.dataset.sawargaReady
      const current = environmentRef.current
      environmentRef.current = null
      setEnvironment(null)
      current?.dispose()
    }
  }, [gl, quality])

  if (!environment) return null
  return <primitive object={environment.group as THREE.Group} dispose={null} />
}
