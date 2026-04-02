export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProductContext } from '@/lib/queries/product-context'
import { ProductContextForm } from '@/components/company/product-context-form'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function ProductContextPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const context = await getProductContext(org.id)

  return (
    <ProductContextForm
      initial={context?.sections ?? null}
      isAdmin={isAtLeastAdmin(org.role)}
    />
  )
}
