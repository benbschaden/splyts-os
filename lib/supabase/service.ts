import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Service role client — bypasses RLS. Use only in server-side API routes
// for trusted operations. Never expose to the browser or client components.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
