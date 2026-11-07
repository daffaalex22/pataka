import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { LangProvider } from '@/lib/i18n'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pataka — 3D Event Ticketing',
  description:
    'Pilih kursi konser langsung dari venue 3D, lihat pemandangan panggung dari kursimu, dan terima e-ticket dengan QR code.',
}

export const viewport: Viewport = {
  themeColor: '#07060d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  )
}
