'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { DRAG_THRESHOLD_PX, updateLookYaw } from './lookYaw'

/**
 * Horizontal pointer drag rotates the walk camera around the character.
 * Pointer events cover mouse and touch; the joystick is a DOM overlay, so its
 * touches never reach the canvas. A drag past the threshold marks
 * dragStateRef so seat/booth clicks are suppressed for that gesture.
 */
export function LookDrag({
  yawRef,
  dragStateRef,
}: {
  yawRef: React.RefObject<number>
  dragStateRef: React.RefObject<{ dragging: boolean }>
}) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const element = gl.domElement
    let active = false
    let lastX = 0
    let travelled = 0

    const down = (event: PointerEvent) => {
      active = true
      lastX = event.clientX
      travelled = 0
    }

    const move = (event: PointerEvent) => {
      if (!active) return
      const dx = event.clientX - lastX
      lastX = event.clientX
      travelled += Math.abs(dx)
      if (travelled > DRAG_THRESHOLD_PX) dragStateRef.current.dragging = true
      if (dragStateRef.current.dragging) yawRef.current = updateLookYaw(yawRef.current, dx)
    }

    const up = () => {
      active = false
      // R3F fires click on pointerup; clear after that wave has settled.
      window.setTimeout(() => {
        dragStateRef.current.dragging = false
      }, 0)
    }

    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl, yawRef, dragStateRef])

  return null
}
