export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext, type BrandAssets } from '@/lib/queries/brand-context'
import { BrandAssetsForm } from '@/components/company/brand-assets-form'
import { isAtLeastAdmin } from '@/lib/auth/roles'

function parseBrandAssets(raw: unknown): BrandAssets {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {}
  }
  return raw as BrandAssets
}

export default async function BrandAssetsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const context = await getBrandContext(org.id)
  const initial = parseBrandAssets(context?.brand_assets)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Brand assets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visual identity reference — logos, colors, typography, and image style guidelines.
        </p>
      </div>
      <BrandAssetsForm initial={initial} isAdmin={isAtLeastAdmin(org.role)} />
    </div>
  )
}
