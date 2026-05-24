'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  TrendingUp, TrendingDown, Wallet, Target, Sparkles, 
  RefreshCw, Calendar, ChevronDown, CheckCircle2, Info,
  Plus, Pencil, Trash2, Check, AlertCircle, User
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import confetti from 'canvas-confetti'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  transaction_date: string
  user_id: string
}

interface Profile {
  id: string
  display_name: string
  role: string
  avatar_url: string | null
  family_id?: string
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  const [selectedMonth, setSelectedMonth] = useState('') // "YYYY-MM"
  const [savingsGoal, setSavingsGoal] = useState<number>(5000)
  const [newGoalInput, setNewGoalInput] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  
  // Obligations States
  const [activeTab, setActiveTab] = useState<'stats' | 'obligations'>('stats')
  const [obligations, setObligations] = useState<any[]>([])
  const [prevObligations, setPrevObligations] = useState<any[]>([])
  
  // Modal Controllers
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Helper to get today's date but in the next month
  const getNextMonthTodayDateStr = () => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    const year = d.getFullYear()
    const monthNum = String(d.getMonth() + 1).padStart(2, '0')
    const dayNum = String(d.getDate()).padStart(2, '0')
    return `${year}-${monthNum}-${dayNum}`
  }

  // CRUD Form States
  const [obId, setObId] = useState('')
  const [obName, setObName] = useState('')
  const [obAmount, setObAmount] = useState('')
  const [obDueDate, setObDueDate] = useState('')
  const [obIsRecurring, setObIsRecurring] = useState(false)
  
  // Checked items for rollforward copy
  const [rollforwardSelection, setRollforwardSelection] = useState<Record<string, boolean>>({})
  
  // Obligations Templates (Dropdown List)
  const DEFAULT_TEMPLATES = [
    'ค่าไฟฟ้า',
    'ค่าน้ำประปา',
    'ค่าอินเทอร์เน็ต',
    'ค่าโทรศัพท์มือถือ',
    'ค่าผ่อนรถ',
    'ค่าประกันภัย',
  ]
  const [customTemplates, setCustomTemplates] = useState<string[]>([])
  const [showObDropdown, setShowObDropdown] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom_obligation_templates')
      if (saved) {
        try {
          setCustomTemplates(JSON.parse(saved))
        } catch {
          setCustomTemplates([])
        }
      }
    }
  }, [])

  const handleAddTemplate = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || DEFAULT_TEMPLATES.includes(trimmed) || customTemplates.includes(trimmed)) return
    const updated = [...customTemplates, trimmed]
    setCustomTemplates(updated)
    localStorage.setItem('custom_obligation_templates', JSON.stringify(updated))
  }

  const handleDeleteTemplate = (e: React.MouseEvent, name: string) => {
    e.stopPropagation() // Prevent selecting the template when clicking delete
    const updated = customTemplates.filter(t => t !== name)
    setCustomTemplates(updated)
    localStorage.setItem('custom_obligation_templates', JSON.stringify(updated))
  }
  
  const router = useRouter()
  const supabase = createClient()

  // Track light/dark mode for dynamic chart styling
  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const theme = localStorage.getItem('theme') || 'dark'
        setIsDarkTheme(theme !== 'light')
      }
    }
    checkTheme()
    window.addEventListener('theme-change', checkTheme)
    return () => window.removeEventListener('theme-change', checkTheme)
  }, [])

  // Initialize selectedMonth with current month and read active tab from URL query
  useEffect(() => {
    setSelectedMonth(new Date().toISOString().slice(0, 7))
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'obligations') {
        setActiveTab('obligations')
      }
    }
  }, [])

  // Generate dynamic list of last 12 months for selector
  const getMonthsList = () => {
    const list = []
    const now = new Date()
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yearStr = d.getFullYear()
      const monthIndex = d.getMonth()
      const monthStr = String(monthIndex + 1).padStart(2, '0')
      const isoMonth = `${yearStr}-${monthStr}` // YYYY-MM
      
      const label = `${monthsThai[monthIndex]} พ.ศ. ${yearStr + 543}`
      list.push({ isoMonth, label })
    }
    return list
  }

  const monthsList = getMonthsList()

  // Date converters for Thai UI
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    } catch {
      return dateStr
    }
  }

  const formatThaiDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.'
    } catch {
      return dateTimeStr
    }
  }

  const getPreviousMonthISO = (monthISO: string) => {
    if (!monthISO) return ''
    const [year, month] = monthISO.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0')
    return `${prevYear}-${prevMonth}`
  }

  const getThaiMonthName = (monthISO: string) => {
    if (!monthISO) return ''
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const [, month] = monthISO.split('-').map(Number)
    return monthsThai[month - 1] || ''
  }

  // Fetch savings goal for a specific month
  const fetchSavingsGoal = useCallback(async (monthISO: string) => {
    if (!monthISO) return
    try {
      const firstDayOfMonth = `${monthISO}-01`
      const { data } = await supabase
        .from('savings_goals')
        .select('target_amount')
        .eq('month', firstDayOfMonth)
        .single()
        
      if (data) {
        setSavingsGoal(Number(data.target_amount))
      } else {
        // Insert a default goal of 5000 if not set yet
        const { data: insertedGoal } = await supabase
          .from('savings_goals')
          .insert({ 
            target_amount: 5000, 
            month: firstDayOfMonth,
            family_id: 'd7715b74-124b-48c0-82cc-49d609dbb184'
          })
          .select('target_amount')
          .single()
        
        if (insertedGoal) {
          setSavingsGoal(Number(insertedGoal.target_amount))
        } else {
          setSavingsGoal(5000)
        }
      }
    } catch (err) {
      console.error('Error fetching savings goal:', err)
      setSavingsGoal(5000)
    }
  }, [supabase])

  const fetchData = useCallback(async () => {
    if (!selectedMonth) return
    try {
      // 1. Get authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setCurrentUser(user)

      // 2. Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, family_id')
      
      const profileMap: Record<string, Profile> = {}
      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = p
        })
        setProfiles(profileMap)
      }

      // 3. Fetch all transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (transData) {
        setTransactions(transData)
      }

      // 4. Fetch goal for currently selected month
      await fetchSavingsGoal(selectedMonth)

      // 5. Fetch obligations
      const firstDayOfMonth = `${selectedMonth}-01`
      const { data: obligationsData } = await supabase
        .from('monthly_obligations')
        .select('*')
        .eq('month', firstDayOfMonth)
        .order('due_date', { ascending: true })

      if (obligationsData) {
        setObligations(obligationsData)
      } else {
        setObligations([])
      }

      // 6. Fetch previous month obligations if this month has none (to suggest rollforward)
      if (!obligationsData || obligationsData.length === 0) {
        const prevMonthISO = getPreviousMonthISO(selectedMonth)
        if (prevMonthISO) {
          const prevFirstDay = `${prevMonthISO}-01`
          const { data: prevData } = await supabase
            .from('monthly_obligations')
            .select('*')
            .eq('month', prevFirstDay)
          
          if (prevData) {
            setPrevObligations(prevData)
            // Pre-select all by default for rollforward
            const selection: Record<string, boolean> = {}
            prevData.forEach(item => {
              selection[item.id] = true
            })
            setRollforwardSelection(selection)
          } else {
            setPrevObligations([])
          }
        }
      } else {
        setPrevObligations([])
      }

    } catch (err) {
      console.error('Error fetching overview data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase, router, selectedMonth, fetchSavingsGoal])

  // Trigger loading on selectedMonth changes
  useEffect(() => {
    fetchData()

    // Supabase Real-time Subscriptions
    const channel = supabase
      .channel('realtime-overview-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          setRefreshing(true)
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings_goals' },
        () => {
          setRefreshing(true)
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_obligations' },
        () => {
          setRefreshing(true)
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchData, selectedMonth])

  // Handle savings goal update for selectedMonth
  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(newGoalInput)
    if (isNaN(amount) || amount < 0 || !selectedMonth) return

    try {
      const firstDayOfMonth = `${selectedMonth}-01`
      const { error } = await supabase
        .from('savings_goals')
        .upsert({ 
          target_amount: amount, 
          month: firstDayOfMonth, 
          family_id: 'd7715b74-124b-48c0-82cc-49d609dbb184'
        }, { onConflict: 'month' })
      
      if (!error) {
        setSavingsGoal(amount)
        setEditingGoal(false)
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 }
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  // --- CRUD Functions for Obligations ---
  const handleAddObligation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!obName || !obAmount || !obDueDate || !selectedMonth) return
    const amountNum = parseFloat(obAmount)
    if (isNaN(amountNum) || amountNum <= 0) return

    try {
      const parsedDate = new Date(obDueDate)
      const dueDay = parsedDate.getDate()
      const firstDayOfMonth = `${selectedMonth}-01`
      
      const userProfile = profiles[currentUser?.id]
      const familyId = userProfile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'

      const { error } = await supabase
        .from('monthly_obligations')
        .insert({
          name: obName,
          amount: amountNum,
          due_date: obDueDate,
          due_day: dueDay,
          month: firstDayOfMonth,
          is_recurring: obIsRecurring,
          status: 'unpaid',
          family_id: familyId
        })

      if (!error) {
        setShowAddModal(false)
        setObName('')
        setObAmount('')
        setObDueDate('')
        setObIsRecurring(false)
        fetchData()
        confetti({
          particleCount: 30,
          spread: 30,
          origin: { y: 0.8 }
        })
      } else {
        console.error(error)
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenEditModal = (ob: any) => {
    setObId(ob.id)
    setObName(ob.name)
    setObAmount(String(ob.amount))
    setObDueDate(ob.due_date || `${selectedMonth}-01`)
    setObIsRecurring(ob.is_recurring || false)
    setShowEditModal(true)
  }

  const handleEditObligation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!obId || !obName || !obAmount || !obDueDate) return
    const amountNum = parseFloat(obAmount)
    if (isNaN(amountNum) || amountNum <= 0) return

    try {
      const parsedDate = new Date(obDueDate)
      const dueDay = parsedDate.getDate()

      const { error } = await supabase
        .from('monthly_obligations')
        .update({
          name: obName,
          amount: amountNum,
          due_date: obDueDate,
          due_day: dueDay,
          is_recurring: obIsRecurring
        })
        .eq('id', obId)

      if (!error) {
        setShowEditModal(false)
        setObId('')
        setObName('')
        setObAmount('')
        setObDueDate('')
        setObIsRecurring(false)
        fetchData()
      } else {
        console.error(error)
        alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteObligation = async (id: string) => {
    if (!confirm('ต้องการลบรายการภาระบิลนี้ออกประจำเดือนนี้ใช่หรือไม่?')) return
    try {
      const { error } = await supabase
        .from('monthly_obligations')
        .delete()
        .eq('id', id)
      
      if (!error) {
        fetchData()
      } else {
        console.error(error)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handlePayObligation = async (profileId: string, ob: any) => {
    if (!ob) return
    if (!profileId) {
      alert('ไม่พบข้อมูลผู้ล็อกอิน กรุณารีเฟรชหน้าจอหรือเข้าสู่ระบบใหม่อีกครั้ง')
      return
    }

    const formattedAmount = Number(ob.amount).toLocaleString('th-TH')
    if (!confirm(`ยืนยันการบันทึกจ่ายบิล "${ob.name}" จำนวน ฿${formattedAmount} บาท หรือไม่?\n(ระบบจะลงบันทึกเป็นรายจ่ายของคุณโดยอัตโนมัติ)`)) {
      return
    }

    try {
      // 1. Log transaction as expense with auto-matching category
      let categoryMatch = 'จ่ายบิล'
      const name = ob.name
      if (name.includes('ไฟ')) categoryMatch = '🔌 ค่าไฟ'
      else if (name.includes('น้ำ')) categoryMatch = '💧 ค่าน้ำ'
      else if (name.includes('เน็ต') || name.includes('อินเทอร์เน็ต') || name.includes('โทรศัพท์')) categoryMatch = '📶 ค่าเน็ต'
      else if (name.includes('เดินทาง') || name.includes('รถ')) categoryMatch = '🚗 ค่าเดินทาง'
      else if (name.includes('แพทย์') || name.includes('หมอ') || name.includes('พยาบาล') || name.includes('ยา')) categoryMatch = '🏥 ค่ารักษาพยาบาล'
      else if (name.includes('กู้') || name.includes('หนี้') || name.includes('ยืม') || name.includes('ผ่อน')) categoryMatch = '💸 หนี้สิน/เงินกู้'
      else if (name.includes('อาหาร') || name.includes('กิน') || name.includes('ข้าว')) categoryMatch = '🍜 อาหาร'

      const userProfile = profiles[profileId]
      const familyId = userProfile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'
      const todayStr = new Date().toISOString().split('T')[0]

      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: profileId,
          type: 'expense',
          amount: ob.amount,
          description: `จ่ายบิล: ${ob.name}`,
          category: categoryMatch,
          transaction_date: todayStr,
          family_id: familyId
        })

      if (transError) {
        console.error('Error inserting transaction:', transError)
        alert('เกิดข้อผิดพลาดในการบันทึกรายการธุรกรรม')
        return
      }

      // 2. Mark obligation as paid
      const { error: obError } = await supabase
        .from('monthly_obligations')
        .update({
          status: 'paid',
          paid_by: profileId,
          paid_at: new Date().toISOString()
        })
        .eq('id', ob.id)

      if (!obError) {
        confetti({
          particleCount: 80,
          spread: 45,
          origin: { y: 0.8 }
        })
        fetchData()
      } else {
        console.error('Error updating obligation status:', obError)
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะบิล')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRollforward = async () => {
    const selectedIds = Object.keys(rollforwardSelection).filter(id => rollforwardSelection[id])
    if (selectedIds.length === 0) return

    try {
      const firstDayOfMonth = `${selectedMonth}-01`
      const [year, month] = selectedMonth.split('-').map(Number)
      
      const insertPromises = prevObligations
        .filter(item => selectedIds.includes(item.id))
        .map(item => {
          // Adjust due_date to current month
          const prevDueDate = new Date(item.due_date)
          const dueDay = item.due_day || prevDueDate.getDate()
          const maxDays = new Date(year, month, 0).getDate()
          const finalDay = Math.min(dueDay, maxDays)
          const dueMonthStr = String(month).padStart(2, '0')
          const dueDayStr = String(finalDay).padStart(2, '0')
          const newDueDate = `${year}-${dueMonthStr}-${dueDayStr}`

          const userProfile = profiles[currentUser?.id]
          const familyId = userProfile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'

          return supabase
            .from('monthly_obligations')
            .insert({
              name: item.name,
              amount: item.amount,
              due_date: newDueDate,
              due_day: finalDay,
              month: firstDayOfMonth,
              is_recurring: item.is_recurring,
              status: 'unpaid',
              family_id: familyId
            })
        })

      await Promise.all(insertPromises)
      
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 }
      })

      fetchData()
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการดึงข้อมูล')
    }
  }

  // --- Calculations for selectedMonth ---
  const currentMonthTransactions = transactions.filter(t => t.transaction_date?.startsWith(selectedMonth))

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const currentSavings = totalIncome - totalExpense
  const savingsPercent = savingsGoal > 0 ? Math.max(0, Math.min(Math.round((currentSavings / savingsGoal) * 100), 100)) : 0
  const isGoalAchieved = currentSavings >= savingsGoal && savingsGoal > 0

  // Calculations for Obligations Checklist
  const totalObligationsCount = obligations.length
  const paidObligations = obligations.filter(o => o.status === 'paid')
  const unpaidObligations = obligations.filter(o => o.status === 'unpaid')
  const totalObligationsAmount = obligations.reduce((sum, o) => sum + Number(o.amount), 0)
  const paidObligationsAmount = paidObligations.reduce((sum, o) => sum + Number(o.amount), 0)
  const unpaidObligationsAmount = unpaidObligations.reduce((sum, o) => sum + Number(o.amount), 0)
  
  const obligationsProgress = totalObligationsCount > 0 
    ? Math.round((paidObligations.length / totalObligationsCount) * 100)
    : 0

  const getObligationCategoryMeta = (name: string) => {
    if (name.includes('ไฟ')) return { emoji: '🔌', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/10' }
    if (name.includes('น้ำ')) return { emoji: '💧', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/10' }
    if (name.includes('เน็ต') || name.includes('อินเทอร์เน็ต') || name.includes('โทรศัพท์')) return { emoji: '📶', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/10' }
    if (name.includes('เดินทาง') || name.includes('รถ')) return { emoji: '🚗', bg: 'bg-teal-500/15 text-teal-400 border-teal-500/10' }
    if (name.includes('แพทย์') || name.includes('หมอ') || name.includes('พยาบาล') || name.includes('ยา')) return { emoji: '🏥', bg: 'bg-pink-500/15 text-pink-400 border-pink-500/10' }
    if (name.includes('กู้') || name.includes('หนี้') || name.includes('ยืม') || name.includes('ผ่อน')) return { emoji: '💸', bg: 'bg-rose-500/15 text-rose-455 border-rose-500/10' }
    if (name.includes('อาหาร') || name.includes('กิน') || name.includes('ข้าว')) return { emoji: '🍜', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10' }
    return { emoji: '📝', bg: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/10' }
  }

  // Father's dynamic daily income Area Chart data within the selectedMonth
  const getLineChartData = () => {
    if (!selectedMonth) return []
    const [year, month] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate() // Total days in this month
    
    const dataMap: Record<number, number> = {}
    for (let d = 1; d <= lastDay; d++) {
      dataMap[d] = 0
    }

    currentMonthTransactions.forEach(t => {
      if (t.type === 'income' && t.category.includes('รายได้รายวัน')) {
        const transDay = Number(t.transaction_date.split('-')[2])
        if (dataMap[transDay] !== undefined) {
          dataMap[transDay] += Number(t.amount)
        }
      }
    })

    return Object.keys(dataMap).map(d => ({
      day: `วันที่ ${d}`,
      amount: dataMap[Number(d)]
    }))
  }

  const lineChartData = getLineChartData()

  // Pie Chart Data: Expense category breakdown within the selectedMonth
  const categoryColors: Record<string, string> = {
    'ค่าไฟฟ้า': '#f59e0b',
    'ค่าน้ำประปา': '#3b82f6',
    'ค่าของใช้/อาหาร': '#10b981',
    'ค่าเน็ต/โทรศัพท์': '#8b5cf6',
    'ค่าเดินทาง': '#14b8a6',
    'ค่ารักษาพยาบาล': '#ec4899',
    'หนี้สิน/เงินกู้': '#f43f5e',
    'อื่นๆ': '#71717a'
  }

  const getPieChartData = () => {
    const catMap: Record<string, number> = {}
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'อื่นๆ'
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount)
      })

    const total = Object.values(catMap).reduce((sum, v) => sum + v, 0)

    return Object.keys(catMap).map(name => {
      const val = catMap[name]
      const pct = total > 0 ? Math.round((val / total) * 100) : 0
      return {
        name,
        value: val,
        percentage: pct
      }
    }).sort((a, b) => b.value - a.value)
  }

  const pieChartData = getPieChartData()

  // Get display name for selectedMonth
  const selectedMonthLabel = monthsList.find(m => m.isoMonth === selectedMonth)?.label || 'เลือกเดือน'

  // Get dynamic dates limit for standard HTML5 calendar picker
  const [targetYear, targetMonth] = selectedMonth ? selectedMonth.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]
  const lastDayOfSelectedMonth = new Date(targetYear, targetMonth, 0).getDate()
  const dateInputMin = `${selectedMonth}-01`
  const dateInputMax = `${selectedMonth}-${String(lastDayOfSelectedMonth).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังคำนวณข้อมูลวิเคราะห์การเงิน... 📊</p>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden animate-fade-in relative theme-transition pb-2">
      
      {/* 1. Styled Premium Month Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 shrink-0 gap-2">
        <div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase block">
            สถิติมุมมองระดับเดือน
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] mt-0.5 flex items-center gap-2 select-none">
            ภาพรวมการเงินครอบครัว 📊
            {refreshing && <RefreshCw size={14} className="animate-spin text-zinc-500" />}
          </h2>
        </div>

        {/* Dropdown selector for YYYY-MM comparison */}
        <div className="relative w-fit">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={14} />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-200 text-xs font-extrabold rounded-2xl py-3 pl-10 pr-9 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer shadow-md"
          >
            {monthsList.map((m) => (
              <option key={m.isoMonth} value={m.isoMonth} className="bg-zinc-950 text-white">
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-550 pointer-events-none" size={13} />
        </div>
      </div>

      {/* 2. Sleek Sliding Tabs Switcher */}
      <div className="flex bg-zinc-950/60 p-1 rounded-2xl border border-zinc-850 shadow-inner mb-4 shrink-0 relative select-none">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-emerald-500 text-black shadow-md scale-[1.02]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          วิเคราะห์การเงิน 📊
        </button>
        <button
          onClick={() => setActiveTab('obligations')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'obligations'
              ? 'bg-emerald-500 text-black shadow-md scale-[1.02]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ค่าใช้จ่ายประจำเดือน 📝
        </button>
      </div>

      {/* 3. Conditional Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        
        {activeTab === 'stats' ? (
          <>
               {/* savings goal bar, spans 4 cols */}
              <div className="lg:col-span-4 glass-card rounded-2xl p-4.5 border border-zinc-800/80 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-1.5 select-none">
                      <Target size={20} className="text-emerald-400" />
                      <span className="text-[16px] font-black text-[var(--color-text-primary)] opacity-80 tracking-wide uppercase">ตั้งเป้าการเก็บเงิน</span>
                    </div>
                    {editingGoal ? (
                      <form onSubmit={handleUpdateGoal} className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newGoalInput}
                          onChange={(e) => setNewGoalInput(e.target.value)}
                          className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                          placeholder="เป้าออม"
                          autoFocus
                        />
                        <button type="submit" className="text-[10px] bg-emerald-500 text-black px-2.5 py-1 rounded-lg font-black cursor-pointer hover:scale-102 transition-transform">
                          เซฟ
                        </button>
                      </form>
                    ) : (
                      <button 
                        onClick={() => { setNewGoalInput(String(savingsGoal)); setEditingGoal(true); }}
                        className="text-[12px] text-zinc-400 hover:text-emerald-400 font-bold select-none cursor-pointer transition-colors underline"
                      >
                        แก้ไข
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-end text-[10px] mb-1.5 select-none">
                    <span className="text-zinc-500 font-bold">ความคืบหน้า {savingsPercent}%</span>
                    <span className="font-extrabold text-white">฿{currentSavings > 0 ? currentSavings.toLocaleString() : 0} / ฿{savingsGoal.toLocaleString()}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-zinc-950/75 border border-zinc-900 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isGoalAchieved 
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500 glow-green' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${savingsPercent}%` }}
                    />
                  </div>
                </div>

                {isGoalAchieved ? (
                  <div className="mt-3.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] flex items-center gap-1.5 animate-pulse-slow select-none">
                    <Sparkles size={11} className="shrink-0" />
                    <span className="font-black truncate">สุดยอดเลยครับ! ครอบครัวบรรลุเป้าเงินเก็บแล้ว! 🎉</span>
                  </div>
                ) : (
                  <div className="mt-3.5 p-2 rounded-xl bg-zinc-950/50 border border-zinc-850/60 text-zinc-500 text-[9.5px] flex items-center gap-1.5 select-none">
                    <Info size={11} className="shrink-0 text-zinc-650" />
                    <span className="font-bold truncate">ขาดอีก ฿{(Math.max(0, savingsGoal - currentSavings)).toLocaleString()} บาทจะสำเร็จ</span>
                  </div>
                )}
              </div>

            {/* Row 1: KPI Cards + Savings Goal Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* Dashboard Main KPIs (3 blocks, spans 8 cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                 
                {/* Income KPI */}
                <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[16px] font-black text-[var(--color-text-primary)] tracking-wider uppercase select-none opacity-80">รายรับประจำเดือน</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/5 select-none">
                      <TrendingUp size={15} className="stroke-[2.5px]" />
                    </div>
                  </div> 
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block select-none">รายรับทั้งหมด</span>
                    <span className="text-lg font-black text-emerald-400 tracking-tight mt-0.5 block truncate">
                      ฿{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Expense KPI */}
                <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/20 transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[16px] font-black text-[var(--color-text-primary)] tracking-wider uppercase select-none opacity-80">รายจ่ายประจำเดือน</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-455 flex items-center justify-center border border-rose-500/5 select-none">
                      <TrendingDown size={15} className="stroke-[2.5px]" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block select-none">รายจ่ายทั้งหมด</span>
                    <span className="text-lg font-black amount-expense tracking-tight mt-0.5 block truncate">
                      ฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Net Savings Balance */}
                <div className={`glass-panel rounded-2xl p-4.5 border-l-4 shadow-lg flex flex-col justify-between ${
                  currentSavings >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'
                }`}>
                  <div className="flex justify-between items-center mb-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <Wallet className={`mr-0.5 ${currentSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} size={20} />
                      <span className="text-[16px] font-bold text-[var(--color-text-primary)] opacity-80">คงเหลือประจำเดือน</span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-lg font-black tracking-tight block truncate ${
                      currentSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {currentSavings >= 0 
                        ? `฿${currentSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                        : `-฿${Math.abs(currentSavings).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      }
                    </span>
                    <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md inline-block mt-2 border select-none ${
                      currentSavings >= 0 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/10'
                    }`}>
                      {currentSavings >= 0 ? '💰 สรุปดุลการเงินเป็นบวก' : '⚠️ รายจ่ายเกินรายรับประจำเดือน'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Father's daily trend Area Chart + Expense Category breakdown Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Father's Daily Income Trend Area Chart (8 cols on desktop) */}
              <div className="lg:col-span-7 xl:col-span-8 glass-card rounded-2xl p-5 border border-zinc-800/80 flex flex-col shadow-lg">
                <div className="mb-4 select-none">
                  <h3 className="text-xs font-black text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                    📈 กราฟแนวโน้มรายได้รายวันคุณพ่อ
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    ติดตามรายรับจากหมวดหมู่ &quot;💰 รายได้รายวัน&quot; ของพ่อประจำเดือน: {selectedMonthLabel}
                  </p>
                </div>

                <div className="w-full h-64 sm:h-72 flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="father-inc-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? '#27272a' : '#e2e8f0'} vertical={false} />
                      <XAxis dataKey="day" stroke={isDarkTheme ? '#71717a' : '#64748b'} fontSize={10} tickLine={false} />
                      <YAxis stroke={isDarkTheme ? '#71717a' : '#64748b'} fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={isDarkTheme 
                          ? { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '14px' } 
                          : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '14px' }
                        }
                        labelStyle={isDarkTheme 
                          ? { color: '#a1a1aa', fontWeight: 'bold', fontSize: '11px' } 
                          : { color: '#334155', fontWeight: 'bold', fontSize: '11px' }
                        }
                        itemStyle={isDarkTheme 
                          ? { fontSize: '11px' } 
                          : { fontSize: '11px', color: '#0f172a' }
                        }
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        name="รายได้ของพ่อ" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#father-inc-grad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense breakdown Pie Chart (4 cols on desktop) */}
              <div className="lg:col-span-5 xl:col-span-4 flex">
                {pieChartData.length > 0 ? (
                  <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 w-full flex flex-col justify-between shadow-lg">
                    <div className="select-none">
                      <h3 className="text-xs font-black text-zinc-300 tracking-wider uppercase">
                        🍕 สัดส่วนรายจ่ายรายเดือน
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">จำแนกสัดส่วนบิล/รายจ่าย: {selectedMonthLabel}</p>
                    </div>
                    
                    <div className="w-full flex items-center justify-between py-2 my-auto">
                      <div className="w-[45%] h-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={28}
                              outerRadius={48}
                              paddingAngle={3.5}
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#71717a'} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={isDarkTheme 
                                ? { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' } 
                                : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '11px' }
                              }
                              itemStyle={isDarkTheme 
                                ? { fontSize: '11px' } 
                                : { fontSize: '11px', color: '#0f172a' }
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend list */}
                      <div className="w-[52%] flex flex-col gap-1.5 pl-2 max-h-36 overflow-y-auto select-none">
                        {pieChartData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1.5">
                            <div 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: categoryColors[entry.name] || '#71717a' }}
                            />
                            <span className="text-[9.5px] text-zinc-300 truncate max-w-[65px] font-bold">{entry.name}</span>
                            <span className="text-[8px] bg-zinc-950/80 px-1 rounded border border-zinc-900 text-zinc-400 font-extrabold">{entry.percentage}%</span>
                            <span className="text-[9.5px] font-black text-zinc-450 shrink-0 ml-auto">฿{entry.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-zinc-800/40 text-[9px] text-zinc-550 select-none">
                      วิเคราะห์โดยคำนวณจากยอดรวมใบเสร็จของครอบครัว
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 text-center py-16 w-full flex flex-col justify-center items-center shadow-lg">
                    <span className="text-3xl mb-3">🍕</span>
                    <h3 className="text-xs font-black text-zinc-300 tracking-wider uppercase mb-1.5">
                      สัดส่วนรายจ่ายครอบครัว
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold leading-relaxed max-w-[180px]">
                      ยังไม่พบข้อมูลรายจ่ายสำหรับเดือน {selectedMonthLabel} ครับ
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* OBLIGATIONS TO-DO TAB COMPONENT */
          <div className="space-y-5 animate-slide-up">
            
            {/* KPI obligations grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Box 1: Obligations Count Summary */}
              <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[16px] font-black text-[var(--color-text-primary)] opacity-80 tracking-wider uppercase select-none">ความคืบหน้า</span>
                  <span className="text-[8.5px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full font-black">
                    {paidObligations.length} / {totalObligationsCount} รายการ
                  </span>
                </div>
                <div>
                  <div className="flex justify-between items-end text-[10px] mb-1 select-none">
                    <span className="text-zinc-500 font-bold">บิลจ่ายแล้ว {obligationsProgress}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-zinc-950/75 border border-zinc-900 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full rounded-full transition-all duration-700 bg-emerald-500 glow-green"
                      style={{ width: `${obligationsProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Total unpaid obligations */}
              <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/20 transition-all duration-300">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[16px] font-black text-[var(--color-text-primary)] opacity-80 tracking-wider uppercase select-none">ที่ต้องจ่ายเดือนนี้</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-455 flex items-center justify-center border border-rose-500/5 select-none">
                    <AlertCircle size={14} className="stroke-[2.5px]" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block select-none">ยอดค้างจ่าย</span>
                  <span className="text-lg font-black amount-expense tracking-tight mt-0.5 block truncate">
                    ฿{unpaidObligationsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Box 3: Total monthly budget */}
              <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[16px] font-black text-[var(--color-text-primary)] opacity-80 tracking-wider uppercase select-none">ยอดรวมทั้งหมดในเดือนนี้</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/5 select-none">
                    <Plus size={14} className="stroke-[2.5px]" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block select-none">ยอดรวมประจำเดือนนี้</span>
                  <span className="text-lg font-black text-emerald-400 tracking-tight mt-0.5 block truncate">
                    ฿{totalObligationsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>

            {/* Title / Action bar */}
            <div className="flex justify-between items-center select-none pt-2">
              <div>
                <h3 className="text-[14px] font-black text-zinc-300 tracking-wider uppercase flex items-center gap-1">
                  📋 รายการทั้งหมดในแต่ละเดือน
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  เช็คลิสต์และบันทึกค่าใช้จ่ายตามจริงในแต่ละเดือน
                </p>
              </div>
              <button
                onClick={() => {
                  setObName('')
                  setObAmount('')
                  setObDueDate(getNextMonthTodayDateStr())
                  setObIsRecurring(false)
                  setShowAddModal(true)
                }}
                className="btn-primary px-3.5 py-3 text-[10px] font-black flex items-center gap-1 shadow-md hover:scale-102 transition-transform cursor-pointer"
              >
                <Plus size={12} className="stroke-[3px]" />
                เพิ่มภาระบิล
              </button>
            </div>

            {/* Rollforward copy prompt box */}
            {prevObligations.length > 0 && obligations.length === 0 && (
              <div className="glass-panel border-l-4 border-l-emerald-500 rounded-3xl p-5 shadow-xl relative overflow-hidden animate-pulse-slow">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/5 shrink-0">
                    <Calendar size={18} className="stroke-[2.5px]" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                      คัดลอกภาระเดือนก่อนหน้ามาใช้ในเดือนนี้ไหม? 📅
                    </h4>
                    <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
                      พบรายการภาระบิลของเดือน <strong>{getThaiMonthName(getPreviousMonthISO(selectedMonth))}</strong> ทั้งหมด <strong>{prevObligations.length}</strong> รายการ ยอดรวม <strong>฿{prevObligations.reduce((s,x)=>s+Number(x.amount), 0).toLocaleString()} บ.</strong> คุณแม่สามารถเลือกและคัดลอกมาใช้ด่วนได้ทันทีครับ
                    </p>
                    
                    {/* Compact checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 max-h-36 overflow-y-auto pr-1">
                      {prevObligations.map(item => (
                        <label key={item.id} className="flex items-center gap-2 p-2 bg-zinc-950/60 rounded-xl border border-zinc-850 cursor-pointer hover:bg-zinc-900 transition-colors select-none text-[10.5px]">
                          <input 
                            type="checkbox"
                            checked={!!rollforwardSelection[item.id]}
                            onChange={(e) => setRollforwardSelection({
                              ...rollforwardSelection,
                              [item.id]: e.target.checked
                            })}
                            className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-zinc-200 truncate">{item.name}</span>
                          <span className="text-zinc-500 font-extrabold shrink-0 ml-auto">฿{Number(item.amount).toLocaleString()}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-850/50">
                      <button
                        onClick={handleRollforward}
                        disabled={!Object.values(rollforwardSelection).some(Boolean)}
                        className="btn-primary px-4 py-2 text-[10px] font-black cursor-pointer shadow-md disabled:opacity-40 disabled:pointer-events-none"
                      >
                        ✓ นำเข้า {Object.values(rollforwardSelection).filter(Boolean).length} รายการมายังเดือนนี้
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checklist Loop */}
            {obligations.length === 0 ? (
              prevObligations.length === 0 && (
                <div className="glass-card rounded-2xl p-8 text-center flex flex-col justify-center items-center shadow-lg border border-zinc-850">
                  <span className="text-4xl mb-4">📝</span>
                  <h3 className="text-sm font-black text-zinc-300 tracking-wider uppercase mb-1.5">
                    ยังไม่มีรายการภาระบิลประจำเดือนนี้
                  </h3>
                  <p className="text-xs text-zinc-500 font-bold max-w-[240px] leading-relaxed mb-6">
                    คุณแม่สามารถสร้างบิลขึ้นมาได้เองตามจริงในแต่ละเดือน เพื่อความยืดหยุ่นสูงสุดครับ
                  </p>
                  <button
                    onClick={() => {
                      setObName('')
                      setObAmount('')
                      setObDueDate(getNextMonthTodayDateStr())
                      setObIsRecurring(false)
                      setShowAddModal(true)
                    }}
                    className="btn-primary px-5 py-2.5 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                    เพิ่มภาระรายการแรก
                  </button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {obligations.map((ob) => {
                  const meta = getObligationCategoryMeta(ob.name)
                  const isPaid = ob.status === 'paid'
                  const payer = isPaid && ob.paid_by ? profiles[ob.paid_by] : null

                  return (
                    <div 
                      key={ob.id}
                      className={`glass-card rounded-2xl border p-4.5 flex flex-col justify-between shadow-lg relative group transition-all duration-300 ${
                        isPaid 
                          ? 'border-emerald-500/25 bg-emerald-950/5 hover:border-emerald-500/40' 
                          : 'border-zinc-850 hover:border-emerald-500/20'
                      }`}
                    >
                      {/* Top elements */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          {/* Circle Avatar / Emoji */}
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-base font-bold ${meta.bg}`}>
                            {meta.emoji}
                          </div>
                          <div>
                            <span className="text-xs font-black text-zinc-100 block tracking-wide">{ob.name}</span>
                            <span className="text-[9.5px] text-zinc-500 font-bold block mt-0.5 select-none">
                              ครบกำหนด: {formatThaiDate(ob.due_date)} {ob.is_recurring && '• ทำซ้ำ'}
                            </span>
                          </div>
                        </div>

                        {/* Edit / Delete small menu */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(ob)}
                            className="p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
                            title="แก้ไขบิล"
                          >
                            <Pencil size={11} className="stroke-[2.5px]" />
                          </button>
                          <button
                            onClick={() => handleDeleteObligation(ob.id)}
                            className="p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-rose-455 transition-all cursor-pointer"
                            title="ลบบิลประจำเดือนนี้"
                          >
                            <Trash2 size={11} className="stroke-[2.5px]" />
                          </button>
                        </div>
                      </div>

                      {/* Middle price / Status */}
                      <div className="flex items-baseline justify-between mt-5 pt-3.5 border-t border-zinc-850/40">
                        <div>
                          <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase block select-none">ยอดเรียกเก็บ</span>
                          <span className="text-lg font-black tracking-tight amount-expense block">
                            ฿{Number(ob.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Status Check Action / Label */}
                        {isPaid ? (
                          <div className="flex flex-col items-end select-none">
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9.5px] font-black text-emerald-400 animate-pulse-slow">
                              <CheckCircle2 size={11} className="stroke-[3px]" />
                              จ่ายแล้ว
                            </span>
                            {payer && (
                              <div className="flex items-center gap-1.5 mt-2">
                                {payer.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={payer.avatar_url} 
                                    alt={payer.display_name}
                                    className="w-4 h-4 rounded-full border border-emerald-500/20 shrink-0" 
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-[7px] text-emerald-400 font-black flex items-center justify-center shrink-0 uppercase">
                                    {payer.display_name.slice(0, 2)}
                                  </div>
                                )}
                                <span className="text-[8px] text-zinc-500 font-bold block max-w-[80px] truncate">
                                  {payer.display_name} • {formatThaiDateTime(ob.paid_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePayObligation(currentUser?.id, ob)}
                            className="btn-primary px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-97 text-black text-[10px] font-black flex items-center gap-1 shadow-md hover:scale-103 transition-all cursor-pointer shrink-0"
                          >
                            <Check size={11} className="stroke-[3.5px]" />
                            จ่ายบิลนี้
                          </button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* --- ADD OBLIGATION MODAL DIALOG --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-zinc-800 p-6 shadow-2xl animate-slide-up select-none">
            <div className="flex justify-between items-center pb-4.5 border-b border-zinc-850">
              <h3 className="text-[14px] font-black text-zinc-200 tracking-wider uppercase flex items-center gap-1">
                ➕ เพิ่มภาระบิลประจำบ้านใหม่
              </h3>
            </div>
            
            <form onSubmit={handleAddObligation} className="space-y-4.5 mt-5">
              <div className="relative">
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">ชื่อรายการ / ค่าใช้จ่าย</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={obName}
                    onChange={(e) => {
                      setObName(e.target.value)
                      setShowObDropdown(true)
                    }}
                    onFocus={() => setShowObDropdown(true)}
                    placeholder="เช่น ค่าไฟ, ค่าน้ำประปา, ค่าเน็ตแม่..."
                    className="glass-input w-full pl-4 pr-10 py-3 rounded-xl text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowObDropdown(!showObDropdown)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                  >
                    <ChevronDown size={14} className={`transform transition-transform duration-200 ${showObDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showObDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowObDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 backdrop-blur-md p-1.5 space-y-1 scrollbar-thin">
                      <div className="text-[9px] font-bold text-zinc-500 px-2 py-1 select-none">
                        เลือกรายการด่วนหรือพิมพ์ชื่อใหม่
                      </div>
                      
                      {/* 1. Default Templates (System defaults, cannot delete) */}
                      {DEFAULT_TEMPLATES
                        .filter(t => !obName || t.toLowerCase().includes(obName.toLowerCase()))
                        .map((template) => {
                          const meta = getObligationCategoryMeta(template)
                          return (
                            <div
                              key={`default-${template}`}
                              onClick={() => {
                                setObName(template)
                                setShowObDropdown(false)
                              }}
                              className="flex items-center justify-between px-2 py-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm select-none">{meta.emoji}</span>
                                <span className="text-xs font-bold text-zinc-200">{template}</span>
                              </div>
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded select-none font-bold">
                                ระบบ
                              </span>
                            </div>
                          )
                        })}

                      {/* 2. Custom Templates (User favorites, deletable) */}
                      {customTemplates
                        .filter(t => !obName || t.toLowerCase().includes(obName.toLowerCase()))
                        .map((template) => {
                          const meta = getObligationCategoryMeta(template)
                          return (
                            <div
                              key={`custom-${template}`}
                              onClick={() => {
                                setObName(template)
                                setShowObDropdown(false)
                              }}
                              className="flex items-center justify-between px-2 py-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors group/item"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm select-none">{meta.emoji}</span>
                                <span className="text-xs font-bold text-zinc-200">{template}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTemplate(e, template)}
                                className="p-1 text-zinc-600 hover:text-rose-455 hover:bg-zinc-800 rounded transition-colors"
                                title="ลบรายการนี้"
                              >
                                <Trash2 size={11} className="stroke-[2.5px]" />
                              </button>
                            </div>
                          )
                        })}

                      {/* Add as Custom Option button */}
                      {obName.trim() && 
                       !DEFAULT_TEMPLATES.includes(obName.trim()) && 
                       !customTemplates.includes(obName.trim()) && (
                        <div
                          onClick={() => {
                            handleAddTemplate(obName)
                            setShowObDropdown(false)
                          }}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-emerald-500/15 text-emerald-400 rounded-lg cursor-pointer transition-colors border border-dashed border-emerald-500/25"
                        >
                          <Plus size={11} className="stroke-[3px]" />
                          <span className="text-xs font-bold truncate">บันทึก &quot;{obName.trim()}&quot; เป็นรายการโปรด</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={obAmount}
                  onChange={(e) => setObAmount(e.target.value)}
                  placeholder="เช่น 1350"
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">วันครบกำหนด</label>
                <input
                  type="date"
                  required
                  value={obDueDate}
                  onChange={(e) => setObDueDate(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white uppercase"
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-zinc-950/40 rounded-xl border border-zinc-900">
                <input
                  type="checkbox"
                  id="add-recur"
                  checked={obIsRecurring}
                  onChange={(e) => setObIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="add-recur" className="text-[10px] font-bold text-zinc-400 cursor-pointer select-none">
                  ทำซ้ำรายการนี้ทุกเดือน (เป็นบิลคงที่รายเดือน)
                </label>
              </div>

              <div className="flex gap-3.5 pt-4.5 border-t border-zinc-850/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl text-[10px] font-black text-zinc-350 tracking-wider transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-grow py-3 btn-primary rounded-2xl text-[10px] font-black tracking-wider shadow-lg cursor-pointer"
                >
                  เพิ่มรายการบิล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT OBLIGATION MODAL DIALOG --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-zinc-800 p-6 shadow-2xl animate-slide-up select-none">
            <div className="flex justify-between items-center pb-4.5 border-b border-zinc-850">
              <h3 className="text-xs font-black text-zinc-200 tracking-wider uppercase flex items-center gap-1">
                ✏️ แก้ไขข้อมูลภาระบิลของบ้าน
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold cursor-pointer text-xs p-1"
              >
                ปิด
              </button>
            </div>
            
            <form onSubmit={handleEditObligation} className="space-y-4.5 mt-5">
              <div className="relative">
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">ชื่อรายการ / ค่าใช้จ่าย</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={obName}
                    onChange={(e) => {
                      setObName(e.target.value)
                      setShowObDropdown(true)
                    }}
                    onFocus={() => setShowObDropdown(true)}
                    placeholder="เช่น ค่าไฟ, ค่าน้ำประปา, ค่าเน็ตแม่..."
                    className="glass-input w-full pl-4 pr-10 py-3 rounded-xl text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowObDropdown(!showObDropdown)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                  >
                    <ChevronDown size={14} className={`transform transition-transform duration-200 ${showObDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showObDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowObDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 backdrop-blur-md p-1.5 space-y-1 scrollbar-thin">
                      <div className="text-[9px] font-bold text-zinc-500 px-2 py-1 select-none">
                        เลือกรายการด่วนหรือพิมพ์ชื่อใหม่
                      </div>
                      
                      {/* 1. Default Templates (System defaults, cannot delete) */}
                      {DEFAULT_TEMPLATES
                        .filter(t => !obName || t.toLowerCase().includes(obName.toLowerCase()))
                        .map((template) => {
                          const meta = getObligationCategoryMeta(template)
                          return (
                            <div
                              key={`edit-default-${template}`}
                              onClick={() => {
                                setObName(template)
                                setShowObDropdown(false)
                              }}
                              className="flex items-center justify-between px-2 py-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm select-none">{meta.emoji}</span>
                                <span className="text-xs font-bold text-zinc-200">{template}</span>
                              </div>
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded select-none font-bold">
                                ระบบ
                              </span>
                            </div>
                          )
                        })}

                      {/* 2. Custom Templates (User favorites, deletable) */}
                      {customTemplates
                        .filter(t => !obName || t.toLowerCase().includes(obName.toLowerCase()))
                        .map((template) => {
                          const meta = getObligationCategoryMeta(template)
                          return (
                            <div
                              key={`edit-custom-${template}`}
                              onClick={() => {
                                setObName(template)
                                setShowObDropdown(false)
                              }}
                              className="flex items-center justify-between px-2 py-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors group/item"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm select-none">{meta.emoji}</span>
                                <span className="text-xs font-bold text-zinc-200">{template}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTemplate(e, template)}
                                className="p-1 text-zinc-600 hover:text-rose-455 hover:bg-zinc-800 rounded transition-colors"
                                title="ลบรายการนี้"
                              >
                                <Trash2 size={11} className="stroke-[2.5px]" />
                              </button>
                            </div>
                          )
                        })}

                      {/* Add as Custom Option button */}
                      {obName.trim() && 
                       !DEFAULT_TEMPLATES.includes(obName.trim()) && 
                       !customTemplates.includes(obName.trim()) && (
                        <div
                          onClick={() => {
                            handleAddTemplate(obName)
                            setShowObDropdown(false)
                          }}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-emerald-500/15 text-emerald-400 rounded-lg cursor-pointer transition-colors border border-dashed border-emerald-500/25"
                        >
                          <Plus size={11} className="stroke-[3px]" />
                          <span className="text-xs font-bold truncate">บันทึก &quot;{obName.trim()}&quot; เป็นรายการโปรด</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={obAmount}
                  onChange={(e) => setObAmount(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 block mb-1.5 uppercase">วันครบกำหนด</label>
                <input
                  type="date"
                  required
                  value={obDueDate}
                  onChange={(e) => setObDueDate(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white uppercase"
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-zinc-950/40 rounded-xl border border-zinc-900">
                <input
                  type="checkbox"
                  id="edit-recur"
                  checked={obIsRecurring}
                  onChange={(e) => setObIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="edit-recur" className="text-[10px] font-bold text-zinc-400 cursor-pointer select-none">
                  ทำซ้ำรายการนี้ทุกเดือน (เป็นบิลคงที่รายเดือน)
                </label>
              </div>

              <div className="flex gap-3.5 pt-4.5 border-t border-zinc-850/50">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl text-[10px] font-black text-zinc-350 tracking-wider transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-grow py-3 btn-primary rounded-2xl text-[10px] font-black tracking-wider shadow-lg cursor-pointer"
                >
                  บันทึกความเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
