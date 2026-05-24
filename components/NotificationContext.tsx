'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AUTO_NOTIFICATION_CONFIG } from '@/utils/notifications/autoRules'
import { registerPushNotifications } from '@/utils/notifications/pushRegister'

export interface UserNotification {
  id: string;
  is_read: boolean;
  created_at: string;
  notifications: {
    id: string;
    action_type: string;
    metadata: any;
    created_at: string;
    profiles: {
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
}

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  icon: string;
  theme: 'emerald' | 'rose' | 'amber' | 'blue';
}

interface NotificationContextProps {
  notifications: UserNotification[];
  unreadCount: number;
  toasts: ToastItem[];
  markAsRead: (userNotificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeToast: (id: string) => void;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotificationSystem = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationSystem must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Helper date generators for local time triggers
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  };

  // Inserts system alerts into the database which maps to all family members
  // and automatically broadcasts real Web Push notifications to active devices
  const triggerSystemNotification = async (
    title: string,
    body: string,
    icon: string,
    theme: ToastItem['theme']
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single();

      if (!profileData || !profileData.family_id) return;

      // Call secure Database RPC function to create real system notification in DB.
      // This maps it to user_notifications for ALL family members
      // and automatically triggers PWA Web Push notifications to all active devices!
      const { data: newNotiId, error: dbError } = await supabase
        .rpc('create_system_notification', {
          p_family_id: profileData.family_id,
          p_action_type: 'auto_system_reminder',
          p_metadata: {
            category: title,
            description: body,
            receiver_name: icon,
            type: theme as any
          }
        });

      if (dbError) {
        console.error('Error inserting real system notification via RPC:', dbError);
      } else {
        console.log('Successfully triggered system notification in DB:', newNotiId);
      }
    } catch (e) {
      console.error('Error triggering autoRules system notification:', e);
    }
  };

  // Perform background scheduled checks for recorded transactions and due obligations
  const runScheduledChecks = async (uid: string) => {
    if (typeof window === 'undefined') return;

    const todayStr = getLocalDateString();
    const currentTime = getLocalTimeString();

    // Fetch the user's family_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', uid)
      .single();

    if (!profileData || !profileData.family_id) return;

    // Load all system notifications sent today in this family to act as a distributed DB-backed lock
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existingNotis, error: checkError } = await supabase
      .from('notifications')
      .select('id, metadata')
      .eq('action_type', 'auto_system_reminder')
      .eq('family_id', profileData.family_id)
      .gte('created_at', todayStart.toISOString());

    if (checkError) return;

    // --- RULE 1: Daily income/expense record reminder ---
    if (AUTO_NOTIFICATION_CONFIG.recordReminder.enabled) {
      const config = AUTO_NOTIFICATION_CONFIG.recordReminder;
      for (const slotTime of config.times) {
        if (currentTime >= slotTime) {
          const lockKey = `kvj_auto_record_reminder_${todayStr}_${slotTime}`;
          if (!localStorage.getItem(lockKey)) {
            // Check if this time slot was already triggered in the DB today
            const isAlreadySent = existingNotis && existingNotis.some((n: any) => 
              n.metadata?.category === config.title && 
              n.metadata?.description?.includes('วันนี้คุณบันทึกรายรับ-รายจ่าย')
            );

            if (isAlreadySent) {
              localStorage.setItem(lockKey, 'true');
            } else {
              // Count total transactions recorded today
              const { data, error } = await supabase
                .from('transactions')
                .select('id')
                .eq('transaction_date', todayStr);

              if (!error) {
                if (!data || data.length === 0) {
                  await triggerSystemNotification(config.title, config.body, config.icon, config.theme);
                }
                localStorage.setItem(lockKey, 'true');
              }
            }
          }
        }
      }
    }

    // --- RULE 2: No income reminder check ---
    if (AUTO_NOTIFICATION_CONFIG.noIncomeReminder.enabled) {
      const config = AUTO_NOTIFICATION_CONFIG.noIncomeReminder;
      for (const slotTime of config.times) {
        if (currentTime >= slotTime) {
          const lockKey = `kvj_auto_no_income_${todayStr}_${slotTime}`;
          if (!localStorage.getItem(lockKey)) {
            // Check if already sent in DB
            const isAlreadySent = existingNotis && existingNotis.some((n: any) => 
              n.metadata?.category === config.title && 
              n.metadata?.description?.includes('วันนี้ยังไม่มีรายรับเข้าบ้าน')
            );

            if (isAlreadySent) {
              localStorage.setItem(lockKey, 'true');
            } else {
              // Count income transactions recorded today
              const { data, error } = await supabase
                .from('transactions')
                .select('id')
                .eq('transaction_date', todayStr)
                .eq('type', 'income');

              if (!error) {
                if (!data || data.length === 0) {
                  await triggerSystemNotification(config.title, config.body, config.icon, config.theme);
                }
                localStorage.setItem(lockKey, 'true');
              }
            }
          }
        }
      }
    }

    // --- RULE 3: Unpaid bills/obligations checks ---
    if (AUTO_NOTIFICATION_CONFIG.billReminder.enabled) {
      const config = AUTO_NOTIFICATION_CONFIG.billReminder;
      if (currentTime >= config.checkTime) {
        const checkRunLock = `kvj_auto_bill_check_${todayStr}`;
        if (!localStorage.getItem(checkRunLock)) {
          // Fetch active unpaid obligations
          const { data: unpaidObligations, error } = await supabase
            .from('monthly_obligations')
            .select('id, name, amount, due_date')
            .eq('status', 'unpaid');

          if (!error && unpaidObligations && unpaidObligations.length > 0) {
            const today = new Date(todayStr);
            for (const ob of unpaidObligations) {
              if (!ob.due_date) continue;
              const due = new Date(ob.due_date);
              
              // Calculate difference in whole days
              const diffTime = due.getTime() - today.getTime();
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (config.triggerDays.includes(daysLeft)) {
                const lockKey = `kvj_bill_reminder_${ob.id}_${daysLeft}`;
                if (!localStorage.getItem(lockKey)) {
                  // Check if already sent in DB today for this specific bill and milestone
                  const isAlreadySent = existingNotis && existingNotis.some((n: any) => 
                    n.metadata?.category === config.title && 
                    n.metadata?.description?.includes(ob.name) && 
                    n.metadata?.description?.includes(String(daysLeft))
                  );

                  if (isAlreadySent) {
                    localStorage.setItem(lockKey, 'true');
                  } else {
                    const body = config.getBody(ob.name, daysLeft, ob.amount);
                    await triggerSystemNotification(config.title, body, config.icon, config.theme);
                    localStorage.setItem(lockKey, 'true');
                  }
                }
              }
            }
          }

          if (!error) {
            localStorage.setItem(checkRunLock, 'true');
          }
        }
      }
    }
  };

  // Auth State Listener Effect: setting userId, loading status, completely side-effect free
  useEffect(() => {
    let authSubscription: any;

    const setupAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setUserId(null);
      }
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
          setUserId(currentUser.id);
        } else {
          setUserId(null);
        }
        setLoading(false);
      });

      authSubscription = subscription;
    };

    setupAuth();

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Background loop polling checks and automatic push subscription registration on mount/login
  useEffect(() => {
    if (!userId) return;

    // Trigger PWA push subscription registration automatically once user logs in
    registerPushNotifications();

    // --- Dev Helper: Expose notification triggering utilities on window ---
    if (typeof window !== 'undefined') {
      (window as any).__testKVJNotifications = async (type: 'record' | 'no_income' | 'bill') => {
        console.log(`[Dev Helper] Manual trigger requested for notification type: ${type}`);
        
        if (type === 'record') {
          const config = AUTO_NOTIFICATION_CONFIG.recordReminder;
          await triggerSystemNotification(config.title, config.body, config.icon, config.theme);
        } else if (type === 'no_income') {
          const config = AUTO_NOTIFICATION_CONFIG.noIncomeReminder;
          await triggerSystemNotification(config.title, config.body, config.icon, config.theme);
        } else if (type === 'bill') {
          const config = AUTO_NOTIFICATION_CONFIG.billReminder;
          const body = config.getBody('ค่าอินเทอร์เน็ต (รายการทดสอบ)', 3, 799);
          await triggerSystemNotification(config.title, body, config.icon, config.theme);
        } else {
          console.warn('[Dev Helper] Unknown notification type. Use: "record", "no_income", or "bill".');
        }
      };
    }

    // Run first check immediately
    runScheduledChecks(userId);

    // Run periodic updates every 1 minute
    const pollInterval = setInterval(() => {
      runScheduledChecks(userId);
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: [],
        unreadCount: 0,
        toasts: [],
        markAsRead: async () => {},
        markAllAsRead: async () => {},
        removeToast: () => {},
        loading,
        fetchNotifications: async () => {}
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
