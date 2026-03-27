import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/queries/user-profile'
import { WelcomeForm } from '@/components/auth/welcome-form'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  // Already has a name — skip straight to dashboard
  if (profile?.full_name?.trim()) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome to the workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Set a password and your name so you can sign in next time.
          </p>
        </div>
        <WelcomeForm email={user.email ?? ''} />
      </div>
    </div>
  )
}
