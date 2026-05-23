'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getNotificationText, NotificationMetadata } from '@/utils/notifications/templates'

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

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .eq('user_id', user.id)
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

      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
            // Hydrate the full details with profiles and actor names
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
              setNotifications(prev => [newNoti, ...prev]);

              // Display premium glass toast alert
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
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    }
  }, []);

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
