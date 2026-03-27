export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBenchmarksWithDefaults } from '@/lib/queries/content-benchmarks'
import { BenchmarksList } from '@/components/company/benchmarks-list'

export default async function ContentBenchmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const benchmarks = await getBenchmarksWithDefaults(org.id)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Content benchmarks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Industry-standard performance targets per platform. Customize with your own numbers.
        </p>
      </div>
      <BenchmarksList benchmarks={benchmarks} isAdmin={org.role === 'admin'} />
    </div>
  )
}
