'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { createBrowserClient } from '@supabase/ssr'
import { 
  User, Lock, Key, AlertCircle, CheckCircle, Shield, 
  LogOut, Edit2, ShieldAlert, Plus, Camera, Palette, Upload, X, Bell
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import confetti from 'canvas-confetti'
import { registerPushNotifications } from '@/utils/notifications/pushRegister'

interface Profile {
  id: string
  display_name: string
  role: string
  avatar_url: string | null
  created_at: string
  notification_settings?: any
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true)
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'admin'>('profile')
  const [pushStatus, setPushStatus] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const status = localStorage.getItem('kvj_push_registration_status')
      const error = localStorage.getItem('kvj_push_registration_error')
      setPushStatus(status)
      setPushError(error)
      console.log('--- KVJ Push Notification Test Info ---')
      console.log('Browser notification permission status:', Notification.permission)
      console.log('KVJ Local Push Status:', status)
      if (error) console.log('KVJ Local Push Error:', error)
      console.log('---------------------------------------')
    }
  }, [])
  
  // Password change states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)

  // Display name edit states
  const [editingName, setEditingName] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [updatingName, setUpdatingName] = useState(false)
  const editFormRef = useRef<HTMLFormElement>(null)

  // Avatar upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Admin user creation states
  const [usernameInput, setUsernameInput] = useState('')
  const [userDisplayName, setUserDisplayName] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState<'member' | 'admin'>('member')
  const [creatingUser, setCreatingUser] = useState(false)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Secondary client for admin signup with persistSession: false
  const adminClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  )

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile(data)
          setDisplayNameInput(data.display_name)
          const settings = data.notification_settings as any
          setIsNotificationsEnabled(settings?.enabled !== false)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase, router])

  // Cancel edit display name when clicking outside
  useEffect(() => {
    if (!editingName) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (editFormRef.current && !editFormRef.current.contains(event.target as Node)) {
        setDisplayNameInput(profile?.display_name || '')
        setEditingName(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [editingName, profile])

  // Handle Display Name Update
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !displayNameInput.trim()) return
    setUpdatingName(true)
    setPwError(null)
    setPwSuccess(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayNameInput.trim() })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        display_name: displayNameInput.trim()
      })
      setEditingName(false)
      setPwSuccess('อัปเดตชื่อแสดงผลเรียบร้อยแล้ว!')
      confetti({
        particleCount: 30,
        spread: 30,
        origin: { y: 0.8 }
      })
    } catch (err: any) {
      setPwError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตชื่อ')
    } finally {
      setUpdatingName(false)
    }
  }

  // Handle Notification Toggle in Profile
  const handleToggleNotifications = async () => {
    if (!profile) return
    const nextVal = !isNotificationsEnabled
    setIsNotificationsEnabled(nextVal)

    try {
      const updatedSettings = {
        ...(profile.notification_settings || {}),
        enabled: nextVal
      }

      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: updatedSettings })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        notification_settings: updatedSettings
      })
      setPwSuccess(nextVal ? 'เปิดการแจ้งเตือนระบบเรียบร้อยแล้ว! 🔔' : 'ปิดการแจ้งเตือนระบบชั่วคราวแล้ว 🔕')
      setTimeout(() => setPwSuccess(null), 3000)
    } catch (err) {
      console.error('Error toggling notifications:', err)
      setIsNotificationsEnabled(isNotificationsEnabled) // Revert state on error
      setPwError('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า')
      setTimeout(() => setPwError(null), 3000)
    }
  }

  // Handle Device Image Selection and client-side downscaling/compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    setPwError(null)
    setPwSuccess(null)

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = async () => {
          // HTML5 canvas downscaling & compression logic
          const canvas = document.createElement('canvas')
          const max_size = 160
          let width = img.width
          let height = img.height

          // Calculate new proportions keeping aspect ratio
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width
              width = max_size
            }
          } else {
            if (height > max_size) {
              width *= max_size / height
              height = max_size
            }
          }

          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // Export compressed JPEG base64 (tiny footprint under ~15KB)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)

          // Save directly to the database public.profiles table
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: compressedBase64 })
            .eq('id', profile.id)

          if (error) throw error

          setProfile({
            ...profile,
            avatar_url: compressedBase64
          })
          setPwSuccess('อัปเดตรูปภาพโปรไฟล์ส่วนตัวสำเร็จแล้ว!')
          confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.8 }
          })
          setUploadingAvatar(false)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      setPwError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ')
      setUploadingAvatar(false)
    }
  }

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPassword(true)
    setPwError(null)
    setPwSuccess(null)

    if (newPassword.length < 6) {
      setPwError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      setUpdatingPassword(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPwError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน')
      setUpdatingPassword(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPwSuccess('เปลี่ยนรหัสผ่านสำเร็จแล้ว! กรุณาจดจำรหัสผ่านใหม่สำหรับล็อกอินครั้งถัดไป')
      setNewPassword('')
      setConfirmPassword('')
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 }
      })
    } catch (err: any) {
      setPwError(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Handle Admin User Creation
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameInput.trim() || !userPassword.trim() || !userDisplayName.trim()) {
      setAdminError('กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน')
      return
    }

    setCreatingUser(true)
    setAdminError(null)
    setAdminSuccess(null)

    const virtualEmail = `${usernameInput.trim().toLowerCase()}@kvj.com`

    try {
      // Create Auth User via non-persisting browser-client
      const { error } = await adminClient.auth.signUp({
        email: virtualEmail,
        password: userPassword,
        options: {
          data: {
            display_name: userDisplayName.trim(),
            role: userRole
          }
        }
      })

      if (error) throw error

      setAdminSuccess(`สร้างผู้ใช้สำหรับ "${userDisplayName}" (ID: ${usernameInput.trim().toLowerCase()}) เรียบร้อยแล้ว! สมาชิกคนนั้นสามารถเข้าล็อกอินโดยระบุชื่อผู้ใช้และรหัสผ่านที่ตั้งให้ได้ทันที`)
      setUsernameInput('')
      setUserDisplayName('')
      setUserPassword('')
      setUserRole('member')

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 }
      })
    } catch (err: any) {
      console.error('Error creating user:', err)
      setAdminError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียนสมาชิกใหม่')
    } finally {
      setCreatingUser(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังโหลดโปรไฟล์ส่วนตัว...</p>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col pb-8 h-full overflow-hidden animate-fade-in theme-transition">
      {/* Title */}
      <div className="mb-5 shrink-0">
        <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase block">
          โปรไฟล์ครอบครัว
        </span>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
          ตั้งค่าบัญชี & การใช้งาน 👤
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 md:h-full md:pb-6 space-y-6">
        {/* Main Profile Header Card */}
        {profile && (
          <div className="glass-panel rounded-3xl p-5 border border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-white">
              <User size={100} />
            </div> 
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="device-photo-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
                disabled={uploadingAvatar}
              />
              <label 
                htmlFor="device-photo-upload"
                className="w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-850 shadow-inner shrink-0 relative select-none cursor-pointer group hover:border-emerald-500/50 transition-all duration-300"
                title="คลิกเพื่ออัปโหลดหรือแก้ไขรูปภาพโปรไฟล์"
              >
                {profile.avatar_url && (profile.avatar_url.startsWith('data:') || profile.avatar_url.startsWith('http')) ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                ) : (
                  <span className="text-emerald-400 text-3xl font-black transition-transform group-hover:scale-105 duration-300">{profile.display_name.charAt(0).toUpperCase()}</span>
                )}
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera size={18} className="text-white animate-pulse" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                )}
              </label>
              <div className="flex-grow min-w-0">
                {editingName ? (
                  <form 
                    ref={editFormRef}
                    onSubmit={handleUpdateName} 
                    className="flex items-center gap-2 mt-1 relative z-20"
                  >
                    <input
                      type="text"
                      required
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="px-2.5 py-1.5 glass-input text-xs text-white w-40 relative z-30"
                      placeholder="ชื่อแสดงผล"
                      autoFocus
                      disabled={updatingName}
                    />
                    <button 
                      type="submit" 
                      className="text-[10px] bg-emerald-500 text-black px-2.5 py-1.5 rounded font-bold cursor-pointer relative z-30" 
                      disabled={updatingName}
                    >
                      บันทึก
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--text-main)] truncate">{profile.display_name}</h3>
                    <button 
                      onClick={() => setEditingName(true)}
                      className="p-1 text-zinc-400 hover:text-emerald-400 rounded transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-zinc-500 font-semibold uppercase">
                    บัญชี: {profile.role === 'admin' ? '🏠 ครอบครัว (Admin)' : '👨‍👩‍👧‍👦 สมาชิกครอบครัว'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alerts as Floating Toasts */}
        {pwSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-slide-up shadow-2xl backdrop-blur-md">
            <CheckCircle size={16} className="shrink-0" />
            <span className="font-extrabold">{pwSuccess}</span>
          </div>
        )}

        {pwError && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-slide-up shadow-2xl backdrop-blur-md">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-extrabold">{pwError}</span>
          </div>
        )}

        {/* SETTINGS SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SIDEBAR: Category Links (4 cols on desktop) */}
          <div className="lg:col-span-12 space-y-4">
            <div className="glass-panel rounded-2xl p-2.5 border border-zinc-800/80 shadow-md space-y-1">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSection === 'profile'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Camera size={14} />
                โปรไฟล์ของฉัน & อัปโหลดรูปภาพ
              </button>
              <button
                onClick={() => setActiveSection('security')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSection === 'security'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Key size={14} />
                เปลี่ยนรหัสผ่านส่วนตัว
              </button>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeSection === 'admin'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                  }`}
                >
                  <Shield size={14} />
                  สร้างบัญชีครอบครัว
                </button>
              )}
              <button
                onClick={() => router.push('/profile/members')}
                className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
              >
                <User size={14} />
                ดูสมาชิกครอบครัวในระบบ 
              </button>
            </div>

            {/* Theme Switch Panel */}
            <ThemeToggle variant="card" />

            {/* Single Notification Switch Toggle Card */}
            <div className="w-full glass-card rounded-2xl p-4.5 border border-zinc-800/80 shadow-md text-left select-none space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-black pl-1">
                  <Bell size={15} className="text-emerald-400 shrink-0" />
                  <span>การแจ้งเตือนระบบ</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isNotificationsEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                  }`}
                  role="switch"
                  aria-checked={isNotificationsEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Logout Section */}
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              ออกจากระบบ
            </button>
          </div>

          {/* RIGHT DISPLAY PANEL: Active Forms (8 cols on desktop) */}
          <div className="hidden">
            
            {/* Section 1: Profile Info & Avatar Instruction */}
            <div className="glass-card rounded-3xl p-5 sm:p-6 border border-zinc-800/80 shadow-xl space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase mb-1 flex items-center gap-2">
                  <User size={14} className="text-emerald-400" />
                  ข้อมูลบัญชีผู้ใช้ส่วนตัว (Account Information)
                </h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  รายละเอียดข้อมูลสมาชิกของคุณภายในครอบครัว KVJ Space
                </p>
              </div>

              {/* Account Details Box */}
              <div className="space-y-3.5 p-5 rounded-2xl bg-zinc-950/40 border border-zinc-850">
                <div className="grid grid-cols-2 py-2.5 border-b border-zinc-900/60 text-xs">
                  <span className="text-zinc-500 font-medium">ชื่อแสดงผล:</span>
                  <span className="text-[var(--text-main)] font-bold text-right truncate">{profile?.display_name}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5 border-b border-zinc-900/60 text-xs">
                  <span className="text-zinc-500 font-medium">สิทธิ์การใช้งาน:</span>
                  <span className="text-right font-bold text-emerald-400">
                    {profile?.role === 'admin' ? 'หัวหน้าครอบครัว (Admin)' : 'สมาชิกครอบครัว (Member)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 py-2.5 border-b border-zinc-900/60 text-xs">
                  <span className="text-zinc-500 font-medium">วันที่เข้าร่วม:</span>
                  <span className="text-zinc-300 text-right">
                    {profile ? new Date(profile.created_at).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : '-'}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* --- Section 2: Password Change Form (Center Modal) --- */}
      {activeSection === 'security' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="app-modal relative max-w-sm w-full bg-zinc-900 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl p-6 animate-scale-up">
            
            <div className="flex justify-between items-center mb-4 select-none">
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] tracking-wider uppercase flex items-center gap-2">
                <Key size={14} className="text-emerald-400" />
                เปลี่ยนรหัสผ่านส่วนตัว 
              </h3>
              <button
                onClick={() => setActiveSection('profile')}
                className="w-7 h-7 rounded-full bg-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-805 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed mb-4">
              เปลี่ยนรหัสผ่านเข้าหน้าจอสมาชิกของคุณ รหัสที่ตั้งใหม่ควรมีความยาวอย่างน้อย 6 ตัวอักษร
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New password */}
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400 block pl-0.5">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="ป้อนรหัสผ่านใหม่"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="app-field w-full pl-9 pr-4 py-2.5 rounded-xl text-xs placeholder-zinc-705"
                    disabled={updatingPassword}
                  />
                </div>
              </div>

              {/* Confirm new password */}
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400 block pl-0.5">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="ป้อนรหัสผ่านใหม่อีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="app-field w-full pl-9 pr-4 py-2.5 rounded-xl text-xs placeholder-zinc-705"
                    disabled={updatingPassword}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className="flex-1 py-2.5 bg-zinc-850 border border-zinc-800 hover:bg-zinc-800 text-zinc-450 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-grow btn-primary py-2.5 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  disabled={updatingPassword}
                >
                  {updatingPassword ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'ยืนยันเปลี่ยนรหัสผ่าน'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Section 3: Admin Console Form (Center Modal) --- */}
      {activeSection === 'admin' && profile?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="app-modal relative max-w-md w-full bg-zinc-900 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl p-6 animate-scale-up">
            
            <div className="flex justify-between items-center mb-4 select-none">
              <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
              สร้างบัญชีครอบครัว
              </h3>
              <button
                onClick={() => setActiveSection('profile')}
                className="w-7 h-7 rounded-full bg-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-805 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed mb-4">
              ในฐานะหัวหน้าครอบครัว คุณสามารถสร้างบัญชีผู้ใช้งานให้คนในครอบครัว (เช่น Mom, Son) ได้โดยตรง ระบบจะทำการแมปเข้าระบบและแชร์ฐานข้อมูลเดียวกันโดยอัตโนมัติ
            </p>

            {adminSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-start gap-2 mb-3.5 animate-slide-up">
                <CheckCircle size={14} className="shrink-0 mt-0.5" />
                <span>{adminSuccess}</span>
              </div>
            )}

            {adminError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] flex items-start gap-2 mb-3.5 animate-slide-up">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-zinc-400 uppercase pl-0.5">
                    ชื่อผู้ใช้ (ENG)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Mom, Brother"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="app-field w-full px-3 py-2.5 rounded-xl text-xs"
                    disabled={creatingUser}
                  />
                </div>

                {/* Display name */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-zinc-400 uppercase pl-0.5">
                    ชื่อแสดงผล (ไทย/ENG)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณแม่, น้องชาย"
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                    className="app-field w-full px-3 py-2.5 rounded-xl text-xs"
                    disabled={creatingUser}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Default Password */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-zinc-400 uppercase pl-0.5">
                    รหัสผ่านแรกเริ่ม
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="เช่น kvj12345"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="app-field w-full px-3 py-2.5 rounded-xl text-xs"
                    disabled={creatingUser}
                  />
                </div>

                {/* Family Role */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-zinc-400 uppercase pl-0.5">
                    สิทธิ์การใช้งาน
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as 'member' | 'admin')}
                    className="app-field w-full px-3 py-2.5 rounded-xl text-xs"
                    disabled={creatingUser}
                  >
                    <option value="member">สมาชิก (Member)</option>
                    <option value="admin">ผู้ดูแล (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className="flex-1 py-2.5 bg-zinc-850 border border-zinc-800 text-zinc-450 hover:bg-zinc-800 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-grow btn-primary py-2.5 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'สร้างบัญชีครอบครัว'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
