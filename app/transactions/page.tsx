'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface Profile {
  id: string
  display_name: string
  role: string
  avatar_url: string | null
}

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
  profiles?: Profile
}

const filters = [
  { key: 'วันนี้', type: 'neutral' },
  { key: 'เดือนนี้', type: 'neutral' },
  { key: 'พ่อ', type: 'neutral' },
  { key: 'แม่', type: 'neutral' },
  { key: 'รายรับ', type: 'income' },
  { key: 'รายจ่าย', type: 'expense' },
] as const

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      setCurrentUserId(user.id)

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url')

      const profileMap: Record<string, Profile> = {}
      profilesData?.forEach((profile) => {
        profileMap[profile.id] = profile
      })

      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      setTransactions(
        (transData || []).map((transaction) => ({
          ...transaction,
          profiles: profileMap[transaction.user_id],
        }))
      )
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('realtime-transactions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        setRefreshing(true)
        fetchData()
      })
      .subscribe()

    const handleQuickSave = () => {
      setRefreshing(true)
      fetchData()
    }
    window.addEventListener('transaction-saved', handleQuickSave)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('transaction-saved', handleQuickSave)
    }
  }, [fetchData, supabase])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('ยืนยันการลบรายการนี้ออกจากประวัติครอบครัว?')) return

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error

      confetti({ particleCount: 28, spread: 30, colors: ['#e11d48', '#fb7185'] })
      setTransactions((prev) => prev.filter((transaction) => transaction.id !== id))
      if (selectedTx?.id === id) setSelectedTx(null)
    } catch (err) {
      alert(`ไม่สามารถลบรายการได้: ${err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'}`)
    }
  }

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]
    )
  }

  const filteredTx = transactions.filter((transaction) => {
    if (searchText.trim()) {
      const query = searchText.toLowerCase()
      const matches =
        transaction.description?.toLowerCase().includes(query) ||
        transaction.category?.toLowerCase().includes(query) ||
        transaction.profiles?.display_name?.toLowerCase().includes(query)
      if (!matches) return false
    }

    if (selectedFilters.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0]
      const thisMonthStr = new Date().toISOString().slice(0, 7)

      for (const filter of selectedFilters) {
        if (filter === 'วันนี้' && transaction.transaction_date !== todayStr) return false
        if (filter === 'เดือนนี้' && !transaction.transaction_date.startsWith(thisMonthStr)) return false
        if (filter === 'รายรับ' && transaction.type !== 'income') return false
        if (filter === 'รายจ่าย' && transaction.type !== 'expense') return false
        if (filter === 'พ่อ') {
          const isFather =
            transaction.profiles?.role === 'father' ||
            transaction.profiles?.display_name?.includes('พ่อ')
          if (!isFather) return false
        }
        if (filter === 'แม่') {
          const isMother =
            transaction.profiles?.role === 'mother' ||
            transaction.profiles?.display_name?.includes('แม่')
          if (!isMother) return false
        }
      }
    }

    return true
  })

  const groupedTx = Object.entries(
    filteredTx.reduce<Record<string, Transaction[]>>((groups, transaction) => {
      groups[transaction.transaction_date] ||= []
      groups[transaction.transaction_date].push(transaction)
      return groups
    }, {})
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => ({
      date,
      dateHeader: new Date(date).toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      transactions: txs,
    }))

  const totalIncome = filteredTx
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  const totalExpense = filteredTx
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังเปิดประวัติธุรกรรม...</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-grow flex-col overflow-hidden pb-2 animate-fade-in theme-transition">
      <div className="mb-4 flex shrink-0 items-center justify-between select-none">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            คลังข้อมูลครอบครัว
          </span>
          <h2 className="mt-0.5 flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            ประวัติธุรกรรมย้อนหลัง
            {refreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
          </h2>
        </div>
      </div>

      <div className="mb-4 shrink-0 space-y-3.5">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="ค้นหาบิล หมวดหมู่ หรือคนลงรายการ เช่น ค่าไฟ, พ่อ, กับข้าว"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="app-field w-full rounded-2xl py-3 pl-11 pr-10 text-sm font-bold"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full app-surface-soft text-zinc-400 transition-colors hover:text-zinc-100"
              aria-label="ล้างคำค้นหา"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex w-full max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 select-none">
          <span className="mr-1 flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase text-zinc-500">
            <Filter size={10} className="text-zinc-500" />
            คัดกรอง:
          </span>
          {filters.map((item) => {
            const active = selectedFilters.includes(item.key)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleFilter(item.key)}
                className={`shrink-0 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-black transition-all ${
                  active
                    ? item.type === 'expense'
                      ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/10'
                      : 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : item.type === 'expense'
                      ? 'tone-expense bg-transparent hover:bg-rose-500/10'
                      : item.type === 'income'
                        ? 'tone-income bg-transparent hover:bg-emerald-500/10'
                        : 'app-surface-soft text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.key}
              </button>
            )
          })}
          {selectedFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilters([])}
              className="shrink-0 px-2 py-1 text-[10px] font-bold text-zinc-500 transition-colors hover:text-rose-400"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>

      {filteredTx.length > 0 && (
        <div className="mb-4 grid shrink-0 grid-cols-2 gap-3 rounded-2xl app-surface-soft p-3.5 shadow-inner select-none">
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              รายรับที่กรอง
            </span>
            <span className="mt-0.5 text-sm font-black amount-income">
              ฿{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col border-l border-zinc-800/40 pl-3.5">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              รายจ่ายที่กรอง
            </span>
            <span className="mt-0.5 text-sm font-black amount-expense">
              ฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {groupedTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl app-surface-soft py-24 text-center text-zinc-500 shadow-inner">
            <AlertCircle size={40} className="mb-3 text-zinc-500" />
            <p className="text-sm font-bold text-zinc-400">ไม่พบรายการตามที่ค้นหา</p>
            <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed text-zinc-500">
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูประวัติทั้งหมด
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {groupedTx.map((group) => (
              <div key={group.date} className="space-y-2">
                <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-zinc-800/40 app-surface px-1 py-2 backdrop-blur-md select-none">
                  <CalendarDays size={13} className="shrink-0 text-emerald-400" />
                  <span className="text-xs font-black tracking-wide text-zinc-300">{group.dateHeader}</span>
                  <span className="ml-auto font-mono text-[9px] font-bold text-zinc-500">
                    {group.transactions.length} รายการ
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.transactions.map((transaction) => {
                    const isIncome = transaction.type === 'income'
                    const timeString = transaction.created_at
                      ? `${new Date(transaction.created_at).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} น.`
                      : ''

                    return (
                      <div
                        key={transaction.id}
                        onClick={() => setSelectedTx(transaction)}
                        className="group flex cursor-pointer items-center justify-between rounded-2xl app-surface-soft p-3.5 transition-all hover:border-emerald-500/20"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-inner ${
                              isIncome ? 'tone-income' : 'tone-expense'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight size={15} className="stroke-[2.5px]" />
                            ) : (
                              <ArrowDownRight size={15} className="stroke-[2.5px]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-black text-zinc-100 transition-colors group-hover:text-emerald-400">
                                {transaction.description}
                              </span>
                              {transaction.receipt_url && (
                                <span className="shrink-0 rounded border border-emerald-500/10 bg-emerald-500/10 px-1.5 text-[8px] font-black text-emerald-400">
                                  สลิป
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-500">
                              <span className="rounded border border-emerald-500/5 bg-emerald-500/5 px-1.5 py-0.5 font-extrabold text-emerald-400">
                                {transaction.profiles?.display_name || 'สมาชิกในบ้าน'}
                              </span>
                              <span className="font-semibold">{timeString}</span>
                              <span className="text-[9px] font-bold">{transaction.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-3 flex shrink-0 items-center gap-3.5">
                          <span className={`text-sm font-black ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                            {isIncome ? '+' : '-'} ฿
                            {Number(transaction.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>

                          {transaction.user_id === currentUserId ? (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(transaction.id, e)}
                              className="cursor-pointer rounded-xl p-2 text-zinc-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
                              title="ลบรายการ"
                            >
                              <Trash2 size={13.5} />
                            </button>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center text-zinc-600">
                              <User size={13} className="opacity-30" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="transaction-detail-modal app-modal relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between select-none">
              <h4 className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <Sparkles size={10} className="text-emerald-400" />
                รายละเอียดธุรกรรม
              </h4>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full app-surface-soft text-zinc-400 transition-colors hover:text-zinc-100"
                aria-label="ปิด"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl app-surface-soft py-4 text-center shadow-inner">
                <span className="block text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  ยอดธุรกรรม
                </span>
                <h3 className={`mt-1 text-3xl font-black ${selectedTx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                  {selectedTx.type === 'income' ? '+' : '-'} ฿
                  {Number(selectedTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <DetailRow label="คำอธิบาย" value={selectedTx.description} />
                <DetailRow label="หมวดหมู่" value={selectedTx.category} />
                <DetailRow label="ผู้ทำรายการ" value={selectedTx.profiles?.display_name || 'สมาชิกในบ้าน'} />
                <DetailRow
                  label="วันที่"
                  value={new Date(selectedTx.transaction_date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                <DetailRow
                  label="เวลา"
                  value={`${new Date(selectedTx.created_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} น.`}
                />
              </div>

              {selectedTx.receipt_url ? (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wide text-zinc-500">
                    รูปสลิป
                  </span>
                  <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl app-surface-soft shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedTx.receipt_url} alt="Receipt preview" className="h-full w-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl app-surface-soft p-3 text-center text-[10px] text-zinc-500">
                  รายการนี้ไม่มีสลิปแนบ
                </div>
              )}
            </div>

            {selectedTx.user_id === currentUserId && (
              <div className="mt-5 border-t border-zinc-800/60 pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    setSelectedTx(null)
                    handleDelete(selectedTx.id, e)
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-500/15 bg-rose-500/10 py-3 text-xs font-extrabold text-rose-400 transition-all hover:bg-rose-500 hover:text-white active:scale-98"
                >
                  <Trash2 size={13} />
                  ลบรายการนี้
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-800/40 py-1.5">
      <span className="shrink-0 font-medium text-zinc-500">{label}:</span>
      <span className="max-w-[210px] truncate text-right font-bold text-zinc-200" title={value}>
        {value}
      </span>
    </div>
  )
}
