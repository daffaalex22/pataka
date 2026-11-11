import type { ReactNode } from 'react'

function Icon({ children, className = 'size-4' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M15 10H5M9 6l-4 4 4 4" />
    </Icon>
  )
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 4l6 6-6 6" />
    </Icon>
  )
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M2.5 10S5.5 5.5 10 5.5 17.5 10 17.5 10 14.5 14.5 10 14.5 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.4" />
    </Icon>
  )
}

export function RotateIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M16 10a6 6 0 1 1-1.7-4.3M16 4.5V8h-3.5" />
    </Icon>
  )
}

export function CompassIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M12.6 7.4l-1.5 4.2-4.2 1.5 1.5-4.2 4.2-1.5Z" />
    </Icon>
  )
}

export function XIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 5l10 10M15 5L5 15" />
    </Icon>
  )
}
