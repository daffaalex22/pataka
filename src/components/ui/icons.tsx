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

export function WalkIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11.5" cy="4.4" r="1.6" />
      <path d="M11.5 6v4.2M11.5 10.2l2.6 2.4 1 3.4M11.5 10.2l-2.4 2.6-.8 3M11.5 7.4 8.9 9M11.5 7.4l2.6 1.4" />
    </Icon>
  )
}

export function MapIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3.5 5.5 8 4l4 1.5L16.5 4v10.5L12 16l-4-1.5-4.5 1.5z" />
      <path d="M8 4v10.5M12 5.5V16" />
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

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 10.5l4 4L16 6" />
    </Icon>
  )
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4.5" width="14" height="12" rx="1.25" />
      <path d="M3 8.25h14M6.75 3v3M13.25 3v3" />
      <path d="M6.5 11.25h2M11.5 11.25h2M6.5 13.75h2" />
    </Icon>
  )
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8.3 11.7a3.1 3.1 0 0 0 4.4 0l2.5-2.5a3.1 3.1 0 0 0-4.4-4.4l-1.3 1.3" />
      <path d="M11.7 8.3a3.1 3.1 0 0 0-4.4 0l-2.5 2.5a3.1 3.1 0 0 0 4.4 4.4l1.3-1.3" />
    </Icon>
  )
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="2.75" y="4.5" width="14.5" height="11" rx="1.25" />
      <path d="M3.4 5.4 10 10.6l6.6-5.2" />
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
