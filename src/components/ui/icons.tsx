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

export function WalletIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="2.75" y="5.25" width="14.5" height="10.5" rx="1.5" />
      <path d="M2.75 8.25h14.5" />
      <circle cx="13.5" cy="11.75" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function BankIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 7.75 10 3.5l7 4.25" />
      <path d="M4.75 8.5v6M8.25 8.5v6M11.75 8.5v6M15.25 8.5v6" />
      <path d="M3 16h14" />
    </Icon>
  )
}

export function QrIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="5" height="5" rx="0.75" />
      <rect x="12" y="3" width="5" height="5" rx="0.75" />
      <rect x="3" y="12" width="5" height="5" rx="0.75" />
      <path d="M12 12h2v2h-2zM16.25 12H17M12 16.25V17M15.5 15.5h1.5V17h-1.5z" />
    </Icon>
  )
}
