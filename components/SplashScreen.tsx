'use client'

import React, { useState, useEffect } from 'react'
import { useNotificationSystem } from '@/components/NotificationContext'

export default function SplashScreen() {
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const { loading: contextLoading } = useNotificationSystem()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSplashShown = sessionStorage.getItem('kvj_splash_shown')
      if (isSplashShown) {
        setShow(false)
      }
    }
  }, [])

  useEffect(() => {
    if (show && !contextLoading) {
      // Data and auth resolved! Wait 600ms for visual comfort, then fade out
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 600)

      // Unmount completely and persist session lock
      const closeTimer = setTimeout(() => {
        sessionStorage.setItem('kvj_splash_shown', 'true')
        setShow(false)
      }, 1000)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(closeTimer)
      }
    }
  }, [contextLoading, show])

  if (!show) return null

  return (
    <div
      id="kvj-static-splash"
      className={fadeOut ? 'splash-fade' : ''}
    >
      <div id="kvj-static-splash-blur" />
      <div id="kvj-static-splash-container">
        <div id="kvj-static-splash-logo">
          <img id="kvj-static-splash-img" src="/main_icon_192x192.png" alt="Logo" />
        </div>
        <h1 id="kvj-static-splash-title">KVJ FAMILY</h1>
      </div>
    </div>
  )
}
