import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Safe fallback to prevent Next.js static prerendering crashes during build time in CI/CD (Vercel)
  if (!url || !key) {
    return createBrowserClient(
      'https://placeholder-url-for-build.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTAyMTksImV4cCI6MjA5NTAyNjIxOX0.placeholder'
    )
  }

  return createBrowserClient(url, key)
}
