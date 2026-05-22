'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Send, RefreshCw, CheckCircle, AlertCircle, ArrowRight, 
  Trash2, User, HelpCircle, FileText
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface Profile {
  id: string
  display_name: string
  role: string
}

interface Transfer {
  id: string
  payer_id: string
  receiver_id: string
  amount: number
  settlement_date: string
  description: string | null
  created_at: string
}

export default function SettlementsPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Direct P2P transfer form states
  const [settlePayer, setSettlePayer] = useState('')
  const [settleReceiver, setSettleReceiver] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [settleDescription, setSettleDescription] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setSettlePayer(user.id)
      }

      // 2. Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, role')
      
      if (profilesData) {
        setProfiles(profilesData)
      }

      // 3. Fetch recent transfers (settlements table)
      const { data: transfersData } = await supabase
        .from('settlements')
        .select('*')
        .order('settlement_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (transfersData) {
        setTransfers(transfersData)
      }
      
    } catch (err) {
      console.error('Error fetching transfers data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Resolve profile names
  const getDisplayName = (id: string) => {
    const profile = profiles.find(p => p.id === id)
    return profile?.display_name || 'สมาชิกในบ้าน'
  }

  // Handle Quick Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const numAmount = parseFloat(settleAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('กรุณากรอกจำนวนเงินให้ถูกต้อง')
      setSubmitting(false)
      return
    }

    if (settlePayer === settleReceiver) {
      setErrorMsg('กรุณาเลือกผู้รับโอนให้ถูกต้อง (ไม่สามารถโอนให้ตัวเองได้)')
      setSubmitting(false)
      return
    }

    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', settlePayer)
        .single()

      const familyId = userProfile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'
      const todayString = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('settlements')
        .insert({
          payer_id: settlePayer,
          receiver_id: settleReceiver,
          amount: numAmount,
          settlement_date: todayString,
          description: settleDescription.trim() || null,
          family_id: familyId
        })

      if (error) throw error

      setSuccessMsg('บันทึกประวัติการโอนเงินสำเร็จแล้ว! 🎉')
      setSettleAmount('')
      setSettleDescription('')
      
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 }
      })
      
      setRefreshing(true)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโอนเงิน')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Transfer item
  const handleDeleteTransfer = async (id: string) => {
    if (!confirm('คุณต้องการลบประวัติการโอนเงินรายการนี้ใช่หรือไม่?')) return

    try {
      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setTransfers(transfers.filter(t => t.id !== id))
    } catch (err: any) {
      alert('ไม่สามารถลบรายการได้: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังโหลดข้อมูลประวัติการโอนเงินครอบครัว...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pb-8 animate-fade-in theme-transition">
      {/* Title */}
      <div className="mb-5 flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase block">
            จัดการระบบการเงินครอบครัว
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            โอนเงินในบ้าน (P2P Money Transfers) 🤝
          </h2>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData(); }}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all text-zinc-400 cursor-pointer"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* RESPONSIVE LAYOUT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Record Transfer Form (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Transfer Form Card */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-800/80">
            <h3 className="text-xs font-extrabold text-zinc-300 tracking-wider uppercase mb-4 flex items-center gap-2">
              <Send size={14} className="text-emerald-400" />
              บันทึกการโอนเงินให้คนในบ้าน
            </h3>

            {successMsg && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-slide-up">
                <CheckCircle size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2 animate-slide-up">
                <AlertCircle size={18} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              
              {/* Senders and Receivers Selector */}
              <div className="grid grid-cols-2 gap-3">
                {/* Payer selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block pl-0.5">ผู้โอนเงิน</label>
                  <select
                    value={settlePayer}
                    onChange={(e) => setSettlePayer(e.target.value)}
                    className="w-full px-3 py-3 glass-input text-xs focus:bg-zinc-950 focus:outline-none"
                    disabled={submitting}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.display_name}</option>
                    ))}
                  </select>
                </div>

                {/* Receiver selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block pl-0.5">ผู้รับโอน</label>
                  <select
                    value={settleReceiver}
                    onChange={(e) => setSettleReceiver(e.target.value)}
                    className="w-full px-3 py-3 glass-input text-xs focus:bg-zinc-950 focus:outline-none"
                    disabled={submitting}
                  >
                    <option value="">เลือกผู้รับ</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block pl-0.5">จำนวนเงินโอน (บาท)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">฿</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 glass-input text-sm text-white"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Note / Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block pl-0.5 flex items-center gap-1.5">
                  <FileText size={12} />
                  บันทึกช่วยจำ (เช่น คืนค่าของชำ, ค่าขนม)
                </label>
                <input
                  type="text"
                  placeholder="ระบุข้อความสั้นๆ (ไม่บังคับ)"
                  value={settleDescription}
                  onChange={(e) => setSettleDescription(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-sm text-white"
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'บันทึกประวัติการโอนเงิน'
                )}
              </button>
            </form>
          </div>

          {/* Quick tips panel */}
          <div className="p-4.5 rounded-2xl bg-zinc-950 border border-zinc-900 text-zinc-500 text-[10px] leading-relaxed flex gap-2">
            <HelpCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              หน้านี้มีไว้เพื่อบันทึกประวัติการ **โอนเงินหากันโดยตรง** ภายในครอบครัว (เช่น การโอนเงินเพื่อคืนเงินกองกลาง, การให้เงินค่าใช้จ่าย หรือเงินแต๊ะเอีย) รายการเหล่านี้จะไม่ถูกนับเป็นรายรับหรือรายจ่ายของกองกลางโดยตรง เพื่อความถูกต้องของบัญชีครอบครัว
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Transfers Timeline List (7 cols on desktop) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 border border-zinc-800/60 shadow-xl">
          <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase mb-5">
            ประวัติการโอนเงินของครอบครัว
          </h3>

          {transfers.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                🤝
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-300 block">ยังไม่มีประวัติการโอนเงิน</span>
                <span className="text-[10px] text-zinc-500 mt-1 block">เมื่อคุณหรือคนในครอบครัวโอนเงินและบันทึก จะปรากฏที่นี่แบบเรียลไทม์</span>
              </div>
            </div>
          ) : (
            <div className="relative border-l border-zinc-800/80 ml-2.5 pl-5.5 space-y-6 max-h-[550px] overflow-y-auto pr-1">
              {transfers.map((item, idx) => (
                <div key={item.id} className="relative group animate-slide-up">
                  
                  {/* Bullet indicator on the line */}
                  <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-[8px] font-black glow-green transition-transform group-hover:scale-110">
                    💸
                  </span>

                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
                          {getDisplayName(item.payer_id)}
                        </span>
                        <ArrowRight size={10} className="text-zinc-500" />
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          {getDisplayName(item.receiver_id)}
                        </span>
                      </div>
                      
                      {item.description ? (
                        <p className="text-xs font-semibold text-zinc-300 pl-0.5">
                          💬 {item.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 italic pl-0.5">
                          (ไม่มีบันทึกช่วยจำ)
                        </p>
                      )}

                      <span className="text-[9px] text-zinc-500 block font-medium">
                        โอนเมื่อ {new Date(item.settlement_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400 block tracking-tight">
                          ฿{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Deletion control (Only for creator / payer) */}
                      {item.payer_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteTransfer(item.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                          title="ลบรายการโอน"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
