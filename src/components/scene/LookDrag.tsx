'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type DragTracker, dragEnd, dragMove, dragStart, updateLookYaw } from './lookYaw'

/**
 * Horizontal pointer drag rotates the walk camera around the character.
 * Pointer events cover mouse and touch; the joystick is a DOM overlay, and
 * pointer-id tracking keeps its second thumb from corrupting or ending the
 * look drag. A drag past the threshold marks dragStateRef so seat/booth
 * clicks are suppressed for that gesture.
 */
export function LookDrag({
  yawRef,
  dragStateRef,
}: {
  yawRef: React.RefObject<number>
  dragStateRef: React.RefObject<{ dragging: boolean }>
}) {
  const gl = useThree((state) => state.gl)
  const tracker = useRef<DragTracker | null>(null)

  useEffect(() => {
    const element = gl.domElement

    const down = (event: PointerEvent) => {
      if (tracker.current) return
      tracker.current = dragStart(event.pointerId, event.clientX, event.clientY)
    }

    const move = (event: PointerEvent) => {
      if (!tracker.current) return
      const result = dragMove(tracker.current, event.pointerId, event.clientX, event.clientY)
      tracker.current = result.tracker
      if (result.tracker.dragging) {
        dragStateRef.current.dragging = true
        yawRef.current = updateLookYaw(yawRef.current, result.yawDeltaPx)
      }
    }

    const end = (event: PointerEvent) => {
      if (!tracker.current) return
      const result = dragEnd(tracker.current, event.pointerId)
      if (result.tracker.pointerId !== null) return
      tracker.current = null
      if (result.suppressClick) {
        // R3F fires click on pointerup; clear after that wave has settled.
        window.setTimeout(() => {
          dragStateRef.current.dragging = false
        }, 0)
      }
    }

    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [gl, yawRef, dragStateRef])

  return null
}
