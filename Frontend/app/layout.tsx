import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'QNL Command Centre',
  description: 'The operating workspace for Quantum Nest Lab — clients, projects, work, files, and finance.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/qnl-favicon-light.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/qnl-favicon-dark.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/qnl-favicon-light.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
