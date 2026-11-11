'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal shell: top layer, inert background, Esc, focus trap and focus restore. */
export function Dialog({
  open,
  onClose,
  ariaLabel,
  panelClassName,
  plain = false,
  children,
}: {
  open: boolean
  onClose: () => void
  ariaLabel: string
  panelClassName: string
  plain?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      }
    }
    dialog.addEventListener('cancel', handleCancel)
    dialog.addEventListener('keydown', handleKeyDown)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      dialog.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 z-30 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-3 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex open:items-end open:justify-center sm:p-6 sm:open:items-center"
    >
      <div
        className={`${
          plain ? 'border border-paper/15 bg-ink text-paper' : 'panel'
        } max-h-[92svh] w-full overflow-y-auto rounded-t-3xl sm:rounded-3xl ${panelClassName}`}
      >
        {children}
      </div>
    </dialog>
  )
}
