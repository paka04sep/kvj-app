/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Lock,
  Plus,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface CustomCategory {
  name: string
  type: 'income' | 'expense'
}

type TransactionType = 'income' | 'expense'

export default function QuickTransactionModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])

  // Category management states
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  const supabase = createClient()
  const amountInputRef = useRef<HTMLInputElement>(null)
  const isIncomingScanRef = useRef(false)
  const customCategoriesRef = useRef<CustomCategory[]>([])
  const prevCategoryRef = useRef('')
  const prevActiveTabRef = useRef<TransactionType>('expense')

  const defaultIncomeCategories = useMemo(() => ['รายได้รายวัน', 'รายได้เสริม', 'อื่นๆ'], [])
  const defaultExpenseCategories = useMemo(() => [
    'ค่าข้าว',
    'ค่าไปโรงเรียนน้อง',
    'อื่นๆ',
  ], [])

  const incomeCats = useMemo(() => [
    ...defaultIncomeCategories,
    ...customCategories.filter((c) => c.type === 'income').map((c) => c.name),
  ], [defaultIncomeCategories, customCategories])

  const expenseCats = useMemo(() => [
    ...defaultExpenseCategories,
    ...customCategories.filter((c) => c.type === 'expense').map((c) => c.name),
  ], [defaultExpenseCategories, customCategories])

  const activeCategories = useMemo(() => activeTab === 'income' ? incomeCats : expenseCats, [activeTab, incomeCats, expenseCats])
  const activeTone = activeTab === 'income' ? 'income' : 'expense'

  const fetchCustomCategories = useCallback(async () => {
    try {
      const { data } = await supabase.from('custom_categories').select('name, type')
      if (data) setCustomCategories(data)
    } catch (err) {
      console.error(err)
    }
  }, [supabase])

  // Sync customCategories to ref to keep event listener up to date without re-binding
  useEffect(() => {
    customCategoriesRef.current = customCategories
  }, [customCategories])

  // Fetch custom categories on mount once
  useEffect(() => {
    fetchCustomCategories()
  }, [fetchCustomCategories])

  // Event listener for opening the modal
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent<{
        type?: TransactionType
        amount?: string
        description?: string
        category?: string
        date?: string
        imageFile?: File | null
        imagePreview?: string | null
      }>
      const initialType = customEvent.detail?.type || 'expense'

      setActiveTab(initialType)
      setDate(customEvent.detail?.date || new Date().toISOString().split('T')[0])
      setIsManagingCategories(false)

      const currentCustomCats = customCategoriesRef.current
      const cats = initialType === 'income'
        ? [...defaultIncomeCategories, ...currentCustomCats.filter((c) => c.type === 'income').map((c) => c.name)]
        : [...defaultExpenseCategories, ...currentCustomCats.filter((c) => c.type === 'expense').map((c) => c.name)]

      const initialCategory = customEvent.detail?.category || cats[0] || ''
      
      if (customEvent.detail?.category) {
        isIncomingScanRef.current = true
        setCategory(customEvent.detail.category)
      } else {
        setCategory(initialCategory)
      }

      if (customEvent.detail?.amount) {
        setAmount(customEvent.detail.amount)
      } else {
        setAmount('')
      }

      if (customEvent.detail?.description) {
        setDescription(customEvent.detail.description)
      } else {
        const defaultDescriptions: Record<string, string> = {
          'รายได้รายวัน': 'วันนี้มีรายได้รายวันเข้าบ้าน',
          'รายได้เสริม': 'วันนี้มีรายได้เสริมเข้าบ้าน',
          'อื่นๆ_income': 'รายรับของครอบครัว',
          'ค่าข้าว': 'จ่ายค่าข้าว',
          'ค่าไปโรงเรียนน้อง': 'ให้เงินน้องไปโรงเรียน',
          'อื่นๆ_expense': 'รายจ่ายของครอบครัว',
        }

        const key = initialCategory === 'อื่นๆ' ? `${initialCategory}_${initialType}` : initialCategory
        const initialDesc = defaultDescriptions[key] || (initialType === 'income' ? 'รายรับของครอบครัว' : 'รายจ่ายของครอบครัว')
        setDescription(initialDesc)
      }

      if (customEvent.detail?.imageFile) {
        setImageFile(customEvent.detail.imageFile)
      } else {
        setImageFile(null)
      }

      if (customEvent.detail?.imagePreview) {
        setImagePreview(customEvent.detail.imagePreview)
      } else {
        setImagePreview(null)
      }

      setIsOpen(true)
      setErrorMsg(null)
      setSuccessMsg(null)

      setTimeout(() => amountInputRef.current?.focus(), 260)
    }

    window.addEventListener('open-transaction-modal', handleOpenModal)

    return () => {
      window.removeEventListener('open-transaction-modal', handleOpenModal)
    }
  }, [defaultIncomeCategories, defaultExpenseCategories])

  // Reset category when activeTab changes
  useEffect(() => {
    if (isIncomingScanRef.current) {
      isIncomingScanRef.current = false
      return
    }
    const currentCats = activeTab === 'income' ? incomeCats : expenseCats
    if (currentCats.length > 0) {
      setCategory(currentCats[0])
    }
  }, [activeTab, incomeCats, expenseCats])

  // Reset selected category to first item if current selected category is no longer valid (e.g. deleted)
  useEffect(() => {
    if (category && !activeCategories.includes(category)) {
      setCategory(activeCategories[0] || '')
    }
  }, [activeCategories, category])

  // Smart auto-filled descriptions based on selected category (only triggers when category or tab changes)
  useEffect(() => {
    if (!category) return

    const defaultDescriptions: Record<string, string> = {
      'รายได้รายวัน': 'วันนี้มีรายได้รายวันเข้าบ้าน',
      'รายได้เสริม': 'วันนี้มีรายได้เสริมเข้าบ้าน',
      'อื่นๆ_income': 'รายรับของครอบครัว',
      'ค่าข้าว': 'จ่ายค่าข้าว',
      'ค่าไปโรงเรียนน้อง': 'ให้เงินน้องไปโรงเรียน',
      'อื่นๆ_expense': 'รายจ่ายของครอบครัว',
    }

    const defaultCats = activeTab === 'income' ? defaultIncomeCategories : defaultExpenseCategories
    const isDefaultCat = defaultCats.includes(category)

    const key = category === 'อื่นๆ' ? `${category}_${activeTab}` : category
    const defaultDesc = isDefaultCat
      ? (defaultDescriptions[key] || (activeTab === 'income' ? 'รายรับของครอบครัว' : 'รายจ่ายของครอบครัว'))
      : ''

    const prevCategory = prevCategoryRef.current
    const prevActiveTab = prevActiveTabRef.current
    
    const prevKey = prevCategory === 'อื่นๆ' ? `${prevCategory}_${prevActiveTab}` : prevCategory
    const prevDefaultDesc = prevCategory 
      ? (defaultDescriptions[prevKey] || (prevActiveTab === 'income' ? 'รายรับของครอบครัว' : 'รายจ่ายของครอบครัว'))
      : ''

    const currentDescTrimmed = description.trim()

    // Only update if current description is empty, matches previous default, or general fallbacks
    if (
      currentDescTrimmed === '' || 
      currentDescTrimmed === prevDefaultDesc || 
      currentDescTrimmed === 'รายรับของครอบครัว' || 
      currentDescTrimmed === 'รายจ่ายของครอบครัว' ||
      currentDescTrimmed === 'วันนี้มีรายรับเข้าบ้าน'
    ) {
      if (isDefaultCat) {
        setDescription(defaultDesc)
      } else {
        setDescription('') // For custom categories, keep it empty for the user to write
      }
    }

    prevCategoryRef.current = category
    prevActiveTabRef.current = activeTab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, activeTab])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    document.body.style.overscrollBehavior = isOpen ? 'none' : ''

    return () => {
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
    }
  }, [isOpen])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearForm = () => {
    setAmount('')
    setDescription('') // Clear and let category effect fill default if default category is chosen
    setImageFile(null)
    setImagePreview(null)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const numAmount = parseFloat(amount)
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('กรุณากรอกจำนวนเงินให้ถูกต้อง')
      setLoading(false)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่')

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

      const familyId = profile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'
      let uploadedUrl: string | null = null

      if (imageFile) {
        const compressedFile = await new Promise<File>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const maxSize = 1000
              let width = img.width
              let height = img.height

              if (width > height && width > maxSize) {
                height *= maxSize / width
                width = maxSize
              } else if (height > maxSize) {
                width *= maxSize / height
                height = maxSize
              }

              canvas.width = width
              canvas.height = height
              canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
              canvas.toBlob(
                (blob) => {
                  resolve(
                    blob
                      ? new File([blob], imageFile.name, {
                          type: 'image/jpeg',
                          lastModified: Date.now(),
                        })
                      : imageFile
                  )
                },
                'image/jpeg',
                0.8
              )
            }
            img.src = event.target?.result as string
          }
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })

        const filePath = `slips/${user.id}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, compressedFile)

        if (uploadError) {
          throw new Error(`ไม่สามารถอัปโหลดรูปสลิปได้: ${uploadError.message}`)
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('receipts').getPublicUrl(filePath)
        uploadedUrl = publicUrl
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        type: activeTab,
        amount: numAmount,
        description:
          description.trim() || (activeTab === 'income' ? 'รายรับของครอบครัว' : 'รายจ่ายของครอบครัว'),
        category,
        transaction_date: date,
        receipt_url: uploadedUrl,
        user_id: user.id,
        family_id: familyId,
      })

      if (insertError) throw insertError

      setSuccessMsg('บันทึกรายการสำเร็จ')
      confetti({
        particleCount: 58,
        spread: 42,
        colors: activeTab === 'income' ? ['#10b981', '#34d399'] : ['#e11d48', '#fb7185'],
        origin: { y: 0.66 },
      })

      window.dispatchEvent(new CustomEvent('transaction-saved'))
      clearForm()
      setTimeout(() => setIsOpen(false), 850)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    if (trimmed.length > 20) {
      setErrorMsg('ชื่อหมวดหมู่ต้องไม่เกิน 20 ตัวอักษร')
      return
    }

    if (activeCategories.includes(trimmed)) {
      setErrorMsg('มีหมวดหมู่นี้อยู่แล้ว')
      return
    }

    setCategoryLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน')

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

      const familyId = profile?.family_id || 'd7715b74-124b-48c0-82cc-49d609dbb184'

      const { data, error } = await supabase
        .from('custom_categories')
        .insert({
          name: trimmed,
          type: activeTab,
          family_id: familyId,
        })
        .select()
        .single()

      if (error) throw error

      setCustomCategories((prev) => [...prev, data])
      setNewCategoryName('')
      setSuccessMsg(`เพิ่มหมวดหมู่ "${trimmed}" สำเร็จ`)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่')
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (catName: string) => {
    if (!confirm(`คุณต้องการลบหมวดหมู่ "${catName}" ใช่หรือไม่?`)) return
    
    setCategoryLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('name', catName)
        .eq('type', activeTab)

      if (error) throw error

      setCustomCategories((prev) => prev.filter((c) => !(c.name === catName && c.type === activeTab)))
      setSuccessMsg(`ลบหมวดหมู่ "${catName}" สำเร็จ`)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบหมวดหมู่')
    } finally {
      setCategoryLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex animate-fade-in items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่างเพิ่มรายการ"
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-300"
      />

      <div className="app-modal relative flex max-h-[92dvh] w-full max-w-md select-none flex-col overflow-hidden rounded-t-3xl border-t border-zinc-800/70 bg-zinc-900/95 shadow-[0_-18px_48px_rgba(0,0,0,0.52)] animate-slide-up theme-transition sm:max-h-[86vh] sm:rounded-3xl sm:border">
        <div className="flex w-full shrink-0 justify-center py-2.5 sm:hidden">
          <div className="h-1 w-12 rounded-full bg-zinc-700/60" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/55 px-5 py-4">
          <div>
            <h3 className="text-sm font-black tracking-wide text-[var(--color-text-primary)]">
              {activeTab === 'income' ? 'เพิ่มรายรับ' : 'เพิ่มรายจ่าย'}
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">
              {activeTab === 'income' ? 'บันทึกเงินเข้าของบ้านให้เร็วและชัดเจน' : 'บันทึกเงินออกของบ้านให้เร็วและชัดเจน'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full app-surface-soft text-zinc-400 transition-colors hover:text-zinc-100"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        </div>

        {isManagingCategories ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Manager Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/55 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsManagingCategories(false)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full app-surface-soft text-zinc-400 transition-colors hover:text-zinc-100"
                aria-label="ย้อนกลับ"
              >
                <ArrowLeft size={16} />
              </button>
              <h3 className="text-sm font-black tracking-wide text-[var(--color-text-primary)]">
                จัดการหมวดหมู่{activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}
              </h3>
              <div className="w-8" />
            </div>

            {/* Category Manager Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-8 sm:pb-6">
              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-slide-up">
                  <CheckCircle size={15} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 animate-slide-up">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="space-y-1.5 animate-slide-up">
                <label className="flex items-center gap-1.5 pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  เพิ่มหมวดหมู่ใหม่
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="เช่น ค่าขนม, ค่าสตรีมมิ่ง"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="app-field flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    disabled={categoryLoading}
                  />
                  <button
                    type="submit"
                    className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                    disabled={categoryLoading || !newCategoryName.trim()}
                  >
                    <Plus size={18} className="stroke-[2.5px]" />
                  </button>
                </div>
              </form>

              {/* Custom Categories List */}
              <div className="space-y-2 animate-slide-up">
                <h5 className="pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  หมวดหมู่ของฉัน
                </h5>
                {customCategories.filter(c => c.type === activeTab).length === 0 ? (
                  <p className="py-4 text-center text-xs font-semibold text-zinc-600">
                    ยังไม่มีหมวดหมู่ที่เพิ่มเอง
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {customCategories
                      .filter(c => c.type === activeTab)
                      .map((cat) => (
                        <div
                          key={cat.name}
                          className="flex items-center justify-between rounded-xl app-surface-soft px-4 py-2.5 text-sm font-semibold"
                        >
                          <span className="text-zinc-100">{cat.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.name)}
                            disabled={categoryLoading}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                            aria-label={`ลบหมวดหมู่ ${cat.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Default Categories List */}
              <div className="space-y-2 border-t border-zinc-800/40 pt-4 animate-slide-up">
                <h5 className="pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  หมวดหมู่เริ่มต้น (ไม่สามารถลบได้)
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {(activeTab === 'income' ? defaultIncomeCategories : defaultExpenseCategories).map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-xl bg-zinc-950/20 border border-zinc-800/50 px-3.5 py-2 text-xs font-bold text-zinc-500"
                    >
                      <span>{cat}</span>
                      <Lock size={10} className="opacity-40" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-8 sm:pb-6">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-slide-up">
                <CheckCircle size={15} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 animate-slide-up">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
              activeTab === 'income' ? 'tone-income' : 'tone-expense'
            }`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  ประเภทที่เลือก
                </p>
                <p className="mt-0.5 text-sm font-black">
                  {activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">
                {activeTab === 'income' ? 'เงินเข้า' : 'เงินออก'}
              </span>
            </div>

            <div className="rounded-2xl app-surface-soft px-4 py-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                จำนวนเงิน
              </label>
              <div className="relative mt-1 flex items-center justify-center">
                <span className={`mr-2 text-2xl font-black ${activeTone === 'income' ? 'amount-income' : 'amount-expense'}`}>
                  ฿
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  pattern="[0-9]*"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-40 border-b border-zinc-700/70 bg-transparent pb-1 text-center text-4xl font-black outline-none transition-colors focus:border-emerald-500 ${
                    activeTone === 'income' ? 'amount-income' : 'amount-expense'
                  }`}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Tag size={12} className="text-zinc-500" />
                    หมวดหมู่
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingCategories(true)
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="cursor-pointer text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors underline"
                  >
                    จัดการ
                  </button>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="app-field w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold"
                  disabled={loading}
                >
                  {activeCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <Calendar size={12} className="text-zinc-500" />
                  วันที่
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="app-field w-full max-w-36 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <FileText size={12} className="text-zinc-500" />
                รายละเอียด
              </label>
              <input
                type="text"
                placeholder={activeTab === 'income' ? 'เช่น เงินเดือน, รายได้เสริม' : 'เช่น ค่ากับข้าว, ค่าไฟ'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="app-field w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 pl-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <Upload size={12} className="text-zinc-500" />
                แนบรูปสลิป
              </label>

              <div className="flex items-center gap-4">
                {!imagePreview ? (
                  <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/70 app-surface-soft transition-all hover:border-emerald-500/50">
                    <ImageIcon size={17} className="text-zinc-500" />
                    <span className="mt-0.5 text-[9px] font-bold text-zinc-500">เลือกรูป</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                ) : (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="ตัวอย่างสลิป" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                      }}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
                      aria-label="ลบรูป"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === 'income'
                  ? 'bg-emerald-600 shadow-emerald-500/10 hover:bg-emerald-700'
                  : 'bg-rose-600 shadow-rose-500/10 hover:bg-rose-700'
              }`}
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <Check size={16} className="stroke-[2.5px]" />
                 {activeTab === 'income' ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
