import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { getNotificationText } from '@/utils/notifications/templates'

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
    const templateParam = searchParams.get('template') || 'transaction_created';

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing userId parameter',
        guidance: 'Append ?userId=YOUR_SUPABASE_USER_ID to the URL'
      }, { status: 400 });
    }

    // 1. Fetch active push subscriptions registered for this user ID via secure RPC (bypasses RLS)
    const { data: subscriptions, error } = await supabase
      .rpc('get_user_push_subscriptions', { p_user_id: userId });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      // Fetch profiles in this database via secure RPC (bypasses RLS) to help identify mismatches
      const { data: dbProfiles } = await supabase
        .rpc('get_active_profiles');

      const isUserInDb = dbProfiles && dbProfiles.some((p: any) => p.id === userId);

      return NextResponse.json({
        success: false,
        message: 'No push subscriptions found for this user in public.push_subscriptions table.',
        userId,
        guidance: 'Make sure you have allowed notifications in your mobile browser and installed the PWA onto your Home Screen!',
        database_diagnosis: {
          connected_supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
          requested_user_exists_in_this_db: isUserInDb ? 'YES' : 'NO (User ID not found in this database profiles table!)',
          active_profiles_in_this_db: dbProfiles || [],
          developer_advice: isUserInDb
            ? 'The user exists in the database but hasn\'t allowed browser push permissions or logged into the PWA. Open the PWA on your home screen, log in, and grant notifications permission.'
            : 'You are attempting to test a User ID that does not exist in this database connection. Verify if you are testing the Dev vs Prod server, or ensure you are using a correct User ID from the list above.'
        }
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

      let textInfo;
      if (templateParam === 'obligation_paid') {
        textInfo = getNotificationText('obligation_paid', 'แม่', {
          amount: 850,
          description: 'ค่าไฟเดือนพฤษภาคม'
        });
      }  else if (templateParam === 'obligation_created') {
        textInfo = getNotificationText('obligation_created', 'แม่', {
          amount: 850,
         description: 'ค่าไฟเดือนพฤษภาคม'
        });
      } else if (templateParam === 'settlement_created') {
        textInfo = getNotificationText('settlement_created', 'แม่', {
          amount: 250,
          receiver_name: 'คุณแม่'
        });
      } else if (templateParam === 'transaction_created_income' || templateParam === 'income') {
        textInfo = getNotificationText('transaction_created', 'แม่', {
          type: 'income',
          amount: 2500,
          description: 'วันนี้มีรายได้เข้าบ้าน',
          category: 'รายได้รายวัน'
        });
      } else if (templateParam === 'transaction_updated' || templateParam === 'update') {
        textInfo = getNotificationText('transaction_updated', 'คุณแม่', {
          amount: 180,
          description: 'ซื้อของกินจากร้านสะดวกซื้อ (แก้ไขยอด)'
        });
      } else if (templateParam === 'transaction_deleted' || templateParam === 'delete') {
        textInfo = getNotificationText('transaction_deleted', 'คุณแม่', {
          amount: 150,
          description: 'ซื้อของกินจากร้านสะดวกซื้อ'
        });
      } else {
        // Default to transaction_created (expense)
        textInfo = getNotificationText('transaction_created', 'แม่', {
          type: 'expense',
          amount: 150,
          description: 'จ่ายตลาด',
          category: 'ค่าข้าว'
        });
      }

      const payload = JSON.stringify({
        title: textInfo.title,
        body: textInfo.body,
        icon: textInfo.icon || '/icon-192.png',
        url: '/transactions'
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
