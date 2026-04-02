import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { CompanyLayoutClient } from '@/components/company/company-layout-client'

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">Company</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <CompanyLayoutClient>{children}</CompanyLayoutClient>
      </div>
    </div>
  )
}
