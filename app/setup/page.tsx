import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { OrgSetupForm } from '@/components/org/org-setup-form'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (org) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Set up your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your company name to get started.
          </p>
        </div>
        <OrgSetupForm />
      </div>
    </div>
  )
}
