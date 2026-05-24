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

// Initialize a standard Supabase client (since we'll call Security Definer functions, anon key is perfectly fine and safe)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
  try {
    // 1. Verify Authorization Header for Webhook security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { record } = payload; // The inserted row from public.user_notifications

    if (!record) {
      return NextResponse.json({ error: 'No record in payload' }, { status: 400 });
    }

    // 2. Fetch full details using our secure database RPC (bypasses RLS safely on the database side)
    const { data: userNotification, error: fetchErr } = await supabase
      .rpc('get_notification_details_for_push', { p_user_notification_id: record.id });

    if (fetchErr || !userNotification) {
      console.error('Error fetching notification details:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
    }

    const actorName = userNotification.actor_name || 'สมาชิกในบ้าน';

    // Check recipient's notification preferences to respect their settings
    const { data: recipientProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userNotification.user_id)
      .single();

    if (!profileErr && recipientProfile && recipientProfile.notification_settings) {
      const settings = recipientProfile.notification_settings as Record<string, boolean>;
      if (settings[userNotification.action_type] === false) {
        return NextResponse.json({ success: true, message: `Notification type ${userNotification.action_type} disabled by recipient` });
      }
    }

    // 3. Format wording using shared localizer engine
    const textInfo = getNotificationText(
      userNotification.action_type,
      actorName,
      userNotification.metadata
    );

    // 4. Fetch subscriptions for recipient user using RPC
    const { data: subscriptions, error: subErr } = await supabase
      .rpc('get_user_push_subscriptions', { p_user_id: userNotification.user_id });

    if (subErr || !subscriptions || subscriptions.length === 0) {
      // No active subscriptions, nothing to do
      return NextResponse.json({ success: true, message: 'No subscriptions active for user' });
    }

    // 5. Broadcast push to all active endpoints
    const pushPromises = subscriptions.map((sub: any) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const pushPayload = JSON.stringify({
        title: textInfo.title,
        body: textInfo.body,
        icon: '/icon-192.png',
        url: '/transactions'
      });

      return webpush.sendNotification(pushConfig, pushPayload).catch(async (err: any) => {
        // If subscription has expired or is invalid, delete it securely using RPC
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired, deleting endpoint: ${sub.endpoint}`);
          await supabase.rpc('delete_push_subscription', { p_subscription_id: sub.id });
        } else {
          console.error(`Failed to send web push to ${sub.endpoint}:`, err);
        }
      });
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true, count: pushPromises.length });

  } catch (err: any) {
    console.error('Broadcast handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
