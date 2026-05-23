'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  Plus,
  ReceiptText,
  ScanLine,
} from 'lucide-react'

type TransactionType = 'income' | 'expense'

type TransactionFabMenuProps = {
  variant?: 'mobile' | 'desktop'
}

type MenuStatus = 'closed' | 'open' | 'closing'

type DesktopActionProps = {
  label: string
  caption: string
  icon: typeof ArrowDownLeft
  className: string
  disabled?: boolean
  onClick: () => void
}

const openTransactionModal = (type: TransactionType) => {
  window.dispatchEvent(
    new CustomEvent('open-transaction-modal', { detail: { type } })
  )
}

const openScanSlipModal = () => {
  window.dispatchEvent(
    new CustomEvent('open-scan-slip-modal')
  )
}

export default function TransactionFabMenu({ variant = 'mobile' }: TransactionFabMenuProps) {
  const [menuStatus, setMenuStatus] = useState<MenuStatus>('closed')
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDesktop = variant === 'desktop'
  const isOpen = menuStatus === 'open'
  const isClosing = menuStatus === 'closing'
  const isMenuVisible = menuStatus !== 'closed'

  const openMenu = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setMenuStatus('open')
  }, [])

  const closeMenu = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    setMenuStatus('closing')
    closeTimeoutRef.current = setTimeout(() => {
      setMenuStatus('closed')
      closeTimeoutRef.current = null
    }, 220)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [closeMenu, isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const handleSelect = (type: TransactionType) => {
    closeMenu()
    openTransactionModal(type)
  }

  const handleSelectScan = () => {
    closeMenu()
    openScanSlipModal()
  }

  if (isDesktop) {
    return (
      <div ref={menuRef} className="relative mx-1">
        {isOpen && (
          <div className="absolute left-1/2 top-11 z-50 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl animate-slide-up">
            <DesktopAction
              label="รายจ่าย"
              caption="เพิ่มรายการเงินออก"
              icon={ArrowDownLeft}
              className="text-rose-300 hover:bg-rose-500/12"
              onClick={() => handleSelect('expense')}
            />
            <DesktopAction
              label="Scan Slip"
              caption="สแกนสลิปด้วย AI"
              icon={ScanLine}
              className="text-cyan-200 hover:bg-cyan-500/12"
              onClick={handleSelectScan}
            />
            <DesktopAction
              label="รายรับ"
              caption="เพิ่มรายการเงินเข้า"
              icon={ArrowUpRight}
              className="text-emerald-300 hover:bg-emerald-500/12"
              onClick={() => handleSelect('income')}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          className="relative z-50 flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(20,184,166,0.08))] px-4 py-2 text-xs font-black text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(16,185,129,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/55 hover:text-emerald-100 hover:shadow-[0_10px_28px_rgba(16,185,129,0.16)] active:translate-y-0 active:scale-95"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="เพิ่มรายการใหม่"
          title="เพิ่มรายการใหม่"
        >
          <ReceiptText size={15} className="stroke-[2.8px]" />
          เพิ่มรายการ
          <Plus
            size={15}
            className={`stroke-[3px] drop-shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
          />
        </button>
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative -mt-6 flex h-14 w-14 shrink-0 items-center justify-center">
      {isMenuVisible && (
        <>
          <button
            type="button"
            aria-label="ปิดเมนูเพิ่มรายการ"
            onClick={closeMenu}
            className={`fab-backdrop fixed inset-0 z-40 backdrop-blur-[10px] ${
              isClosing
                ? 'pointer-events-none bg-black/0 [animation:quick-backdrop-out_220ms_ease-out_forwards]'
                : 'bg-black/60 [animation:quick-backdrop-in_220ms_ease-out_forwards]'
            }`}
          />

          <div
            role="menu"
            aria-label="เมนูเพิ่มรายการ"
            className={`fixed z-[60] h-[9.7rem] w-60 ${
              isClosing
                ? 'pointer-events-none [animation:quick-menu-out_220ms_cubic-bezier(0.4,0,1,1)_forwards]'
                : 'pointer-events-auto [animation:quick-menu-in_300ms_cubic-bezier(0.16,1,0.3,1)_forwards]'
            }`}
            style={{
              left: '50%',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
              opacity: 0,
            }}
          >
        
            <MobileAction
              label="รายจ่าย"
              icon={ArrowUp}
              tone="expense"
              className="left-[0.9rem] top-[6.5rem]"
              style={{ animationDelay: '40ms' }}
              onClick={() => handleSelect('expense')}
            /> 

            <MobileAction
              label="Scan Slip"
              icon={ScanLine}
              tone="slip"
              className="left-1/2 top-[5.2rem] -translate-x-1/2"
              style={{ animationDelay: '0ms' }}
              onClick={handleSelectScan}
            />

            <MobileAction
              label="รายรับ"
              icon={ArrowDown}
              tone="income"
              className="right-[0.9rem] top-[6.5rem]"
              style={{ animationDelay: '80ms' }}
              onClick={() => handleSelect('income')}
            />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        className="relative z-[70] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-emerald-100/55 bg-[linear-gradient(135deg,#72f7dc_0%,#19cda5_44%,#0fb98f_100%)] text-zinc-950 shadow-[0_0_0_2px_rgba(255,255,255,0.08),0_12px_26px_rgba(0,0,0,0.28),inset_0_2px_0_rgba(255,255,255,0.54)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="เพิ่มรายการใหม่"
        title="เพิ่มรายการใหม่"
      >
        <Plus
          size={30}
          className={`stroke-[3.1px] drop-shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
        />
      </button>
    </div>
  )
}

type MobileActionProps = {
  label: string
  icon: typeof ArrowUp
  tone: 'expense' | 'income' | 'slip'
  className: string
  disabled?: boolean
  style?: CSSProperties
  onClick: () => void
}

function MobileAction({
  label,
  icon: Icon,
  tone,
  className,
  disabled = false,
  style,
  onClick,
}: MobileActionProps) {
  const toneClass = {
    expense: 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.6)]',
    income: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    slip: 'text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]',
  }[tone]

  const buttonClass = {
    expense: 'bg-zinc-900/90 border-rose-400/40 shadow-[0_0_18px_rgba(251,113,133,0.25),0_0_0_1px_rgba(251,113,133,0.18)_inset,0_8px_20px_rgba(0,0,0,0.4)]',
    income: 'bg-zinc-900/90 border-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.25),0_0_0_1px_rgba(52,211,153,0.18)_inset,0_8px_20px_rgba(0,0,0,0.4)]',
    slip: 'bg-zinc-900/90 border-cyan-300/35 shadow-[0_0_18px_rgba(103,232,249,0.2),0_0_0_1px_rgba(103,232,249,0.15)_inset,0_8px_20px_rgba(0,0,0,0.4)]',
  }[tone]

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={onClick}
      style={style}
      className={`fab-action absolute flex w-[4.5rem] flex-col items-center gap-1.5 text-center opacity-0 [animation:quick-action-in_320ms_cubic-bezier(0.16,1,0.3,1)_forwards] ${className} ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      data-tone={tone}
    >
      <span
        className={`fab-action-circle flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border-[1.5px] ${buttonClass}`}
      >
        <Icon size={22} className={`fab-action-icon stroke-[2.75px] ${toneClass}`} />
      </span>
      <span className="fab-action-label text-[11.5px] font-black leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
        {label}
      </span>
    </button>
  )
}

function DesktopAction({
  label,
  caption,
  icon: Icon,
  className,
  disabled = false,
  onClick,
}: DesktopActionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon size={16} className="stroke-[2.6px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black leading-tight">{label}</span>
        <span className="block text-[10px] font-semibold leading-tight text-zinc-500">{caption}</span>
      </span>
    </button>
  )
}
