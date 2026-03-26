export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext } from '@/lib/queries/brand-context'
import { BrandContextForm } from '@/components/settings/brand-context-form'

export default async function BrandSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const context = await getBrandContext(org.id)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Brand context</h2>
        <p className="text-sm text-muted-foreground">
          This context is injected into every AI generation request for your organisation.
          Keep it accurate — the quality of your output depends on it.
        </p>
      </div>

      <BrandContextForm
        initial={{
          company_name: context?.company_name ?? '',
          mission: context?.mission ?? '',
          vision: context?.vision ?? '',
          north_star: context?.north_star ?? '',
          voice: context?.voice ?? '',
          tone: context?.tone ?? '',
          pillars: context?.pillars ?? '',
          target_audience: context?.target_audience ?? '',
          values: context?.values ?? '',
        }}
        isAdmin={org.role === 'admin'}
      />
    </div>
  )
}
