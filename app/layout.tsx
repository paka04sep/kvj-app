import type { Metadata, Viewport } from 'next'
import { Prompt } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import DesktopHeader from '@/components/DesktopHeader'
import QuickTransactionModal from '@/components/QuickTransactionModal'
import ScanSlipModal from '@/components/ScanSlipModal'
import { NotificationProvider } from '@/components/NotificationContext'
import SplashScreen from '@/components/SplashScreen'
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
    <html lang="th" className={`${prompt.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="apple-touch-startup-image" href="/icon.svg" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #kvj-static-splash {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
                z-index: 999999;
                background-color: #09090b;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: sans-serif;
                transition: opacity 0.4s ease-in-out;
                pointer-events: none;
                user-select: none;
                opacity: 1;
              }
              #kvj-static-splash.splash-fade {
                opacity: 0 !important;
              }
              .splash-hidden #kvj-static-splash {
                display: none !important;
              }
              #kvj-static-splash-blur {
                position: absolute;
                width: 288px;
                height: 288px;
                border-radius: 9999px;
                background-color: rgba(16,185,129,0.06);
                filter: blur(60px);
                pointer-events: none;
              }
              #kvj-static-splash-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                z-index: 10;
              }
              #kvj-static-splash-img {
                width: 120px;
                height: 120px;
                object-fit: contain;
                aspect-ratio: 1 / 1;
                flex-shrink: 0;
                filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                  
                  // Instantly hide splash before paint if already shown in session
                  var isSplashShown = sessionStorage.getItem('kvj_splash_shown');
                  if (isSplashShown) {
                    document.documentElement.classList.add('splash-hidden');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="theme-transition flex h-screen h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[var(--color-bg-app)] font-sans text-[var(--color-text-primary)] selection:bg-emerald-500/20 selection:text-emerald-400">
        <NotificationProvider>
          <SplashScreen />
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
        </NotificationProvider>

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
