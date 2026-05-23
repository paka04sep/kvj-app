import { createClient } from '@/utils/supabase/client'

// Helper to convert base64 VAPID public key to Uint8Array for browser PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser/environment');
    return;
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, skipping push registration');
      return;
    }

    // 1. Check/Request notification permissions
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('Push notification permission denied or not granted yet');
      return;
    }

    // 2. Wait for Service Worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
    // 3. Retrieve VAPID public key
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.warn('VAPID public key is missing in environment variables');
      return;
    }

    // 4. Subscribe with the push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 5. Extract keys and auth token
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) {
      console.error('Failed to get subscription keys');
      return;
    }

    const p256dhStr = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key))));
    const authStr = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

    // 6. Upsert the subscription record linked to current user
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: p256dhStr,
      auth: authStr
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Error saving push subscription to database:', error);
    } else {
      console.log('Web Push subscription registered successfully in Supabase!');
    }

  } catch (err) {
    console.error('Failed to register push subscription:', err);
  }
}
