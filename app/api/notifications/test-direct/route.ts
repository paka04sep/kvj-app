import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@kvj-family.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing userId parameter',
        guidance: 'Append ?userId=YOUR_SUPABASE_USER_ID to the URL'
      }, { status: 400 });
    }

    // 1. Fetch active push subscriptions registered for this user ID
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No push subscriptions found for this user in public.push_subscriptions table.',
        userId,
        guidance: 'Make sure you have allowed notifications in your mobile browser and installed the PWA onto your Home Screen!'
      });
    }

    // 2. Perform direct push tests to all endpoints and capture raw responses
    const results = [];
    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const payload = JSON.stringify({
        title: '🔴 KVJ Push Diagnosis',
        body: 'This is a raw direct-endpoint Web Push test!',
        icon: '/icon-192.png',
        url: '/dashboard'
      });

      try {
        const response = await webpush.sendNotification(pushConfig, payload);
        results.push({
          id: sub.id,
          endpoint: sub.endpoint.substring(0, 45) + '...',
          success: true,
          statusCode: response.statusCode,
          headers: response.headers
        });
      } catch (err: any) {
        results.push({
          id: sub.id,
          endpoint: sub.endpoint.substring(0, 45) + '...',
          success: false,
          statusCode: err.statusCode,
          body: err.body,
          message: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
      vapid_public_key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'CONFIGURED' : 'MISSING',
      vapid_private_key: process.env.VAPID_PRIVATE_KEY ? 'CONFIGURED' : 'MISSING',
      webhook_secret_token: process.env.WEBHOOK_SECRET_TOKEN ? 'CONFIGURED' : 'MISSING',
      user_id: userId,
      total_endpoints: subscriptions.length,
      results
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
