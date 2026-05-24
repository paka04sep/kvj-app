'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  ChevronLeft, CheckCircle2, AlertCircle 
} from 'lucide-react'

interface NotificationSettings {
  transaction_created: boolean
  transaction_updated: boolean
  transaction_deleted: boolean
  settlement_created: boolean
  obligation_created: boolean
  obligation_paid: boolean
  savings_goal_updated: boolean
}

const SETTING_LABELS: Record<keyof NotificationSettings, { title: string, desc: string }> = {
  transaction_created: {
    title: 'บันทึกรายการเงินใหม่ 💸',
    desc: 'แจ้งเตือนเมื่อสมาชิกในบ้านบันทึกรายรับหรือรายจ่ายใหม่'
  },
  transaction_updated: {
    title: 'แก้ไขข้อมูลการเงิน ✏ี่',
    desc: 'แจ้งเตือนเมื่อมีการแก้ไขยอดเงิน รายละเอียด หรือคำอธิบายทรานแซกชัน'
  },
  transaction_deleted: {
    title: 'ลบรายการธุรกรรมออก 🗑️',
    desc: 'แจ้งเตือนเมื่อมีการลบรายการเงินใดๆ ออกจากบัญชีส่วนกลาง'
  },
  settlement_created: {
    title: 'คืนเงินและหักล้างหนี้สิน 🤝',
    desc: 'แจ้งเตือนเมื่อมีการทำรายการโอนเงินคืนเพื่อเคลียร์ยอดหนี้ระหว่างสมาชิก'
  },
  obligation_created: {
    title: 'เพิ่มบิลค่าใช้จ่ายประจำเดือน 📌',
    desc: 'แจ้งเตือนเมื่อมีรายการบิลประจำเดือนใหม่ (เช่น ค่าไฟฟ้า ค่าน้ำ) เรียกเก็บเข้ามา'
  },
  obligation_paid: {
    title: 'ชำระบิลค่าใช้จ่ายสำเร็จ 🎉',
    desc: 'แจ้งเตือนเมื่อมีคนในบ้านกดบันทึกจ่ายบิลค่าใช้จ่ายนั้นเรียบร้อยแล้ว'
  },
  savings_goal_updated: {
    title: 'ปรับเป้าหมายการออมประจำเดือน 🎯',
    desc: 'แจ้งเตือนเมื่อหัวหน้าครอบครัวมีการปรับแก้เป้าหมายยอดการเก็บเงินออมของบ้าน'
  }
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data && data.notification_settings) {
          setSettings(data.notification_settings as NotificationSettings)
        } else {
          setSettings({
            transaction_created: true,
            transaction_updated: true,
            transaction_deleted: true,
            settlement_created: true,
            obligation_created: true,
            obligation_paid: true,
            savings_goal_updated: true
          })
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setErrorMsg('ไม่สามารถโหลดข้อมูลการแจ้งเตือนได้')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [supabase, router])

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!settings) return

    const updatedSettings = {
      ...settings,
      [key]: !settings[key]
    }
    setSettings(updatedSettings)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: updatedSettings })
        .eq('id', user.id)

      if (error) throw error

      setSuccessMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว!')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      setTimeout(() => setErrorMsg(null), 2000)
      setSettings(settings)
    }
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs">กำลังโหลดการตั้งค่า...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in theme-transition min-h-screen pb-16">
      
      {/* iOS Header back bar */}
      <div className="flex items-center gap-3 mb-6 select-none">
        <button
          onClick={() => router.push('/profile')}
          className="w-9 h-9 rounded-full bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-850/80 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={18} className="stroke-[2.5px]" />
        </button>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">
            ตั้งค่าการแจ้งเตือน
          </h2>
        </div>
      </div>

      {/* Action Status Panel */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[11px] flex items-center gap-2 animate-slide-up select-none">
          <CheckCircle2 size={13} />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/15 text-rose-400 text-[11px] flex items-center gap-2 animate-slide-up select-none">
          <AlertCircle size={13} />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* iOS Styled Flat Group Container */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden shadow-inner divide-y divide-zinc-900">
        {settings && (Object.keys(SETTING_LABELS) as Array<keyof NotificationSettings>).map((key) => {
          const info = SETTING_LABELS[key]
          const isEnabled = settings[key]

          return (
            <div 
              key={key}
              className="px-4.5 py-3.5 flex items-center justify-between gap-5 hover:bg-zinc-900/10 transition-colors"
            >
              {/* iOS Text label */}
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-extrabold text-[var(--text-main)]">
                  {info.title}
                </h4>
                <p className="text-[10px] text-zinc-550 leading-relaxed mt-0.5 pl-0.5">
                  {info.desc}
                </p>
              </div>

              {/* iOS Slider switch toggle */}
              <button
                type="button"
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
                role="switch"
                aria-checked={isEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

    </div>
  )
}
