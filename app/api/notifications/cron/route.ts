import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize a standard Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authorization Header for security
    const authHeader = req.headers.get('authorization')
    
    // We allow verification via Vercel Cron default Auth header (Bearer <secret>)
    // or fallback to the standard WEBHOOK_SECRET_TOKEN for developer/manual testing
    const isValidToken = 
      authHeader === `Bearer ${process.env.CRON_SECRET}` || 
      authHeader === `Bearer ${process.env.WEBHOOK_SECRET_TOKEN}` ||
      new URL(req.url).searchParams.get('token') === process.env.WEBHOOK_SECRET_TOKEN;

    if (!isValidToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Trigger the secure database cron RPC
    const { data, error } = await supabase.rpc('run_server_cron_checks')

    if (error) {
      console.error('Error running server cron checks RPC:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...data })
  } catch (err: any) {
    console.error('Cron route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
