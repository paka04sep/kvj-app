'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

export default function ScanSlipModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [customCategories, setCustomCategories] = useState<string[]>([])

  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultCategories = [
    'ค่าข้าว',
    'ค่าไปโรงเรียนน้อง',
    'รายได้รายวัน',
    'รายได้เสริม',
    'อื่นๆ',
  ]

  // Retrieve custom categories to help AI match them
  const fetchCustomCategories = async () => {
    try {
      const { data } = await supabase.from('custom_categories').select('name')
      if (data) {
        const names = data.map((c) => c.name)
        setCustomCategories([...new Set([...defaultCategories, ...names])])
      } else {
        setCustomCategories(defaultCategories)
      }
    } catch (err) {
      console.error('Error fetching custom categories:', err)
      setCustomCategories(defaultCategories)
    }
  }

  useEffect(() => {
    const handleOpenScanModal = () => {
      setIsOpen(true)
      setImageFile(null)
      setImagePreview(null)
      setErrorMsg(null)
      setLoading(false)
      fetchCustomCategories()
    }

    window.addEventListener('open-scan-slip-modal', handleOpenScanModal)
    return () => {
      window.removeEventListener('open-scan-slip-modal', handleOpenScanModal)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    document.body.style.overscrollBehavior = isOpen ? 'none' : ''

    return () => {
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
    }
  }, [isOpen])

  // Cycle loading messages for cool micro-UX
  useEffect(() => {
    if (!loading) return
    const messages = [
      'กำลังอ่านไฟล์รูปภาพ...',
      'ส่งข้อมูลให้ Gemini AI วิเคราะห์...',
      'กำลังแกะภาษาไทยและลายมือ...',
      'ถอดตัวเลขจำนวนเงิน...',
      'เลือกหมวดหมู่ให้ตรงกับบ้านคุณ...',
    ]
    
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [loading])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setErrorMsg(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) {
      setErrorMsg('กรุณาเลือกหรืออัปโหลดรูปภาพสลิปก่อน')
      return
    }

    setLoading(true)
    setLoadingStep(0)
    setErrorMsg(null)

    try {
      // Convert to Base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
      })
      reader.readAsDataURL(imageFile)
      const base64Image = await base64Promise

      // Call API
      const res = await fetch('/api/scan-slip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          categories: customCategories,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'ระบบ AI ไม่สามารถอ่านข้อมูลสลิปนี้ได้')
      }

      const parsedData = result.data

      // Close this modal and open QuickTransactionModal with pre-populated values!
      setIsOpen(false)
      
      // We dispatch the pre-filled data to open-transaction-modal
      window.dispatchEvent(
        new CustomEvent('open-transaction-modal', {
          detail: {
            type: parsedData.type || 'expense',
            amount: parsedData.amount ? String(parsedData.amount) : '',
            description: parsedData.description || '',
            category: parsedData.category || 'อื่นๆ',
            date: parsedData.date || new Date().toISOString().split('T')[0],
            imageFile: imageFile,
            imagePreview: imagePreview,
          },
        })
      )
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเรียกใช้บริการวิเคราะห์สลิป')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const loadingMessages = [
    'กำลังอ่านไฟล์รูปภาพ...',
    'ส่งข้อมูลให้ Gemini AI วิเคราะห์...',
    'กำลังแกะภาษาไทยและลายมือ...',
    'ถอดตัวเลขจำนวนเงิน...',
    'เลือกหมวดหมู่ให้ตรงกับบ้านคุณ...',
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex animate-fade-in items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่างสแกนสลิป"
        onClick={() => !loading && setIsOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      />

      <div className="app-modal relative flex max-h-[92dvh] w-full max-w-md select-none flex-col overflow-hidden rounded-t-3xl border-t border-zinc-800/70 bg-zinc-900/95 shadow-[0_-18px_48px_rgba(0,0,0,0.52)] animate-slide-up theme-transition sm:max-h-[86vh] sm:rounded-3xl sm:border">
        {/* Mobile drag handle */}
        <div className="flex w-full shrink-0 justify-center py-2.5 sm:hidden">
          <div className="h-1 w-12 rounded-full bg-zinc-700/60" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/55 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide text-zinc-100">
                สแกนสลิป / บิลด้วย AI
              </h3>
              <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">
                อ่านสลิปธนาคาร บิลค่าใช้จ่าย หรือลายมือด้วย Gemini AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !loading && setIsOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full app-surface-soft text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
            aria-label="ปิด"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleScanSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-8 sm:pb-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 animate-slide-up">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Image Upload Area */}
          <div className="space-y-2">
            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-56 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700/60 bg-zinc-950/40 p-6 text-center transition-all hover:border-cyan-400/50 hover:bg-zinc-950/70"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 transition-transform group-hover:scale-110 group-hover:text-cyan-400 shadow-md">
                  <Upload size={20} />
                </div>
                <h4 className="mt-3.5 text-xs font-bold text-zinc-200">
                  เลือกรูปสลิป หรือ ลากไฟล์มาวางที่นี่
                </h4>
                <p className="mt-1 text-[10px] text-zinc-500 max-w-[200px]">
                  รองรับสลิปธนาคารทุกธนาคาร, ใบเสร็จร้านค้า หรือรูปกระดาษบันทึกแบบลายมือ
                </p>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-400">
                  <Sparkles size={9} /> AI Scanner
                </div>
              </div>
            ) : (
              <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="สลิปที่อัปโหลด"
                  className="h-full w-full object-contain"
                />

                {!loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white hover:bg-black/90 shadow-md transition-all active:scale-95"
                    aria-label="ลบรูปและเลือกใหม่"
                  >
                    <X size={15} />
                  </button>
                )}

                {/* Cyber Scanner Bar Animation */}
                {loading && (
                  <div className="absolute inset-x-0 top-0 z-20 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scanner-bar" />
                )}
              </div>
            )}
          </div>

          {/* Loader Micro-UX */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute h-full w-full rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                <Sparkles size={20} className="text-cyan-400 animate-pulse" />
              </div>
              <p className="mt-3.5 text-xs font-bold text-cyan-400 animate-pulse">
                {loadingMessages[loadingStep]}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                กำลังประมวลผลด้วยโมเดลความเร็วสูงระดับพรีเมียม
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {!loading ? (
              <button
                type="submit"
                disabled={!imageFile}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#22d3ee_0%,#0891b2_100%)] py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/10 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileText size={16} className="stroke-[2.5px]" />
                วิเคราะห์สลิปด้วย AI ✨
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-extrabold text-zinc-500"
              >
                กำลังอ่านข้อมูลด้วย AI...
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
