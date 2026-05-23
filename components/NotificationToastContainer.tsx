'use client'

import React from 'react'
import { useNotificationSystem } from '@/components/NotificationContext'
import { X } from 'lucide-react'

export default function NotificationToastContainer() {
  const { toasts, removeToast } = useNotificationSystem();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-3 max-w-md w-[calc(100%-2rem)] select-none pointer-events-none md:bottom-6 md:right-6">
      {toasts.map(toast => {
        const themeClasses = {
          emerald: 'border-emerald-500/30 bg-zinc-950/80 text-emerald-450 shadow-emerald-950/30 ring-1 ring-emerald-500/10',
          rose: 'border-rose-500/30 bg-zinc-950/80 text-rose-450 shadow-rose-950/30 ring-1 ring-rose-500/10',
          amber: 'border-amber-500/30 bg-zinc-950/80 text-amber-450 shadow-amber-950/30 ring-1 ring-amber-500/10',
          blue: 'border-blue-500/30 bg-zinc-950/80 text-blue-450 shadow-blue-950/30 ring-1 ring-blue-500/10',
        }[toast.theme];

        const accentIndicator = {
          emerald: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
          rose: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
          amber: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
          blue: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
        }[toast.theme];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4.5 shadow-2xl backdrop-blur-xl animate-slide-up transition-all duration-300 relative overflow-hidden ${themeClasses}`}
          >
            {/* Top accent indicator strip */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentIndicator}`} />

            <span className="text-2xl mt-0.5 shrink-0 select-none">{toast.icon}</span>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-black tracking-tight text-white mb-0.5">{toast.title}</h5>
              <p className="text-[10.5px] leading-relaxed font-semibold text-zinc-350">{toast.body}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-zinc-500 hover:text-zinc-300 p-0.5 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
