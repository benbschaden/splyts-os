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

// Untyped service client for tables not yet present in generated Database types
// (i.e. a migration has been written but types haven't been regenerated yet).
// Switch callers to createServiceClient once types are regenerated.
export function createUntypedServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
