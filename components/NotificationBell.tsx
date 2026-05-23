'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, Loader2, Clock } from 'lucide-react'
import { useNotificationSystem } from '@/components/NotificationContext'
import { getNotificationText } from '@/utils/notifications/templates'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotificationSystem();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-450'
            : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100'
        }`}
      >
        <Bell size={17} className={unreadCount > 0 ? 'animate-[pulse_1.5s_infinite]' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-zinc-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-80 max-h-[440px] z-[999] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-scale-up overflow-hidden select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 px-4.5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-black text-white tracking-wider uppercase">การแจ้งเตือนของบ้าน</span>
              {unreadCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-[10px] text-emerald-450 hover:text-emerald-300 font-extrabold cursor-pointer transition-colors"
              >
                <CheckCheck size={12} />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* List Feed */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-900/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-14 text-zinc-500 gap-2.5">
                <Loader2 size={18} className="animate-spin text-emerald-500" />
                <span className="text-[10px] font-bold text-zinc-400">กำลังโหลดแจ้งเตือน...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16 text-zinc-550 flex flex-col items-center justify-center gap-2.5 px-4">
                <span className="text-3xl">📭</span>
                <span className="text-[11px] font-bold text-zinc-300">ไม่มีการแจ้งเตือนค้างอยู่</span>
                <span className="text-[9px] text-zinc-500 max-w-[180px] leading-relaxed">
                  เมื่อสมาชิกบันทึกธุรกรรม เคลียร์บิล หรืออัปเดตเป้าหมายของบ้าน ประวัติต่างๆ จะบันทึกตรงนี้
                </span>
              </div>
            ) : (
              notifications.map((noti) => {
                const details = noti.notifications;
                if (!details) return null;

                const textInfo = getNotificationText(
                  details.action_type,
                  details.profiles?.display_name || '',
                  details.metadata
                );

                const timeString = new Date(noti.created_at).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' น.';

                const dateString = new Date(noti.created_at).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div
                    key={noti.id}
                    onClick={() => {
                      if (!noti.is_read) markAsRead(noti.id);
                    }}
                    className={`flex items-start gap-3 p-3.5 hover:bg-zinc-900/40 cursor-pointer transition-all duration-150 relative ${
                      !noti.is_read ? 'bg-emerald-500/[0.015]' : ''
                    }`}
                  >
                    {/* Unread Accent Line */}
                    {!noti.is_read && (
                      <div className="absolute top-0 bottom-0 left-0 w-0.75 bg-emerald-500" />
                    )}

                    {/* Avatar / Icon */}
                    <div className="relative shrink-0 select-none">
                      <div className="w-8.5 h-8.5 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-sm shadow-inner overflow-hidden">
                        {details.profiles?.avatar_url && (details.profiles.avatar_url.startsWith('data:') || details.profiles.avatar_url.startsWith('http')) ? (
                          <img
                            src={details.profiles.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base select-none">{textInfo.icon}</span>
                        )}
                      </div>
                      {!noti.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-zinc-950" />
                      )}
                    </div>

                    {/* Metadata Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-black text-zinc-100 truncate">
                          {textInfo.title}
                        </span>
                        <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-550 font-bold uppercase shrink-0">
                          <Clock size={8} className="text-zinc-650" />
                          <span>{dateString} {timeString}</span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-zinc-400 font-semibold">
                        {textInfo.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
