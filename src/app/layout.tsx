import type { Metadata, Viewport } from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import { dmSans, plusJakartaSans } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'BulletBank — Smart Career Tool',
  description: 'Build your bullet bank, score jobs, prepare for interviews.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BulletBank',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1f4e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BulletBank" />
      </head>
      <body className="bg-[var(--surface)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        {children}
        <CookieBanner />
        <AnalyticsScripts />
      </body>
    </html>
  )
}
