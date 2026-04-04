export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfileWithVoice } from '@/lib/queries/user-profile'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfileWithVoice(user.id)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your personal details. Visible to everyone in your organisation.
        </p>
      </div>

      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? '',
          role: profile?.role ?? '',
          avatar_url: profile?.avatar_url ?? null,
          email: user.email ?? '',
          voice: profile?.voice ?? '',
          tone: profile?.tone ?? '',
          writing_style: profile?.writing_style ?? '',
          personal_pillars: profile?.personal_pillars ?? '',
          platform_notes: profile?.platform_notes ?? '',
        }}
      />
    </div>
  )
}
