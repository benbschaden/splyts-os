export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPersonas } from '@/lib/queries/personas'
import { PersonasList } from '@/components/company/personas-list'

export default async function PersonasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const personas = await getPersonas(org.id)

  return (
    <PersonasList
      personas={personas}
      isAdmin={org.role === 'admin'}
    />
  )
}
