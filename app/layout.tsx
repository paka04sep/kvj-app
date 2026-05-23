import type { Metadata, Viewport } from 'next'
import { Prompt } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import DesktopHeader from '@/components/DesktopHeader'
import QuickTransactionModal from '@/components/QuickTransactionModal'
import ScanSlipModal from '@/components/ScanSlipModal'
import './globals.css'

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-prompt',
})

export const metadata: Metadata = {
  title: 'KVJ Family App',
  description: 'Private financial dashboard for the KVJ family',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KVJ Family',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`${prompt.variable} h-full antialiased`}>
      <body className="theme-transition flex h-screen h-[100dvh] flex-col items-center justify-center overflow-hidden bg-zinc-950 font-sans text-zinc-50 selection:bg-emerald-500/20 selection:text-emerald-400">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--bg-glow-stops))] transition-all duration-350" />

        <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-x border-zinc-800/50 bg-zinc-900/40 pb-20 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 md:h-screen md:w-screen md:max-w-none md:border-none md:pb-0 md:shadow-none">
          <DesktopHeader />

          <main className="flex h-full w-full flex-1 flex-col overflow-y-auto p-4 sm:p-5 md:p-8">
            {children}
          </main>

          <div className="md:hidden">
            <BottomNav />
          </div>
        </div>

        <QuickTransactionModal />
        <ScanSlipModal />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
