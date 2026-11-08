'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight = '700') {
  let current = size
  ctx.font = `${weight} ${current}px system-ui, sans-serif`
  while (current > 16 && ctx.measureText(text).width > maxWidth) {
    current -= 2
    ctx.font = `${weight} ${current}px system-ui, sans-serif`
  }
  return current
}

/** Gold-on-black lit signage panel used across the venue. */
export function drawSignage(text: string, sub?: string): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#0b0912'
  ctx.fillRect(0, 0, 1024, 256)
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.72)'
  ctx.lineWidth = 6
  ctx.strokeRect(6, 6, 1012, 244)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#f5c542'
  fitFont(ctx, text, 900, sub ? 76 : 96)
  ctx.fillText(text, 512, sub ? 104 : 136)

  if (sub) {
    ctx.fillStyle = 'rgba(245, 197, 66, 0.66)'
    fitFont(ctx, sub, 820, 34, '500')
    ctx.fillText(sub, 512, 186)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Memoised signage texture with cleanup. */
export function useSignage(text: string, sub?: string) {
  const texture = useMemo(() => drawSignage(text, sub), [text, sub])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}
