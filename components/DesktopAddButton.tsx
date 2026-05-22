'use client'

import { Plus } from 'lucide-react'

export default function DesktopAddButton() {
  const handleOpen = () => {
    window.dispatchEvent(
      new CustomEvent('open-transaction-modal', { detail: { type: 'expense' } })
    )
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="mx-1 flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(52,211,153,0.16),rgba(20,184,166,0.08))] px-4 py-2 text-xs font-black text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(16,185,129,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/55 hover:text-emerald-100 hover:shadow-[0_10px_28px_rgba(16,185,129,0.16)] active:translate-y-0 active:scale-95"
      aria-label="เพิ่มรายการใหม่"
      title="เพิ่มรายการใหม่"
    >
      <Plus size={15} className="stroke-[2.8px]" />
      เพิ่มรายการ
    </button>
  )
}
