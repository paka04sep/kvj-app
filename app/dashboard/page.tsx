'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Sparkles, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, 
  Clock, CheckCircle2, Circle, AlertCircle, X, ZoomIn
} from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  transaction_date: string
  created_at: string
  user_id: string
  receipt_url?: string | null
  profiles?: {
    display_name: string
    role: string
    avatar_url: string | null
  }
}

interface Profile {
  id: string
  display_name: string
  role: string
  avatar_url: string | null
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  // Detailed Modal for viewing transaction details on click
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Real-time dynamic Thai clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์']
      const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ]
      
      const dayName = days[now.getDay()]
      const dateNum = now.getDate()
      const monthName = months[now.getMonth()]
      const yearBE = now.getFullYear() + 543 // AD to BE
      const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      
      setCurrentTime(`${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearBE} | ${timeString} น.`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setCurrentUser(user)

      // 2. Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url')
      
      const profileMap: Record<string, Profile> = {}
      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = p
        })
        setProfiles(profileMap)
        
        // Find current user's profile
        const myProfile = profileMap[user.id]
        if (myProfile) {
          setProfile(myProfile)
        }
      }

      // 3. Fetch monthly obligations skipped (Moved to Overview page)

      // 4. Fetch all transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (transData) {
        const parsedTrans: Transaction[] = transData.map(t => ({
          ...t,
          profiles: profileMap[t.user_id]
        }))
        setTransactions(parsedTrans)
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase, router])

  // Initialize and subscribe to real-time events
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    fetchData()

    const channel1 = supabase
      .channel('dashboard-transactions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          setRefreshing(true)
          fetchData()
        }
      )
      .subscribe()

    // Listen to custom quick insert success events to fetch instantly
    const handleQuickSave = () => {
      setRefreshing(true)
      fetchData()
    }
    window.addEventListener('transaction-saved', handleQuickSave)

    return () => {
      supabase.removeChannel(channel1)
      window.removeEventListener('transaction-saved', handleQuickSave)
    }
  }, [supabase, fetchData])

  // Calculations for current selected date
  const selectedDayTransactions = transactions.filter(t => t.transaction_date === selectedDate)

  const selectedDayIncome = selectedDayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const selectedDayExpense = selectedDayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Father's income summing logic for banner (matching "รายได้รายวัน" today or selected day)
  const targetFatherIncome = selectedDayTransactions
    .filter(t => t.type === 'income' && t.category.includes('รายได้รายวัน'))
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // --- Dynamic Obligations calculations skipped (Moved to Overview page) ---

  // Handle manual date reset to today
  const handleResetToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const handleOpenQuickModal = () => {
    window.dispatchEvent(
      new CustomEvent('open-transaction-modal', { detail: { type: 'expense' } })
    )
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังเปิดข้อมูลรายรับรายจ่าย 🏠</p>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden animate-fade-in relative theme-transition">
      
      {/* 1. Dynamic Clock and Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4.5 shrink-0 gap-3">
        <div>
          {/* Thai Clock */}
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1 select-none">
            <Clock size={13} className="text-emerald-400" />
            <span className="text-[10px] font-black tracking-wider uppercase font-mono">
              {currentTime || 'กำลังโหลดนาฬิกาเรียลไทม์...'}
            </span>
          </div>
          {/* Greeting */}
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-1.5">
            สวัสดี &quot;{profile?.display_name || 'สมาชิกในบ้าน'}&quot; 👋
            {refreshing && <RefreshCw size={14} className="animate-spin text-zinc-500" />}
          </h2>
        </div>

        {/* Date Selector Driller (Date Left, Link Right) */}
        <div className="flex items-center justify-between w-full select-none gap-3">
          <div className="flex flex-col gap-1 select-none">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={14} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="app-field text-xs font-extrabold rounded-xl py-2.5 pl-9 pr-3.5 transition-all cursor-pointer w-[175px]"
              />
            </div>
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button 
                onClick={handleResetToToday}
                className="text-[9.5px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black px-2.5 py-1.5 rounded-lg border border-zinc-750 transition-colors cursor-pointer text-left w-fit shadow-sm animate-fade-in"
              >
                กลับมาวันนี้
              </button>
            )}
          </div>

          <Link 
            href="/overview?tab=obligations" 
            className="relative flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10.5px] font-black pl-3 pr-2 py-1.5 rounded-full shadow-lg border-l border-y border-rose-400/30 hover:pl-3.5 transition-all duration-200 select-none shrink-0  group"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
            </span>
            <span>รายจ่ายประจำเดือน 🔔</span>
          </Link>
        </div>
      </div>

      {/* 2. Responsive Layout: Side by Side on Desktop, Single Column on Mobile */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-5 lg:overflow-hidden overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: Summary KPIs, Obligations Card & Banners (5 cols on Desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-2.5 lg:space-y-4 shrink-0 lg:overflow-y-auto lg:pr-1 overflow-visible">
          
          {/* Daily KPI Summary for Selected Day */}
          <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5 shrink-0">
            {/* Income */}
            <div className="glass-card rounded-2xl py-2.5 px-3.5 lg:p-4 border border-zinc-850 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-center mb-0.5 lg:mb-1 select-none">
                <span className="text-[9px] font-black text-zinc-400 tracking-wider uppercase">รายรับวันนี้</span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/5">
                  +{selectedDayTransactions.filter(t => t.type === 'income').length} รายการ
                </span>
              </div>
              <span className="text-base lg:text-lg font-black text-emerald-400 tracking-tight block">
                ฿{selectedDayIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Expense */}
            <div className="glass-card rounded-2xl py-2.5 px-3.5 lg:p-4 border border-zinc-850 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/20 transition-all duration-300">
              <div className="flex justify-between items-center mb-0.5 lg:mb-1 select-none">
                <span className="text-[9px] font-black text-zinc-400 tracking-wider uppercase">รายจ่ายวันนี้</span>
                <span className="text-[8px] bg-rose-500/10 text-rose-400 font-extrabold px-2 py-0.5 rounded-full border border-rose-500/5">
                  -{selectedDayTransactions.filter(t => t.type === 'expense').length} รายการ
                </span>
              </div>
              <span className="text-base lg:text-lg font-black amount-expense tracking-tight block">
                ฿{selectedDayExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Father's Encouraging banner */}
          <div className="shrink-0">
            {targetFatherIncome > 0 ? (
              <div className="p-3.5 lg:p-4 rounded-2xl father-income-banner text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💼</span>
                  <div>
                    <span className="font-extrabold block banner-title">วันนี้พ่อหาเงินได้ยอดเยี่ยม!</span>
                    <span className="text-[10px] banner-desc">รายได้วันนี้สะสมเข้าบ้าน: <strong className="banner-amount font-black">+฿{targetFatherIncome.toLocaleString()}</strong> บาท</span>
                  </div>
                </div>
                <span className="text-[9px] banner-badge font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider shrink-0 select-none">
                  สุดยอดเลยครับ 🎉
                </span>
              </div>
            ) : (
              <div className="p-3.5 lg:p-4 rounded-2xl app-surface-soft text-zinc-500 dark:text-zinc-450 text-xs flex items-center gap-3 shadow-inner">
                <span className="text-lg">💤</span>
                <div>
                  <span className="font-extrabold block text-[var(--text-main)]">วันนี้พ่อไม่ได้ไปทำงาน</span>
                  <span className="text-[10px] text-[var(--text-muted)]">วันนี้เป็นวันหยุดพักผ่อนสบายๆ ของคุณพ่อครับ 🏠</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Chronological Activities Feed (7 cols on Desktop) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-4 lg:p-5 border border-zinc-800/80 flex flex-col lg:overflow-hidden overflow-hidden min-h-[300px] lg:min-h-[360px] flex-1 shadow-2xl">
          
          <div className="flex justify-between items-center pb-3 lg:pb-4 border-b border-zinc-850 shrink-0 select-none">
            <div>
              <h3 className="text-xs font-black text-[var(--text-main)] tracking-wider uppercase flex items-center gap-1.5">
                รายการเงินล่าสุดประจำบ้าน 🏠
              </h3>
              <p className="text-[9.5px] text-[var(--text-muted)] mt-0.5">
                แสดงธุรกรรมของ: {new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded-full font-bold uppercase tracking-wider animate-pulse-slow">
              อัปเดตสด
            </span>
          </div>

          {/* Scrollable feed box */}
          <div className="flex-1 lg:overflow-y-auto pr-1 mt-3 lg:mt-4 space-y-3.5 divide-y divide-zinc-850/40 min-h-0 w-full overflow-y-auto">
            {selectedDayTransactions.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-500">
                <AlertCircle size={36} className="text-zinc-750 mb-3" />
                <p className="text-xs font-bold">ยังไม่มีรายการบันทึกสำหรับวันนี้</p>
                <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px]">
                  แตะปุ่มบวกด่วนเพื่อทำการบันทึกค่ากับข้าวหรือรายรับได้ทันที
                </p>
                <button
                  type="button"
                  onClick={handleOpenQuickModal}
                  className="mt-4 px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  + เริ่มบันทึกตอนนี้
                </button>
              </div>
            ) : (
              selectedDayTransactions.map((t, idx) => {
                const timeString = t.created_at
                  ? new Date(t.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                  : ''

                return (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTx(t)}
                    className="flex w-full justify-between items-center py-3 px-2.5 animate-slide-up cursor-pointer hover:bg-zinc-800/10 rounded-2xl transition-all"
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner select-none">
                        {t.profiles?.avatar_url && (t.profiles.avatar_url.startsWith('data:') || t.profiles.avatar_url.startsWith('http')) ? (
                          <img 
                            src={t.profiles.avatar_url} 
                            alt={t.profiles.display_name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-black text-emerald-400">
                            {(t.profiles?.display_name || 'ส').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Transaction metadata stacked 1 - 2 - 3 */}
                      <div className="min-w-0 flex flex-col gap-0.5">
                        {/* 1. Transaction Type & User Name (Largest) */}
                        <span className={`text-sm font-black uppercase tracking-wide flex items-center gap-1.5 ${
                          t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {t.type === 'income' ? 'รายรับ' : 'รายจ่าย'} • <span className="text-[var(--text-main)] font-extrabold">{t.profiles?.display_name || 'สมาชิกในบ้าน'}</span>
                        </span>
                        
                        {/* 2. Description (Slightly smaller) */}
                        <span className="text-[12.5px] text-[var(--text-main)] font-semibold truncate max-w-[150px] sm:max-w-[220px]">
                          {t.description}
                        </span>

                        {/* 3. Category Tag (Smallest) */}
                        <div className="flex items-center mt-1">
                          <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 font-bold app-surface-soft px-1.5 py-0.5 rounded border border-zinc-800/20 select-none">
                            {t.category.split(' ').pop()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className={`text-[15px] font-black tracking-tight block ${
                        t.type === 'income' ? 'amount-income' : 'amount-expense'
                      }`}>
                        {t.type === 'income' ? '+' : '-'} ฿{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center justify-end gap-1 text-[9.5px] text-zinc-550 font-bold mt-1 font-mono">
                        <Clock size={8.5} className="text-zinc-650" />
                        <span>{timeString}</span>
                        {t.receipt_url && (
                          <>
                            <span className="text-zinc-700 font-bold">•</span>
                            <span className="text-emerald-450 bg-emerald-500/10 px-1 rounded border border-emerald-500/5">สลิป</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Pop-up Modal for transaction detail view */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="app-modal relative max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-5 animate-scale-up">
            
            <div className="flex justify-between items-center mb-4 select-none">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">รายละเอียดธุรกรรมของบ้าน 🏠</h4>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-700 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4.5">
              <div className="text-center py-4 app-surface-soft rounded-2xl">
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">จำนวนเงิน</span>
                <h3 className={`text-2xl font-black mt-1 ${
                  selectedTx.type === 'income' ? 'amount-income' : 'amount-expense'
                }`}>
                  {selectedTx.type === 'income' ? '+' : '-'} ฿{Number(selectedTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-medium">คำอธิบาย:</span>
                  <span className="font-bold text-zinc-100 text-right max-w-[200px] truncate">{selectedTx.description}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-medium">หมวดหมู่:</span>
                  <span className="font-extrabold text-zinc-300">{selectedTx.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-medium">ผู้ทำรายการ:</span>
                  <span className="font-extrabold text-emerald-400">{selectedTx.profiles?.display_name || 'สมาชิกในบ้าน'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-medium">เวลาบันทึก:</span>
                  <span className="font-bold text-zinc-400">
                    {new Date(selectedTx.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} | {' '}
                    {new Date(selectedTx.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </span>
                </div>
              </div>

              {/* Receipt slip display */}
              {selectedTx.receipt_url ? (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wide block">รูปภาพสลิปที่แนบ 📷</span>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-zinc-950 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedTx.receipt_url} 
                      alt="Receipt Slip" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center app-surface-soft rounded-xl text-[10px] text-zinc-650">
                  รายการนี้ไม่มีการแนบรูปภาพสลิปหลักฐาน
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
