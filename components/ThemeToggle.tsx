'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    window.dispatchEvent(new Event('theme-change'))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex cursor-pointer items-center justify-center rounded-xl border border-zinc-800/60 bg-zinc-950/10 p-2 text-zinc-400 shadow-inner transition-all duration-200 hover:scale-105 hover:bg-zinc-950/20 hover:text-zinc-200 active:scale-95"
      aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      title={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-amber-400 stroke-[2.5px]" />
      ) : (
        <Moon size={16} className="text-indigo-500 stroke-[2.5px]" />
      )}
    </button>
  )
}
