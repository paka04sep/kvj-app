'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, History, Home, User } from 'lucide-react'
import TransactionFabMenu from '@/components/TransactionFabMenu'

const leftItems = [
  { label: 'แดชบอร์ด', href: '/dashboard', icon: Home },
  { label: 'ภาพรวม', href: '/overview', icon: BarChart3 },
]

const rightItems = [
  { label: 'ธุรกรรม', href: '/transactions', icon: History },
  { label: 'โปรไฟล์', href: '/profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/auth') return null

  const renderItem = (item: (typeof leftItems)[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={`bottom-nav-link relative z-[45] flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200 ${
          isActive ? 'active' : ''
        }`}
      >
        <Icon
          size={20}
          className={isActive ? 'nav-pop text-emerald-300 stroke-[3px]' : 'stroke-[2px] opacity-70'}
        />
        <span className={`text-[10px] leading-none ${isActive ? 'font-black' : 'font-semibold'}`}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <nav className="bottom-nav-theme absolute bottom-0 left-0 right-0 z-50 grid w-full grid-cols-5 place-items-center rounded-t-2xl px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl theme-transition">
      {leftItems.map(renderItem)}

      <TransactionFabMenu />

      {rightItems.map(renderItem)}
    </nav>
  )
}
