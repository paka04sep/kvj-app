'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, History, Home, User } from 'lucide-react'
import DesktopAddButton from '@/components/DesktopAddButton'

const navItems = [
  { label: 'แดชบอร์ด', href: '/dashboard', icon: Home },
  { label: 'ภาพรวม', href: '/overview', icon: BarChart3 },
  { label: 'ธุรกรรม', href: '/transactions', icon: History },
  { label: 'โปรไฟล์', href: '/profile', icon: User },
]

export default function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-zinc-800/60 bg-zinc-950/20 p-1 theme-transition">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`desktop-nav-link flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              isActive
                ? 'active bg-emerald-500/12 text-emerald-300 shadow-inner shadow-emerald-950/20'
                : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
            }`}
          >
            <Icon size={15} className={isActive ? 'nav-pop stroke-[3px]' : 'stroke-[2px] opacity-75'} />
            {item.label}
          </Link>
        )
      })}

      <DesktopAddButton />

      {navItems.slice(2).map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`desktop-nav-link flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              isActive
                ? 'active bg-emerald-500/12 text-emerald-300 shadow-inner shadow-emerald-950/20'
                : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
            }`}
          >
            <Icon size={15} className={isActive ? 'nav-pop stroke-[3px]' : 'stroke-[2px] opacity-75'} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
