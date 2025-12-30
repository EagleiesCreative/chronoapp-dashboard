// Server-only Supabase client (uses service role key)
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-application-name': 'chrono-snap-backoffice' } }
  })

  return supabaseInstance
}

// Export a proxy that lazily initializes on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  }
})

export default supabase

