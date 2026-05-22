'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, History, Home, Plus, User } from 'lucide-react'

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

  const handleOpenModal = () => {
    window.dispatchEvent(
      new CustomEvent('open-transaction-modal', { detail: { type: 'expense' } })
    )
  }

  const renderItem = (item: (typeof leftItems)[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={`bottom-nav-link flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200 ${
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
    <nav className="bottom-nav-theme absolute bottom-0 left-0 right-0 z-50 flex w-full items-center justify-around rounded-t-2xl px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl theme-transition">
      {leftItems.map(renderItem)}

      <button
        type="button"
        onClick={handleOpenModal}
        className="-mt-6 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-emerald-200/50 bg-[linear-gradient(135deg,#34d399_0%,#10b981_48%,#14b8a6_100%)] text-zinc-950 shadow-[0_12px_30px_rgba(16,185,129,0.42),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:rotate-3 hover:scale-105 active:translate-y-0 active:rotate-0 active:scale-95"
        aria-label="เพิ่มรายการใหม่"
        title="เพิ่มรายการใหม่"
      >
        <Plus size={27} className="stroke-[3px] drop-shadow-sm" />
      </button>

      {rightItems.map(renderItem)}
    </nav>
  )
}
