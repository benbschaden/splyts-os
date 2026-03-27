export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getSocialProof } from '@/lib/queries/social-proof'
import { SocialProofList } from '@/components/company/social-proof-list'

export default async function SocialProofPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')
  const items = await getSocialProof(org.id)
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Social proof</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Testimonials, case studies, and metrics that AI can use to strengthen content.
        </p>
      </div>
      <SocialProofList items={items} isAdmin={org.role === 'admin'} />
    </div>
  )
}
