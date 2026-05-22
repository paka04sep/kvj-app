'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import DesktopNav from '@/components/DesktopNav'
import ThemeToggle from '@/components/ThemeToggle'

export default function DesktopHeader() {
  const pathname = usePathname()

  if (pathname === '/auth') return null

  return (
    <header className="hidden shrink-0 items-center justify-between gap-6 border-b border-zinc-800/50 bg-zinc-950/20 px-8 py-4 md:flex">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-md">
          <Image src="/icon.svg" alt="KVJ Logo" width={22} height={22} priority />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-black tracking-tight text-white">
            KVJ Family Space
          </h1>
          <span className="block -mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
            Private Family Finance
          </span>
        </div>
      </div>

      <DesktopNav />

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />
        <div className="h-5 w-px bg-zinc-800/60" />
        <span className="select-none text-[10px] font-medium text-zinc-500">
          ครอบครัวของเรา
        </span>
      </div>
    </header>
  )
}
