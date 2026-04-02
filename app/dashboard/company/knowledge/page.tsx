import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listKnowledgeFiles, listActiveConflicts } from '@/lib/queries/company-knowledge'
import { KnowledgePanel } from '@/components/company/knowledge-panel'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function CompanyKnowledgePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [{ data: files }, { data: conflicts }] = await Promise.all([
    listKnowledgeFiles(supabase, org.id),
    listActiveConflicts(supabase, org.id),
  ])

  // The Supabase join returns nested objects for file_a/file_b.
  // Cast to the shape KnowledgePanel expects.
  type ConflictWithFiles = {
    id: string
    topic: string
    description: string
    excerpt_a: string | null
    excerpt_b: string | null
    file_a: { file_name: string } | null
    file_b: { file_name: string } | null
    created_at: string
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Company knowledge</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Upload existing company documents — business plans, brand guidelines, strategy decks.
          These are used only to suggest values for company profile fields and are never
          referenced in content generation.
        </p>
      </div>

      <KnowledgePanel
        initialFiles={files ?? []}
        initialConflicts={(conflicts ?? []) as ConflictWithFiles[]}
        isAdmin={isAtLeastAdmin(org.role)}
      />
    </div>
  )
}
