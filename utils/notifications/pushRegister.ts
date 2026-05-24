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
      if (typeof window !== 'undefined') {
        localStorage.setItem('kvj_push_registration_status', 'failed');
        localStorage.setItem('kvj_push_registration_error', 'คุณปฏิเสธหรือยังไม่อนุญาตสิทธิ์แจ้งเตือนในระบบเบราว์เซอร์ (Notification Permission Denied)');
      }
      return;
    }

    // 2. Register/Get Service Worker registration directly (bypasses .ready promise hangs completely!)
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // 3. Retrieve VAPID public key
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.warn('VAPID public key is missing in environment variables');
      if (typeof window !== 'undefined') {
        localStorage.setItem('kvj_push_registration_status', 'failed');
        localStorage.setItem('kvj_push_registration_error', 'VAPID public key is missing in environment variables (ไม่ได้ตั้งค่า VAPID Key บนระบบเซิร์ฟเวอร์)');
      }
      return;
    }

    // 4. Clear/Unsubscribe any existing subscription first to prevent VAPID mismatch DOMExceptions
    try {
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('Unsubscribing old/cached subscription to register fresh token...');
        await existingSub.unsubscribe();
      }
    } catch (unsubErr) {
      console.warn('Failed to unsubscribe old token, proceeding anyway:', unsubErr);
    }

    // 5. Subscribe with the push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 6. Extract keys and auth token
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!key || !auth) {
      console.error('Failed to get subscription keys');
      if (typeof window !== 'undefined') {
        localStorage.setItem('kvj_push_registration_status', 'failed');
        localStorage.setItem('kvj_push_registration_error', 'Failed to retrieve cryptographic subscription keys from browser PushManager.');
      }
      return;
    }

    const p256dhStr = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key))));
    const authStr = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

    // 7. Save the subscription record securely via RPC (bypasses direct client-side RLS conflicts)
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dhStr,
      p_auth: authStr
    });

    if (error) {
      console.error('Error saving push subscription to database via RPC:', error);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kvj_push_registration_status', 'failed');
        localStorage.setItem('kvj_push_registration_error', `Database RPC error: ${error.message}`);
      }
    } else {
      console.log('Web Push subscription registered successfully in Supabase via RPC!');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kvj_push_registration_error');
        localStorage.setItem('kvj_push_registration_status', 'success');
      }
    }

  } catch (err: any) {
    console.error('Failed to register push subscription:', err);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kvj_push_registration_status', 'failed');
      localStorage.setItem('kvj_push_registration_error', err.message || String(err));
    }
  }
}
