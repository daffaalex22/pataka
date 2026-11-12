'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  CLICK_SUPPRESSION_PX,
  type DragTracker,
  dragEnd,
  dragMove,
  dragStart,
  updateLookYaw,
  updatePitch,
} from './lookYaw'

/**
 * Horizontal pointer drag rotates the walk camera around the character.
 * Pointer events cover mouse and touch; the joystick is a DOM overlay, and
 * pointer-id tracking keeps its second thumb from corrupting or ending the
 * look drag. A drag past the threshold marks dragStateRef so seat/booth
 * clicks are suppressed for that gesture.
 *
 * PlazaScene sets `touch-action: none` on the Canvas container in walk mode:
 * without it the browser claims the touch as a page pan, sends a couple of
 * pointermoves and then pointercancel.
 */
export function LookDrag({
  yawRef,
  pitchRef,
  dragStateRef,
}: {
  yawRef: React.RefObject<number>
  pitchRef: React.RefObject<number>
  dragStateRef: React.RefObject<{ dragging: boolean }>
}) {
  const gl = useThree((state) => state.gl)
  const tracker = useRef<DragTracker | null>(null)

  useEffect(() => {
    const element = gl.domElement
    const dragState = dragStateRef.current

    const down = (event: PointerEvent) => {
      if (tracker.current) return
      tracker.current = dragStart(event.pointerId, event.clientX, event.clientY, event.pointerType)
    }

    const move = (event: PointerEvent) => {
      if (!tracker.current) return
      const result = dragMove(tracker.current, event.pointerId, event.clientX, event.clientY)
      tracker.current = result.tracker
      if (result.tracker.dragging) {
        yawRef.current = updateLookYaw(yawRef.current, result.yawDeltaPx)
        pitchRef.current = updatePitch(pitchRef.current, result.pitchDeltaPx)
      }
      // A small touch tap may start rotating, but it must still select a seat.
      dragState.dragging = result.tracker.travelled > CLICK_SUPPRESSION_PX
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
      tracker.current = null
      dragState.dragging = false
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [gl, yawRef, pitchRef, dragStateRef])

  return null
}
