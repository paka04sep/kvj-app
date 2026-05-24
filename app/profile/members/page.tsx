'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  ChevronLeft, Users, Shield, User, Clock 
} from 'lucide-react'

interface FamilyMember {
  id: string
  display_name: string
  role: string
  avatar_url: string | null
  last_sign_in_at: string | null
}

export default function FamilyMembersPage() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadMembers() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        // Call our secure custom RPC that fetches family members and their last sign-in timestamp
        const { data, error } = await supabase.rpc('get_family_members_last_active')

        if (error) throw error

        if (data) {
          setMembers(data as FamilyMember[])
        }
      } catch (err: any) {
        console.error('Error loading family members:', err)
        setErrorMsg(err.message || 'ไม่สามารถโหลดรายชื่อสมาชิกในบ้านได้')
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [supabase, router])

  // Custom premium relative active time formatter in Thai
  const formatLastActive = (dateStr?: string | null) => {
    if (!dateStr) return 'ยังไม่เคยเข้าใช้งาน'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      // Absolute difference to avoid timezone logic negative drift
      const diffMins = Math.floor(Math.abs(diffMs) / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'ใช้งานอยู่ตอนนี้ 🟢'
      if (diffMins < 60) return `ใช้งานเมื่อ ${diffMins} นาทีที่แล้ว`
      if (diffHours < 24) return `ใช้งานเมื่อ ${diffHours} ชั่วโมงที่แล้ว`
      if (diffDays === 1) return 'ใช้งานเมื่อวานนี้'
      if (diffDays < 7) return `ใช้งานเมื่อ ${diffDays} วันที่แล้ว`
      
      return 'เมื่อ ' + date.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.'
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังติดต่อฐานข้อมูลสมาชิกครอบครัว...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in theme-transition min-h-screen pb-16">
      
      {/* Header back bar */}
      <div className="flex items-center gap-3 mb-6 select-none">
        <button
          onClick={() => router.push('/profile')}
          className="w-10 h-10 rounded-2xl bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          <ChevronLeft size={20} className="stroke-[2.5px]" />
        </button>
        <div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase block">
            สมาชิกและโครงสร้างบ้าน
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
            ดูสมาชิกครอบครัวในระบบ 👥
          </h2>
        </div>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed mb-6 pl-1 max-w-xl">
        รายชื่อบัญชีสมาชิกทั้งหมดในบ้านของคุณที่ลงทะเบียนไว้ พร้อมวันเวลาเข้าใช้งานแอปพลิเคชันล่าสุดในแต่ละบัญชี
      </p>

      {errorMsg && (
        <div className="mb-6 p-4.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shadow-lg select-none">
          <Clock size={16} />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Members Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => {
          const isActiveNow = formatLastActive(member.last_sign_in_at).includes('🟢')

          return (
            <div 
              key={member.id}
              className="glass-panel rounded-3xl p-5 border border-zinc-800/80 shadow-md flex items-center gap-4 transition-all duration-200 hover:border-zinc-700/60"
            >
              {/* Member Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-850 shadow-inner shrink-0 relative select-none">
                {member.avatar_url && (member.avatar_url.startsWith('data:') || member.avatar_url.startsWith('http')) ? (
                  <img 
                    src={member.avatar_url} 
                    alt={member.display_name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-emerald-400 text-2xl font-black">
                    {member.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Active Indicator green dot */}
                {isActiveNow && (
                  <span className="absolute bottom-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              {/* Member Details */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-[var(--text-main)] truncate">
                    {member.display_name}
                  </h4>
                  {/* Role Badge */}
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                    member.role === 'admin'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                  }`}>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
                
                {/* Last active wording */}
                <div className="flex items-center gap-1.5 text-zinc-550 text-[10px] font-bold mt-2.5">
                  <Clock size={11} className="text-zinc-600 shrink-0" />
                  <span className={isActiveNow ? 'text-emerald-400 font-extrabold' : 'text-zinc-500'}>
                    {formatLastActive(member.last_sign_in_at)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
