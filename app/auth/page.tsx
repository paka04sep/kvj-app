'use client'
// testdev
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function AuthPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const virtualEmail = `${username.trim().toLowerCase()}@kvj.com`

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      })

      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
            : error.message
        )
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center py-6 animate-fade-in sm:py-12">
      <div className="mb-8 flex w-full flex-col items-center text-center">
        <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <Image src="/icon.svg" alt="KVJ Logo" fill className="p-3" priority />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          KVJ Family Space
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">
          พื้นที่ส่วนตัวสำหรับบันทึกและดูแลการเงินของครอบครัว
        </p>
      </div>

      <div className="glass-panel relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800/80 p-6 shadow-2xl sm:p-8">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        <div className="mb-6">
          <h2 className="text-center text-lg font-semibold text-zinc-100">เข้าสู่ระบบ</h2>
          <p className="mt-1 text-center text-xs text-zinc-500">
            ใช้บัญชีสมาชิกในบ้านของคุณ
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 animate-slide-up">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="block pl-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                required
                placeholder="เช่น Dad, Mom"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input w-full rounded-xl py-3.5 pl-11 pr-4 text-sm text-white"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block pl-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full rounded-xl py-3.5 pl-11 pr-12 text-sm text-white"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-zinc-800/60 pt-6 text-center">
          <p className="text-xs leading-5 text-zinc-500">
            ระบบส่วนตัวสำหรับสมาชิกในบ้านเท่านั้น
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-emerald-500/80">
            ช่วยกันบันทึกทุกวัน เพื่อเป้าหมายการเงินของบ้านเรา
          </p>
        </div>
      </div>
    </div>
  )
}
