export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandNarratives } from '@/lib/queries/brand-narratives'
import { NarrativesList } from '@/components/company/narratives-list'

export default async function BrandNarrativesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')
  const narratives = await getBrandNarratives(org.id)
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Brand narratives</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The 3-5 core stories your company tells. AI uses these to anchor content in consistent messaging.
        </p>
      </div>
      <NarrativesList narratives={narratives} isAdmin={org.role === 'admin'} />
    </div>
  )
}
