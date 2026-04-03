export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPersonas } from '@/lib/queries/personas'
import { getPersonaMatchStats } from '@/lib/queries/contacts'
import { PersonasList } from '@/components/company/personas-list'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function PersonasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [personas, matchStats] = await Promise.all([
    getPersonas(org.id),
    getPersonaMatchStats(org.id),
  ])

  const matchCountById = Object.fromEntries(
    matchStats.map((s) => [s.persona_id, { count: s.count, avgScore: s.avg_score }]),
  )

  return (
    <PersonasList
      personas={personas}
      isAdmin={isAtLeastAdmin(org.role)}
      matchCountById={matchCountById}
    />
  )
}
