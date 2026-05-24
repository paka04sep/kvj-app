'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getNotificationText, NotificationMetadata } from '@/utils/notifications/templates'
import { AUTO_NOTIFICATION_CONFIG } from '@/utils/notifications/autoRules'

export interface UserNotification {
  id: string; // ID from user_notifications
  is_read: boolean;
  created_at: string;
  notifications: {
    id: string;
    action_type: string;
    metadata: NotificationMetadata;
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
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const supabase = createClient();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (title: string, body: string, icon: string, theme: ToastItem['theme']) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts(prev => [...prev, { id, title, body, icon, theme }]);
    setTimeout(() => removeToast(id), 6000); // Autohide after 6s
  };

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

      // Insert real system notification. 
      // Setting actor_id = null maps it to EVERYONE in the family (including the triggering user)
      // and immediately fires the DB webhook to trigger Web Push notification alerts on closed devices!
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          family_id: profileData.family_id,
          actor_id: null, 
          action_type: 'auto_system_reminder',
          metadata: {
            category: title,
            description: body,
            receiver_name: icon,
            type: theme as any
          }
        });

      if (dbError) {
        console.error('Error inserting real system notification:', dbError);
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

  const fetchNotificationsForUser = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          id,
          is_read,
          created_at,
          notifications (
            id,
            action_type,
            metadata,
            created_at,
            profiles:actor_id (
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(35);

      if (error) throw error;
      setNotifications((data as any) || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchNotificationsForUser(user.id);
    }
  };

  const markAsRead = async (userNotificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', userNotificationId);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === userNotificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Auth State change hook: cleanly handles login registration, teardown and dynamic subscriptions
  useEffect(() => {
    let channel: any;

    const setupAuthAndRealtime = async () => {
      // 1. Check if user already exists on mount
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotificationsForUser(user.id);
        
        channel = supabase
          .channel(`realtime:user_notifications:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
              const { data: fullDetails, error } = await supabase
                .from('user_notifications')
                .select(`
                  id,
                  is_read,
                  created_at,
                  notifications (
                    id,
                    action_type,
                    metadata,
                    created_at,
                    profiles:actor_id (
                      display_name,
                      avatar_url
                    )
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!error && fullDetails) {
                const newNoti = fullDetails as any;
                setNotifications(prev => {
                  if (prev.some(n => n.id === newNoti.id)) return prev;
                  return [newNoti, ...prev];
                });

                const details = newNoti.notifications;
                if (details) {
                  const textInfo = getNotificationText(
                    details.action_type,
                    details.profiles?.display_name,
                    details.metadata
                  );
                  addToast(textInfo.title, textInfo.body, textInfo.icon, textInfo.theme);
                }
              }
            }
          )
          .subscribe();
      } else {
        setUserId(null);
        setNotifications([]);
        setLoading(false);
      }

      // 2. Listen to dynamic auth events (login/logout)
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        if (user) {
          setUserId(user.id);
          await fetchNotificationsForUser(user.id);

          // Rebuild dynamic channel
          if (channel) supabase.removeChannel(channel);
          
          channel = supabase
            .channel(`realtime:user_notifications:${user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'user_notifications',
                filter: `user_id=eq.${user.id}`,
              },
              async (payload) => {
                const { data: fullDetails, error } = await supabase
                  .from('user_notifications')
                  .select(`
                    id,
                    is_read,
                    created_at,
                    notifications (
                      id,
                      action_type,
                      metadata,
                      created_at,
                      profiles:actor_id (
                        display_name,
                        avatar_url
                      )
                    )
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (!error && fullDetails) {
                  const newNoti = fullDetails as any;
                  setNotifications(prev => {
                    if (prev.some(n => n.id === newNoti.id)) return prev;
                    return [newNoti, ...prev];
                  });

                  const details = newNoti.notifications;
                  if (details) {
                    const textInfo = getNotificationText(
                      details.action_type,
                      details.profiles?.display_name,
                      details.metadata
                    );
                    addToast(textInfo.title, textInfo.body, textInfo.icon, textInfo.theme);
                  }
                }
              }
            )
            .subscribe();
        } else {
          // Teardown everything instantly on logout/session expiry
          setUserId(null);
          setNotifications([]);
          setLoading(false);
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
        }
      });

      return () => {
        authSubscription.unsubscribe();
        if (channel) supabase.removeChannel(channel);
      };
    };

    let cleanupPromise = setupAuthAndRealtime();
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  // background loop polling checks triggered only when authenticated user exists
  useEffect(() => {
    if (!userId) return;

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
        notifications,
        unreadCount,
        toasts,
        markAsRead,
        markAllAsRead,
        removeToast,
        loading,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
