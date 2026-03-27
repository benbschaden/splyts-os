export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getTerminology } from '@/lib/queries/terminology'
import { TerminologyList } from '@/components/company/terminology-list'

export default async function TerminologyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')
  const terms = await getTerminology(org.id)
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Terminology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Words and phrases to always use, never use, and why. Injected into every AI prompt for consistency.
        </p>
      </div>
      <TerminologyList terms={terms} isAdmin={org.role === 'admin'} />
    </div>
  )
}
