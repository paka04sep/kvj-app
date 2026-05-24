'use client'

import { useEffect, useState, useRef } from 'react'
import { Palette, Check, ChevronDown } from 'lucide-react'

export type Theme = 'dark' | 'light' | 'forest' | 'latte' | 'ocean' | 'lavender'

interface ThemeConfig {
  id: Theme
  name: string
  emoji: string
  previewColors: string[]
  isDarkVariant: boolean
}

export const themes: ThemeConfig[] = [
  { id: 'dark', name: 'Dark', emoji: '🌌', previewColors: ['#09090b', '#10b981', '#f4f4f5'], isDarkVariant: true },
  { id: 'light', name: 'Light', emoji: '☀️', previewColors: ['#f8fafc', '#059669', '#0f172a'], isDarkVariant: false },
  { id: 'forest', name: 'Forest', emoji: '🌲', previewColors: ['#121915', '#81c784', '#f0f7f4'], isDarkVariant: true },
  { id: 'latte', name: 'Latte', emoji: '☕', previewColors: ['#181310', '#d2b48c', '#fdfaf7'], isDarkVariant: true },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', previewColors: ['#081116', '#38bdf8', '#f0f9ff'], isDarkVariant: true },
  { id: 'lavender', name: 'Lavender', emoji: '🌸', previewColors: ['#110e1a', '#c084fc', '#f5f3ff'], isDarkVariant: true }
]

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem('theme') as Theme
  return themes.some(t => t.id === saved) ? saved : 'dark'
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const html = document.documentElement
  
  // เซ็ต attribute ธีมระบบใหม่
  html.setAttribute('data-theme', theme)
  
  // จัดการ Backward Compatibility คลาส .light แบบดั้งเดิม
  html.classList.toggle('light', theme === 'light')
}

export default function ThemeToggle({ variant = 'button' }: { variant?: 'button' | 'card' }) {
  const [activeTheme, setActiveTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ป้องกันปัญหา Hydration Mismatch ของ Next.js
  useEffect(() => {
    setMounted(true)
    const initialTheme = readTheme()
    setActiveTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  useEffect(() => {
    if (mounted) {
      applyTheme(activeTheme)
    }
  }, [activeTheme, mounted])

  // ฟังก์ชันปิด Dropdown เมื่อกดพื้นที่ด้านนอกคอมโพเนนต์
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync theme-change across multiple components (desktop header vs profile page)
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = readTheme()
      setActiveTheme(currentTheme)
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const handleCycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === activeTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    const nextTheme = themes[nextIndex].id
    handleThemeSelect(nextTheme)
  }

  const handleThemeSelect = (themeId: Theme) => {
    setActiveTheme(themeId)
    localStorage.setItem('theme', themeId)
    setIsOpen(false)
    
    // แจ้งเตือนแอปพลิเคชันเพื่อรีเฟรชองค์ประกอบอื่นๆ (เช่น กราฟวิเคราะห์)
    window.dispatchEvent(new Event('theme-change'))
  }

  // ช่วงกำลังโหลดฝั่งไคลเอนต์ แสดงโครงสร้างสีนิ่งเพื่อไม่ให้กระตุก
  if (!mounted) {
    if (variant === 'card') {
      return (
        <div className="h-16 w-full rounded-2xl border border-zinc-800/60 bg-zinc-950/20 animate-pulse shrink-0" />
      )
    }
    return (
      <div className="h-9 w-28 rounded-xl border border-zinc-800/60 bg-zinc-950/20 animate-pulse shrink-0" />
    )
  }

  const currentThemeInfo = themes.find(t => t.id === activeTheme) || themes[0]

  // === 1. CARD VARIANT (สำหรับหน้ารายโปรไฟล์ กดได้ทั้งการ์ดเลย และเป็นกริดสวยงามเต็มจอ) ===
  if (variant === 'card') {
    return (
      <div className="relative w-full" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full glass-card rounded-2xl p-4.5 border border-zinc-800/80 shadow-md flex items-center justify-between text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-black pl-1">
            <Palette size={15} className="text-emerald-400 shrink-0" />
            <span>เปลี่ยน Theme</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-zinc-400 bg-zinc-950/40 px-3 py-1.5 rounded-xl border border-zinc-850 shadow-inner">
            <span>{currentThemeInfo.emoji} {currentThemeInfo.name}</span>
            <ChevronDown size={12} className="text-zinc-500 shrink-0" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 bottom-full mb-3 w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-slide-up z-[9999] select-none">
            <div className="px-2.5 py-1 text-[9px] font-black tracking-wider text-zinc-500 uppercase border-b border-zinc-900 mb-2">
              เลือกโทนสีถนอมสายตาระดับพรีเมียม 🎨
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => {
                const isActive = theme.id === activeTheme
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`flex items-center justify-between px-3 py-3 rounded-2xl text-xs font-black transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{theme.emoji}</span>
                      <span className="truncate">{theme.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex -space-x-1 shrink-0">
                        {theme.previewColors.map((color, idx) => (
                          <span
                            key={idx}
                            className="w-2.5 h-2.5 rounded-full border border-zinc-950 shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {isActive && <Check size={12} className="text-emerald-400 shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // === 2. BUTTON VARIANT (สำหรับเฮดเดอร์ด้านบน / เดสก์ท็อปเฮดเดอร์ แบบกระชับ) ===
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={handleCycleTheme}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-950/10 p-2 text-zinc-400 shadow-inner transition-all duration-200 hover:scale-105 hover:bg-zinc-950/20 hover:text-zinc-200 active:scale-95 text-xs font-black select-none shrink-0"
        aria-label="สลับธีมหน้าจอ"
      >
        <Palette size={15} className="text-emerald-400 stroke-[2.5px]" />
        <span>{currentThemeInfo.emoji} {currentThemeInfo.name}</span>
      </button>
    </div>
  )
}
